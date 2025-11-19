import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactECharts from 'echarts-for-react';
import { Download, TrendingUp, Users, FileText, Clock } from 'lucide-react';

export default function Reports() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    unsigned: 0,
    pending: 0,
    approved: 0,
    archived: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select('status');

      if (error) throw error;

      const newStats = {
        unsigned: data?.filter(d => d.status === 'unsigned').length || 0,
        pending: data?.filter(d => d.status === 'pending').length || 0,
        approved: data?.filter(d => d.status === 'approved').length || 0,
        archived: data?.filter(d => d.status === 'archived').length || 0,
        total: data?.length || 0,
      };

      setStats(newStats);
    } catch (error) {
      console.error('Error loading stats:', error);
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
      textStyle: { color: '#fff' }
    },
    series: [
      {
        name: 'Status',
        type: 'pie',
        radius: '70%',
        data: [
          { value: stats.unsigned, name: t('unsigned'), itemStyle: { color: '#c53030' } },
          { value: stats.pending, name: t('pending'), itemStyle: { color: '#dd6b20' } },
          { value: stats.approved, name: t('approved'), itemStyle: { color: '#22543d' } },
          { value: stats.archived, name: t('archived'), itemStyle: { color: '#2b6cb0' } },
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
        data: [45, 52, 38, 62, 58, 24, 18],
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
      text: 'Monthly Trends',
      textStyle: { color: '#fff', fontSize: 16 }
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['Approved', 'Pending', 'Unsigned'],
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
      data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
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
        name: 'Approved',
        type: 'line',
        smooth: true,
        data: [120, 132, 101, 134, 190, 230],
        itemStyle: { color: '#22543d' },
        areaStyle: { opacity: 0.3 }
      },
      {
        name: 'Pending',
        type: 'line',
        smooth: true,
        data: [22, 18, 19, 23, 29, 33],
        itemStyle: { color: '#dd6b20' },
        areaStyle: { opacity: 0.3 }
      },
      {
        name: 'Unsigned',
        type: 'line',
        smooth: true,
        data: [15, 23, 20, 15, 19, 25],
        itemStyle: { color: '#c53030' },
        areaStyle: { opacity: 0.3 }
      }
    ]
  };

  const metrics = [
    { label: 'Total Declarations', value: '1,090', icon: FileText, trend: '+12%' },
    { label: 'Avg. Processing Time', value: '2.4h', icon: Clock, trend: '-18%' },
    { label: 'Active Users', value: '42', icon: Users, trend: '+8%' },
    { label: 'Completion Rate', value: '94%', icon: TrendingUp, trend: '+5%' },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('reportsAnalytics')}</h1>
            <p className="text-muted-foreground">Comprehensive insights and data analysis</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              {t('exportPDF')}
            </Button>
            <Button variant="outline" className="gap-2">
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
                    <div className="p-2 rounded-lg bg-secondary/10">
                      <Icon className="w-5 h-5 text-secondary" />
                    </div>
                    <span className="text-sm font-medium text-success">{metric.trend}</span>
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
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={trendOption} style={{ height: '400px' }} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
