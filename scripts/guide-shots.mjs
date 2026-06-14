/**
 * Visual check for the /user-guide doc site (dev tool, not CI).
 *
 * Captures the overview and a couple of guide pages in BOTH themes, plus a
 * mobile pass (with the nav drawer open), so the docs can be reviewed without a
 * human eyeball on every change.
 *
 *   node scripts/guide-shots.mjs [baseUrl]   (default http://localhost:3000)
 *
 * Output: .guide-shots/*.png  (gitignored)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = '.guide-shots';
mkdirSync(OUT, { recursive: true });

async function shoot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
}

async function setTheme(page, theme) {
  const label = theme === 'light' ? 'Switch to light mode' : 'Switch to dark mode';
  const btn = page.locator(`button[aria-label="${label}"]`);
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(350);
  }
}

async function scrollMain(page, top) {
  await page.evaluate((t) => {
    const m = document.querySelector('main.v-scroll');
    if (m) m.scrollTop = t;
  }, top);
  await page.waitForTimeout(350);
}

const browser = await chromium.launch();
try {
  console.log(`Shooting ${BASE}/user-guide → ${OUT}/`);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && console.log(`  [console.error] ${m.text()}`));

  // Overview (dark default, then light).
  await page.goto(`${BASE}/user-guide`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await shoot(page, 'overview-dark');
  await setTheme(page, 'light');
  await shoot(page, 'overview-light');
  await setTheme(page, 'dark');

  // A text-heavy guide with a TOC.
  await page.goto(`${BASE}/user-guide/getting-started`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await shoot(page, 'guide-dark-top');
  await scrollMain(page, 700);
  await shoot(page, 'guide-dark-mid');
  await setTheme(page, 'light');
  await scrollMain(page, 0);
  await shoot(page, 'guide-light-top');

  // A guide with tables + a code-fence diagram + blockquotes (prose stress test).
  await page.goto(`${BASE}/user-guide/email-filtering`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await setTheme(page, 'light');
  await scrollMain(page, 600);
  await shoot(page, 'filtering-light');
  await setTheme(page, 'dark');
  await shoot(page, 'filtering-dark');
  await page.close();

  // Mobile, dark: overview + open drawer + a guide.
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mob.goto(`${BASE}/user-guide`, { waitUntil: 'networkidle' });
  await mob.waitForTimeout(500);
  await shoot(mob, 'mobile-overview');
  await mob.locator('button[aria-label="Open guide menu"]').click();
  await mob.waitForTimeout(350);
  await shoot(mob, 'mobile-drawer');
  await mob.goto(`${BASE}/user-guide/ask-vesta`, { waitUntil: 'networkidle' });
  await mob.waitForTimeout(500);
  await shoot(mob, 'mobile-guide');
  await mob.close();

  console.log('Done.');
} finally {
  await browser.close();
}
