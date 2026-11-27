# Deploying to IIS with SQL Server (decision D-04)

This is what the application needs from the server. It has not been deployed yet; treat it as a checklist to validate on the first staging install.

## Server prerequisites

- Windows Server with IIS and the **ASP.NET Core 10 Hosting Bundle** (install it after IIS; it adds the ASP.NET Core Module).
- The **WebSocket Protocol** IIS feature is not required by PointHub itself (the card bridge runs on station PCs, not on the server).
- SQL Server 2019 or later reachable from the web server.
- A host name and TLS certificate. HTTPS is mandatory: the sign-in cookie is `Secure`, and browsers only allow the camera, Web NFC and the card-bridge connection on secure pages.

## Build

Run on a build machine with the .NET 10 SDK and Node.js:

```powershell
dotnet publish src/PointHub.Api -c Release -o publish/pointhub
```

This runs `npm ci` and `npm run build` in `web/` and copies the result into `publish/pointhub/wwwroot`. A `web.config` for the ASP.NET Core Module is generated in the output.

## Database

The app does **not** apply migrations in production (`Database:AutoMigrate` is `false`). Produce an idempotent script per release and have it reviewed and run:

```powershell
dotnet ef migrations script --idempotent --project src/PointHub.Infrastructure --startup-project src/PointHub.Api -o publish/pointhub-migrate.sql
```

Create a database and a login for the app with `db_datareader`, `db_datawriter` and `EXECUTE`; the migration script is run by a DBA with DDL rights. Prefer Windows authentication with the application pool identity (`Trusted_Connection=True`) over a SQL login.

## IIS site

1. Create an application pool: **No Managed Code**, its own identity (ApplicationPoolIdentity or a domain service account), *Load User Profile* = **True** (see data protection below).
2. Create the site on the publish folder with an HTTPS binding.
3. Give the pool identity read access to the site folder, and modify access to the uploads folder (`Uploads__AssetsPath`) and the key folder below. Include the uploads folder in the backup: the database only holds the picture ids.

### In an application folder of an existing site

PointHub can also run below an existing website, for example `https://www.example.com/PointHub/`:

1. In the existing site, **Add Application…**: alias `PointHub`, physical path = the publish folder, the PointHub application pool from step 1 (not the parent site's pool, and with *No Managed Code*).
2. Nothing in the build changes. IIS passes the folder to the app as its path base; the app writes it into the page's `<base href>`, and the web client takes its API, picture and page addresses from there.
3. Include the folder wherever an address is configured: `Site__PublicBaseUrl` = `https://www.example.com/PointHub` (QR codes, links in emails) and the Entra ID redirect URI `https://www.example.com/PointHub/api/auth/callback`.
4. The parent site's `web.config` is inherited by the application. If it adds handlers, rewrite rules or modules that get in the way, clear them in PointHub's own `web.config` (for example `<rewrite><rules><clear /></rules></rewrite>`), or wrap the parent's settings in `<location path="." inheritInChildApplications="false">`.
5. The folder name is case-insensitive in IIS but cookie paths are not: link to the site with the same casing everywhere (`/PointHub/`), or people who arrive through a differently cased link have to sign in again.

Behind a reverse proxy other than IIS, or with Kestrel alone, set `Site__PathBase` = `/PointHub` instead. Under IIS leave it empty.

## Configuration

Set these as environment variables on the application pool (IIS Manager → Configuration Editor → `system.webServer/aspNetCore` → `environmentVariables`) or in a server-only `appsettings.Production.json` that is not in source control. Do not put secrets in the repository.

| setting | value |
| --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__PointHub` | `Server=…;Database=PointHub;Trusted_Connection=True;Encrypt=True` |
| `Auth__Mode` | `EntraId` or `Windows` – see "Sign-in" below |
| `Auth__BootstrapAdminEmails__0` | the first system admin's email address (as it is in Entra ID or in the AD `mail` attribute) |
| `Site__PublicBaseUrl` | `https://pointhub.<your-domain>`, or `https://www.<your-domain>/PointHub` in an application folder – used in QR codes and emails |
| `Site__PathBase` | Only when not hosted by IIS and served below a folder: `/PointHub`. Leave empty under IIS |
| `Site__TimeZone` | `Asia/Taipei` |
| `Uploads__AssetsPath` | Folder for gift pictures. Default `uploads/assets` under the site folder; point it at a folder **outside** the deployment folder (for example `D:\PointHubData\assets`) so a redeploy cannot wipe it |
| `Smtp__Host`, `Smtp__Port`, `Smtp__Security` | Company SMTP relay; security is `None`, `StartTls` or `Ssl` |
| `Smtp__Username`, `Smtp__Password` | Only if the relay needs sign-in. The password is never stored in the database or shown in the admin screen |
| `Smtp__FromAddress`, `Smtp__FromName` | Sender shown to employees, e.g. `pointhub@<your-domain>` |

The app refuses to start in Production with `Auth:Mode` `Dev`, with an incomplete Entra ID configuration, or with `Database:SeedDevData` on.

## Sign-in

One switch, `Auth:Mode`, chooses how people are identified. Whichever is used, PointHub then matches the person to an employee by email or employee number and issues its own session cookie; roles and everything else work the same.

| | `EntraId` | `Windows` |
| --- | --- | --- |
| Identity comes from | Microsoft Entra ID (OpenID Connect) | On-premises Active Directory (Kerberos / NTLM through IIS) |
| Company PC on the domain | Usually silent, through the Microsoft sign-in page | Silent, no page at all |
| Phone or PC that is not a domain device | Microsoft sign-in page, with MFA if the tenant requires it | Browser prompts for domain user name and password |
| Works from the internet | Yes | Intranet / VPN only in practice |
| Server needs | Outbound HTTPS to `login.microsoftonline.com` | IIS Windows Authentication feature; server joined to the domain |

### Mode `EntraId`

| setting | value |
| --- | --- |
| `Auth__EntraId__TenantId` | Directory (tenant) id. (`Auth__EntraId__Authority` overrides the URL built from it, for sovereign clouds.) |
| `Auth__EntraId__ClientId`, `Auth__EntraId__ClientSecret` | from the app registration |
| `Auth__EntraId__EmailClaim`, `Auth__EntraId__EmployeeNoClaim` | claim names; defaults `email` and `employeeid` |

App registration:

- Platform: **Web**. Redirect URI: `https://pointhub.<your-domain>/api/auth/callback` (in an application folder: `https://www.<your-domain>/PointHub/api/auth/callback`).
- A client secret (or certificate).
- Token configuration → optional claims on the ID token: `email`; add the employee number claim if the directory has one.
- Assign the users or groups who may use PointHub if the tenant requires assignment.

### Mode `Windows`

| setting | value |
| --- | --- |
| `Auth__Windows__UseDirectoryLookup` | `true` (default): read `mail`, `employeeID` and `displayName` of the signed-in account from Active Directory |
| `Auth__Windows__EmailDomain` | Fallback when the account has no `mail` value, or when the lookup is off: the email is taken to be `<logon name>@<EmailDomain>`. Leave empty to refuse sign-in in that case |
| `Auth__Windows__AllowedDomains__0`, `__1`, … | Optional. NetBIOS names of the domains whose accounts may sign in; empty = any domain the server trusts |

IIS:

1. Install the **Windows Authentication** role service (Server Manager → Web Server → Security).
2. On the PointHub site → Authentication: enable **Windows Authentication** and keep **Anonymous Authentication enabled**. The sign-in page, the scripts and the API-key integration API are anonymous at the IIS level; only `/api/auth/login` asks for a Windows identity, and after that the session cookie is used. (If saving fails because the section is locked, unlock `system.webServer/security/authentication/windowsAuthentication` and `anonymousAuthentication` in the server's Configuration Editor.)
3. The application pool identity must be able to read users in Active Directory. `ApplicationPoolIdentity` on a domain-joined server uses the machine account, which normally can; a domain service account also works.
4. Kerberos: if the site is reached by a name other than the server's own, or the pool runs as a service account, register the SPN (`setspn -S HTTP/pointhub.<your-domain> <account>`). Without it browsers fall back to NTLM, which still works on the intranet.
5. Silent sign-in needs the site in the browser's **Local intranet** zone (Edge / Chrome: group policy *Sites to Zone Assignment* or `AuthServerAllowlist`). Otherwise users get a credentials prompt.

Things to know about Windows mode:

- Matching is by the account's `mail` and `employeeID`. Check that these are filled in Active Directory, or set `EmailDomain` if mailbox names equal logon names.
- People scanning a QR code with a personal phone get a browser prompt for domain credentials. If check-in from phones matters, prefer Entra ID, or use badge taps.
- Signing out of PointHub ends the PointHub session only; on a domain PC the next visit signs the same person in again.
- The Windows identity is used in exactly one place: `/api/auth/login` reads it to start a PointHub session. Every other endpoint accepts only the PointHub session cookie, and the app turns IIS's automatic authentication off, so a request that carries Windows credentials but no valid session (expired, signed out, or a cookie the browser refused) gets `401` and the web app starts a new sign-in. If people come back to the sign-in page right after signing in, check that the site is reached over HTTPS: the session cookie is `Secure`, so over plain HTTP the browser drops it.
- To try it without IIS on a Windows PC: `Auth__Mode=Windows` and `Auth__Windows__EmailDomain=<something>` as environment variables, then `dotnet run --project src/PointHub.Api`; Kestrel does the handshake itself.

### Data protection keys

The sign-in cookie and the OIDC state are encrypted with ASP.NET Core data protection keys. If they are lost (app pool recycle without a profile, redeploy to a new folder, second server), everyone is signed out and in-flight sign-ins fail. Before go-live, persist them explicitly – for example to a folder outside the site that only the pool identity can access, or to the database – and protect them with DPAPI or a certificate. This is **not yet configured in code** (`AddDataProtection().PersistKeysTo…`); it is on the list for the first production hardening pass.

### Behind a reverse proxy or load balancer

If TLS ends in front of IIS, add forwarded-headers handling so the app sees the original scheme and host; otherwise the OIDC redirect URI and secure cookies will be wrong. Not needed when IIS terminates TLS itself.

## After deployment

- `GET /api/health` (or `/PointHub/api/health` in an application folder) returns `{"status":"ok"}`.
- Sign in as a bootstrap admin, create an API key for the HR system with the `employees:write` scope, and run the first employee push.
- Under **Email**, check that SMTP shows as configured and send a test message. Mail that cannot be delivered is retried and then listed as failed there.
- Upload a gift picture to confirm the pool identity can write to the uploads folder.
- On each event-station PC that uses a PC/SC reader, install the card bridge and add the site origin to its `Bridge:AllowedOrigins` (see `tools/PointHub.CardBridge/README.md`).
- Check that phones on the intended network (company Wi-Fi, VPN) can open the site – QR check-in depends on it (open decision O-19).
