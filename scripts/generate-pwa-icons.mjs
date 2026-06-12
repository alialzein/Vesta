/**
 * Generates the PWA icon set (public/icons/*.png) from the Vesta brand mark —
 * the same flame + blue-cyan orb the sidebar header uses, on the splash's
 * deep-navy field. Run once (and re-run only if the brand changes):
 *
 *   node scripts/generate-pwa-icons.mjs
 *
 * Uses the repo's playwright devDependency to rasterize an HTML art board —
 * no extra image libraries. Outputs:
 *   icon-192.png            (launcher icon)
 *   icon-512.png            (launcher icon, large)
 *   icon-maskable-512.png   (extra safe-zone padding for Android masks)
 *   apple-touch-icon.png    (180px, iOS home screen)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('public/icons');
mkdirSync(OUT, { recursive: true });

// The VestaMark flame path (components/ui/Icon.tsx), drawn white on the orb.
const FLAME =
  'M12 2c.4 3-1.8 4.2-2.8 6.1-1 1.9-.6 4 .9 4.6.5-1.2.2-2.4 1-3.4.2 1.9 1.6 2.7 2.3 4.1.8 1.6.1 3.6-1.4 4.4 3.6.2 6-2 6-5.2 0-4.6-4.2-6.1-4.4-10.6-1.3 1-2 2.6-1.9 4.3-1.6-.9-2-2.6-1.7-4.3z';

/** One square art board: navy field + glow + gradient orb + white flame.
 *  `orbScale` shrinks the artwork for the maskable variant's safe zone. */
function board(size, orbScale) {
  const orb = Math.round(size * orbScale);
  const flame = Math.round(orb * 0.52);
  return `<!doctype html><html><head><style>
    * { margin: 0; padding: 0; }
    body { width: ${size}px; height: ${size}px; overflow: hidden; }
    .field {
      width: 100%; height: 100%;
      display: grid; place-items: center;
      background:
        radial-gradient(120% 85% at 50% 122%, rgba(67,199,255,.20), transparent 55%),
        radial-gradient(95% 75% at 50% -12%, rgba(91,168,245,.22), transparent 55%),
        #0a0f17;
    }
    .orb {
      width: ${orb}px; height: ${orb}px;
      border-radius: ${Math.round(orb * 0.3)}px;
      display: grid; place-items: center;
      background: radial-gradient(circle at 50% 95%, #43c7ff, #2f7deb 50%, #67e8d8 100%);
      box-shadow: 0 ${Math.round(size * 0.04)}px ${Math.round(size * 0.12)}px rgba(47,125,235,.55),
        inset 0 0 0 ${Math.max(1, Math.round(size * 0.006))}px rgba(255,255,255,.3);
    }
    svg { filter: drop-shadow(0 ${Math.round(size * 0.01)}px ${Math.round(size * 0.02)}px rgba(10,20,40,.45)); }
  </style></head><body>
    <div class="field"><div class="orb">
      <svg width="${flame}" height="${flame}" viewBox="0 0 24 24" fill="#ffffff"><path d="${FLAME}"/></svg>
    </div></div>
  </body></html>`;
}

const TARGETS = [
  { file: 'icon-192.png', size: 192, orbScale: 0.62 },
  { file: 'icon-512.png', size: 512, orbScale: 0.62 },
  // Maskable: launchers may crop to a circle — keep the orb inside the
  // central 80% safe zone.
  { file: 'icon-maskable-512.png', size: 512, orbScale: 0.5 },
  { file: 'apple-touch-icon.png', size: 180, orbScale: 0.66 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of TARGETS) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(board(t.size, t.orbScale));
  await page.screenshot({ path: path.join(OUT, t.file) });
  console.log(`wrote public/icons/${t.file}`);
}
await browser.close();
