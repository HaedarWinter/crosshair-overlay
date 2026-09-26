# Crosshair Overlay v2.0

A lightweight, zero-latency desktop crosshair overlay for borderless and windowed games on **macOS** and **Windows**.

---

## Features

### Core Functionality
- **Shapes**: Cross, Dot, Circle, Box, and T-Shape with independent arm toggles
- **Precision Controls**: Size, thickness, gap, opacity, rotation (0°/45°/90°/135°), and corner radius
- **Color System**: Hex input + native color picker with quick-access palette swatches
- **High Contrast**: Configurable outer outline (width, color, opacity) and center dot for visibility in any scene
- **Outer Lines**: Optional bracket-style dual-layer crosshair (size, thickness, gap, opacity)

### Customization & Preview
- **Live Preview Studio**: Test crosshairs against 6 preset wallpapers or upload custom images (PNG/JPG/WebP, max 10MB)
- **Wallpaper Filters**: Blur (0-24px) and dim (0-80%) controls to simulate various game environments
- **Zoom Modes**: 1×, 2×, 4× magnification for precision tuning
- **Preset System**: Save and load custom crosshair configurations with built-in presets (Valorant, CS, Tactical)
- **Import/Export**: Share crosshair codes via base64 encoding

### Multi-Monitor & Positioning
- **Display Selection**: Choose target monitor from dropdown
- **Fine Offsets**: X/Y pixel offset (-200 to +200) with instant "Center" reset button
- **Auto-Fallback**: Automatically switches to primary display if configured monitor is disconnected

### Performance & UX
- **Ultra Lightweight**: Pure 2D canvas rendering with offscreen caching — strictly event-driven with **0% idle CPU usage**
- **Zero Native Modules**: Pure Electron + optional macOS native addon for fullscreen Spaces support (no Windows dependencies)
- **Instant Updates**: All settings changes reflect immediately in both preview and overlay without restart
- **Smart Persistence**: Settings auto-save with 500ms debounce, stored as JSON in `userData`

---

## Tech Stack

### Core Technologies
- **Runtime**: [Electron](https://www.electronjs.org/) v30.5.1
- **Language**: Vanilla JavaScript (ES2020+), no frameworks or transpilation
- **Rendering**: HTML5 Canvas 2D API with `getContext('2d', { willReadFrequently: false })` for GPU optimization
- **UI**: Custom CSS3 (Zinc dark theme, shadcn/ui inspired) + [Lucide](https://lucide.dev/) SVG icons (inline, no CDN)
- **Typography**: [Geist](https://vercel.com/font) variable font (local woff2, system-ui fallback)

### Architecture
```
Electron Main Process (src/main/main.js)
├── Overlay Window        → overlay.html + overlay.js
│   ├── Frameless, click-through (setIgnoreMouseEvents)
│   ├── Always-on-top, visible on all workspaces (macOS Spaces)
│   ├── Static canvas (no animation loop, event-driven only)
│   └── Auto-sized to crosshair bounds + outline + offset
│
├── Settings Window       → settings.html + settings.css + settings.js
│   ├── Frameless 880×620 with custom titlebar
│   ├── Three tabs: Crosshair / Display & Hotkeys / Appearance
│   ├── Live preview canvas (shared draw function with overlay)
│   └── IPC throttled (33ms minimum interval for slider updates)
│
├── Shared Render Logic   → shared/draw-crosshair.js
│   └── Single source of truth for crosshair geometry (overlay + preview)
│
├── Settings Persistence  → crosshair-settings.json
│   ├── Location: app.getPath('userData')/crosshair-settings.json
│   ├── Schema v2 with migration from v1 (legacy key cleanup)
│   └── Debounced writes (500ms) to minimize disk I/O
│
└── Wallpaper Management
    ├── Bundled presets: assets/wallpapers/*.webp (6 curated scenes)
    └── User uploads: userData/wallpapers/ (auto-downscaled to 1920px max)
```

### Native Components (macOS Only)
- **Optional Addon**: `native/overlay-utils` (Node-API + Objective-C++)
  - Sets `NSWindowCollectionBehavior` flags (273: CanJoinAllSpaces + FullScreenAuxiliary + Stationary)
  - Elevates window level to `CGShieldingWindowLevel() + 1` (above screen saver)
  - Disables `hidesOnDeactivate` and `canHide` for persistent overlay
  - Enables overlay visibility over fullscreen games in macOS Spaces
- **Fallback**: Pure Electron `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` if addon fails to load
- **Windows**: No native dependencies, uses `setAlwaysOnTop(true)` + `setSkipTaskbar(true)`

### Build Pipeline
- **Packager**: [electron-builder](https://www.electron.build/) v24.13.3
- **Targets**:
  - macOS: DMG + ZIP (Apple Silicon arm64, unsigned)
  - Windows: NSIS installer + Portable EXE (x64, unsigned)
- **Compression**: Normal ASAR with unpack for native addon
- **CI**: GitHub Actions workflow for automated Windows builds on `windows-latest`

---

## Default Shortcuts

| Action | macOS | Windows |
|---|---|---|
| **Toggle Settings** | <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | <kbd>F7</kbd> |
| **Toggle Overlay** | <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd> | <kbd>F8</kbd> |

*Both shortcuts are fully rebindable in the **Display & Hotkeys** tab. Validation prevents duplicate bindings and ensures modifier keys on macOS.*

---

## Development & Building

### Prerequisites
- **Node.js**: v18+ (tested on v20.11.0)
- **npm**: v9+ (bundled with Node.js)
- **macOS only**: Xcode Command Line Tools for native addon build

### Setup
```bash
# Clone repository
git clone https://github.com/yourusername/crosshair-overlay.git
cd crosshair-overlay

# Install dependencies
npm install

# Run in development mode
npm start
```

### Build Commands
```bash
# macOS
npm run build:mac      # DMG and ZIP (arm64)
npm run build:mac:dmg  # DMG only
npm run build:mac:zip  # ZIP only

# Windows
npm run build:win      # NSIS installer + Portable EXE (x64)
npm run dist:win       # Alias for build:win
```

### Project Structure
```
crosshair-overlay/
├── src/
│   ├── main/
│   │   └── main.js              # Electron main process, IPC handlers, window management
│   ├── settings/
│   │   ├── settings.html        # Settings window markup
│   │   ├── settings.css         # Zinc dark theme, shadcn-inspired
│   │   └── settings.js          # UI logic, preset system, slider bindings
│   ├── overlay/
│   │   ├── overlay.html         # Minimal overlay window
│   │   └── overlay.js           # Canvas render loop (event-driven only)
│   ├── shared/
│   │   └── draw-crosshair.js    # Crosshair geometry renderer (shared)
│   └── preload/
│       └── preload.js           # Electron contextBridge API
├── assets/
│   ├── wallpapers/              # 6 bundled WebP presets (dark, field, sky, city, interior, black)
│   ├── fonts/
│   │   └── GeistVF.woff2        # Vercel Geist variable font
│   └── app-icon.png             # Application icon (macOS/Windows)
├── native/
│   └── overlay-utils/           # macOS native addon (Node-API)
├── docs/
│   └── prd.md                   # Product Requirements Document (v2.0 rewrite spec)
└── package.json                 # Electron v30, electron-builder config
```

---

## Platform Tips

### Game Compatibility
- **Recommended Mode**: Run games in **Borderless Windowed** mode for optimal overlay visibility
- **Exclusive Fullscreen**: Overlay may not be visible in exclusive fullscreen mode (DirectX/Vulkan exclusive contexts)
- **Anti-Cheat**: This is a pure overlay (no injection, no game process interaction). Compatible with most anti-cheat systems, but use at your own discretion.

### macOS
- **First Run**: Grant Accessibility/Screen Recording permissions if prompted (System Settings → Privacy & Security)
- **Fullscreen Spaces**: The overlay displays across all desktop spaces and fullscreen games via native NSWindow behavior
- **Hidden Dock**: The app uses `app.dock.hide()` to enable floating above fullscreen spaces (Apple's macOS 10.14+ requirement)
- **Code Signing**: Unsigned builds will show Gatekeeper warnings. Control-click → Open to bypass on first launch.

### Windows
- **SmartScreen**: Unsigned binaries trigger Windows Defender SmartScreen. Click **More info** → **Run anyway**.
- **Firewall**: No network access required. The app does not make outbound connections (no telemetry, no updates).
- **Portable Mode**: The portable EXE stores settings in `%APPDATA%\crosshair-overlay`, same as the installer version.

---

## Known Issues & Limitations

- **Exclusive Fullscreen**: Overlay not visible in games using exclusive fullscreen mode (hardware limitation, not a bug)
- **macOS Native Addon**: If build fails, overlay still works with pure Electron behavior (degraded fullscreen Spaces support)
- **High-DPI Scaling**: Canvas rendering respects `devicePixelRatio` but some Windows scaling configurations may cause blurriness
- **Multi-Monitor DPI**: Mixed DPI setups (e.g., 4K + 1080p) may require manual offset adjustment

---

## FAQ

**Q: Why does my antivirus flag the .exe?**  
A: Unsigned Electron apps often trigger heuristic detection. The source code is public and auditable. Add an exception or build from source.

**Q: Can I use this in competitive games?**  
A: This is a display overlay with no game interaction. It's not considered cheating by most communities, but check your game's specific ToS.

**Q: Does this work on Linux?**  
A: Not officially supported. The codebase is cross-platform compatible, but no builds are provided. You can try `npm start` on Linux.

**Q: How do I reset to default settings?**  
A: Close the app, delete `crosshair-settings.json` from `app.getPath('userData')`, then relaunch.

**Q: Why is the overlay not visible over my game?**  
A: Ensure the game is in Borderless Windowed mode. Exclusive fullscreen bypasses OS window compositing.

---

## License & Credits

- **License**: MIT License (see [LICENSE](LICENSE) file)
- **Author**: Haedar
- **Built With**: [Electron](https://www.electronjs.org/), [Geist Font](https://vercel.com/font), [Lucide Icons](https://lucide.dev/)
- **Inspiration**: Built for high-performance, distraction-free gaming.

---

## Contributing

Contributions welcome! This is a focused, single-purpose tool. Feature requests should align with the core goal: **zero-latency crosshair overlay with minimal resource usage**.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -m 'Add some feature'`)
4. Push to branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

**Version**: 2.0.0  
**Last Updated**: 2026-09-26
