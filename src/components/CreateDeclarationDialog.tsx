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
  number: z.string().trim().min(4, 'رقم الإقرار يجب أن يكون 4 أرقام').max(4, 'رقم الإقرار يجب أن يكون 4 أرقام').regex(/^\d+$/, 'يجب أن يحتوي على أرقام فقط'),
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

  // Load next available number when dialog opens or type changes
  useEffect(() => {
    if (open) {
      loadNextNumber();
    }
  }, [open, type]);

  const loadNextNumber = async () => {
    setLoadingNextNumber(true);
    try {
      const currentYear = new Date().getFullYear();
      // Use different prefixes for entry and exit declarations
      const prefix = type === 'دخول' ? 'IN' : 'OUT';
      
      // Get all declarations for current year and type
      const { data, error } = await supabase
        .from('declarations')
        .select('id')
        .ilike('id', `${prefix}-${currentYear}-%`)
        .order('id', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        // Extract number from last declaration (e.g., "IN-2025-0005" -> 5)
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
        title: t('error'),
        description: error.errors?.[0]?.message || t('invalidData'),
      });
      return;
    }

    // Generate full ID with IN/OUT prefix based on type and current year
    const currentYear = new Date().getFullYear();
    const prefix = type === 'دخول' ? 'IN' : 'OUT';
    const fullId = `${prefix}-${currentYear}-${declarationNumber.padStart(4, '0')}`;

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
        title: t('success'),
        description: `${t('declarationCreated')} ${fullId}`,
      });

      // Reset form
      setDeclarationNumber('0001');
      setType('دخول');
      setStatus('draft');
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
      <DialogContent className="sm:max-w-[500px]">
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
