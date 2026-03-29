const { app, BrowserWindow } = require('electron');
const path = require('path');

// The live production URL
const REMOTE_URL = 'https://dts-store.lovable.app';
const LOCAL_FALLBACK = path.join(__dirname, '..', 'dist', 'index.html');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'نظام إدارة المخزن',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
  });

  // Try loading the live site first, fall back to local if offline
  win.loadURL(REMOTE_URL).catch(() => {
    console.log('Remote URL unreachable, loading local fallback...');
    win.loadFile(LOCAL_FALLBACK);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
