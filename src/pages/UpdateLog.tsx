import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  Copy,
  Loader2,
  PlayCircle,
  Wifi,
  WifiOff,
  Monitor,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateLogger } from '@/hooks/useUpdateLogger';
import { forceAppUpdate } from '@/components/ForceUpdateButton';

declare const __APP_VERSION__: string;

const PUBLISHED_URL = 'https://dts-store-qatar-2026.lovable.app';
const VERSION_URL = `${PUBLISHED_URL}/version.json`;
const DESKTOP_RELEASE_URL = `${PUBLISHED_URL}/desktop-release.json`;

type UpdateLogRow = {
  id: string;
  app_version: string | null;
  shell_version: string | null;
  target_version: string | null;
  attempted_url: string | null;
  phase: string;
  status: string;
  error_message: string | null;
  platform: string;
  created_at: string;
};

type TestResult = {
  ok: boolean;
  status?: number;
  error?: string;
  data?: unknown;
  size?: number;
};

type ConnectionTest = {
  versionJson: TestResult;
  releaseJson: TestResult;
  downloadHead: TestResult;
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  const variant =
    status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{label}</Badge>;
}

export default function UpdateLogPage() {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const { user } = useAuth();
  const { log } = useUpdateLogger();

  const [rows, setRows] = useState<UpdateLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shellVersion, setShellVersion] = useState<string>('—');
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<ConnectionTest | null>(null);

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const phaseLabel = useCallback(
    (p: string) => {
      const map: Record<string, string> = {
        check: t('phaseCheck'),
        download: t('phaseDownload'),
        extract: t('phaseExtract'),
        install: t('phaseInstall'),
        done: t('phaseDone'),
        failed: t('phaseFailed'),
        'shell-mismatch': t('phaseShellMismatch'),
        'self-test': t('testConnectionNow'),
      };
      return map[p] ?? p;
    },
    [t]
  );

  const statusLabel = useCallback(
    (s: string) => {
      const map: Record<string, string> = {
        success: t('statusSuccess'),
        error: t('statusError'),
        info: t('statusInfo'),
      };
      return map[s] ?? s;
    },
    [t]
  );

  const fetchLogs = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('update_logs')
      .select('id, app_version, shell_version, target_version, attempted_url, phase, status, error_message, platform, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setRows(data as UpdateLogRow[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    (async () => {
      if (isElectron && window.electronAPI?.getShellVersion) {
        try {
          const v = await window.electronAPI.getShellVersion();
          setShellVersion(v || '—');
        } catch {
          setShellVersion('—');
        }
      } else {
        setShellVersion(__APP_VERSION__);
      }
    })();
  }, [isElectron]);

  const runConnectionTest = useCallback(async () => {
    setTesting(true);
    setTest(null);
    try {
      let result: ConnectionTest;
      if (isElectron && window.electronAPI?.testUpdateChannel) {
        result = await window.electronAPI.testUpdateChannel({
          versionUrl: VERSION_URL,
          releaseUrl: DESKTOP_RELEASE_URL,
        });
      } else {
        // Browser-side fallback (no CORS-bypass)
        const tryFetch = async (url: string): Promise<TestResult> => {
          try {
            const r = await fetch(`${url}?_t=${Date.now()}`, { cache: 'no-store' });
            const data = r.ok ? await r.json().catch(() => undefined) : undefined;
            return { ok: r.ok, status: r.status, data };
          } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : String(e) };
          }
        };
        result = {
          versionJson: await tryFetch(VERSION_URL),
          releaseJson: await tryFetch(DESKTOP_RELEASE_URL),
          downloadHead: { ok: false, error: 'HEAD test only available in desktop app' },
        };
      }
      setTest(result);
      await log({
        phase: 'self-test',
        status: result.versionJson.ok && result.releaseJson.ok ? 'success' : 'error',
        attemptedUrl: VERSION_URL,
        shellVersion,
        metadata: result as unknown as Record<string, unknown>,
        errorMessage:
          result.versionJson.error || result.releaseJson.error || result.downloadHead.error || null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      await log({ phase: 'self-test', status: 'error', errorMessage: msg, shellVersion });
    } finally {
      setTesting(false);
      void fetchLogs();
    }
  }, [isElectron, log, shellVersion, fetchLogs]);

  const copyLog = useCallback(async () => {
    const lines = rows.map(
      (r) =>
        `[${new Date(r.created_at).toISOString()}] ${r.phase}/${r.status} target=${r.target_version ?? '-'} url=${r.attempted_url ?? '-'} err=${r.error_message ?? '-'}`
    );
    const sysInfo = [
      `App: v${__APP_VERSION__}`,
      `Shell: v${shellVersion}`,
      `Env: ${isElectron ? 'electron' : 'web'}`,
      `UA: ${navigator.userAgent}`,
      '',
      '--- Last 20 attempts ---',
      ...lines,
    ].join('\n');
    await navigator.clipboard.writeText(sysInfo);
    toast({ title: t('logCopied') });
  }, [rows, shellVersion, isElectron, t]);

  const retryUpdate = useCallback(async () => {
    await forceAppUpdate();
  }, []);

  const sysCards = useMemo(
    () => [
      { label: t('currentAppVersion'), value: `v${__APP_VERSION__}`, icon: Info },
      { label: t('currentShellVersion'), value: `v${shellVersion}`, icon: Monitor },
      {
        label: t('environment'),
        value: isElectron ? t('envDesktop') : t('envWeb'),
        icon: isElectron ? Monitor : Globe,
      },
    ],
    [t, shellVersion, isElectron]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <PageHeader
          title={t('updateLogTitle')}
          subtitle={t('updateLogSubtitle')}
        />

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('systemInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {sysCards.map((c) => (
                <div key={c.label} className="rounded-lg border bg-card p-3 flex items-start gap-3">
                  <c.icon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-sm font-medium truncate">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-muted-foreground shrink-0">{t('versionUrl')}:</span>
                <code className="bg-muted px-2 py-0.5 rounded break-all">{VERSION_URL}</code>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-muted-foreground shrink-0">{t('desktopReleaseUrl')}:</span>
                <code className="bg-muted px-2 py-0.5 rounded break-all">{DESKTOP_RELEASE_URL}</code>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={runConnectionTest} disabled={testing} size="sm" className="gap-2">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                {testing ? t('testingConnection') : t('testConnectionNow')}
              </Button>
              <Button onClick={retryUpdate} variant="secondary" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                {t('retryUpdateNow')}
              </Button>
              <Button onClick={copyLog} variant="outline" size="sm" className="gap-2">
                <Copy className="w-4 h-4" />
                {t('copyLog')}
              </Button>
              <Button onClick={() => void fetchLogs()} variant="ghost" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                {isAr ? 'تحديث القائمة' : 'Reload'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connection Test Results */}
        {test && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('connectionTestResults')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {([
                { label: t('versionJsonStatus'), r: test.versionJson },
                { label: t('releaseJsonStatus'), r: test.releaseJson },
                { label: t('downloadStatus'), r: test.downloadHead },
              ] as const).map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-3 p-2 rounded border bg-card"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {row.r.ok ? (
                      <Wifi className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{row.label}</p>
                      {row.r.error && (
                        <p className="text-xs text-destructive break-words">{row.r.error}</p>
                      )}
                      {row.r.status !== undefined && (
                        <p className="text-xs text-muted-foreground">HTTP {row.r.status}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={row.r.ok ? 'default' : 'destructive'} className="shrink-0">
                    {row.r.ok ? t('available') : t('notAvailable')}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Attempts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('recentAttempts')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t('noUpdateAttempts')}
              </p>
            ) : (
              <ScrollArea className="max-h-[480px]">
                <ul className="space-y-2">
                  {rows.map((r) => (
                    <li key={r.id} className="rounded-lg border bg-card p-3 text-xs space-y-1">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : r.status === 'error' ? (
                            <XCircle className="w-4 h-4 text-destructive" />
                          ) : (
                            <Info className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Badge variant="outline">{phaseLabel(r.phase)}</Badge>
                          <StatusBadge status={r.status} label={statusLabel(r.status)} />
                          {r.target_version && (
                            <span className="text-muted-foreground">
                              → v{r.target_version}
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(r.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-GB')}
                        </span>
                      </div>
                      {r.attempted_url && (
                        <p className="text-muted-foreground break-all">
                          <span className="font-medium">{t('attemptUrl')}:</span> {r.attempted_url}
                        </p>
                      )}
                      {r.error_message && (
                        <p className="text-destructive break-words">
                          <span className="font-medium">{t('attemptError')}:</span> {r.error_message}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <div className="pt-2">
          <Link to="/profile">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t('profile')}
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}