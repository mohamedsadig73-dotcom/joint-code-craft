import { useEffect, useState, useCallback } from 'react';
import { Download, X, RefreshCw, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { forceAppUpdate } from '@/components/ForceUpdateButton';

declare const __BUILD_VERSION__: string;
declare const __APP_VERSION__: string;

type PublishedVersionPayload = {
  version?: string;
  build?: string;
};

type DesktopReleasePayload = {
  desktop_shell_version: string;
  web_version: string;
  download_url: string;
  release_notes?: string;
  mandatory?: boolean;
};

const LOCAL_BUILD = __BUILD_VERSION__;
const LOCAL_VERSION = __APP_VERSION__;
const CHECK_INTERVAL = 5 * 60 * 1000;
const PUBLISHED_URL = 'https://dts-store-qatar-2026.lovable.app';
const VERSION_URL = `${PUBLISHED_URL}/version.json`;
const DESKTOP_RELEASE_URL = `${PUBLISHED_URL}/desktop-release.json`;

const isElectron = !!window.electronAPI;

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

async function fetchJSON<T>(url: string): Promise<T> {
  if (window.electronAPI?.getPublishedVersion) {
    return window.electronAPI.getPublishedVersion(url) as Promise<T>;
  }
  const response = await fetch(`${url}?_t=${Date.now()}`, {
    cache: 'no-store',
    mode: 'cors',
  });
  if (response.ok) return response.json();
  throw new Error(`Fetch failed: ${response.status}`);
}

type UpdateInfo =
  | { type: 'web'; version: string }
  | { type: 'desktop'; version: string; downloadUrl: string; releaseNotes?: string; mandatory?: boolean };

type DownloadState = 'idle' | 'downloading' | 'done' | 'error';

export function UpdateChecker() {
  const { t, language } = useLanguage();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);

  const checkForUpdate = useCallback(async () => {
    try {
      if (isElectron) {
        try {
          const desktop = await fetchJSON<DesktopReleasePayload>(DESKTOP_RELEASE_URL);
          if (compareVersions(desktop.desktop_shell_version, LOCAL_VERSION) > 0) {
            setUpdateInfo({
              type: 'desktop',
              version: desktop.desktop_shell_version,
              downloadUrl: desktop.download_url,
              releaseNotes: desktop.release_notes,
              mandatory: desktop.mandatory,
            });
            setDismissed(false);
            console.log('[UpdateChecker] Desktop update available:', desktop.desktop_shell_version);

            // Auto-download for mandatory updates
            if (desktop.mandatory && window.electronAPI?.downloadUpdate) {
              handleAutoDownload(desktop.download_url);
            }
            return;
          }
        } catch {
          console.log('[UpdateChecker] Could not fetch desktop release info');
        }
      }

      const data = await fetchJSON<PublishedVersionPayload>(VERSION_URL);
      if (isRemoteUpdateAvailable(data)) {
        setUpdateInfo({
          type: 'web',
          version: data.version || data.build || t('updateAvailable'),
        });
        setDismissed(false);
        console.log('[UpdateChecker] Web update available:', data.version || data.build);
      } else {
        console.log('[UpdateChecker] App is up to date. Local:', LOCAL_VERSION, 'Remote:', data.version);
      }
    } catch {
      // Silently ignore
    }
  }, [t]);

  const handleAutoDownload = useCallback(async (downloadUrl: string) => {
    if (!window.electronAPI?.downloadUpdate) return;
    setDownloadState('downloading');
    setDownloadProgress(0);

    const cleanup = window.electronAPI.onDownloadProgress?.((data) => {
      setDownloadProgress(data.progress);
    });

    try {
      await window.electronAPI.downloadUpdate(downloadUrl);
      setDownloadState('done');
    } catch (err) {
      console.error('[UpdateChecker] Auto-download failed:', err);
      setDownloadState('error');
    } finally {
      cleanup?.();
    }
  }, []);

  const handleApplyUpdate = useCallback(async () => {
    if (!updateInfo) return;

    if (updateInfo.type === 'desktop') {
      if (window.electronAPI?.downloadUpdate && downloadState === 'idle') {
        // Start download in background
        handleAutoDownload(updateInfo.downloadUrl);
      } else if (downloadState === 'done' && window.electronAPI?.restartApp) {
        // Restart to apply
        await window.electronAPI.restartApp();
      } else if (window.electronAPI?.openExternal) {
        // Fallback: open in browser
        await window.electronAPI.openExternal(updateInfo.downloadUrl);
      }
    } else {
      await forceAppUpdate();
    }
  }, [updateInfo, downloadState, handleAutoDownload]);

  useEffect(() => {
    const initialTimer = setTimeout(checkForUpdate, 3000);
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [checkForUpdate]);

  if (!updateInfo || dismissed) return null;

  const isDesktop = updateInfo.type === 'desktop';
  const isAr = language === 'ar';

  const getButtonLabel = () => {
    if (isDesktop) {
      if (downloadState === 'downloading') return isAr ? 'جاري التحميل...' : 'Downloading...';
      if (downloadState === 'done') return isAr ? 'إعادة التشغيل للتحديث' : 'Restart to Update';
      if (downloadState === 'error') return isAr ? 'فشل التحميل - حاول مجدداً' : 'Download Failed - Retry';
      return t('downloadUpdate') || t('updateNow');
    }
    return t('updateNow');
  };

  const getButtonIcon = () => {
    if (downloadState === 'done') return <CheckCircle className="w-3.5 h-3.5" />;
    if (isDesktop) return <ExternalLink className="w-3.5 h-3.5" />;
    return <RefreshCw className="w-3.5 h-3.5" />;
  };

  return (
    <div className="fixed bottom-4 start-4 end-4 sm:start-auto sm:end-4 sm:w-96 z-50 bg-primary text-primary-foreground rounded-lg shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="bg-primary-foreground/20 rounded-full p-2 shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">
            {isDesktop ? t('desktopUpdateAvailable') || t('updateAvailable') : t('updateAvailable')}
          </p>
          <p className="text-xs opacity-90 mt-1">
            {isDesktop
              ? `${t('newDesktopVersionAvailable')} (v${updateInfo.version})`
              : `${t('newVersionAvailable') || t('updateAvailable')} (v${updateInfo.version})`}
          </p>
          {isDesktop && updateInfo.releaseNotes && (
            <p className="text-xs opacity-75 mt-1">{updateInfo.releaseNotes}</p>
          )}

          {/* Download progress bar */}
          {downloadState === 'downloading' && (
            <div className="mt-2">
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-xs opacity-75 mt-1">{downloadProgress}%</p>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
              onClick={handleApplyUpdate}
              disabled={downloadState === 'downloading'}
            >
              {getButtonIcon()}
              {getButtonLabel()}
            </Button>
            {!(isDesktop && updateInfo.mandatory) && downloadState !== 'downloading' && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setDismissed(true)}
              >
                <X className="w-3.5 h-3.5" />
                {t('later')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
