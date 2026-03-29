import { useEffect, useState, useCallback } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { forceAppUpdate } from '@/components/ForceUpdateButton';

declare const __BUILD_VERSION__: string;
declare const __APP_VERSION__: string;

type PublishedVersionPayload = {
  version?: string;
  build?: string;
};

const LOCAL_BUILD = __BUILD_VERSION__;
const LOCAL_VERSION = __APP_VERSION__;
const CHECK_INTERVAL = 5 * 60 * 1000;
const PUBLISHED_URL = 'https://dts-store.lovable.app';
const VERSION_URL = `${PUBLISHED_URL}/version.json`;

function parseBuildNumber(value?: string) {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

function compareVersions(remoteVersion?: string, localVersion?: string) {
  if (!remoteVersion || !localVersion) return 0;

  const remote = remoteVersion.split('.').map((part) => Number(part) || 0);
  const local = localVersion.split('.').map((part) => Number(part) || 0);
  const maxLength = Math.max(remote.length, local.length);

  for (let index = 0; index < maxLength; index += 1) {
    const remotePart = remote[index] ?? 0;
    const localPart = local[index] ?? 0;

    if (remotePart > localPart) return 1;
    if (remotePart < localPart) return -1;
  }

  return 0;
}

function isRemoteUpdateAvailable(remoteData: PublishedVersionPayload) {
  const remoteBuild = parseBuildNumber(remoteData.build);
  const localBuild = parseBuildNumber(LOCAL_BUILD);

  if (remoteBuild !== null && localBuild !== null) {
    return remoteBuild > localBuild;
  }

  return compareVersions(remoteData.version, LOCAL_VERSION) > 0;
}

async function fetchPublishedVersion(): Promise<PublishedVersionPayload> {
  const response = await fetch(`${VERSION_URL}?_t=${Date.now()}`, {
    cache: 'no-store',
    mode: 'cors',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch version: ${response.status}`);
  }

  return response.json();
}

export function UpdateChecker() {
  const { t } = useLanguage();
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      const data = await fetchPublishedVersion();

      if (isRemoteUpdateAvailable(data)) {
        setNewVersion(data.version || data.build || t('updateAvailable'));
        setDismissed(false);
        console.log('[UpdateChecker] New version available:', data.version || data.build);
      } else {
        console.log('[UpdateChecker] App is up to date. Local:', LOCAL_VERSION, 'Remote:', data.version);
      }
    } catch {
      // Silently ignore - expected in preview/development environments
    }
  }, [t]);

  const handleApplyUpdate = useCallback(async () => {
    await forceAppUpdate();
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(checkForUpdate, 3000);
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
              onClick={handleApplyUpdate}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('updateNow')}
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
