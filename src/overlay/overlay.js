const canvas = document.getElementById('crosshair-canvas');
// Write-only canvas: we never read pixels back, so willReadFrequently:false
// keeps the backing store GPU-friendly.
const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });

let settings = {};
let width = window.innerWidth || 200;
let height = window.innerHeight || 200;

  // ─── Offscreen cache ────────────────────────────────────────────────────
  // Crosshair is static: full drawCrosshair() path runs ONLY on settings
  // change. Resize / display updates only blit the cached bitmap (one
  // drawImage), so idle CPU is zero — no rAF, no setInterval, no polling.
  let cachedCanvas = null;
  let cachedCssSize = 0;
  let cachedSettings = null;
  let displayDebounce = null;
  
  // Selective cache invalidation: which properties change shape geometry?
  const GEOMETRY_KEYS = new Set([
    'shape', 'size', 'sizeX', 'sizeY', 'unlinkSize', 'rotation',
    'thickness', 'gap', 'cornerRadius', 'arms',
    'outline.enabled', 'outline.width',
    'centerDot.enabled', 'centerDot.size',
    'outerLines.enabled', 'outerLines.size', 'outerLines.thickness', 'outerLines.gap'
  ]);
  
  // Opacity-only changes don't require cache rebuild
  const OPACITY_KEYS = new Set([
    'opacity', 'outline.opacity', 'centerDot.opacity', 'outerLines.opacity'
  ]);
  
  // Color-only changes need cache rebuild (affects fills/strokes)
  const COLOR_KEYS = new Set([
    'color', 'outline.color', 'outerLines.color'
  ]);

// Mirror of main.js getOverlayWindowSize(): minimal square that fits the
// crosshair at any rotation, so the cache stays small (<600px).
function getCacheSize(s) {
  const size = Number(s.size) || 24;
  const sizeX = Number(s.sizeX) || size;
  const sizeY = Number(s.sizeY) || size;
  const maxArm = Math.max(size, sizeX, sizeY);
  const gap = Number(s.gap) || 0;
  const thickness = Number(s.thickness) || 2;
  const outlineWidth = s.outline?.enabled ? (Number(s.outline.width) || 1) : 0;
  const dotSize = s.centerDot?.enabled ? (Number(s.centerDot.size) || 4) : 0;
  const outerGap = s.outerLines?.enabled ? (Number(s.outerLines.gap) || 0) : 0;
  const outerSize = s.outerLines?.enabled ? (Number(s.outerLines.size) || 0) : 0;

  const lineRadius = maxArm + gap + (thickness / 2) + outlineWidth;
  const outerRadius = s.outerLines?.enabled
    ? outerGap + outerSize + (Number(s.outerLines.thickness) || 2) / 2 + outlineWidth
    : 0;
  const dotRadius = (dotSize / 2) + outlineWidth;
  const rotation = Math.abs(Number(s.rotation) || 0) % 90;
  const diagBoost = rotation === 45 ? 1.42 : rotation === 0 ? 1 : 1.2;
  const maxRadius = Math.max(lineRadius, dotRadius, outerRadius) * diagBoost;

  const calculated = Math.ceil(maxRadius * 2) + 16;
  const finalSize = calculated % 2 === 0 ? calculated : calculated + 1;
  return Math.min(600, Math.max(40, finalSize));
}

function makeCacheCanvas(cssSize) {
  const dpr = window.devicePixelRatio || 1;
  const px = Math.round(cssSize * dpr);
  let c;
  if (typeof OffscreenCanvas !== 'undefined') {
    c = new OffscreenCanvas(px, px);
  } else {
    c = document.createElement('canvas');
    c.width = px;
    c.height = px;
  }
  return { canvas: c, dpr };
}

function rebuildCache(s) {
  const cssSize = getCacheSize(s || {});
  const { canvas: c, dpr } = makeCacheCanvas(cssSize);
  const octx = c.getContext('2d', { alpha: true });
  if (!octx) {
    cachedCanvas = null;
    cachedCssSize = 0;
    cachedSettings = s;
    return;
  }
  octx.resetTransform?.();
  octx.scale(dpr, dpr);
  octx.clearRect(0, 0, cssSize, cssSize);
  if (typeof window.drawCrosshair === 'function') {
    window.drawCrosshair(octx, cssSize / 2, cssSize / 2, s);
  }
  cachedCanvas = c;
  cachedCssSize = cssSize;
  cachedSettings = s;
}

function draw() {
  if (!ctx || !settings || Object.keys(settings).length === 0) return;

  ctx.clearRect(0, 0, width, height);
  if (!cachedCanvas) return;
  // Fullscreen-display overlay: cached bitmap blitted at screen center +
  // user offset (DIP / CSS px). No full re-draw here.
  const ox = (width - cachedCssSize) / 2 + (Number(settings.offset?.x) || 0);
  const oy = (height - cachedCssSize) / 2 + (Number(settings.offset?.y) || 0);
  ctx.drawImage(cachedCanvas, ox, oy, cachedCssSize, cachedCssSize);
}

function resizeCanvas() {
  width = window.innerWidth || 200;
  height = window.innerHeight || 200;

  const dpr = window.devicePixelRatio || 1;

  // Display size
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  // Backing store size
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  // Resize path: blit only, never rebuild cache.
  draw();
}

window.addEventListener('resize', resizeCanvas);

// Setup IPC listeners from main process — event-driven only.
// No requestAnimationFrame, no setInterval, no polling loop anywhere.
if (window.api) {
  window.api.getSettings().then(loadedSettings => {
    if (loadedSettings) {
      settings = loadedSettings;
      rebuildCache(settings);
      resizeCanvas();
    }
  });

  window.api.onSettingsUpdated(updatedSettings => {
    if (updatedSettings) {
      settings = updatedSettings;
      rebuildCache(settings);
      draw();
    }
  });

  window.api.onDisplayUpdated(() => {
    // One-shot settle delay (not a loop): window bounds may lag main's
    // setBounds by a frame after display/monitor changes.
    if (displayDebounce) clearTimeout(displayDebounce);
    displayDebounce = setTimeout(() => {
      displayDebounce = null;
      resizeCanvas();
    }, 50);
  });
}

// Initial sizing
resizeCanvas();
