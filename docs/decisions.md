# Decisions

Three lists: what the product owner has decided, what the scaffold assumes until someone says otherwise, and what is still open. Change this file when a decision changes; the code comments refer to the ids.

## Decided

| id | decision | date | where it shows in the code |
| --- | --- | --- | --- |
| D-01 | Sign-in is **Microsoft Entra ID** single sign-on (OpenID Connect). Local debugging uses a password-less sample sign-in that cannot be enabled in Production. | 2026-11-25 | `Api/Auth/AuthSetup.cs`, `Auth:Oidc:*` |
| D-02 | The employee list comes from **two sources**: a provisional record is created at a person's first sign-in, and the **HR system pushes** employees through the integration API (`PUT /api/integration/v1/employees/{employeeNo}`). The push adopts a provisional record with the same email and gives it the real employee number. | 2026-11-25 | `Infrastructure/Services/EmployeeDirectory.cs` |
| D-03 | Card readers: **USB keyboard-wedge** readers (no install) and **PC/SC** readers such as the ACR122U through the local card bridge. | 2026-11-25 | `web/src/features/cardReader`, `tools/PointHub.CardBridge` |
| D-04 | Production hosting is **on-premises IIS + SQL Server**. | 2026-11-25 | `docs/deployment-iis.md` |
| D-05 | Points **never expire**. (`Expiry` exists as a transaction type but nothing creates it.) | 2026-11-25 | – |
| D-06 | Reverting an award whose points were already spent is allowed and leaves a **negative balance**. Spending can never go below zero. | 2026-11-25 | `PointAccount.Apply`, `PointLedger.RevertAsync` |
| D-07 | Each event chooses its QR mode: **static** link (posters; pair with host approval) or **rotating** code that changes every 30 s on the host's screen. | 2026-11-25 | `Event.CheckInMode`, `Event.RotatingCode`, `CheckIn:*` |
| D-08 | One site, **Taiwan** (`Asia/Taipei`). The three UI languages stay. | 2026-11-25 | `Site:TimeZone` |
| D-09 | Other applications connect through an **API-key protected integration API** with per-key scopes (`points:read`, `points:write`, `employees:write`). Keys are issued and revoked by admins and stored only as hashes. | 2026-11-24 | `Api/Endpoints/IntegrationEndpoints.cs`, `Api/Auth/ApiKeyAuthentication.cs` |
| D-10 | The look is **"Arcade" on Chakra UI v3**, picked from six prototypes (Mantine, HeroUI, shadcn/ui, Ant Design, MUI, Chakra UI). The app in `web/` is ported to it; the prototypes stay in `design-lab/` for reference. | 2026-11-25 | `web/`, `design-lab/chakra` |
| D-11 | The **standard theme uses the company blue and green** (`#199ECF`, `#75B42B`, grey `#54555A` – read from public copies of the logo; official values still to be confirmed, see O-24). Only the colours are used, never the logo. | 2026-11-25 | `web/src/themes` |
| D-12 | **Seasonal themes cover Taiwan's common festivals** – New Year, Lunar New Year, Lantern Festival, Qingming, Dragon Boat, Qixi, Ghost Festival, Mid-Autumn, National Day, Double Ninth, Winter Solstice, Christmas – with **pixel-art SVG** motifs instead of emoji. The theme **follows a calculated festival calendar by default**; a system admin can skip festivals or force one theme. | 2026-11-25 | `Domain/Site/FestivalCalendar.cs`, `SiteThemeService`, `/admin/themes` |
| D-13 | Gifts have **several uploaded pictures**, stored as flat files in the application's `uploads/assets` folder under random ids and **normalised to one square frame** (1024 px WebP) by the server. | 2026-11-25 | `GiftImageService` |
| D-14 | PointHub **sends email through SMTP** with admin-editable templates per notification and language. Messages go through an outbox and a background sender. SMTP server settings live in configuration, not in the database. | 2026-11-25 | `EmailService`, `EmailDispatcher`, `Smtp:*`, `/admin/email` |
| D-15 | Roles are **system admin, event admin, gift admin and normal user** (plus the read-only auditor, see O-25), granted by a system admin. Gift admins **mark each claim fulfilled** in the claims list; the mark can be undone. | 2026-11-25 | `EmployeeRoles`, `PUT /api/admin/employees/{id}/roles`, `/admin/claims` |

## Assumed by the scaffold (say so if any is wrong)

| id | assumption | why |
| --- | --- | --- |
| A-01 | The ledger is **append-only**. Nothing is edited or deleted; a correction is a new transaction that points at the one it reverses, and a transaction can be reversed once. | Auditable, and balances can always be recomputed. |
| A-02 | **One check-in per employee per event**, enforced by a unique index. | Prevents double awards from double scans. |
| A-03 | Hosts **open and close check-in by hand** (event status). Start and end times are informational. | Real events run late; a hard time window causes support calls. See O-09. |
| A-04 | A check-in made **by a host** (card tap at the station, or typing an employee number) is approved at once. A **self** check-in follows the event's approval mode: manual, auto-approve people on the roster, or auto-approve everyone. | The host is physically present for the first kind. |
| A-05 | A roster does not restrict check-in unless the event is marked **roster only**. | Walk-ins are common; hosts see a "walk-in" badge and decide. |
| A-14 | A gift's limit per person is **per gift, for ever, and optional** (none by default). | The simplest rule that covers "one each"; limits per period are open (O-26). |
| A-15 | Email is sent for: check-in approved by an event admin, check-in rejected, claim received, claim handed over, claim cancelled, points adjusted or reverted. Instant approvals (badge tap, automatic) send nothing. Each can be switched off. | People get mail only for things that happened while they were not looking at the page. |
| A-16 | Uploaded pictures: JPEG, PNG, WebP or GIF, at most 8 MB each and 8 per gift; re-encoded by the server so metadata such as location is dropped. | Bounded storage, no stray personal data, and nothing a user uploads is served back as-is. |
| A-06 | Redeeming takes the **points and the stock immediately**; a gift manager later marks it fulfilled or cancels it (points refunded by a reversal, stock returned). A redemption debit cannot be reverted from the ledger directly. | Stock can never be oversold, and the ledger and stock always move together. |
| A-07 | Event admins see **only the events they created**; system admins see all. A person can hold several roles. The last system admin cannot remove their own role. | Keeps events private to their organisers without a sharing feature (O-13). |
| A-08 | A card **UID is stored as plain normalised hex** and treated as an identifier, not a secret. A tap means "this badge was here". | UIDs can be cloned; hashing them would not change that and would complicate support. |
| A-09 | Free text (event titles, gift names) is entered in up to three languages; **English is required** and is the fallback. | A gift must be nameable in every UI language. |
| A-10 | Rotating codes are valid for the current 30 s period plus the two before it (about 90 s) so a person can sign in after scanning. | Shorter is stricter but fails people on slow phones. Tunable in `CheckIn:*`. |
| A-11 | API keys: 256-bit random, shown once, SHA-256 hash stored, 120 requests per minute per key, external debits can never overdraw. Retried requests are idempotent by `externalReference`. | Standard practice for server-to-server keys. |
| A-12 | All timestamps are stored and sent in UTC and shown in the viewer's browser time zone. | Correct by construction if a second site is ever added. |
| A-13 | Sessions last 12 hours (sliding). A deactivated employee is signed out and role changes apply within 5 minutes. | Balance between convenience and revocation. |

## Open – needs an owner and an answer

Ordered roughly by how soon it blocks something. "Suggestion" is what I would do absent other input.

### Before the first real event

| id | question | suggestion |
| --- | --- | --- |
| O-01 | **Who are the first system admins?** | List them in `Auth:BootstrapAdminEmails` (implemented); they grant every other role from the Employees page. |
| O-02 | **Entra ID details:** tenant, app registration, and which claim carries the employee number (needs an optional/extension claim; without it a provisional record uses the mailbox name until HR pushes the person). | Ask IT for an app registration with the `email` optional claim and, if available, `employeeid`. |
| O-03 | **Card convention:** are existing staff badges reused, which card type are they (MIFARE Classic 4-byte, DESFire 7-byte, …), and do the chosen wedge and PC/SC readers report the same byte order? Who registers cards – admins only, or employees themselves at first tap? | Test three real badges on both reader types before buying in bulk. Start with admin registration plus an import of badge numbers from the access-control system if it can export them. |
| O-04 | **What is a point worth**, and who owns the budget? Is there a cap per event, per department or per employee per month? Does a large award or adjustment need a second approver? | Fix a reference value (for example 1 point ≈ NT$1 of gift cost) so gift prices are consistent. Add a per-event cap and a four-eyes rule above a threshold once volumes are known. |
| O-05 | **Tax and accounting** of gifts and outstanding points (employee welfare benefits, withholding thresholds, liability on the books). | Finance and HR to confirm before the catalogue includes anything of real value such as vouchers or leave. The ledger already supports a liability report. |
| O-06 | **Leavers:** what happens to points when an employee is deactivated? | Keep the history; block earning and spending at once (implemented); decide whether there is a final redemption window. |
| O-07 | **Gift fulfilment process:** where and how gifts are handed over, how the employee is told, whether employees may cancel their own redemption, and what happens to items like "half-day off" that need a manager. | Pickup at a named desk, gift manager marks fulfilled; no self-cancel in the first version. |
| O-08 | **Privacy:** who may see whose balance and attendance, how long audit and check-in records are kept, and the notice employees get (Taiwan PDPA). Is a leaderboard acceptable, and is it opt-in? | Employees see only their own data; hosts see attendance of their events; admins and auditors see all. Leaderboard off by default. |

### Product scope

| id | question | suggestion |
| --- | --- | --- |
| O-09 | Should check-in be limited by **time window**, **company network** or **location** as well as the QR mode? | Rotating QR covers most abuse. Add "company network only" as an event option if posters are used for high-value events. |
| O-10 | **Multi-session or recurring events**, partial attendance, check-out, different points per session? | Model each session as its own event for now; add an event series later. |
| O-11 | **"Other purposes" for points** beyond gifts: peer-to-peer recognition, charity donations, raffles, canteen spend? | Canteen-style spend already works through the integration API. Peer recognition is the most requested extra in similar programmes; decide whether it draws on a separate monthly allowance. |
| O-12 | **Which emails are on at launch**, from which address, and should gift admins be told about new claims? Microsoft Teams as well? | All six built notifications on; add "new claim" to gift admins if the claims list is not checked daily. |
| O-13 | **Who may create events?** Only hosts appointed by an admin, or any employee with approval? | Appointed hosts (current behaviour). |
| O-14 | **Gift catalogue:** real photos (where are they stored?), categories, availability windows, per-person limits per period rather than for ever. | Store images on the IIS server's data folder behind the API; add categories when the catalogue passes about twenty items. |
| O-15 | **Reports and exports:** which monthly numbers does management want, and is CSV/Excel export enough or is a BI feed needed? | CSV export of ledger and attendance per event first. |
| O-16 | **Existing data:** are there points or attendance records in spreadsheets that must be imported at launch? | Import as `adjustment` transactions with a clear reason so the history is honest about its origin. |
| O-17 | **Which festivals should change the site?** All twelve are designed; Qingming and the Ghost Festival are solemn. | Keep all on in a calm style, or skip those two – a system admin can switch any festival off. |
| O-18 | **Integration governance:** who approves a new API key, how often keys rotate, whether a key should be limited to source IP addresses, and whether PointHub must call other systems back (webhooks). | Admin approval with a named owner per key, yearly rotation, IP allow-list for keys that can write. |

| O-24 | **Official brand colours:** the exact blue, green and grey, and any rules for using them. | Ask the brand team; replace the three values in the standard theme. |
| O-25 | **Keep the read-only auditor role** in addition to the four requested roles? | Keep it: it costs nothing and gives Finance or Internal Audit a safe way in. |
| O-26 | **Limit on claiming a gift:** per-gift optional limit (today), always one per person, no limits, or a limit per period (month / quarter / year)? | Per-gift optional limit to start; add per-period limits only if a real case appears. |

### Operations (IT)
| id | question | suggestion |
| --- | --- | --- |
| O-19 | **Reachability:** phones must reach the on-prem site to scan a QR code. Company Wi-Fi only, VPN, or published through a reverse proxy? | Decide early – it determines whether QR check-in works for off-site events at all. |
| O-20 | Host name and **TLS certificate**, SQL Server instance and backup schedule, where logs go, who is paged. | See `docs/deployment-iis.md` for what the app needs. |
| O-21 | **Deployment process:** who runs migrations and how (the app does not migrate automatically in production), CI/CD, a staging environment with test Entra tenant. | Generate an idempotent SQL script per release and have a DBA apply it. |
| O-22 | **Card bridge roll-out:** how the helper is installed and updated on station PCs, and which site origins it trusts. | One shared publish folder plus a scheduled task; see the bridge README. |
| O-23 | **Supported browsers and devices**, accessibility target (WCAG 2.1 AA?), and whether venues with poor connectivity need an offline queue for card taps. | Evergreen Chrome/Edge/Safari; AA; no offline mode in the first version. |

## UI kit research (for D-10)

Six kits were chosen to cover the realistic range for this app – an animated employee side plus a data-heavy admin side, three languages including CJK, runtime seasonal theming:

| kit | strength for PointHub | watch out for |
| --- | --- | --- |
| **Mantine** | Broadest set of ready components and hooks (forms, dates, dropzone, notifications, charts); theme object + CSS variables make runtime themes easy. The working app is built on it. | Its default look is plain; animation is added with Motion. |
| **HeroUI v3** | Polished, modern defaults with motion built in; Tailwind v4 + React Aria accessibility. | v3 is a recent rewrite; fewer data components (tables, charts) – more to build for the admin side. |
| **shadcn/ui** | Components are copied into the repo, so the design is fully ours; large ecosystem of animated add-ons. | We own and maintain every component; consistency is our job. |
| **Ant Design** | Strongest tables, forms and admin patterns; first-class Traditional Chinese and Japanese locale packs; very familiar to back-office users in Taiwan. | Looks "enterprise" unless customised; heavier bundle; employee side needs extra design work. |
| **MUI** | Most widely used; mature data grid and charts; strong theming with CSS variables. | Material look is recognisable; the best grid features are in the paid tier. |
| **Chakra UI v3** | Token-first theming (semantic tokens, recipes) suits seasonal themes; pleasant developer experience. | Smaller component set than Mantine/Ant; charts and tables are thinner. |

Each prototype's own notes (bundle size, what the kit made hard) are in `design-lab/README.md`.
