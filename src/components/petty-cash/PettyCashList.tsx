import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Edit, Trash2, Check, X, FileDown } from 'lucide-react';
import { formatNumber } from '@/utils/numberFormat';
import { formatDate } from '@/utils/dateUtils';
import { wmsToast as toast } from '@/lib/wmsToast';
import { AddExpenseDialog } from './AddExpenseDialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Expense {
  id: string;
  expense_date: string;
  invoice_number: string | null;
  vendor_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  cost_center: string;
  item_name: string | null;
  recipient: string | null;
  notes: string | null;
  status: string;
  created_by: string | null;
}

export function PettyCashList() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadExpenses();
  }, []);

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

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('petty_cash_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error(t('errorLoadingData'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { data: exp } = await supabase
        .from('petty_cash_expenses')
        .select('period_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('petty_cash_expenses')
        .update({ 
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      if (exp?.period_id) await recalculatePeriodTotals(exp.period_id);
      toast.success(t('expenseApproved'));
      loadExpenses();
    } catch (error) {
      console.error('Error approving expense:', error);
      toast.error(t('errorOccurred'));
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { data: exp } = await supabase
        .from('petty_cash_expenses')
        .select('period_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('petty_cash_expenses')
        .update({ 
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      if (exp?.period_id) await recalculatePeriodTotals(exp.period_id);
      toast.success(t('expenseRejected'));
      loadExpenses();
    } catch (error) {
      console.error('Error rejecting expense:', error);
      toast.error(t('errorOccurred'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const { data: exp } = await supabase
        .from('petty_cash_expenses')
        .select('period_id')
        .eq('id', deleteId)
        .single();

      const { error } = await supabase
        .from('petty_cash_expenses')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      if (exp?.period_id) await recalculatePeriodTotals(exp.period_id);
      toast.success(t('expenseDeleted'));
      loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
      approved: 'bg-green-500/20 text-green-700 dark:text-green-400',
      rejected: 'bg-red-500/20 text-red-700 dark:text-red-400'
    };
    const labels = {
      pending: t('pending'),
      approved: t('approved'),
      rejected: t('rejected')
    };
    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const filteredExpenses = expenses.filter(expense =>
    expense.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.cost_center.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className={`flex flex-col sm:flex-row gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            placeholder={t('searchExpenses')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={isRTL ? 'pr-10' : 'pl-10'}
          />
        </div>
        <Button onClick={() => { setEditingExpense(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('addExpense')}
        </Button>
      </div>

      {/* Expenses Table */}
      <Card className="glass-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('date')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('invoiceNumber')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('vendor')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('description')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('costCenter')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('quantity')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('unitPrice')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('total')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('status')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {t('noExpensesFound')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.expense_date)}</TableCell>
                    <TableCell>{expense.invoice_number || '-'}</TableCell>
                    <TableCell>{expense.vendor_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                    <TableCell>{expense.cost_center}</TableCell>
                    <TableCell>{formatNumber(expense.quantity)}</TableCell>
                    <TableCell>{formatNumber(expense.unit_price)} {t('currency')}</TableCell>
                    <TableCell className="font-semibold">{formatNumber(expense.total_amount)} {t('currency')}</TableCell>
                    <TableCell>{getStatusBadge(expense.status)}</TableCell>
                    <TableCell>
                      <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {expense.status === 'pending' && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleApprove(expense.id)}
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleReject(expense.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {expense.status !== 'approved' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setEditingExpense(expense); setDialogOpen(true); }}
                            className="h-8 w-8"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {expense.status !== 'approved' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(expense.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <AddExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editingExpense}
        onSuccess={loadExpenses}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteExpenseConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
