import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { FileDown, Filter } from 'lucide-react';
import { formatNumber } from '@/utils/numberFormat';
import { formatDate } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { StatusPieChart } from '@/components/charts/StatusPieChart';

interface CostCenter {
  id: string;
  name: string;
  name_ar: string;
}

interface Expense {
  id: string;
  expense_date: string;
  vendor_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  cost_center: string;
  status: string;
}

export function PettyCashReports() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    costCenter: 'all',
    vendor: ''
  });

  useEffect(() => {
    loadCostCenters();
    loadExpenses();
  }, []);

  const loadCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('active', true);

      if (error) throw error;
      setCostCenters(data || []);
    } catch (error) {
      console.error('Error loading cost centers:', error);
    }
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('petty_cash_expenses')
        .select('*')
        .eq('status', 'approved')
        .order('expense_date', { ascending: false });

      if (filters.startDate) {
        query = query.gte('expense_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('expense_date', filters.endDate);
      }
      if (filters.costCenter && filters.costCenter !== 'all') {
        query = query.eq('cost_center', filters.costCenter);
      }
      if (filters.vendor) {
        query = query.ilike('vendor_name', `%${filters.vendor}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error(t('errorLoadingData'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadExpenses();
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      const exportData = expenses.map(e => ({
        [t('date')]: formatDate(e.expense_date),
        [t('vendor')]: e.vendor_name,
        [t('description')]: e.description,
        [t('costCenter')]: e.cost_center,
        [t('quantity')]: e.quantity,
        [t('unitPrice')]: e.unit_price,
        [t('total')]: e.total_amount
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('pettyCashReport'));
      XLSX.writeFile(wb, `petty-cash-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success(t('exportSuccess'));
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error(t('exportError'));
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.total_amount), 0);

  // Prepare chart data
  const costCenterData = expenses.reduce((acc, e) => {
    acc[e.cost_center] = (acc[e.cost_center] || 0) + Number(e.total_amount);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(costCenterData).map(([name, value], index) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
    return {
      status: name,
      count: value,
      label: name,
      color: colors[index % colors.length]
    };
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Filter className="w-5 h-5" />
            {t('filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t('startDate')}</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('endDate')}</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('costCenter')}</Label>
              <Select
                value={filters.costCenter}
                onValueChange={(value) => setFilters({ ...filters, costCenter: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={isRTL ? cc.name_ar : cc.name}>
                      {isRTL ? cc.name_ar : cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('vendor')}</Label>
              <Input
                value={filters.vendor}
                onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
                placeholder={t('searchVendor')}
              />
            </div>
          </div>
          <div className={`flex gap-2 mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button onClick={handleFilter}>{t('applyFilters')}</Button>
            <Button variant="outline" onClick={handleExportExcel} className="gap-2">
              <FileDown className="w-4 h-4" />
              {t('exportExcel')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t('totalExpenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              {formatNumber(totalExpenses)} {t('currency')}
            </p>
            <p className="text-muted-foreground mt-2">
              {expenses.length} {t('transactions')}
            </p>
          </CardContent>
        </Card>

        {chartData.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('expensesByCostCenter')}</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusPieChart
                data={chartData}
                title=""
                description=""
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Data Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t('expensesDetails')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('date')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('vendor')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('description')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('costCenter')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t('noDataFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.expense_date)}</TableCell>
                      <TableCell>{expense.vendor_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                      <TableCell>{expense.cost_center}</TableCell>
                      <TableCell className="font-semibold">{formatNumber(expense.total_amount)} {t('currency')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
