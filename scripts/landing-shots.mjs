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

// v4 story beats: envelope ~.08, gate ~.24, AI core ~.42, radar ~.59,
// antenna ~.77, fan-out finale ~.88..1.
const STORY_POINTS = [0, 0.08, 0.24, 0.42, 0.59, 0.77, 0.88, 1];

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
  // Re-center the pointer AFTER the scroll so parallax never biases a shot
  // (pointer NDC is computed against the scene host's current rect).
  const vp = page.viewportSize();
  if (vp) await page.mouse.move(vp.width / 2, vp.height / 2);
  // The camera eases toward the target — give it time to settle.
  await page.waitForTimeout(1500);
}

/** Scroll a lower section's heading to the top of the viewport. */
async function gotoHeading(page, text) {
  await page.evaluate((txt) => {
    const scroller = document.querySelector('.v-scroll');
    const els = [...document.querySelectorAll('h2, h3')];
    const el = els.find((e) => (e.textContent ?? '').includes(txt));
    if (!scroller || !el) throw new Error(`heading not found: ${txt}`);
    const rect = el.getBoundingClientRect();
    scroller.scrollTop += rect.top - 130;
  }, text);
  await page.waitForTimeout(1400); // entry reveals + a beat of the mock loop
}

async function gotoBottom(page) {
  await page.evaluate(() => {
    const scroller = document.querySelector('.v-scroll');
    scroller.scrollTop = scroller.scrollHeight;
  });
  await page.waitForTimeout(900);
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
  await page.mouse.move(720, 450); // center, so pointer parallax doesn't bias framing
  await page.waitForTimeout(2000); // scene build + first frames

  for (const p of STORY_POINTS) {
    await gotoProgress(page, p);
    await shoot(page, `dark-p${String(p).replace('.', '')}`);
  }

  // Lower sections, by heading.
  const SECTIONS = [
    ['Start where it matters', 'band-radar'],
    ['AI that shows its work.', 'band-reasons'],
    ['Approve, don', 'band-drafts'],
    ['Small things that add up', 'grid'],
    ['Where Vesta goes next.', 'roadmap'],
    ['Three steps. No setup project.', 'steps'],
  ];
  for (const [heading, name] of SECTIONS) {
    await gotoHeading(page, heading);
    await shoot(page, `dark-${name}`);
  }
  await gotoBottom(page);
  await shoot(page, 'dark-finale-end');

  // Light theme spot-checks.
  await page.click('button[aria-label="Switch to light mode"]');
  await page.mouse.move(720, 450); // re-center after the corner click (parallax)
  await page.waitForTimeout(600);
  for (const p of [0.08, 0.42, 0.88]) {
    await gotoProgress(page, p);
    await shoot(page, `light-p${String(p).replace('.', '')}`);
  }
  for (const [heading, name] of SECTIONS) {
    await gotoHeading(page, heading);
    await shoot(page, `light-${name}`);
  }
  await gotoBottom(page);
  await shoot(page, 'light-finale-end');
  await page.close();

  // Mobile, dark.
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mob.goto(`${BASE}/welcome`, { waitUntil: 'networkidle' });
  await mob.waitForSelector('canvas', { timeout: 20000 });
  await mob.mouse.move(195, 422);
  await mob.waitForTimeout(2000);
  for (const p of [0.08, 0.42, 0.77, 0.95]) {
    await gotoProgress(mob, p);
    await shoot(mob, `mobile-p${String(p).replace('.', '')}`);
  }
  await gotoHeading(mob, 'Start where it matters');
  await shoot(mob, 'mobile-band-radar');
  await gotoBottom(mob);
  await shoot(mob, 'mobile-finale-end');
  await mob.close();

  console.log('Done.');
} finally {
  await browser.close();
}
