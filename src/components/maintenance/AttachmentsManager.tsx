import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Upload, FileText, Image, Download, Trash2, Eye, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/dateUtils';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

interface AttachmentsManagerProps {
  scheduleId: string;
}

export function AttachmentsManager({ scheduleId }: AttachmentsManagerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    loadAttachments();
  }, [scheduleId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_attachments')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // رفع الملف إلى storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${scheduleId}_${Date.now()}.${fileExt}`;
      const filePath = `${scheduleId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('maintenance-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // الحصول على URL موقّع للوصول الآمن (صالح لمدة ساعة)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('maintenance-attachments')
        .createSignedUrl(filePath, 3600);

      if (signedUrlError) throw signedUrlError;

      // حفظ المعلومات في قاعدة البيانات
      const { error: dbError } = await supabase
        .from('maintenance_attachments')
        .insert({
          schedule_id: scheduleId,
          file_name: file.name,
          file_url: filePath, // نحفظ المسار بدلاً من URL
          file_type: file.type,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      toast({ title: 'تم رفع الملف بنجاح' });
      loadAttachments();
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المرفق؟')) return;

    try {
      // حذف من storage (استخدام المسار المحفوظ مباشرة)
      const { error: storageError } = await supabase.storage
        .from('maintenance-attachments')
        .remove([attachment.file_url]);

      if (storageError) throw storageError;

      // حذف من قاعدة البيانات
      const { error: dbError } = await supabase
        .from('maintenance_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      toast({ title: 'تم حذف المرفق بنجاح' });
      loadAttachments();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePreview = async (attachment: Attachment) => {
    try {
      // إنشاء URL موقّع للوصول الآمن
      const { data, error } = await supabase.storage
        .from('maintenance-attachments')
        .createSignedUrl(attachment.file_url, 3600);

      if (error) throw error;

      if (attachment.file_type?.startsWith('image/')) {
        setPreviewUrl(data.signedUrl);
        setPreviewOpen(true);
      } else {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: 'فشل فتح المرفق',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileText className="w-5 h-5" />;
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">المرفقات</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Upload className="w-4 h-4 ml-2" />
              رفع ملف
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>رفع مرفق جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">اختر ملف (صورة أو PDF)</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
              {uploading && <p className="text-sm text-muted-foreground">جاري الرفع...</p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد مرفقات</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                {getFileIcon(attachment.file_type)}
                <div>
                  <p className="font-medium text-sm">{attachment.file_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(attachment.file_size)}</span>
                    <span>•</span>
                    <span>{formatDate(attachment.uploaded_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handlePreview(attachment)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    const { data } = await supabase.storage
                      .from('maintenance-attachments')
                      .createSignedUrl(attachment.file_url, 3600);
                    if (data) window.open(data.signedUrl, '_blank');
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(attachment)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* معاينة الصورة */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>معاينة المرفق</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
