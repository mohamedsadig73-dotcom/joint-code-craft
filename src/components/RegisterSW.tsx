import { useEffect, useState, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// App version - MUST be updated with every deployment
const APP_VERSION = '2.4.0';
const BUILD_TIMESTAMP = Date.now();
const DEPLOYED_AT = new Date().toISOString();

// Version check API endpoint (for debugging)
const getVersionInfo = () => ({
  version: APP_VERSION,
  build: BUILD_TIMESTAMP,
  deployedAt: DEPLOYED_AT,
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString(),
});

export function RegisterSW() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateAttempts, setUpdateAttempts] = useState(0);
  
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log(`[DTS v${APP_VERSION}] SW Registered at ${DEPLOYED_AT}`);
      // Check for updates every 15 seconds (more aggressive)
      if (r) {
        setInterval(() => {
          console.log(`[DTS v${APP_VERSION}] Checking for updates...`);
          r.update().catch(err => console.error('[DTS] Update check failed:', err));
        }, 15 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[DTS] SW registration error', error);
    },
    onNeedRefresh() {
      console.log(`[DTS v${APP_VERSION}] New version available! Triggering update...`);
      setShowUpdateBanner(true);
    },
  });

  // Force update function with comprehensive cache clearing
  const handleUpdate = useCallback(async () => {
    setIsUpdating(true);
    setUpdateAttempts(prev => prev + 1);
    console.log(`[DTS v${APP_VERSION}] Update attempt #${updateAttempts + 1}...`);
    
    try {
      // 1. Unregister ALL service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('[DTS] SW unregistered:', registration.scope);
        }
      }
      
      // 2. Clear ALL cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(async (name) => {
          await caches.delete(name);
          console.log('[DTS] Cache deleted:', name);
        }));
        console.log('[DTS] All caches cleared');
      }
      
      // 3. Clear localStorage version markers
      localStorage.removeItem('dts-app-version');
      localStorage.removeItem('dts-build-timestamp');
      localStorage.removeItem('dts-html-version');
      localStorage.removeItem('dts-force-clear-v2');
      
      // 4. Update service worker if available
      try {
        await updateServiceWorker(true);
      } catch (e) {
        console.warn('[DTS] SW update failed, continuing with reload...', e);
      }
      
      // 5. Force reload with cache busting
      const reloadUrl = window.location.origin + window.location.pathname + '?_refresh=' + Date.now();
      window.location.replace(reloadUrl);
      
    } catch (error) {
      console.error('[DTS] Update failed:', error);
      setIsUpdating(false);
      
      // Fallback: simple reload
      if (updateAttempts >= 2) {
        console.log('[DTS] Multiple attempts failed, trying hard reload...');
        window.location.href = window.location.origin + '?force=' + Date.now();
      }
    }
  }, [updateAttempts, updateServiceWorker]);

  // Auto-update when new version is available
  useEffect(() => {
    if (needRefresh) {
      console.log(`[DTS v${APP_VERSION}] New version detected, auto-updating in 3 seconds...`);
      setShowUpdateBanner(true);
      
      // Auto-update after 3 seconds
      const autoUpdateTimer = setTimeout(() => {
        console.log(`[DTS v${APP_VERSION}] Auto-updating...`);
        handleUpdate();
      }, 3000);
      
      return () => clearTimeout(autoUpdateTimer);
    }
  }, [needRefresh, handleUpdate]);

  // Log current version on mount and check for stale versions
  useEffect(() => {
    const versionInfo = getVersionInfo();
    console.log(`[DTS] App Version: ${APP_VERSION} | Build: ${BUILD_TIMESTAMP}`);
    console.log(`[DTS] Version Info:`, JSON.stringify(versionInfo));
    
    // Store version
    const storedVersion = localStorage.getItem('dts-app-version');
    if (storedVersion !== APP_VERSION) {
      console.log(`[DTS] Version changed: ${storedVersion} -> ${APP_VERSION}`);
      localStorage.setItem('dts-app-version', APP_VERSION);
      localStorage.setItem('dts-build-timestamp', String(BUILD_TIMESTAMP));
    }
    
    // Check if we're running a stale version (cached for more than 24 hours)
    const lastCheck = localStorage.getItem('dts-last-update-check');
    const now = Date.now();
    if (lastCheck && (now - parseInt(lastCheck)) > 24 * 60 * 60 * 1000) {
      console.log('[DTS] Cache may be stale (>24h), prompting update...');
      setShowUpdateBanner(true);
    }
    localStorage.setItem('dts-last-update-check', String(now));
    
    // Listen for visibility changes to check for updates
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[DTS] Tab became visible, checking for updates...');
        // Trigger update check when user returns to tab
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  if (!showUpdateBanner) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground p-3 shadow-lg animate-in slide-in-from-top-2">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isUpdating ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {isUpdating ? 'جاري التحديث...' : 'يتوفر تحديث جديد للتطبيق'}
            </span>
            <span className="text-xs opacity-75">
              الإصدار الحالي: v{APP_VERSION}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            تحديث الآن
          </Button>
          {!isUpdating && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowUpdateBanner(false)}
              className="text-primary-foreground hover:text-primary-foreground/80"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Export version for debugging
export const getAppVersion = () => getVersionInfo();
