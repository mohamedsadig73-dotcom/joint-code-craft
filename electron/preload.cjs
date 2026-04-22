const { contextBridge, shell, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Fetch version/release info (bypasses CORS)
  getPublishedVersion: async (url) => {
    return ipcRenderer.invoke('fetch-json', `${url}?_t=${Date.now()}`);
  },

  // Open URL in default browser
  openExternal: async (url) => {
    await shell.openExternal(url);
  },

  // Native print
  printHTML: async (html) => {
    return ipcRenderer.invoke('print-html', html);
  },

  // Download update ZIP, extract, and replace dist/ (Hot-Swap)
  downloadUpdate: async (downloadUrl) => {
    return ipcRenderer.invoke('download-update', downloadUrl);
  },

  // Listen for download/install progress
  onDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },

  // Restart the app to apply update
  restartApp: async () => {
    return ipcRenderer.invoke('restart-app');
  },
});
