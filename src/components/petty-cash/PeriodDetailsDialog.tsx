import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { formatNumber } from '@/utils/numberFormat';
import { formatDate } from '@/utils/dateUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Unlock, Wallet, FileText, Calendar, User } from 'lucide-react';

interface Expense {
  id: string;
  expense_date: string;
  vendor_name: string;
  description: string;
  total_amount: number;
  status: string;
}

interface PettyCashPeriod {
  id: string;
  period_number: string;
  location: string;
  responsible_person: string;
  budget_limit: number;
  opening_balance: number;
  current_balance: number;
  total_expenses: number;
  expenses_count: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

interface PeriodDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: PettyCashPeriod;
}

export function PeriodDetailsDialog({ open, onOpenChange, period }: PeriodDetailsDialogProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && period) {
      loadExpenses();
    }
  }, [open, period]);

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('petty_cash_expenses')
        .select('id, expense_date, vendor_name, description, total_amount, status')
        .eq('period_id', period.id)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-green-500/20 text-green-700 dark:text-green-400',
      closed: 'bg-gray-500/20 text-gray-700 dark:text-gray-400',
      pending_approval: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
      rejected: 'bg-red-500/20 text-red-700 dark:text-red-400'
    };
    const labels = {
      open: t('periodOpen'),
      closed: t('periodClosed'),
      pending_approval: t('pendingApproval'),
      rejected: t('rejected')
    };
    return (
      <Badge className={styles[status as keyof typeof styles] || styles.closed}>
        {status === 'open' ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const usagePercentage = period.opening_balance > 0 
    ? Math.round((period.total_expenses / period.opening_balance) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {t('periodDetails')}: {period.period_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Period Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('status')}</p>
                <div className="mt-2">{getStatusBadge(period.status)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('openingBalance')}</p>
                <p className="text-xl font-bold text-blue-600">{formatNumber(period.opening_balance)} {t('currency')}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('totalExpenses')}</p>
                <p className="text-xl font-bold text-red-600">{formatNumber(period.total_expenses)} {t('currency')}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('remainingBalance')}</p>
                <p className={`text-xl font-bold ${period.current_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatNumber(period.current_balance)} {t('currency')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">{t('budgetUsage')}</span>
                <span className="text-sm font-medium">{usagePercentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all ${
                    usagePercentage > 100 ? 'bg-red-500' : 
                    usagePercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Period Details */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('responsiblePerson')}:</span>
                  <span className="font-medium">{period.responsible_person}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('location')}:</span>
                  <span className="font-medium">{period.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('openedAt')}:</span>
                  <span className="font-medium">{formatDate(period.opened_at)}</span>
                </div>
                {period.closed_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('closedAt')}:</span>
                    <span className="font-medium">{formatDate(period.closed_at)}</span>
                  </div>
                )}
              </div>
              {period.notes && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('notes')}:</p>
                  <p className="mt-1">{period.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses List */}
          <div>
            <h4 className="text-lg font-semibold mb-3">{t('periodExpenses')} ({period.expenses_count})</h4>
            {loading ? (
              <Skeleton className="h-32" />
            ) : expenses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {t('noExpensesInPeriod')}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('date')}</TableHead>
                        <TableHead>{t('vendor')}</TableHead>
                        <TableHead>{t('description')}</TableHead>
                        <TableHead>{t('total')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{formatDate(expense.expense_date)}</TableCell>
                          <TableCell>{expense.vendor_name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                          <TableCell className="font-semibold">{formatNumber(expense.total_amount || 0)} {t('currency')}</TableCell>
                          <TableCell>
                            <Badge variant={expense.status === 'approved' ? 'default' : 'secondary'}>
                              {t(expense.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
