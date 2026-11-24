# PointHub design lab – brief for one design alternative

PointHub is an internal web app where employees earn points by attending company events (QR code or staff-badge tap), and spend them on gifts. Admins approve check-ins, correct the ledger and manage gifts. Users are office staff in Taiwan and Japan on phones and laptops; the UI ships in English, Japanese and Traditional Chinese.

We are building **six alternative designs, each on a different UI kit**, so the product owner can pick one look and one kit for the real app. You are building exactly one of them. The six must be comparable, so they all show the same two screens with the same data and the same controls; everything else – layout, type, colour, motion, personality – is yours to design within the direction you were given.

## What to build

A small Vite + React + TypeScript app in your own folder `design-lab/<slug>/` with two views and one control bar. No backend, no router library needed.

### Employee view (mobile-first, also good at 1280 px)
1. Greeting and **points balance** as the hero: the number counts up on load and whenever it changes; show lifetime earned / spent, and progress to the next reward (`me.nextRewardAt`).
2. A prominent **Check in** call to action (it just plays a success animation here).
3. **Events**: open-now and upcoming, with points, time, place, capacity, and my check-in state (`none` / `pending` / `approved`). Checking in to an open event moves it to `pending`.
4. **Gifts** catalogue: emoji artwork, cost, stock, tag; states for affordable, not enough points ("need N more") and out of stock. **Redeem** deducts the cost from the balance (so the counter animates), decrements stock and celebrates.
5. **Recent activity**: signed amounts, type, date; optional leaderboard teaser.

### Admin view (desktop-first at 1280–1440 px, usable on a tablet)
1. Navigation for: Dashboard, Approvals, Ledger, Gifts & stock, Employees, API keys. Only Dashboard needs content; the others can be inert nav items – but Approvals and Ledger content must be visible on the Dashboard as described below.
2. **KPI row**: points issued / redeemed this month with delta vs last month, participation (`activeParticipants / totalEmployees`), outstanding points, pending approvals.
3. **Issued vs redeemed chart** over 12 weeks (`kpis.issuedByWeek`, `kpis.redeemedByWeek`). Use the kit's own chart component if it has one, otherwise hand-drawn SVG. Animate it in.
4. **Pending approvals** queue: approve / reject per row and approve all. Rows leave with an exit animation, the pending KPI updates, and an empty state appears when the queue is cleared.
5. **Ledger table**: employee, type badge, description, signed amount, date, source for external transactions; a search box that filters by employee; a **Revert** action that marks the row reverted and inserts the reversal row at the top with an enter animation.
6. Gift stock list with low-stock highlighting.

### Control bar (same in every design, style it your way)
- Employee / Admin switch
- Language: English / 日本語 / 繁體中文
- Season: Standard / Lunar New Year / Mid-Autumn / Winter
- Light / dark

All four live in the URL hash through `shared/urlState.ts` (`readState`, `writeState`, `subscribe`) – the gallery sets them from outside, so the app must react to `hashchange`, not only to its own clicks. Wrap it in a hook with `useSyncExternalStore` (cache the snapshot by `location.hash`, or it will loop).

## Shared code (read all of it first, do not edit or copy it)

`design-lab/shared/` is dependency-free TypeScript, imported through the alias `@shared`:
- `data.ts` – all mock data and types, plus `pick(localizedText, locale)`
- `strings.ts` – `t(locale, key, vars)`, `formatNumber`, `formatDateTime`, `formatPercent`, `locales`. **Every visible string comes from here** (or from `data.ts`). If you truly need another string, hard-code nothing: report it and use the nearest existing key.
- `seasons.ts` – the four seasons: `primary`, `accent`, `gradient`, `particles`. Map each onto your kit's theming system so that buttons, focus rings, charts and hero all follow the season, in both light and dark.
- `urlState.ts` – see above.

Local mutations (redeem, check in, approve, revert) are plain React state seeded from `data.ts`.

## Motion – this is a headline requirement

"Modern and smoothly animated" is the product owner's explicit ask, and the designs will be judged on it.
- View switch and first load: orchestrated entrance (stagger), not everything popping in at once.
- Balance and KPI numbers tween. Lists animate insert / remove / reorder (layout animation), not just fade.
- Buttons, cards and rows respond to hover, press and focus. Redeem and check-in get a real moment of delight.
- Season change is a smooth transition of colour (and ambient particles where the season has them and your direction suits them), not a flash.
- 60 fps: animate `transform` and `opacity`; no layout thrash; keep particle counts modest and pause them when the tab is hidden.
- Honour `prefers-reduced-motion`: reduce to quick fades.
- Use `motion` (`motion/react`) unless your kit ships its own animation system that does this better; say which you used.

## Quality bar
- Real design work in the direction you were given: a clear visual idea, deliberate type scale and spacing, consistent radii/elevation, strong hierarchy. It must not look like the kit's default demo. Do not imitate another product's brand.
- Use the kit properly: its components, tokens and theming API – that is what is being evaluated. Note anything the kit made hard.
- CJK: system font stacks that cover Japanese and Traditional Chinese (e.g. `"Segoe UI", "Noto Sans TC", "Microsoft JhengHei", "Noto Sans JP", "Yu Gothic UI", "Hiragino Sans", sans-serif`); no web-font downloads; check that long Japanese/Chinese labels do not break layouts.
- Accessible: keyboard reachable, visible focus, labels on icon buttons, WCAG AA text contrast in light and dark for all four seasons.
- Responsive from 375 px to 1440 px with no horizontal scroll.

## Technical rules
- Stay inside `design-lab/<slug>/`. Do not touch `design-lab/shared`, other designs, or anything else in the repository. No git commands.
- Write the Vite project files by hand (`create-vite` prompts interactively and stdin is closed), then `npm install` what you need inside your folder. Check current versions with `npm view <pkg> version` and read the installed `.d.ts` / docs when unsure – several of these kits had major releases recently, so do not rely on memory for their APIs. React 19, TypeScript strict.
- `vite.config.ts`: `base: './'`, `build.outDir: '../dist/<slug>'` with `emptyOutDir: true`, `resolve.alias['@shared']` → `../shared`, `server.fs.allow: ['..']`, `server.port` = your port with `strictPort: true`. Mirror the alias in `tsconfig` `paths` and include `../shared` in `include`. `lib` must contain `ES2022` and `DOM`.
- Hash-only navigation (the built app is opened from a sub-folder of a static server).
- Scripts: `dev`, `build` (`tsc -b && vite build` or `tsc --noEmit && vite build`), `preview`.
- No network requests at runtime, no analytics, no secrets. Keep dependencies to the kit, its required peers, `motion`, an icon set, and a chart library only if the kit does not provide charts.
- Done means: `npm run build` passes with no TypeScript errors, and you have opened the app (dev server on your port, or the built files) and looked at both views, at least two seasons, dark mode, and Japanese or Chinese, at phone and desktop widths. Fix what you see. Stop your dev server when finished.

## Report back (plain text, under 250 words)
Kit and exact version, extra dependencies, bundle size from the build output (JS gzip), what you verified by looking and what you did not, how seasonal theming is implemented in this kit and how hard it was, anything the kit made awkward (CJK, dark mode, animation, tables, charts), and any string you were missing.
