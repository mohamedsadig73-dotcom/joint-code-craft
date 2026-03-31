const { app, BrowserWindow, session, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

app.disableHardwareAcceleration();

// ── Paths ──────────────────────────────────────────────
const LOCAL_INDEX = path.join(__dirname, '..', 'dist', 'index.html');
const PUBLISHED_URL = 'https://dts-store-qatar-2026.lovable.app';
const DESKTOP_RELEASE_URL = `${PUBLISHED_URL}/desktop-release.json`;
const UPDATE_DIR = path.join(app.getPath('userData'), 'updates');

let mainWindow = null;

// ── Window ─────────────────────────────────────────────
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

  // ── Load local dist directly (v5 standard) ──
  if (fs.existsSync(LOCAL_INDEX)) {
    console.log('[Electron] Loading local dist/index.html...');
    mainWindow.loadFile(LOCAL_INDEX).then(() => {
      mainWindow.show();
      setupRuntimeRecovery();
    }).catch((err) => {
      console.error('[Electron] Local load failed:', err);
      mainWindow.show();
      showErrorPage();
    });
  } else {
    // Fallback: try remote if no local build
    console.log('[Electron] No local dist, loading remote...');
    mainWindow.loadURL(PUBLISHED_URL).then(() => {
      mainWindow.show();
    }).catch(() => {
      mainWindow.show();
      showErrorPage();
    });
  }
}

// ── Error page ─────────────────────────────────────────
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
  </style>
  </head>
  <body>
    <div>
      <h1>تعذّر تحميل التطبيق</h1>
      <p>تأكد من وجود ملفات التطبيق أو اتصالك بالإنترنت.</p>
      <button onclick="location.reload()">إعادة المحاولة</button>
    </div>
  </body>
  </html>`;
  mainWindow.loadURL(errorHTML);
}

// ── Runtime recovery ───────────────────────────────────
function setupRuntimeRecovery() {
  mainWindow.webContents.on('did-fail-load', (_event, errorCode) => {
    if (errorCode === -3) return;
    console.log(`[Electron] Runtime failure: ${errorCode}`);
    setTimeout(() => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.loadFile(LOCAL_INDEX).catch(() => showErrorPage());
      }
    }, 2000);
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.log('[Electron] Page unresponsive, reloading...');
    if (!mainWindow.isDestroyed()) mainWindow.webContents.reload();
  });
}

// ── IPC: Print HTML ────────────────────────────────────
ipcMain.handle('print-html', async (_event, htmlContent) => {
  return new Promise((resolve, reject) => {
    const printWin = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });

    printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    printWin.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        printWin.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
          printWin.close();
          if (success) resolve(true);
          else reject(new Error(failureReason || 'Print cancelled'));
        });
      }, 500);
    });
  });
});

// ── IPC: Open external URL ─────────────────────────────
ipcMain.handle('open-external', async (_event, url) => {
  await shell.openExternal(url);
});

// ── IPC: Download update ZIP ───────────────────────────
ipcMain.handle('download-update', async (event, downloadUrl) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(UPDATE_DIR)) {
      fs.mkdirSync(UPDATE_DIR, { recursive: true });
    }

    const fileName = path.basename(new URL(downloadUrl).pathname) || 'update.zip';
    const filePath = path.join(UPDATE_DIR, fileName);
    const file = fs.createWriteStream(filePath);

    const doRequest = (url) => {
      const proto = url.startsWith('https') ? https : http;
      proto.get(url, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          doRequest(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          file.write(chunk);
          if (totalSize > 0) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            mainWindow?.webContents?.send('download-progress', { progress, downloaded: downloadedSize, total: totalSize });
          }
        });

        response.on('end', () => {
          file.end();
          console.log(`[Electron] Update downloaded to: ${filePath}`);
          resolve({ success: true, filePath });
        });

        response.on('error', (err) => {
          file.end();
          fs.unlinkSync(filePath);
          reject(err);
        });
      }).on('error', (err) => {
        file.end();
        reject(err);
      });
    };

    doRequest(downloadUrl);
  });
});

// ── IPC: Restart app ───────────────────────────────────
ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit(0);
});

// ── App lifecycle ──────────────────────────────────────
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
