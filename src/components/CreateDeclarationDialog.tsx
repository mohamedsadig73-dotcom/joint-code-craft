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
  status: z.enum(['draft', 'pending_warehouse_signature', 'warehouse_signed', 'sent_to_admin_office', 'returned_to_warehouse', 'archived']),
});

interface CreateDeclarationDialogProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

// Dynamic status options based on declaration type
const getStatusOptions = (type: 'دخول' | 'خروج', t: (key: string) => string) => {
  const isIncoming = type === 'دخول';
  
  return [
    { value: 'draft', label: t('draft') },
    { 
      value: 'pending_warehouse_signature', 
      label: isIncoming ? t('pendingDelivererSignature') : t('pendingReceiverSignature') 
    },
    { 
      value: 'warehouse_signed', 
      label: isIncoming ? t('signedByDeliverer') : t('signedByReceiver') 
    },
    { value: 'sent_to_admin_office', label: t('sentToAdminOffice') },
    { value: 'returned_to_warehouse', label: t('returnedForModification') },
    { value: 'archived', label: t('archived') },
  ];
};

export function CreateDeclarationDialog({ onSuccess, open: controlledOpen, onOpenChange, trigger }: CreateDeclarationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingNextNumber, setLoadingNextNumber] = useState(false);
  const [declarationNumber, setDeclarationNumber] = useState('');
  const [type, setType] = useState<'دخول' | 'خروج'>('دخول');
  const [status, setStatus] = useState<'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'returned_to_warehouse' | 'archived'>('draft');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Get status options based on type
  const statusOptions = getStatusOptions(type, t);

  // Available years (current year and previous 2 years)
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear - 1, currentYear - 2];

  // Load next available number when dialog opens or type/year changes
  useEffect(() => {
    if (open) {
      loadNextNumber();
    }
  }, [open, type, selectedYear]);

  const loadNextNumber = async () => {
    setLoadingNextNumber(true);
    try {
      const prefix = type === 'دخول' ? 'IN' : 'OUT';
      
      // Get all declarations for selected year with the specific type prefix
      const { data, error } = await supabase
        .from('declarations')
        .select('id')
        .ilike('id', `${prefix}-${selectedYear}-%`)
        .is('deleted_at', null)
        .order('id', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        // Extract number from last declaration (e.g., "IN-2025-165" -> 165)
        const lastId = data[0].id;
        const parts = lastId.split('-');
        const lastNumber = parseInt(parts[2]);
        nextNumber = lastNumber + 1;
      }

      // Auto-pad to 4 digits
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

    // Generate full ID with type-based prefix and selected year
    const prefix = type === 'دخول' ? 'IN' : 'OUT';
    const fullId = `${prefix}-${selectedYear}-${declarationNumber.padStart(4, '0')}`;

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
        {trigger || (
          <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2">
            <Plus className="w-4 h-4" />
            {t('addDeclaration')}
          </Button>
        )}
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
                onChange={(e) => {
                  // Only allow numeric input
                  const value = e.target.value.replace(/\D/g, '');
                  setDeclarationNumber(value);
                }}
                onBlur={() => {
                  // Auto-pad to 4 digits when user leaves the field
                  if (declarationNumber && declarationNumber.length > 0) {
                    setDeclarationNumber(declarationNumber.padStart(4, '0'));
                  }
                }}
                placeholder="0006"
                required
                disabled={loading || loadingNextNumber}
                className="glass-card border-border/50 flex-1 font-mono"
                maxLength={6}
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
              ) : declarationNumber ? (
                <>الرقم النهائي: <span className="font-mono font-medium text-foreground">{type === 'دخول' ? 'IN' : 'OUT'}-{selectedYear}-{declarationNumber.padStart(4, '0')}</span></>
              ) : (
                <>أدخل رقم الإقرار</>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">{t('year') || 'السنة'}</Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
              disabled={loading}
            >
              <SelectTrigger className="glass-card border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              onValueChange={(value: 'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'returned_to_warehouse' | 'archived') => setStatus(value)}
              disabled={loading}
            >
              <SelectTrigger className="glass-card border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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
