import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Package,
  Target,
  Zap,
  RotateCcw,
  Timer,
  Gauge
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface KPIData {
  orderAccuracy: number;
  inventoryTurnover: number;
  pickingEfficiency: number;
  onTimeShipping: number;
  returnRate: number;
  avgOrderProcessingTime: number;
  spaceUtilization: number;
  orderFulfillmentRate: number;
}

interface TrendData {
  date: string;
  orders: number;
  accuracy: number;
  efficiency: number;
}

const WMSAdvancedReports: React.FC = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [kpis, setKPIs] = useState<KPIData>({
    orderAccuracy: 0,
    inventoryTurnover: 0,
    pickingEfficiency: 0,
    onTimeShipping: 0,
    returnRate: 0,
    avgOrderProcessingTime: 0,
    spaceUtilization: 0,
    orderFulfillmentRate: 0
  });
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([]);

  useEffect(() => {
    loadKPIData();
  }, [period]);

  const getDateRange = () => {
    const end = new Date();
    let start: Date;
    switch (period) {
      case 'week':
        start = subDays(end, 7);
        break;
      case 'quarter':
        start = subMonths(end, 3);
        break;
      case 'year':
        start = subMonths(end, 12);
        break;
      default:
        start = startOfMonth(end);
    }
    return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
  };

  const loadKPIData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    try {
      const [
        outboundOrders,
        inboundOrders,
        transactions,
        rmaData,
        inventory,
        locations
      ] = await Promise.all([
        supabase.from('wms_outbound_orders').select('*').gte('created_at', start).lte('created_at', end),
        supabase.from('wms_inbound_orders').select('*').gte('created_at', start).lte('created_at', end),
        supabase.from('wms_transactions').select('*').gte('performed_at', start).lte('performed_at', end),
        supabase.from('wms_rma').select('*').gte('created_at', start).lte('created_at', end),
        supabase.from('wms_inventory').select('quantity, cost_per_unit, location_id'),
        supabase.from('wms_locations').select('id, max_weight')
      ]);

      const outbound = outboundOrders.data || [];
      const inbound = inboundOrders.data || [];
      const txns = transactions.data || [];
      const rmas = rmaData.data || [];
      const inv = inventory.data || [];
      const locs = locations.data || [];

      // Calculate KPIs
      const completedOrders = outbound.filter(o => o.status === 'completed');
      const totalOrders = outbound.length;
      const onTimeOrders = completedOrders.filter(o => 
        o.shipped_date && o.expected_ship_date && 
        new Date(o.shipped_date) <= new Date(o.expected_ship_date)
      );

      const pickTransactions = txns.filter(t => t.transaction_type === 'pick');
      const shipTransactions = txns.filter(t => t.transaction_type === 'ship');
      const receiveTransactions = txns.filter(t => t.transaction_type === 'receive');

      // Inventory value
      const totalInventoryValue = inv.reduce((sum, i) => sum + ((i.quantity || 0) * (i.cost_per_unit || 0)), 0);
      const totalShipped = shipTransactions.reduce((sum, t) => sum + (t.quantity * (10)), 0); // Assuming avg cost

      // Space utilization
      const usedLocations = new Set(inv.map(i => i.location_id)).size;
      const totalLocations = locs.length;

      setKPIs({
        orderAccuracy: totalOrders > 0 ? Math.round((completedOrders.length / totalOrders) * 100) : 0,
        inventoryTurnover: totalInventoryValue > 0 ? Math.round((totalShipped / totalInventoryValue) * 100) / 100 : 0,
        pickingEfficiency: pickTransactions.length > 0 ? Math.round((shipTransactions.length / pickTransactions.length) * 100) : 0,
        onTimeShipping: completedOrders.length > 0 ? Math.round((onTimeOrders.length / completedOrders.length) * 100) : 0,
        returnRate: totalOrders > 0 ? Math.round((rmas.length / totalOrders) * 100) : 0,
        avgOrderProcessingTime: calculateAvgProcessingTime(outbound),
        spaceUtilization: totalLocations > 0 ? Math.round((usedLocations / totalLocations) * 100) : 0,
        orderFulfillmentRate: totalOrders > 0 ? Math.round((completedOrders.length / totalOrders) * 100) : 0
      });

      // Trends data
      const trendMap: Record<string, { orders: number; completed: number; picks: number }> = {};
      outbound.forEach(o => {
        const date = format(new Date(o.created_at || ''), 'MM-dd');
        if (!trendMap[date]) trendMap[date] = { orders: 0, completed: 0, picks: 0 };
        trendMap[date].orders++;
        if (o.status === 'completed') trendMap[date].completed++;
      });

      setTrends(Object.entries(trendMap).map(([date, data]) => ({
        date,
        orders: data.orders,
        accuracy: data.orders > 0 ? Math.round((data.completed / data.orders) * 100) : 0,
        efficiency: Math.floor(Math.random() * 20 + 80) // Placeholder
      })));

      // Category performance
      const { data: products } = await supabase.from('wms_products').select('id, category');
      const categoryMap: Record<string, { total: number; moved: number }> = {};
      (products || []).forEach(p => {
        const cat = p.category || 'Other';
        if (!categoryMap[cat]) categoryMap[cat] = { total: 0, moved: 0 };
        categoryMap[cat].total++;
      });
      
      txns.forEach(t => {
        const product = (products || []).find(p => p.id === t.product_id);
        const cat = product?.category || 'Other';
        if (categoryMap[cat]) categoryMap[cat].moved += t.quantity;
      });

      setCategoryPerformance(Object.entries(categoryMap).map(([name, data]) => ({
        name,
        total: data.total,
        moved: data.moved
      })));

    } catch (error) {
      console.error('Error loading KPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAvgProcessingTime = (orders: any[]) => {
    const completed = orders.filter(o => o.status === 'completed' && o.shipped_date && o.created_at);
    if (completed.length === 0) return 0;
    
    const totalHours = completed.reduce((sum, o) => {
      const start = new Date(o.created_at);
      const end = new Date(o.shipped_date);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    
    return Math.round(totalHours / completed.length);
  };

  const kpiCards = [
    { key: 'orderAccuracy', icon: Target, color: 'text-green-600', bg: 'bg-green-500/10', label: { ar: 'دقة الطلبات', en: 'Order Accuracy' }, unit: '%' },
    { key: 'inventoryTurnover', icon: RotateCcw, color: 'text-blue-600', bg: 'bg-blue-500/10', label: { ar: 'دوران المخزون', en: 'Inventory Turnover' }, unit: 'x' },
    { key: 'pickingEfficiency', icon: Zap, color: 'text-purple-600', bg: 'bg-purple-500/10', label: { ar: 'كفاءة الانتقاء', en: 'Picking Efficiency' }, unit: '%' },
    { key: 'onTimeShipping', icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: { ar: 'الشحن في الوقت', en: 'On-Time Shipping' }, unit: '%' },
    { key: 'returnRate', icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-500/10', label: { ar: 'معدل المرتجعات', en: 'Return Rate' }, unit: '%' },
    { key: 'avgOrderProcessingTime', icon: Timer, color: 'text-pink-600', bg: 'bg-pink-500/10', label: { ar: 'متوسط وقت المعالجة', en: 'Avg Processing Time' }, unit: 'h' },
    { key: 'spaceUtilization', icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-500/10', label: { ar: 'استغلال المساحة', en: 'Space Utilization' }, unit: '%' },
    { key: 'orderFulfillmentRate', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-500/10', label: { ar: 'معدل التنفيذ', en: 'Fulfillment Rate' }, unit: '%' }
  ];

  const trendChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { 
      data: [language === 'ar' ? 'الطلبات' : 'Orders', language === 'ar' ? 'الدقة %' : 'Accuracy %'],
      bottom: 0 
    },
    xAxis: { type: 'category', data: trends.map(t => t.date) },
    yAxis: [
      { type: 'value', name: language === 'ar' ? 'الطلبات' : 'Orders' },
      { type: 'value', name: '%', max: 100 }
    ],
    series: [
      {
        name: language === 'ar' ? 'الطلبات' : 'Orders',
        type: 'bar',
        data: trends.map(t => t.orders),
        itemStyle: { color: '#3b82f6' }
      },
      {
        name: language === 'ar' ? 'الدقة %' : 'Accuracy %',
        type: 'line',
        yAxisIndex: 1,
        data: trends.map(t => t.accuracy),
        itemStyle: { color: '#22c55e' }
      }
    ]
  };

  const categoryChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: categoryPerformance.map(c => c.name) },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: categoryPerformance.map(c => c.moved),
      itemStyle: { color: '#8b5cf6' }
    }]
  };

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'تقارير KPI المتقدمة' : 'Advanced KPI Reports' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{language === 'ar' ? 'تقارير KPI المتقدمة' : 'Advanced KPI Reports'}</h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'مؤشرات الأداء الرئيسية للمستودع' : 'Key Performance Indicators for Warehouse'}
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
              <SelectItem value="year">{language === 'ar' ? 'سنة' : 'Year'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {loading ? (
            Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : (
            kpiCards.map((kpi) => {
              const Icon = kpi.icon;
              const value = kpis[kpi.key as keyof KPIData];
              return (
                <Card key={kpi.key}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-lg ${kpi.bg}`}>
                        <Icon className={`h-4 w-4 ${kpi.color}`} />
                      </div>
                      <span className="text-xs text-muted-foreground">{kpi.label[language]}</span>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className={`text-2xl font-bold ${kpi.color}`}>{value}</span>
                      <span className="text-sm text-muted-foreground mb-0.5">{kpi.unit}</span>
                    </div>
                    {kpi.unit === '%' && (
                      <Progress value={value} className="h-1 mt-2" />
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends">
              <TrendingUp className="h-4 w-4 me-2" />
              {language === 'ar' ? 'الاتجاهات' : 'Trends'}
            </TabsTrigger>
            <TabsTrigger value="categories">
              <BarChart3 className="h-4 w-4 me-2" />
              {language === 'ar' ? 'أداء الفئات' : 'Category Performance'}
            </TabsTrigger>
            <TabsTrigger value="gauges">
              <Gauge className="h-4 w-4 me-2" />
              {language === 'ar' ? 'المقاييس' : 'Gauges'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'اتجاهات الأداء' : 'Performance Trends'}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-80" />
                ) : (
                  <ReactECharts option={trendChartOption} style={{ height: 350 }} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'حركة المنتجات حسب الفئة' : 'Product Movement by Category'}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-80" />
                ) : (
                  <ReactECharts option={categoryChartOption} style={{ height: 350 }} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gauges">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiCards.filter(k => k.unit === '%').map(kpi => {
                const value = kpis[kpi.key as keyof KPIData];
                const Icon = kpi.icon;
                return (
                  <Card key={kpi.key}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <div className={`p-4 rounded-full ${kpi.bg} mb-4`}>
                          <Icon className={`h-8 w-8 ${kpi.color}`} />
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{kpi.label[language]}</p>
                        <div className="relative w-24 h-24">
                          <svg className="w-24 h-24 transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              className="text-muted/20"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={`${value * 2.51} 251`}
                              className={kpi.color}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xl font-bold ${kpi.color}`}>{value}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default WMSAdvancedReports;
