const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../apps/consumer-app/assets');
const SIZE = 1024;

// Brand colors
const GOLD = '#EAB308';
const GOLD_LIGHT = '#FDE68A';
const GOLD_DARK = '#CA8A04';
const DARK_BG = '#0A0A0A';
const DARK_CARD = '#1A1A1A';

/**
 * Draws the Connect logo design:
 * - Dark background
 * - Gold radial glow
 * - Stylized location pin with "C" hole (for Connect)
 * - Floating sparkle dots for nightlife vibe
 */
function drawConnectLogo(ctx, size, darkBg = true) {
  const cx = size / 2;
  const cy = size / 2;

  if (darkBg) {
    // Dark background
    ctx.fillStyle = DARK_BG;
    ctx.fillRect(0, 0, size, size);

    // Subtle dark card layer (vignette)
    const vignette = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 0.65);
    vignette.addColorStop(0, 'rgba(20,20,20,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);
  }

  // ── Outer ambient glow ring ──────────────────────────────────────────
  const outerGlow = ctx.createRadialGradient(cx, cy, size * 0.2, cx, cy, size * 0.52);
  outerGlow.addColorStop(0, 'rgba(234,179,8,0.22)');
  outerGlow.addColorStop(0.6, 'rgba(234,179,8,0.06)');
  outerGlow.addColorStop(1, 'rgba(234,179,8,0)');
  ctx.fillStyle = outerGlow;
  ctx.fillRect(0, 0, size, size);

  // ── Main gold disc ───────────────────────────────────────────────────
  const discRadius = size * 0.315;
  const discGrad = ctx.createRadialGradient(
    cx - size * 0.04, cy - size * 0.06, 0,
    cx, cy, discRadius
  );
  discGrad.addColorStop(0, '#FEF9C3');   // Very light gold centre
  discGrad.addColorStop(0.25, GOLD_LIGHT);
  discGrad.addColorStop(0.65, GOLD);
  discGrad.addColorStop(1, GOLD_DARK);

  ctx.beginPath();
  ctx.arc(cx, cy, discRadius, 0, Math.PI * 2);
  ctx.fillStyle = discGrad;
  ctx.fill();

  // Disc inner shadow (depth)
  const discInner = ctx.createRadialGradient(cx, cy, discRadius * 0.7, cx, cy, discRadius);
  discInner.addColorStop(0, 'rgba(0,0,0,0)');
  discInner.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.beginPath();
  ctx.arc(cx, cy, discRadius, 0, Math.PI * 2);
  ctx.fillStyle = discInner;
  ctx.fill();

  // ── Location pin symbol ──────────────────────────────────────────────
  // Pin is drawn in dark color on top of the gold disc
  const pinW  = size * 0.195;   // half-width of pin head
  const pinTY = cy - size * 0.07; // top of pin head centre
  const pinHeadR = pinW * 0.98;
  const pinTipY = cy + size * 0.235; // tip of the teardrop

  // Teardrop shape: circle + converging sides to point
  ctx.beginPath();
  // Top arc (full circle of the head)
  ctx.arc(cx, pinTY, pinHeadR, Math.PI * 0.75, Math.PI * 0.25, false);
  // Right side curves down to tip
  ctx.bezierCurveTo(
    cx + pinHeadR * 1.0, pinTY + pinHeadR * 0.9,
    cx + pinHeadR * 0.35, pinTipY - size * 0.04,
    cx, pinTipY
  );
  // Left side curves up to rejoin
  ctx.bezierCurveTo(
    cx - pinHeadR * 0.35, pinTipY - size * 0.04,
    cx - pinHeadR * 1.0, pinTY + pinHeadR * 0.9,
    cx - pinHeadR * Math.cos(Math.PI * 0.75),
    pinTY - pinHeadR * Math.sin(Math.PI * 0.75)
  );
  ctx.closePath();
  ctx.fillStyle = DARK_BG;
  ctx.fill();

  // Pin inner hole — gold circle creating the classic "O" in the pin
  const holeR = pinHeadR * 0.42;
  const holeGrad = ctx.createRadialGradient(
    cx - holeR * 0.15, pinTY - holeR * 0.2, 0,
    cx, pinTY, holeR
  );
  holeGrad.addColorStop(0, GOLD_LIGHT);
  holeGrad.addColorStop(0.5, GOLD);
  holeGrad.addColorStop(1, GOLD_DARK);
  ctx.beginPath();
  ctx.arc(cx, pinTY, holeR, 0, Math.PI * 2);
  ctx.fillStyle = holeGrad;
  ctx.fill();

  // ── Sparkle / star accents (nightlife vibe) ──────────────────────────
  const sparkles = [
    { x: cx + size * 0.25, y: cy - size * 0.29, r: size * 0.013, opacity: 0.9 },
    { x: cx - size * 0.27, y: cy - size * 0.22, r: size * 0.009, opacity: 0.7 },
    { x: cx + size * 0.29, y: cy + size * 0.18, r: size * 0.011, opacity: 0.75 },
    { x: cx - size * 0.22, y: cy + size * 0.27, r: size * 0.008, opacity: 0.65 },
    { x: cx + size * 0.1,  y: cy - size * 0.34, r: size * 0.007, opacity: 0.6 },
  ];

  sparkles.forEach(s => {
    // Glow halo
    const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.5);
    halo.addColorStop(0, `rgba(253,230,138,${s.opacity * 0.5})`);
    halo.addColorStop(1, 'rgba(253,230,138,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Solid dot
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(253,230,138,${s.opacity})`;
    ctx.fill();
  });
}

// ── 1. Main icon (1024×1024, dark background) ─────────────────────────────
function generateMainIcon() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  drawConnectLogo(ctx, SIZE, true);
  const out = path.join(ASSETS_DIR, 'icon.png');
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log('✅ icon.png generated');
}

// ── 2. Android adaptive icon foreground (transparent BG, pin centred) ────────
//    Android will composite this over the solid dark BG set in app.json
function generateAdaptiveIcon() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // NO background fill — transparent
  // But the foreground needs a glow disc so it looks good on dark BG
  drawConnectLogo(ctx, SIZE, false); // false = skip background fill

  const out = path.join(ASSETS_DIR, 'adaptive-icon.png');
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log('✅ adaptive-icon.png generated');
}

// ── 3. Splash screen icon (centred on dark BG, slightly smaller) ──────────
function generateSplashIcon() {
  const SPLASH = 1284; // tall canvas
  const canvas = createCanvas(SPLASH, SPLASH);
  const ctx = canvas.getContext('2d');

  // Dark BG
  ctx.fillStyle = DARK_BG;
  ctx.fillRect(0, 0, SPLASH, SPLASH);

  // Draw logo at 55% of canvas size, centred
  const logoSize = SPLASH * 0.55;
  const offset = (SPLASH - logoSize) / 2;

  // Save/translate/scale so drawConnectLogo draws at the right spot
  ctx.save();
  ctx.translate(offset, offset);
  ctx.scale(logoSize / SIZE, logoSize / SIZE);
  drawConnectLogo(ctx, SIZE, false);
  ctx.restore();

  // "Connect" wordmark below logo
  ctx.fillStyle = GOLD;
  ctx.font = `bold ${SPLASH * 0.062}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Connect', SPLASH / 2, offset + logoSize + SPLASH * 0.075);

  // Tagline
  ctx.fillStyle = 'rgba(253,230,138,0.55)';
  ctx.font = `${SPLASH * 0.028}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText('Discover Lagos', SPLASH / 2, offset + logoSize + SPLASH * 0.135);

  const out = path.join(ASSETS_DIR, 'splash-icon.png');
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log('✅ splash-icon.png generated');
}

// ── 4. Favicon (256×256) ──────────────────────────────────────────────────
function generateFavicon() {
  const FAV = 256;
  const canvas = createCanvas(FAV, FAV);
  const ctx = canvas.getContext('2d');
  drawConnectLogo(ctx, FAV, true);
  const out = path.join(ASSETS_DIR, 'favicon.png');
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log('✅ favicon.png generated');
}

// Run all
console.log('Generating Connect app icons...\n');
generateMainIcon();
generateAdaptiveIcon();
generateSplashIcon();
generateFavicon();
console.log('\nAll icons generated successfully!');
console.log(`Output directory: ${ASSETS_DIR}`);
