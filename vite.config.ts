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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Skip waiting to activate new SW immediately
        skipWaiting: true,
        clientsClaim: true,
        // Clean old caches on update
        cleanupOutdatedCaches: true,
        // Add version to cache names for better invalidation
        cacheId: `dts-${BUILD_VERSION}`,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 2 // Reduced to 2 minutes
              }
            }
          }
        ]
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
