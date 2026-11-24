# Architecture

## Shape

```
Browser (React SPA, web/)  ──cookie──▶  ASP.NET Core 10 API (src/PointHub.Api)  ──EF Core──▶  SQL Server
   ▲            ▲                              ▲
   │ keystrokes │ ws://127.0.0.1               │ X-Api-Key
USB wedge   Card bridge (tools/)        Other applications (HR, canteen kiosk, survey tool)
reader      ◀── PC/SC reader
```

One deployable: `dotnet publish` builds the React app and ships it inside the API as static files, so the site and its API share an origin (no CORS, same-site cookie). The card bridge is a separate small program that exists only on event-station PCs with PC/SC readers.

| project | depends on | holds |
| --- | --- | --- |
| `PointHub.Domain` | nothing | Entities and every business rule that does not need a database: balance arithmetic, check-in state machine, rotating codes, roster matching, card UID normalisation, API key hashing, the festival calendar, email templates and rendering. Unit-tested. |
| `PointHub.Infrastructure` | Domain | `PointHubDbContext`, migrations, and the services that combine rules with persistence: `PointLedger`, `CheckInService`, `RedemptionService`, `RosterService`, `EmployeeDirectory`, `SiteThemeService`, `GiftImageService`, `EmailService` + `EmailDispatcher`, `DevSeeder`. |
| `PointHub.Api` | both | HTTP endpoints (minimal APIs grouped by audience), authentication, DTOs, error mapping. Handlers are thin: authorise, call a service, project to a DTO. |

The HTTP contract is written down in [api.md](api.md) and mirrored by `Api/Contracts/Dtos.cs` and `web/src/api/types.ts`.

## Data model

```
Employee 1─1 PointAccount            Event 1─* EventHost ─▶ Employee
   │ 1─* EmployeeCard                  │ 1─* EventRosterEntry ─▶ Employee?
   │                                   │ 1─* EventCheckIn ─▶ Employee, ─▶ PointTransaction (award)
   └─* PointTransaction ─▶ Event? ─▶ Redemption? ─▶ ApiClient? ─▶ PointTransaction (reverses)
Gift 1─* GiftStockMovement, 1─* GiftImage      Redemption ─▶ Employee, Gift
ApiClient   SiteSetting   EmailTemplate   EmailMessage (outbox)   AuditLog ─▶ Employee (actor)
```

### Points: a ledger plus a cached balance

- `PointTransaction` is the source of truth: signed amount, type (`EventAward`, `Redemption`, `Adjustment`, `Reversal`, `ExternalCredit`, `ExternalDebit`, `Expiry`), reason, and links to what caused it. Rows are never updated or deleted.
- `PointAccount` caches balance, lifetime earned and lifetime spent per employee, so a balance check is one read. It carries a SQL Server `rowversion`; two writers on the same account collide, and the API filter retries the losing request from a clean context (`Api/Http/ApiProblem.cs`).
- `PointLedger` is the only code that creates transactions. It stages the ledger line and the account change on the DbContext and the calling service saves once, so the business change and its points commit in the same database transaction.
- A revert is a new `Reversal` transaction pointing at the original; a unique index on that pointer makes a double revert impossible even under a race. Reverting an event award also flips the check-in to `Reverted`.
- Spending (redemption, external debit) is refused when the balance is too low. Admin reverts and adjustments may go negative (decision D-06).

### Events and check-in

Three ways in, one record out (`EventCheckIn`, unique per event and employee):

| way | who acts | approved by |
| --- | --- | --- |
| **Link / QR** `/c/{token}` | the employee, signed in on their own phone | the event's approval mode: a host, automatically if on the roster, or automatically for everyone |
| **Card tap** at a host's station | the host's browser sends the UID | at once – the host is there |
| **Manual** employee number | the host | at once |

- The link token only identifies the event. In **rotating** mode the QR also carries `k`, an HMAC of the current 30-second step keyed with a per-event secret that never leaves the server; the host's screen polls for the current code. The current and two previous codes are accepted so a person has time to sign in.
- Approval writes the award through the ledger and links it to the check-in.
- **Rosters:** a host uploads a CSV (employee number, name, email; header names accepted in three languages). `RosterMatcher` classifies each row against the employee master as matched, not found, inactive or duplicate. *Re-match* runs the same comparison again after the master changes (new joiners pushed by HR, leavers), which is how a "not found" row resolves without a new upload.

### Gifts

`RedemptionService.RedeemAsync` checks the per-employee limit, decrements stock (with a `GiftStockMovement`), debits points and creates the `Redemption` in one save. `Gift` has a `rowversion` and a `CHECK (Stock >= 0)` constraint, so the last item cannot be redeemed twice. Cancelling refunds through a reversal and returns the stock. A gift admin marks a claim **fulfilled** when the gift is handed over (who and when are recorded); the mark can be undone.

**Pictures.** `GiftImageService` decodes every upload with SkiaSharp (the extension and content type are not trusted), applies the EXIF orientation, fits the picture into a 1024 × 1024 transparent frame and stores it as WebP in the flat `uploads/assets` folder under a random id. Re-encoding drops metadata. The `GiftImage` row ties the file to a gift and orders it; the folder is served read-only at `/uploads/assets`.

### Seasonal themes

`FestivalCalendar` (domain, pure) computes Taiwan's festivals for any year – lunar ones from the lunisolar calendar, Qingming and the winter solstice as solar terms – and gives each a window of days. When windows overlap, the shorter one wins. `SiteThemeService` applies the admin's settings on top: follow the calendar (default), skip individual festivals, or force one theme. Nothing is scheduled by hand.

### Email

A notification is rendered from a template (built-in defaults in three languages, admin overrides in `EmailTemplates`) and written to `EmailMessages` **in the same save** as the change it reports. `EmailDispatcher`, a background service, sends pending rows through SMTP (MailKit) and retries failures with growing pauses up to five times. If SMTP is not configured the rows are marked skipped. Templates are plain text with `{{placeholders}}`; values are HTML-escaped, so neither a template nor an event title can inject markup.

## Authentication and authorisation

| caller | scheme | notes |
| --- | --- | --- |
| Employees, hosts, admins | HTTP-only same-site cookie | Issued after Entra ID sign-in (OIDC code flow; `Auth:Oidc:*`) or, in Development only, the sample sign-in. The cookie carries the employee id and roles; every five minutes the employee is re-read so deactivation and role changes take effect. |
| Other applications | `X-Api-Key` | Only on `/api/integration/v1`. Policies name the scheme explicitly, so a cookie can never call the integration API and an API key can never call the employee or admin API. |

- Roles: system admin, event admin, gift admin, auditor (read-only); no role is a normal user. Policies: `eventAdmin` (event admin or system admin), `giftAdmin`, `systemAdmin`, `adminRead` (system admin or auditor), and one per API scope. The role table is in [api.md](api.md#roles).
- CSRF: every cookie-authenticated write must carry `X-Requested-With: PointHub`. A cross-site page cannot add a custom header without a CORS preflight, and no cross-origin caller is allowed.
- The API answers `401`/`403` with problem+json; it never redirects to a login page. Every error has a stable `code` the client translates.
- Privileged and point-affecting actions write an `AuditLog` row in the same save as the change.

## Front end

React 19, Vite, TypeScript strict, Chakra UI v3 in the "Arcade" design, Motion, TanStack Query, react-router 7, i18next. Details, including how to add a theme or a language, are in [frontend.md](frontend.md).

- **Languages:** `en`, `ja`, `zh-Hant`. UI strings are JSON resources; server errors arrive as codes and are translated in the client; user-entered content is `LocalizedText` with English as fallback.
- **Seasonal themes:** a registry of thirteen themes (the standard company blue and green plus twelve festivals), each with a palette, a pixel-art sprite and an ambient effect. The server decides the active theme and the client applies it.
- **Card readers:** one hook, three sources – keyboard-wedge (a fast burst of keystrokes ending in Enter), the PC/SC bridge WebSocket, and Web NFC on Android Chrome. The raw value is sent to the server, which normalises it.

## Card bridge

`tools/PointHub.CardBridge` polls PC/SC for readers, asks each presented card for its UID (`FF CA 00 00 00`) and broadcasts it as JSON over `ws://127.0.0.1:47615/`. It binds to loopback only and accepts WebSocket connections only from the PointHub origins listed in its settings, so no other website can listen to badge taps. It reads nothing else from the card.

## Testing

- `tests/PointHub.Tests`: fast unit tests of the domain rules (no database).
- The services were exercised end to end against LocalDB through the HTTP API while scaffolding, but there is **no automated integration test suite yet**. Next step: `WebApplicationFactory` tests against a throwaway SQL Server database (LocalDB locally, a container in CI), starting with the ledger invariants – balance equals the sum of transactions, no double award, no oversold stock under concurrency.
- The front end has no tests yet.

## Known gaps in the scaffold

- Not verified: the Entra ID sign-in path (needs a tenant), the card bridge and Web NFC against physical readers and cards.
- No employee CSV import screen, no reports or exports.
- Validation error keys are property names in PascalCase (`errors.Title.En`), not camelCase.
- When a roster is re-matched, check-ins already pending keep their old "on roster" flag.
