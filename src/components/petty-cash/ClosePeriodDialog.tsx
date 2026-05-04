import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { wmsToast as toast } from '@/lib/wmsToast';
import { formatNumber } from '@/utils/numberFormat';
import { 
  ArrowRightLeft, 
  Undo2, 
  FileX, 
  AlertTriangle,
  Wallet,
  CheckCircle2
} from 'lucide-react';
import { StandardModal } from '@/components/ui/StandardModal';
import { StandardAlert } from '@/components/ui/StandardForm';

interface PettyCashPeriod {
  id: string;
  period_number: string;
  current_balance: number;
  total_expenses: number;
  opening_balance: number;
}

interface ClosePeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: PettyCashPeriod;
  onSuccess: () => void;
}

type DispositionType = 'carried_forward' | 'refunded' | 'written_off';

export function ClosePeriodDialog({ 
  open, 
  onOpenChange, 
  period, 
  onSuccess 
}: ClosePeriodDialogProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  
  const [disposition, setDisposition] = useState<DispositionType>('carried_forward');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const hasBalance = period.current_balance > 0;
  const isSmallAmount = period.current_balance <= 10;

  const handleClose = async () => {
    setLoading(true);
    
    try {
      // Update period with disposition info
      const updateData: Record<string, unknown> = {
        status: 'pending_approval',
        closed_at: new Date().toISOString(),
        closed_by: user?.id,
        end_date: new Date().toISOString().split('T')[0]
      };

      // If there's a remaining balance, set disposition
      if (hasBalance) {
        updateData.balance_disposition = disposition;
        updateData.disposition_amount = period.current_balance;
        updateData.disposition_reference = reference || null;
      }

      const { error: updateError } = await supabase
        .from('petty_cash_periods')
        .update(updateData)
        .eq('id', period.id);

      if (updateError) throw updateError;

      // Record the transaction
      if (hasBalance) {
        const transactionType = disposition === 'carried_forward' 
          ? 'carry_forward_out' 
          : disposition === 'refunded' 
            ? 'refund' 
            : 'write_off';

        const { error: txError } = await supabase
          .from('petty_cash_transactions')
          .insert({
            period_id: period.id,
            transaction_type: transactionType,
            amount: period.current_balance,
            reference_number: reference || null,
            notes: notes || getDefaultNote(disposition),
            created_by: user?.id
          });

        if (txError) throw txError;
      }

      toast.success(t('periodClosedSuccess'));
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setDisposition('carried_forward');
      setReference('');
      setNotes('');
    } catch (error: unknown) {
      console.error('Error closing period:', error);
      const errorMessage = error instanceof Error ? error.message : t('errorOccurred');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultNote = (type: DispositionType): string => {
    switch (type) {
      case 'carried_forward':
        return language === 'ar' 
          ? `ترحيل الرصيد المتبقي من النثرية ${period.period_number}`
          : `Balance carried forward from period ${period.period_number}`;
      case 'refunded':
        return language === 'ar'
          ? `إرجاع الرصيد المتبقي للصندوق الرئيسي`
          : `Remaining balance refunded to main cash`;
      case 'written_off':
        return language === 'ar'
          ? `إهلاك فروقات بسيطة`
          : `Small variance written off`;
      default:
        return '';
    }
  };

  const dispositionOptions = [
    {
      value: 'carried_forward' as DispositionType,
      icon: ArrowRightLeft,
      title: language === 'ar' ? 'ترحيل للنثرية الجديدة' : 'Carry Forward',
      description: language === 'ar' 
        ? 'يُنقل الرصيد المتبقي كرصيد افتتاحي للنثرية القادمة'
        : 'Transfer remaining balance as opening balance for next period',
      recommended: true
    },
    {
      value: 'refunded' as DispositionType,
      icon: Undo2,
      title: language === 'ar' ? 'إرجاع للصندوق الرئيسي' : 'Refund to Main Cash',
      description: language === 'ar'
        ? 'يُعاد المبلغ المتبقي للصندوق الرئيسي أو البنك'
        : 'Return remaining amount to main cash or bank account',
      recommended: false
    },
    {
      value: 'written_off' as DispositionType,
      icon: FileX,
      title: language === 'ar' ? 'إهلاك (فروقات بسيطة)' : 'Write Off',
      description: language === 'ar'
        ? 'للمبالغ الصغيرة فقط - يتطلب موافقة إدارية'
        : 'For small amounts only - requires management approval',
      recommended: false,
      warning: !isSmallAmount
    }
  ];

  return (
    <StandardModal
      open={open}
      onOpenChange={onOpenChange}
      title={language === 'ar' ? 'إغلاق فترة النثرية' : 'Close Petty Cash Period'}
      description={language === 'ar' ? `النثرية رقم: ${period.period_number}` : `Period: ${period.period_number}`}
      size="md"
      submitLabel={loading
        ? (language === 'ar' ? 'جاري الإغلاق...' : 'Closing...')
        : (language === 'ar' ? 'إغلاق النثرية' : 'Close Period')}
      submitVariant="destructive"
      submitting={loading}
      onSubmit={handleClose}
    >
      <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-4">
        {/* Balance Summary */}
        <div className="rounded-md border border-[hsl(var(--wms-border))] bg-[hsl(var(--wms-bg3))] p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}
              </span>
              <span className="font-medium">{formatNumber(period.opening_balance)} {t('currency')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}
              </span>
              <span className="font-medium text-[hsl(var(--wms-red))]">-{formatNumber(period.total_expenses)} {t('currency')}</span>
            </div>
            <div className="border-t border-[hsl(var(--wms-border))] pt-2 flex justify-between items-center">
              <span className="font-semibold">
                {language === 'ar' ? 'الرصيد المتبقي' : 'Remaining Balance'}
              </span>
              <Badge variant={hasBalance ? "wms-blue" : "wms-gray"} className="text-base px-3 py-1">
                {formatNumber(period.current_balance)} {t('currency')}
              </Badge>
            </div>
        </div>

        {/* No Balance - Direct Close */}
        {!hasBalance ? (
          <StandardAlert tone="success">
            {language === 'ar'
              ? 'لا يوجد رصيد متبقي. يمكن إغلاق النثرية مباشرة.'
              : 'No remaining balance. Period can be closed directly.'}
          </StandardAlert>
        ) : (
          /* Balance Disposition Options */
          <div className="space-y-3">
            <Label className="text-base font-medium">
              {language === 'ar' ? 'اختر طريقة التصرف بالرصيد المتبقي' : 'Choose how to handle remaining balance'}
            </Label>
            
            <RadioGroup 
              value={disposition} 
              onValueChange={(v) => setDisposition(v as DispositionType)}
              className="space-y-2"
            >
              {dispositionOptions.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                    ${disposition === option.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'}
                    ${option.warning ? 'opacity-60' : ''}
                  `}
                >
                  <RadioGroupItem value={option.value} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <option.icon className="w-4 h-4 text-primary" />
                      <span className="font-medium">{option.title}</span>
                      {option.recommended && (
                        <Badge variant="secondary" className="text-xs">
                          {language === 'ar' ? 'موصى به' : 'Recommended'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                    {option.warning && (
                      <div className="flex items-center gap-1 mt-1 text-yellow-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs">
                          {language === 'ar' 
                            ? 'المبلغ كبير - يُفضل الترحيل أو الإرجاع'
                            : 'Amount too large - prefer carry forward or refund'}
                        </span>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </RadioGroup>

            {/* Reference Number (for refund) */}
            {disposition === 'refunded' && (
              <div className="space-y-2">
                <Label>
                  {language === 'ar' ? 'رقم سند الاستلام' : 'Receipt/Voucher Number'}
                </Label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder={language === 'ar' ? 'أدخل رقم السند...' : 'Enter voucher number...'}
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>
                {language === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={language === 'ar' ? 'أي ملاحظات إضافية...' : 'Any additional notes...'}
              />
            </div>
          </div>
        )}
      </div>
    </StandardModal>
  );
}
