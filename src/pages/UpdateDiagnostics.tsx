import { useEffect, useMemo, useState, useCallback } from 'react';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type DiagRow = {
  id: string;
  user_id: string | null;
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

  const [rows, setRows] = useState<DiagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'errors'>('errors');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('update_logs')
      .select(
        'id, user_id, app_version, shell_version, target_version, attempted_url, phase, status, error_message, platform, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(200);
    if (filter === 'errors') query = query.eq('status', 'error');
    const { data, error } = await query;
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setRows(data as DiagRow[]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const failed = rows.filter((r) => r.status === 'error').length;
    const success = rows.filter((r) => r.status === 'success').length;
    const users = new Set(rows.map((r) => r.user_id).filter(Boolean)).size;
    const rate = total > 0 ? Math.round((success / total) * 100) : 0;
    return { total, failed, users, rate };
  }, [rows]);

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
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        <PageHeader
          title={t('updateDiagnosticsTitle')}
          subtitle={t('updateDiagnosticsSubtitle')}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('totalAttempts'), value: stats.total },
            { label: t('failedAttempts'), value: stats.failed },
            { label: t('successRate'), value: `${stats.rate}%` },
            { label: t('affectedUsers'), value: stats.users },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold mt-1">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">{t('recentAttempts')}</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'errors')}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filterAll')}</SelectItem>
                  <SelectItem value="errors">{t('filterErrorsOnly')}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => void fetchRows()} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                {isAr ? 'تحديث' : 'Reload'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t('noUpdateAttempts')}
              </p>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <ul className="space-y-2">
                  {rows.map((r) => (
                    <li key={r.id} className="rounded-lg border bg-card p-3 text-xs space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.status === 'error' ? (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          )}
                          <Badge variant="outline">{phaseLabel(r.phase)}</Badge>
                          <Badge variant={r.status === 'error' ? 'destructive' : 'default'}>
                            {r.status}
                          </Badge>
                          <Badge variant="secondary">{r.platform}</Badge>
                          {r.app_version && (
                            <span className="text-muted-foreground">
                              app v{r.app_version}
                            </span>
                          )}
                          {r.shell_version && (
                            <span className="text-muted-foreground">
                              shell v{r.shell_version}
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(r.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-GB')}
                        </span>
                      </div>
                      {r.user_id && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">{t('attemptUser')}:</span>{' '}
                          <code>{r.user_id.slice(0, 8)}…</code>
                        </p>
                      )}
                      {r.attempted_url && (
                        <p className="text-muted-foreground break-all">
                          <span className="font-medium">{t('attemptUrl')}:</span> {r.attempted_url}
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