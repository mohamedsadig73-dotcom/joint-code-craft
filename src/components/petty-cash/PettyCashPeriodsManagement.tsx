import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, Lock, Unlock, Eye, Check, X, 
  Wallet, TrendingDown, AlertCircle, Clock,
  ArrowRightLeft, Undo2, FileX
} from 'lucide-react';
import { formatNumber } from '@/utils/numberFormat';
import { formatDate } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { OpenPeriodDialog } from './OpenPeriodDialog';
import { PeriodDetailsDialog } from './PeriodDetailsDialog';
import { ClosePeriodDialog } from './ClosePeriodDialog';
import { EditDispositionDialog } from './EditDispositionDialog';

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
  status: 'open' | 'closed' | 'pending_approval' | 'rejected';
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  balance_disposition: string | null;
  disposition_amount: number | null;
  carried_from_period_id: string | null;
  start_date: string | null;
  end_date: string | null;
}

export function PettyCashPeriodsManagement() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  const [periods, setPeriods] = useState<PettyCashPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PettyCashPeriod | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [periodToClose, setPeriodToClose] = useState<PettyCashPeriod | null>(null);
  const [editDispositionOpen, setEditDispositionOpen] = useState(false);
  const [periodToEdit, setPeriodToEdit] = useState<PettyCashPeriod | null>(null);

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('petty_cash_periods')
        .select('*')
        .order('opened_at', { ascending: false });

      if (error) throw error;
      setPeriods((data as PettyCashPeriod[]) || []);
    } catch (error) {
      console.error('Error loading periods:', error);
      toast.error(t('errorLoadingData'));
    } finally {
      setLoading(false);
    }
  };

  const hasOpenPeriod = periods.some(p => p.status === 'open');

  const handleClosePeriod = (period: PettyCashPeriod) => {
    setPeriodToClose(period);
    setCloseDialogOpen(true);
  };

  const handleEditDisposition = (period: PettyCashPeriod) => {
    setPeriodToEdit(period);
    setEditDispositionOpen(true);
  };

  const handleReopenPeriod = async (id: string) => {
    try {
      // Check if there's already an open period
      if (hasOpenPeriod) {
        toast.error(language === 'ar' 
          ? 'يوجد نثرية مفتوحة حالياً. يجب إغلاقها أولاً.'
          : 'There is already an open period. Close it first.');
        return;
      }
      
      // Delete disposition transactions before reopening
      await supabase
        .from('petty_cash_transactions')
        .delete()
        .eq('period_id', id)
        .in('transaction_type', ['carry_forward_out', 'refund', 'write_off']);

      const { error } = await supabase
        .from('petty_cash_periods')
        .update({
          status: 'open',
          closed_at: null,
          closed_by: null,
          balance_disposition: null,
          disposition_amount: null,
          disposition_reference: null,
          approved_at: null,
          approved_by: null,
          end_date: null
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(language === 'ar' ? 'تم إعادة فتح النثرية' : 'Period reopened');
      loadPeriods();
    } catch (error) {
      console.error('Error reopening period:', error);
      toast.error(t('errorOccurred'));
    }
  };

  // Check if a period needs disposition (closed/rejected with balance but no disposition)
  const needsDisposition = (period: PettyCashPeriod) => {
    return (period.status === 'closed' || period.status === 'rejected' || period.status === 'pending_approval') 
      && period.current_balance > 0 
      && !period.balance_disposition;
  };

  const handleApprovePeriod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('petty_cash_periods')
        .update({
          status: 'closed',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(t('periodApproved'));
      loadPeriods();
    } catch (error) {
      console.error('Error approving period:', error);
      toast.error(t('errorOccurred'));
    }
  };

  const handleRejectPeriod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('petty_cash_periods')
        .update({
          status: 'rejected'
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(t('periodRejected'));
      loadPeriods();
    } catch (error) {
      console.error('Error rejecting period:', error);
      toast.error(t('errorOccurred'));
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
      <Badge className={styles[status as keyof typeof styles]}>
        {status === 'open' ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getDispositionBadge = (period: PettyCashPeriod) => {
    if (!period.balance_disposition) return null;
    
    const config: Record<string, { icon: typeof ArrowRightLeft; label: string; className: string }> = {
      carried_forward: {
        icon: ArrowRightLeft,
        label: language === 'ar' ? 'مُرحّل' : 'Carried Forward',
        className: 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
      },
      refunded: {
        icon: Undo2,
        label: language === 'ar' ? 'مُسترد' : 'Refunded',
        className: 'bg-purple-500/20 text-purple-700 dark:text-purple-400'
      },
      written_off: {
        icon: FileX,
        label: language === 'ar' ? 'مُهلك' : 'Written Off',
        className: 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
      }
    };
    
    const c = config[period.balance_disposition];
    if (!c) return null;
    const Icon = c.icon;
    
    return (
      <div className="flex flex-col gap-1">
        <Badge className={c.className}>
          <Icon className="w-3 h-3 mr-1" />
          {c.label}
        </Badge>
        {period.disposition_amount && period.disposition_amount > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatNumber(period.disposition_amount)} {t('currency')}
          </span>
        )}
      </div>
    );
  };

  // Stats
  const openPeriods = periods.filter(p => p.status === 'open').length;
  const totalBudget = periods.filter(p => p.status === 'open').reduce((sum, p) => sum + p.opening_balance, 0);
  const totalSpent = periods.filter(p => p.status === 'open').reduce((sum, p) => sum + p.total_expenses, 0);
  const pendingApprovalCount = periods.filter(p => p.status === 'pending_approval').length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Unlock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('openPeriods')}</p>
                <p className="text-2xl font-bold">{openPeriods}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('totalBudget')}</p>
                <p className="text-2xl font-bold">{formatNumber(totalBudget)} {t('currency')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('totalSpent')}</p>
                <p className="text-2xl font-bold">{formatNumber(totalSpent)} {t('currency')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('pendingApproval')}</p>
                <p className="text-2xl font-bold">{pendingApprovalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning if there's an open period */}
      {hasOpenPeriod && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              {t('openPeriodWarning')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions Bar */}
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-lg font-semibold">{t('pettyCashPeriods')}</h3>
        <Button 
          onClick={() => setOpenDialogOpen(true)} 
          disabled={hasOpenPeriod}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('openNewPeriod')}
        </Button>
      </div>

      {/* Periods Table */}
      <Card className="glass-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('periodNumber')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('location')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('responsiblePerson')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('openingBalance')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('totalExpenses')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('remainingBalance')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('expensesCount')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('status')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{language === 'ar' ? 'تصفية الرصيد' : 'Disposition'}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{language === 'ar' ? 'فترة النثرية' : 'Period Range'}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    {t('noPeriodsFound')}
                  </TableCell>
                </TableRow>
              ) : (
                periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-mono">{period.period_number}</TableCell>
                    <TableCell>{period.location}</TableCell>
                    <TableCell>{period.responsible_person}</TableCell>
                    <TableCell>{formatNumber(period.opening_balance)} {t('currency')}</TableCell>
                    <TableCell className="text-red-600">{formatNumber(period.total_expenses)} {t('currency')}</TableCell>
                    <TableCell className={period.current_balance < 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                      {formatNumber(period.current_balance)} {t('currency')}
                    </TableCell>
                    <TableCell>{period.expenses_count}</TableCell>
                    <TableCell>{getStatusBadge(period.status)}</TableCell>
                    <TableCell>{getDispositionBadge(period) || <span className="text-muted-foreground text-xs">-</span>}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span>{period.start_date ? formatDate(period.start_date) : '-'}</span>
                        <span className="mx-1">→</span>
                        <span>{period.end_date ? formatDate(period.end_date) : (language === 'ar' ? 'مفتوحة' : 'Open')}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(period.opened_at)}</TableCell>
                      <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setSelectedPeriod(period); setDetailsDialogOpen(true); }}
                          className="h-8 w-8"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {period.status === 'open' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleClosePeriod(period)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                          >
                            <Lock className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {/* Edit Disposition for legacy periods */}
                        {needsDisposition(period) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditDisposition(period)}
                            className="h-8 w-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100"
                            title={language === 'ar' ? 'تحديد مصير الرصيد' : 'Set balance disposition'}
                          >
                            <AlertCircle className="w-4 h-4" />
                          </Button>
                        )}

                        {/* Reopen rejected periods */}
                        {period.status === 'rejected' && !hasOpenPeriod && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleReopenPeriod(period.id)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                            title={language === 'ar' ? 'إعادة فتح' : 'Reopen'}
                          >
                            <Unlock className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {period.status === 'pending_approval' && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleApprovePeriod(period.id)}
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRejectPeriod(period.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
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

      {/* Open Period Dialog */}
      <OpenPeriodDialog
        open={openDialogOpen}
        onOpenChange={setOpenDialogOpen}
        onSuccess={loadPeriods}
      />

      {/* Period Details Dialog */}
      {selectedPeriod && (
        <PeriodDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          period={selectedPeriod}
        />
      )}

      {/* Close Period Dialog */}
      {periodToClose && (
        <ClosePeriodDialog
          open={closeDialogOpen}
          onOpenChange={(open) => {
            setCloseDialogOpen(open);
            if (!open) setPeriodToClose(null);
          }}
          period={periodToClose}
          onSuccess={loadPeriods}
        />
      )}

      {/* Edit Disposition Dialog for legacy periods */}
      {periodToEdit && (
        <EditDispositionDialog
          open={editDispositionOpen}
          onOpenChange={(open) => {
            setEditDispositionOpen(open);
            if (!open) setPeriodToEdit(null);
          }}
          period={periodToEdit}
          onSuccess={loadPeriods}
        />
      )}
    </div>
  );
}
