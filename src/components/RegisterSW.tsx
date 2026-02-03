import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// App version - update this when deploying
const APP_VERSION = '2.2.0';

export function RegisterSW() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log(`[DTS v${APP_VERSION}] SW Registered`);
      // Check for updates every 60 seconds
      if (r) {
        setInterval(() => {
          console.log(`[DTS v${APP_VERSION}] Checking for updates...`);
          r.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[DTS] SW registration error', error);
    },
    onNeedRefresh() {
      console.log(`[DTS v${APP_VERSION}] New version available! Auto-updating...`);
    },
  });

  // Auto-update when new version is available
  useEffect(() => {
    if (needRefresh) {
      console.log(`[DTS v${APP_VERSION}] Applying update automatically...`);
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  // Log current version on mount
  useEffect(() => {
    console.log(`[DTS] App Version: ${APP_VERSION}`);
    console.log(`[DTS] Build Time: ${new Date().toISOString()}`);
  }, []);

  return null;
}
