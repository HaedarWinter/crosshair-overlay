const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Platform info
  platform: process.platform,

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getMonitors: () => ipcRenderer.invoke('get-monitors'),
  updateSettings: (settings) => ipcRenderer.send('update-settings', settings),

  // Window controls
  hideSettings: () => ipcRenderer.send('hide-settings'),
  minimizeSettings: () => ipcRenderer.send('minimize-settings'),
  maximizeSettings: () => ipcRenderer.send('maximize-settings'),
  isSettingsMaximized: () => ipcRenderer.invoke('is-settings-maximized'),
  quitApp: () => ipcRenderer.send('quit-app'),

  // Wallpaper
  uploadWallpaper: () => ipcRenderer.invoke('upload-wallpaper'),
  getWallpaperPath: (source) => ipcRenderer.invoke('get-wallpaper-path', source),

  // Hotkey validation
  validateHotkey: (accelerator) => ipcRenderer.invoke('validate-hotkey', accelerator),

  // Event listeners
  onSettingsUpdated: (callback) => {
    const handler = (_event, settings) => callback(settings);
    ipcRenderer.on('settings-updated', handler);
    return () => ipcRenderer.removeListener('settings-updated', handler);
  },

  onDisplayUpdated: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on('display-updated', handler);
    return () => ipcRenderer.removeListener('display-updated', handler);
  }
});
