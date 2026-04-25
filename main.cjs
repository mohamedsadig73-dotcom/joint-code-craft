const { app, BrowserWindow, session, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

app.disableHardwareAcceleration();

// ── Paths ──────────────────────────────────────────────
const APP_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(APP_ROOT, 'dist');
const LOCAL_INDEX = path.join(DIST_DIR, 'index.html');
const PUBLISHED_URL = 'https://dts-store-qatar-2026.lovable.app';
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
    console.log('[Electron] No local dist found, loading remote...');
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
  <html dir="rtl" lang="ar"><head><meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0a0a1a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; }
    h1 { color: #f87171; margin-bottom: 16px; }
    p { color: #94a3b8; margin-bottom: 8px; }
    button { margin-top: 24px; padding: 12px 32px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
  </style></head><body><div>
    <h1>تعذّر تحميل التطبيق</h1>
    <p>تأكد من وجود ملفات التطبيق.</p>
    <button onclick="location.reload()">إعادة المحاولة</button>
  </div></body></html>`;
  mainWindow.loadURL(errorHTML);
}

// ── Runtime recovery ───────────────────────────────────
function setupRuntimeRecovery() {
  mainWindow.webContents.on('did-fail-load', (_event, errorCode) => {
    if (errorCode === -3) return;
    setTimeout(() => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.loadFile(LOCAL_INDEX).catch(() => showErrorPage());
      }
    }, 2000);
  });

  mainWindow.webContents.on('unresponsive', () => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.reload();
  });
}

// ── IPC: Print HTML ────────────────────────────────────
function sanitizePrintFileName(value) {
  return (value || 'DTS-Store-Print')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'DTS-Store-Print';
}

async function waitForPrintContent(printWin) {
  try {
    await printWin.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const fontsReady = document.fonts?.ready ?? Promise.resolve();
        const imagePromises = Array.from(document.images || []).map((img) => (
          img.complete
            ? Promise.resolve()
            : new Promise((done) => {
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
              })
        ));
        Promise.allSettled([fontsReady, ...imagePromises]).then(() => {
          setTimeout(resolve, 300);
        });
      });
    `, true);
  } catch (_) {
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
}

ipcMain.handle('print-html', async (_event, htmlContent) => {
  const tempDir = path.join(app.getPath('temp'), 'dts-print-jobs');
  fs.mkdirSync(tempDir, { recursive: true });

  const stamp = Date.now();
  const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
  const fileBaseName = sanitizePrintFileName(titleMatch?.[1]);
  const htmlPath = path.join(tempDir, `${fileBaseName}-${stamp}.html`);
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

  const printWin = new BrowserWindow({
    width: 900,
    height: 1200,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  try {
    await printWin.loadFile(htmlPath);
    await waitForPrintContent(printWin);

    if (process.platform === 'win32') {
      const pdfPath = path.join(tempDir, `${fileBaseName}-${stamp}.pdf`);
      const pdfBuffer = await printWin.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
      });

      fs.writeFileSync(pdfPath, pdfBuffer);
      const openError = await shell.openPath(pdfPath);
      if (openError) throw new Error(openError);
      return true;
    }

    return await new Promise((resolve, reject) => {
      printWin.webContents.print({ silent: false, printBackground: true }, (success, reason) => {
        success ? resolve(true) : reject(new Error(reason || 'Print cancelled'));
      });
    });
  } finally {
    if (!printWin.isDestroyed()) printWin.close();
    try { fs.unlinkSync(htmlPath); } catch (_) {}
  }
});

// ── IPC: Open external URL ─────────────────────────────
ipcMain.handle('open-external', async (_event, url) => {
  await shell.openExternal(url);
});

// ── Helper: Download file with progress ────────────────
function downloadFile(url, destPath, progressCallback) {
  return new Promise((resolve, reject) => {
    const doRequest = (reqUrl) => {
      const proto = reqUrl.startsWith('https') ? https : http;
      proto.get(reqUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          doRequest(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;
        const file = fs.createWriteStream(destPath);

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          file.write(chunk);
          if (totalSize > 0 && progressCallback) {
            progressCallback(Math.round((downloaded / totalSize) * 100), downloaded, totalSize);
          }
        });

        response.on('end', () => {
          file.end(() => resolve(destPath));
        });

        response.on('error', (err) => {
          file.end();
          try { fs.unlinkSync(destPath); } catch (_) {}
          reject(err);
        });
      }).on('error', reject);
    };
    doRequest(url);
  });
}

// ── Helper: Extract ZIP and replace dist/ ──────────────
function extractAndReplaceDist(zipPath) {
  // Use Node.js built-in zlib + manual ZIP parsing
  // For simplicity and reliability, use the 'unzip' approach with AdmZip-like logic
  const AdmZip = (() => {
    try { return require('adm-zip'); } catch (_) { return null; }
  })();

  if (AdmZip) {
    return extractWithAdmZip(AdmZip, zipPath);
  }

  // Fallback: use PowerShell on Windows to extract
  return extractWithPowerShell(zipPath);
}

function extractWithAdmZip(AdmZip, zipPath) {
  return new Promise((resolve, reject) => {
    try {
      const tempExtract = path.join(UPDATE_DIR, 'extracted');
      
      // Clean temp extract dir
      if (fs.existsSync(tempExtract)) {
        fs.rmSync(tempExtract, { recursive: true, force: true });
      }
      fs.mkdirSync(tempExtract, { recursive: true });

      const zip = new AdmZip(zipPath);
      zip.extractAllTo(tempExtract, true);

      // Find the dist folder in extracted content
      const distSource = findDistFolder(tempExtract);
      if (!distSource) {
        reject(new Error('No dist folder found in update package'));
        return;
      }

      // Backup current dist
      const backupDir = path.join(UPDATE_DIR, 'dist-backup');
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
      }
      if (fs.existsSync(DIST_DIR)) {
        fs.cpSync(DIST_DIR, backupDir, { recursive: true });
      }

      // Replace dist
      fs.rmSync(DIST_DIR, { recursive: true, force: true });
      fs.cpSync(distSource, DIST_DIR, { recursive: true });

      // Cleanup
      fs.rmSync(tempExtract, { recursive: true, force: true });
      try { fs.unlinkSync(zipPath); } catch (_) {}

      console.log('[Electron] ✓ dist/ replaced successfully');
      resolve({ success: true });
    } catch (err) {
      reject(err);
    }
  });
}

function extractWithPowerShell(zipPath) {
  const { execSync } = require('child_process');
  return new Promise((resolve, reject) => {
    try {
      const tempExtract = path.join(UPDATE_DIR, 'extracted');
      
      if (fs.existsSync(tempExtract)) {
        fs.rmSync(tempExtract, { recursive: true, force: true });
      }
      fs.mkdirSync(tempExtract, { recursive: true });

      // Use PowerShell to extract ZIP
      const psCmd = `Expand-Archive -Path "${zipPath}" -DestinationPath "${tempExtract}" -Force`;
      execSync(`powershell -Command "${psCmd}"`, { timeout: 120000 });

      const distSource = findDistFolder(tempExtract);
      if (!distSource) {
        reject(new Error('No dist folder found in update package'));
        return;
      }

      // Backup current dist
      const backupDir = path.join(UPDATE_DIR, 'dist-backup');
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
      }
      if (fs.existsSync(DIST_DIR)) {
        fs.cpSync(DIST_DIR, backupDir, { recursive: true });
      }

      // Replace dist
      fs.rmSync(DIST_DIR, { recursive: true, force: true });
      fs.cpSync(distSource, DIST_DIR, { recursive: true });

      // Cleanup
      fs.rmSync(tempExtract, { recursive: true, force: true });
      try { fs.unlinkSync(zipPath); } catch (_) {}

      console.log('[Electron] ✓ dist/ replaced via PowerShell');
      resolve({ success: true });
    } catch (err) {
      reject(err);
    }
  });
}

// Find 'dist' folder recursively in extracted content
function findDistFolder(extractDir) {
  // Check if extractDir itself contains index.html (flat ZIP)
  if (fs.existsSync(path.join(extractDir, 'index.html'))) {
    return extractDir;
  }

  // Check direct children for dist/ or */dist/
  const entries = fs.readdirSync(extractDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(extractDir, entry.name);

    // Direct dist folder
    if (entry.name === 'dist' && fs.existsSync(path.join(fullPath, 'index.html'))) {
      return fullPath;
    }

    // Nested: AppName-win32-x64/resources/app/dist
    const nestedDist = path.join(fullPath, 'resources', 'app', 'dist');
    if (fs.existsSync(nestedDist) && fs.existsSync(path.join(nestedDist, 'index.html'))) {
      return nestedDist;
    }

    // Simple nested: AppName/dist
    const simpleDist = path.join(fullPath, 'dist');
    if (fs.existsSync(simpleDist) && fs.existsSync(path.join(simpleDist, 'index.html'))) {
      return simpleDist;
    }

    // Check if this folder itself has index.html
    if (fs.existsSync(path.join(fullPath, 'index.html'))) {
      return fullPath;
    }
  }

  return null;
}

// ── IPC: Download and apply update (Hot-Swap) ──────────
ipcMain.handle('download-update', async (_event, downloadUrl) => {
  if (!fs.existsSync(UPDATE_DIR)) {
    fs.mkdirSync(UPDATE_DIR, { recursive: true });
  }

  const zipPath = path.join(UPDATE_DIR, 'update.zip');

  // Step 1: Download
  console.log('[Electron] Downloading update from:', downloadUrl);
  await downloadFile(downloadUrl, zipPath, (progress, downloaded, total) => {
    mainWindow?.webContents?.send('download-progress', {
      phase: 'downloading',
      progress,
      downloaded,
      total,
    });
  });

  // Step 2: Extract and replace dist/
  console.log('[Electron] Extracting and replacing dist/...');
  mainWindow?.webContents?.send('download-progress', {
    phase: 'installing',
    progress: 100,
    downloaded: 0,
    total: 0,
  });

  await extractAndReplaceDist(zipPath);

  mainWindow?.webContents?.send('download-progress', {
    phase: 'done',
    progress: 100,
    downloaded: 0,
    total: 0,
  });

  return { success: true };
});

// ── IPC: Restart app ───────────────────────────────────
ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit(0);
});

// ── App lifecycle ──────────────────────────────────────
app.whenReady().then(() => {
  session.defaultSession.clearCache().then(() => createWindow()).catch(() => createWindow());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
