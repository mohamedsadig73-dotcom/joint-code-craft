const { app, BrowserWindow, session } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();

// Production URL
const PUBLISHED_URL = 'https://dts-store-qatar-2026.lovable.app';
const LOCAL_FALLBACK = path.join(__dirname, '..', 'dist', 'index.html');

// How many times to retry loading the remote URL
const MAX_RETRIES = 3;
const LOAD_TIMEOUT = 20000; // 20 seconds per attempt
const CONTENT_CHECK_DELAY = 3000; // Wait 3s after load for JS to execute

// Splash HTML shown instantly while remote loads
const SPLASH_HTML = `data:text/html;charset=utf-8,<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8">
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
    show: false,
    backgroundColor: '#0a0a1a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
  });

  // Show window with splash
  mainWindow.loadURL(SPLASH_HTML).then(() => {
    mainWindow.show();
    loadRemoteWithRetries(0);
  });
}

/**
 * Try to load the remote URL with retries.
 * After each successful HTTP load, verify that the React app
 * actually rendered (check for #root with children).
 */
function loadRemoteWithRetries(attempt) {
  if (attempt >= MAX_RETRIES) {
    console.log(`All ${MAX_RETRIES} remote attempts failed, loading local fallback...`);
    loadLocal();
    return;
  }

  const url = `${PUBLISHED_URL}?_electron=${Date.now()}`;
  console.log(`[Electron] Attempt ${attempt + 1}/${MAX_RETRIES}: Loading ${PUBLISHED_URL}`);

  // Timeout: if nothing happens in LOAD_TIMEOUT ms, retry
  const timeout = setTimeout(() => {
    console.log(`[Electron] Timeout on attempt ${attempt + 1}`);
    cleanup();
    loadRemoteWithRetries(attempt + 1);
  }, LOAD_TIMEOUT);

  const cleanup = () => {
    clearTimeout(timeout);
    mainWindow.webContents.removeListener('did-finish-load', onFinish);
    mainWindow.webContents.removeListener('did-fail-load', onFail);
  };

  const onFinish = () => {
    clearTimeout(timeout);
    console.log(`[Electron] Page loaded, verifying content...`);
    // Wait for JS to execute, then check if React rendered
    setTimeout(() => verifyContent(attempt), CONTENT_CHECK_DELAY);
  };

  const onFail = (_event, errorCode, errorDescription) => {
    if (errorCode === -3) return; // Aborted, ignore
    console.log(`[Electron] Load failed: ${errorCode} - ${errorDescription}`);
    cleanup();
    loadRemoteWithRetries(attempt + 1);
  };

  mainWindow.webContents.once('did-finish-load', onFinish);
  mainWindow.webContents.once('did-fail-load', onFail);

  mainWindow.loadURL(url).catch((err) => {
    console.log(`[Electron] loadURL rejected: ${err.message}`);
    cleanup();
    loadRemoteWithRetries(attempt + 1);
  });
}

/**
 * Check if the React app actually rendered by inspecting the DOM.
 * If #root is empty or missing, the JS failed to execute.
 */
function verifyContent(attempt) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents
    .executeJavaScript(`
      (function() {
        var root = document.getElementById('root');
        if (!root) return { ok: false, reason: 'no-root' };
        if (root.children.length === 0) return { ok: false, reason: 'empty-root' };
        // Check if it's a real app (has meaningful content)
        var text = root.innerText || '';
        if (text.length < 10) return { ok: false, reason: 'minimal-content' };
        return { ok: true, childCount: root.children.length };
      })()
    `)
    .then((result) => {
      if (result && result.ok) {
        console.log(`[Electron] ✓ App verified successfully (${result.childCount} children)`);
        setupRuntimeRecovery();
      } else {
        console.log(`[Electron] ✗ Content verification failed: ${result ? result.reason : 'unknown'}`);
        loadRemoteWithRetries(attempt + 1);
      }
    })
    .catch((err) => {
      console.log(`[Electron] Content check error: ${err.message}`);
      loadRemoteWithRetries(attempt + 1);
    });
}

function loadLocal() {
  const fs = require('fs');
  if (fs.existsSync(LOCAL_FALLBACK)) {
    console.log('[Electron] Loading local fallback...');
    mainWindow.loadFile(LOCAL_FALLBACK).catch((err) => {
      console.error('[Electron] Local fallback failed:', err);
      showErrorPage();
    });
  } else {
    console.error('[Electron] Local fallback not found');
    showErrorPage();
  }
}

function showErrorPage() {
  const errorHTML = `data:text/html;charset=utf-8,<!DOCTYPE html>
  <html dir="rtl" lang="ar">
  <head><meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #0a0a1a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; }
    h1 { color: #f87171; margin-bottom: 16px; }
    p { color: #94a3b8; margin-bottom: 8px; }
    button { margin-top: 24px; padding: 12px 32px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
    button:hover { background: #2563eb; }
    .info { font-size: 12px; color: #64748b; margin-top: 16px; }
  </style>
  </head>
  <body>
    <div>
      <h1>تعذّر الاتصال</h1>
      <p>لم يتم العثور على اتصال بالإنترنت أو فشل تحميل التطبيق.</p>
      <p>تأكد من اتصالك بالإنترنت وأعد المحاولة.</p>
      <button onclick="location.reload()">إعادة المحاولة</button>
      <p class="info">إذا استمرت المشكلة، جرّب فتح الرابط مباشرة في المتصفح:<br/>
      <a href="${PUBLISHED_URL}" style="color:#60a5fa">${PUBLISHED_URL}</a></p>
    </div>
  </body>
  </html>`;
  mainWindow.loadURL(errorHTML);
}

/**
 * After successful load, set up recovery for runtime navigation failures.
 */
function setupRuntimeRecovery() {
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // Ignore aborted loads
    console.log(`[Electron] Runtime failure: ${errorCode} - ${errorDescription} - ${validatedURL}`);
    // Retry loading the main URL after a short delay
    setTimeout(() => {
      if (!mainWindow.isDestroyed()) {
        loadRemoteWithRetries(0);
      }
    }, 2000);
  });

  // Handle unresponsive renderer
  mainWindow.webContents.on('unresponsive', () => {
    console.log('[Electron] Page unresponsive, reloading...');
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.reload();
    }
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
