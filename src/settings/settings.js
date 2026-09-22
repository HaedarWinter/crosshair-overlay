/**
 * Crosshair Overlay v2.0 - Settings Window Logic
 */

(function () {
  const api = window.api || window.electronAPI;
  if (!api) {
    console.error('API preload not found');
    return;
  }

  const isMac = api.platform === 'darwin';
  if (isMac) {
    document.body.classList.add('platform-mac');
  }

  // ─── DOM References ────────────────────────────────────────────────────────
  // Titlebar
  const titlebar = document.getElementById('titlebar');
  const btnWinExit = document.getElementById('btn-win-exit');
  const btnWinMinimize = document.getElementById('btn-win-minimize');
  const btnWinMaximize = document.getElementById('btn-win-maximize');
  const btnWinClose = document.getElementById('btn-win-close');

  // Preview & Canvas
  const previewViewport = document.getElementById('preview-viewport');
  const previewCanvas = document.getElementById('preview-canvas');
  const previewCtx = previewCanvas.getContext('2d', { alpha: true });
  const previewWallpaper = document.getElementById('preview-wallpaper');
  const metaPosition = document.getElementById('meta-position');
  const metaShape = document.getElementById('meta-shape');
  const zoomBtns = document.querySelectorAll('.zoom-btn');

  // Overlay Active Toggle
  const toggleOverlayActive = document.getElementById('toggle-overlay-active');
  const badgeOverlayHotkey = document.getElementById('badge-overlay-hotkey');
  const btnExitApp = document.getElementById('btn-exit-app');

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Shape & Geometry
  const segShapeBtns = document.querySelectorAll('.seg-btn');
  const rangeRotation = document.getElementById('range-rotation');
  const numRotation = document.getElementById('num-rotation');
  const angleChips = document.querySelectorAll('.btn-angle-chip');

  const btnUnlinkSize = document.getElementById('btn-unlink-size');
  const unlinkIcon = document.getElementById('unlink-icon');
  const unlinkLabel = document.getElementById('unlink-label');
  const sizeLinkedInputs = document.getElementById('size-linked-inputs');
  const sizeUnlinkedInputs = document.getElementById('size-unlinked-inputs');
  const rangeSize = document.getElementById('range-size');
  const numSize = document.getElementById('num-size');
  const rangeSizeX = document.getElementById('range-size-x');
  const numSizeX = document.getElementById('num-size-x');
  const rangeSizeY = document.getElementById('range-size-y');
  const numSizeY = document.getElementById('num-size-y');

  const rangeThickness = document.getElementById('range-thickness');
  const numThickness = document.getElementById('num-thickness');
  const rangeGap = document.getElementById('range-gap');
  const numGap = document.getElementById('num-gap');
  const rangeOpacity = document.getElementById('range-opacity');
  const numOpacity = document.getElementById('num-opacity');
  const rangeCornerRadius = document.getElementById('range-corner-radius');
  const numCornerRadius = document.getElementById('num-corner-radius');

  // Arms
  const groupArms = document.getElementById('group-arms');
  const armTop = document.getElementById('arm-top');
  const armLeft = document.getElementById('arm-left');
  const armBottom = document.getElementById('arm-bottom');
  const armRight = document.getElementById('arm-right');

  // Color
  const pickerColor = document.getElementById('picker-color');
  const hexColor = document.getElementById('hex-color');
  const swatchColor = document.getElementById('swatch-color');
  const quickSwatches = document.querySelectorAll('.swatch-quick');

  // Presets
  const selectPreset = document.getElementById('select-preset');
  const btnOpenSavePreset = document.getElementById('btn-open-save-preset');
  const btnDeletePreset = document.getElementById('btn-delete-preset');
  const presetModal = document.getElementById('preset-modal');
  const inputPresetName = document.getElementById('input-preset-name');
  const btnCancelPreset = document.getElementById('btn-cancel-preset');
  const btnConfirmSavePreset = document.getElementById('btn-confirm-save-preset');

  // Outline
  const toggleOutline = document.getElementById('toggle-outline');
  const outlineOptions = document.getElementById('outline-options');
  const rangeOutlineWidth = document.getElementById('range-outline-width');
  const numOutlineWidth = document.getElementById('num-outline-width');
  const rangeOutlineOpacity = document.getElementById('range-outline-opacity');
  const numOutlineOpacity = document.getElementById('num-outline-opacity');
  const pickerOutlineColor = document.getElementById('picker-outline-color');
  const hexOutlineColor = document.getElementById('hex-outline-color');
  const swatchOutlineColor = document.getElementById('swatch-outline-color');

  // Center Dot
  const toggleDot = document.getElementById('toggle-dot');
  const dotOptions = document.getElementById('dot-options');
  const rangeDotSize = document.getElementById('range-dot-size');
  const numDotSize = document.getElementById('num-dot-size');
  const rangeDotOpacity = document.getElementById('range-dot-opacity');
  const numDotOpacity = document.getElementById('num-dot-opacity');

  // Outer Lines
  const groupOuterLines = document.getElementById('group-outer-lines');
  const toggleOuterLines = document.getElementById('toggle-outer-lines');
  const outerLinesOptions = document.getElementById('outer-lines-options');
  const rangeOuterSize = document.getElementById('range-outer-size');
  const numOuterSize = document.getElementById('num-outer-size');
  const rangeOuterThickness = document.getElementById('range-outer-thickness');
  const numOuterThickness = document.getElementById('num-outer-thickness');
  const rangeOuterGap = document.getElementById('range-outer-gap');
  const numOuterGap = document.getElementById('num-outer-gap');
  const rangeOuterOpacity = document.getElementById('range-outer-opacity');
  const numOuterOpacity = document.getElementById('num-outer-opacity');

  // Position & Display
  const selectMonitor = document.getElementById('select-monitor');
  const btnResetCenter = document.getElementById('btn-reset-center');
  const rangeOffsetX = document.getElementById('range-offset-x');
  const numOffsetX = document.getElementById('num-offset-x');
  const rangeOffsetY = document.getElementById('range-offset-y');
  const numOffsetY = document.getElementById('num-offset-y');

  // Hotkeys
  const hotkeyDispSettings = document.getElementById('hotkey-disp-settings');
  const hotkeyDispOverlay = document.getElementById('hotkey-disp-overlay');
  const btnRecordSettings = document.getElementById('btn-record-settings');
  const btnRecordOverlay = document.getElementById('btn-record-overlay');
  const hotkeyModal = document.getElementById('hotkey-modal');
  const modalHotkeyTarget = document.getElementById('modal-hotkey-target');
  const modalCapturedKey = document.getElementById('modal-captured-key');
  const btnCancelCapture = document.getElementById('btn-cancel-capture');

  // Wallpaper & Filters
  const wallpaperGrid = document.getElementById('wallpaper-grid');
  const btnUploadWallpaper = document.getElementById('btn-upload-wallpaper');
  const rangeWpBlur = document.getElementById('range-wp-blur');
  const numWpBlur = document.getElementById('num-wp-blur');
  const rangeWpDim = document.getElementById('range-wp-dim');
  const numWpDim = document.getElementById('num-wp-dim');

  // Export / Import modals
  const exportModal = document.getElementById('export-modal');
  const exportCodeText = document.getElementById('export-code-text');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const copyBtnLabel = document.getElementById('copy-btn-label');
  const btnCloseExport = document.getElementById('btn-close-export');
  const importModal = document.getElementById('import-modal');
  const importCodeText = document.getElementById('import-code-text');
  const btnCancelImport = document.getElementById('btn-cancel-import');
  const btnConfirmImport = document.getElementById('btn-confirm-import');
  const importError = document.getElementById('import-error');
  const btnExportPreset = document.getElementById('btn-export-preset');
  const btnImportPreset = document.getElementById('btn-import-preset');
  const btnRandomPreset = document.getElementById('btn-random-preset');

  // Toast
  const toastContainer = document.getElementById('toast-container');

  // ─── State ─────────────────────────────────────────────────────────────────
  let settings = {
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
    cornerRadius: 0,
    opacity: 100,
    color: '#00ffcc',
    arms: { top: true, left: true, right: true, bottom: true },
    outline: { enabled: true, width: 1, color: '#000000', opacity: 100 },
    centerDot: { enabled: false, size: 4, opacity: 100 },
    outerLines: { enabled: false, size: 4, thickness: 2, gap: 10, opacity: 50 },
    offset: { x: 0, y: 0 },
    monitorId: '',
    hotkeys: isMac
      ? { toggleSettings: 'CommandOrControl+Shift+S', toggleOverlay: 'CommandOrControl+Shift+X' }
      : { toggleSettings: 'F7', toggleOverlay: 'F8' },
    wallpaper: { source: 'dark', blur: 0, dim: 0 },
    presets: []
  };

  let currentZoom = 1;
  let activeCaptureTarget = null; // 'settings' | 'overlay'

  // ─── Formatting Helpers ────────────────────────────────────────────────────
  function formatAcceleratorForDisplay(accelerator) {
    if (!accelerator) return 'None';
    if (isMac) {
      return accelerator
        .replace(/CommandOrControl|Cmd/gi, '⌘')
        .replace(/Shift/gi, '⇧')
        .replace(/Alt|Option/gi, '⌥')
        .replace(/Control|Ctrl/gi, '⌃')
        .replace(/\+/g, '');
    } else {
      return accelerator
        .replace(/CommandOrControl/gi, 'Ctrl')
        .replace(/\+/g, ' + ');
    }
  }

  // ─── Sync Controls Helper ──────────────────────────────────────────────────
  function bindSliderAndNumber(slider, numberInput, path, onChange) {
    slider.addEventListener('input', () => {
      const val = Number(slider.value);
      numberInput.value = val;
      setNestedProp(settings, path, val);
      if (onChange) onChange(val);
      syncAndSave();
    });

    numberInput.addEventListener('input', () => {
      let val = Number(numberInput.value);
      const min = Number(slider.min);
      const max = Number(slider.max);
      if (val < min) val = min;
      if (val > max) val = max;
      slider.value = val;
      setNestedProp(settings, path, val);
      if (onChange) onChange(val);
      syncAndSave();
    });
  }

  function setNestedProp(obj, path, val) {
    const keys = path.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!cur[keys[i]]) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = val;
  }

  // ─── Real-Time Settings Update (RAF Throttled for 60/144 FPS) ─────────────
  let rafPending = false;
  function syncAndSave(immediate = false) {
    renderPreview();
    updateMetaDisplays();

    if (immediate) {
      api.updateSettings(settings);
      return;
    }

    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        api.updateSettings(settings);
        rafPending = false;
      });
    }
  }

  // ─── Render Live Preview & Dynamic Resize ─────────────────────────────────
  function resizePreviewCanvas() {
    if (!previewCanvas || !previewViewport) return;
    const rect = previewViewport.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w > 0 && h > 0) {
      previewCanvas.style.width = w + 'px';
      previewCanvas.style.height = h + 'px';
      previewCanvas.width = Math.round(w * dpr);
      previewCanvas.height = Math.round(h * dpr);
      if (previewCtx.resetTransform) {
        previewCtx.resetTransform();
        previewCtx.scale(dpr, dpr);
      }
      renderPreview();
    }
  }

  function renderPreview() {
    if (!previewCtx || !previewCanvas) return;
    const rect = previewViewport ? previewViewport.getBoundingClientRect() : { width: previewCanvas.width, height: previewCanvas.height };
    const w = rect.width || previewCanvas.width;
    const h = rect.height || previewCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    previewCtx.clearRect(0, 0, w, h);
    previewCtx.save();

    // Zoom around center
    if (currentZoom !== 1) {
      previewCtx.translate(cx, cy);
      previewCtx.scale(currentZoom, currentZoom);
      previewCtx.translate(-cx, -cy);
    }

    if (typeof window.drawCrosshair === 'function') {
      window.drawCrosshair(previewCtx, cx, cy, settings);
    }

    previewCtx.restore();
  }

  function updateMetaDisplays() {
    if (metaPosition) {
      const x = settings.offset?.x || 0;
      const y = settings.offset?.y || 0;
      metaPosition.textContent = `${x}, ${y} ${x === 0 && y === 0 ? '(Center)' : ''}`;
    }
    if (metaShape) {
      const shapeLabels = { cross: 'Cross', dot: 'Dot', circle: 'Circle', box: 'Box', 't-shape': 'T-Shape' };
      const rot = (settings.rotation && settings.rotation !== 0) ? ` (${settings.rotation}°)` : '';
      metaShape.textContent = (shapeLabels[settings.shape] || settings.shape) + rot;
    }
  }

  // ─── Toast Helper ─────────────────────────────────────────────────────────
  function showToast(message, type = 'info', duration = 2800) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-dot"></span>${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 250ms ease, transform 250ms ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      setTimeout(() => toast.remove(), 280);
    }, duration);
  }

  // ─── Apply Wallpaper in Preview ────────────────────────────────────────────
  async function applyPreviewWallpaper() {
    const source = settings.wallpaper?.source || 'dark';
    const blur = settings.wallpaper?.blur || 0;
    const dim = settings.wallpaper?.dim || 0;

    const resolvedPath = await api.getWallpaperPath(source);
    if (resolvedPath) {
      previewWallpaper.style.backgroundImage = `url('file://${resolvedPath.replace(/\\/g, '/')}')`;
    }

    previewWallpaper.style.filter = `blur(${blur}px) brightness(${Math.max(0.1, 1 - (dim / 100))})`;

    // Highlight preset in UI
    const thumbs = document.querySelectorAll('.wallpaper-thumb');
    thumbs.forEach(t => {
      if (t.dataset.preset === source) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });
  }

  // ─── Populate UI from Settings ─────────────────────────────────────────────
  function populateUI() {
    // Overlay Toggle
    toggleOverlayActive.checked = !!settings.overlayEnabled;
    const overlayKey = settings.hotkeys?.toggleOverlay;
    badgeOverlayHotkey.textContent = formatAcceleratorForDisplay(overlayKey);

    // Shape
    segShapeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shape === settings.shape);
    });

    // Geometry
    rangeRotation.value = numRotation.value = settings.rotation || 0;
    angleChips.forEach(chip => chip.classList.toggle('active', Number(chip.dataset.angle) === (settings.rotation || 0)));

    const isUnlinked = !!settings.unlinkSize;
    if (btnUnlinkSize) {
      btnUnlinkSize.classList.toggle('unlinked', isUnlinked);
      unlinkIcon.textContent = isUnlinked ? '🔓' : '🔗';
      unlinkLabel.textContent = isUnlinked ? 'Unlinked' : 'Linked';
    }
    sizeLinkedInputs?.classList.toggle('hidden', isUnlinked);
    sizeUnlinkedInputs?.classList.toggle('hidden', !isUnlinked);

    rangeSize.value = numSize.value = settings.size;
    if (rangeSizeX) rangeSizeX.value = numSizeX.value = settings.sizeX !== undefined ? settings.sizeX : settings.size;
    if (rangeSizeY) rangeSizeY.value = numSizeY.value = settings.sizeY !== undefined ? settings.sizeY : settings.size;

    rangeThickness.value = numThickness.value = settings.thickness;
    rangeGap.value = numGap.value = settings.gap;
    rangeOpacity.value = numOpacity.value = settings.opacity;
    if (rangeCornerRadius) rangeCornerRadius.value = numCornerRadius.value = settings.cornerRadius || 0;

    // Arms
    armTop.checked = settings.arms?.top !== false;
    armLeft.checked = settings.arms?.left !== false;
    armBottom.checked = settings.arms?.bottom !== false;
    armRight.checked = settings.arms?.right !== false;

    // Color
    pickerColor.value = settings.color;
    hexColor.value = settings.color;
    swatchColor.style.backgroundColor = settings.color;

    // Outline
    toggleOutline.checked = !!settings.outline?.enabled;
    outlineOptions.classList.toggle('hidden', !settings.outline?.enabled);
    rangeOutlineWidth.value = numOutlineWidth.value = settings.outline?.width || 1;
    if (rangeOutlineOpacity) rangeOutlineOpacity.value = numOutlineOpacity.value = settings.outline?.opacity !== undefined ? settings.outline.opacity : 100;
    pickerOutlineColor.value = settings.outline?.color || '#000000';
    hexOutlineColor.value = settings.outline?.color || '#000000';
    swatchOutlineColor.style.backgroundColor = settings.outline?.color || '#000000';

    // Center Dot
    toggleDot.checked = !!settings.centerDot?.enabled;
    dotOptions.classList.toggle('hidden', !settings.centerDot?.enabled);
    rangeDotSize.value = numDotSize.value = settings.centerDot?.size || 4;
    if (rangeDotOpacity) rangeDotOpacity.value = numDotOpacity.value = settings.centerDot?.opacity !== undefined ? settings.centerDot.opacity : 100;

    // Outer Lines
    if (toggleOuterLines) {
      toggleOuterLines.checked = !!settings.outerLines?.enabled;
      outerLinesOptions.classList.toggle('hidden', !settings.outerLines?.enabled);
      rangeOuterSize.value = numOuterSize.value = settings.outerLines?.size || 4;
      rangeOuterThickness.value = numOuterThickness.value = settings.outerLines?.thickness || 2;
      rangeOuterGap.value = numOuterGap.value = settings.outerLines?.gap !== undefined ? settings.outerLines.gap : 10;
      rangeOuterOpacity.value = numOuterOpacity.value = settings.outerLines?.opacity !== undefined ? settings.outerLines.opacity : 50;
    }

    // Position
    rangeOffsetX.value = numOffsetX.value = settings.offset?.x || 0;
    rangeOffsetY.value = numOffsetY.value = settings.offset?.y || 0;

    // Hotkeys Displays
    hotkeyDispSettings.textContent = formatAcceleratorForDisplay(settings.hotkeys?.toggleSettings);
    hotkeyDispOverlay.textContent = formatAcceleratorForDisplay(settings.hotkeys?.toggleOverlay);

    // Wallpaper Filters
    rangeWpBlur.value = numWpBlur.value = settings.wallpaper?.blur || 0;
    rangeWpDim.value = numWpDim.value = settings.wallpaper?.dim || 0;

    applyPreviewWallpaper();
    renderPreview();
    updateMetaDisplays();
    populatePresetDropdown();
  }

  // ─── Preset Helpers ────────────────────────────────────────────────────────
  function populatePresetDropdown(selectedId = null) {
    if (!selectPreset) return;
    const prevVal = selectedId || selectPreset.value;
    selectPreset.innerHTML = '';

    const presets = settings.presets || [];
    const builtInGroup = document.createElement('optgroup');
    builtInGroup.label = 'Built-in Presets';
    const userGroup = document.createElement('optgroup');
    userGroup.label = 'My Custom Presets';

    presets.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.builtIn) {
        builtInGroup.appendChild(opt);
      } else {
        userGroup.appendChild(opt);
      }
    });

    if (builtInGroup.children.length > 0) selectPreset.appendChild(builtInGroup);
    if (userGroup.children.length > 0) selectPreset.appendChild(userGroup);

    if (prevVal && presets.some(p => p.id === prevVal)) {
      selectPreset.value = prevVal;
    }
    updatePresetDeleteButton();
  }

  function updatePresetDeleteButton() {
    if (!btnDeletePreset || !selectPreset) return;
    const currentId = selectPreset.value;
    const presets = settings.presets || [];
    const currentPreset = presets.find(p => p.id === currentId);
    if (currentPreset && !currentPreset.builtIn) {
      btnDeletePreset.style.display = 'flex';
    } else {
      btnDeletePreset.style.display = 'none';
    }
  }

  // ─── Setup Event Listeners ─────────────────────────────────────────────────
  function initListeners() {
    // Window controls
    if (btnWinExit) {
      btnWinExit.addEventListener('click', () => api.quitApp());
    }
    if (btnExitApp) {
      btnExitApp.addEventListener('click', () => api.quitApp());
    }
    if (btnWinMinimize) {
      btnWinMinimize.addEventListener('click', () => api.minimizeSettings());
    }
    if (btnWinMaximize) {
      btnWinMaximize.addEventListener('click', () => {
        if (api.maximizeSettings) api.maximizeSettings();
      });
    }
    if (btnWinClose) {
      btnWinClose.addEventListener('click', () => api.hideSettings());
    }
    if (titlebar) {
      titlebar.addEventListener('dblclick', (e) => {
        if (e.target.closest('button, input, select, .titlebar-author')) return;
        if (api.maximizeSettings) api.maximizeSettings();
      });
    }

    window.addEventListener('resize', () => {
      resizePreviewCanvas();
      if (api.isSettingsMaximized) {
        api.isSettingsMaximized().then(max => {
          document.body.classList.toggle('is-maximized', !!max);
        });
      }
    });

    // Zoom buttons
    zoomBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        zoomBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentZoom = Number(btn.dataset.zoom) || 1;
        renderPreview();
      });
    });

    // Overlay Toggle Switch
    toggleOverlayActive.addEventListener('change', (e) => {
      settings.overlayEnabled = e.target.checked;
      syncAndSave(true);
    });

    // Tab Switching
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(targetTab)?.classList.add('active');
      });
    });

    // Shape Selector
    segShapeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        segShapeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        settings.shape = btn.dataset.shape;
        syncAndSave();
      });
    });

    // Preset Selection
    if (selectPreset) {
      selectPreset.addEventListener('change', () => {
        const selectedId = selectPreset.value;
        const presets = settings.presets || [];
        const chosen = presets.find(p => p.id === selectedId);
        if (!chosen || !chosen.data) return;

        const d = chosen.data;
        if (d.shape) settings.shape = d.shape;
        if (d.size !== undefined) settings.size = Number(d.size);
        if (d.sizeX !== undefined) settings.sizeX = Number(d.sizeX);
        if (d.sizeY !== undefined) settings.sizeY = Number(d.sizeY);
        if (d.unlinkSize !== undefined) settings.unlinkSize = !!d.unlinkSize;
        if (d.rotation !== undefined) settings.rotation = Number(d.rotation);
        if (d.thickness !== undefined) settings.thickness = Number(d.thickness);
        if (d.gap !== undefined) settings.gap = Number(d.gap);
        if (d.cornerRadius !== undefined) settings.cornerRadius = Number(d.cornerRadius);
        if (d.opacity !== undefined) settings.opacity = Number(d.opacity);
        if (d.color) settings.color = d.color;
        if (d.arms) settings.arms = { ...d.arms };
        if (d.outline) settings.outline = { ...d.outline };
        if (d.centerDot) settings.centerDot = { ...d.centerDot };
        if (d.outerLines) settings.outerLines = { ...d.outerLines };

        populateUI();
        syncAndSave(true);
        updatePresetDeleteButton();
      });
    }

    // Save Preset Modal
    if (btnOpenSavePreset && presetModal) {
      btnOpenSavePreset.addEventListener('click', () => {
        inputPresetName.value = '';
        presetModal.classList.remove('hidden');
        setTimeout(() => inputPresetName.focus(), 80);
      });

      btnCancelPreset.addEventListener('click', () => {
        presetModal.classList.add('hidden');
      });

      presetModal.addEventListener('click', (e) => {
        if (e.target === presetModal) presetModal.classList.add('hidden');
      });

      const executeSavePreset = () => {
        const name = inputPresetName.value.trim();
        if (!name) return;

        const newId = 'user-' + Date.now();
        const newPreset = {
          id: newId,
          name: name,
          builtIn: false,
          data: {
            shape: settings.shape,
            size: settings.size,
            sizeX: settings.sizeX,
            sizeY: settings.sizeY,
            unlinkSize: !!settings.unlinkSize,
            rotation: settings.rotation || 0,
            thickness: settings.thickness,
            gap: settings.gap,
            cornerRadius: settings.cornerRadius || 0,
            opacity: settings.opacity,
            color: settings.color,
            arms: { ...settings.arms },
            outline: { ...settings.outline },
            centerDot: { ...settings.centerDot },
            outerLines: { ...(settings.outerLines || {}) }
          }
        };

        if (!Array.isArray(settings.presets)) {
          settings.presets = [];
        }
        settings.presets.push(newPreset);
        populatePresetDropdown(newId);
        syncAndSave(true);
        presetModal.classList.add('hidden');
      };

      btnConfirmSavePreset.addEventListener('click', executeSavePreset);
      inputPresetName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') executeSavePreset();
        if (e.key === 'Escape') presetModal.classList.add('hidden');
      });
    }

    // Delete Custom Preset
    if (btnDeletePreset) {
      btnDeletePreset.addEventListener('click', () => {
        const selectedId = selectPreset.value;
        const presets = settings.presets || [];
        const chosen = presets.find(p => p.id === selectedId);
        if (!chosen || chosen.builtIn) return;

        settings.presets = presets.filter(p => p.id !== selectedId);
        populatePresetDropdown(settings.presets[0]?.id);
        syncAndSave(true);
      });
    }

    // Rotation Controls
    bindSliderAndNumber(rangeRotation, numRotation, 'rotation', (val) => {
      angleChips.forEach(chip => chip.classList.toggle('active', Number(chip.dataset.angle) === val));
    });

    angleChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const ang = Number(chip.dataset.angle);
        settings.rotation = ang;
        rangeRotation.value = numRotation.value = ang;
        angleChips.forEach(c => c.classList.toggle('active', c === chip));
        syncAndSave();
      });
    });

    // Unlink Size Toggle
    if (btnUnlinkSize) {
      btnUnlinkSize.addEventListener('click', () => {
        settings.unlinkSize = !settings.unlinkSize;
        if (settings.unlinkSize) {
          settings.sizeX = settings.size;
          settings.sizeY = settings.size;
        }
        populateUI();
        syncAndSave();
      });
    }

    if (rangeSizeX && numSizeX) {
      bindSliderAndNumber(rangeSizeX, numSizeX, 'sizeX', () => {
        // User mengedit H/V langsung = niat unlink. Paksa unlink agar
        // gambar pakai nilai H/V, bukan `size` (linked).
        if (!settings.unlinkSize) {
          settings.unlinkSize = true;
          populateUI();
        }
      });
    }
    if (rangeSizeY && numSizeY) {
      bindSliderAndNumber(rangeSizeY, numSizeY, 'sizeY', () => {
        if (!settings.unlinkSize) {
          settings.unlinkSize = true;
          populateUI();
        }
      });
    }

    // Geometry Sliders
    bindSliderAndNumber(rangeSize, numSize, 'size', (val) => {
      if (!settings.unlinkSize) {
        settings.sizeX = val;
        settings.sizeY = val;
        if (rangeSizeX) rangeSizeX.value = numSizeX.value = val;
        if (rangeSizeY) rangeSizeY.value = numSizeY.value = val;
      }
    });
    bindSliderAndNumber(rangeThickness, numThickness, 'thickness');
    bindSliderAndNumber(rangeGap, numGap, 'gap');
    bindSliderAndNumber(rangeOpacity, numOpacity, 'opacity');
    if (rangeCornerRadius) bindSliderAndNumber(rangeCornerRadius, numCornerRadius, 'cornerRadius');

    // Arms Checkboxes
    const updateArms = () => {
      settings.arms = {
        top: armTop.checked,
        left: armLeft.checked,
        bottom: armBottom.checked,
        right: armRight.checked
      };
      syncAndSave();
    };
    armTop.addEventListener('change', updateArms);
    armLeft.addEventListener('change', updateArms);
    armBottom.addEventListener('change', updateArms);
    armRight.addEventListener('change', updateArms);

    // Color Picker & Hex Input
    pickerColor.addEventListener('input', (e) => {
      const col = e.target.value;
      hexColor.value = col;
      swatchColor.style.backgroundColor = col;
      settings.color = col;
      syncAndSave();
    });

    hexColor.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        pickerColor.value = val;
        swatchColor.style.backgroundColor = val;
        settings.color = val;
        syncAndSave();
      }
    });

    quickSwatches.forEach(btn => {
      btn.addEventListener('click', () => {
        const col = btn.dataset.color;
        pickerColor.value = col;
        hexColor.value = col;
        swatchColor.style.backgroundColor = col;
        settings.color = col;
        syncAndSave();
      });
    });

    // Outline Controls
    toggleOutline.addEventListener('change', (e) => {
      settings.outline.enabled = e.target.checked;
      outlineOptions.classList.toggle('hidden', !e.target.checked);
      syncAndSave();
    });

    bindSliderAndNumber(rangeOutlineWidth, numOutlineWidth, 'outline.width');
    if (rangeOutlineOpacity) bindSliderAndNumber(rangeOutlineOpacity, numOutlineOpacity, 'outline.opacity');

    pickerOutlineColor.addEventListener('input', (e) => {
      const col = e.target.value;
      hexOutlineColor.value = col;
      swatchOutlineColor.style.backgroundColor = col;
      settings.outline.color = col;
      syncAndSave();
    });

    hexOutlineColor.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        pickerOutlineColor.value = val;
        swatchOutlineColor.style.backgroundColor = val;
        settings.outline.color = val;
        syncAndSave();
      }
    });

    // Center Dot Controls
    toggleDot.addEventListener('change', (e) => {
      settings.centerDot.enabled = e.target.checked;
      dotOptions.classList.toggle('hidden', !e.target.checked);
      syncAndSave();
    });

    bindSliderAndNumber(rangeDotSize, numDotSize, 'centerDot.size');
    if (rangeDotOpacity) bindSliderAndNumber(rangeDotOpacity, numDotOpacity, 'centerDot.opacity');

    // Outer Lines Controls
    if (toggleOuterLines) {
      toggleOuterLines.addEventListener('change', (e) => {
        if (!settings.outerLines) settings.outerLines = {};
        settings.outerLines.enabled = e.target.checked;
        outerLinesOptions.classList.toggle('hidden', !e.target.checked);
        syncAndSave();
      });
      bindSliderAndNumber(rangeOuterSize, numOuterSize, 'outerLines.size');
      bindSliderAndNumber(rangeOuterThickness, numOuterThickness, 'outerLines.thickness');
      bindSliderAndNumber(rangeOuterGap, numOuterGap, 'outerLines.gap');
      bindSliderAndNumber(rangeOuterOpacity, numOuterOpacity, 'outerLines.opacity');
    }

    // Display & Position
    selectMonitor.addEventListener('change', (e) => {
      settings.monitorId = e.target.value;
      syncAndSave(true);
    });

    bindSliderAndNumber(rangeOffsetX, numOffsetX, 'offset.x');
    bindSliderAndNumber(rangeOffsetY, numOffsetY, 'offset.y');

    btnResetCenter.addEventListener('click', () => {
      settings.offset = { x: 0, y: 0 };
      rangeOffsetX.value = numOffsetX.value = 0;
      rangeOffsetY.value = numOffsetY.value = 0;
      syncAndSave(true);
    });

    // Wallpaper Presets
    wallpaperGrid.addEventListener('click', (e) => {
      const thumb = e.target.closest('.wallpaper-thumb');
      if (!thumb) return;
      const preset = thumb.dataset.preset;
      settings.wallpaper.source = preset;
      applyPreviewWallpaper();
      syncAndSave();
    });

    // Custom Wallpaper Upload
    btnUploadWallpaper.addEventListener('click', async () => {
      const res = await api.uploadWallpaper();
      if (res.error) {
        showToast(res.error, 'error');
      } else if (res.filename) {
        settings.wallpaper.source = res.filename;
        applyPreviewWallpaper();
        syncAndSave();
        showToast('Wallpaper uploaded', 'success');
      }
    });

    // Wallpaper Filters
    bindSliderAndNumber(rangeWpBlur, numWpBlur, 'wallpaper.blur', () => applyPreviewWallpaper());
    bindSliderAndNumber(rangeWpDim, numWpDim, 'wallpaper.dim', () => applyPreviewWallpaper());

    // Hotkey Recording
    btnRecordSettings.addEventListener('click', () => startHotkeyCapture('settings'));
    btnRecordOverlay.addEventListener('click', () => startHotkeyCapture('overlay'));
    btnCancelCapture.addEventListener('click', cancelHotkeyCapture);

    // Global Keydown Handler for Hotkey Capture
    window.addEventListener('keydown', handleHotkeyKeyDown);

    // ─── Export Preset ───────────────────────────────────────────────────────
    if (btnExportPreset && exportModal) {
      btnExportPreset.addEventListener('click', () => {
        const exportData = {
          v: 2,
          shape: settings.shape,
          size: settings.size,
          sizeX: settings.sizeX,
          sizeY: settings.sizeY,
          unlinkSize: settings.unlinkSize,
          rotation: settings.rotation || 0,
          thickness: settings.thickness,
          gap: settings.gap,
          opacity: settings.opacity,
          color: settings.color,
          arms: settings.arms,
          outline: settings.outline,
          centerDot: settings.centerDot,
          outerLines: settings.outerLines,
          cornerRadius: settings.cornerRadius || 0
        };
        const code = btoa(JSON.stringify(exportData));
        exportCodeText.value = code;
        exportModal.classList.remove('hidden');
        copyBtnLabel.textContent = 'Copy';
      });

      btnCopyCode.addEventListener('click', () => {
        navigator.clipboard.writeText(exportCodeText.value).then(() => {
          copyBtnLabel.textContent = 'Copied!';
          setTimeout(() => { copyBtnLabel.textContent = 'Copy'; }, 1800);
        });
      });

      btnCloseExport.addEventListener('click', () => exportModal.classList.add('hidden'));
      exportModal.addEventListener('click', (e) => { if (e.target === exportModal) exportModal.classList.add('hidden'); });
    }

    // ─── Import Preset ───────────────────────────────────────────────────────
    if (btnImportPreset && importModal) {
      btnImportPreset.addEventListener('click', () => {
        importCodeText.value = '';
        importError.textContent = '';
        importModal.classList.remove('hidden');
        setTimeout(() => importCodeText.focus(), 80);
      });

      btnCancelImport.addEventListener('click', () => importModal.classList.add('hidden'));
      importModal.addEventListener('click', (e) => { if (e.target === importModal) importModal.classList.add('hidden'); });

      btnConfirmImport.addEventListener('click', () => {
        const code = importCodeText.value.trim();
        if (!code) { importError.textContent = 'Please paste a code first.'; return; }
        let parsed;
        try {
          parsed = JSON.parse(atob(code));
        } catch {
          importError.textContent = 'Invalid code. Make sure you copied it correctly.';
          return;
        }
        if (!parsed || parsed.v !== 2) {
          importError.textContent = 'Incompatible preset version.';
          return;
        }
        // Apply
        if (parsed.shape) settings.shape = parsed.shape;
        if (parsed.size !== undefined) settings.size = Number(parsed.size);
        if (parsed.sizeX !== undefined) settings.sizeX = Number(parsed.sizeX);
        if (parsed.sizeY !== undefined) settings.sizeY = Number(parsed.sizeY);
        if (parsed.unlinkSize !== undefined) settings.unlinkSize = !!parsed.unlinkSize;
        if (parsed.rotation !== undefined) settings.rotation = Number(parsed.rotation);
        if (parsed.thickness !== undefined) settings.thickness = Number(parsed.thickness);
        if (parsed.gap !== undefined) settings.gap = Number(parsed.gap);
        if (parsed.opacity !== undefined) settings.opacity = Number(parsed.opacity);
        if (parsed.color) settings.color = parsed.color;
        if (parsed.arms) settings.arms = { ...parsed.arms };
        if (parsed.outline) settings.outline = { ...parsed.outline };
        if (parsed.centerDot) settings.centerDot = { ...parsed.centerDot };
        if (parsed.outerLines) settings.outerLines = { ...parsed.outerLines };
        if (parsed.cornerRadius !== undefined) settings.cornerRadius = Number(parsed.cornerRadius);

        importModal.classList.add('hidden');
        populateUI();
        syncAndSave(true);
        showToast('Preset imported successfully', 'success');
      });
    }

    // ─── Random Preset Generator ─────────────────────────────────────────────
    if (btnRandomPreset) {
      btnRandomPreset.addEventListener('click', () => {
        const shapes = ['cross', 'cross', 'cross', 'dot', 'circle', 'box', 't-shape'];
        const colors = ['#00ffcc', '#00ff66', '#ff3366', '#ffff00', '#ff00ff', '#ffffff', '#38bdf8', '#fb923c', '#a855f7'];
        const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const randomSize = Math.floor(Math.random() * 20) + 6;
        const randomThickness = [1, 1.5, 2, 2.5, 3][Math.floor(Math.random() * 5)];
        const randomGap = Math.floor(Math.random() * 8) + 1;
        const randomRotation = Math.random() < 0.25 ? 45 : 0;
        const hasDot = Math.random() < 0.4;
        const hasOuter = randomShape === 'cross' && Math.random() < 0.35;

        settings.shape = randomShape;
        settings.color = randomColor;
        settings.size = randomSize;
        settings.sizeX = randomSize;
        settings.sizeY = randomSize;
        settings.unlinkSize = false;
        settings.thickness = randomThickness;
        settings.gap = randomGap;
        settings.rotation = randomRotation;
        settings.opacity = 100;
        settings.outline = { enabled: true, width: 1, color: '#000000', opacity: 100 };
        settings.centerDot = { enabled: hasDot, size: Math.floor(Math.random() * 3) + 2, opacity: 100 };
        settings.outerLines = { enabled: hasOuter, size: Math.floor(Math.random() * 4) + 2, thickness: 2, gap: randomGap + randomSize + 4, opacity: 45 };

        populateUI();
        syncAndSave(true);
        showToast('🎲 Random crosshair generated!', 'info');
      });
    }
  }

  // ─── Hotkey Capture Logic ──────────────────────────────────────────────────
  function startHotkeyCapture(target) {
    activeCaptureTarget = target;
    modalHotkeyTarget.textContent = target === 'settings'
      ? 'Record Shortcut: Toggle Settings'
      : 'Record Shortcut: Toggle Crosshair Overlay';
    modalCapturedKey.textContent = 'Listening for keys...';
    hotkeyModal.classList.remove('hidden');
  }

  function cancelHotkeyCapture() {
    activeCaptureTarget = null;
    hotkeyModal.classList.add('hidden');
  }

  async function handleHotkeyKeyDown(e) {
    if (!activeCaptureTarget) return;

    // Ignore single modifier presses
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      cancelHotkeyCapture();
      return;
    }

    const parts = [];
    if (e.ctrlKey || (isMac && e.metaKey)) {
      parts.push('CommandOrControl');
    }
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    let mainKey = e.key.toUpperCase();
    if (e.code.startsWith('Key')) mainKey = e.code.replace('Key', '');
    if (e.code.startsWith('Digit')) mainKey = e.code.replace('Digit', '');
    if (/^F\d{1,2}$/i.test(e.key)) mainKey = e.key.toUpperCase();

    // On Windows, F-keys don't need modifiers. On Mac, modifier combos are preferred.
    if (parts.length === 0 && !/^F\d{1,2}$/i.test(mainKey)) {
      modalCapturedKey.textContent = 'Add modifier (e.g. Cmd or Shift)';
      return;
    }

    parts.push(mainKey);
    const accelerator = parts.join('+');

    modalCapturedKey.textContent = formatAcceleratorForDisplay(accelerator);

    // Validate against duplicate binding
    const otherKey = activeCaptureTarget === 'settings'
      ? settings.hotkeys?.toggleOverlay
      : settings.hotkeys?.toggleSettings;

    if (accelerator === otherKey) {
      modalCapturedKey.textContent = 'Key already in use!';
      return;
    }

    // Validate with main process
    const valRes = await api.validateHotkey(accelerator);
    if (!valRes.valid) {
      modalCapturedKey.textContent = valRes.reason || 'Invalid shortcut';
      return;
    }

    // Valid hotkey: save and update
    if (activeCaptureTarget === 'settings') {
      settings.hotkeys.toggleSettings = accelerator;
      hotkeyDispSettings.textContent = formatAcceleratorForDisplay(accelerator);
    } else {
      settings.hotkeys.toggleOverlay = accelerator;
      hotkeyDispOverlay.textContent = formatAcceleratorForDisplay(accelerator);
      badgeOverlayHotkey.textContent = formatAcceleratorForDisplay(accelerator);
    }

    syncAndSave(true);
    setTimeout(cancelHotkeyCapture, 300);
  }

  // ─── Populate Monitors Dropdown ────────────────────────────────────────────
  async function loadMonitors() {
    const monitors = await api.getMonitors();
    selectMonitor.innerHTML = '';
    monitors.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      if (m.id === settings.monitorId) opt.selected = true;
      selectMonitor.appendChild(opt);
    });
  }

  // ─── Initialize ────────────────────────────────────────────────────────────
  async function init() {
    const loaded = await api.getSettings();
    if (loaded) {
      settings = { ...settings, ...loaded };
    }

    await loadMonitors();
    populateUI();
    resizePreviewCanvas();
    initListeners();

    // Listen for live updates from main (e.g. F8 pressed)
    api.onSettingsUpdated(updated => {
      if (updated) {
        settings = { ...settings, ...updated };
        populateUI();
      }
    });
  }

  init();
})();
