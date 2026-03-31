const { contextBridge, shell, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPublishedVersion: async (url) => {
    const response = await fetch(`${url}?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch version: ${response.status}`);
    }

    return response.json();
  },
  openExternal: async (url) => {
    await shell.openExternal(url);
  },
  printHTML: async (html) => {
    return ipcRenderer.invoke('print-html', html);
  },
});
