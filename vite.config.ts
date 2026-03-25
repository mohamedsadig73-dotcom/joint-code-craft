import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Build version for cache busting
const BUILD_VERSION = Date.now().toString();
const APP_VERSION = '4.2.0';

// Plugin to auto-update version.json on build
function versionJsonPlugin() {
  return {
    name: 'version-json',
    writeBundle() {
      const versionData = JSON.stringify({
        version: APP_VERSION,
        build: BUILD_VERSION,
      }, null, 2);
      // Write to dist (published output)
      fs.writeFileSync(path.resolve(__dirname, 'dist', 'version.json'), versionData);
      // Also update source for reference
      fs.writeFileSync(path.resolve(__dirname, 'public', 'version.json'), versionData);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
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
          'excel-export': ['xlsx'],
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
