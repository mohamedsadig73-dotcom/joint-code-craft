import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ChevronLeft, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBoxReceipts } from '@/hooks/useBoxReceipts';
import { useBoxSummary } from '@/hooks/useBoxSummary';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { destinationBadgeClass } from '@/components/boxes/destinationStyles';
import { toast } from 'sonner';
import { printDocument, logPrintEvent } from '@/utils/printDocument';
import { PrintPreviewDialog } from '@/components/print/PrintPreviewDialog';
import {
  PrintSettingsPopover,
  loadPrintSettings,
  savePrintSettings,
  type PrintSettings,
} from '@/components/print/PrintSettingsPopover';

function formatDate(d: string) {
  if (!d) return '';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function imageUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from('box-images').getPublicUrl(path);
  return data.publicUrl;
}

export default function BoxCardPrint() {
  const { boxNo = '' } = useParams<{ boxNo: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { receipts, loading } = useBoxReceipts();
  const { summary } = useBoxSummary();
  const [currentBox, setCurrentBox] = useState(boxNo);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => loadPrintSettings());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewReason, setPreviewReason] = useState<string | undefined>(undefined);

  useEffect(() => { setCurrentBox(boxNo); }, [boxNo]);

  const allBoxNos = useMemo(
    () => Array.from(new Set(summary.map((s) => s.box_no))).sort(),
    [summary]
  );

  const items = useMemo(
    () => receipts.filter((r) => r.box_no === currentBox),
    [receipts, currentBox]
  );

  const meta = useMemo(() => summary.find((s) => s.box_no === currentBox), [summary, currentBox]);

  const currentIdx = allBoxNos.indexOf(currentBox);
  const goPrev = () => {
    if (currentIdx > 0) navigate(`/boxes/card/${encodeURIComponent(allBoxNos[currentIdx - 1])}`);
  };
  const goNext = () => {
    if (currentIdx >= 0 && currentIdx < allBoxNos.length - 1) {
      navigate(`/boxes/card/${encodeURIComponent(allBoxNos[currentIdx + 1])}`);
    }
  };

  const handleSettingsChange = (next: PrintSettings) => {
    setPrintSettings(next);
    savePrintSettings(next);
  };

  const handlePrint = async () => {
    const sheet = document.querySelector('.print-sheet');
    if (!sheet) {
      toast.error(t('printError'), { description: 'print-sheet element not found' });
      logPrintEvent({ level: 'error', message: 'print-sheet missing' });
      return;
    }
    const fileName = `Box-Card-${currentBox}`;
    const result = await printDocument(sheet.outerHTML, {
      title: fileName,
      paperSize: printSettings.paperSize,
      orientation: printSettings.orientation,
      marginMm: printSettings.marginMm,
    });

    if (result.ok) return;

    // Native print failed — show in-app preview as graceful fallback,
    // and surface the reason via toast (not just console).
    toast.error(t('printFallbackTitle'), {
      description: `${t('printFallbackBody')} — ${result.reason}`,
    });
    setPreviewHtml(result.html);
    setPreviewReason(result.reason);
    setPreviewOpen(true);
  };

  const handleOpenPreview = () => {
    const sheet = document.querySelector('.print-sheet');
    if (!sheet) return;
    // Build the doc directly (no IPC roundtrip) and show in-app preview.
    import('@/utils/printDocument').then(({ buildPrintHTML }) => {
      const html = buildPrintHTML(sheet.outerHTML, {
        title: `Box-Card-${currentBox}`,
        paperSize: printSettings.paperSize,
        orientation: printSettings.orientation,
        marginMm: printSettings.marginMm,
      });
      setPreviewHtml(html);
      setPreviewReason(undefined);
      setPreviewOpen(true);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin me-2" />{t('loading')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Toolbar (hidden on print) */}
      <div className="print:hidden sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/boxes')}>
            <ArrowLeft className="w-4 h-4 me-1" />{t('back')}
          </Button>
          <div className="flex-1" />
          <Select value={currentBox} onValueChange={(v) => navigate(`/boxes/card/${encodeURIComponent(v)}`)}>
            <SelectTrigger className="w-40"><SelectValue placeholder={t('selectBox')} /></SelectTrigger>
            <SelectContent>
              {allBoxNos.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIdx <= 0}>
            <ChevronRight className="w-4 h-4 rtl:hidden" />
            <ChevronLeft className="w-4 h-4 ltr:hidden" />
          </Button>
          <Button variant="outline" size="icon" onClick={goNext} disabled={currentIdx < 0 || currentIdx >= allBoxNos.length - 1}>
            <ChevronLeft className="w-4 h-4 rtl:hidden" />
            <ChevronRight className="w-4 h-4 ltr:hidden" />
          </Button>
          <PrintSettingsPopover value={printSettings} onChange={handleSettingsChange} />
          <Button variant="outline" onClick={handleOpenPreview}>
            {t('printPreview')}
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 me-1.5" />{t('print')}
          </Button>
        </div>
      </div>

      {/* A4 Sheet */}
      <div className="print-sheet mx-auto my-6 print:my-0 bg-card text-card-foreground shadow-md print:shadow-none border border-border print:border-0">
        {/* Header */}
        <div className="p-5 border-b-2 border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl font-bold mb-1">{t('boxCardTitle')}</h1>
              <p className="text-xs text-muted-foreground">{t('boxCardEnTitle')}</p>
            </div>
            {currentBox && (
              <div className="shrink-0">
                <QRCodeSVG value={`BOX:${currentBox}|QTY:${meta?.total_qty ?? 0}`} size={70} />
              </div>
            )}
          </div>

          <table className="w-full mt-3 text-sm border-collapse">
            <tbody>
              <tr className="border border-border">
                <td className="bg-muted/50 font-semibold p-2 w-32">{t('boxNoLabel')}</td>
                <td className="p-2 text-2xl font-bold text-destructive">{currentBox}</td>
                <td className="bg-muted/50 font-semibold p-2 w-32">{t('destination')}</td>
                <td className="p-2">
                  {meta && (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${destinationBadgeClass(meta.destination)}`}>
                      {t(`dest_${meta.destination}`)}
                    </span>
                  )}
                </td>
              </tr>
              <tr className="border border-border">
                <td className="bg-muted/50 font-semibold p-2">{t('suppliers')}</td>
                <td className="p-2" colSpan={3}>{meta?.suppliers ?? '—'}</td>
              </tr>
              <tr className="border border-border">
                <td className="bg-muted/50 font-semibold p-2">{t('date')}</td>
                <td className="p-2 tabular-nums">{meta ? formatDate(meta.first_date) : '—'}</td>
                <td className="bg-muted/50 font-semibold p-2">{t('items')} / {t('totalQty')}</td>
                <td className="p-2 font-bold tabular-nums">
                  {(meta?.items_count ?? 0).toLocaleString('en-US')} / {(meta?.total_qty ?? 0).toLocaleString('en-US')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Items table */}
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-1.5 w-8">#</th>
              <th className="border border-border p-1.5 w-24">{t('partNo')}</th>
              <th className="border border-border p-1.5">{t('description')}</th>
              <th className="border border-border p-1.5 w-12">{t('qty')}</th>
              <th className="border border-border p-1.5 w-12">{t('unit')}</th>
              <th className="border border-border p-1.5 w-24">{t('notes')}</th>
              <th className="border border-border p-1.5 w-20">{t('image')}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center p-6 text-muted-foreground">{t('noItemsInBox')}</td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const url = imageUrl(it.image_path);
                return (
                  <tr key={it.id} className="break-inside-avoid">
                    <td className="border border-border p-1.5 text-center tabular-nums">{idx + 1}</td>
                    <td className="border border-border p-1.5 font-mono text-[11px]">{it.part_no}</td>
                    <td className="border border-border p-1.5">{it.description}</td>
                    <td className="border border-border p-1.5 text-center tabular-nums">{it.qty}</td>
                    <td className="border border-border p-1.5 text-center">{it.unit}</td>
                    <td className="border border-border p-1.5 text-[10px]">{it.notes ?? ''}</td>
                    <td className="border border-border p-1 text-center">
                      {url ? (
                        <img src={url} alt={it.part_no} className="w-16 h-16 object-cover mx-auto" loading="lazy" />
                      ) : (
                        <span className="text-muted-foreground text-[10px]">{it.part_no}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer */}
        <div className="p-5 mt-4 border-t border-border grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="font-semibold mb-6">{t('approvedBy')}: ____________________</div>
          </div>
          <div>
            <div className="font-semibold mb-6">{t('date')}: ____________________</div>
          </div>
        </div>
      </div>

      <style>{`
        .print-sheet {
          width: 210mm;
          min-height: 297mm;
          padding: 10mm;
          box-sizing: border-box;
        }
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: white !important; }
          .print-sheet { width: 100%; min-height: auto; padding: 0; margin: 0; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        html={previewHtml}
        reason={previewReason}
      />
    </div>
  );
}