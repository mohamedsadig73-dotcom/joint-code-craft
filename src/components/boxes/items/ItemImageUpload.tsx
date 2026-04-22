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
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Image upload optimized for Items Master.
 * Supports: click to pick, drag-and-drop, paste from clipboard.
 * No required external fields — works for new items too.
 */
export function ItemImageUpload({ partNo, imagePath, onChange, compact }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const publicUrl = imagePath
    ? supabase.storage.from('box-images').getPublicUrl(imagePath).data.publicUrl
    : null;

  const upload = useCallback(
    async (file: File) => {
      if (!ALLOWED.includes(file.type)) {
        toast({ title: t('error'), description: t('invalidImageType'), variant: 'destructive' });
        return;
      }
      if (file.size > MAX_BYTES) {
        toast({ title: t('error'), description: t('imageTooLarge'), variant: 'destructive' });
        return;
      }

      setUploading(true);
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeKey = (partNo?.trim() || 'item').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `items/${safeKey}-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('box-images')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      setUploading(false);
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return;
      }
      onChange(path);
      toast({ title: t('success'), description: t('imageUploaded') });
    },
    [partNo, onChange, toast, t]
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

  // Paste from clipboard (Ctrl/Cmd+V) when the drop zone is focused/hovered.
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const handler = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
      if (!item) return;
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        upload(file);
      }
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [upload]);

  const handleRemove = async () => {
    if (imagePath) {
      await supabase.storage.from('box-images').remove([imagePath]);
    }
    onChange(null);
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
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}