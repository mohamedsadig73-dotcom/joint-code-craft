const { app, BrowserWindow, session } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();

// Production URLs - try in order
const REMOTE_URLS = [
  'https://dts-store.lovable.app',
  'https://3af22d2e-d72f-44d9-8733-d6857e165138.lovableproject.com/'
];
const LOCAL_FALLBACK = path.join(__dirname, '..', 'dist', 'index.html');

// Splash HTML shown instantly while remote loads
const SPLASH_HTML = `
data:text/html;charset=utf-8,
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    background: #0a0a1a;
    color: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    overflow: hidden;
  }
  .container { text-align: center; }
  h1 { font-size: 28px; margin-bottom: 16px; color: #60a5fa; }
  p { font-size: 16px; color: #94a3b8; margin-bottom: 32px; }
  .spinner {
    width: 48px; height: 48px;
    border: 4px solid #1e293b;
    border-top: 4px solid #60a5fa;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
  <div class="container">
    <h1>نظام إدارة المخزن</h1>
    <p>جاري تحميل النظام...</p>
    <div class="spinner"></div>
  </div>
</body>
</html>`;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'نظام إدارة المخزن',
    show: false, // Don't show until ready
    backgroundColor: '#0a0a1a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
  });

  // Show window immediately with splash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load splash first, then try remote
  mainWindow.loadURL(SPLASH_HTML).then(() => {
    mainWindow.show();
    tryLoadRemote(0);
  });
}

function tryLoadRemote(index) {
  if (index >= REMOTE_URLS.length) {
    console.log('All remote URLs failed, loading local fallback...');
    loadLocal();
    return;
  }

  const url = REMOTE_URLS[index];
  console.log(`Trying remote URL ${index + 1}/${REMOTE_URLS.length}: ${url}`);

  // Set a timeout - if page doesn't load in 15 seconds, try next
  const timeout = setTimeout(() => {
    console.log(`Timeout loading: ${url}`);
    tryLoadRemote(index + 1);
  }, 15000);

  // Temporarily listen for successful load
  const onFinish = () => {
    clearTimeout(timeout);
    console.log(`Successfully loaded: ${url}`);
    setupFailHandler();
  };

  const onFail = (_event, errorCode, errorDescription) => {
    clearTimeout(timeout);
    console.log(`Failed to load ${url}: ${errorCode} - ${errorDescription}`);
    mainWindow.webContents.removeListener('did-finish-load', onFinish);
    tryLoadRemote(index + 1);
  };

  mainWindow.webContents.once('did-finish-load', onFinish);
  mainWindow.webContents.once('did-fail-load', onFail);

  mainWindow.loadURL(url).catch(() => {
    clearTimeout(timeout);
    mainWindow.webContents.removeListener('did-finish-load', onFinish);
    mainWindow.webContents.removeListener('did-fail-load', onFail);
    tryLoadRemote(index + 1);
  });
}

function loadLocal() {
  const fs = require('fs');
  if (fs.existsSync(LOCAL_FALLBACK)) {
    console.log('Loading local fallback...');
    mainWindow.loadFile(LOCAL_FALLBACK).catch((err) => {
      console.error('Local fallback also failed:', err);
      showErrorPage();
    });
  } else {
    console.error('Local fallback not found');
    showErrorPage();
  }
}

function showErrorPage() {
  const errorHTML = `data:text/html;charset=utf-8,
  <!DOCTYPE html>
  <html dir="rtl" lang="ar">
  <head><meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #0a0a1a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; }
    h1 { color: #f87171; margin-bottom: 16px; }
    p { color: #94a3b8; margin-bottom: 8px; }
    button { margin-top: 24px; padding: 12px 32px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
    button:hover { background: #2563eb; }
  </style>
  </head>
  <body>
    <div>
      <h1>تعذّر الاتصال</h1>
      <p>لم يتم العثور على اتصال بالإنترنت أو النسخة المحلية.</p>
      <p>تأكد من اتصالك بالإنترنت وأعد المحاولة.</p>
      <button onclick="location.reload()">إعادة المحاولة</button>
    </div>
  </body>
  </html>`;
  mainWindow.loadURL(errorHTML);
}

function setupFailHandler() {
  // If the page fails after initial load (e.g., navigation error), recover
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    // Ignore aborted loads (user navigated away)
    if (errorCode === -3) return;
    console.log(`Runtime load failure: ${errorCode} - ${errorDescription} - ${validatedURL}`);
    // Try reloading the current page once
    setTimeout(() => {
      mainWindow.webContents.reload();
    }, 2000);
  });
}

// Clear cache on startup to avoid stale content
app.whenReady().then(() => {
  session.defaultSession.clearCache().then(() => {
    createWindow();
  }).catch(() => {
    createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
