const { app, BrowserWindow, ipcMain, globalShortcut, screen, dialog, nativeImage, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// ─── Constants ────────────────────────────────────────────────────────────────
const IS_MAC = process.platform === 'darwin';
const SETTINGS_FILE = 'crosshair-settings.json';
const WALLPAPER_DIR = 'wallpapers';
const MAX_WALLPAPER_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_WALLPAPER_DIM = 1920;
const SAVE_DEBOUNCE_MS = 500;

// ─── Native overlay behavior (macOS fullscreen Spaces) ────────────────────────
// macOS-only Node addon (node-addon-api, Objective-C++):
// sets NSWindowCollectionBehaviorCanJoinAllSpaces |
// NSWindowCollectionBehaviorFullScreenAuxiliary |
// NSWindowCollectionBehaviorStationary (= 273, exact assignment), window level
// just above screen-saver level, plus setHidesOnDeactivate:NO / setCanHide:NO.
// Recipe proven by v1.0.0 (pure Electron, visible over ANY fullscreen app):
// setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }) + hidden dock.
// Since macOS 10.14 Apple disallows windows of dock apps from floating above
// fullscreen Spaces, so the dock MUST stay hidden (see app.whenReady below).
// On Windows/Linux the require() fails gracefully and overlayUtils stays null.
// IMPORTANT: AppKit forbids combining NSWindowCollectionBehaviorCanJoinAllSpaces
// (1) with NSWindowCollectionBehaviorMoveToActiveSpace (2) —
// -[NSWindow _validateCollectionBehavior:] throws NSInternalInconsistencyException.
// So bit 2 must NEVER be set anywhere. The native addon runs LAST and owns the
// final collection-behavior bits.
let overlayUtils = null;
try {
  overlayUtils = require(path.join(__dirname, '..', '..', 'native', 'overlay-utils', 'build', 'Release', 'overlay-utils.node'));
  console.log('[overlay] native addon loaded');
} catch (e) {
  console.warn('[overlay] native addon NOT loaded, fullscreen behavior will be degraded:', e.message);
}

function applyNativeOverlayBehavior(win) {
  if (!IS_MAC || !overlayUtils || !win || win.isDestroyed()) return;
  try {
    const handle = win.getNativeWindowHandle();
    // handle is a Buffer containing a pointer. Pass the Buffer straight
    // through when possible (native side reads the pointer itself), which
    // works on both x64 and arm64. Fall back to BigInt for older builds.
    if (Buffer.isBuffer(handle)) {
      try {
        overlayUtils.setOverlayBehavior(handle);
        return;
      } catch { }
    }
    const ptr = handle.length >= 8
      ? handle.readBigUInt64LE(0)
      : BigInt(handle.readUInt32LE(0));
    overlayUtils.setOverlayBehavior(ptr);
  } catch (e) {
    console.warn('Native overlay behavior failed:', e.message);
  }
}

function getOverlayInfo() {
  if (!IS_MAC || !overlayUtils || !overlayWindow || overlayWindow.isDestroyed()) return null;
  try {
    const handle = overlayWindow.getNativeWindowHandle();
    if (Buffer.isBuffer(handle)) {
      try {
        return overlayUtils.getOverlayInfo(handle);
      } catch { }
    }
    const ptr = handle.length >= 8
      ? handle.readBigUInt64LE(0)
      : BigInt(handle.readUInt32LE(0));
    return overlayUtils.getOverlayInfo(ptr);
  } catch {
    return null;
  }
}

function logOverlayInfo(tag) {
  if (!IS_MAC || !overlayUtils) return;
  try {
    const info = getOverlayInfo();
    if (info) {
      let extra = '';
      try {
        const b = overlayWindow.getBounds();
        extra = ` visible=${overlayWindow.isVisible()} bounds=${b.x},${b.y} ${b.width}x${b.height}`;
      } catch { }
      console.log(`[overlay:${tag}] behavior=${info.behavior} level=${info.level} hidesOnDeactivate=${info.hidesOnDeactivate} canHide=${info.canHide}${extra}`);
    }
  } catch { }
}

// ─── Project Paths ────────────────────────────────────────────────────────────
// Layout: src/main/main.js → repo root = ../../ dari __dirname
const ROOT_DIR = path.join(__dirname, '..', '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const PRELOAD_FILE = path.join(__dirname, '..', 'preload', 'preload.js');
const OVERLAY_HTML = path.join(__dirname, '..', 'overlay', 'overlay.html');
const SETTINGS_HTML = path.join(__dirname, '..', 'settings', 'settings.html');

// ─── Paths ────────────────────────────────────────────────────────────────────
let settingsPath;
let userWallpaperDir;

function initPaths() {
  const userDataDir = app.getPath('userData');
  settingsPath = path.join(userDataDir, SETTINGS_FILE);
  userWallpaperDir = path.join(userDataDir, WALLPAPER_DIR);
  if (!fs.existsSync(userWallpaperDir)) {
    fs.mkdirSync(userWallpaperDir, { recursive: true });
  }
}

// ─── Default Settings (schemaVersion 2) ───────────────────────────────────────
function platformHotkeyDefaults() {
  if (IS_MAC) {
    return { toggleSettings: 'CommandOrControl+Shift+S', toggleOverlay: 'CommandOrControl+Shift+X' };
  }
  return { toggleSettings: 'F7', toggleOverlay: 'F8' };
}

const defaultBuiltInPresets = [
  {
    id: 'preset-cyan-cross',
    name: 'Default (Cyan Cross)',
    builtIn: true,
    data: { shape: 'cross', size: 24, sizeX: 24, sizeY: 24, unlinkSize: false, rotation: 0, thickness: 2, gap: 4, opacity: 100, color: '#00ffcc', arms: { top: true, left: true, right: true, bottom: true }, outline: { enabled: true, width: 1, color: '#000000', opacity: 100 }, centerDot: { enabled: false, size: 4, opacity: 100 }, outerLines: { enabled: false, size: 4, thickness: 2, gap: 10, opacity: 50 } }
  },
  {
    id: 'preset-val-bracket',
    name: 'Valorant Dual-Layer (Brackets)',
    builtIn: true,
    data: { shape: 'cross', size: 6, sizeX: 6, sizeY: 6, unlinkSize: false, rotation: 0, thickness: 2, gap: 2, opacity: 100, color: '#00ffcc', arms: { top: true, left: true, right: true, bottom: true }, outline: { enabled: true, width: 1, color: '#000000', opacity: 80 }, centerDot: { enabled: true, size: 2, opacity: 100 }, outerLines: { enabled: true, size: 3, thickness: 2, gap: 8, opacity: 45 } }
  },
  {
    id: 'preset-x-cross',
    name: 'X-Cross Tactical (45°)',
    builtIn: true,
    data: { shape: 'cross', size: 16, sizeX: 16, sizeY: 16, unlinkSize: false, rotation: 45, thickness: 2, gap: 3, opacity: 100, color: '#ff3366', arms: { top: true, left: true, right: true, bottom: true }, outline: { enabled: true, width: 1, color: '#000000', opacity: 100 }, centerDot: { enabled: false, size: 4, opacity: 100 }, outerLines: { enabled: false, size: 4, thickness: 2, gap: 10, opacity: 50 } }
  },
  {
    id: 'preset-dot-green',
    name: 'Precision Dot (Green)',
    builtIn: true,
    data: { shape: 'dot', size: 6, sizeX: 6, sizeY: 6, unlinkSize: false, rotation: 0, thickness: 2, gap: 0, opacity: 100, color: '#00ff66', arms: { top: true, left: true, right: true, bottom: true }, outline: { enabled: true, width: 1, color: '#000000', opacity: 100 }, centerDot: { enabled: false, size: 4, opacity: 100 }, outerLines: { enabled: false, size: 4, thickness: 2, gap: 10, opacity: 50 } }
  },
  {
    id: 'preset-circle-red',
    name: 'Circle Scope (Red)',
    builtIn: true,
    data: { shape: 'circle', size: 18, sizeX: 18, sizeY: 18, unlinkSize: false, rotation: 0, thickness: 2, gap: 0, opacity: 95, color: '#ff3366', arms: { top: true, left: true, right: true, bottom: true }, outline: { enabled: true, width: 1, color: '#000000', opacity: 100 }, centerDot: { enabled: true, size: 3, opacity: 100 }, outerLines: { enabled: false, size: 4, thickness: 2, gap: 10, opacity: 50 } }
  },
  {
    id: 'preset-cs-tight',
    name: 'CS Pro Tight (Lime)',
    builtIn: true,
    data: { shape: 'cross', size: 14, sizeX: 14, sizeY: 14, unlinkSize: false, rotation: 0, thickness: 2, gap: 2, opacity: 100, color: '#22c55e', arms: { top: true, left: true, right: true, bottom: true }, outline: { enabled: false, width: 1, color: '#000000', opacity: 100 }, centerDot: { enabled: false, size: 4, opacity: 100 }, outerLines: { enabled: false, size: 4, thickness: 2, gap: 10, opacity: 50 } }
  },
  {
    id: 'preset-t-tactical',
    name: 'T-Shape Tactical (Yellow)',
    builtIn: true,
    data: { shape: 't-shape', size: 20, sizeX: 20, sizeY: 20, unlinkSize: false, rotation: 0, thickness: 2, gap: 4, opacity: 100, color: '#eab308', arms: { top: false, left: true, right: true, bottom: true }, outline: { enabled: true, width: 1, color: '#000000', opacity: 100 }, centerDot: { enabled: false, size: 4, opacity: 100 }, outerLines: { enabled: false, size: 4, thickness: 2, gap: 10, opacity: 50 } }
  }
];

const defaultSettings = {
  schemaVersion: 2,
  overlayEnabled: true,
  shape: 'cross',
  size: 24,
  sizeX: 24,
  sizeY: 24,
  unlinkSize: false,
  rotation: 0,
  thickness: 2,
  gap: 4,
  opacity: 100,
  color: '#00ffcc',
  arms: { top: true, left: true, right: true, bottom: true },
  outline: { enabled: true, width: 1, color: '#000000', opacity: 100 },
  centerDot: { enabled: false, size: 4, opacity: 100 },
  outerLines: { enabled: false, size: 4, thickness: 2, gap: 10, opacity: 50 },
  offset: { x: 0, y: 0 },
  monitorId: '',
  hotkeys: platformHotkeyDefaults(),
  wallpaper: { source: 'dark', blur: 0, dim: 0 },
  presets: [...defaultBuiltInPresets]
};

// ─── State ────────────────────────────────────────────────────────────────────
let settings = null;
let overlayWindow = null;
let settingsWindow = null;
let trayIcon = null;
let isQuitting = false;
let saveDebounceTimer = null;
let isFirstRun = false;

// ─── Settings Persistence ─────────────────────────────────────────────────────
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      typeof target[key] === 'object' &&
      target[key] !== null
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function migrateSettings(loaded) {
  // Already v2
  if (loaded.schemaVersion === 2) {
    // Deep merge with defaults to fill any missing keys
    const merged = deepMerge(defaultSettings, loaded);
    // Ensure presets list has built-ins and preserves user custom presets
    if (Array.isArray(loaded.presets) && loaded.presets.length > 0) {
      const userPresets = loaded.presets.filter(p => !p.builtIn);
      merged.presets = [...defaultBuiltInPresets, ...userPresets];
    } else {
      merged.presets = [...defaultBuiltInPresets];
    }
    // Strip unknown top-level keys
    const clean = {};
    for (const key of Object.keys(defaultSettings)) {
      clean[key] = merged[key];
    }
    return clean;
  }

  // Migrate from v1 (old schema)
  const migrated = { ...defaultSettings };

  // Preserve crosshair values from old schema
  if (loaded.shape) migrated.shape = loaded.shape;
  if (loaded.size !== undefined) migrated.size = Number(loaded.size) || defaultSettings.size;
  if (loaded.thickness !== undefined) migrated.thickness = Number(loaded.thickness) || defaultSettings.thickness;
  if (loaded.gap !== undefined) migrated.gap = Number(loaded.gap) || defaultSettings.gap;
  if (loaded.opacity !== undefined) migrated.opacity = Number(loaded.opacity) || defaultSettings.opacity;
  if (loaded.color) migrated.color = loaded.color;

  // Migrate arms from customShape
  if (loaded.customShape) {
    migrated.arms = {
      top: loaded.customShape.top !== false,
      left: loaded.customShape.left !== false,
      right: loaded.customShape.right !== false,
      bottom: loaded.customShape.bottom !== false
    };
  }

  // Migrate outline
  if (loaded.outline) {
    migrated.outline = {
      enabled: loaded.outline.enabled !== false,
      width: Number(loaded.outline.thickness || loaded.outline.width) || 1,
      color: loaded.outline.color || '#000000'
    };
  }

  // Migrate center dot
  if (loaded.dot) {
    migrated.centerDot = {
      enabled: !!loaded.dot.enabled,
      size: Number(loaded.dot.size) || 4
    };
  }

  // Migrate offset from position
  if (loaded.position) {
    migrated.offset = {
      x: Number(loaded.position.xOffset) || 0,
      y: Number(loaded.position.yOffset) || 0
    };
  }

  // Migrate monitor
  if (loaded.monitorId) migrated.monitorId = loaded.monitorId;

  // Use platform defaults for hotkeys (ignore old F9/F10 bindings)
  migrated.hotkeys = platformHotkeyDefaults();

  return migrated;
}

function readJsonFileSafe(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  // File kosong / whitespace = corrupt (biasanya bekas write yang kepotong
  // saat app di-quit). Jangan langsung JSON.parse agar error-nya jelas.
  if (!raw || raw.trim().length === 0) {
    throw new Error('Settings file is empty');
  }
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Settings file has invalid shape');
  }
  return parsed;
}

function backupCorruptFile(filePath) {
  try {
    const backupPath = filePath + '.corrupt-' + Date.now();
    fs.copyFileSync(filePath, backupPath);
  } catch { }
}

function tryRestoreFromBak() {
  try {
    const bakPath = settingsPath + '.bak';
    if (!fs.existsSync(bakPath)) return null;
    const parsed = readJsonFileSafe(bakPath);
    return migrateSettings(parsed);
  } catch {
    return null;
  }
}

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      try {
        const loaded = readJsonFileSafe(settingsPath);
        settings = migrateSettings(loaded);
      } catch (parseErr) {
        // File kosong / corrupt: amankan dulu, lalu coba .bak sebelum default.
        console.error('Settings file corrupt (' + parseErr.message + '), trying backup...');
        backupCorruptFile(settingsPath);
        const restored = tryRestoreFromBak();
        if (restored) {
          console.error('Settings restored from .bak');
          settings = restored;
        } else {
          throw parseErr;
        }
      }
    } else {
      isFirstRun = true;
      settings = { ...defaultSettings, hotkeys: platformHotkeyDefaults() };
    }
  } catch (err) {
    console.error('Error loading settings, using defaults:', err.message);
    settings = { ...defaultSettings, hotkeys: platformHotkeyDefaults() };
  }
  // Always ensure schemaVersion is 2
  settings.schemaVersion = 2;
}

// Tulis atomik (tmp + rename) agar file tidak pernah 0-byte walau app
// di-quit paksa tepat saat menulis.
function atomicWriteJsonSync(filePath, data) {
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, data, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function refreshBakFile() {
  try {
    if (fs.existsSync(settingsPath)) {
      // Hanya jadikan .bak kalau file saat ini valid
      readJsonFileSafe(settingsPath);
      fs.copyFileSync(settingsPath, settingsPath + '.bak');
    }
  } catch { }
}

function saveSettingsDebounced(delay = SAVE_DEBOUNCE_MS) {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    try {
      refreshBakFile();
      atomicWriteJsonSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (err) {
      console.error('Error saving settings:', err.message);
    }
    saveDebounceTimer = null;
  }, delay);
}

function flushSettingsSync() {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  try {
    refreshBakFile();
    atomicWriteJsonSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Error flushing settings:', err.message);
  }
}

// ─── Settings Broadcast ───────────────────────────────────────────────────────
function broadcastSettingsUpdate(excludeWindow = null) {
  if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow !== excludeWindow) {
    overlayWindow.webContents.send('settings-updated', settings);
  }
  if (settingsWindow && !settingsWindow.isDestroyed() && settingsWindow !== excludeWindow) {
    settingsWindow.webContents.send('settings-updated', settings);
  }
}

// ─── Overlay Geometry ─────────────────────────────────────────────────────────
function getSelectedDisplay() {
  const displays = screen.getAllDisplays();
  let selected = displays.find(d => d.id.toString() === settings.monitorId);
  if (!selected) {
    selected = screen.getPrimaryDisplay();
    settings.monitorId = selected.id.toString();
  }
  return selected;
}



function applyOverlayBounds() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  // Fullscreen-display overlay: window menutupi 1 display penuh (click-through).
  // Jauh lebih andal di atas game fullscreen dibanding tiny-window di tengah,
  // karena tidak bisa tergeser / ter-clip saat game ganti resolusi.
  const display = getSelectedDisplay();
  const { x, y, width, height } = display.bounds;

  try {
    overlayWindow.setBounds({ x, y, width, height });
  } catch { }
  try {
    overlayWindow.webContents.send('display-updated', { width, height });
  } catch { }
}

// ─── Overlay Window ───────────────────────────────────────────────────────────
// Helper terpusat: urutan PENTING untuk fullscreen (resep v1.0.0 yang terbukti
// tembus SEMUA fullscreen app + screenshot).
// macOS:
//  1. setAlwaysOnTop('screen-saver', 1) → level 1001.
//  2. setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }) → bit
//     CanJoinAllSpaces|FullScreenAuxiliary + DockHide. DockHide WAJIB: sejak
//     macOS 10.14 window milik dock app dilarang float di atas fullscreen Space
//     (lihat komentar di Electron: native_window_mac.mm SetVisibleOnAllWorkspaces).
//     Dipanggil di sini + sebelum show pertama (Electron me-reset flag saat show).
//  3. Native addon TERAKHIR → behavior final persis 273, level 1001, no-hide.
// JANGAN pernah set bit MoveToActiveSpace (2): 1|2 = crash
// NSInternalInconsistencyException.
// Windows: re-assert alwaysOnTop + moveTop agar tidak tenggelam di belakang
// game borderless fullscreen.

function ensureOverlayOnTop() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  try {
    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    if (IS_MAC) {
      overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      overlayWindow.setFullScreenable(false);
      applyNativeOverlayBehavior(overlayWindow);
      if (typeof overlayWindow.setWindowButtonVisibility === 'function') {
        overlayWindow.setWindowButtonVisibility(false);
      }
    } else {
      // Windows: paksa ke depan tanpa mencuri fokus (topmost Z-order)
      if (typeof overlayWindow.moveTop === 'function') {
        overlayWindow.moveTop();
      }
    }
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.setSkipTaskbar(true);
  } catch { }
}

function showOverlayWindow() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  applyOverlayBounds();
  ensureOverlayOnTop();
  // showInactive = tampil tanpa mencuri fokus game
  overlayWindow.showInactive();
  // Re-assert setelah show (macOS kadang reset flag saat show)
  ensureOverlayOnTop();
  applyNativeOverlayBehavior(overlayWindow);
  logOverlayInfo('show');
}

function hideOverlayWindow() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  overlayWindow.hide();
}

function createOverlayWindow() {
  const display = getSelectedDisplay();
  const { x, y, width, height } = display.bounds;

  overlayWindow = new BrowserWindow({
    x, y, width, height,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    show: false,
    enableLargerThanScreen: true,
    thickFrame: false,
    paintWhenInitiallyHidden: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: PRELOAD_FILE,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      offscreen: false,
      enablePreferredSizeMode: false,
      spellcheck: false,
      images: false,
      javascript: true,
      plugins: false
    }
  });

  overlayWindow.loadFile(OVERLAY_HTML);
  ensureOverlayOnTop();

  overlayWindow.on('closed', () => { overlayWindow = null; });

  overlayWindow.once('ready-to-show', () => {
    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    if (IS_MAC) {
      // HARUS sebelum showInactive pertama (Electron me-reset flag saat show).
      overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      overlayWindow.setFullScreenable(false);
      // Prevent the window from being added to any fullscreen group
      overlayWindow.setWindowButtonVisibility(false);
    }
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    applyOverlayBounds();
    overlayWindow.webContents.send('settings-updated', settings);
    setTimeout(() => {
      if (overlayWindow && !overlayWindow.isDestroyed() && settings.overlayEnabled) {
        overlayWindow.showInactive();
        ensureOverlayOnTop();
        applyNativeOverlayBehavior(overlayWindow);
      }
    }, 150);
  });
}

function toggleOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  if (settings.overlayEnabled) {
    hideOverlayWindow();
    settings.overlayEnabled = false;
  } else {
    settings.overlayEnabled = true;
    showOverlayWindow();
  }
  saveSettingsDebounced();
  broadcastSettingsUpdate();
}

// ─── Settings Window ──────────────────────────────────────────────────────────
function createSettingsWindow() {
  const winOptions = {
    width: 880,
    height: 560,
    minWidth: 780,
    minHeight: 500,
    icon: getTransparentIconPath() || path.join(ASSETS_DIR, 'app-icon.png'),
    transparent: !IS_MAC,
    frame: false,
    resizable: true,
    fullscreenable: true,
    skipTaskbar: false,
    show: false,
    backgroundColor: IS_MAC ? '#09090b' : '#00000000',
    webPreferences: {
      preload: PRELOAD_FILE,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true,
      spellcheck: false
    }
  };

  if (IS_MAC) {
    winOptions.titleBarStyle = 'hidden';
    winOptions.trafficLightPosition = { x: 12, y: 14 };
  }

  settingsWindow = new BrowserWindow(winOptions);
  settingsWindow.loadFile(SETTINGS_HTML);

  settingsWindow.on('close', (e) => {
    if (!isQuitting) {
      // Lazy: hancurkan renderer sepenuhnya, bukan hide — hemat ~40MB
      // saat settings tidak dipakai. Dibuat ulang on-demand via
      // ensureSettingsWindow().
      e.preventDefault();
      destroySettingsWindow();
    }
  });

  settingsWindow.on('closed', () => { settingsWindow = null; });

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.webContents.send('settings-updated', settings);
    settingsWindow.show();
    settingsWindow.setAlwaysOnTop(true, 'floating');
    settingsWindow.focus();
  });
}

// Lazy lifecycle: settings renderer hanya hidup saat jendela terbuka.
// Saat ditutup/disembunyikan → destroy (hemat ~40MB + 1 proses). Dibuat
// ulang on-demand. Tidak ada state yang hilang: settings tinggal di main.
function destroySettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    try { settingsWindow.destroy(); } catch { }
  }
  settingsWindow = null;
}

function ensureSettingsWindow() {
  if (!settingsWindow || settingsWindow.isDestroyed()) {
    createSettingsWindow();
  }
  return settingsWindow;
}

function showSettingsWindow() {
  const w = ensureSettingsWindow();
  if (!w || w.isDestroyed()) return;
  w.show();
  w.setAlwaysOnTop(true, 'floating');
  w.focus();
}

function toggleSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed() && settingsWindow.isVisible()) {
    settingsWindow.setAlwaysOnTop(false);
    destroySettingsWindow();
  } else {
    showSettingsWindow();
  }
}

// ─── Hotkey Registration ──────────────────────────────────────────────────────
function registerHotkeys() {
  globalShortcut.unregisterAll();

  const settingsKey = settings.hotkeys?.toggleSettings || platformHotkeyDefaults().toggleSettings;
  const overlayKey = settings.hotkeys?.toggleOverlay || platformHotkeyDefaults().toggleOverlay;

  try {
    const s1 = globalShortcut.register(settingsKey, toggleSettingsWindow);
    if (!s1) console.warn(`Failed to register settings hotkey: ${settingsKey}`);
  } catch (err) {
    console.error('Error registering settings hotkey:', err.message);
  }

  if (overlayKey && overlayKey !== settingsKey) {
    try {
      const s2 = globalShortcut.register(overlayKey, toggleOverlay);
      if (!s2) console.warn(`Failed to register overlay hotkey: ${overlayKey}`);
    } catch (err) {
      console.error('Error registering overlay hotkey:', err.message);
    }
  }

  // Fixed F7 → toggle overlay (permintaan user; jalan di samping hotkey
  // konfigurasi di atas). Guard: jangan double-register kalau user sudah
  // memakai F7 untuk salah satu hotkey konfigurasi.
  if (overlayKey !== 'F7' && settingsKey !== 'F7') {
    try {
      const s3 = globalShortcut.register('F7', toggleOverlay);
      if (!s3) console.warn('Failed to register fixed overlay hotkey: F7');
    } catch (err) {
      console.error('Error registering fixed overlay hotkey:', err.message);
    }
  }
}

// ─── Wallpaper Helpers ────────────────────────────────────────────────────────
function getBundledWallpaperPath(name) {
  const webpPath = path.join(ASSETS_DIR, 'wallpapers', name + '.webp');
  if (fs.existsSync(webpPath)) return webpPath;
  const pngPath = path.join(ASSETS_DIR, 'wallpapers', name + '.png');
  if (fs.existsSync(pngPath)) return pngPath;
  return webpPath;
}

function getUserWallpaperPath(filename) {
  return path.join(userWallpaperDir, filename);
}

function resolveWallpaperPath(source) {
  if (!source) return getBundledWallpaperPath('dark');

  // Check if it's a preset name
  const presetPath = getBundledWallpaperPath(source);
  if (fs.existsSync(presetPath)) return presetPath;

  // Check user wallpapers directory
  const userPath = getUserWallpaperPath(source);
  if (fs.existsSync(userPath)) return userPath;

  // Fallback
  return getBundledWallpaperPath('dark');
}

// ─── System Tray ──────────────────────────────────────────────────────────────
// Centralized hard-quit: flush settings, tear down tray/shortcuts/windows,
// then quit. Fallback to app.exit(0) kalau event loop macet (mis. watchdog
// menahan quit) agar app benar-benar mati, bukan sekadar hide.
function quitApp() {
  if (isQuitting && !overlayWindow && !settingsWindow) {
    try { app.exit(0); } catch { }
    return;
  }
  isQuitting = true;
  try { flushSettingsSync(); } catch { }
  try { globalShortcut.unregisterAll(); } catch { }
  try {
    if (trayIcon) { trayIcon.destroy(); trayIcon = null; }
  } catch { }
  try {
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.destroy();
  } catch { }
  overlayWindow = null;
  try {
    if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.destroy();
  } catch { }
  settingsWindow = null;
  try { app.quit(); } catch { }
  // Safety net: paksa mati kalau app.quit() tidak menyelesaikan quit
  // (mis. ada window yang menahan close). app.exit(0) = kill langsung.
  setTimeout(() => { try { app.exit(0); } catch { } }, 800);
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: settings?.overlayEnabled ? 'Hide Crosshair' : 'Show Crosshair',
      click: () => toggleOverlay()
    },
    {
      label: 'Open Settings',
      click: () => {
        showSettingsWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => quitApp()
    }
  ]);
}

// Transparent PNG preferred: JPEG has no alpha channel and renders as an
// opaque (white) box in the macOS menu bar. Falls back to winter.jpeg only
// for surfaces that expect a full-color square icon (dock, window icon).
function getTransparentIconPath() {
  const pngIcon = path.join(ASSETS_DIR, 'tray-icon.png');
  try {
    if (fs.existsSync(pngIcon)) return pngIcon;
  } catch { }
  return null;
}

function createTray() {
  let trayImage;
  try {
    const pngIcon = getTransparentIconPath();
    if (pngIcon) {
      trayImage = nativeImage.createFromPath(pngIcon);
    } else {
      // No transparent PNG shipped: use the embedded transparent PNG.
      // Never use winter.jpeg here — opaque JPEG = white box artifact.
      trayImage = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAAa/wXXAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAb0lEQVQokWNgGAWDEfz//5+BiYGBgZGBgYGJgYGBiQEFMKKL/f//n4GBgYGJkYGBiQEFMBITZmBkYGBgYkQBjIwMDIwMDAyMjEQBjIwMDIwMDAyMjEQBjIwMDIwMDDRIjMgAAAD//2MA6CKRqTkAAAAASUVORK5CYII='
      );
      if (trayImage.isEmpty()) {
        trayImage = nativeImage.createEmpty();
      }
    }
    if (!trayImage || trayImage.isEmpty()) return;
    // The tray icon on macOS should be a 16x16 PNG with transparency.
    if (IS_MAC) trayImage = trayImage.resize({ width: 16, height: 16 });
  } catch {
    return;
  }

  trayIcon = new Tray(trayImage);
  trayIcon.setToolTip('Crosshair Overlay — by winter aespo');
  trayIcon.setContextMenu(buildTrayMenu());

  trayIcon.on('click', () => {
    trayIcon.setContextMenu(buildTrayMenu());
    if (!IS_MAC) trayIcon.popUpContextMenu();
  });
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

// Single-instance: user yang panik dobel-klik 5x karena "lama" tidak akan
// menumpuk 5 proses yang bikin laptop kentang makin lemot. Instance kedua
// langsung dialihkan ke instance pertama (buka settings).
const gotSingleLock = app.requestSingleInstanceLock();
if (!gotSingleLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    try {
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        showSettingsWindow();
      } else if (overlayWindow && !overlayWindow.isDestroyed()) {
        ensureOverlayOnTop();
      }
    } catch { }
  });
}

// Windows: identity for taskbar/tray/installer grouping (must match appId).
// Without this the installed exe shows a generic icon/group in taskbar.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.haedar.crosshair-overlay');
}

// Disable background throttling for overlay performance
// Overlay is static/event-driven: these keep it responsive without polling,
// while zero-copy + GPU rasterization keep canvas blits off the CPU.
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('disable-gpu-vsync');
// NOTE: enable-gpu-rasterization / enable-oop-rasterization sengaja TIDAK
// dipasang — untuk overlay statis keduanya hanya menambah puluhan MB di
// proses GPU tanpa manfaat (verified: GPU 148MB dengan switch tersebut).

app.whenReady().then(() => {
  // Lower process priority so the OS never prefers our process over the game
  if (process.platform === 'darwin') {
    const { execSync } = require('child_process');
    try {
      execSync(`renice 10 ${process.pid}`);
    } catch { }
  }

  // macOS: dock HARUS disembunyikan (seperti v1.0.0). Sejak macOS 10.14 window
  // milik dock app dilarang float di atas fullscreen Space — tanpa ini overlay
  // tidak akan pernah tembus game fullscreen apapun bit/level-nya.
  // Settings tetap dibuka via hotkey/tray; tray icon tidak terpengaruh.
  if (IS_MAC && app.dock) {
    try {
      app.dock.hide();
    } catch { }
  }

  initPaths();
  loadSettings();
  createOverlayWindow();
  // Settings window TIDAK dibuat saat startup (lazy) — hemat 1 renderer
  // (~40MB) sampai user benar-benar membukanya via hotkey/tray.
  createTray();
  registerHotkeys();

  // First install: langsung buka settings agar user paham app-nya jalan.
  // (Default-nya settings lazy agar hemat ~40MB, tapi first-run tanpa GUI
  // kelihatan seperti "tidak terjadi apa-apa" di Windows.)
  if (isFirstRun) {
    setTimeout(() => {
      try { showSettingsWindow(); } catch { }
    }, 800);
  }

  if (IS_MAC && app.dock) {
    try {
      // Rounded icon (transparent corners) — jangan pakai winter.jpeg yang
      // kotak/opaque. build/icon.png sudah di-rounding ~22.5% + alpha.
      const dockIcon = nativeImage.createFromPath(path.join(ROOT_DIR, 'build', 'icon.png'));
      if (!dockIcon.isEmpty()) {
        app.dock.setIcon(dockIcon);
      }
    } catch { }
  }

  // Multi-monitor event-driven updates
  screen.on('display-metrics-changed', () => {
    applyOverlayBounds();
    if (settings.overlayEnabled) ensureOverlayOnTop();
  });
  screen.on('display-added', () => {
    applyOverlayBounds();
    if (settings.overlayEnabled) ensureOverlayOnTop();
  });
  screen.on('display-removed', () => {
    // If selected monitor was removed, fallback to primary
    const displays = screen.getAllDisplays();
    const found = displays.find(d => d.id.toString() === settings.monitorId);
    if (!found) {
      settings.monitorId = screen.getPrimaryDisplay().id.toString();
      saveSettingsDebounced();
      broadcastSettingsUpdate();
    }
    applyOverlayBounds();
  });

  app.on('activate', () => {
    // macOS: reopen settings on dock icon click (lazy-create)
    showSettingsWindow();
  });

  // ─── Fullscreen watchdog ──────────────────────────────────────────────
  // Game fullscreen (Roblox borderless / Space baru di macOS) bisa
  // menenggelamkan z-order overlay atau mengganti resolusi display.
  // Poll ringan + change-aware: samakan bounds ke display + paksa kembali
  // ke depan HANYA kalau sesuatu benar-benar berubah, tanpa mencuri fokus.
  let lastBoundsKey = '';
  setInterval(() => {
    if (!settings?.overlayEnabled || !overlayWindow || overlayWindow.isDestroyed()) return;
    try {
      const d = getSelectedDisplay().bounds;
      const b = overlayWindow.getBounds();
      const key = `${b.x},${b.y},${b.width},${b.height}`;
      const dkey = `${d.x},${d.y},${d.width},${d.height}`;
      if (key !== dkey) applyOverlayBounds();
      if (!overlayWindow.isVisible()) {
        showOverlayWindow();
      } else if (lastBoundsKey !== dkey) {
        // Selalu re-assert HANYA saat display berubah: isAlwaysOnTop()
        // bisa true tapi tetap ketutup game.
        ensureOverlayOnTop();
        if (!IS_MAC && typeof overlayWindow.moveTop === 'function') {
          overlayWindow.moveTop();
        }
        lastBoundsKey = dkey;
      }
    } catch { }
  }, 2000);
});

app.on('before-quit', () => {
  isQuitting = true;
  flushSettingsSync();
  if (trayIcon) { trayIcon.destroy(); trayIcon = null; }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Standard macOS behavior: don't quit on window close
  if (!IS_MAC) {
    app.quit();
  }
});

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-settings', () => settings);

ipcMain.handle('get-monitors', () => {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map(d => ({
    id: d.id.toString(),
    label: `${d.id === primary.id ? 'Primary — ' : ''}${d.bounds.width}×${d.bounds.height}`,
    bounds: d.bounds,
    scaleFactor: d.scaleFactor
  }));
});

ipcMain.on('update-settings', (event, updated) => {
  const hotkeyChanged =
    settings.hotkeys?.toggleSettings !== updated.hotkeys?.toggleSettings ||
    settings.hotkeys?.toggleOverlay !== updated.hotkeys?.toggleOverlay;
  const monitorChanged = settings.monitorId !== updated.monitorId;
  const overlayToggled = settings.overlayEnabled !== updated.overlayEnabled;

  settings = { ...updated, schemaVersion: 2 };

  const senderWin = event.sender ? BrowserWindow.fromWebContents(event.sender) : null;
  broadcastSettingsUpdate(senderWin);
  saveSettingsDebounced();

  // Fullscreen-display overlay: offset/size hanya butuh redraw (sudah broadcast),
  // hanya monitor yang butuh setBounds ulang.
  if (monitorChanged) {
    applyOverlayBounds();
  }

  if (hotkeyChanged) {
    registerHotkeys();
  }

  if (overlayToggled && overlayWindow && !overlayWindow.isDestroyed()) {
    if (settings.overlayEnabled) {
      showOverlayWindow();
    } else {
      hideOverlayWindow();
    }
  } else if (settings.overlayEnabled && overlayWindow && !overlayWindow.isDestroyed()) {
    // Toggle via switch kadang tidak terdeteksi sebagai overlayToggled karena
    // objek settings dikirim ulang — pastikan z-order selalu benar saat update.
    ensureOverlayOnTop();
    if (!overlayWindow.isVisible()) {
      showOverlayWindow();
    }
  }
});

ipcMain.on('hide-settings', () => {
  destroySettingsWindow();
});

ipcMain.on('minimize-settings', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.minimize();
});

ipcMain.on('maximize-settings', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMaximized()) {
      settingsWindow.unmaximize();
    } else {
      settingsWindow.maximize();
    }
  }
});

ipcMain.handle('is-settings-maximized', () => {
  return settingsWindow && !settingsWindow.isDestroyed() ? settingsWindow.isMaximized() : false;
});

ipcMain.on('quit-app', () => {
  quitApp();
});

// ─── Wallpaper IPC ────────────────────────────────────────────────────────────
ipcMain.handle('get-wallpaper-path', (_event, source) => {
  return resolveWallpaperPath(source);
});

ipcMain.handle('upload-wallpaper', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
  });

  if (result.canceled || result.filePaths.length === 0) return { error: null, filename: null };

  const sourcePath = result.filePaths[0];

  // Check file size
  const stat = fs.statSync(sourcePath);
  if (stat.size > MAX_WALLPAPER_SIZE) {
    return { error: 'File exceeds 10 MB limit.', filename: null };
  }

  // Read and downscale using Electron nativeImage
  try {
    const img = nativeImage.createFromPath(sourcePath);
    if (img.isEmpty()) {
      return { error: 'Not a valid image file.', filename: null };
    }

    const imgSize = img.getSize();
    let resized = img;

    if (imgSize.width > MAX_WALLPAPER_DIM || imgSize.height > MAX_WALLPAPER_DIM) {
      const scale = MAX_WALLPAPER_DIM / Math.max(imgSize.width, imgSize.height);
      const newW = Math.round(imgSize.width * scale);
      const newH = Math.round(imgSize.height * scale);
      resized = img.resize({ width: newW, height: newH, quality: 'good' });
    }

    // Save as PNG (nativeImage doesn't export webp easily)
    const ext = path.extname(sourcePath).toLowerCase();
    const timestamp = Date.now();
    const filename = `custom-${timestamp}${ext === '.webp' ? '.webp' : '.png'}`;
    const destPath = path.join(userWallpaperDir, filename);

    if (ext === '.webp') {
      // For webp just copy the original (already valid and under size)
      fs.copyFileSync(sourcePath, destPath);
    } else {
      const buffer = resized.toPNG();
      fs.writeFileSync(destPath, buffer);
    }

    // ─── Cleanup: keep only the most recent 20 user wallpapers
    try {
      const allFiles = fs.readdirSync(userWallpaperDir)
        .filter(f => f.startsWith('custom-'))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(userWallpaperDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      if (allFiles.length > 20) {
        allFiles.slice(20).forEach(f => {
          try { fs.unlinkSync(path.join(userWallpaperDir, f.name)); } catch { }
        });
      }
    } catch { }

    return { error: null, filename };
  } catch (err) {
    console.error('Error processing wallpaper:', err.message);
    return { error: 'Failed to process image.', filename: null };
  }
});

// ─── Hotkey Capture IPC ───────────────────────────────────────────────────────
// The capture happens in the renderer (keydown listener).
// The renderer sends the captured accelerator string via IPC for validation.
ipcMain.handle('validate-hotkey', (_event, accelerator) => {
  // Try to register temporarily to validate
  try {
    const ok = globalShortcut.register(accelerator, () => { });
    if (ok) {
      globalShortcut.unregister(accelerator);
      return { valid: true };
    }
    return { valid: false, reason: 'Hotkey not available' };
  } catch (err) {
    return { valid: false, reason: err.message };
  }
});
