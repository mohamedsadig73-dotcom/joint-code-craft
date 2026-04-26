const { app, BrowserWindow, session, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

app.disableHardwareAcceleration();

// ── Paths ──────────────────────────────────────────────
const APP_ROOT = path.join(__dirname, '..');
const BUNDLED_DIST_DIR = path.join(APP_ROOT, 'dist');
const USER_DIST_DIR = path.join(app.getPath('userData'), 'dist-current');
const PUBLISHED_URL = 'https://dts-store-qatar-2026.lovable.app';
const UPDATE_DIR = path.join(app.getPath('userData'), 'updates');
const LOCK_FILE = path.join(UPDATE_DIR, 'update.lock');
const PENDING_DIST = path.join(UPDATE_DIR, 'dist-pending');
const STATUS_FILE = path.join(UPDATE_DIR, 'update-status.json');

// ── Status tracking (persists across restarts for diagnostics) ──
function writeStatus(phase, details = {}) {
  try {
    if (!fs.existsSync(UPDATE_DIR)) fs.mkdirSync(UPDATE_DIR, { recursive: true });
    const payload = {
      phase,
      timestamp: new Date().toISOString(),
      ...details,
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`[Electron][Update] ${phase}`, details);
  } catch (err) {
    console.error('[Electron][Update] Failed to write status:', err);
  }
}

function readStatus() {
  try {
    if (!fs.existsSync(STATUS_FILE)) return null;
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function hasIndex(dir) {
  return fs.existsSync(path.join(dir, 'index.html'));
}

function getActiveDistDir() {
  return hasIndex(USER_DIST_DIR) ? USER_DIST_DIR : BUNDLED_DIST_DIR;
}

function getActiveIndex() {
  return path.join(getActiveDistDir(), 'index.html');
}

// Read shell version from package.json
function getShellVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// Apply pending update on startup if it exists
function applyPendingUpdateIfAny() {
  try {
    if (!fs.existsSync(PENDING_DIST)) return;
    writeStatus('applying', { source: PENDING_DIST, target: USER_DIST_DIR });
    console.log('[Electron] Applying pending update from previous session...');
    if (fs.existsSync(USER_DIST_DIR)) {
      fs.rmSync(USER_DIST_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
    }
    fs.cpSync(PENDING_DIST, USER_DIST_DIR, { recursive: true });
    fs.rmSync(PENDING_DIST, { recursive: true, force: true });
    try { fs.unlinkSync(LOCK_FILE); } catch (_) {}
    writeStatus('applied', { activeDir: USER_DIST_DIR });
    console.log('[Electron] ✓ Pending update applied');
  } catch (err) {
    writeStatus('apply_failed', { error: err.message, stack: err.stack });
    console.error('[Electron] Failed to apply pending update:', err);
  }
}

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
  const activeIndex = getActiveIndex();
  if (fs.existsSync(activeIndex)) {
    console.log('[Electron] Loading local dist/index.html...');
    mainWindow.loadFile(activeIndex).then(() => {
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
        mainWindow.loadFile(getActiveIndex()).catch(() => showErrorPage());
      }
    }, 2000);
  });

  mainWindow.webContents.on('unresponsive', () => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.reload();
  });
}

// ── IPC: Print HTML ────────────────────────────────────
ipcMain.handle('print-html', async (_event, htmlContent) => {
  const stamp = Date.now();
  const tmpHtml = path.join(app.getPath('temp'), `dts-print-${stamp}.html`);
  const tmpPdf = path.join(app.getPath('temp'), `DTS-Store-Print-${stamp}.pdf`);
  const activeDist = getActiveDistDir();
  const baseHref = `file://${activeDist.replace(/\\/g, '/')}/`;
  const printableHtml = htmlContent.includes('<base ')
    ? htmlContent
    : htmlContent.replace(/<head>/i, `<head><base href="${baseHref}">`);

  let printWin = null;
  try {
    fs.writeFileSync(tmpHtml, printableHtml, 'utf-8');
    printWin = new BrowserWindow({
      width: 900,
      height: 1200,
      show: false,
      parent: mainWindow || undefined,
      backgroundColor: '#ffffff',
      webPreferences: { contextIsolation: true, nodeIntegration: false },
      autoHideMenuBar: true,
    });

    await printWin.loadFile(tmpHtml);
    await new Promise((resolve) => setTimeout(resolve, 450));
    const pdf = await printWin.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
    });
    fs.writeFileSync(tmpPdf, pdf);
    const openError = await shell.openPath(tmpPdf);
    if (openError) throw new Error(openError);
    return { success: true, path: tmpPdf };
  } catch (err) {
    console.error('[Electron] printToPDF failed:', err);
    throw err;
  } finally {
    if (printWin && !printWin.isDestroyed()) printWin.destroy();
    try { fs.unlinkSync(tmpHtml); } catch (_) {}
  }
});

// ── IPC: Open external URL ─────────────────────────────
ipcMain.handle('open-external', async (_event, url) => {
  await shell.openExternal(url);
});

// ── IPC: Fetch remote JSON from main process (avoids renderer CORS) ──
function fetchJson(url) {
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

        let raw = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          raw += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
        response.on('error', reject);
      }).on('error', reject);
    };

    doRequest(url);
  });
}

ipcMain.handle('fetch-json', async (_event, url) => {
  return fetchJson(url);
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
  const AdmZip = (() => {
    try { return require('adm-zip'); } catch (err) {
      writeStatus('admzip_unavailable', { error: err.message });
      return null;
    }
  })();

  if (AdmZip) {
    writeStatus('extracting', { method: 'adm-zip', zipPath });
    return extractWithAdmZip(AdmZip, zipPath);
  }

  writeStatus('extracting', { method: 'powershell-fallback', zipPath });
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

      // Stage update outside the read-only packaged app area, then apply on restart.
      if (fs.existsSync(PENDING_DIST)) {
        fs.rmSync(PENDING_DIST, { recursive: true, force: true });
      }
      fs.cpSync(distSource, PENDING_DIST, { recursive: true });

      // Cleanup
      fs.rmSync(tempExtract, { recursive: true, force: true });
      try { fs.unlinkSync(zipPath); } catch (_) {}

      console.log('[Electron] ✓ dist/ staged successfully');
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

      // Stage update outside the read-only packaged app area, then apply on restart.
      if (fs.existsSync(PENDING_DIST)) {
        fs.rmSync(PENDING_DIST, { recursive: true, force: true });
      }
      fs.cpSync(distSource, PENDING_DIST, { recursive: true });

      // Cleanup
      fs.rmSync(tempExtract, { recursive: true, force: true });
      try { fs.unlinkSync(zipPath); } catch (_) {}

      console.log('[Electron] ✓ dist/ staged via PowerShell');
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

  try {
    // Step 1: Download
    writeStatus('download_start', { url: downloadUrl, zipPath });
    console.log('[Electron] Downloading update from:', downloadUrl);
    await downloadFile(downloadUrl, zipPath, (progress, downloaded, total) => {
      mainWindow?.webContents?.send('download-progress', {
        phase: 'downloading',
        progress,
        downloaded,
        total,
      });
    });
    const zipSize = fs.existsSync(zipPath) ? fs.statSync(zipPath).size : 0;
    writeStatus('download_complete', { zipPath, zipSize });

    // Step 2: Extract and stage to PENDING_DIST
    console.log('[Electron] Extracting and replacing dist/...');
    mainWindow?.webContents?.send('download-progress', {
      phase: 'installing',
      progress: 100,
      downloaded: 0,
      total: 0,
    });

    await extractAndReplaceDist(zipPath);

    const pendingExists = fs.existsSync(PENDING_DIST) && fs.existsSync(path.join(PENDING_DIST, 'index.html'));
    writeStatus('staged', { pendingDist: PENDING_DIST, ready: pendingExists });

    if (!pendingExists) {
      throw new Error('Extraction completed but PENDING_DIST/index.html missing');
    }

    mainWindow?.webContents?.send('download-progress', {
      phase: 'done',
      progress: 100,
      downloaded: 0,
      total: 0,
    });

    return { success: true };
  } catch (err) {
    writeStatus('download_failed', { error: err.message, stack: err.stack });
    console.error('[Electron] download-update failed:', err);
    throw err;
  }
});

// ── IPC: Restart app ───────────────────────────────────
ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit(0);
});

// ── IPC: Get shell version ────────────────────────────
ipcMain.handle('get-shell-version', () => getShellVersion());

// ── IPC: Read last update status (for diagnostics UI) ──
ipcMain.handle('get-update-status', () => readStatus());

// ── IPC: Test update channel connectivity ─────────────
function headRequest(url) {
  return new Promise((resolve) => {
    const doRequest = (reqUrl, redirects = 0) => {
      if (redirects > 5) return resolve({ ok: false, error: 'Too many redirects' });
      const proto = reqUrl.startsWith('https') ? https : http;
      const req = proto.request(reqUrl, { method: 'HEAD' }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return doRequest(response.headers.location, redirects + 1);
        }
        const size = parseInt(response.headers['content-length'] || '0', 10);
        resolve({ ok: response.statusCode === 200, status: response.statusCode, size });
      });
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.end();
    };
    doRequest(url);
  });
}

ipcMain.handle('test-update-channel', async (_event, urls) => {
  const result = { versionJson: { ok: false }, releaseJson: { ok: false }, downloadHead: { ok: false } };
  try {
    const v = await fetchJson(`${urls.versionUrl}?_t=${Date.now()}`);
    result.versionJson = { ok: true, status: 200, data: v };
  } catch (err) {
    result.versionJson = { ok: false, error: err.message };
  }
  try {
    const r = await fetchJson(`${urls.releaseUrl}?_t=${Date.now()}`);
    result.releaseJson = { ok: true, status: 200, data: r };
    if (!urls.downloadUrl && r && r.download_url) urls.downloadUrl = r.download_url;
  } catch (err) {
    result.releaseJson = { ok: false, error: err.message };
  }
  if (urls.downloadUrl) {
    result.downloadHead = await headRequest(urls.downloadUrl);
  } else {
    result.downloadHead = { ok: false, error: 'No download URL available' };
  }
  return result;
});

// ── App lifecycle ──────────────────────────────────────
app.whenReady().then(() => {
  if (!fs.existsSync(UPDATE_DIR)) fs.mkdirSync(UPDATE_DIR, { recursive: true });
  applyPendingUpdateIfAny();
  session.defaultSession.clearCache().then(() => createWindow()).catch(() => createWindow());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
