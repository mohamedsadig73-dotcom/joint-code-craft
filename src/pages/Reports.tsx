import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactECharts from 'echarts-for-react';
import { Download, TrendingUp, Users, FileText, Clock, Activity, Shield } from 'lucide-react';
import { exportDeclarationsToExcel } from '@/utils/excelExport';
import { exportDeclarationsToPDF } from '@/utils/pdfExport';

export default function Reports() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    draft: 0,
    pending_warehouse_signature: 0,
    warehouse_signed: 0,
    sent_to_admin_office: 0,
    received_by_admin_office: 0,
    returned_to_warehouse: 0,
    archived: 0,
    rejected: 0,
    total: 0,
  });
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; warehouse_signed: number; pending_warehouse_signature: number; draft: number }[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [avgProcessingTime, setAvgProcessingTime] = useState('0h');
  const [completionRate, setCompletionRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load declarations data
      const { data, error } = await supabase
        .from('declarations')
        .select('status, created_at, updated_at');

      if (error) throw error;

      // Calculate status stats
      const newStats = {
        draft: data?.filter(d => d.status === 'draft').length || 0,
        pending_warehouse_signature: data?.filter(d => d.status === 'pending_warehouse_signature').length || 0,
        warehouse_signed: data?.filter(d => d.status === 'warehouse_signed').length || 0,
        sent_to_admin_office: data?.filter(d => d.status === 'sent_to_admin_office').length || 0,
        received_by_admin_office: data?.filter(d => d.status === 'received_by_admin_office').length || 0,
        returned_to_warehouse: data?.filter(d => d.status === 'returned_to_warehouse').length || 0,
        archived: data?.filter(d => d.status === 'archived').length || 0,
        rejected: data?.filter(d => d.status === 'rejected').length || 0,
        total: data?.length || 0,
      };
      setStats(newStats);

      // Calculate completion rate (archived / total)
      const completionPercentage = newStats.total > 0 
        ? Math.round((newStats.archived / newStats.total) * 100)
        : 0;
      setCompletionRate(completionPercentage);

      // Calculate average processing time
      const completedDeclarations = data?.filter(d => d.status === 'archived');
      if (completedDeclarations && completedDeclarations.length > 0) {
        const totalHours = completedDeclarations.reduce((sum, dec) => {
          const created = new Date(dec.created_at).getTime();
          const updated = new Date(dec.updated_at).getTime();
          const hours = (updated - created) / (1000 * 60 * 60);
          return sum + hours;
        }, 0);
        const avgHours = Math.round(totalHours / completedDeclarations.length);
        const days = Math.floor(avgHours / 24);
        const hours = avgHours % 24;
        setAvgProcessingTime(days > 0 ? `${days}d ${hours}h` : `${hours}h`);
      }

      // Load total users count
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id');
      setTotalUsers(profiles?.length || 0);

      // Calculate weekly data (last 7 days)
      const now = new Date();
      const weekly = [0, 0, 0, 0, 0, 0, 0];
      data?.forEach(d => {
        const createdDate = new Date(d.created_at);
        const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          weekly[6 - diffDays]++;
        }
      });
      setWeeklyData(weekly);

      // Calculate monthly data (last 6 months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyMap = new Map<string, { warehouse_signed: number; pending_warehouse_signature: number; draft: number }>();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${months[date.getMonth()]}`;
        monthlyMap.set(monthKey, { warehouse_signed: 0, pending_warehouse_signature: 0, draft: 0 });
      }

      data?.forEach(d => {
        const createdDate = new Date(d.created_at);
        const monthKey = months[createdDate.getMonth()];
        if (monthlyMap.has(monthKey)) {
          const current = monthlyMap.get(monthKey)!;
          if (d.status === 'warehouse_signed') current.warehouse_signed++;
          else if (d.status === 'pending_warehouse_signature') current.pending_warehouse_signature++;
          else if (d.status === 'draft') current.draft++;
        }
      });

      const monthlyArray = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        ...data
      }));
      setMonthlyData(monthlyArray);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Status Distribution Pie Chart
  const statusDistributionOption = {
    title: {
      text: t('statusDistribution'),
      left: 'center',
      textStyle: { color: '#fff', fontSize: 16 }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: { color: '#fff' },
      data: [t('draft'), t('pendingWarehouseSignature'), t('warehouseSigned'), t('archived')]
    },
    series: [
      {
        name: 'Status',
        type: 'pie',
        radius: '70%',
        data: [
          { value: stats.draft, name: t('draft'), itemStyle: { color: '#6b7280' } },
          { value: stats.pending_warehouse_signature, name: t('pendingWarehouseSignature'), itemStyle: { color: '#eab308' } },
          { value: stats.warehouse_signed, name: t('warehouseSigned'), itemStyle: { color: '#3b82f6' } },
          { value: stats.archived, name: t('archived'), itemStyle: { color: '#22c55e' } },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  // User Activity Bar Chart
  const userActivityOption = {
    title: {
      text: t('userActivity'),
      textStyle: { color: '#fff', fontSize: 16 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisLine: { lineStyle: { color: '#666' } },
      axisLabel: { color: '#fff' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#666' } },
      axisLabel: { color: '#fff' },
      splitLine: { lineStyle: { color: '#333' } }
    },
    series: [
      {
        name: 'Declarations',
        type: 'bar',
        data: weeklyData,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#d69e2e' },
              { offset: 1, color: '#744210' }
            ]
          },
          borderRadius: [5, 5, 0, 0]
        }
      }
    ]
  };

  // Trend Line Chart
  const trendOption = {
    title: {
      text: t('monthlyTrends'),
      textStyle: { color: '#fff', fontSize: 16 }
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: [t('warehouseSigned'), t('pendingWarehouseSignature'), t('unsigned')],
      textStyle: { color: '#fff' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: monthlyData.map(d => d.month),
      axisLine: { lineStyle: { color: '#666' } },
      axisLabel: { color: '#fff' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#666' } },
      axisLabel: { color: '#fff' },
      splitLine: { lineStyle: { color: '#333' } }
    },
    series: [
      {
        name: t('warehouseSigned'),
        type: 'line',
        smooth: true,
        data: monthlyData.map(d => d.warehouse_signed),
        itemStyle: { color: '#3b82f6' },
        areaStyle: { opacity: 0.3 }
      },
      {
        name: t('pendingWarehouseSignature'),
        type: 'line',
        smooth: true,
        data: monthlyData.map(d => d.pending_warehouse_signature),
        itemStyle: { color: '#eab308' },
        areaStyle: { opacity: 0.3 }
      },
      {
        name: t('unsigned'),
        type: 'line',
        smooth: true,
        data: monthlyData.map(d => d.draft),
        itemStyle: { color: '#6b7280' },
        areaStyle: { opacity: 0.3 }
      }
    ]
  };

  const metrics = [
    { label: t('totalDeclarations'), value: stats.total.toString(), icon: FileText },
    { label: t('avgProcessingTime'), value: avgProcessingTime, icon: Clock },
    { label: t('activeUsers'), value: totalUsers.toString(), icon: Users },
    { label: t('completionRate'), value: `${completionRate}%`, icon: TrendingUp },
  ];

  const handleExportExcel = async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles!sender_id(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const exportData = (data || []).map(dec => ({
        id: dec.id,
        type: dec.type,
        sender: dec.sender?.username || 'غير معروف',
        status: t(dec.status),
        archive_number: dec.archive_number || '-',
        created_at: new Date(dec.created_at).toLocaleDateString('en-US'),
      }));

      exportDeclarationsToExcel(exportData, 'تقرير_كامل_الإقرارات');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles!sender_id(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const exportData = (data || []).map(dec => ({
        id: dec.id,
        type: dec.type,
        sender: dec.sender?.username || 'غير معروف',
        status: t(dec.status),
        archive_number: dec.archive_number || '-',
        created_at: new Date(dec.created_at).toLocaleDateString('en-US'),
      }));

      exportDeclarationsToPDF(exportData, 'تقرير_كامل_الإقرارات');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('reportsAnalytics')}</h1>
            <p className="text-muted-foreground">{t('reportsSubtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExportPDF}>
              <Download className="w-4 h-4" />
              {t('exportPDF')}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportExcel}>
              <Download className="w-4 h-4" />
              {t('exportExcel')}
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="glass-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">{metric.value}</div>
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Distribution */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>{t('statusDistribution')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts option={statusDistributionOption} style={{ height: '400px' }} />
            </CardContent>
          </Card>

          {/* User Activity */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>{t('userActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts option={userActivityOption} style={{ height: '400px' }} />
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart - Full Width */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>{t('monthlyTrends')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={trendOption} style={{ height: '400px' }} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
