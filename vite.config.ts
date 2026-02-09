import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// Build version for cache busting
const BUILD_VERSION = Date.now().toString();

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
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png', 'sw-cleanup.js'],
      manifest: {
        name: 'نظام تتبع الإقرارات - DTS',
        short_name: 'DTS',
        description: 'نظام ذكي لتتبع وإدارة الإقرارات بشكل رقمي مع تحديثات فورية وتقارير شاملة',
        theme_color: '#1A1F2C',
        background_color: '#0F1117',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'ar',
        dir: 'rtl',
        icons: [
          {
            src: '/pwa-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // CRITICAL FIX: Do NOT precache anything - force network for everything
        globPatterns: [],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        cacheId: `dts-v4.0.0-${BUILD_VERSION}`,
        // NO runtime caching - everything goes to network
        runtimeCaching: [],
        // No navigate fallback
        navigateFallback: null,
        navigateFallbackDenylist: [/.*/]
      },
      devOptions: {
        enabled: false,
        type: 'module'
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Add hash to file names for cache busting
        entryFileNames: `assets/[name]-[hash]-${BUILD_VERSION}.js`,
        chunkFileNames: `assets/[name]-[hash]-${BUILD_VERSION}.js`,
        assetFileNames: `assets/[name]-[hash]-${BUILD_VERSION}.[ext]`,
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'chart-vendor': ['recharts', 'echarts', 'echarts-for-react'],
          'supabase': ['@supabase/supabase-js'],
          'excel-export': ['xlsx'],
          'date-utils': ['date-fns'],
          'framer': ['framer-motion'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // Performance optimizations
    minify: 'esbuild',
    target: 'esnext',
    cssMinify: true,
  }
}));
