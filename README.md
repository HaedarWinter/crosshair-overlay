# Crosshair Overlay v2.0

A lightweight, zero-latency desktop crosshair overlay for borderless and windowed games on **macOS** and **Windows**.

## Features

- **Shapes**: Cross, Dot, Circle, and T-Shape with independent arm toggles.
- **Customization**: Precision sliders for size, thickness, gap, opacity, and color palette.
- **High Contrast**: Outer outline and focal center dot for visibility in any scene.
- **Preview Studio**: Test crosshairs against 6 preset wallpapers or upload your own, with blur and dim controls.
- **Multi-Monitor**: Select target display and adjust fine pixel offsets (X/Y).
- **Ultra Lightweight**: Pure 2D canvas rendering with offscreen caching — strictly event-driven with 0% idle CPU usage.
- **Zero Native Modules**: Pure Electron architecture for reliable cross-platform builds.

## Default Shortcuts

| Action | macOS | Windows |
|---|---|---|
| **Toggle Settings** | <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | <kbd>F7</kbd> |
| **Toggle Overlay** | <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd> | <kbd>F8</kbd> |

*Shortcuts can be customized in the **Position & Hotkeys** tab.*

## Development & Building

```bash
# Install dependencies
npm install

# Run locally
npm start

# Build packages
npm run build:mac   # DMG and ZIP on macOS (Apple Silicon arm64)
npm run build:win   # NSIS installer and Portable EXE for Windows
```

## Platform Tips

- **Game Mode**: Run games in **Borderless Windowed** mode for optimal overlay visibility.
- **macOS**: On first run, grant Accessibility/Screen permissions if prompted. The overlay displays across all desktop spaces and fullscreen games.
- **Windows**: If Windows SmartScreen appears on unsigned binaries, click **More info** &rarr; **Run anyway**.
