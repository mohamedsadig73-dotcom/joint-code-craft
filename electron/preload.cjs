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

  // Native print (renders to PDF and opens it with the system PDF viewer)
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

  // Get the installed Electron shell version (from package.json)
  getShellVersion: async () => {
    return ipcRenderer.invoke('get-shell-version');
  },

  // Test connectivity to update channel endpoints (bypasses CORS)
  testUpdateChannel: async (urls) => {
    return ipcRenderer.invoke('test-update-channel', urls);
  },
});
