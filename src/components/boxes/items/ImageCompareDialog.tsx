import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { ImageIcon, Download } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previousUrl: string | null;
  currentUrl: string | null;
  previousLabel?: string;
  currentLabel?: string;
  onDownloadPrevious?: () => void;
  onDownloadCurrent?: () => void;
}

/**
 * Side-by-side and draggable-slider comparison of two image versions
 * (previous vs current). Pure presentation; URLs are public storage URLs.
 */
export function ImageCompareDialog({
  open,
  onOpenChange,
  previousUrl,
  currentUrl,
  previousLabel,
  currentLabel,
  onDownloadPrevious,
  onDownloadCurrent,
}: Props) {
  const { t } = useLanguage();
  const [pos, setPos] = useState(50); // percentage 0..100
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (open) setPos(50);
  }, [open]);

  const updateFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setPos(pct);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = true;
    updateFromClientX(e.clientX);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };
  const onMouseUp = () => {
    draggingRef.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    updateFromClientX(e.touches[0].clientX);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('compareImages')}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="side" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-xs">
            <TabsTrigger value="side">{t('sideBySide')}</TabsTrigger>
            <TabsTrigger value="slider">{t('sliderCompare')}</TabsTrigger>
          </TabsList>

          <TabsContent value="side" className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CompareCell
                label={previousLabel ?? t('previous')}
                url={previousUrl}
                onDownload={onDownloadPrevious}
                downloadLabel={t('downloadPrevious')}
              />
              <CompareCell
                label={currentLabel ?? t('current')}
                url={currentUrl}
                onDownload={onDownloadCurrent}
                downloadLabel={t('downloadCurrent')}
                primary
              />
            </div>
          </TabsContent>

          <TabsContent value="slider" className="pt-4">
            {previousUrl && currentUrl ? (
              <div className="space-y-2">
                <div
                  ref={containerRef}
                  className="relative w-full aspect-video rounded-md border overflow-hidden bg-muted/30 select-none cursor-ew-resize touch-none"
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onTouchStart={(e) => e.touches[0] && updateFromClientX(e.touches[0].clientX)}
                  onTouchMove={onTouchMove}
                >
                  <img
                    src={previousUrl}
                    alt="previous"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                  <div
                    className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none"
                    style={{ width: `${pos}%` }}
                  >
                    <img
                      src={currentUrl}
                      alt="current"
                      className="absolute inset-0 h-full object-contain pointer-events-none"
                      style={{ width: containerRef.current?.clientWidth ?? '100%' }}
                      draggable={false}
                    />
                  </div>
                  <div
                    className="absolute inset-y-0 w-0.5 bg-primary shadow-md pointer-events-none"
                    style={{ left: `${pos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shadow-lg">
                      ↔
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-background/80 text-[10px] font-medium border">
                    {currentLabel ?? t('current')}
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-background/80 text-[10px] font-medium border">
                    {previousLabel ?? t('previous')}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  {t('sliderCompareHint')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {onDownloadPrevious && (
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onDownloadPrevious}>
                      <Download className="w-4 h-4" />
                      {t('downloadPrevious')}
                    </Button>
                  )}
                  {onDownloadCurrent && (
                    <Button type="button" size="sm" className="gap-1.5" onClick={onDownloadCurrent}>
                      <Download className="w-4 h-4" />
                      {t('downloadCurrent')}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t('compareNeedsBothImages')}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CompareCell({
  label,
  url,
  onDownload,
  downloadLabel,
  primary,
}: {
  label: string;
  url: string | null;
  onDownload?: () => void;
  downloadLabel: string;
  primary?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div
        className={`relative aspect-square rounded border bg-muted/30 overflow-hidden flex items-center justify-center ${
          primary ? 'border-2 border-primary/50' : ''
        }`}
      >
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <ImageIcon className="w-10 h-10 opacity-30 text-muted-foreground" />
        )}
      </div>
      {onDownload && (
        <Button
          type="button"
          variant={primary ? 'default' : 'outline'}
          size="sm"
          className="w-full gap-1.5"
          onClick={onDownload}
        >
          <Download className="w-4 h-4" />
          {downloadLabel}
        </Button>
      )}
    </div>
  );
}
