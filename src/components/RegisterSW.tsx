import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// App version - update this when deploying
const APP_VERSION = '2.3.0';
const BUILD_TIMESTAMP = Date.now();

export function RegisterSW() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log(`[DTS v${APP_VERSION}] SW Registered`);
      // Check for updates every 30 seconds
      if (r) {
        setInterval(() => {
          console.log(`[DTS v${APP_VERSION}] Checking for updates...`);
          r.update();
        }, 30 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[DTS] SW registration error', error);
    },
    onNeedRefresh() {
      console.log(`[DTS v${APP_VERSION}] New version available! Auto-updating...`);
      setShowUpdateBanner(true);
    },
  });

  // Auto-update when new version is available (with user notification)
  useEffect(() => {
    if (needRefresh) {
      console.log(`[DTS v${APP_VERSION}] New version detected, showing update banner...`);
      setShowUpdateBanner(true);
      
      // Auto-update after 5 seconds if user doesn't interact
      const autoUpdateTimer = setTimeout(() => {
        console.log(`[DTS v${APP_VERSION}] Auto-updating after timeout...`);
        handleUpdate();
      }, 5000);
      
      return () => clearTimeout(autoUpdateTimer);
    }
  }, [needRefresh, updateServiceWorker]);

  // Log current version on mount
  useEffect(() => {
    console.log(`[DTS] App Version: ${APP_VERSION} | Build: ${BUILD_TIMESTAMP}`);
    
    // Store version in localStorage for debugging
    const storedVersion = localStorage.getItem('dts-app-version');
    const storedBuild = localStorage.getItem('dts-build-timestamp');
    
    if (storedVersion !== APP_VERSION || storedBuild !== String(BUILD_TIMESTAMP)) {
      console.log(`[DTS] Version changed: ${storedVersion} -> ${APP_VERSION}`);
      localStorage.setItem('dts-app-version', APP_VERSION);
      localStorage.setItem('dts-build-timestamp', String(BUILD_TIMESTAMP));
    }
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    console.log(`[DTS v${APP_VERSION}] User initiated update...`);
    
    try {
      // Clear all caches first
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[DTS] All caches cleared');
      }
      
      // Update service worker
      await updateServiceWorker(true);
      
      // Force reload
      window.location.reload();
    } catch (error) {
      console.error('[DTS] Update failed:', error);
      setIsUpdating(false);
    }
  };

  if (!showUpdateBanner) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground p-3 shadow-lg animate-in slide-in-from-top-2">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RefreshCw className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            {isUpdating ? 'جاري التحديث...' : 'يتوفر تحديث جديد للتطبيق'}
          </span>
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowUpdateBanner(false)}
            disabled={isUpdating}
            className="text-primary-foreground hover:text-primary-foreground/80"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Export version for debugging
export const getAppVersion = () => ({ version: APP_VERSION, build: BUILD_TIMESTAMP });
