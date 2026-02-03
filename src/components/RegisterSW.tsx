import { useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

// App version - update this when deploying
const APP_VERSION = '2.1.0';

export function RegisterSW() {
  const { toast } = useToast();

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
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
      console.log(`[DTS v${APP_VERSION}] New version available!`);
    },
  });

  const handleUpdate = useCallback(() => {
    console.log(`[DTS v${APP_VERSION}] Updating to new version...`);
    updateServiceWorker(true);
    setNeedRefresh(false);
  }, [updateServiceWorker, setNeedRefresh]);

  // Show update toast when new version is available
  useEffect(() => {
    if (needRefresh) {
      toast({
        title: '🎉 تحديث جديد متاح!',
        description: 'انقر للحصول على أحدث إصدار من التطبيق',
        duration: 0, // Don't auto-dismiss
        action: (
          <button
            onClick={handleUpdate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث الآن
          </button>
        ),
      });
    }
  }, [needRefresh, toast, handleUpdate]);

  // Show offline ready toast
  useEffect(() => {
    if (offlineReady) {
      toast({
        title: '✓ جاهز للعمل بدون إنترنت',
        description: 'يمكنك استخدام التطبيق حتى بدون اتصال',
        duration: 3000,
      });
    }
  }, [offlineReady, toast]);

  // Log current version on mount
  useEffect(() => {
    console.log(`[DTS] App Version: ${APP_VERSION}`);
    console.log(`[DTS] Build Time: ${new Date().toISOString()}`);
  }, []);

  return null;
}
