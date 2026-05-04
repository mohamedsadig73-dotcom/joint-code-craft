import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Camera } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string) => void;
}

/**
 * Mobile-first camera-based barcode/QR scanner.
 * Uses html5-qrcode (lazy loaded). Releases camera on close.
 */
export function BarcodeScannerDialog({ open, onOpenChange, onResult }: Props) {
  const { t } = useLanguage();
  const containerId = 'qr-scan-region';
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStarting(true);

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const el = document.getElementById(containerId);
        if (!el) return;
        const scanner = new Html5Qrcode(containerId, /* verbose */ false);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded: string) => {
            onResult(decoded);
            stopScanner();
            onOpenChange(false);
          },
          () => { /* per-frame errors are expected */ }
        );
      } catch (e: any) {
        setError(e?.message || 'Camera not available');
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stopScanner = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      await s.clear();
    } catch { /* ignore */ }
    scannerRef.current = null;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopScanner(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('scanBarcode') || 'مسح الباركود'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div
            id={containerId}
            className="w-full aspect-square overflow-hidden rounded-md bg-black"
          />
          {starting && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('startingCamera') || 'جاري تشغيل الكاميرا...'}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />{error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}