/**
 * generate-app-icons — redraws every Expo icon asset from one SVG source.
 *
 *   node scripts/generate-app-icons.mjs
 *
 * ── Why the artwork lives here and not in a .png ────────────────────────────
 *
 * The icon this replaced survived only as `assets/gidi-connect-logo.svg.bak`
 * and four flattened PNGs, so there was nothing to edit — changing it meant
 * redrawing it. The source of truth is `ART` below; every PNG is build output
 * and can be regenerated at any size.
 *
 * ── The design ──────────────────────────────────────────────────────────────
 *
 * A hub with four coloured reaches, on white. The app is called Connect, and
 * this is the most direct thing that word can look like.
 *
 * Two earlier rounds are worth not repeating:
 *
 *   - **Regular polygons do not read as networks.** Five nodes joined into a
 *     pentagon reads as a pentagon; four into a square with a diagonal reads
 *     as a crop tool. A closed outline becomes a shape, and the shape is then
 *     what the eye names. The hub is open by construction.
 *   - **Straight segments between scattered nodes read as a chart.** A
 *     zigzag with coloured stops is a stock ticker, which is the one thing a
 *     nightlife app should not look like.
 *
 * The spokes sit at -95°, -8°, 72° and 162°, which is deliberately uneven.
 * At four even 90° spokes this becomes an asterisk, and an asterisk is a
 * footnote mark. Radii vary 290–310 for the same reason.
 *
 * ── Four outputs, three different problems ──────────────────────────────────
 *
 *   icon.png          1024, full bleed, OPAQUE. App Store icons may not carry
 *                     an alpha channel.
 *   adaptive-icon.png 1024, transparent, art scaled to 0.60. Android crops the
 *                     outer third of this canvas to the launcher's mask, so
 *                     anything near the edge is lost.
 *   splash-icon.png   1284, transparent, art scaled to 0.52, floated on
 *                     splash.backgroundColor at resizeMode "contain".
 *   favicon.png        256, full bleed, opaque.
 *
 * The art is drawn on transparency and the white comes from the surrounding
 * surface, so the same source serves the bled and unbled variants. Keep
 * `splash.backgroundColor` and `adaptiveIcon.backgroundColor` at #FFFFFF in
 * app.json or the layers will not match the icon.
 *
 * Needs puppeteer, which the repo already has for the news agent.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync } from 'fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(HERE, '../package.json'));
const puppeteer = require('puppeteer');
const OUT = resolve(HERE, '../apps/consumer-app/assets');

// Brand gold is the hub and nothing else. The four spokes take the other
// hues, each picked to hold its own against white at tile size — nothing
// pastel, nothing that greys out.
//
// Gold was a spoke in the first pass and it cost the composition its centre:
// the lower-left spoke met the gold ring in the same colour, so the two
// fused and that one arm read as the hub leaking sideways rather than as a
// fifth element. Reserving a colour for the focal point is what makes it one.
const GOLD = '#EAB308', ROSE = '#F43F5E', TEAL = '#14B8A6', INDIGO = '#6366F1', VIOLET = '#A855F7';

const C = [512, 512];
const SPOKES = [
  { p: [486, 213], color: TEAL },
  { p: [809, 470], color: ROSE },
  { p: [608, 807], color: INDIGO },
  { p: [236, 602], color: VIOLET },
];

const STROKE = 40, NODE = 52, HUB = 88, HUB_HOLE = 38;

const ART = `
  ${SPOKES.map(({ p, color }) =>
    `<line x1="${C[0]}" y1="${C[1]}" x2="${p[0]}" y2="${p[1]}" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="round"/>`,
  ).join('\n  ')}
  ${SPOKES.map(({ p, color }) => `<circle cx="${p[0]}" cy="${p[1]}" r="${NODE}" fill="${color}"/>`).join('\n  ')}
  <circle cx="${C[0]}" cy="${C[1]}" r="${HUB}" fill="${GOLD}"/>
  <circle cx="${C[0]}" cy="${C[1]}" r="${HUB_HOLE}" fill="#FFFFFF"/>`;

const svg = ({ bleed = true, scale = 1, size = 1024 }) => {
  // Art bounding box is x 184–861, y 161–859; its centre is (522, 510), not
  // (512, 512) — scaling about the canvas centre would drift it off-axis.
  const placed = scale === 1 ? ART
    : `<g transform="translate(512 512) scale(${scale}) translate(-522 -510)">${ART}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  ${bleed ? '<rect width="1024" height="1024" fill="#FFFFFF"/>' : ''}
  ${placed}
</svg>`;
};

// Add a `{ file, size, opaque, bg, svg }` entry to render a proof at any size —
// `bg` composites a transparent layer over a colour, which is how the Android
// foreground gets checked against adaptiveIcon.backgroundColor.
const JOBS = [
  { file: `${OUT}/icon.png`, size: 1024, opaque: true, svg: svg({ bleed: true }) },
  { file: `${OUT}/adaptive-icon.png`, size: 1024, opaque: false, svg: svg({ bleed: false, scale: 0.60 }) },
  { file: `${OUT}/splash-icon.png`, size: 1284, opaque: false, svg: svg({ bleed: false, scale: 0.52 }) },
  { file: `${OUT}/favicon.png`, size: 256, opaque: true, svg: svg({ bleed: true }) },
];

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
for (const job of JOBS) {
  const page = await browser.newPage();
  await page.setViewport({ width: job.size, height: job.size, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html><head><style>
       html,body{margin:0;padding:0;background:${job.bg ?? (job.opaque ? '#FFFFFF' : 'transparent')}}
       svg{display:block;width:${job.size}px;height:${job.size}px}
     </style></head><body>${job.svg}</body></html>`,
    { waitUntil: 'load' },
  );
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: job.file, omitBackground: !job.opaque });
  await page.close();
  console.log(`${String(job.size).padStart(4)}px  ${job.opaque ? 'opaque     ' : 'transparent'}  ${job.file.split('/').pop()}`);
}
await browser.close();

writeFileSync(resolve(OUT, 'icon-source.svg'), svg({ bleed: true }));
console.log('wrote icon-source.svg');
