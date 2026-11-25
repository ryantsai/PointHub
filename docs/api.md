# PointHub HTTP API contract (v0)

This is the contract between `src/PointHub.Api` and `web/`. Change it here first, then in both sides.

## Conventions

- Base path `/api`. JSON, camelCase property names, enums as camelCase strings.
- Timestamps are ISO 8601 with an explicit offset, always UTC (`2026-11-24T03:00:00+00:00`). The client renders them in the browser's time zone.
- Enum values in query strings (`?status=pending`) are matched case-insensitively.
- Auth is a same-origin HTTP-only cookie. Unauthenticated calls get `401`, forbidden calls `403` (never a redirect).
- State-changing requests must send the header `X-Requested-With: PointHub` (cheap CSRF guard; the API rejects them with `400 csrf_header_missing` otherwise).
- Errors are RFC 7807 `application/problem+json` with a stable machine-readable `code`. The client translates `code`; `title` is English and for logs only.
- Paging: `?page=1&pageSize=50` (max 200) returns `Paged<T>`.

```ts
type Role = 'systemAdmin' | 'eventAdmin' | 'giftAdmin' | 'auditor';   // no role = a normal user (employee)
type Locale = 'en' | 'ja' | 'zh-Hant';
type LocalizedText = { en: string; ja: string | null; zhHant: string | null }; // fall back to `en` when null/empty
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };
type Problem = { title: string; status: number; code: string; detail?: string; errors?: Record<string, string[]> };
```

### Error codes

| code | status | meaning |
| --- | --- | --- |
| `validation_failed` | 400 | `errors` has per-field messages |
| `csrf_header_missing` | 400 | missing `X-Requested-With` header |
| `not_found` | 404 | entity does not exist |
| `event_not_open` | 409 | event status is not `open` (hosts open and close check-in by hand) |
| `conflict` | 409 | a concurrent request made the same change first; reload and retry |
| `unauthenticated` / `forbidden` | 401 / 403 | not signed in / missing role or API scope |
| `already_checked_in` | 409 | employee already has a check-in for the event |
| `not_on_roster` | 403 | event is roster-only and the employee is not on it |
| `event_full` | 409 | `maxParticipants` reached |
| `checkin_already_decided` | 409 | approve/reject on a non-pending check-in |
| `checkin_code_invalid` | 403 | event uses a rotating QR code and the `k` value is missing or expired – scan the code on the host's screen again |
| `card_not_registered` | 404 | no active card with that UID |
| `card_already_registered` | 409 | UID is bound to another employee |
| `invalid_card_uid` | 400 | UID is not 4, 7 or 10 bytes of hex |
| `employee_inactive` | 409 | target employee is deactivated |
| `insufficient_points` | 409 | balance too low for redemption |
| `out_of_stock` | 409 | not enough gift stock |
| `gift_limit_reached` | 409 | per-employee limit reached |
| `gift_inactive` | 409 | gift not redeemable |
| `already_reversed` | 409 | transaction was already reverted |
| `not_reversible` | 409 | transaction type cannot be reverted (e.g. a reversal) |
| `redemption_already_closed` | 409 | fulfill/cancel on a non-`requested` redemption |
| `invalid_csv` | 400 | roster file could not be parsed |
| `invalid_image` | 400 | upload is not a readable picture, or is too large |
| `too_many_images` | 409 | a gift can have at most 8 pictures |
| `last_system_admin` | 409 | the change would leave no system admin |
| `email_in_use` | 409 | integration employee upsert: the email already belongs to another employee number |

## Site (anonymous)

| method | path | body | returns |
| --- | --- | --- | --- |
| GET | `/api/health` | | `{ status: 'ok' }` |
| GET | `/api/site/config` | | `SiteConfig` |

```ts
type SiteConfig = {
  appName: string;
  authMode: 'dev' | 'oidc' | 'windows';   // dev sample sign-in, Microsoft Entra ID, or Windows authentication (on-prem AD)
  publicBaseUrl: string | null;   // when null, build links from window.location.origin
  activeTheme: string;            // a ThemeKey (see "Seasonal theme settings"); 'default' when no festival is on
  supportedLocales: Locale[];
  defaultLocale: Locale;
};
```

## Auth

| method | path | body | returns |
| --- | --- | --- | --- |
| GET | `/api/auth/me` | | `Me` or 401 |
| GET | `/api/auth/dev-users` | | `DevUser[]` (Development only, 404 otherwise) |
| POST | `/api/auth/dev-login` | `{ employeeNo }` | `Me` (Development only) |
| GET | `/api/auth/login?returnUrl=/` | | Single sign-on, for a full-page navigation (not fetch). `oidc`: 302 to Entra ID and back. `windows`: `401` with `WWW-Authenticate: Negotiate`, which the browser answers by itself, then 302. It ends at `returnUrl` (same-site paths only) with the session cookie set, or at `/login?error=no_account` (identified, but not an active employee) or `/login?error=sign_in_failed`. `404` in `dev` mode |
| POST | `/api/auth/logout` | | 204 |

```ts
type Me = {
  id: number; employeeNo: string; displayName: string; email: string; department: string | null;
  roles: Role[]; preferredLocale: Locale | null; balance: number;
};
type DevUser = { employeeNo: string; displayName: string; roles: Role[] };
```

## Me (any signed-in employee)

| method | path | body | returns |
| --- | --- | --- | --- |
| GET | `/api/me/points?page&pageSize` | | `MyPoints` |
| PUT | `/api/me/locale` | `{ locale: Locale }` | 204 |
| GET | `/api/me/redemptions` | | `Redemption[]` (newest first) |

```ts
type MyPoints = { balance: number; lifetimeEarned: number; lifetimeSpent: number; transactions: Paged<Transaction> };
type TransactionType = 'eventAward' | 'redemption' | 'adjustment' | 'reversal' | 'expiry';
type Transaction = {
  id: number; employeeId: number; employeeNo: string; employeeName: string;
  amount: number;                 // signed: positive = credit, negative = debit
  type: TransactionType; reason: string | null;
  eventId: number | null; eventTitle: LocalizedText | null;
  redemptionId: number | null;
  reversesTransactionId: number | null;    // set on a reversal
  reversedByTransactionId: number | null;  // set on the original once reverted
  createdAt: string; createdByName: string | null;
};
```

## Events and self check-in (any signed-in employee)

| method | path | body | returns |
| --- | --- | --- | --- |
| GET | `/api/events` | | `EventSummary[]` – open events plus drafts are hidden; ordered by `startsAt` |
| GET | `/api/checkin/{token}?k=` | | `CheckInPreview` |
| POST | `/api/checkin/{token}?k=` | | `CheckIn` (status `pending` or `approved` depending on `approvalMode`) |

`k` is the rotating code and is only needed when the event's `checkInMode` is `rotating`; it is ignored for `static` events. The check-in page must carry `k` from its own URL (`/c/{token}?k=…`) through sign-in and into both calls.

```ts
type EventStatus = 'draft' | 'open' | 'closed' | 'cancelled';
type ApprovalMode = 'manual' | 'autoApproveRoster' | 'autoApproveAll';
type CheckInStatus = 'pending' | 'approved' | 'rejected' | 'reverted';
type CheckInMethod = 'link' | 'card' | 'manual';
type CheckInMode = 'static' | 'rotating';   // static: one link per event (posters); rotating: code on the host's screen changes every few seconds
type EventSummary = {
  id: number; title: LocalizedText; description: LocalizedText | null; location: string | null;
  startsAt: string; endsAt: string; points: number; status: EventStatus; approvalMode: ApprovalMode;
  checkInMode: CheckInMode;
  myCheckInStatus: CheckInStatus | null;
};
type CheckInPreview = { event: EventSummary; canCheckIn: boolean; blockedCode: string | null }; // blockedCode is an error code from the table above
type CheckIn = {
  id: number; eventId: number; eventTitle: LocalizedText;
  employeeId: number; employeeNo: string; employeeName: string; department: string | null;
  method: CheckInMethod; status: CheckInStatus; onRoster: boolean; points: number;
  checkedInAt: string; decidedAt: string | null; decidedByName: string | null; note: string | null;
};
```

## Event admin (roles `eventAdmin` or `systemAdmin`; an event admin only sees the events they run, a system admin sees all)

| method | path | body | returns |
| --- | --- | --- | --- |
| GET | `/api/host/events` | | `EventSummary[]` (all statuses, newest first) |
| POST | `/api/host/events` | `EventInput` | `EventDetail` (status `draft`, creator becomes host) |
| GET | `/api/host/events/{id}` | | `EventDetail` |
| PUT | `/api/host/events/{id}` | `EventInput` | `EventDetail` |
| POST | `/api/host/events/{id}/status` | `{ status: EventStatus }` | `EventDetail` |
| POST | `/api/host/events/{id}/token` | | `EventDetail` with a fresh `checkInToken` (old links stop working) |
| GET | `/api/host/events/{id}/checkin-code` | | `RotatingCode` – poll this while showing the QR for a `rotating` event (`409 conflict` for a `static` one) |
| GET | `/api/host/events/{id}/roster` | | `RosterEntry[]` |
| POST | `/api/host/events/{id}/roster/import?replace=true` | multipart, field `file` (CSV) | `RosterImportResult` |
| POST | `/api/host/events/{id}/roster/rematch` | | `RosterImportResult` – re-compares the stored roster with the current employee master |
| GET | `/api/host/events/{id}/checkins?status=` | | `CheckIn[]` (newest first) |
| GET | `/api/host/checkins/pending` | | `CheckIn[]` – everything waiting for approval across the caller's events (all events for a system admin), oldest first, at most 100 |
| POST | `/api/host/events/{id}/checkins/approve-all` | `{ onlyRoster: boolean }` | `{ approved: number }` |
| POST | `/api/host/events/{id}/checkins/card` | `{ cardUid: string }` | `CheckIn` – station mode, approved immediately |
| POST | `/api/host/events/{id}/checkins/manual` | `{ employeeNo: string }` | `CheckIn` – approved immediately |
| POST | `/api/host/checkins/{id}/approve` | | `CheckIn` |
| POST | `/api/host/checkins/{id}/reject` | `{ reason: string | null }` | `CheckIn` |

```ts
type EventInput = {
  title: LocalizedText; description: LocalizedText | null; location: string | null;
  startsAt: string; endsAt: string; points: number;           // points >= 0
  approvalMode: ApprovalMode; checkInMode: CheckInMode; rosterOnly: boolean; maxParticipants: number | null;
};
type RotatingCode = {
  code: string;                    // QR URL is `${publicBaseUrl ?? origin}/c/${checkInToken}?k=${code}`
  expiresAt: string;               // when the next code starts; refetch then (the old code stays valid for a short grace period)
  periodSeconds: number;
};
type EventDetail = EventSummary & {
  checkInToken: string;            // static check-in URL is `${publicBaseUrl ?? origin}/c/${checkInToken}`
  rosterOnly: boolean; maxParticipants: number | null;
  hosts: { id: number; displayName: string }[];
  counts: { pending: number; approved: number; rejected: number; roster: number; rosterUnmatched: number };
};
type RosterMatchStatus = 'matched' | 'notFound' | 'inactive' | 'duplicate';
type RosterEntry = {
  id: number; employeeNo: string; name: string | null; email: string | null;
  matchStatus: RosterMatchStatus; employeeId: number | null; employeeName: string | null;
  checkInStatus: CheckInStatus | null;
};
type RosterImportResult = { total: number; matched: number; notFound: number; inactive: number; duplicate: number; entries: RosterEntry[] };
```

Roster CSV: UTF-8 (BOM allowed), header row required, columns `employeeNo` (required), `name`, `email` (optional, any order, case-insensitive header names). Rows are matched to employees by `employeeNo`, then by `email`.

## Gifts

| method | path | role | body | returns |
| --- | --- | --- | --- | --- |
| GET | `/api/gifts` | any | | `Gift[]` (active only) |
| POST | `/api/gifts/{id}/redeem` | any | `{ quantity: number }` | `Redemption` (status `requested`; points and stock are taken immediately) |
| GET | `/api/admin/gifts` | giftAdmin, systemAdmin | | `Gift[]` (all) |
| POST | `/api/admin/gifts` | giftAdmin, systemAdmin | `GiftInput` | `Gift` |
| PUT | `/api/admin/gifts/{id}` | giftAdmin, systemAdmin | `GiftInput` | `Gift` (does not change stock) |
| POST | `/api/admin/gifts/{id}/stock` | giftAdmin, systemAdmin | `{ delta: number; reason: string }` | `Gift` |
| GET | `/api/admin/redemptions?status=&q=&giftId=&page&pageSize` | giftAdmin, systemAdmin | | `Paged<Redemption>` – the claims list; `q` matches employee number or name |
| POST | `/api/admin/redemptions/{id}/fulfill` | giftAdmin, systemAdmin | | `Redemption` – marks the claim as handed over (`closedAt`, `closedByName` record when and by whom) |
| POST | `/api/admin/redemptions/{id}/reopen` | giftAdmin, systemAdmin | | `Redemption` – takes back a "fulfilled" mark made by mistake (status returns to `requested`) |
| POST | `/api/admin/redemptions/{id}/cancel` | giftAdmin, systemAdmin | `{ reason: string }` | `Redemption` (points refunded via a reversal, stock returned) |

```ts
type Gift = {
  id: number; name: LocalizedText; description: LocalizedText | null; images: GiftImage[]; // see "Gift images"
  pointCost: number; stock: number; isActive: boolean; perEmployeeLimit: number | null;
};
type GiftInput = Omit<Gift, 'id' | 'stock' | 'images'> & { initialStock?: number }; // initialStock only on POST
type RedemptionStatus = 'requested' | 'fulfilled' | 'cancelled';
type Redemption = {
  id: number; giftId: number; giftName: LocalizedText; quantity: number; pointsSpent: number;
  status: RedemptionStatus; employeeId: number; employeeNo: string; employeeName: string;
  requestedAt: string; closedAt: string | null; closedByName: string | null;
};
```

## Admin

| method | path | role | body | returns |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/stats` | systemAdmin, auditor | | `AdminStats` – the numbers on the admin dashboard |
| GET | `/api/admin/transactions?employeeId=&type=&eventId=&q=&page&pageSize` | systemAdmin, auditor | | `Paged<Transaction>`; `q` matches employee number or name |
| POST | `/api/admin/transactions/{id}/revert` | systemAdmin | `{ reason: string }` | `Transaction` (the new reversal) |
| POST | `/api/admin/adjustments` | systemAdmin | `{ employeeId: number; amount: number; reason: string }` | `Transaction` (`amount` is signed, non-zero) |
| GET | `/api/admin/employees?q=&page&pageSize` | systemAdmin, auditor | | `Paged<Employee>` |
| PUT | `/api/admin/employees/{id}/roles` | systemAdmin | `{ roles: Role[] }` (empty = normal user) | `Employee` – `409 last_system_admin` if it would leave no system admin |
| POST | `/api/admin/employees/{id}/cards` | systemAdmin | `{ cardUid: string; label: string | null }` | `Card` |
| DELETE | `/api/admin/cards/{id}` | systemAdmin | | 204 |
| GET | `/api/admin/audit?page&pageSize` | systemAdmin, auditor | | `Paged<AuditEntry>` |

```ts
type AdminStats = {
  // "Issued" = event awards, positive and negative adjustments and external credits, net of their reverts.
  // "Redeemed" = gift claims and external debits, net of refunds. Months and weeks are in the site time zone.
  pointsIssuedThisMonth: number; pointsIssuedLastMonth: number;
  pointsRedeemedThisMonth: number; pointsRedeemedLastMonth: number;
  activeParticipants: number;   // active employees with at least one approved check-in in the last 90 days
  totalEmployees: number;       // active employees
  outstandingPoints: number;    // sum of all balances
  pendingCheckIns: number;      // waiting for approval, all events
  openClaims: number;           // claims not yet handed over
  weeks: { weekStart: string; issued: number; redeemed: number }[]; // the last 12 weeks, oldest first; weekStart is a Monday, `YYYY-MM-DD`
};
type Card = { id: number; uid: string; label: string | null; isActive: boolean; registeredAt: string }; // uid is normalized upper-case hex
type Employee = {
  id: number; employeeNo: string; displayName: string; email: string; department: string | null;
  isActive: boolean; roles: Role[]; balance: number; cards: Card[];
};
type AuditEntry = { id: number; actorName: string | null; action: string; entityType: string; entityId: string | null; summary: string | null; createdAt: string };
```

Card UIDs are accepted in any common reader format (`04:A2:3B:1C`, `04a23b1c`, `04 A2 3B 1C`) and normalized server-side to upper-case hex without separators.

### Seasonal theme settings (systemAdmin only)

The theme follows Taiwan's festival calendar unless an admin forces one. The calendar is computed by the server for any year (lunar festivals included); nothing needs to be maintained by hand.

| method | path | body | returns |
| --- | --- | --- | --- |
| GET | `/api/admin/site/theme` | | `ThemeSettings` |
| PUT | `/api/admin/site/theme` | `ThemeSettingsInput` | `ThemeSettings` |

```ts
type ThemeKey =
  | 'default'            // standard look (company blue and green)
  | 'new-year'           // 元旦 – 1 January
  | 'lunar-new-year'     // 春節
  | 'lantern-festival'   // 元宵節
  | 'qingming'           // 清明節 / spring
  | 'dragon-boat'        // 端午節
  | 'qixi'               // 七夕
  | 'ghost-festival'     // 中元節
  | 'mid-autumn'         // 中秋節
  | 'national-day'       // 國慶日 – 10 October
  | 'double-ninth'       // 重陽節
  | 'winter-solstice'    // 冬至
  | 'christmas';         // 聖誕節
type ThemeSettingsInput = {
  mode: 'calendar' | 'forced';        // default 'calendar'
  forcedThemeKey: ThemeKey | null;    // required when mode is 'forced'
  disabledThemeKeys: ThemeKey[];      // festivals the calendar should skip (e.g. the solemn ones)
};
type ThemeWindow = { themeKey: ThemeKey; festivalDate: string; startsOn: string; endsOn: string }; // dates are `YYYY-MM-DD` in the site time zone, inclusive
type ThemeSettings = ThemeSettingsInput & {
  activeTheme: ThemeKey;              // what everyone sees right now
  calendarTheme: ThemeKey;            // what the calendar alone would show today
  today: string;                      // `YYYY-MM-DD` in the site time zone
  calendar: ThemeWindow[];            // the next 12 months, ordered by startsOn, disabled ones included
};
```

When two windows overlap, the shorter one wins (the winter solstice inside the Christmas period, for example). `SiteConfig.activeTheme` is a `ThemeKey`; a client that does not know a key falls back to `default`.

### Gift images (giftAdmin, systemAdmin)

| method | path | body | returns |
| --- | --- | --- | --- |
| POST | `/api/admin/gifts/{id}/images` | multipart, one or more parts named `files` | `Gift` |
| DELETE | `/api/admin/gifts/{id}/images/{imageId}` | | `Gift` |
| PUT | `/api/admin/gifts/{id}/images/order` | `{ imageIds: string[] }` – every image of the gift, in the new order | `Gift` |

```ts
type GiftImage = { id: string; url: string; width: number; height: number }; // url is site-relative: `/uploads/assets/{id}.webp`
// Gift (above) has `images: GiftImage[]` in display order instead of `imageUrl`; GiftInput has neither.
```

- Accepted: JPEG, PNG, WebP, GIF (first frame), at most 8 MB per file and 8 images per gift. The server decodes every upload (the file extension and content type are not trusted), applies the EXIF orientation, drops metadata, scales the picture up or down to fit inside a 1024 × 1024 frame (aspect ratio kept), centres it on a transparent 1024 × 1024 canvas and stores it as WebP. Every gift image therefore has the same square size, and the client can show them in a fixed frame without cropping.
- Files are stored flat in the application's `uploads/assets` folder (`Uploads:AssetsPath`) under a random id, and served from `/uploads/assets/`.
- Errors: `invalid_image` (400, not a readable image or too large), `too_many_images` (409).

### Email (systemAdmin only)

PointHub sends email through an SMTP server configured in `appsettings` / environment (`Smtp:*`; the password is never stored in the database or shown). Messages are written to an outbox in the same database transaction as the change that caused them and are delivered by a background worker with retries. Admins edit the templates.

| method | path | body | returns |
| --- | --- | --- | --- |
| GET | `/api/admin/email` | | `EmailSettings` |
| PUT | `/api/admin/email/templates/{key}/{locale}` | `{ subject: string; body: string }` | `EmailTemplate` |
| DELETE | `/api/admin/email/templates/{key}/{locale}` | | `EmailTemplate` – back to the built-in default |
| PUT | `/api/admin/email/templates/{key}/enabled` | `{ isEnabled: boolean }` | `EmailSettings` – switches that notification on or off in every language |
| POST | `/api/admin/email/preview` | `{ key: EmailTemplateKey; locale: Locale; subject: string; body: string }` | `{ subject: string; text: string; html: string }` rendered with sample values |
| POST | `/api/admin/email/test` | `{ to: string; key: EmailTemplateKey; locale: Locale }` | `{ ok: boolean; error: string | null }` – sends now and reports the SMTP server's answer |
| GET | `/api/admin/email/outbox?status=&page&pageSize` | | `Paged<EmailLogEntry>` (newest first) |

```ts
type EmailTemplateKey =
  | 'checkInApproved' | 'checkInRejected'
  | 'redemptionRequested' | 'redemptionFulfilled' | 'redemptionCancelled'
  | 'pointsAdjusted';
type EmailTemplate = {
  key: EmailTemplateKey; locale: Locale;
  subject: string; body: string;          // plain text with {{placeholders}}; blank lines separate paragraphs
  isCustomized: boolean;                  // false = built-in default
  isEnabled: boolean;                     // per key, same in every locale
  placeholders: string[];                 // names allowed in this template, e.g. ['employeeName', 'eventTitle', 'points', 'balance', 'siteUrl']
};
type EmailSettings = {
  smtp: { configured: boolean; host: string | null; port: number; security: 'none' | 'startTls' | 'ssl'; fromAddress: string | null; fromName: string | null; authenticated: boolean };
  queue: { pending: number; failed: number; sentLast24Hours: number };
  templates: EmailTemplate[];             // every key in every locale
};
type EmailStatus = 'pending' | 'sent' | 'failed' | 'skipped';   // skipped: SMTP is not configured
type EmailLogEntry = { id: number; to: string; subject: string; templateKey: EmailTemplateKey | null; status: EmailStatus; attempts: number; lastError: string | null; createdAt: string; sentAt: string | null };
```

Each message goes to the affected employee in their preferred language (site default if none). Unknown `{{placeholders}}` are rejected with `validation_failed` when a template is saved. Values are HTML-escaped; templates cannot contain markup.

### API clients (systemAdmin only) – keys for other applications

| method | path | body | returns |
| --- | --- | --- | --- |
| GET | `/api/admin/api-clients` | | `ApiClient[]` (newest first) |
| POST | `/api/admin/api-clients` | `{ name: string; scopes: ApiScope[]; expiresAt: string | null }` | `{ client: ApiClient; apiKey: string }` – **the only time the key is returned**; only its hash is stored |
| POST | `/api/admin/api-clients/{id}/revoke` | | `ApiClient` |

```ts
type ApiScope = 'points:read' | 'points:write' | 'employees:write';
type ApiClient = {
  id: number; name: string; keyPrefix: string;        // first characters of the key, to tell keys apart
  scopes: ApiScope[]; isActive: boolean;              // false once revoked or expired
  createdAt: string; createdByName: string | null; lastUsedAt: string | null; expiresAt: string | null; revokedAt: string | null;
};
```

## Integration API (other applications, API key)

For server-to-server callers such as a canteen kiosk, an HR system or a survey tool. Not used by the web app.

- Base path `/api/integration/v1`. Send the key as `X-Api-Key: phk_…` (or `Authorization: Bearer phk_…`). Cookies are ignored here and the `X-Requested-With` header is not needed.
- Missing, unknown, revoked or expired key: `401`. Key without the required scope: `403`. More than `Integration:RequestsPerMinute` (default 120) calls per key per minute: `429`.
- Errors use the same problem+json shape and codes as above.

| method | path | scope | body | returns |
| --- | --- | --- | --- | --- |
| GET | `/employees/{employeeNo}/points` | `points:read` | | `EmployeePoints` |
| GET | `/employees/{employeeNo}/transactions?page&pageSize` | `points:read` | | `Paged<Transaction>` (newest first) |
| GET | `/cards/{uid}/points` | `points:read` | | `EmployeePoints` of the card holder (`404 card_not_registered`) |
| POST | `/transactions` | `points:write` | `ExternalTransactionInput` | `201 Transaction`, or `200` with the original transaction when `externalReference` was already used by this key |
| PUT | `/employees/{employeeNo}` | `employees:write` | `EmployeeUpsert` | `201` / `200 EmployeeRecord` – how the HR system creates, updates and deactivates employees |

```ts
type EmployeeUpsert = { displayName: string; email: string; department: string | null; isActive: boolean };
type EmployeeRecord = EmployeeUpsert & { employeeNo: string };
type EmployeePoints = { employeeNo: string; displayName: string; isActive: boolean; balance: number; lifetimeEarned: number; lifetimeSpent: number };
type ExternalTransactionInput = {
  employeeNo: string;
  amount: number;             // signed, non-zero: positive credits (type `externalCredit`), negative debits (`externalDebit`)
  reason: string;             // shown to the employee and in the admin ledger
  externalReference: string;  // the caller's own id for this operation (max 100 chars); makes retries safe
};
```

The employee upsert matches by `employeeNo` first and then by `email`. The email match is what links a record that was auto-created at an employee's first single sign-on (before HR pushed them) to the real employee number. Roles are never set through this API, and deactivating an employee keeps their points and history.

A debit never takes a balance below zero (`409 insufficient_points`). External transactions appear in the admin ledger with the client name and can be reverted there like any other.

`Transaction` therefore has two more fields and two more types than listed above:

```ts
type TransactionType = 'eventAward' | 'redemption' | 'adjustment' | 'reversal' | 'expiry' | 'externalCredit' | 'externalDebit';
type Transaction = { /* …fields above… */ apiClientName: string | null; externalReference: string | null };
```

## Card bridge (PC/SC readers, local WebSocket)

Browsers cannot talk to PC/SC readers such as the ACR122U. `tools/PointHub.CardBridge` is a small program that runs on the station PC and pushes card taps to the page over a loopback WebSocket. Keyboard-wedge readers do not need it.

- URL: `ws://127.0.0.1:47615/` (override in the web app with `VITE_CARD_BRIDGE_URL`). The bridge only accepts connections whose `Origin` is in its `AllowedOrigins` setting, so other websites cannot read badge numbers.
- Messages are JSON text frames, bridge → page only:

```ts
type BridgeMessage =
  | { type: 'hello'; version: 1; readers: string[] }     // sent once on connect
  | { type: 'readers'; readers: string[] }                // a reader was plugged in or removed
  | { type: 'card'; uid: string; reader: string }         // a card was presented; uid is upper-case hex
  | { type: 'error'; message: string; reader: string | null };
```

The page treats a `card` message exactly like a keyboard-wedge read and sends `uid` to the API unchanged.

## Roles

| role | can do |
| --- | --- |
| *(none)* – normal user | See own points and history, check in to events, browse gifts, claim gifts, see own claims |
| `eventAdmin` | Everything a normal user can, plus: create and edit events, show the check-in QR, import and re-match rosters, approve or reject check-ins, run the card station – for the events they run |
| `giftAdmin` | Everything a normal user can, plus: manage gifts, pictures, stock and per-person limits; see all claims and mark them fulfilled, reopen or cancel them |
| `systemAdmin` | Everything above for all events and gifts, plus: the full ledger, revert and adjust points, employees, roles and cards, API keys, seasonal theme, email templates, audit log |
| `auditor` | Read-only: ledger, employees, audit log |

A person can hold several roles. Roles are granted by a system admin (`PUT /api/admin/employees/{id}/roles`); the first system admins come from `Auth:BootstrapAdminEmails`.

## Planned, not in v0

- Outbound webhooks, reports/export
