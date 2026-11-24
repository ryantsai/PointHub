# PointHub design lab

Six alternative designs for PointHub, each built on a different UI kit, from which the product's look and kit were chosen (decision D-10 in `docs/decisions.md`). **Arcade on Chakra UI was picked** and the real app in `web/` is built in it; this folder is kept as the record of the comparison and as the design reference for Arcade. Every design shows the same two screens – the employee home and the admin dashboard – with the same mock data, the same three languages and the same four seasonal themes, so they differ only in design and kit. Nothing here talks to the API.

## Look at them

```powershell
npm --prefix design-lab run build
```

```powershell
npm --prefix design-lab run serve
```

Open <http://localhost:5200>. The bar at the top switches design, view (employee / admin), language, season, light / dark and viewport size; the design stays mounted while you change them, so you can judge its transitions. "Open in its own tab" gives a full-size, linkable page such as `/antd/index.html#/admin?locale=zh-Hant&season=lunarNewYear&scheme=dark`.

A fresh clone needs the dependencies of each design first: `npm --prefix design-lab run build:clean`.

To work on one design: `npm --prefix design-lab/<slug> run dev` (ports 5201–5206).

## The six

| | design | kit (version built) | direction | JS gzip¹ | seasonal theming in this kit | what the kit made hard |
| --- | --- | --- | --- | --- | --- | --- |
| `mantine` | **Matsuri** | Mantine 9.8 | Festive and warm: seasonal gradients, soft cards, ambient particles | 346 kB | One Mantine theme per season (generated 10-shade palette) swapped through the provider. Moderate. | Charts ship with animation off; light badges needed overrides for contrast; layout animation comes from Motion. |
| `heroui` | **Aurora** | HeroUI 3.2 (Tailwind 4, React Aria) | Glass and light: translucent layers, blur, large radii, spring motion | 283 kB | Override its CSS variables per season. Easy. | No chart and a basic table (no row exit animation); glass needs component CSS overrides; styles ship for every component. |
| `shadcn` | **Ink** | shadcn/ui 4 (Base UI, Tailwind 4) | Editorial minimal: near-monochrome, hairlines, one seasonal accent | 314 kB | Generated CSS variables per season. Easy. | Components are ours to maintain; the CLI needed a workaround to run unattended; Japanese needed an explicit font order. |
| `antd` | **Console** | Ant Design 6.7 | Data-first enterprise: dense, precise, table-centric | 398 kB | Season feeds `ConfigProvider` tokens. Easy. | Animated table rows and lists need custom wiring; some tag and link colours missed AA and needed overrides; no chart in core. |
| `mui` | **Tonal** | MUI 9.6 (+ X Charts) | Material expressive: tonal surfaces, bold shapes, navigation rail | 345 kB | One theme per season with CSS variables and colour schemes. Moderate. | No Material 3 pieces out of the box (rail, tonal buttons, colour roles) – all hand-built in the theme. |
| `chakra` | **Arcade** | Chakra UI 3.38 | Gamified: level ring, badges, bouncy rewards | 386 kB | Semantic tokens switched per season. Moderate. | Token conditions do not nest; its `transition` prop collides with Motion's; new recipe variants need a type-generation step. |

¹ Total JavaScript for both views after gzip, from each build's output (several designs load the admin chart lazily). All use Motion for animation.

## What was and was not checked

Each design's build passes with no TypeScript errors, and its author looked at both views across the seasons, light and dark, and the three languages at phone and desktop widths, and exercised redeem, check-in, approve / reject / approve all, and revert. I then opened all six from the built gallery and confirmed that both views render in a spread of language, season and scheme combinations with no console errors.

Not checked by anyone: **animation smoothness on a real screen** (the automated browser ran at a few frames per second, so only start and end states were seen), Safari and Firefox, screen readers, and real phones. Contrast was audited by script on the main colour pairs, not on every element. Judge the motion yourself in the gallery – it is the main thing a screenshot cannot tell you.

A few strings are missing from the shared set and show as icons only in some designs: "no results" for an empty ledger search, "low stock", and a "level" label in Arcade.

## After choosing

Arcade (`chakra/`) was chosen on 2026-11-25. The app in `web/` was ported from Mantine to Chakra UI v3 in that design, with the standard theme changed to the company blue and green and the seasons replaced by twelve Taiwanese festivals with pixel-art motifs. The prototypes here still use the original four mock seasons and emoji artwork; they are not kept in step with the app. This folder can be deleted once nobody needs the comparison any more.

## How it is put together

- `SPEC.md` – the brief every design was built to.
- `shared/` – mock data, strings in three languages, the season palettes and the URL state helper. Dependency-free TypeScript imported by all six as `@shared`.
- `<slug>/` – one independent Vite project per design, with its own `node_modules`.
- `designs.json`, `gallery/index.html`, `build-all.mjs`, `serve.mjs` – the gallery and the scripts that build and serve it.
