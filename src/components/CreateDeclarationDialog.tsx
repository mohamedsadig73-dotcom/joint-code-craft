import { useState, useEffect } from 'react';
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
  number: z.string().trim().min(3, 'رقم الإقرار يجب أن يكون 3 أرقام على الأقل').max(6, 'رقم الإقرار طويل جداً').regex(/^\d+$/, 'يجب أن يحتوي على أرقام فقط'),
  type: z.enum(['دخول', 'خروج'], { required_error: 'يجب اختيار نوع الإقرار' }),
  status: z.enum(['draft', 'pending_warehouse_signature', 'warehouse_signed', 'sent_to_admin_office', 'received_by_admin_office', 'returned_to_warehouse', 'archived', 'rejected']),
});

interface CreateDeclarationDialogProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateDeclarationDialog({ onSuccess, open: controlledOpen, onOpenChange }: CreateDeclarationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingNextNumber, setLoadingNextNumber] = useState(false);
  const [declarationNumber, setDeclarationNumber] = useState('');
  const [type, setType] = useState<'دخول' | 'خروج'>('دخول');
  const [status, setStatus] = useState<'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'received_by_admin_office' | 'returned_to_warehouse' | 'archived' | 'rejected'>('draft');
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Load next available number when dialog opens
  useEffect(() => {
    if (open) {
      loadNextNumber();
    }
  }, [open]);

  const loadNextNumber = async () => {
    setLoadingNextNumber(true);
    try {
      const currentYear = new Date().getFullYear();
      
      // Get all declarations for current year with DCL prefix
      const { data, error } = await supabase
        .from('declarations')
        .select('id')
        .ilike('id', `DCL-${currentYear}-%`)
        .order('id', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        // Extract number from last declaration (e.g., "DCL-2025-005" -> 5)
        const lastId = data[0].id;
        const parts = lastId.split('-');
        const lastNumber = parseInt(parts[2]);
        nextNumber = lastNumber + 1;
      }

      setDeclarationNumber(nextNumber.toString());
    } catch (error) {
      console.error('Error loading next number:', error);
      setDeclarationNumber('1');
    } finally {
      setLoadingNextNumber(false);
    }
  };

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
        number: declarationNumber,
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

    // Generate full ID with DCL prefix and current year
    const currentYear = new Date().getFullYear();
    const fullId = `DCL-${currentYear}-${declarationNumber.padStart(3, '0')}`;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('declarations')
        .insert({
          id: fullId,
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
        description: `تم إنشاء الإقرار رقم ${fullId} بنجاح`,
      });

      // Reset form
      setDeclarationNumber('');
      setType('دخول');
      setStatus('draft');
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
        <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2">
          <Plus className="w-4 h-4" />
          إضافة إقرار
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>إنشاء إقرار جديد</DialogTitle>
          <DialogDescription>
            أدخل رقم الإقرار (صيغة: DCL-2025-XXX)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="number">رقم الإقرار</Label>
            <div className="flex gap-2">
              <Input
                id="number"
                type="text"
                value={declarationNumber}
                onChange={(e) => setDeclarationNumber(e.target.value)}
                placeholder="006"
                required
                disabled={loading || loadingNextNumber}
                className="glass-card border-border/50 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={loadNextNumber}
                disabled={loading || loadingNextNumber}
                className="shrink-0"
              >
                {loadingNextNumber ? 'جاري...' : 'تحديث'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {loadingNextNumber ? (
                'جاري جلب الرقم التالي...'
              ) : (
                <>الرقم النهائي: DCL-{new Date().getFullYear()}-{declarationNumber.padStart(3, '0')}</>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">نوع الإقرار</Label>
            <Select
              value={type}
              onValueChange={(value: 'دخول' | 'خروج') => setType(value)}
              disabled={loading}
            >
              <SelectTrigger className="glass-card border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="دخول">دخول</SelectItem>
                <SelectItem value="خروج">خروج</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">الحالة</Label>
            <Select
              value={status}
              onValueChange={(value: 'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'received_by_admin_office' | 'returned_to_warehouse' | 'archived' | 'rejected') => setStatus(value)}
              disabled={loading}
            >
              <SelectTrigger className="glass-card border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="pending_warehouse_signature">بانتظار توقيع المخزن</SelectItem>
                <SelectItem value="warehouse_signed">موقّع من المخزن</SelectItem>
                <SelectItem value="sent_to_admin_office">مُرسل إلى المكتب الإداري</SelectItem>
                <SelectItem value="received_by_admin_office">مستلم من المكتب الإداري</SelectItem>
                <SelectItem value="returned_to_warehouse">مُعاد إلى المخزن للأرشفة</SelectItem>
                <SelectItem value="archived">مؤرشف</SelectItem>
                <SelectItem value="rejected">مرفوض / يحتاج إلى تصحيح</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
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
