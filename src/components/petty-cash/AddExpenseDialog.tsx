import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatNumber } from '@/utils/numberFormat';
import { Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostCenter {
  id: string;
  name: string;
  name_ar: string;
}

interface OpenPeriod {
  id: string;
  period_number: string;
  current_balance: number;
}

interface Expense {
  id: string;
  expense_date: string;
  invoice_number: string | null;
  vendor_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  cost_center: string;
  item_name: string | null;
  recipient: string | null;
  notes: string | null;
  period_id?: string | null;
}

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onSuccess: () => void;
}

export function AddExpenseDialog({ open, onOpenChange, expense, onSuccess }: AddExpenseDialogProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  const [loading, setLoading] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [openPeriod, setOpenPeriod] = useState<OpenPeriod | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(true);

  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    vendor_name: '',
    description: '',
    quantity: '1',
    unit_price: '',
    cost_center: '',
    item_name: '',
    recipient: '',
    notes: ''
  });

  useEffect(() => {
    loadCostCenters();
    loadVendors();
    loadOpenPeriod();
  }, []);

  useEffect(() => {
    if (expense) {
      setFormData({
        expense_date: expense.expense_date,
        invoice_number: expense.invoice_number || '',
        vendor_name: expense.vendor_name,
        description: expense.description,
        quantity: String(expense.quantity),
        unit_price: String(expense.unit_price),
        cost_center: expense.cost_center,
        item_name: expense.item_name || '',
        recipient: expense.recipient || '',
        notes: expense.notes || ''
      });
    } else {
      setFormData({
        expense_date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        vendor_name: '',
        description: '',
        quantity: '1',
        unit_price: '',
        cost_center: '',
        item_name: '',
        recipient: '',
        notes: ''
      });
    }
  }, [expense, open]);

  const loadOpenPeriod = async () => {
    try {
      const { data, error } = await supabase
        .from('petty_cash_periods')
        .select('id, period_number, current_balance')
        .eq('status', 'open')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setOpenPeriod(data as OpenPeriod | null);
    } catch (error) {
      console.error('Error loading open period:', error);
      setOpenPeriod(null);
    } finally {
      setLoadingPeriod(false);
    }
  };

  const loadCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCostCenters(data || []);
    } catch (error) {
      console.error('Error loading cost centers:', error);
    }
  };

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('petty_cash_expenses')
        .select('vendor_name')
        .order('vendor_name');

      if (error) throw error;
      // Get unique vendor names
      const uniqueVendors = [...new Set(data?.map(e => e.vendor_name) || [])];
      setVendors(uniqueVendors);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if there's an open period (only for new expenses)
    if (!expense && !openPeriod) {
      toast.error(t('noOpenPeriodError'));
      return;
    }
    
    setLoading(true);

    try {
      const quantity = parseFloat(formData.quantity);
      const unitPrice = parseFloat(formData.unit_price);
      const calculatedTotal = quantity * unitPrice;
      const periodId = openPeriod?.id || expense?.period_id || null;

      // Validate balance for new expenses
      if (!expense && openPeriod && calculatedTotal > openPeriod.current_balance) {
        toast.error(language === 'ar' 
          ? `المبلغ (${formatNumber(calculatedTotal)}) يتجاوز الرصيد المتبقي (${formatNumber(openPeriod.current_balance)})`
          : `Amount (${formatNumber(calculatedTotal)}) exceeds remaining balance (${formatNumber(openPeriod.current_balance)})`);
        setLoading(false);
        return;
      }

      const payload = {
        expense_date: formData.expense_date,
        invoice_number: formData.invoice_number || null,
        vendor_name: formData.vendor_name,
        description: formData.description,
        quantity,
        unit_price: unitPrice,
        total_amount: calculatedTotal,
        cost_center: formData.cost_center,
        item_name: formData.item_name || null,
        recipient: formData.recipient || null,
        notes: formData.notes || null,
        created_by: user?.id,
        period_id: periodId
      };

      if (expense) {
        // Prevent editing approved expenses
        if (expense.period_id) {
          const { data: expData } = await supabase
            .from('petty_cash_expenses')
            .select('status, total_amount')
            .eq('id', expense.id)
            .single();
          
          if (expData?.status === 'approved') {
            toast.error(language === 'ar' 
              ? 'لا يمكن تعديل مصروف تمت الموافقة عليه'
              : 'Cannot edit an approved expense');
            setLoading(false);
            return;
          }

          // If amount changed, update period balance
          const oldAmount = Number(expData?.total_amount || 0);
          const diff = calculatedTotal - oldAmount;
          if (diff !== 0 && periodId) {
            await supabase
              .from('petty_cash_periods')
              .update({
                total_expenses: Math.max(0, (openPeriod?.current_balance ? 0 : 0)),
              })
              .eq('id', periodId);
            // Use raw SQL via RPC would be better, but for now recalculate after
          }
        }

        const { error } = await supabase
          .from('petty_cash_expenses')
          .update(payload)
          .eq('id', expense.id);

        if (error) throw error;
        
        // Recalculate period totals
        if (periodId) await recalculatePeriodTotals(periodId);
        
        toast.success(t('expenseUpdated'));
      } else {
        const { error } = await supabase
          .from('petty_cash_expenses')
          .insert(payload);

        if (error) throw error;
        
        // Recalculate period totals
        if (periodId) await recalculatePeriodTotals(periodId);
        
        toast.success(t('expenseAdded'));
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const recalculatePeriodTotals = async (periodId: string) => {
    try {
      const { data: periodExpenses } = await supabase
        .from('petty_cash_expenses')
        .select('total_amount, status')
        .eq('period_id', periodId)
        .neq('status', 'rejected');

      const totalExp = periodExpenses?.reduce((sum, e) => sum + Number(e.total_amount || 0), 0) || 0;
      const count = periodExpenses?.length || 0;

      const { data: period } = await supabase
        .from('petty_cash_periods')
        .select('opening_balance')
        .eq('id', periodId)
        .single();

      const openingBalance = Number(period?.opening_balance || 0);

      await supabase
        .from('petty_cash_periods')
        .update({
          total_expenses: totalExp,
          expenses_count: count,
          current_balance: openingBalance - totalExp
        })
        .eq('id', periodId);
    } catch (error) {
      console.error('Error recalculating period totals:', error);
    }
  };

  const totalAmount = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.unit_price) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{expense ? t('editExpense') : t('addExpense')}</DialogTitle>
        </DialogHeader>

        {/* Period Info / Warning */}
        {!expense && (
          loadingPeriod ? (
            <div className="h-12 bg-muted animate-pulse rounded-lg" />
          ) : openPeriod ? (
            <Alert className="border-green-500/50 bg-green-500/10">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                {t('expenseWillBeAddedToPeriod')}: <strong>{openPeriod.period_number}</strong>
                <span className="mx-2">|</span>
                {t('remainingBalance')}: <strong>{formatNumber(openPeriod.current_balance)} {t('currency')}</strong>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('noOpenPeriodWarning')}
              </AlertDescription>
            </Alert>
          )
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Date */}
            <div className="space-y-2">
              <Label>{t('date')} *</Label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                required
              />
            </div>

            {/* Invoice Number */}
            <div className="space-y-2">
              <Label>{t('invoiceNumber')}</Label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder={t('invoiceNumberPlaceholder')}
              />
            </div>

            {/* Vendor */}
            <div className="space-y-2">
              <Label>{t('vendor')} *</Label>
              <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={vendorOpen}
                    className="w-full justify-between"
                  >
                    {formData.vendor_name || t('vendorPlaceholder')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder={t('searchOrAddVendor') || 'بحث أو إضافة مورد...'} 
                      value={formData.vendor_name}
                      onValueChange={(value) => setFormData({ ...formData, vendor_name: value })}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-sm text-muted-foreground">
                          {t('newVendor') || 'مورد جديد'}: {formData.vendor_name}
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {vendors.map((vendor) => (
                          <CommandItem
                            key={vendor}
                            value={vendor}
                            onSelect={() => {
                              setFormData({ ...formData, vendor_name: vendor });
                              setVendorOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.vendor_name === vendor ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {vendor}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Cost Center */}
            <div className="space-y-2">
              <Label>{t('costCenter')} *</Label>
              <Select
                value={formData.cost_center}
                onValueChange={(value) => setFormData({ ...formData, cost_center: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectCostCenter')} />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={isRTL ? cc.name_ar : cc.name}>
                      {isRTL ? cc.name_ar : cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label>{t('description')} *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
                required
              />
            </div>

            {/* Item Name */}
            <div className="space-y-2">
              <Label>{t('itemName')}</Label>
              <Input
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                placeholder={t('itemNamePlaceholder')}
              />
            </div>

            {/* Recipient */}
            <div className="space-y-2">
              <Label>{t('recipient')}</Label>
              <Input
                value={formData.recipient}
                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                placeholder={t('recipientPlaceholder')}
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>{t('quantity')} *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>

            {/* Unit Price */}
            <div className="space-y-2">
              <Label>{t('unitPrice')} *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                required
              />
            </div>

            {/* Total (Calculated) */}
            <div className="space-y-2 md:col-span-2">
              <Label>{t('total')}</Label>
              <div className="p-3 bg-muted rounded-lg text-lg font-bold">
                {formatNumber(totalAmount)} ريال
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label>{t('notes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('notesPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          <div className={`flex gap-3 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? t('saving') : (expense ? t('update') : t('add'))}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
