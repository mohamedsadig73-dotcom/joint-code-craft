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
      registerType: 'autoUpdate', // Auto update for seamless updates
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
        // Only cache essential static assets
        globPatterns: ['**/*.{ico,png,svg,woff2}'],
        // CRITICAL: Skip waiting to activate new SW immediately
        skipWaiting: true,
        clientsClaim: true,
        // Clean old caches on every update
        cleanupOutdatedCaches: true,
        // Dynamic cache ID forces refresh
        cacheId: `dts-v4.0.0-${BUILD_VERSION}`,
        // NetworkFirst for ALL requests - always try network first
        runtimeCaching: [
          {
            // All HTML/JS/CSS - NetworkFirst to always get fresh content
            urlPattern: /\.(html|js|css)(\?.*)?$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 5 // 5 minutes only
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days only
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Supabase API - always network first
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly', // Never cache API calls
            options: {
              cacheName: 'supabase-api-cache'
            }
          }
        ],
        // Immediately claim all clients
        navigateFallback: null,
        // Disable offline page fallback to force network
        navigateFallbackDenylist: [/.*/]
      },
      devOptions: {
        enabled: false, // Disable in dev to avoid caching issues
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
