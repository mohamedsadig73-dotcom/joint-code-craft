import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatNumber } from '@/utils/numberFormat';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostCenter {
  id: string;
  name: string;
  name_ar: string;
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
    setLoading(true);

    try {
      const payload = {
        expense_date: formData.expense_date,
        invoice_number: formData.invoice_number || null,
        vendor_name: formData.vendor_name,
        description: formData.description,
        quantity: parseFloat(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        cost_center: formData.cost_center,
        item_name: formData.item_name || null,
        recipient: formData.recipient || null,
        notes: formData.notes || null,
        created_by: user?.id
      };

      if (expense) {
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

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(t('errorOccurred'));
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
