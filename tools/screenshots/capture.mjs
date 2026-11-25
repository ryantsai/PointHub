// Captures the screenshots shown on the proposal page (web/public/proposal/screenshots).
//
// Needs: the API and the web dev server running against a FRESH sample database (the script signs in as the
// sample people, checks one of them in and creates two API keys), and Microsoft Edge or Chrome installed.
//   npm --prefix tools/screenshots install
//   npm --prefix tools/screenshots run capture
// Options (environment): POINTHUB_URL (default http://localhost:5173), SHOT_LOCALE (default zh-Hant),
// ONLY (comma-separated shot names to retake).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.POINTHUB_URL ?? 'http://localhost:5173';
const locale = process.env.SHOT_LOCALE ?? 'zh-Hant';
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/public/proposal/screenshots');
mkdirSync(out, { recursive: true });

const DESKTOP = { width: 1280, height: 860 };
const PHONE = { width: 390, height: 844 };
const SMALL = { width: 1000, height: 640 };
const THEMES = ['default', 'new-year', 'lunar-new-year', 'lantern-festival', 'qingming', 'dragon-boat', 'qixi', 'ghost-festival',
  'mid-autumn', 'national-day', 'double-ninth', 'winter-solstice', 'christmas'];
const headers = { 'X-Requested-With': 'PointHub' };

let browser;
for (const channel of ['msedge', 'chrome']) {
  try { browser = await chromium.launch({ channel }); break; } catch { /* try the next browser */ }
}
if (!browser) throw new Error('Neither Microsoft Edge nor Chrome could be started.');

/** A signed-in browser context for one sample person (or anonymous when employeeNo is null). */
async function session(employeeNo, viewport = DESKTOP) {
  const context = await browser.newContext({ viewport, locale: locale === 'zh-Hant' ? 'zh-TW' : locale, timezoneId: 'Asia/Taipei', isMobile: viewport === PHONE, hasTouch: viewport === PHONE });
  if (employeeNo) {
    const login = await context.request.post(`${base}/api/auth/dev-login`, { headers, data: { employeeNo } });
    if (!login.ok()) throw new Error(`Could not sign in as ${employeeNo}: ${login.status()}. Is the API running with sample data?`);
    await context.request.put(`${base}/api/me/locale`, { headers, data: { locale } });
  }
  return context;
}

async function shot(context, name, path, { settle = 2200, before } = {}) {
  if (only && !only.has(name)) return;
  const page = await context.newPage();
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForTimeout(settle);
  if (before) { await before(page); await page.waitForTimeout(1400); }
  await page.screenshot({ path: join(out, `${name}.png`) });
  await page.close();
  console.log(`  ${name}.png`);
}

console.log(`Capturing from ${base} in ${locale} → ${out}`);

// ---- Sign-in page -------------------------------------------------------------------------------------
const anonymous = await session(null);
await shot(anonymous, 'login', '/login');
await anonymous.close();

// ---- Event admin (also gives us the check-in link of the sample event) ----------------------------------
const eventAdmin = await session('E0002');
// The sample data's two events that are on now: one with a static link and approvals, one with a rotating code.
const events = await (await eventAdmin.request.get(`${base}/api/host/events`)).json();
const open = events.filter((event) => event.status === 'open' && new Date(event.startsAt) <= new Date());
const staticEvent = open.find((event) => event.checkInMode === 'static');
const rotatingEvent = open.find((event) => event.checkInMode === 'rotating');
if (!staticEvent || !rotatingEvent) throw new Error('The sample data needs one open static and one open rotating event.');
const kickoff = await (await eventAdmin.request.get(`${base}/api/host/events/${staticEvent.id}`)).json();

// ---- Employee ---------------------------------------------------------------------------------------------
const staff = await session('E0101');
await shot(staff, 'dashboard', '/', { settle: 3200 });
await shot(staff, 'gifts', '/gifts');
await shot(staff, 'claims', '/gifts', { before: (page) => page.getByRole('tab').nth(1).click() });
for (const theme of THEMES) {
  const themed = await session('E0101', SMALL);
  await shot(themed, `theme-${theme}`, `/?theme=${theme}`, { settle: 3600 });
  await themed.close();
}
await staff.close();

const phone = await session('E0101', PHONE);
await shot(phone, 'dashboard-mobile', '/', { settle: 3200 });
await shot(phone, 'checkin', `/c/${kickoff.checkInToken}`);
await phone.close();

// ---- Event admin pages --------------------------------------------------------------------------------------
await shot(eventAdmin, 'event-form', '/host/events?new=1');
await shot(eventAdmin, 'host-qr', `/host/events/${rotatingEvent.id}?tab=checkin`, { settle: 3000 });
await shot(eventAdmin, 'host-approvals', `/host/events/${staticEvent.id}?tab=approvals`);
await shot(eventAdmin, 'host-roster', `/host/events/${staticEvent.id}?tab=roster`);
// A keyboard-wedge reader "types" the badge number quickly and presses Enter.
await shot(eventAdmin, 'host-station', `/host/events/${staticEvent.id}?tab=station`, {
  before: async (page) => { await page.locator('body').click({ position: { x: 5, y: 5 } }); await page.keyboard.type('04A23B1C', { delay: 8 }); await page.keyboard.press('Enter'); },
});
await eventAdmin.close();

// ---- Gift admin ------------------------------------------------------------------------------------------------
const giftAdmin = await session('E0003');
await shot(giftAdmin, 'admin-gifts', '/admin/gifts?edit=1', { settle: 3000 });
await shot(giftAdmin, 'admin-claims', '/admin/claims');
await giftAdmin.close();

// ---- System admin -------------------------------------------------------------------------------------------------
const admin = await session('E0001');
const keys = await (await admin.request.get(`${base}/api/admin/api-clients`)).json();
if (keys.length === 0) {
  await admin.request.post(`${base}/api/admin/api-clients`, { headers, data: { name: '人資系統', scopes: ['employees:write'], expiresAt: null } });
  await admin.request.post(`${base}/api/admin/api-clients`, { headers, data: { name: '員工餐廳機台', scopes: ['points:read', 'points:write'], expiresAt: null } });
}
await shot(admin, 'admin-dashboard', '/admin', { settle: 3600 });
await shot(admin, 'admin-ledger', '/admin/ledger');
await shot(admin, 'admin-employees', '/admin/employees');
await shot(admin, 'admin-themes', '/admin/themes', { settle: 3000 });
await shot(admin, 'admin-email', `/admin/email?template=checkInApproved&locale=${locale}`, { settle: 3200 });
await shot(admin, 'admin-api-keys', '/admin/api-clients');
await shot(admin, 'admin-audit', '/admin/audit');
await admin.close();

await browser.close();
console.log('Done.');
