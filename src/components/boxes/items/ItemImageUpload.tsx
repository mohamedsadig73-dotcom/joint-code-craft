import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** Used only to build a friendly file name; not required for upload. */
  partNo?: string;
  imagePath: string | null | undefined;
  onChange: (path: string | null) => void;
  /** Optional smaller height for compact layouts. */
  compact?: boolean;
  /** When true, attempts to remove the previous storage object on replace/remove. */
  cleanupOnReplace?: boolean;
  /**
   * Optional guard invoked before the user removes the current image.
   * Return `true` to allow removal, `false` to cancel.
   * Useful to block deletions when recent receipts reference the image.
   */
  onBeforeRemove?: () => Promise<boolean> | boolean;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXT = ['jpg', 'jpeg', 'png'];
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 800; // ms

function isLikelyNetworkError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('network') ||
    m.includes('failed to fetch') ||
    m.includes('load failed') ||
    m.includes('timeout') ||
    m.includes('econn') ||
    m.includes('temporarily') ||
    m.includes('offline')
  );
}

/**
 * Image upload optimized for Items Master.
 * Supports: click to pick, drag-and-drop, paste from clipboard.
 * No required external fields — works for new items too.
 */
export function ItemImageUpload({ partNo, imagePath, onChange, compact, cleanupOnReplace, onBeforeRemove }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const publicUrl = imagePath
    ? supabase.storage.from('box-images').getPublicUrl(imagePath).data.publicUrl
    : null;

  const upload = useCallback(
    async (file: File) => {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED.includes(file.type) || !ALLOWED_EXT.includes(ext)) {
        const msg = `${t('invalidImageType')} (${file.type || ext || '?'})`;
        setLastError(msg);
        toast({ title: t('error'), description: msg, variant: 'destructive' });
        return;
      }
      if (file.size > MAX_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const msg = `${t('imageTooLarge')} (${sizeMb} MB)`;
        setLastError(msg);
        toast({ title: t('error'), description: msg, variant: 'destructive' });
        return;
      }

      setUploading(true);
      setLastError(null);
      const safeKey = (partNo?.trim() || 'item').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `items/${safeKey}-${Date.now()}.${ext}`;
      const previousPath = imagePath;

      // Retry loop — handles transient network/connection failures.
      let lastErr: { message: string } | null = null;
      let success = false;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        setRetryAttempt(attempt);
        try {
          const { error } = await supabase.storage
            .from('box-images')
            .upload(path, file, { cacheControl: '3600', upsert: true });
          if (!error) {
            success = true;
            lastErr = null;
            break;
          }
          lastErr = { message: error.message };
          // Only retry network-like failures; permission/size/type errors won't recover.
          if (!isLikelyNetworkError(error.message) || attempt === MAX_RETRIES) break;
        } catch (e) {
          lastErr = { message: (e as Error).message || 'Unknown error' };
          if (!isLikelyNetworkError(lastErr.message) || attempt === MAX_RETRIES) break;
        }
        // exponential backoff: 800ms, 1600ms
        await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY * attempt));
      }
      setUploading(false);
      setRetryAttempt(0);
      if (!success) {
        const reason = lastErr?.message || 'unknown';
        const networkHint = isLikelyNetworkError(reason) ? ` — ${t('checkConnection')}` : '';
        const msg = `${t('uploadFailed')}: ${reason} (${path})${networkHint}`;
        setLastError(msg);
        toast({ title: t('uploadFailed'), description: msg, variant: 'destructive' });
        return;
      }
      // Clean previous storage object if requested and it lives under items/
      if (cleanupOnReplace && previousPath && previousPath !== path && previousPath.startsWith('items/')) {
        await supabase.storage.from('box-images').remove([previousPath]);
      }
      onChange(path);
      toast({ title: t('success'), description: t('imageUploaded') });
    },
    [partNo, onChange, toast, t, imagePath, cleanupOnReplace]
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  // Paste from clipboard (Ctrl/Cmd+V) — only active while pointer is over the drop zone
  // to avoid hijacking pastes elsewhere on the page.
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    let active = false;
    const onEnter = () => { active = true; };
    const onLeave = () => { active = false; };
    const onPaste = (e: ClipboardEvent) => {
      if (!active) return;
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
      if (!item) return;
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        upload(file);
      }
    };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    window.addEventListener('paste', onPaste);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('paste', onPaste);
    };
  }, [upload]);

  const handleRemove = async () => {
    if (imagePath && cleanupOnReplace && imagePath.startsWith('items/')) {
      await supabase.storage.from('box-images').remove([imagePath]);
    }
    onChange(null);
    setLastError(null);
    toast({ title: t('success'), description: t('imageRemoved') });
  };

  return (
    <div className="space-y-2">
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !imagePath && inputRef.current?.click()}
        className={cn(
          'relative w-full rounded-lg border-2 border-dashed border-border',
          'flex items-center justify-center bg-muted/30 overflow-hidden transition-colors',
          'cursor-pointer hover:bg-muted/50',
          compact ? 'h-28' : 'h-40',
          dragOver && 'border-primary bg-primary/5'
        )}
      >
        {publicUrl ? (
          <img src={publicUrl} alt={partNo || 'item'} className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center text-muted-foreground gap-1.5 px-4 text-center">
            <ImageIcon className="w-8 h-8 opacity-50" />
            <span className="text-xs">{t('dragOrPasteImage')}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          <Upload className="w-4 h-4 me-1.5" />
          {imagePath ? t('replaceImage') : t('uploadImage')}
        </Button>
        {imagePath && (
          <Button type="button" variant="outline" size="sm" onClick={handleRemove} disabled={uploading}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      {lastError && (
        <p className="text-xs text-destructive break-all" role="alert">
          {lastError}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}