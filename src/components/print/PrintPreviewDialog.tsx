import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A full standalone HTML document to render. */
  html: string;
  /** Optional reason shown to the user (e.g. why fallback opened). */
  reason?: string;
}

/**
 * In-app print preview.
 *
 * Renders the standalone print HTML inside a sandboxed iframe and exposes
 * a "Print" button that triggers the iframe's own print dialog. This is the
 * graceful fallback when Electron's native printHTML fails or no printer
 * is configured.
 */
export function PrintPreviewDialog({ open, onOpenChange, html, reason }: PrintPreviewDialogProps) {
  const { t } = useLanguage();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    // Use srcdoc so the iframe owns the document — required for iframe.print().
    iframe.srcdoc = html;
  }, [open, html]);

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.warn('Iframe print failed:', e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
          <div className="flex-1">
            <DialogTitle>{t('printPreview')}</DialogTitle>
            {reason && (
              <DialogDescription className="text-xs mt-1 text-destructive">
                {reason}
              </DialogDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} size="sm">
              <Printer className="w-4 h-4 me-1.5" />
              {t('print')}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        <iframe
          ref={iframeRef}
          title="print-preview"
          className="w-full flex-1 bg-muted/30 border-0"
          sandbox="allow-same-origin allow-modals"
        />
      </DialogContent>
    </Dialog>
  );
}