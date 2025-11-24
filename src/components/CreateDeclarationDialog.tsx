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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

const declarationSchema = z.object({
  number: z.string().trim().min(4, 'رقم الإقرار يجب أن يكون 4 أرقام').max(4, 'رقم الإقرار يجب أن يكون 4 أرقام').regex(/^\d+$/, 'يجب أن يحتوي على أرقام فقط'),
  type: z.enum(['دخول', 'خروج'], { required_error: 'يجب اختيار نوع الإقرار' }),
  status: z.enum(['draft', 'pending_warehouse_signature', 'warehouse_signed', 'sent_to_admin_office', 'received_by_admin_office', 'returned_to_warehouse', 'archived', 'rejected']),
  archive_number: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
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
  const [archiveNumber, setArchiveNumber] = useState('');
  const [autoGenerateArchive, setAutoGenerateArchive] = useState(true);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    if (open) {
      loadNextNumber();
    }
  }, [open, type]);

  const loadNextNumber = async () => {
    setLoadingNextNumber(true);
    try {
      const currentYear = new Date().getFullYear();
      const prefix = type === 'دخول' ? 'IN' : 'OUT';
      
      const { data, error } = await supabase
        .from('declarations')
        .select('id')
        .ilike('id', `${prefix}-${currentYear}-%`)
        .order('id', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastId = data[0].id;
        const parts = lastId.split('-');
        const lastNumber = parseInt(parts[2]);
        nextNumber = lastNumber + 1;
      }

      setDeclarationNumber(nextNumber.toString().padStart(4, '0'));
    } catch (error) {
      console.error('Error loading next number:', error);
      setDeclarationNumber('0001');
    } finally {
      setLoadingNextNumber(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('mustLogin'),
      });
      return;
    }

    try {
      declarationSchema.parse({
        number: declarationNumber,
        type,
        status,
        archive_number: archiveNumber,
        phone,
        notes,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.errors?.[0]?.message || t('invalidData'),
      });
      return;
    }

    const currentYear = new Date().getFullYear();
    const prefix = type === 'دخول' ? 'IN' : 'OUT';
    const fullId = `${prefix}-${currentYear}-${declarationNumber.padStart(4, '0')}`;

    setLoading(true);

    try {
      // توليد رقم أرشيف تلقائي إذا كان مفعّلاً
      let finalArchiveNumber = archiveNumber;
      if (autoGenerateArchive && !archiveNumber) {
        const { data: archiveData, error: archiveError } = await supabase.rpc('generate_archive_number');
        if (!archiveError && archiveData) {
          finalArchiveNumber = archiveData;
        }
      }

      const { error } = await supabase
        .from('declarations')
        .insert({
          id: fullId,
          type,
          status,
          sender_id: user.id,
          archive_number: finalArchiveNumber || null,
          phone: phone || null,
          notes: notes || null,
        });

      if (error) {
        if (error.code === '23505') {
          if (error.message?.includes('archive_number')) {
            throw new Error('رقم الأرشيف مستخدم بالفعل');
          }
          throw new Error('رقم الإقرار موجود مسبقاً');
        }
        throw error;
      }

      toast({
        title: t('success'),
        description: `${t('declarationCreated')} ${fullId}`,
      });

      // Reset form
      setDeclarationNumber('0001');
      setType('دخول');
      setStatus('draft');
      setArchiveNumber('');
      setPhone('');
      setNotes('');
      setAutoGenerateArchive(true);
      setOpen(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message || t('declarationCreationFailed'),
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
          {t('addDeclaration')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('createNewDeclaration')}</DialogTitle>
          <DialogDescription>
            {t('enterDeclarationDetails')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="number">{t('declarationNumberLabel')}</Label>
            <div className="flex gap-2">
              <Input
                id="number"
                type="text"
                value={declarationNumber}
                onChange={(e) => setDeclarationNumber(e.target.value)}
                placeholder="0001"
                required
                maxLength={4}
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
                {loadingNextNumber ? t('loading') : t('refresh')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {loadingNextNumber ? (
                'جاري جلب الرقم التالي...'
              ) : (
                <>
                  الرقم النهائي: {type === 'دخول' ? 'IN' : 'OUT'}-{new Date().getFullYear()}-{declarationNumber.padStart(4, '0')}
                  <br />
                  <span className="text-xs">
                    {type === 'دخول' ? '(إقرار دخول)' : '(إقرار خروج)'} - يبدأ الترقيم من 0001 كل سنة
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">{t('declarationType')}</Label>
            <Select
              value={type}
              onValueChange={(value: 'دخول' | 'خروج') => setType(value)}
              disabled={loading}
            >
              <SelectTrigger className="glass-card border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="دخول">{t('entrance')}</SelectItem>
                <SelectItem value="خروج">{t('exit')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t('initialStatus')}</Label>
            <Select
              value={status}
              onValueChange={(value: 'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'received_by_admin_office' | 'returned_to_warehouse' | 'archived' | 'rejected') => setStatus(value)}
              disabled={loading}
            >
              <SelectTrigger className="glass-card border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t('draft')}</SelectItem>
                <SelectItem value="pending_warehouse_signature">{t('pendingWarehouseSignature')}</SelectItem>
                <SelectItem value="warehouse_signed">{t('warehouseSigned')}</SelectItem>
                <SelectItem value="sent_to_admin_office">{t('sentToAdminOffice')}</SelectItem>
                <SelectItem value="received_by_admin_office">{t('receivedByAdminOffice')}</SelectItem>
                <SelectItem value="returned_to_warehouse">{t('returnedToWarehouse')}</SelectItem>
                <SelectItem value="archived">{t('archived')}</SelectItem>
                <SelectItem value="rejected">{t('rejected')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="archive_number">رقم ملف الأرشيف</Label>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="auto_archive"
                checked={autoGenerateArchive}
                onCheckedChange={(checked) => setAutoGenerateArchive(checked === true)}
              />
              <label htmlFor="auto_archive" className="text-sm text-muted-foreground cursor-pointer">
                توليد تلقائي
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-10 flex items-center justify-center bg-muted rounded-md font-semibold text-lg border border-border">
                S
              </div>
              <Input
                id="archive_number"
                type="text"
                value={archiveNumber.replace(/^S/, '')}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setArchiveNumber(value ? `S${value}` : '');
                }}
                placeholder="1"
                disabled={loading || autoGenerateArchive}
                className="glass-card border-border/50 flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              التنسيق: S1, S2, S3... حتى S16 وما بعدها. سيتم التوليد التلقائي إذا تركته فارغاً
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">رقم الهاتف (اختياري)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0500000000"
              disabled={loading}
              className="glass-card border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظات إضافية..."
              disabled={loading}
              className="glass-card border-border/50 min-h-[100px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('creating') : t('createDeclaration')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
