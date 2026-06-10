/**
 * Visual check for the /welcome landing journey (dev tool, not CI).
 *
 * Drives a real Chromium through the scroll story and saves screenshots at
 * several progress points (plus a light-theme and a mobile pass) so the 3D
 * scene can be reviewed without a human eyeball on every iteration.
 *
 *   node scripts/landing-shots.mjs [baseUrl]   (default http://localhost:3000)
 *
 * Output: .landing-shots/*.png  (gitignored)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = '.landing-shots';
mkdirSync(OUT, { recursive: true });

/** Scroll the landing's inner scroller so the story sits at `progress` 0..1. */
async function gotoProgress(page, progress) {
  await page.evaluate((p) => {
    const scroller = document.querySelector('.v-scroll');
    const story = document.querySelector('section[aria-label="How Vesta works"]');
    if (!scroller || !story) throw new Error('landing scroller/story not found');
    const start = story.offsetTop;
    const range = story.offsetHeight - scroller.clientHeight;
    scroller.scrollTop = start + range * p;
  }, progress);
  // The camera eases toward the target — give it time to settle.
  await page.waitForTimeout(1500);
}

async function shoot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
}

const browser = await chromium.launch();
try {
  console.log(`Shooting ${BASE}/welcome → ${OUT}/`);

  // Desktop, dark (default theme).
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`  [console.error] ${m.text()}`);
  });
  page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message}`));
  await page.goto(`${BASE}/welcome`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForTimeout(2000); // scene build + first frames

  for (const p of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
    await gotoProgress(page, p);
    await shoot(page, `dark-p${String(p).replace('.', '')}`);
  }

  // Light theme spot-checks.
  await page.click('button[aria-label="Switch to light mode"]');
  await page.waitForTimeout(600);
  for (const p of [0.1, 0.5, 0.9]) {
    await gotoProgress(page, p);
    await shoot(page, `light-p${String(p).replace('.', '')}`);
  }
  await page.close();

  // Mobile, dark.
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mob.goto(`${BASE}/welcome`, { waitUntil: 'networkidle' });
  await mob.waitForSelector('canvas', { timeout: 20000 });
  await mob.waitForTimeout(2000);
  for (const p of [0.1, 0.5, 0.9]) {
    await gotoProgress(mob, p);
    await shoot(mob, `mobile-p${String(p).replace('.', '')}`);
  }
  await mob.close();

  console.log('Done.');
} finally {
  await browser.close();
}
