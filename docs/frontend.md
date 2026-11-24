# PointHub web frontend

The SPA in `web/`. It implements [api.md](api.md); change the contract there first, then `web/src/api/types.ts`.

## Stack

React 19 · Vite 8 · TypeScript 6 (strict) · Chakra UI 3 with Emotion (UI kit, "Arcade" design) · Motion (animation) · React Router 7 (declarative mode) · TanStack Query 5 · i18next · lucide-react (icons) · qrcode.react · dayjs.

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
| `src/components/` | app shell, route guards, status chips, page frame, states |
| `src/components/ui/` | Arcade building blocks: panel, hero, fields, modal, table, tabs, drop zone, toaster |
| `src/pages/` | one file per screen; `host/` and `admin/` are lazy-loaded |
| `src/lib/` | roles, session context, notifications, confirm dialog, form state, motion presets |

Routes and who may see them are listed at the top of `src/App.tsx`. Guards only hide pages; the API enforces every rule again.

### Conventions

- Server state goes through TanStack Query hooks in `src/api/`. Mutations invalidate what they change; anything that moves points invalidates `pointKeys`.
- The client sends `X-Requested-With: PointHub` on every non-GET request. A `401` from any call clears the cached user, which redirects to `/login?returnUrl=…`.
- Errors are shown by translating the API `code` (`errors.<code>` in the locale files). Unknown codes fall back to `errors.unknown`.
- Files that export components export only components (required for fast refresh, enforced by lint).
- The React Compiler lint rules are on: no `setState` directly inside an effect, no reading refs during render.
- Roles are `systemAdmin`, `eventAdmin`, `giftAdmin`, `auditor`; no role is a normal employee. Pages ask `can.*` in `src/lib/roles.ts`, never the role names.
- Styling is Chakra style props with semantic tokens (`bg.panel`, `fg.muted`, `brand.solid`, `accent.solid` …), never hex colours. Theme art is pixel-art sprites, never emoji.
- Motion: springs and variants from `src/lib/motion.ts`; animate `transform` and `opacity` only. `<MotionConfig reducedMotion="user">` and a global CSS rule reduce everything to short fades for people who ask for less motion.

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

- Verified in a browser against the real API on sample data: sign-in and sign-out, the dashboard, check-in by static link and by rotating code, the live pending → approved switch, redeeming a gift, every event-admin tab, and every admin page as system admin, gift admin and auditor. Not exercised: OIDC sign-in, a real file drag onto the drop zones, mouse drag reorder of gift pictures, and reduced-motion mode in a real browser setting.
- Levels on the dashboard are presentation only (one level per 500 lifetime points); the server knows nothing about them.
- Web NFC is untested on a real Android device, and the bridge is untested against the real `tools/PointHub.CardBridge` and a physical reader.
- No unit or end-to-end tests yet.
- Ledger filter chips show the employee/event id, not the name (no lookup-by-id endpoint).
- Claim counts on the claims tabs and the nav badge come from list calls with `pageSize=1` (there is no count endpoint), and claim rows take their thumbnail from the gift list.
- The initial bundle is about 245 kB gzipped JS (Chakra, Emotion and Motion); event-admin and admin pages load on demand. Vite warns about the main chunk size.
- No PWA/offline support; a kiosk that loses its connection shows a network error per tap.
