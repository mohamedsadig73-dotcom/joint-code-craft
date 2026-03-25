import { useEffect, useState, useCallback } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const LOCAL_VERSION = '4.1.1';
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
const PUBLISHED_URL = 'https://dts-store.lovable.app';

export function UpdateChecker() {
  const { t } = useLanguage();
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch(`${PUBLISHED_URL}/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== LOCAL_VERSION) {
        setNewVersion(data.version);
      }
    } catch {
      // Offline or network error — silently ignore
    }
  }, []);

  useEffect(() => {
    // Check on mount after a short delay
    const initialTimer = setTimeout(checkForUpdate, 5000);
    // Then check periodically
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [checkForUpdate]);

  if (!newVersion || dismissed) return null;

  return (
    <div className="fixed bottom-4 start-4 end-4 sm:start-auto sm:end-4 sm:w-96 z-50 bg-primary text-primary-foreground rounded-lg shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="bg-primary-foreground/20 rounded-full p-2 shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{t('updateAvailable')}</p>
          <p className="text-xs opacity-90 mt-1">
            {t('newDesktopVersionAvailable')} (v{newVersion})
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
              onClick={() => {
                window.open(PUBLISHED_URL, '_blank');
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('downloadUpdate')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setDismissed(true)}
            >
              <X className="w-3.5 h-3.5" />
              {t('later')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
