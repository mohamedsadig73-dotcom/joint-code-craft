import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Build version for cache busting
const BUILD_VERSION = Date.now().toString();

// Single source of truth: read version from package.json
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
);
const APP_VERSION: string = pkg.version;

// Read release notes & min_shell_version overrides from env (set by release script)
const RELEASE_NOTES =
  process.env.RELEASE_NOTES ||
  `v${APP_VERSION}`;
const MIN_SHELL_VERSION = process.env.MIN_SHELL_VERSION || '4.4.5';
const STORAGE_BASE =
  'https://eplguuqpxuhgdagacypn.supabase.co/storage/v1/object/public/desktop-releases';

// Plugin to auto-generate version.json AND desktop-release.json on build.
// These files MUST NOT be edited by hand — package.json drives everything.
function versionJsonPlugin() {
  return {
    name: 'version-json',
    writeBundle() {
      const versionData = JSON.stringify(
        { version: APP_VERSION, build: BUILD_VERSION },
        null,
        2
      );
      const releaseData = JSON.stringify(
        {
          desktop_shell_version: APP_VERSION,
          min_shell_version: MIN_SHELL_VERSION,
          web_version: APP_VERSION,
          download_url: `${STORAGE_BASE}/DTS-Store-v${APP_VERSION}-dist.zip`,
          full_download_url: `${STORAGE_BASE}/DTS-Store-win32-x64-v${MIN_SHELL_VERSION}.zip`,
          release_notes: RELEASE_NOTES,
          mandatory: false,
        },
        null,
        2
      );

      const distDir = path.resolve(__dirname, 'dist');
      const publicDir = path.resolve(__dirname, 'public');
      const rootDir = path.resolve(__dirname);

      fs.writeFileSync(path.join(distDir, 'version.json'), versionData);
      fs.writeFileSync(path.join(publicDir, 'version.json'), versionData);

      fs.writeFileSync(path.join(distDir, 'desktop-release.json'), releaseData);
      fs.writeFileSync(path.join(publicDir, 'desktop-release.json'), releaseData);
      fs.writeFileSync(path.join(rootDir, 'desktop-release.json'), releaseData);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    versionJsonPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'supabase': ['@supabase/supabase-js'],
          'excel-export': ['exceljs'],
          'date-utils': ['date-fns'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
    target: 'esnext',
    cssMinify: true,
  }
}));
