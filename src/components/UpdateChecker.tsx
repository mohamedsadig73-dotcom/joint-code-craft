import { useEffect, useState, useCallback } from 'react';
import { Download, X, RefreshCw, ExternalLink, CheckCircle, Loader2, Package, Copy, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { forceAppUpdate } from '@/components/ForceUpdateButton';
import { useUpdateLogger } from '@/hooks/useUpdateLogger';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { classifyUpdateError, compareVersions, sleep } from '@/utils/updateErrors';

declare const __BUILD_VERSION__: string;
declare const __APP_VERSION__: string;

type PublishedVersionPayload = { version?: string; build?: string };
type DesktopReleasePayload = {
  desktop_shell_version: string;
  min_shell_version?: string;
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

function isRemoteUpdateAvailable(data: PublishedVersionPayload) {
  const rb = parseBuildNumber(data.build);
  const lb = parseBuildNumber(LOCAL_BUILD);
  if (rb !== null && lb !== null) return rb > lb;
  return compareVersions(data.version, LOCAL_VERSION) > 0;
}

async function fetchJSON<T>(url: string): Promise<T> {
  if (window.electronAPI?.getPublishedVersion) {
    return window.electronAPI.getPublishedVersion(url) as Promise<T>;
  }
  const r = await fetch(`${url}?_t=${Date.now()}`, { cache: 'no-store', mode: 'cors' });
  if (r.ok) return r.json();
  throw new Error(`Fetch failed: ${r.status}`);
}

type UpdateInfo =
  | { type: 'web'; version: string }
  | { type: 'desktop'; version: string; downloadUrl: string; releaseNotes?: string; mandatory?: boolean };

type Phase = 'idle' | 'downloading' | 'installing' | 'done' | 'error';

const MAX_RETRIES = 3;
const BACKOFF_MS = [2000, 5000, 10000]; // 2s, 5s, 10s

export function UpdateChecker() {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const { log } = useUpdateLogger();
  const navigate = useNavigate();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [shellOutdated, setShellOutdated] = useState(false);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [installedShellVersion, setInstalledShellVersion] = useState<string>(LOCAL_VERSION);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [nextRetryIn, setNextRetryIn] = useState(0);

  const runDownloadWithRetry = useCallback(
    async (info: Extract<UpdateInfo, { type: 'desktop' }>) => {
      setPhase('downloading');
      setProgress(0);
      setErrorReason(null);
      setRetryCount(0);

      let lastError: unknown = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        setRetryCount(attempt + 1);
        await log({
          phase: 'download',
          status: 'info',
          targetVersion: info.version,
          attemptedUrl: info.downloadUrl,
          metadata: { attempt: attempt + 1, max: MAX_RETRIES },
        });
        try {
          await window.electronAPI?.downloadUpdate(info.downloadUrl);
          setPhase('done');
          await log({
            phase: 'done',
            status: 'success',
            targetVersion: info.version,
            attemptedUrl: info.downloadUrl,
            metadata: { attempt: attempt + 1 },
          });
          return;
        } catch (err) {
          lastError = err;
          const reason = err instanceof Error ? err.message : String(err);
          console.error(`[UpdateChecker] Attempt ${attempt + 1} failed:`, reason);
          await log({
            phase: 'failed',
            status: 'error',
            targetVersion: info.version,
            attemptedUrl: info.downloadUrl,
            errorMessage: reason,
            metadata: { attempt: attempt + 1, max: MAX_RETRIES },
          });

          if (attempt < MAX_RETRIES - 1) {
            // Backoff with countdown
            setIsRetrying(true);
            const wait = BACKOFF_MS[attempt] ?? 5000;
            const startedAt = Date.now();
            while (Date.now() - startedAt < wait) {
              setNextRetryIn(Math.ceil((wait - (Date.now() - startedAt)) / 1000));
              await sleep(250);
            }
            setIsRetrying(false);
            setNextRetryIn(0);
            setProgress(0);
          }
        }
      }

      // All attempts failed
      const finalReason = lastError instanceof Error ? lastError.message : String(lastError);
      setErrorReason(finalReason);
      setPhase('error');
    },
    [log]
  );

  const copyErrorReport = useCallback(async () => {
    if (!updateInfo) return;
    const lines = [
      `=== ${isAr ? 'تقرير فشل التحديث' : 'Update Failure Report'} ===`,
      `Generated: ${new Date().toISOString()}`,
      `App version: v${LOCAL_VERSION}`,
      `Installed shell: v${installedShellVersion}`,
      `Target version: v${updateInfo.version}`,
      updateInfo.type === 'desktop' ? `Download URL: ${updateInfo.downloadUrl}` : '',
      `Attempts made: ${retryCount}/${MAX_RETRIES}`,
      `Environment: ${isElectron ? 'Electron' : 'Web'}`,
      `User-Agent: ${navigator.userAgent}`,
      '',
      '--- Failure reason ---',
      errorReason ?? '(none)',
    ].filter(Boolean);
    await navigator.clipboard.writeText(lines.join('\n'));
    toast({
      title: t('reportCopied'),
      description: t('reportCopiedDesc'),
    });
  }, [updateInfo, errorReason, retryCount, installedShellVersion, isAr, t]);

  const checkForUpdate = useCallback(async () => {
    try {
      if (isElectron) {
        try {
          const d = await fetchJSON<DesktopReleasePayload>(DESKTOP_RELEASE_URL);
          // Check shell compatibility
          let localShell = LOCAL_VERSION;
          if (window.electronAPI?.getShellVersion) {
            try { localShell = await window.electronAPI.getShellVersion(); } catch { /* ignore */ }
          }
          setInstalledShellVersion(localShell);
          if (d.min_shell_version && compareVersions(localShell, d.min_shell_version) < 0) {
            setShellOutdated(true);
            setUpdateInfo({
              type: 'desktop',
              version: d.desktop_shell_version,
              downloadUrl: d.download_url,
              releaseNotes: d.release_notes,
              mandatory: true,
            });
            setDismissed(false);
            await log({
              phase: 'shell-mismatch',
              status: 'error',
              targetVersion: d.desktop_shell_version,
              shellVersion: localShell,
              attemptedUrl: d.download_url,
              errorMessage: `Local shell v${localShell} < min required v${d.min_shell_version}`,
            });
            return;
          }
          // Compare against installed shell version (not bundled web LOCAL_VERSION)
          if (compareVersions(d.desktop_shell_version, localShell) > 0) {
            setUpdateInfo({
              type: 'desktop',
              version: d.desktop_shell_version,
              downloadUrl: d.download_url,
              releaseNotes: d.release_notes,
              mandatory: d.mandatory,
            });
            setDismissed(false);
            await log({
              phase: 'check',
              status: 'success',
              targetVersion: d.desktop_shell_version,
              attemptedUrl: DESKTOP_RELEASE_URL,
            });
            console.log('[UpdateChecker] Desktop update:', d.desktop_shell_version);
            return;
          }
        } catch (err) {
          await log({
            phase: 'check',
            status: 'error',
            attemptedUrl: DESKTOP_RELEASE_URL,
            errorMessage: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const data = await fetchJSON<PublishedVersionPayload>(VERSION_URL);
      if (isRemoteUpdateAvailable(data)) {
        setUpdateInfo({ type: 'web', version: data.version || data.build || '' });
        setDismissed(false);
        await log({
          phase: 'check',
          status: 'success',
          targetVersion: data.version,
          attemptedUrl: VERSION_URL,
        });
      }
    } catch (err) {
      await log({
        phase: 'check',
        status: 'error',
        attemptedUrl: VERSION_URL,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }, [t, log]);

  // Listen for progress events from Electron
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onDownloadProgress) return;
    const cleanup = window.electronAPI.onDownloadProgress((data) => {
      if (data.phase === 'downloading') {
        setPhase('downloading');
        setProgress(data.progress);
      } else if (data.phase === 'installing') {
        setPhase('installing');
        setProgress(100);
      } else if (data.phase === 'done') {
        setPhase('done');
        setProgress(100);
      }
    });
    return cleanup;
  }, []);

  const handleClick = useCallback(async () => {
    if (!updateInfo) return;

    if (shellOutdated && updateInfo.type === 'desktop') {
      if (window.electronAPI?.openExternal) {
        await window.electronAPI.openExternal(updateInfo.downloadUrl);
      } else {
        window.open(updateInfo.downloadUrl, '_blank');
      }
      return;
    }

    if (updateInfo.type === 'desktop' && isElectron) {
      if (phase === 'done') {
        await window.electronAPI?.restartApp();
      } else if (phase === 'idle' || phase === 'error') {
        await runDownloadWithRetry(updateInfo);
      }
    } else if (updateInfo.type === 'desktop' && window.electronAPI?.openExternal) {
      await window.electronAPI.openExternal(updateInfo.downloadUrl);
    } else {
      await forceAppUpdate();
    }
  }, [updateInfo, phase, shellOutdated, log]);

  useEffect(() => {
    const t1 = setTimeout(checkForUpdate, 3000);
    const iv = setInterval(checkForUpdate, CHECK_INTERVAL);
    return () => { clearTimeout(t1); clearInterval(iv); };
  }, [checkForUpdate]);

  if (!updateInfo || dismissed) return null;

  const isDesktop = updateInfo.type === 'desktop';

  const phaseLabel: Record<Phase, string> = {
    idle: shellOutdated ? t('downloadFullInstaller') : (isAr ? 'تحديث الآن' : 'Update Now'),
    downloading: isAr ? 'جاري التحميل...' : 'Downloading...',
    installing: isAr ? 'جاري التثبيت...' : 'Installing...',
    done: isAr ? 'إعادة التشغيل للتحديث' : 'Restart to Update',
    error: isAr ? 'فشل — حاول مجدداً' : 'Failed — Retry',
  };

  const phaseIcon: Record<Phase, React.ReactNode> = {
    idle: isDesktop ? <Download className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />,
    downloading: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    installing: <Package className="w-3.5 h-3.5 animate-pulse" />,
    done: <CheckCircle className="w-3.5 h-3.5" />,
    error: <ExternalLink className="w-3.5 h-3.5" />,
  };

  return (
    <div className="fixed bottom-4 start-4 end-4 sm:start-auto sm:end-4 sm:w-96 z-50 bg-primary text-primary-foreground rounded-lg shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="bg-primary-foreground/20 rounded-full p-2 shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">
            {shellOutdated
              ? t('shellOutdatedTitle')
              : isDesktop
                ? (isAr ? 'تحديث متوفر لتطبيق الويندوز' : 'Desktop Update Available')
                : t('updateAvailable')}
          </p>
          <p className="text-xs opacity-90 mt-1">
            {shellOutdated
              ? t('shellOutdatedDescription')
              : <>v{updateInfo.version}{isDesktop && updateInfo.releaseNotes && ` — ${updateInfo.releaseNotes}`}</>}
          </p>

          {/* Progress bar during download/install */}
          {(phase === 'downloading' || phase === 'installing') && (
            <div className="mt-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs opacity-75 mt-1">
                {phase === 'installing'
                  ? (isAr ? 'جاري استبدال الملفات...' : 'Replacing files...')
                  : `${progress}%`}
              </p>
            </div>
          )}

          {/* Error reason */}
          {phase === 'error' && errorReason && (
            <div className="mt-2 p-2 rounded bg-destructive/20 border border-destructive/40 text-xs">
              <p className="font-semibold mb-1">
                {isAr ? 'سبب الفشل:' : 'Failure reason:'}
              </p>
              <p className="opacity-90 break-words font-mono text-[10px]">{errorReason}</p>
              <p className="mt-1.5 opacity-75">
                {isAr
                  ? `الإصدار المثبّت: v${installedShellVersion} • المستهدف: v${updateInfo.version}`
                  : `Installed: v${installedShellVersion} • Target: v${updateInfo.version}`}
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
              onClick={handleClick}
              disabled={phase === 'downloading' || phase === 'installing'}
            >
              {phaseIcon[phase]}
              {phaseLabel[phase]}
            </Button>
            {!(isDesktop && updateInfo.mandatory) && phase !== 'downloading' && phase !== 'installing' && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setDismissed(true)}
              >
                <X className="w-3.5 h-3.5" />
                {isAr ? 'لاحقاً' : 'Later'}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate('/update-log')}
            >
              {t('updateLog')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
