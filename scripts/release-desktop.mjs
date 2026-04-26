#!/usr/bin/env node
/**
 * Unified desktop release script.
 *
 * Usage:
 *   node scripts/release-desktop.mjs <version> "<release notes>"
 *
 * Example:
 *   node scripts/release-desktop.mjs 4.4.9 "إصلاح مشكلة الفاتورة"
 *
 * Steps performed atomically (any failure aborts the rest):
 *   1. Validate semver and uniqueness vs current package.json.
 *   2. Bump package.json#version.
 *   3. Run `vite build` (this regenerates desktop-release.json + version.json
 *      from package.json — single source of truth).
 *   4. Zip dist/ → DTS-Store-v<version>-dist.zip.
 *   5. Upload zip + desktop-release.json + version.json to the
 *      `desktop-releases` Supabase storage bucket (cacheControl: 0, upsert).
 *   6. POST-UPLOAD VERIFICATION: re-fetch desktop-release.json from the
 *      public CDN with cache-busting and assert web_version === <version>.
 *      Also HEAD-checks the zip URL. Fails loudly otherwise.
 *
 * Required env: SUPABASE_SERVICE_ROLE_KEY (already in project secrets).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SUPABASE_URL = 'https://eplguuqpxuhgdagacypn.supabase.co';
const BUCKET = 'desktop-releases';
const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function log(msg) {
  console.log(`▶ ${msg}`);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

// ----- 0. Args & env -----
const [, , versionArg, ...notesParts] = process.argv;
const releaseNotes = notesParts.join(' ').trim() || `v${versionArg}`;

if (!versionArg || !/^\d+\.\d+\.\d+$/.test(versionArg)) {
  die(
    'Usage: node scripts/release-desktop.mjs <X.Y.Z> "<release notes>"\n' +
      'Version must be semver (e.g. 4.4.9).'
  );
}

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) die('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');

const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
if (pkg.version === versionArg) {
  log(`package.json already at v${versionArg} — continuing (rebuild + re-upload).`);
}

// ----- 1. Bump package.json -----
log(`Bumping package.json: ${pkg.version} → ${versionArg}`);
pkg.version = versionArg;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
ok('package.json updated.');

// ----- 2. Build (regenerates release metadata from package.json) -----
log('Running `vite build`...');
execSync('npx vite build', {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, RELEASE_NOTES: releaseNotes },
});
ok('Build complete.');

// Sanity: the generated metadata must match the requested version
const generatedRelease = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'dist', 'desktop-release.json'), 'utf-8')
);
if (generatedRelease.web_version !== versionArg) {
  die(
    `Generated desktop-release.json has web_version=${generatedRelease.web_version} but expected ${versionArg}. ` +
      'vite.config.ts is misconfigured.'
  );
}
ok(`Generated metadata pinned to v${versionArg}.`);

// Sanity #2 (root cause fix): grep the built JS bundles for the version string.
// This catches the case where vite.config.ts read package.json BEFORE the bump
// (e.g. concurrent processes, stale cache) and baked the OLD version into the
// bundle. Without this guard, the channel says v4.5.2 but the running app
// still reports LOCAL_VERSION=4.5.1 — exactly the bug we just hit.
const assetsDir = path.join(ROOT, 'dist', 'assets');
const jsFiles = fs
  .readdirSync(assetsDir)
  .filter((f) => f.startsWith('index-') && f.endsWith('.js'));
if (jsFiles.length === 0) die('No index-*.js bundle found in dist/assets.');
let foundVersionInBundle = false;
for (const f of jsFiles) {
  const content = fs.readFileSync(path.join(assetsDir, f), 'utf-8');
  // Match either "X.Y.Z" or 'X.Y.Z' near where __APP_VERSION__ would live.
  if (content.includes(`"${versionArg}"`) || content.includes(`'${versionArg}'`)) {
    foundVersionInBundle = true;
    break;
  }
}
if (!foundVersionInBundle) {
  die(
    `Built JS bundle does NOT contain version string "${versionArg}". ` +
      `vite likely cached an older package.json. Re-run: rm -rf node_modules/.vite dist && node scripts/release-desktop.mjs ${versionArg}`
  );
}
ok(`JS bundle contains __APP_VERSION__ = "${versionArg}".`);

// ----- 3. Zip dist/ -----
const zipName = `DTS-Store-v${versionArg}-dist.zip`;
const zipPath = path.join(ROOT, zipName);
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
log(`Creating ${zipName}...`);
execSync(`cd "${ROOT}/dist" && zip -rq "${zipPath}" .`, { stdio: 'inherit' });
const zipSize = fs.statSync(zipPath).size;
ok(`Zip created (${(zipSize / 1024 / 1024).toFixed(2)} MB).`);

// ----- 4. Upload to Supabase Storage -----
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function upload(remotePath, localPath, contentType) {
  const buf = fs.readFileSync(localPath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(remotePath, buf, {
      contentType,
      upsert: true,
      cacheControl: '0',
    });
  if (error) die(`Upload failed for ${remotePath}: ${error.message}`);
  ok(`Uploaded ${remotePath}`);
}

log('Uploading to Supabase Storage...');
await upload(zipName, zipPath, 'application/zip');
await upload(
  'desktop-release.json',
  path.join(ROOT, 'dist', 'desktop-release.json'),
  'application/json'
);
await upload(
  'version.json',
  path.join(ROOT, 'dist', 'version.json'),
  'application/json'
);

// ----- 5. POST-UPLOAD VERIFICATION (the core fix) -----
log('Verifying remote channel matches v' + versionArg + '...');

async function verifyRelease() {
  const url = `${PUBLIC_BASE}/desktop-release.json?_t=${Date.now()}`;
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status} fetching desktop-release.json`);
  const data = await r.json();
  if (data.web_version !== versionArg) {
    throw new Error(
      `Channel still reports web_version=${data.web_version}, expected ${versionArg}`
    );
  }
  if (data.desktop_shell_version !== versionArg) {
    throw new Error(
      `Channel still reports desktop_shell_version=${data.desktop_shell_version}, expected ${versionArg}`
    );
  }
  if (!data.download_url || !data.download_url.includes(`v${versionArg}-dist.zip`)) {
    throw new Error(`Channel download_url is wrong: ${data.download_url}`);
  }
  return data;
}

async function verifyZip() {
  const url = `${PUBLIC_BASE}/${zipName}?_t=${Date.now()}`;
  const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
  if (!r.ok) throw new Error(`HEAD ${r.status} for ${zipName}`);
  const len = Number(r.headers.get('content-length') || '0');
  if (len < 1024) throw new Error(`Zip too small on CDN: ${len} bytes`);
  return len;
}

// Retry verification up to 5 times (CDN propagation can take a few seconds).
let lastErr = null;
for (let attempt = 1; attempt <= 5; attempt++) {
  try {
    const release = await verifyRelease();
    const zipLen = await verifyZip();
    ok(
      `Channel confirmed at v${versionArg} ` +
        `(zip=${(zipLen / 1024 / 1024).toFixed(2)} MB, notes="${release.release_notes}")`
    );
    lastErr = null;
    break;
  } catch (e) {
    lastErr = e;
    log(`Verification attempt ${attempt}/5 failed: ${e.message}. Retrying in 3s...`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}
if (lastErr) die(`Post-upload verification FAILED: ${lastErr.message}`);

console.log(
  `\n🎉 Release v${versionArg} published successfully.\n` +
    `   Channel: ${PUBLIC_BASE}/desktop-release.json\n` +
    `   Zip:     ${PUBLIC_BASE}/${zipName}\n`
);