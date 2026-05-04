import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Camera, RefreshCw } from 'lucide-react';
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
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const containerId = 'qr-scan-region';
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<'permission' | 'unavailable' | 'other' | null>(null);
  const [starting, setStarting] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setErrorKind(null);
    setStarting(true);

    (async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error(
            isAr ? 'الكاميرا غير متاحة في هذا المتصفح/الجهاز' : 'Camera is not available on this device/browser'
          ), { kind: 'unavailable' });
        }
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
        const msg = String(e?.message || e?.name || '').toLowerCase();
        let kind: 'permission' | 'unavailable' | 'other' = e?.kind || 'other';
        if (kind === 'other') {
          if (msg.includes('permission') || msg.includes('notallowed') || msg.includes('denied')) {
            kind = 'permission';
          } else if (msg.includes('notfound') || msg.includes('overconstrained') || msg.includes('not available') || msg.includes('not supported')) {
            kind = 'unavailable';
          }
        }
        setErrorKind(kind);
        setError(
          kind === 'permission'
            ? (isAr ? 'تم رفض الوصول إلى الكاميرا. فعّل الإذن من إعدادات المتصفح ثم أعد المحاولة.' : 'Camera permission denied. Allow camera access from your browser settings, then retry.')
            : kind === 'unavailable'
              ? (isAr ? 'لا توجد كاميرا متاحة على هذا الجهاز.' : 'No camera is available on this device.')
              : (e?.message || (isAr ? 'تعذر تشغيل الكاميرا' : 'Failed to start camera'))
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attempt]);

  const stopScanner = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      await s.clear();
    } catch { /* ignore */ }
    scannerRef.current = null;
  };

  const handleRetry = async () => {
    await stopScanner();
    setError(null);
    setErrorKind(null);
    setAttempt((a) => a + 1);
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
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <div className="text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
              {errorKind === 'permission' && (
                <p className="text-xs text-muted-foreground">
                  {isAr
                    ? 'في Chrome: انقر القفل بجانب العنوان › الكاميرا › السماح، ثم أعد المحاولة.'
                    : 'In Chrome: click the lock icon next to the URL › Camera › Allow, then retry.'}
                </p>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={starting}
              >
                <RefreshCw className={`h-3.5 w-3.5 me-1.5 ${starting ? 'animate-spin' : ''}`} />
                {isAr ? 'إعادة المحاولة' : 'Retry'}
              </Button>
            </div>
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