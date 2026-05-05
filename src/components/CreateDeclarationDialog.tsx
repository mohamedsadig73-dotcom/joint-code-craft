import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as vouchers from '@/services/vouchersService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { StandardModal } from '@/components/ui/StandardModal';
import { FormSection, FormField, StandardAlert } from '@/components/ui/StandardForm';
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
import { Progress } from '@/components/ui/progress';

const declarationSchema = z.object({
  number: z.string().trim().min(3, 'رقم الإقرار يجب أن يكون 3 أرقام على الأقل').max(6, 'رقم الإقرار طويل جداً').regex(/^\d+$/, 'يجب أن يحتوي على أرقام فقط'),
  type: z.enum(['دخول', 'خروج'], { required_error: 'يجب اختيار نوع الإقرار' }),
  status: z.enum(['draft', 'pending_warehouse_signature', 'warehouse_signed', 'sent_to_admin_office', 'returned_to_warehouse', 'archived', 'rejected']),
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
    { value: 'rejected', label: t('rejected') },
  ];
};

type CreationMode = 'single' | 'multiple';

export function CreateDeclarationDialog({ onSuccess, open: controlledOpen, onOpenChange, trigger }: CreateDeclarationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingNextNumber, setLoadingNextNumber] = useState(false);
  const [declarationNumber, setDeclarationNumber] = useState('');
  const [type, setType] = useState<'دخول' | 'خروج'>('دخول');
  const [status, setStatus] = useState<'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'returned_to_warehouse' | 'archived' | 'rejected'>('draft');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [mode, setMode] = useState<CreationMode>('single');
  const [fromNumber, setFromNumber] = useState('');
  const [toNumber, setToNumber] = useState('');
  const [batchProgress, setBatchProgress] = useState(0);
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
      const padded = await vouchers.getNextDeclarationNumber(type, selectedYear);
      setDeclarationNumber(padded);
      if (mode === 'multiple') {
        setFromNumber(padded);
        setToNumber(padded);
      }
    } catch (error) {
      console.error('Error loading next number:', error);
      setDeclarationNumber('0001');
    } finally {
      setLoadingNextNumber(false);
    }
  };

  const handleSingleSubmit = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: t('error'), description: t('mustLogin') });
      return;
    }

    try {
      declarationSchema.parse({ number: declarationNumber, type, status });
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('error'), description: error.errors?.[0]?.message || t('invalidData') });
      return;
    }

    const prefix = type === 'دخول' ? 'IN' : 'OUT';
    const fullId = `${prefix}-${selectedYear}-${declarationNumber.padStart(4, '0')}`;

    setLoading(true);
    try {
      try {
        await vouchers.createDeclaration(
          { number: declarationNumber, type, status, year: selectedYear },
          user.id,
        );
      } catch (err) {
        if (err instanceof vouchers.ServiceError && err.code === 'conflict') {
          throw new Error('رقم الإقرار موجود مسبقاً');
        }
        throw err;
      }
      toast({ title: t('success'), description: `${t('declarationCreated')} ${fullId}` });
      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('error'), description: error.message || t('declarationCreationFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: t('error'), description: t('mustLogin') });
      return;
    }

    const from = parseInt(fromNumber);
    const to = parseInt(toNumber);

    if (isNaN(from) || isNaN(to) || from > to) {
      toast({ variant: 'destructive', title: t('error'), description: t('invalidData') });
      return;
    }

    const count = to - from + 1;
    if (count > 50) {
      toast({ variant: 'destructive', title: t('error'), description: t('maxBatchSize') });
      return;
    }

    const rows = [];
    for (let i = from; i <= to; i++) {
      rows.push({ number: String(i), type, status, year: selectedYear });
    }

    setLoading(true);
    setBatchProgress(0);

    let successCount = 0;
    let failCount = 0;
    try {
      const { inserted } = await vouchers.createDeclarationBatch(rows, user.id, {
        chunkSize: 10,
        onProgress: (done, total) => setBatchProgress(Math.round((done / total) * 100)),
      });
      successCount = inserted;
    } catch {
      failCount = rows.length - successCount;
    }

    if (successCount > 0) {
      toast({
        title: t('success'),
        description: `${successCount} ${t('batchDeclarationsCreated')}`,
      });
    }
    if (failCount > 0) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: `${t('batchCreationFailed')} (${failCount})`,
      });
    }

    if (successCount > 0) {
      resetForm();
      setOpen(false);
      onSuccess?.();
    }

    setLoading(false);
    setBatchProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'single') {
      await handleSingleSubmit();
    } else {
      await handleBatchSubmit();
    }
  };

  const resetForm = () => {
    setDeclarationNumber('');
    setType('دخول');
    setStatus('draft');
    setMode('single');
    setFromNumber('');
    setToNumber('');
  };

  const batchCount = mode === 'multiple' && fromNumber && toNumber
    ? Math.max(0, parseInt(toNumber) - parseInt(fromNumber) + 1) || 0
    : 0;

  const submitDisabled = loading || (mode === 'multiple' && (batchCount > 50 || batchCount === 0));
  const submitLabel = loading
    ? (mode === 'multiple' ? t('batchCreating') : t('creating'))
    : mode === 'multiple' && batchCount > 1
      ? `${t('createDeclaration')} (${batchCount})`
      : t('createDeclaration');

  return (
    <>
      {/* Trigger kept on its own Dialog wrapper to preserve existing API */}
      {(controlledOpen === undefined) && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            {trigger || (
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2">
                <Plus className="w-4 h-4" />
                {t('addDeclaration')}
              </Button>
            )}
          </DialogTrigger>
        </Dialog>
      )}

      <StandardModal
        open={open}
        onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}
        title={t('createNewDeclaration')}
        description={t('enterDeclarationDetails')}
        size="md"
        submitLabel={submitLabel}
        submitting={loading}
        submitDisabled={submitDisabled}
        onSubmit={() => handleSubmit({ preventDefault: () => {} } as any)}
      >
        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-[hsl(var(--wms-bg3))] rounded-lg border border-[hsl(var(--wms-border))]">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === 'single'
                  ? 'bg-[hsl(var(--wms-bg2))] text-[hsl(var(--wms-text))] shadow-sm'
                  : 'text-[hsl(var(--wms-text3))] hover:text-[hsl(var(--wms-text))]'
              }`}
            >
              {t('singleDeclaration')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('multiple');
                if (!fromNumber && declarationNumber) {
                  setFromNumber(declarationNumber);
                  const next = (parseInt(declarationNumber) + 4).toString().padStart(4, '0');
                  setToNumber(next);
                }
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === 'multiple'
                  ? 'bg-[hsl(var(--wms-bg2))] text-[hsl(var(--wms-text))] shadow-sm'
                  : 'text-[hsl(var(--wms-text3))] hover:text-[hsl(var(--wms-text))]'
              }`}
            >
              {t('multipleDeclarations')}
            </button>
          </div>

          {/* Number Input */}
          <FormSection columns={1}>
          {mode === 'single' ? (
            <FormField label={t('declarationNumberLabel')} required
              hint={loadingNextNumber ? 'جاري جلب الرقم التالي...' : declarationNumber
                ? `${t('finalId') || 'الرقم النهائي'}: ${type === 'دخول' ? 'IN' : 'OUT'}-${selectedYear}-${declarationNumber.padStart(4, '0')}`
                : ''}
            >
              <div className="flex gap-2">
                <Input
                  id="number"
                  type="text"
                  value={declarationNumber}
                  onChange={(e) => setDeclarationNumber(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => {
                    if (declarationNumber && declarationNumber.length > 0) {
                      setDeclarationNumber(declarationNumber.padStart(4, '0'));
                    }
                  }}
                  placeholder="0006"
                  required
                  disabled={loading || loadingNextNumber}
                  className="flex-1 font-mono"
                  maxLength={6}
                />
                <Button type="button" variant="outline" onClick={loadNextNumber} disabled={loading || loadingNextNumber} className="shrink-0">
                  {loadingNextNumber ? t('loading') : t('refresh')}
                </Button>
              </div>
            </FormField>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t('fromNumber')} required>
                  <Input
                    type="text"
                    value={fromNumber}
                    onChange={(e) => setFromNumber(e.target.value.replace(/\D/g, ''))}
                    onBlur={() => { if (fromNumber) setFromNumber(fromNumber.padStart(4, '0')); }}
                    placeholder="0001"
                    disabled={loading || loadingNextNumber}
                    className="font-mono"
                    maxLength={6}
                  />
                </FormField>
                <FormField label={t('toNumber')} required>
                  <Input
                    type="text"
                    value={toNumber}
                    onChange={(e) => setToNumber(e.target.value.replace(/\D/g, ''))}
                    onBlur={() => { if (toNumber) setToNumber(toNumber.padStart(4, '0')); }}
                    placeholder="0010"
                    disabled={loading || loadingNextNumber}
                    className="font-mono"
                    maxLength={6}
                  />
                </FormField>
              </div>
              <div className="flex gap-2 items-center mt-2">
                <Button type="button" variant="outline" size="sm" onClick={loadNextNumber} disabled={loading || loadingNextNumber}>
                  {loadingNextNumber ? t('loading') : t('refresh')}
                </Button>
                {batchCount > 0 && batchCount <= 50 && (
                  <span className="text-[12px] text-[hsl(var(--wms-text3))]">
                    {batchCount} ({type === 'دخول' ? 'IN' : 'OUT'}-{selectedYear}-{fromNumber.padStart(4, '0')} → {toNumber.padStart(4, '0')})
                  </span>
                )}
              </div>
              {batchCount > 50 && (
                <StandardAlert tone="danger" className="mt-2">{t('maxBatchSize')}</StandardAlert>
              )}
            </>
          )}
          </FormSection>

          <FormSection columns={3}>
            <FormField label={t('year') || 'السنة'} required>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t('declarationType')} required>
              <Select value={type} onValueChange={(v: 'دخول' | 'خروج') => setType(v)} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="دخول">{t('entrance')}</SelectItem>
                  <SelectItem value="خروج">{t('exit')}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t('initialStatus')} required>
              <Select value={status} onValueChange={(v: typeof status) => setStatus(v)} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </FormSection>

          {loading && mode === 'multiple' && batchProgress > 0 && (
            <div className="space-y-2">
              <Progress value={batchProgress} className="h-2" />
              <p className="text-[12px] text-[hsl(var(--wms-text3))] text-center">{batchProgress}%</p>
            </div>
          )}
        </div>
      </StandardModal>
    </>
  );
}
