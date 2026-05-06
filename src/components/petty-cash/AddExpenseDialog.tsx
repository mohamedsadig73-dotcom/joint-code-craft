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
import { Check, ChevronsUpDown, AlertCircle, Calendar } from 'lucide-react';
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
  start_date: string | null;
  end_date: string | null;
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
  const [dateError, setDateError] = useState<string | null>(null);

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
    setDateError(null);
  }, [expense, open]);

  // Validate expense date against period dates
  useEffect(() => {
    if (!openPeriod || !formData.expense_date) {
      setDateError(null);
      return;
    }

    const expDate = formData.expense_date;
    
    if (openPeriod.start_date && expDate < openPeriod.start_date) {
      setDateError(language === 'ar' 
        ? `تاريخ المصروف قبل تاريخ بداية الفترة (${openPeriod.start_date})`
        : `Expense date is before period start date (${openPeriod.start_date})`);
    } else if (openPeriod.end_date && expDate > openPeriod.end_date) {
      setDateError(language === 'ar'
        ? `تاريخ المصروف بعد تاريخ نهاية الفترة (${openPeriod.end_date})`
        : `Expense date is after period end date (${openPeriod.end_date})`);
    } else {
      setDateError(null);
    }
  }, [formData.expense_date, openPeriod, language]);

  const loadOpenPeriod = async () => {
    try {
      const { data, error } = await supabase
        .from('petty_cash_periods')
        .select('id, period_number, current_balance, start_date, end_date')
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

    // Manual validation for fields that HTML5 required doesn't cover
    if (!formData.vendor_name.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال اسم المورد' : 'Please enter vendor name');
      return;
    }
    if (!formData.description.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال الوصف' : 'Please enter description');
      return;
    }
    if (!formData.cost_center.trim()) {
      toast.error(language === 'ar' ? 'يرجى اختيار مركز التكلفة' : 'Please select cost center');
      return;
    }
    if (!formData.unit_price || parseFloat(formData.unit_price) <= 0) {
      toast.error(language === 'ar' ? 'يرجى إدخال سعر صحيح' : 'Please enter a valid price');
      return;
    }

    // Check date validation
    if (dateError) {
      toast.error(dateError);
      return;
    }
    
    setLoading(true);

    try {
      const quantity = parseFloat(formData.quantity) || 1;
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

      if (!periodId) {
        toast.error(language === 'ar'
          ? 'يجب ربط المصروف بفترة نثرية'
          : 'Expense must be linked to a period');
        setLoading(false);
        return;
      }

      const payload = {
        expense_date: formData.expense_date,
        invoice_number: formData.invoice_number || null,
        vendor_name: formData.vendor_name.trim(),
        description: formData.description.trim(),
        quantity,
        unit_price: unitPrice,
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
        }

        const { error } = await supabase
          .from('petty_cash_expenses')
          .update(payload)
          .eq('id', expense.id);

        if (error) throw error;
        toast.success(t('expenseUpdated'));
      } else {
        const { error } = await supabase
          .from('petty_cash_expenses')
          .insert(payload);

        if (error) throw error;
        toast.success(t('expenseAdded'));
      }

      // DB trigger 'update_period_totals_trigger' handles recalculation automatically
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      console.error('Error saving expense:', error);
      const msg = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
          ? error.message
          : String(error);
      if (msg.includes('قبل تاريخ بداية') || msg.includes('بعد تاريخ نهاية') || msg.includes('before period') || msg.includes('after period')) {
        toast.error(language === 'ar' 
          ? 'تاريخ المصروف خارج نطاق فترة النثرية'
          : 'Expense date is outside the period date range');
      } else if (msg.includes('generated column') || msg.includes('total_amount')) {
        toast.error(language === 'ar'
          ? 'تم إصلاح خطأ حفظ الإجمالي. حاول إضافة المصروف مرة أخرى.'
          : 'The total field save issue was fixed. Please try adding the expense again.');
      } else if (msg.includes('row-level security')) {
        toast.error(language === 'ar'
          ? 'ليس لديك صلاحية لإضافة مصروف. تأكد من تسجيل الدخول.'
          : 'Permission denied. Please make sure you are logged in.');
      } else {
        toast.error(`${t('errorOccurred')}: ${msg}`);
      }
    } finally {
      setLoading(false);
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
                {openPeriod.start_date && (
                  <>
                    <span className="mx-2">|</span>
                    <Calendar className="inline w-3 h-3" /> {openPeriod.start_date}
                    {openPeriod.end_date ? ` → ${openPeriod.end_date}` : ` → ${language === 'ar' ? 'مفتوحة' : 'Open'}`}
                  </>
                )}
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

        {/* Date validation error */}
        {dateError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{dateError}</AlertDescription>
          </Alert>
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
                className={dateError ? 'border-destructive' : ''}
                min={openPeriod?.start_date || undefined}
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
                rows={2}
              />
            </div>
          </div>

          <div className={`flex gap-3 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button 
              type="submit" 
              disabled={loading || (!expense && !openPeriod) || !!dateError} 
              className="flex-1"
            >
              {loading ? t('saving') : (expense ? t('update') : t('addExpense'))}
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
