# PointHub web: shared components and conventions

The app is built on Chakra UI v3 in the "Arcade" design (design source: `design-lab/chakra/` and `design-lab/SPEC.md`). It was ported from Mantine; the "was …" notes in the tables below say what each piece replaced. Use what is here before writing something new.

## Rules that hold everywhere

- **Roles** (contract): `systemAdmin | eventAdmin | giftAdmin | auditor`; no role = normal employee. Never test role names in pages: use `can.host / can.manageGifts / can.viewClaims / can.viewAdmin / can.admin` from `src/lib/roles.ts` and `<RequireRole permission>`. `can.viewClaims` opens the claims list (gift admins, system admins, and auditors read-only); what a reader may not do is not drawn (`can.manageGifts` decides the buttons). Labels: `role.*` in the locale files; `<RoleBadges roles>`.
- English copy calls a redemption a **claim** ("My claims", "Cancel claim"); the button verb stays "Redeem". Type and field names stay `Redemption`.
- No emoji in the UI. Theme art is pixel-art sprites (see "Sprites"). Icons are `lucide-react`.
- No class names; style with Chakra props and the semantic tokens.
- A file that exports a component exports only components (lint). Constants and stores live in `.ts` files (`lib/toaster.ts`, `lib/confirm.ts`, `components/ui/tableStyles.ts`).


## Shell and page composition

The layout follows the "Arcade" design (`design-lab/chakra`): its composition, with this app's own themes, sprites and icons.

- **Shell** (`components/AppLayout`): one top bar for everyone: brand, the Employee / Manage switch (only for people with a role: `hasManagement(me)` in `lib/roles`), Home / Gifts links on the employee side (from `md`; phones get the bottom tab bar), then balance chip, language, light / dark, account menu. On a phone the switch wraps to a second row, and that two-row bar does not stick.
- **Employee side** (`/`, `/gifts`, `/c/:token`): no sidebar, content up to 1240 px.
- **Management side** (everything under `/host` and `/admin`, `isManagementPath`): a sub-navigation card beside the content from `lg` (236 px, sticky), a strip that scrolls sideways above it below `lg`. One flat list filtered by `can.*`; "Dashboard" comes first for people with `can.viewAdmin`. The switch opens `managementHome(me)`: `/admin` for system admins and auditors, `/host/events` for event admins, `/admin/gifts` for gift admins. A new management page only needs its route in `App.tsx` and an entry in `useManagementNav`.
- **Employee home** (`pages/home/`): `HomeHero` (greeting, department chip, level ring with the balance, lifetime totals, next gift, check-in panel), `HomeEvents` ("Open now" / "Upcoming"), `<GiftCatalog limit={6}>` with "See all", `HomeActivity` in the side column, and a floating balance pill once the hero has scrolled away. There is deliberately no leaderboard and no rank chip.
- **Admin dashboard** (`pages/admin/AdminDashboardPage` + `pages/admin/dashboard/`): `KpiRow`, `TrendChart`, `PendingQueue`, `StockList`. It is its own lazy chunk because it carries the chart library; load it only through `pages/admin/dashboardLoader.ts`. What a person may not do is not drawn (no queue without `can.host`, no editor links without `can.manageGifts`).

## Shared layer

| What | Import | Use |
| --- | --- | --- |
| Page frame, header | `components/Page` | `<Page title subtitle actions>`; omit `title` for a custom hero. `<PageHeader>`, `<Stagger>` / `<StaggerItem>` |
| Loading / error / empty / pager | `components/states` | `<LoadingBlock />`, `<ErrorBlock error onRetry />`, `<EmptyState message icon? sprite?>`, `<NoMatch q onClear />` (a search that found nothing, with "Clear search"), `<Pager page pageSize total onChange />` |
| Status chips | `components/badges` | `EventStatusBadge`, `CheckInStatusBadge` (value may be `null`), `CheckInMethodBadge`, `RedemptionStatusBadge`, `TransactionTypeBadge`, `RosterMatchBadge`: `<X value size? />`; `<RoleBadges roles />` |
| Card | `components/ui/Panel` | `<Panel padding? gap?>` – sticker card (was `Card withBorder` / `Paper withBorder`) |
| Hero surface | `components/ui/HeroPanel` | `<HeroPanel>` – gradient, white text (kiosk / projector screens; replaces `.ph-hero`) |
| Section heading | `components/ui/bits` | `<SectionTitle icon={LucideIcon} title>…right side…</SectionTitle>`, `<Eyebrow>`, `<Coin />`, `<Points value signed? size? />`, `<SpriteTile sprite />` |
| Message box | `components/ui/Notice` | `<Notice tone="info\|success\|warning\|error" title?>body</Notice>` |
| Modal | `components/ui/Modal` | `<Modal opened onClose title footer? size? dismissible?>`; content mounts only while open |
| Confirm dialog | `lib/confirm` | `openConfirm({ title, children, labels: { confirm, cancel }, danger?, onConfirm })` |
| Toasts | `lib/notify` | `notifySuccess(msg)`, `notifyWarning(msg)` (worked, but not completely: a capped export), `notifyError(msg)` |
| Form state | `lib/useFormState` | `const form = useFormState({ initialValues, validate })`; `{...form.field('name')}`; `form.onSubmit(fn)`; `form.setErrors` |
| Fields | `components/ui/fields` | `TextField`, `TextAreaField`, `NumberField` (`number \| ''`), `SelectField` (`data`, `string \| null`), `SwitchField`, `CheckboxField`, `RadioField`, `DateTimeField` (ISO string, `withTime={false}` for a date), `FormField` (wrap anything). All take `label help error required disabled value onChange(value)` |
| Three-language input | `components/LocalizedInput` | `<LocalizedInput label value onChange error? required? multiline? />` (unchanged) |
| Data table | `components/ui/DataTable` | `<DataTable columns rows rowKey emptyMessage loading error onRetry stale rowMuted? onRowClick? minWidth />` (`rowMuted(row)`: quieter surface and text for a switched-off row, e.g. a disabled gift; `onRowClick(row)`: the whole row opens something, links and buttons inside keep their own meaning: give the row a real link too, for the keyboard); `<TableFrame minWidth>` + `tableStyles.ts` for hand-written `Table.Root` |
| Tabs | `components/ui/SimpleTabs` | `<SimpleTabs tabs={[{ value, label, icon?, badge?, content }]} value? onChange? />`; only the open panel is mounted |
| File drop zone | `components/ui/FileDropZone` | `<FileDropZone onDrop(files) onReject(refusedFiles) accept maxSize maxFiles loading title hint />` |
| Search box | `components/ui/SearchField` | `<SearchField value onChange label />` – magnifier, clear button; takes `InputGroup` layout props (`flex`, `maxW`). For a list, bind it to the URL: `const search = useUrlSearch('q')` → `value={search.text} onChange={search.onChange}`, and ask the server for `search.q` (debounced 250 ms; the server does the matching, never filter client-side) |
| Filters in the URL | `lib/urlFilters` | `const { params, patch } = useUrlFilters()`: the query string as filter state. `patch({ type })` sets, `patch({ type: null })` removes, and any change but `page` drops `page`. Read with `readPage / readId / readDate / readEnum(params, key, …)`. `useUrlSearch(key?)` is the search box on top of it. Every admin list keeps `q`, dates, type / status and the page there |
| Date range | `components/ui/DateRange` | `<DateRange from to onChange({ from, to }) />` – two native date pickers with plain `YYYY-MM-DD` values (the API's `from` / `to`); reports once typing has settled |
| Export CSV | `components/ExportButton` | `<ExportButton path="/api/admin/…/export" filters={sameFiltersAsTheList} />` – adds `locale`, saves under the server's file name, toasts the result (saved / capped at 50 000 rows / refused). Built on `downloadFile(path, query)` in `api/client` |
| Number tween | `components/AnimatedNumber` | `<AnimatedNumber value from? format? />` |
| Result moment | `components/StatusBurst`, `components/ui/Burst` | `<StatusBurst tone="success\|pending\|error" size? />`; `<Burst trigger={n} />` inside a `position: relative` box |
| Progress ring | `components/ui/LevelRing` | `<LevelRing percent label top? bottom?>centre</LevelRing>` (on a hero) |
| Gift catalogue | `components/GiftCatalog` | `<GiftCatalog limit? columns? searchParam? />` – a search box (bound to the URL key `searchParam`, default `q`) above the cards with redeem / "need N more" / out of stock / limit reached, the confirm dialog and the reward moment on the card. Used by the home page and `/gifts`. The per-person limit comes from the gift itself (`perEmployeeLimit - claimedByMe`), not from the claims list. Helpers in `lib/gifts`: `limitLeft`, `maxClaimable`, `nextGoal`, `LOW_STOCK`, `MAX_PER_EMPLOYEE_LIMIT` |
| QR scanner | `components/CheckInScanner` | `<CheckInScanner opened onClose />` – camera + `BarcodeDetector`; opens only what `parseCheckInLink` (`lib/checkInLink`) accepts; shows a fallback where it cannot scan; the camera stops when the dialog closes |
| Gift pictures | `components/GiftGallery` | `<GiftGallery images alt dimmed? />`, `<GiftThumb images size? shape? />` (`shape="square"`: neutral framed tile for tables and lists) |
| Upload with progress | `api/client` | `uploadWithProgress<T>(path, formData, onProgress)` – multipart POST over XHR, same `ApiError`s as `api.*` (see `api/gifts` `useUploadGiftImage`) |
| Admin page parts | `pages/admin/parts` | `<TableBlock>` (toolbar + table + pager), `<Toolbar actions?>` (`actions`: Export CSV, pushed to the far end), `<FilterChip label onClear>`, `<ClearFilters active onClear>`, `<TwoLine primary secondary>`, `<LinkButton>` (in-table filter), `<TextLink to>` (opens a page), `<EmployeeLink id>` (the name → lookup page, plain text for people who may not open it), `<Form onSubmit>` (column form, `noValidate`), `<FormActions>` |
| Admin lists | `pages/admin/LedgerTable`, `AttendanceTable`, `ClaimsList` | `<X filters page pageSize onPage emptyMessage showEmployee? />` – table (or claim rows) + pager for one filter set. Each is used by its own page and, with `employeeId` and `showEmployee={false}`, by a tab of the lookup page (`EmployeeLookupPage`). `ClaimsList` with `filters.status === null` mixes every status and says it on each row |
| Hooks | `lib/hooks` | `useDisclosure()`, `useDebouncedValue(value, ms)`, `useNow(intervalMs?)` (the time as state: never call `Date.now()` while rendering) |
| Shell sizes | `lib/layout` | `HEADER_HEIGHT`, `TAB_BAR_HEIGHT` – for anything sticky or fixed that has to clear the top bar or the phone tab bar |
| Charts | `@chakra-ui/charts` + `recharts` | Only inside the admin dashboard chunk. `useChart({ data, series: [{ name, color: 'brand.solid' }] })`, `chart.color('fg.muted')` for axes and grid: tokens become CSS variables, so a chart follows the theme and the colour scheme (see `pages/admin/dashboard/TrendChart`) |
| Motion presets | `lib/motion` | `springs.soft\|bouncy\|snap`, `pageVariants`, `listVariants`, `itemVariants`, `popVariants` |
| Guards, session | `components/guards`, `lib/session`, `lib/roles` | `<RequireAuth>`, `<RequireRole permission>`, `useSession()`, `can.*`, `hasManagement(me)`, `managementHome(me)`, `isManagementPath(pathname)` |
| Colour scheme | `themes/colorMode` | `useColorMode()` → `{ colorMode, toggleColorMode, setColorMode }` |

Buttons, inputs, badges, menus, tooltips: use Chakra's own (`Button`, `IconButton`, `Badge`, `Menu.*`) – the recipes in `themes/system.ts` already give them the Arcade look.

## Mantine → Chakra

| Mantine | Here |
| --- | --- |
| `Stack` / `Group` / `SimpleGrid` | `Flex direction="column" gap` / `Flex align="center" gap wrap="wrap"` / `Grid templateColumns={{ base: …, md: … }}` |
| `Text c="dimmed" size="sm" fw={600}` | `Text color="fg.muted" fontSize="sm" fontWeight="semibold"` |
| `Title order={n}` | `Heading as="hN" fontSize=…` (page title: `<Page title>`) |
| `Button leftSection={<I/>} loading` | `<Button loading><I />Label</Button>`; `variant="default"` → `variant="outline"`; `color="red"` → `colorPalette="red"`; `variant="light"` → `variant="subtle"` |
| `Button component={Link} to` | `<Button asChild><Link to>…</Link></Button>` |
| `ActionIcon` + `Tooltip` | `<IconButton aria-label title variant="ghost">` |
| `Badge color variant="light"` | `<Badge colorPalette variant="subtle">`; status values → `components/badges` |
| `Card` / `Paper withBorder` | `<Panel>` |
| `Alert color title` | `<Notice tone title>` |
| `Modal opened onClose title` | `<Modal>` (same props) |
| `modals.openConfirmModal({ confirmProps: { color: 'red' } })` | `openConfirm({ danger: true, … })` |
| `notifications.show` | `notifySuccess` / `notifyError` |
| `useForm` + `form.getInputProps('x')` | `useFormState` + `form.field('x')` |
| `TextInput` / `Textarea` / `NumberInput` / `Select` / `Switch` / `Checkbox` / `Radio.Group` | `TextField` / `TextAreaField` / `NumberField` / `SelectField` / `SwitchField` / `CheckboxField` / `RadioField` |
| `SegmentedControl` | `SegmentGroup.Root` (see `LocalizedInput`) or `SimpleTabs` |
| `DateTimePicker` / `DateInput` (Date) | `DateTimeField` (ISO string; `withTime={false}`) |
| `Dropzone` | `FileDropZone` |
| `Table` + `Table.ScrollContainer` | `DataTable`, or `TableFrame` + `Table.Root/Header/Row/ColumnHeader/Body/Cell` |
| `Tabs keepMounted={false}` | `SimpleTabs` |
| `Pagination` | `Pager` |
| `Loader` / `Center` | `LoadingBlock` or `Spinner` / `Center` |
| `CopyButton` | `Clipboard.Root value` + `Clipboard.Trigger` (Chakra) |
| `Accordion`, `Pill`, `Code`, `Anchor` | `Accordion.*`, `Tag.Root`, `Code`, `Link` (Chakra; for a router link `<ChakraLink asChild><Link to/></ChakraLink>`) |
| `useDisclosure`, `useDebouncedValue` | `lib/hooks` |
| `@tabler/icons-react` `IconX` | `lucide-react` `X` (`size`, `strokeWidth`, `aria-hidden`) |
| `className="ph-tabular"` | `fontVariantNumeric="tabular-nums"` |
| `className="ph-hero ph-kiosk"` | `<HeroPanel>` + flex props |
| `visibleFrom="sm"` / `hiddenFrom="sm"` | `display={{ base: 'none', md: 'block' }}` / `display={{ md: 'none' }}` (Mantine `sm` = Chakra `md` = 768 px) |

## Theme tokens

Use semantic tokens, never hex values or `blue.500`:

- Surfaces and text: `bg` (page), `bg.panel` (cards), `bg.subtle`, `bg.muted`, `fg`, `fg.muted`, `border`, `border.emphasized`.
- Brand (theme primary): `brand.solid` (fills; white text is AA on it) with `brand.contrast`, `brand.fg` (text / links on surfaces), `brand.subtle`, `brand.muted`, `brand.depth` (the slab under a button). `brand.500` is the undarkened primary (the company blue in the standard theme): large surfaces and decoration only, never behind white text.
- Accent (rewards, progress, coins): `accent.solid` with `accent.contrast` (dark text), `accent.fg`, `accent.subtle`, `accent.muted`, `accent.depth`.
- Hero: `hero.from`, `hero.via` (carry white text), `hero.to` (glow only). Signed amounts: `gain`, `loss`.
- Status palettes: `colorPalette="green|red|orange|yellow|blue|purple|cyan|pink|gray"`; `colorPalette="brand"` is the default everywhere, `colorPalette="accent"` for reward buttons.
- Radii `l1` / `l2` / `l3`. Fonts `body`, `heading` (`fontFamily="heading"` for big numbers).
- In a style-prop string reference a token as `{colors.brand.depth}`; in a plain `style={{}}` use `var(--chakra-colors-brand-depth)`.

Theme = `<html data-theme="<ThemeKey>">`, scheme = `.dark` / `.light` on `<html>`; both tween. Read the active theme with `useActiveTheme()` (`themes/activeTheme`): `{ key, id, motif, companion, effect, primary, accent, gradient }`; its name is `t(`themes.${theme.id}`)`. All themes: `THEMES` in `themes/registry`. Check contrast after colour changes: `node scripts/contrast.ts`.

## Sprites

`src/themes/sprites/`: `types.ts` (`Sprite` = grid rows + palette, `INK` outline), `motifs.ts` (one 16 × 16 motif per theme, some with a companion), `minis.ts` (ambient particles), `ui.ts` (`giftBox`, `eventCalendar`, `ticket`, coloured by theme tokens), `PixelSprite.tsx`.

- `<PixelSprite sprite scale={1…8} title? />` renders any sprite as crisp inline SVG.
- `<ThemeSprite scale which="motif|companion" bob? theme? />` (`components/ui/ThemeSprite`) renders a theme's motif; pass `theme={THEMES[i]}` to preview another theme (for the admin theme page).
- New sprite: `sprite(palette, rows)`; `'.'` is transparent, `'k'` is the outline. Rows must be equally wide (checked in dev). Sprites used on the ambient canvas need hex colours, not `var()`.

## Chakra v3 pitfalls met here

- `asChild` merges into exactly one child element. A component that renders several children (e.g. `HeroPanel`) cannot take it: wrap it in the `motion.*` element instead. For Chakra props on a motion element: `<Box asChild …><motion.div … /></Box>`.
- `as="button"` keeps the `div` prop types. Use `chakra.button` (see `LoginPage`).
- There is no colour-mode provider and none of the CLI "snippets" (`@/components/ui/toaster`, `field`, `color-mode` …) from the Chakra docs exist here. Use `themes/colorMode`, `lib/notify`, `components/ui/*`.
- `Dialog`, `Menu`, `Drawer` content must sit in `<Portal>`; `Menu.Item` needs a `value` and fires `onSelect`.
- `NumberInput` values are strings and `Tabs` / `Dialog` keep content mounted unless `lazyMount unmountOnExit` is set: the wrappers handle both.
- A solid `Button` draws its slab from `colorPalette.depth`. Only `brand`, `accent`, `gray` and the status palettes above define it.
- `Badge` sizes stop at `lg`.
- Responsive props are viewport-based, but on the management side the sub-navigation takes 236 px plus a gap from `lg` up: a row that fits "at xl" on the employee side is narrower there (see the six tiles of `pages/admin/dashboard/KpiRow`). The employee side has no sidebar.
- Chakra's styles live in cascade layers (`reset, base, tokens, recipes`); the order is pinned in `index.html`. Unlayered CSS always wins over them.
- Only registered role tokens tween on theme change (`themes/runtime.ts`); add a token there if a new one should.
- Canvas / `requestAnimationFrame` effects do not advance in a hidden browser tab, so automated screenshots may show them frozen. The same goes for Motion's entrance animations: in a background tab a page can sit at `opacity: 0` until the tab is brought to the front.
- `<Panel asChild>` does not turn the panel into its child: `Card.Root` merges into the `Card.Body` that Panel renders. For an animated card put the `motion.*` element outside (`<motion.article style={{ height: '100%' }}><Panel h="full">…`, see `GiftCatalog`). For a clickable card wrap the panel instead: `<Box asChild display="block" borderRadius="l3" focusVisibleRing="outside"><Link to>…<Panel>…</Panel></Link></Box>` (see `HostEventsPage`).
- Full-screen surface (projector): `Dialog.Root size="full"` with a `<HeroPanel minH="100dvh" borderRadius="0">` inside `Dialog.Content`; the shared `<Modal>` stays for ordinary dialogs (see `host/CheckInTab`).
- Per-row mutations fired in quick succession: use `mutateAsync(...).catch(...)` per call. The callbacks passed to `mutate()` only run for the latest call (see `host/ApprovalsTab`).
- `FileUpload` (FileDropZone) listens for the `input` event on its hidden input, not `change`: a scripted test must dispatch `input`.
- A form built from the fields here does its own validation and shows translated messages, so switch the browser's bubbles off: `<form noValidate>` (`<Form>` in `pages/admin/parts`). And `Flex as="form"` has `div` prop types (no `noValidate`): use `chakra.form`.
- `<FormField required>` (a `Field.Root`) makes every control inside it required, so a group of checkboxes blocks the submit until all are ticked. Group checkboxes in `Fieldset.Root` + `Fieldset.Legend` / `Fieldset.ErrorText` (see `admin/ApiClientsPage`).
- `motion.*` elements reserve `onDragStart` / `onDragEnd` for their own gestures: put native HTML5 drag-and-drop (`draggable`, `onDragStart` …) on a plain element inside the motion element (see `admin/GiftImagesEditor`).
- `Flex as="ul"` keeps the `div` ref type. For a ref on a list use `<Flex asChild …><ul ref={ref}>…</ul></Flex>` (see the management nav in `AppLayout`).
- `useEffectEvent` (React 19.2) is the way to read the latest props inside a long-lived effect without restarting it (the scanner's camera loop).
- `<BrowserRouter>` applies a URL change as a transition, a moment after the event. A controlled field whose value comes straight from `useSearchParams` snaps back to its old value in between (and a second change made right away is built on the old query string). Use `useUrlFilters` / `useUrlSearch` (`lib/urlFilters`): they show the change at once and build each change on the address bar.
- A native date field reports a year typed on the keyboard digit by digit (`0002-…`, `0020-…`): do not send every `onChange` to the server (`DateRange` waits for the typing to settle).
- A sandboxed `<iframe sandbox="" srcDoc>`: mount it only once there is content. Mounted with an empty `srcDoc` and filled later, it stayed blank in the desktop app's browser pane (see `admin/EmailTemplates`).
- `<AnimatedNumber format>` receives the in-between values of the tween: round inside your formatter, or leave `format` out for whole numbers.
