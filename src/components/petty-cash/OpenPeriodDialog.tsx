import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatNumber } from '@/utils/numberFormat';
import { ArrowRightLeft, Info } from 'lucide-react';
import { StandardModal } from '@/components/ui/StandardModal';
import { FormSection, FormField, StandardAlert } from '@/components/ui/StandardForm';

interface CarryForwardInfo {
  period_id: string;
  period_number: string;
  amount: number;
}

interface OpenPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OpenPeriodDialog({ open, onOpenChange, onSuccess }: OpenPeriodDialogProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  const [loading, setLoading] = useState(false);
  const [carryForward, setCarryForward] = useState<CarryForwardInfo | null>(null);
  const [loadingCarry, setLoadingCarry] = useState(false);

  const [formData, setFormData] = useState({
    location: '',
    responsible_person: '',
    opening_balance: '',
    budget_limit: '1000',
    notes: ''
  });

  // Check for carry-forward from previous period
  useEffect(() => {
    if (!open) return;

    const checkCarryForward = async () => {
      setLoadingCarry(true);
      try {
        const { data } = await supabase
          .from('petty_cash_periods')
          .select('id, period_number, current_balance, disposition_amount')
          .eq('balance_disposition', 'carried_forward')
          .in('status', ['closed', 'pending_approval'])
          .order('closed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && (data.disposition_amount || data.current_balance) > 0) {
          // Check if this carry-forward was already used
          const { data: existing } = await supabase
            .from('petty_cash_periods')
            .select('id')
            .eq('carried_from_period_id', data.id)
            .maybeSingle();

          if (!existing) {
            setCarryForward({
              period_id: data.id,
              period_number: data.period_number,
              amount: data.disposition_amount || data.current_balance
            });
          } else {
            setCarryForward(null);
          }
        } else {
          setCarryForward(null);
        }
      } catch (error) {
        console.error('Error checking carry forward:', error);
      } finally {
        setLoadingCarry(false);
      }
    };

    checkCarryForward();
  }, [open]);

  const totalOpeningBalance = parseFloat(formData.opening_balance || '0') + (carryForward?.amount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate period number locally
      const now = new Date();
      const year = now.getFullYear();
      
      const { data: latestPeriod } = await supabase
        .from('petty_cash_periods')
        .select('period_number')
        .ilike('period_number', `PC-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextSeq = 1;
      if (latestPeriod?.period_number) {
        const parts = latestPeriod.period_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
      }
      
      const periodNumber = `PC-${year}-${String(nextSeq).padStart(4, '0')}`;

      const { error } = await supabase
        .from('petty_cash_periods')
        .insert({
          period_number: periodNumber,
          location: formData.location,
          responsible_person: formData.responsible_person,
          opening_balance: totalOpeningBalance,
          current_balance: totalOpeningBalance,
          budget_limit: parseFloat(formData.budget_limit),
          notes: formData.notes || null,
          opened_by: user?.id,
          status: 'open',
          carried_from_period_id: carryForward?.period_id || null,
          start_date: now.toISOString().split('T')[0]
        });

      if (error) throw error;
      
      toast.success(
        carryForward 
          ? (language === 'ar' 
              ? `تم فتح النثرية مع ترحيل ${formatNumber(carryForward.amount)} ر.س` 
              : `Period opened with ${formatNumber(carryForward.amount)} carried forward`)
          : t('periodOpened')
      );
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setFormData({
        location: '',
        responsible_person: '',
        opening_balance: '',
        budget_limit: '1000',
        notes: ''
      });
      setCarryForward(null);
    } catch (error) {
      console.error('Error opening period:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <StandardModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('openNewPeriod')}
      description={carryForward
        ? (language === 'ar'
            ? `سيتم ترحيل الرصيد المتبقي من النثرية السابقة ${carryForward.period_number}`
            : `Remaining balance from period ${carryForward.period_number} will be carried forward`)
        : undefined}
      size="md"
      submitLabel={loading ? t('saving') : t('openPeriod')}
      submitting={loading}
      submitDisabled={loadingCarry}
      onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
    >
      <div className="space-y-1" dir={isRTL ? 'rtl' : 'ltr'}>
        {carryForward && (
          <StandardAlert tone="info" className="mb-3">
            <div className="flex items-start gap-2">
              <ArrowRightLeft className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-[13px]">
                  {language === 'ar' ? 'رصيد مُرحّل' : 'Carried Forward Balance'}
                  <span className="opacity-80 mx-1">— {language === 'ar' ? `من النثرية ${carryForward.period_number}` : `From ${carryForward.period_number}`}</span>
                </div>
                <Badge variant="wms-blue" className="mt-1.5">
                  +{formatNumber(carryForward.amount)} {t('currency')}
                </Badge>
              </div>
            </div>
          </StandardAlert>
        )}

        <FormSection title={t('basicInfo') || 'البيانات الأساسية'} columns={2}>
          <FormField label={t('location')} required>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={t('locationPlaceholder')}
            />
          </FormField>
          <FormField label={t('responsiblePerson')} required>
            <Input
              value={formData.responsible_person}
              onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
              placeholder={t('responsiblePersonPlaceholder')}
            />
          </FormField>
        </FormSection>

        <FormSection title={language === 'ar' ? 'الرصيد والميزانية' : 'Balance & Budget'} columns={2}>
          <FormField
            label={language === 'ar' ? 'الرصيد الافتتاحي الجديد' : 'New Opening Balance'}
            required
            hint={carryForward && formData.opening_balance
              ? (language === 'ar'
                  ? `الإجمالي: ${formatNumber(totalOpeningBalance)} ${t('currency')} (${formData.opening_balance} + ${formatNumber(carryForward.amount)} مُرحّل)`
                  : `Total: ${formatNumber(totalOpeningBalance)} ${t('currency')}`)
              : undefined}
          >
            <Input
              type="number" min="0" step="0.01"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              placeholder="0.00"
            />
          </FormField>
          <FormField label={t('budgetLimit')}>
            <Input
              type="number" min="0" step="0.01"
              value={formData.budget_limit}
              onChange={(e) => setFormData({ ...formData, budget_limit: e.target.value })}
              placeholder="1000"
            />
          </FormField>
        </FormSection>

        <FormSection columns={1}>
          <FormField label={t('notes')}>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('notesPlaceholder')}
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </StandardModal>
  );
}
