# PointHub web frontend

The SPA in `web/`. It implements [api.md](api.md); change the contract there first, then `web/src/api/types.ts`.

## Stack

React 19 · Vite 8 · TypeScript 6 (strict) · Chakra UI 3 with Emotion (UI kit, "Arcade" design) · Motion (animation) · React Router 7 (declarative mode) · TanStack Query 5 · i18next · lucide-react (icons) · qrcode.react · dayjs · `@chakra-ui/charts` with Recharts (admin dashboard only, in its own chunk).

The app was ported from Mantine to Chakra UI. [web/COMPONENTS.md](../web/COMPONENTS.md) lists the shared components and conventions; use them before writing something new.

TypeScript is pinned to 6.0.x because typescript-eslint does not support TypeScript 7 yet. React Router 8 exists; v7 was the version decided for this scaffold.

## Running

```powershell
cd web
npm install
npm run dev      # http://localhost:5173, proxies /api and /uploads to http://localhost:5180
npm run build    # type-check + production bundle in web/dist
npm run lint
```

- The dev server listens on all interfaces (`server.host: true`) so a phone on the same network can open a scanned QR link.
- `POINTHUB_API_URL` points the `/api` and `/uploads` proxy at another API instance (gift pictures are served from `/uploads`).
- `node scripts/contrast.ts` checks the WCAG contrast of every theme's derived palette.
- `VITE_CARD_BRIDGE_URL` overrides the card bridge address (default `ws://127.0.0.1:47615/`). It is read at build time.

## Layout

| path | what lives there |
| --- | --- |
| `src/api/` | `types.ts` (contract types), `client.ts` (fetch wrapper, `ApiError`), `keys.ts` (query keys), one hook file per area |
| `src/i18n/` | i18next setup, `locales/*.json`, `useLocalized` / `useFormat` / `useErrorMessage` |
| `src/themes/` | theme system: `colors.ts` + `registry.ts` (the 13 themes, kit-neutral), `palette.ts` (OKLCH scales), `system.ts` (Chakra `createSystem`: tokens, recipes, global CSS), `colorMode.ts`, `runtime.ts` (colour tween), `effects.ts` + `SeasonalEffects.tsx` (ambient canvas), `preview.ts` |
| `src/themes/sprites/` | pixel-art sprites as data and `<PixelSprite>` |
| `src/features/cardReader/` | card UID sources behind `useCardReader` |
| `src/components/` | app shell (`AppLayout`), route guards, status chips, page frame, states, gift catalogue, QR scanner |
| `src/components/ui/` | Arcade building blocks: panel, hero, fields, modal, table, tabs, drop zone, toaster |
| `src/pages/` | one file per screen; `home/` is the employee home; `host/` and `admin/` are lazy-loaded; `admin/dashboard/` holds the parts of the admin dashboard |
| `src/lib/` | roles and where each role lands, session context, notifications, confirm dialog, form state, filters in the URL (`urlFilters.ts`), motion presets, check-in link parsing, gift helpers |

Routes and who may see them are listed at the top of `src/App.tsx`. Guards only hide pages; the API enforces every rule again.

### Conventions

- Server state goes through TanStack Query hooks in `src/api/`. Mutations invalidate what they change; anything that moves points invalidates `pointKeys`.
- The client sends `X-Requested-With: PointHub` on every non-GET request. A `401` from any call clears the cached user, which redirects to `/login?returnUrl=…`.
- Errors are shown by translating the API `code` (`errors.<code>` in the locale files). Unknown codes fall back to `errors.unknown`.
- Files that export components export only components (required for fast refresh, enforced by lint).
- The React Compiler lint rules are on: no `setState` directly inside an effect, no reading refs during render.
- Roles are `systemAdmin`, `eventAdmin`, `giftAdmin`, `auditor`; no role is a normal employee. Pages ask `can.*` in `src/lib/roles.ts`, never the role names.
- Lists are searched, filtered and paged by the server. The search text, dates, type / status and the page live in the page's query string (`src/lib/urlFilters.ts`), so a filtered list can be bookmarked and survives a refresh; changing a filter goes back to page 1.
- Styling is Chakra style props with semantic tokens (`bg.panel`, `fg.muted`, `brand.solid`, `accent.solid` …), never hex colours. Theme art is pixel-art sprites, never emoji.
- Motion: springs and variants from `src/lib/motion.ts`; animate `transform` and `opacity` only. `<MotionConfig reducedMotion="user">` and a global CSS rule reduce everything to short fades for people who ask for less motion.

## Shell, home and dashboard

The page composition follows the chosen "Arcade" prototype (`design-lab/chakra`); colours, sprites and icons are this app's own.

**Shell.** One top bar: brand, a switch between the employee side and the management side (only for people with a role), the balance, language, light / dark and the account menu. Normal employees have no sidebar. The management side (everything under `/host` and `/admin`) keeps a sub-navigation: a card beside the content on desktop, a strip that scrolls sideways on narrower screens. Its entries depend on the role, with "Dashboard" first for system admins and auditors. Switching to the management side opens `/admin` for system admins and auditors, `/host/events` for event admins and `/admin/gifts` for gift admins (`managementHome` in `src/lib/roles.ts`).

**Employee home (`/`).** One page: the hero (greeting, department, level ring with the balance, lifetime earned / spent, distance to the next gift, and the check-in panel), events split into "Open now" and "Upcoming", up to six gifts with "See all" to `/gifts`, and recent activity beside them. Once the hero has scrolled away a floating pill keeps the balance on screen.

- The API lists open events only. One whose `startsAt` is still ahead is shown as upcoming; that is a display rule, the host may already accept check-ins for it.
- Recent activity sits where the prototype has a leaderboard. There is deliberately no leaderboard and no rank: whether employees may see each other's points is an open decision.
- `/gifts` stays the full catalogue plus "My claims"; both pages use the same `<GiftCatalog>`.

**Check-in scanner.** The check-in buttons open a dialog that reads the camera with `navigator.mediaDevices.getUserMedia` and the browser's `BarcodeDetector`. When it sees a PointHub check-in link it opens that page of the app. A link is accepted only if it is http(s) on this page's origin or on `siteConfig.publicBaseUrl`, with the path `/c/{token}`; only the token and `k` are carried over, and anything else a QR code contains is ignored with a short notice (`src/lib/checkInLink.ts`). The camera stream is stopped the moment the dialog closes. Where `BarcodeDetector` or the camera is missing or refused (most desktop browsers, Firefox, Safari and every iPhone browser, plain-http LAN addresses) the dialog says so and tells the person to scan the event's QR code with the phone's own camera or to tap the staff badge. No scanning library is bundled: the phone's camera app opens the same link.

**Admin dashboard (`/admin`).** For system admins and auditors. KPI tiles and the issued-vs-redeemed chart come from `GET /api/admin/stats`; the approvals queue from `GET /api/host/checkins/pending`, refreshed every 5 seconds; gift stock from `/api/admin/gifts`.

- Month-over-month change is not shown when last month was 0 ("Nothing last month").
- The pending tile counts the rows of the live queue, so it drops as rows leave. "Approve all" approves the listed rows one by one after a confirmation; there is no cross-event endpoint for it.
- An auditor sees the tiles, the chart and the stock of the public catalogue. The queue is not drawn for them (the API refuses that list to auditors), and nothing on their dashboard is a button.
- The page is its own chunk (it carries Recharts) and is warmed up in idle time for the people who can open it; employees never download it.
- If a call fails, its block shows the translated error with a retry button and the rest of the page still works.

## Search, filters, CSV export and the employee lookup

**Search.** Every search box sends `?q=` to the server after 250 ms of quiet and keeps the previous result on screen (dimmed) until the next one arrives; nothing is filtered in the browser. The server matches every word, in any of the three languages. A search without a hit says "Nothing matches '…'" with a button back to the whole list.

- Employee home (`/`): events (`?events=`), gifts (`?gifts=`) and the person's own history (`?history=`, `GET /api/me/points?q=`). The balance and lifetime totals in that answer are not filtered, so the hero uses the same call. "See all" carries the gift search to `/gifts?q=`.
- `/gifts`: the catalogue (`?q=`).

**Admin lists.** Ledger (`/admin/ledger`: `q`, `type`, `from`, `to`, plus `employeeId` / `eventId` chips), attendance (`/admin/attendance`: `q`, `status`, `from`, `to`, `eventId`; `GET /api/admin/checkins`, read-only), claims (`/admin/claims`: `status` tab, `q`, `giftId`, `from`, `to`) and employees (`/admin/employees`: `q`). Dates are plain `YYYY-MM-DD` days from the browser's date picker; the server reads them in the site time zone.

- The claims page is also open to auditors, read-only: the same tabs, search and export, no action buttons. Their gift filter lists the public catalogue, because `GET /api/admin/gifts` is refused to them.
- An employee's name in the ledger, attendance and claims lists opens the lookup page for people who may see it (system admins and auditors).

**Export CSV.** One button (`components/ExportButton`) on every exportable list. It fetches the list's `/export` twin with exactly the filters on screen plus `locale=<UI language>`, saves the answer under the name in `Content-Disposition`, and reports in a toast: saved, cut at 50 000 rows (`X-Export-Truncated: true`), or refused (403, 400 for a date the server does not accept). The claims export covers the open tab.

**Employee lookup (`/admin/employees/:id`).** Opened from a row of the employees list or from a name in another list. Profile and totals come from `GET /api/admin/employees/{id}`; the three tabs (point history, attendance, claims) are the admin lists filtered by `employeeId`, each with its own search and export; the tab, its search and its page are in the URL (`?tab=&q=&page=`). System admins get "Award points" and "Deduct points": a positive amount and a mandatory reason, sent as one signed amount to `POST /api/admin/adjustments`. Deducting more than the balance is allowed; the dialog warns that the balance goes below zero. After the save the dialog shows the balance the server now has, and the totals and the history are refreshed. Auditors see the page without the two buttons and without "Revert". An unknown id shows a "not found" state.

## Sign-in

`siteConfig.authMode` decides what the login page shows.

| mode | login page |
| --- | --- |
| `dev` | a list of seeded accounts (Development only) |
| `oidc` | one button: Microsoft Entra ID |
| `windows` | one button: integrated Windows authentication through IIS (on-premises Active Directory) |

Both single sign-on modes start with a full page navigation to `/api/auth/login?returnUrl=<path+query>`; the API redirects back when the handshake is done.

- In `windows` mode the page tries this by itself once when it opens, so people on a domain PC never see it. It does not when the URL carries `signedOut=1` or `error=…`, and never more than once per browser tab (`sessionStorage` key `pointhub.windowsSignInTried`), so a failure cannot loop.
- An explicit sign-out always ends on `/login?signedOut=1`, in every mode.
- `/login?error=no_account` means the identity provider accepted the person but they are not an active PointHub employee. The page says so and keeps the sign-in button.

## Check-in links

Each event has a `checkInMode`, chosen in the event form.

- **static**: one link, `/c/{token}`. The host tab shows the QR code, the link and a copy button.
- **rotating**: the host tab polls `GET /api/host/events/{id}/checkin-code` and renders the QR code from `/c/{token}?k={code}`, with a bar counting down to the next code. There is no copy button, because the link dies within seconds. Projector mode shows the same live code.

The check-in page reads `k` from its own URL and sends it on both the preview and the check-in call. The sign-in redirect keeps the whole path and query in `returnUrl`, so a code scanned while signed out survives the login. An expired or missing code (`checkin_code_invalid`) is shown as a "scan again" screen, not as an error.

The code is refetched when it expires and at least every 5 seconds regardless. `expiresAt` is on the server clock, so a station PC with a wrong clock still shows a current code; only its countdown bar may be off.

## Themes

The look is one of 13 themes: `default` (company blue `#199ECF`, green `#75B42B`, grey `#54555A`) and twelve Taiwanese festivals. The keys are fixed by the contract (`ThemeKey`). The server decides which is active (`siteConfig.activeTheme`, from its festival calendar or an admin override); a key this build does not know renders `default`.

How a theme reaches the screen:

1. `colors.ts` gives each theme a primary, an accent and a three-stop gradient. `palette.ts` derives 50–950 scales in OKLCH: `brand.600` is darkened until white text on it passes AA (the untouched primary stays at `brand.500`), `accent.400` is the accent and carries dark text, neutrals are tinted with the theme's hue.
2. `system.ts` registers the scales as tokens and maps them onto semantic tokens that switch on `<html data-theme="…">` and on `.dark` / `.light`. Components only use semantic tokens.
3. `AppThemeProvider` sets `data-theme`; `runtime.ts` registers the colour variables so a theme or scheme change tweens.
4. `registry.ts` adds each theme's pixel-art motif and its ambient effect. `SeasonalEffects` draws the effect on one canvas behind the content: sprites move by whole pixels and are translucent, the loop pauses while the tab is hidden, and nothing is drawn when the OS asks for reduced motion.

### Adding or changing a theme

1. The key must exist in the contract first (`ThemeKey` in docs/api.md and `src/api/types.ts`) and the server must know it.
2. Add the colours to `THEME_COLORS` in `src/themes/colors.ts` (and the id to `ThemeId`), then run `node scripts/contrast.ts` and fix what fails.
3. Draw the motif in `src/themes/sprites/motifs.ts` (16 × 16, `'k'` outline, `'.'` transparent) and add the theme to `ART` in `registry.ts` with an `effect`.
4. A new effect is a `case` in `getEffect()` in `effects.ts`: layers of drifting sprites (density, speed, band of the screen) and optionally pixel fireworks. Small particle sprites live in `sprites/minis.ts`.
5. Add the name under `themes.<id>` in all three locale files.

Preview any theme without changing the site: open a page with `?theme=<key>`. It sticks for the browser tab; `?theme=off` or the chip in the header clears it. A system admin changes the site theme at `/admin/themes` (follow the festival calendar, skip festivals, or force one theme).

Light / dark follows the operating system until the user picks one in the header (stored in `localStorage` as `pointhub.colorScheme`).

## Adding a string or a language

- Add the key to `en.json`, `ja.json` and `zh-Hant.json`. `t()` keys are type-checked against `en.json`, and the other two files must contain every English key or the build fails.
- Avoid i18next plural suffixes (`_one`, `_other`): Japanese and Chinese only use `_other`, which would break the key parity check. Word strings so they read correctly for any count.
- User-entered content (`LocalizedText` from the API) is picked with `useLocalized()`, which falls back to English.
- Dates and numbers go through `useFormat()` (`Intl`, current language, browser time zone).
- A new language needs: the file in `locales/` and its entry in `resources` in `i18n/index.ts`, an entry in `LOCALES`, `LOCALE_LABELS`, `DAYJS_LOCALES` and `toSupportedLocale` in `locale.ts`, the dayjs locale import in `index.ts`, a font stack for `html[lang=…]` in the `globalCss` of `src/themes/system.ts` (system fonts only; the CJK order decides which glyph shapes are used), a `FIELD` entry in `components/LocalizedInput.tsx`, and server support (`Locale` in the contract and a `LocalizedText` field).

Starting language: the employee's saved preference, else a language they picked before in this browser, else the browser language, else `siteConfig.defaultLocale`. Any `zh-*` browser gets Traditional Chinese.

## Card readers

`useCardReader({ onRead, enabled })` reports each tap once as a raw UID string. The server normalizes and validates it. All three sources end in the same `onRead`, and all of them stop while `enabled` is false.

| source | status | notes |
| --- | --- | --- |
| Keyboard-wedge USB reader | working | Always on while `enabled`. Detects a burst of hex/decimal keys (≤ 50 ms apart, ≥ 8 characters) ending in Enter. |
| Web NFC (`NDEFReader`) | working, opt-in button | Chrome on Android only, HTTPS or localhost. Uses the tag `serialNumber`. |
| Local PC/SC bridge (`bridge.ts`) | working against a fake bridge | For ACR122U-style readers, which browsers cannot reach. WebSocket to `tools/PointHub.CardBridge`; a `card` message is handled exactly like a wedge read. |

The bridge socket is opened only while a card-reading screen is enabled (the card station of an open event, or the register-card dialog) and closed when it is not. If the bridge is not running it retries after 1, 2, 4 and 8 seconds, then every 15 seconds. `useCardReader` returns `bridge: { state, readers, error }`, and `<CardReaderStatus>` shows it as one line: connected with the reader count, connected without a reader, or not running (keyboard-wedge readers still work). The browser logs one console error per failed connection attempt; that cannot be suppressed.

Hardware caveats to settle with the real readers and cards:

- **Bridge origin.** The bridge only accepts the origins in its `AllowedOrigins` setting, so the site address (and `http://localhost:5173` in development) must be listed there. A refused origin looks the same to the page as "not running".
- **HTTPS pages and the bridge.** Chrome, Edge and Firefox allow `ws://127.0.0.1` from an HTTPS page; Safari does not, and Chrome may ask for local-network permission the first time.

- **Output format.** Configure wedge readers for hex output with an Enter suffix. The server also accepts the common 10-digit decimal form of a 4-byte UID; anything else is rejected as `invalid_card_uid`.
- **Byte order.** Some readers emit the UID reversed. The same card must give the same UID at registration and at check-in, so use one reader model or add a per-reader setting.
- **Focus.** Bursts are ignored while the cursor is in an ordinary text field. Fields marked with `data-card-scan` accept them.
- **Web NFC and MIFARE Classic.** Only phones with an NXP NFC chip read MIFARE Classic, and tags the phone cannot parse as NDEF may not expose a UID at all. Test with the actual staff cards.
- **Random UIDs.** Phones and some newer cards present a different UID on every tap and cannot be used as an identifier.
- Repeated reports of the same UID within 1.5 s are dropped.

## Not finished

- Verified in a browser against the real API on sample data: sign-in and sign-out, the employee home at phone and desktop width, the admin dashboard as system admin and as auditor (approving a row; the error state with the two calls stubbed to 404), check-in by static link and by rotating code, the live pending → approved switch, redeeming a gift, every event-admin tab, and every admin page as system admin, gift admin and auditor. Not exercised: OIDC sign-in, a real file drag onto the drop zones, mouse drag reorder of gift pictures, and reduced-motion mode in a real browser setting.
- Search, filters, export and the lookup page were verified the same way, at desktop width and at 375 px: the three employee searches (a Chinese term, a two-word term), ledger and attendance filters with export, claims as gift admin and read-only as auditor, the lookup page with one award and one deduction as system admin and read-only as auditor, and the ledger filters and the lookup page in Japanese and Traditional Chinese. Not exercised: typing a date on a real keyboard and the date picker of a real phone (the fields were filled by script), and a real export of more than 50 000 rows.
- Levels on the employee home are presentation only (one level per 500 lifetime points); the server knows nothing about them.
- The QR scanner was exercised in a desktop browser with a simulated camera and detector (accepting a check-in link, ignoring other codes, stopping the stream). It has not been used on a real phone camera. iPhones always get the fallback text, because Safari has no `BarcodeDetector`.
- Windows sign-in was exercised with a simulated site config (button, hint, the single automatic attempt, `signedOut` and `error=no_account`). The real IIS handshake is untested.
- Event cards show no capacity or attendee count (the prototype does): `EventSummary` carries neither.
- The admin dashboard has no ledger table (the prototype does): the ledger is its own page.
- Web NFC is untested on a real Android device, and the bridge is untested against the real `tools/PointHub.CardBridge` and a physical reader.
- No unit or end-to-end tests yet.
- The employee chip of the ledger and attendance filters shows the person's name (from the lookup endpoint); the event chip still shows the event id, as there is no event lookup an auditor may call.
- `Transaction` carries no gift name, so a claim row in the ledger or in "Recent activity" shows only its type: a search for a gift name finds the row, but the row cannot say why. (The CSV export has a gift column.)
- The "export was cut at 50 000 rows" toast was exercised with a simulated response header; the sample data is far smaller than the cap.
- Claim counts on the claims tabs and the nav badge come from list calls with `pageSize=1` (there is no count endpoint). Claim rows show the picture sent with the claim (`giftImage`), so a disabled gift keeps its picture.
- The JavaScript an employee downloads first is about 403 kB gzipped: the entry chunk (240 kB) plus the shared chunks it imports (Chakra, Emotion, Motion, the three locale files). Event-admin and admin pages load on demand; the admin dashboard chunk with the chart library is another 128 kB gzipped. Vite warns about the main chunk size.
- No PWA/offline support; a kiosk that loses its connection shows a network error per tap.
