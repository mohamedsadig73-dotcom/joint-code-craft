import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Loader2,
  Copy,
  PlayCircle,
  Monitor,
  Globe,
  AlertTriangle,
  Info,
  ShieldAlert,
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
import { compareVersions, classifyUpdateError } from '@/utils/updateErrors';

declare const __APP_VERSION__: string;

const UPDATE_CHANNEL_URL = 'https://eplguuqpxuhgdagacypn.supabase.co/storage/v1/object/public/desktop-releases';
const VERSION_URL = `${UPDATE_CHANNEL_URL}/version.json`;
const DESKTOP_RELEASE_URL = `${UPDATE_CHANNEL_URL}/desktop-release.json`;

type TestResult = {
  ok: boolean;
  status?: number;
  error?: string;
  data?: { desktop_shell_version?: string; min_shell_version?: string; download_url?: string; full_download_url?: string; version?: string };
  size?: number;
};

type ConnectionTest = {
  versionJson: TestResult;
  releaseJson: TestResult;
  downloadHead: TestResult;
};

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

export default function UpdateDiagnosticsPage() {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const { user } = useAuth();
  const { log } = useUpdateLogger();

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const [shellVersion, setShellVersion] = useState<string>('—');
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<ConnectionTest | null>(null);
  const [rows, setRows] = useState<UpdateLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Read installed shell version
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

  const fetchLogs = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('update_logs')
      .select(
        'id, app_version, shell_version, target_version, attempted_url, phase, status, error_message, platform, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setRows((data ?? []) as UpdateLogRow[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

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
          result.versionJson.error ||
          result.releaseJson.error ||
          result.downloadHead.error ||
          null,
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

  // Auto-run a test on mount
  useEffect(() => {
    void runConnectionTest();
  }, [runConnectionTest]);

  const shellComparison = useMemo(() => {
    const target = test?.releaseJson.data?.desktop_shell_version;
    const minRequired = test?.releaseJson.data?.min_shell_version;
    if (!target || shellVersion === '—') return null;
    const isOutdated = minRequired ? compareVersions(shellVersion, minRequired) < 0 : false;
    const hasUpdate = compareVersions(target, shellVersion) > 0;
    return { target, minRequired, isOutdated, hasUpdate };
  }, [test, shellVersion]);

  const copyDiagnosticReport = useCallback(async () => {
    const lines: string[] = [
      `=== ${isAr ? 'تقرير تشخيص التحديث' : 'Update Diagnostic Report'} ===`,
      `Generated: ${new Date().toISOString()}`,
      `App version: v${__APP_VERSION__}`,
      `Shell version: v${shellVersion}`,
      `Environment: ${isElectron ? 'Electron' : 'Web'}`,
      `User-Agent: ${navigator.userAgent}`,
      '',
      '--- Endpoints ---',
      `version.json: ${VERSION_URL}`,
      `desktop-release.json: ${DESKTOP_RELEASE_URL}`,
      '',
      '--- Connection test ---',
      test
        ? [
            `version.json -> ${test.versionJson.ok ? 'OK' : 'FAIL'} HTTP=${test.versionJson.status ?? '-'} err=${test.versionJson.error ?? '-'}`,
            `release.json -> ${test.releaseJson.ok ? 'OK' : 'FAIL'} HTTP=${test.releaseJson.status ?? '-'} err=${test.releaseJson.error ?? '-'} target=${test.releaseJson.data?.desktop_shell_version ?? '-'} min_shell=${test.releaseJson.data?.min_shell_version ?? '-'}`,
            `download HEAD -> ${test.downloadHead.ok ? 'OK' : 'FAIL'} HTTP=${test.downloadHead.status ?? '-'} size=${test.downloadHead.size ?? '-'} err=${test.downloadHead.error ?? '-'}`,
          ].join('\n')
        : '(not run)',
      '',
      '--- Shell compatibility ---',
      shellComparison
        ? `installed=v${shellVersion}, target=v${shellComparison.target}, min_required=v${shellComparison.minRequired ?? '-'}, outdated=${shellComparison.isOutdated}, has_update=${shellComparison.hasUpdate}`
        : '(no data)',
      '',
      '--- Last 20 attempts ---',
      ...rows.map(
        (r) =>
          `[${new Date(r.created_at).toISOString()}] ${r.phase}/${r.status} app=v${r.app_version ?? '-'} shell=v${r.shell_version ?? '-'} target=v${r.target_version ?? '-'} url=${r.attempted_url ?? '-'} err=${r.error_message ?? '-'}`
      ),
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    toast({ title: t('reportCopied'), description: t('reportCopiedDesc') });
  }, [isAr, shellVersion, isElectron, test, shellComparison, rows, t]);

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <PageHeader
          title={t('updateDiagnosticsPageTitle')}
          subtitle={t('updateDiagnosticsPageSubtitle')}
        />

        {/* System info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('systemInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-3 flex items-start gap-3">
                <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('currentAppVersion')}</p>
                  <p className="text-sm font-medium truncate">v{__APP_VERSION__}</p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3 flex items-start gap-3">
                <Monitor className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('currentShellVersion')}</p>
                  <p className="text-sm font-medium truncate">v{shellVersion}</p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3 flex items-start gap-3">
                {isElectron ? (
                  <Monitor className="w-4 h-4 mt-0.5 text-muted-foreground" />
                ) : (
                  <Globe className="w-4 h-4 mt-0.5 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('environment')}</p>
                  <p className="text-sm font-medium truncate">
                    {isElectron ? t('envDesktop') : t('envWeb')}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-muted-foreground shrink-0">{t('versionUrl')}:</span>
                <code className="bg-muted px-2 py-0.5 rounded break-all">{VERSION_URL}</code>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-muted-foreground shrink-0">{t('desktopReleaseUrl')}:</span>
                <code className="bg-muted px-2 py-0.5 rounded break-all">
                  {DESKTOP_RELEASE_URL}
                </code>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={runConnectionTest}
                disabled={testing}
                size="sm"
                className="gap-2"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
                {testing ? t('testingConnection') : t('rerunDiagnostics')}
              </Button>
              <Button
                onClick={copyDiagnosticReport}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                {t('copyDiagnosticReport')}
              </Button>
              <Button
                onClick={() => void fetchLogs()}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {isAr ? 'تحديث القائمة' : 'Reload list'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Shell comparison */}
        {shellComparison && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                {t('shellCompatibilityCheck')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('installedShell')}</span>
                <code className="bg-muted px-2 py-0.5 rounded">v{shellVersion}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('targetShell')}</span>
                <code className="bg-muted px-2 py-0.5 rounded">v{shellComparison.target}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('minRequiredShell')}</span>
                <code className="bg-muted px-2 py-0.5 rounded">
                  v{shellComparison.minRequired ?? '—'}
                </code>
              </div>
              <Separator />
              <div className="flex items-center gap-2">
                {shellComparison.isOutdated ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="text-destructive font-medium">
                      {t('shellOutdatedNeedsFullInstall')}
                    </span>
                  </>
                ) : shellComparison.hasUpdate ? (
                  <>
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-primary font-medium">
                      {t('shellHotSwapAvailable')}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-success font-medium">{t('shellUpToDate')}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection test results */}
        {test && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('connectionTestResults')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(
                [
                  {
                    label: `GET ${t('versionJsonStatus')}`,
                    r: test.versionJson,
                    method: 'GET',
                  },
                  {
                    label: `GET ${t('releaseJsonStatus')}`,
                    r: test.releaseJson,
                    method: 'GET',
                  },
                  {
                    label: `HEAD ${t('downloadStatus')}`,
                    r: test.downloadHead,
                    method: 'HEAD',
                  },
                ] as const
              ).map((row) => {
                const hint = row.r.error ? classifyUpdateError(row.r.error) : null;
                return (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-3 p-3 rounded border bg-card"
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {row.r.ok ? (
                        <Wifi className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{row.label}</p>
                        {row.r.status !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            HTTP {row.r.status}
                            {row.r.size ? ` • ${(row.r.size / 1024 / 1024).toFixed(2)} MB` : ''}
                          </p>
                        )}
                        {row.r.error && (
                          <p className="text-xs text-destructive break-words mt-1 font-mono">
                            {row.r.error}
                          </p>
                        )}
                        {hint && (
                          <div className="mt-2 p-2 rounded bg-muted/50 border border-border text-xs">
                            <p className="font-semibold mb-1">{t(hint.titleKey)}</p>
                            <p className="text-muted-foreground">{t(hint.hintKey)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={row.r.ok ? 'default' : 'destructive'} className="shrink-0">
                      {row.r.ok ? t('available') : t('notAvailable')}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Recent attempts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('lastTwentyAttempts')}</CardTitle>
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
                    <li
                      key={r.id}
                      className="rounded-lg border bg-card p-3 text-xs space-y-1"
                    >
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
                          <Badge
                            variant={r.status === 'error' ? 'destructive' : 'default'}
                          >
                            {r.status}
                          </Badge>
                          {r.shell_version && (
                            <span className="text-muted-foreground">
                              shell v{r.shell_version}
                            </span>
                          )}
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
                          <span className="font-medium">{t('attemptUrl')}:</span>{' '}
                          {r.attempted_url}
                        </p>
                      )}
                      {r.error_message && (
                        <p className="text-destructive break-words">
                          <span className="font-medium">{t('attemptError')}:</span>{' '}
                          {r.error_message}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
