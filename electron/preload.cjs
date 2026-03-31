const { contextBridge, shell, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Fetch version info (bypasses CORS)
  getPublishedVersion: async (url) => {
    const response = await fetch(`${url}?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (!response.ok) throw new Error(`Failed to fetch version: ${response.status}`);
    return response.json();
  },

  // Open URL in default browser
  openExternal: async (url) => {
    await shell.openExternal(url);
  },

  // Native print
  printHTML: async (html) => {
    return ipcRenderer.invoke('print-html', html);
  },

  // Download update ZIP in background
  downloadUpdate: async (downloadUrl) => {
    return ipcRenderer.invoke('download-update', downloadUrl);
  },

  // Listen for download progress
  onDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('download-progress', handler);
  },

  // Restart the app
  restartApp: async () => {
    return ipcRenderer.invoke('restart-app');
  },
});
