import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

const declarationSchema = z.object({
  id: z.string().trim().min(5, 'رقم الإقرار يجب أن يكون 5 أحرف على الأقل').max(50, 'رقم الإقرار طويل جداً'),
  type: z.enum(['Import', 'Export', 'Transit'], { required_error: 'يجب اختيار نوع الإقرار' }),
  status: z.enum(['unsigned', 'pending', 'approved', 'archived']),
});

interface CreateDeclarationDialogProps {
  onSuccess?: () => void;
}

export function CreateDeclarationDialog({ onSuccess }: CreateDeclarationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [declarationId, setDeclarationId] = useState('');
  const [type, setType] = useState<'Import' | 'Export' | 'Transit'>('Import');
  const [status, setStatus] = useState<'unsigned' | 'pending' | 'approved' | 'archived'>('unsigned');
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب تسجيل الدخول أولاً',
      });
      return;
    }

    // Validate input
    try {
      declarationSchema.parse({
        id: declarationId,
        type,
        status,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ في البيانات',
        description: error.errors?.[0]?.message || 'البيانات المدخلة غير صحيحة',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('declarations')
        .insert({
          id: declarationId,
          type,
          status,
          sender_id: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('رقم الإقرار موجود مسبقاً');
        }
        throw error;
      }

      toast({
        title: 'تم بنجاح',
        description: 'تم إنشاء الإقرار بنجاح',
      });

      // Reset form
      setDeclarationId('');
      setType('Import');
      setStatus('unsigned');
      setOpen(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message || 'فشل إنشاء الإقرار',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة إقرار جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>إنشاء إقرار جديد</DialogTitle>
          <DialogDescription>
            أدخل بيانات الإقرار الجديد
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="declarationId">رقم الإقرار *</Label>
            <Input
              id="declarationId"
              value={declarationId}
              onChange={(e) => setDeclarationId(e.target.value)}
              placeholder="مثال: DEC-2024-001"
              required
              disabled={loading}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">نوع الإقرار *</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Import">استيراد</SelectItem>
                <SelectItem value="Export">تصدير</SelectItem>
                <SelectItem value="Transit">ترانزيت</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">الحالة *</Label>
            <Select value={status} onValueChange={(value: any) => setStatus(value)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unsigned">غير موقّع</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="approved">موافق عليه</SelectItem>
                <SelectItem value="archived">مؤرشف</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'جاري الإنشاء...' : 'إنشاء الإقرار'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
