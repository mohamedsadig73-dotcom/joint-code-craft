import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Upload, Replace, Trash2, ImageIcon, Clock, Download, RotateCcw,
  AlertTriangle, GitCompareArrows,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ImageCompareDialog } from './ImageCompareDialog';
import type { ItemImageHistoryEntry } from '@/hooks/useItemImageHistory';

interface Props {
  entries: ItemImageHistoryEntry[];
  loading: boolean;
  showItem?: boolean;
  /** When provided, renders a "Restore" action for entries with a previous version. */
  onRestore?: (entry: ItemImageHistoryEntry, path: string) => void | Promise<void>;
  /** Current item image path — used in the restore confirmation preview. */
  currentImagePath?: string | null;
  /** Notified after a successful download (kind, filename, entry). */
  onDownloaded?: (info: {
    kind: 'current' | 'previous';
    fileName: string;
    path: string;
    entry: ItemImageHistoryEntry;
  }) => void;
}

const ICON: Record<ItemImageHistoryEntry['action'], typeof Upload> = {
  upload: Upload,
  replace: Replace,
  remove: Trash2,
};

const COLOR: Record<ItemImageHistoryEntry['action'], string> = {
  upload: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900',
  replace: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900',
  remove: 'text-destructive bg-destructive/10 border-destructive/30',
};

function pathToUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from('box-images').getPublicUrl(path).data.publicUrl;
}

/**
 * Download a stored image. Throws on failure so callers can surface a
 * detailed toast with the underlying reason.
 */
async function downloadImage(path: string): Promise<void> {
  const url = supabase.storage.from('box-images').getPublicUrl(path).data.publicUrl;
  const fileName = path.split('/').pop() || 'image';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
  }
  const blob = await res.blob();
  if (blob.size === 0) {
    throw new Error(`Empty file received from ${url}`);
  }
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export function ItemImageHistoryList({
  entries, loading, showItem, onRestore, currentImagePath, onDownloaded,
}: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [pendingRestore, setPendingRestore] = useState<{
    entry: ItemImageHistoryEntry;
    path: string;
  } | null>(null);
  const [confirmAck, setConfirmAck] = useState(false);

  const [compareEntry, setCompareEntry] = useState<ItemImageHistoryEntry | null>(null);

  const currentUrl = currentImagePath ? pathToUrl(currentImagePath) : null;
  const restoreFileName = pendingRestore?.path?.split('/').pop() ?? '';
  const restoreUrl = pendingRestore ? pathToUrl(pendingRestore.path) : null;

  const compareUrls = useMemo(() => {
    if (!compareEntry) return { previous: null, current: null };
    return {
      previous: pathToUrl(compareEntry.old_path),
      current: pathToUrl(compareEntry.new_path),
    };
  }, [compareEntry]);

  /** Wrap downloadImage so failures show a detailed toast (keeps callers terse). */
  const safeDownload = async (
    path: string | null | undefined,
    kind: 'current' | 'previous',
    entry?: ItemImageHistoryEntry,
  ) => {
    if (!path) return;
    try {
      await downloadImage(path);
      if (entry) {
        const fileName = path.split('/').pop() || 'image';
        onDownloaded?.({ kind, fileName, path, entry });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown';
      toast({
        title: kind === 'current' ? t('downloadCurrentFailed') : t('downloadPreviousFailed'),
        description: reason,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t('loading')}…
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
        <Clock className="w-8 h-8 opacity-40" />
        {t('noImageHistory')}
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y">
        {entries.map((e) => {
          const Icon = ICON[e.action];
          const newUrl = pathToUrl(e.new_path);
          const oldUrl = pathToUrl(e.old_path);
          const restorePath = e.action === 'upload' ? e.new_path : e.old_path;
          const hasCurrent = !!e.new_path;
          const hasPrevious = !!e.old_path;
          const canCompare = hasCurrent && hasPrevious;
          return (
            <li key={e.id} className="px-4 py-3 flex items-start gap-3">
              <div className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center ${COLOR[e.action]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {t(`imageAction_${e.action}`)}
                  </Badge>
                  {showItem && e.item_part_no && (
                    <span className="font-mono text-xs text-muted-foreground">{e.item_part_no}</span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {t('by')} <span className="font-medium text-foreground">{e.changed_by_username || '—'}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(e.changed_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                  {e.notes && (
                    <span className="text-[10px] text-muted-foreground italic max-w-[260px] truncate" title={e.notes}>
                      {e.notes}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {e.action === 'replace' && oldUrl && (
                    <>
                      <Thumb
                        url={oldUrl}
                        label={t('previous')}
                        muted
                        onDownload={e.old_path ? () => safeDownload(e.old_path, 'previous', e) : undefined}
                      />
                      <span className="text-muted-foreground text-xs">→</span>
                    </>
                  )}
                  {newUrl ? (
                    <Thumb
                      url={newUrl}
                      label={e.action === 'remove' ? t('removed') : t('current')}
                      onDownload={e.new_path ? () => safeDownload(e.new_path, 'current', e) : undefined}
                    />
                  ) : e.action === 'remove' && oldUrl ? (
                    <Thumb
                      url={oldUrl}
                      label={t('removed')}
                      muted
                      onDownload={e.old_path ? () => safeDownload(e.old_path, 'previous', e) : undefined}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded border border-dashed flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-4 h-4 opacity-50" />
                    </div>
                  )}
                  {hasCurrent && (
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="h-7 px-2 text-[11px] gap-1"
                      onClick={() => safeDownload(e.new_path, 'current', e)}
                      title={t('downloadCurrent')}
                    >
                      <Download className="w-3 h-3" />
                      {t('downloadCurrent')}
                    </Button>
                  )}
                  {hasPrevious && (
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="h-7 px-2 text-[11px] gap-1"
                      onClick={() => safeDownload(e.old_path, 'previous', e)}
                      title={t('downloadPrevious')}
                    >
                      <Download className="w-3 h-3" />
                      {t('downloadPrevious')}
                    </Button>
                  )}
                  {canCompare && (
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="h-7 px-2 text-[11px] gap-1"
                      onClick={() => setCompareEntry(e)}
                      title={t('compareImages')}
                    >
                      <GitCompareArrows className="w-3 h-3" />
                      {t('compareImages')}
                    </Button>
                  )}
                  {onRestore && restorePath && (
                    <Button
                      type="button" variant="outline" size="sm"
                      className="h-7 px-2 text-[11px] gap-1"
                      onClick={() => {
                        setConfirmAck(false);
                        setPendingRestore({ entry: e, path: restorePath });
                      }}
                      title={t('restoreThisVersion')}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {t('restoreThisVersion')}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={!!pendingRestore}
        onOpenChange={(o) => {
          if (!o) {
            setPendingRestore(null);
            setConfirmAck(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              {t('confirmRestoreTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>{t('confirmRestoreDesc')}</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs">
              <span className="text-muted-foreground">{t('fileName')}: </span>
              <span className="font-mono break-all">{restoreFileName}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-[11px] text-muted-foreground">{t('currentImage')}</div>
                <div className="aspect-square rounded border bg-muted/30 overflow-hidden flex items-center justify-center">
                  {currentUrl ? (
                    <img src={currentUrl} alt="current" className="w-full h-full object-contain" loading="lazy" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground opacity-40" />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-muted-foreground">{t('versionToRestore')}</div>
                <div className="aspect-square rounded border-2 border-primary/40 bg-muted/30 overflow-hidden flex items-center justify-center">
                  {restoreUrl ? (
                    <img src={restoreUrl} alt="restore" className="w-full h-full object-contain" loading="lazy" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground opacity-40" />
                  )}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">{t('affectedFutureReceipts')}</p>

            <label className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 cursor-pointer">
              <Checkbox
                checked={confirmAck}
                onCheckedChange={(c) => setConfirmAck(c === true)}
                className="mt-0.5"
              />
              <span className="text-xs leading-snug">{t('understandFutureReceipts')}</span>
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!confirmAck}
              onClick={async (ev) => {
                if (!confirmAck) {
                  ev.preventDefault();
                  return;
                }
                if (pendingRestore && onRestore) {
                  await onRestore(pendingRestore.entry, pendingRestore.path);
                }
                setPendingRestore(null);
                setConfirmAck(false);
              }}
            >
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImageCompareDialog
        open={!!compareEntry}
        onOpenChange={(o) => !o && setCompareEntry(null)}
        previousUrl={compareUrls.previous}
        currentUrl={compareUrls.current}
        onDownloadPrevious={
          compareEntry?.old_path
            ? () => safeDownload(compareEntry.old_path, 'previous', compareEntry)
            : undefined
        }
        onDownloadCurrent={
          compareEntry?.new_path
            ? () => safeDownload(compareEntry.new_path, 'current', compareEntry)
            : undefined
        }
      />
    </>
  );
}

function Thumb({
  url, label, muted, onDownload,
}: {
  url: string;
  label: string;
  muted?: boolean;
  onDownload?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative group w-12 h-12 rounded border overflow-hidden bg-muted/30 ${muted ? 'opacity-60' : ''}`}>
        <img src={url} alt={label} className="w-full h-full object-cover" loading="lazy" />
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity"
            title={label}
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
