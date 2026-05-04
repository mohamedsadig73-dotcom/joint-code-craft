import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, RefreshCw, Beaker, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { wmsToast as toast } from '@/lib/wmsToast';
import {
  readPrintLog,
  runPrintSelfTest,
  type PrintLogEntry,
} from '@/utils/printDocument';
import { PrintPreviewDialog } from '@/components/print/PrintPreviewDialog';

/**
 * Print diagnostics screen.
 *
 * Shows:
 *   1) Bridge status (Electron printHTML availability)
 *   2) CSS bundle status (Vite asset stylesheets discoverable)
 *   3) Last failed step from the rolling print log
 *   4) Full copyable log + a one-click self-test runner
 */
export default function PrintDiagnostics() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [log, setLog] = useState<PrintLogEntry[]>(() => readPrintLog());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const refresh = () => setLog(readPrintLog());
  useEffect(() => {
    const id = window.setInterval(refresh, 2000);
    return () => window.clearInterval(id);
  }, []);

  const status = useMemo(() => {
    const bridgeOk = typeof window !== 'undefined' && Boolean(window.electronAPI?.printHTML);
    const cssCount = document.querySelectorAll('link[rel="stylesheet"]').length;
    const cssOk = cssCount > 0;
    // Best-effort printer probe: we can't enumerate printers from the renderer,
    // so we infer from the latest log entry.
    const lastError = log.find((e) => e.level === 'error');
    const printerProbablyOk = !lastError || !/printer|device/i.test(lastError.detail ?? '');
    return { bridgeOk, cssOk, cssCount, printerProbablyOk, lastError };
  }, [log]);

  const handleCopy = async () => {
    const lines = log.map((e) => {
      const ts = new Date(e.ts).toISOString();
      return `[${ts}] ${e.level.toUpperCase()} ${e.message}${e.detail ? ` :: ${e.detail}` : ''}`;
    });
    const env = [
      `# DTS-Store Print Diagnostics`,
      `# Generated: ${new Date().toISOString()}`,
      `# UA: ${navigator.userAgent}`,
      `# Bridge: ${status.bridgeOk ? 'available' : 'missing'}`,
      `# Stylesheets discovered: ${status.cssCount}`,
      `# Path: ${window.location.href}`,
      ``,
    ];
    const payload = [...env, ...lines].join('\n');
    try {
      await navigator.clipboard.writeText(payload);
      toast.success(t('copied'));
    } catch {
      // Fallback for environments without clipboard permission.
      const ta = document.createElement('textarea');
      ta.value = payload;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.success(t('copied'));
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem('dts.print.log');
      setLog([]);
      toast.success(t('printLogCleared'));
    } catch {
      toast.error(t('printError'));
    }
  };

  const handleRunSelfTest = () => {
    const res = runPrintSelfTest();
    setPreviewHtml(res.previewHtml);
    setPreviewOpen(true);
    if (res.ok) toast.success(t('printSelfTestPassed'));
    else
      toast.error(t('printSelfTestFailed'), {
        description: res.checks.filter((c) => !c.ok).map((c) => c.name).join(', '),
      });
    refresh();
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 me-1" />
            {t('back')}
          </Button>
          <h1 className="text-xl font-bold flex-1">{t('printDiagnostics')}</h1>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4 me-1.5" />
            {t('refresh')}
          </Button>
        </div>

        {/* Status pillars */}
        <div className="grid gap-3 md:grid-cols-3">
          <StatusCard
            title={t('printStep_bridge')}
            ok={status.bridgeOk}
            okLabel={t('available')}
            failLabel={t('unavailable')}
            description={t('printDiagBridgeDesc')}
          />
          <StatusCard
            title={t('printStep_css')}
            ok={status.cssOk}
            okLabel={`${status.cssCount} ${t('stylesheets')}`}
            failLabel={t('noStylesheets')}
            description={t('printDiagCssDesc')}
          />
          <StatusCard
            title={t('printStep_printer')}
            ok={status.printerProbablyOk}
            okLabel={t('probablyOk')}
            failLabel={t('lastErrorPrinter')}
            description={t('printDiagPrinterDesc')}
          />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('printLog')}</CardTitle>
              <CardDescription>{t('printLogDesc')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRunSelfTest}>
                <Beaker className="w-4 h-4 me-1.5" />
                {t('runSelfTest')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="w-4 h-4 me-1.5" />
                {t('copy')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <Trash2 className="w-4 h-4 me-1.5" />
                {t('clear')}
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {log.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('printLogEmpty')}
              </p>
            ) : (
              <ul className="divide-y">
                {log.map((e, i) => (
                  <li key={i} className="px-4 py-2.5 text-xs">
                    <div className="flex items-start gap-2">
                      <Badge
                        variant={e.level === 'error' ? 'destructive' : e.level === 'warn' ? 'secondary' : 'outline'}
                        className="shrink-0 uppercase text-[10px]"
                      >
                        {e.level}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{e.message}</p>
                        {e.detail && (
                          <p className="text-muted-foreground font-mono text-[11px] break-all mt-0.5">
                            {e.detail}
                          </p>
                        )}
                        <p className="text-muted-foreground text-[10px] mt-0.5">
                          {new Date(e.ts).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <PrintPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} html={previewHtml} />
    </div>
  );
}

function StatusCard({
  title,
  ok,
  okLabel,
  failLabel,
  description,
}: {
  title: string;
  ok: boolean;
  okLabel: string;
  failLabel: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant={ok ? 'default' : 'destructive'} className="text-[10px]">
            {ok ? okLabel : failLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground leading-snug">{description}</p>
      </CardContent>
    </Card>
  );
}