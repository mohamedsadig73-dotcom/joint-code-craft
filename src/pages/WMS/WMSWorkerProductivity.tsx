import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Package,
  Award,
  BarChart3,
  Target
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { format, subDays } from 'date-fns';

interface WorkerStats {
  id: string;
  name: string;
  email: string;
  totalTransactions: number;
  totalQuantity: number;
  pickTransactions: number;
  packTransactions: number;
  shipTransactions: number;
  receiveTransactions: number;
  avgTransactionsPerDay: number;
  efficiency: number;
}

const WMSWorkerProductivity: React.FC = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [workers, setWorkers] = useState<WorkerStats[]>([]);
  const [topPerformers, setTopPerformers] = useState<WorkerStats[]>([]);
  const [dailyActivity, setDailyActivity] = useState<any[]>([]);

  useEffect(() => {
    loadWorkerStats();
  }, [period]);

  const getDays = () => {
    switch (period) {
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      default: return 7;
    }
  };

  const loadWorkerStats = async () => {
    setLoading(true);
    const days = getDays();
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    try {
      // Get all transactions with performer info
      const { data: transactions } = await supabase
        .from('wms_transactions')
        .select(`
          id,
          transaction_type,
          quantity,
          performed_by,
          performed_at,
          performer:profiles!wms_transactions_performed_by_fkey(id, username, email)
        `)
        .gte('performed_at', startDate)
        .not('performed_by', 'is', null);

      if (!transactions) {
        setLoading(false);
        return;
      }

      // Group by worker
      const workerMap: Record<string, WorkerStats> = {};
      
      transactions.forEach(tx => {
        const performerId = tx.performed_by;
        if (!performerId) return;
        
        const performer = tx.performer as any;
        if (!workerMap[performerId]) {
          workerMap[performerId] = {
            id: performerId,
            name: performer?.username || 'Unknown',
            email: performer?.email || '',
            totalTransactions: 0,
            totalQuantity: 0,
            pickTransactions: 0,
            packTransactions: 0,
            shipTransactions: 0,
            receiveTransactions: 0,
            avgTransactionsPerDay: 0,
            efficiency: 0
          };
        }
        
        workerMap[performerId].totalTransactions++;
        workerMap[performerId].totalQuantity += tx.quantity;
        
        switch (tx.transaction_type) {
          case 'pick':
            workerMap[performerId].pickTransactions++;
            break;
          case 'pack':
            workerMap[performerId].packTransactions++;
            break;
          case 'ship':
            workerMap[performerId].shipTransactions++;
            break;
          case 'receive':
            workerMap[performerId].receiveTransactions++;
            break;
        }
      });

      // Calculate metrics
      const workerStats = Object.values(workerMap).map(w => ({
        ...w,
        avgTransactionsPerDay: Math.round(w.totalTransactions / days * 10) / 10,
        efficiency: Math.min(100, Math.round((w.totalQuantity / (w.totalTransactions || 1)) * 10))
      }));

      // Sort by total transactions
      workerStats.sort((a, b) => b.totalTransactions - a.totalTransactions);
      
      setWorkers(workerStats);
      setTopPerformers(workerStats.slice(0, 3));

      // Daily activity
      const dailyMap: Record<string, Record<string, number>> = {};
      transactions.forEach(tx => {
        const date = format(new Date(tx.performed_at || ''), 'MM-dd');
        const workerId = tx.performed_by;
        if (!dailyMap[date]) dailyMap[date] = {};
        dailyMap[date][workerId] = (dailyMap[date][workerId] || 0) + tx.quantity;
      });

      const dates = Object.keys(dailyMap).sort();
      const workerIds = Object.keys(workerMap);
      
      setDailyActivity(dates.map(date => ({
        date,
        ...workerIds.reduce((acc, id) => ({ ...acc, [workerMap[id].name]: dailyMap[date]?.[id] || 0 }), {})
      })));

    } catch (error) {
      console.error('Error loading worker stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-yellow-500 text-yellow-950';
      case 1: return 'bg-gray-400 text-gray-950';
      case 2: return 'bg-orange-600 text-orange-950';
      default: return 'bg-muted';
    }
  };

  const activityChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { 
      data: topPerformers.map(w => w.name),
      bottom: 0 
    },
    xAxis: { type: 'category', data: dailyActivity.map(d => d.date) },
    yAxis: { type: 'value' },
    series: topPerformers.map((w, i) => ({
      name: w.name,
      type: 'line',
      smooth: true,
      data: dailyActivity.map(d => d[w.name] || 0),
      areaStyle: { opacity: 0.3 }
    }))
  };

  const distributionChartOption = {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: workers.slice(0, 5).map(w => ({ name: w.name, value: w.totalTransactions })),
      emphasis: { itemStyle: { shadowBlur: 10 } }
    }]
  };

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'إنتاجية العمال' : 'Worker Productivity' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{language === 'ar' ? 'إنتاجية العمال' : 'Worker Productivity'}</h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'تتبع أداء الموظفين' : 'Track employee performance'}
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{language === 'ar' ? 'أسبوع' : 'Week'}</SelectItem>
              <SelectItem value="month">{language === 'ar' ? 'شهر' : 'Month'}</SelectItem>
              <SelectItem value="quarter">{language === 'ar' ? 'ربع سنة' : 'Quarter'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {loading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">{language === 'ar' ? 'العمال النشطون' : 'Active Workers'}</span>
                  </div>
                  <p className="text-2xl font-bold">{workers.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Package className="h-4 w-4" />
                    <span className="text-xs">{language === 'ar' ? 'إجمالي العمليات' : 'Total Operations'}</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {workers.reduce((sum, w) => sum + w.totalTransactions, 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">{language === 'ar' ? 'إجمالي الكمية' : 'Total Quantity'}</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {workers.reduce((sum, w) => sum + w.totalQuantity, 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs">{language === 'ar' ? 'متوسط الكفاءة' : 'Avg Efficiency'}</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {workers.length > 0 ? Math.round(workers.reduce((sum, w) => sum + w.efficiency, 0) / workers.length) : 0}%
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Top Performers */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              {language === 'ar' ? 'أفضل الأداء' : 'Top Performers'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topPerformers.map((worker, index) => (
                  <Card key={worker.id} className="border-2">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className={getMedalColor(index)}>
                              {getInitials(worker.name)}
                            </AvatarFallback>
                          </Avatar>
                          <Badge className={`absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center ${getMedalColor(index)}`}>
                            {index + 1}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-semibold">{worker.name}</p>
                          <p className="text-xs text-muted-foreground">{worker.email}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{language === 'ar' ? 'العمليات' : 'Operations'}</span>
                          <span className="font-medium">{worker.totalTransactions}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{language === 'ar' ? 'الكمية' : 'Quantity'}</span>
                          <span className="font-medium">{worker.totalQuantity.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{language === 'ar' ? 'الكفاءة' : 'Efficiency'}</span>
                          <span className="font-medium">{worker.efficiency}%</span>
                        </div>
                        <Progress value={worker.efficiency} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {language === 'ar' ? 'النشاط اليومي' : 'Daily Activity'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64" />
              ) : (
                <ReactECharts option={activityChartOption} style={{ height: 280 }} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {language === 'ar' ? 'توزيع العمليات' : 'Operations Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64" />
              ) : (
                <ReactECharts option={distributionChartOption} style={{ height: 280 }} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workers Table */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'جميع العمال' : 'All Workers'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'العامل' : 'Worker'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'استلام' : 'Receive'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'انتقاء' : 'Pick'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'تعبئة' : 'Pack'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'شحن' : 'Ship'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الكفاءة' : 'Efficiency'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{getInitials(worker.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{worker.name}</p>
                            <p className="text-xs text-muted-foreground">{worker.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{worker.receiveTransactions}</TableCell>
                      <TableCell className="text-center">{worker.pickTransactions}</TableCell>
                      <TableCell className="text-center">{worker.packTransactions}</TableCell>
                      <TableCell className="text-center">{worker.shipTransactions}</TableCell>
                      <TableCell className="text-center font-bold">{worker.totalTransactions}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={worker.efficiency >= 80 ? 'default' : worker.efficiency >= 50 ? 'secondary' : 'destructive'}>
                          {worker.efficiency}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default WMSWorkerProductivity;
