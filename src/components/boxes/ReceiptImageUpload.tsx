import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReceiptImageUploadProps {
  partNo: string;
  imagePath: string | null | undefined;
  onChange: (path: string | null) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function ReceiptImageUpload({ partNo, imagePath, onChange }: ReceiptImageUploadProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const publicUrl = imagePath
    ? supabase.storage.from('box-images').getPublicUrl(imagePath).data.publicUrl
    : null;

  const handleSelect = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED.includes(file.type)) {
      toast({ title: t('error'), description: t('invalidImageType'), variant: 'destructive' });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: t('error'), description: t('imageTooLarge'), variant: 'destructive' });
      return;
    }
    if (!partNo.trim()) {
      toast({ title: t('error'), description: t('partNoRequiredForImage'), variant: 'destructive' });
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safePartNo = partNo.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${safePartNo}-${Date.now()}.${ext}`;

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
  };

  const handleRemove = async () => {
    if (imagePath) {
      await supabase.storage.from('box-images').remove([imagePath]);
    }
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'relative w-full h-32 rounded-lg border-2 border-dashed border-border',
          'flex items-center justify-center bg-muted/30 overflow-hidden'
        )}
      >
        {publicUrl ? (
          <img src={publicUrl} alt={partNo} className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center text-muted-foreground gap-1">
            <ImageIcon className="w-8 h-8 opacity-50" />
            <span className="text-xs">{t('noImage')}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleSelect} disabled={uploading} className="flex-1">
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