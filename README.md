# PointHub

Central point management for employee activities: employees earn points by taking part in company events and spend them on gifts.

- **Employees** check in to an event by scanning its QR code / link or tapping their staff badge, watch their balance, and redeem gifts.
- **Event admins** create events, set the points, import and reconcile participant lists, and approve check-ins.
- **Gift admins** manage gifts, pictures and stock, and mark claims as fulfilled.
- **System admins** see every record, revert and adjust points, manage roles, API keys, email templates and the seasonal theme.
- **Other applications** read balances and add or spend points through an API-key protected integration API.
- English, Japanese and Traditional Chinese; seasonal themes that follow Taiwan's festival calendar; email notifications over SMTP.

Status: **scaffold**. The backend, the database and the web front end run end to end with sample data. A walk-through with screenshots, workflows and the open decisions is in the **proposal page**: start the app and open <http://localhost:5173/proposal/index.html> (source in `web/public/proposal`).

## Layout

| path | what |
| --- | --- |
| `src/PointHub.Domain` | Entities and business rules, no dependencies (ledger, check-in, roster matching, card UIDs, API keys) |
| `src/PointHub.Infrastructure` | EF Core (SQL Server), migrations, services, dev seed data |
| `src/PointHub.Api` | ASP.NET Core 10 minimal API; serves the built React app in production |
| `web/` | React 19 + Vite + TypeScript + Chakra UI front end ("Arcade" design); the proposal page is in `web/public/proposal` |
| `tools/PointHub.CardBridge` | Local helper that lets the browser use PC/SC card readers (ACR122U, …) |
| `tools/screenshots` | Script that captures the proposal page's screenshots from the running app |
| `design-lab/` | The six design prototypes the look was chosen from (Arcade / Chakra UI won) |
| `tests/PointHub.Tests` | xUnit tests for the domain rules |
| `docs/` | [architecture](docs/architecture.md) · [API contract](docs/api.md) · [decisions](docs/decisions.md) · [front end](docs/frontend.md) · [IIS deployment](docs/deployment-iis.md) |

## Prerequisites

- .NET SDK 10.0 (`global.json` pins the 10.0 feature band)
- Node.js 22 or newer (developed on 24)
- SQL Server Express LocalDB (ships with Visual Studio; instance `MSSQLLocalDB`)

## Run it locally

```powershell
dotnet tool restore
```

```powershell
npm --prefix web install
```

**Visual Studio / Rider:** open `PointHub.slnx`, set `PointHub.Api` as the startup project and press F5 with the profile *PointHub (API + React dev server)*. It starts the API on <http://localhost:5180>, starts Vite on <http://localhost:5173> and opens the browser.

**Command line**, two terminals:

```powershell
dotnet run --project src/PointHub.Api --launch-profile "API only"
```

```powershell
npm --prefix web run dev
```

Then open <http://localhost:5173>. On first start the API creates the `PointHub` database on `(localdb)\MSSQLLocalDB`, applies the migrations and seeds sample employees, events, gifts and cards. The sign-in page lists the sample people; pick one (system admin, event admin, gift admin, auditor or staff) – there are no passwords in development.

To scan QR codes with a phone during development, open the site through the PC's LAN address (Vite listens on all interfaces) or set `Site:PublicBaseUrl`.

## Everyday commands

| task | command |
| --- | --- |
| Build everything | `dotnet build` |
| Unit tests | `dotnet test` |
| Front-end type check + build | `npm --prefix web run build` |
| Front-end lint | `npm --prefix web run lint` |
| Add a migration | `dotnet ef migrations add <Name> --project src/PointHub.Infrastructure --startup-project src/PointHub.Api --output-dir Persistence/Migrations` |
| Reset the dev database | `dotnet ef database drop --force --project src/PointHub.Infrastructure --startup-project src/PointHub.Api` (it is recreated and reseeded on the next start) |
| Publish API + web app | `dotnet publish src/PointHub.Api -c Release -o publish/pointhub` |
| Build the design gallery | `npm --prefix design-lab run build` then `npm --prefix design-lab run serve` → <http://localhost:5200> |
| Run the card bridge | `dotnet run --project tools/PointHub.CardBridge` |
| Refresh the proposal screenshots | `npm --prefix tools/screenshots install` once, then `npm --prefix tools/screenshots run capture` (API and web dev server running) |

OpenAPI for the running API (Development only): <http://localhost:5180/openapi/v1.json>.

## Configuration

Everything is in `src/PointHub.Api/appsettings.json`; `appsettings.Development.json` overrides it for local debugging. In production set values with environment variables (`ConnectionStrings__PointHub`, `Auth__Mode`, `Auth__EntraId__ClientSecret`, …) rather than editing files, and never commit secrets.

| section | purpose |
| --- | --- |
| `ConnectionStrings:PointHub` | SQL Server connection string |
| `Database:AutoMigrate` / `SeedDevData` | Apply migrations / load sample data at start-up (development only; the app refuses to seed in Production) |
| `Auth:Mode` | How people sign in: `EntraId`, `Windows` (on-prem Active Directory through IIS) or `Dev` (sample sign-in; refused in Production) |
| `Auth:EntraId:*` | Tenant id, client id and secret, claim names (mode `EntraId`) |
| `Auth:Windows:*` | Directory lookup, fallback email domain, allowed domains (mode `Windows`) |
| `Auth:AutoCreateEmployees` | Create a provisional employee at first sign-in (both single sign-on modes) |
| `Auth:BootstrapAdminEmails` | People who become system admins when they first sign in |
| `Site:*` | App name, public URL for QR codes, default language, time zone, seasonal theme schedule |
| `CheckIn:*` | Rotating QR code period and grace |
| `Integration:RequestsPerMinute` | Rate limit per API key |
| `Uploads:AssetsPath` | Folder for gift pictures (flat files, default `uploads/assets` under the API project) |
| `Smtp:*` | SMTP server for notifications; leave `Host` empty to record emails as skipped. For local testing point it at a catch-all tool such as smtp4dev or Papercut |
