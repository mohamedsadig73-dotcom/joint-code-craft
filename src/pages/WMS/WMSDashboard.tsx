import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import ReactECharts from 'echarts-for-react';
import { 
  Package, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  AlertTriangle,
  BarChart3,
  Boxes,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Activity,
  PackageCheck
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface DashboardStats {
  totalProducts: number;
  totalLocations: number;
  totalInventoryValue: number;
  totalQuantity: number;
  lowStockItems: number;
  expiringItems: number;
  pendingInbound: number;
  pendingOutbound: number;
  completedToday: number;
  recentTransactions: any[];
  activeOrders: any[];
  inventoryByCategory: { name: string; value: number }[];
  weeklyTransactions: { date: string; inbound: number; outbound: number }[];
}

export default function WMSDashboard() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const isRTL = language === 'ar';

  useEffect(() => {
    loadDashboardStats();
    
    // Set up realtime subscription for transactions
    const channel = supabase
      .channel('wms-dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wms_transactions' }, () => {
        loadDashboardStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wms_inbound_orders' }, () => {
        loadDashboardStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wms_outbound_orders' }, () => {
        loadDashboardStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDashboardStats = async () => {
    try {
      const today = new Date();
      const todayStart = format(today, 'yyyy-MM-dd');
      const weekAgo = format(subDays(today, 7), 'yyyy-MM-dd');
      const thirtyDaysLater = format(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      const [
        productsResult,
        locationsResult,
        inventoryResult,
        inboundResult,
        outboundResult,
        transactionsResult,
        completedTodayResult,
        lowStockResult,
        expiringResult,
        weeklyTransactionsResult,
        activeInboundOrders,
        activeOutboundOrders
      ] = await Promise.all([
        supabase.from('wms_products').select('id, category', { count: 'exact' }).eq('is_active', true),
        supabase.from('wms_locations').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('wms_inventory').select('quantity, cost_per_unit, product:wms_products(category, min_stock_level)'),
        supabase.from('wms_inbound_orders').select('id', { count: 'exact' }).in('status', ['draft', 'pending', 'in_progress']),
        supabase.from('wms_outbound_orders').select('id', { count: 'exact' }).in('status', ['draft', 'pending', 'in_progress']),
        supabase.from('wms_transactions').select('*, product:wms_products(name, sku)').order('performed_at', { ascending: false }).limit(10),
        supabase.from('wms_transactions').select('id', { count: 'exact' }).gte('performed_at', todayStart),
        supabase.from('wms_inventory').select('id, quantity, product:wms_products(min_stock_level)'),
        supabase.from('wms_inventory').select('id', { count: 'exact' }).not('expiry_date', 'is', null).lte('expiry_date', thirtyDaysLater),
        supabase.from('wms_transactions').select('transaction_type, quantity, performed_at').gte('performed_at', weekAgo),
        supabase.from('wms_inbound_orders').select('*, supplier:wms_suppliers(name)').in('status', ['pending', 'in_progress']).order('expected_date', { ascending: true }).limit(5),
        supabase.from('wms_outbound_orders').select('*').in('status', ['pending', 'in_progress']).order('expected_ship_date', { ascending: true }).limit(5)
      ]);

      // Calculate inventory stats
      const inventory = inventoryResult.data || [];
      const totalValue = inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.cost_per_unit || 0)), 0);
      const totalQuantity = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);

      // Low stock count
      const lowStockCount = (lowStockResult.data || []).filter(item => {
        const minStock = (item.product as any)?.min_stock_level || 10;
        return item.quantity <= minStock;
      }).length;

      // Category distribution
      const categoryMap: Record<string, number> = {};
      inventory.forEach(item => {
        const cat = (item.product as any)?.category || (language === 'ar' ? 'غير مصنف' : 'Uncategorized');
        categoryMap[cat] = (categoryMap[cat] || 0) + item.quantity;
      });
      const inventoryByCategory = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

      // Weekly transactions
      const weeklyMap: Record<string, { inbound: number; outbound: number }> = {};
      (weeklyTransactionsResult.data || []).forEach(tx => {
        const date = format(new Date(tx.performed_at), 'MM-dd');
        if (!weeklyMap[date]) weeklyMap[date] = { inbound: 0, outbound: 0 };
        if (tx.transaction_type === 'receive') weeklyMap[date].inbound += tx.quantity;
        else if (tx.transaction_type === 'ship') weeklyMap[date].outbound += tx.quantity;
      });
      const weeklyTransactions = Object.entries(weeklyMap).map(([date, data]) => ({ date, ...data }));

      // Combine active orders
      const activeOrders = [
        ...(activeInboundOrders.data || []).map(o => ({ ...o, type: 'inbound' as const, expectedDate: o.expected_date })),
        ...(activeOutboundOrders.data || []).map(o => ({ ...o, type: 'outbound' as const, expectedDate: o.expected_ship_date }))
      ].sort((a, b) => new Date(a.expectedDate || '').getTime() - new Date(b.expectedDate || '').getTime());

      setStats({
        totalProducts: productsResult.count || 0,
        totalLocations: locationsResult.count || 0,
        totalInventoryValue: totalValue,
        totalQuantity,
        lowStockItems: lowStockCount,
        expiringItems: expiringResult.count || 0,
        pendingInbound: inboundResult.count || 0,
        pendingOutbound: outboundResult.count || 0,
        completedToday: completedTodayResult.count || 0,
        recentTransactions: transactionsResult.data || [],
        activeOrders,
        inventoryByCategory,
        weeklyTransactions
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      receive: { ar: 'استلام', en: 'Receive' },
      putaway: { ar: 'تخزين', en: 'Put Away' },
      pick: { ar: 'التقاط', en: 'Pick' },
      pack: { ar: 'تعبئة', en: 'Pack' },
      ship: { ar: 'شحن', en: 'Ship' },
      transfer: { ar: 'نقل', en: 'Transfer' },
      adjustment: { ar: 'تسوية', en: 'Adjustment' },
      cycle_count: { ar: 'جرد', en: 'Cycle Count' },
      return: { ar: 'إرجاع', en: 'Return' }
    };
    return labels[type]?.[language] || type;
  };

  const weeklyChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { 
      data: [language === 'ar' ? 'الاستلام' : 'Inbound', language === 'ar' ? 'الصرف' : 'Outbound'],
      bottom: 0 
    },
    xAxis: { type: 'category', data: stats?.weeklyTransactions.map(d => d.date) || [] },
    yAxis: { type: 'value' },
    series: [
      {
        name: language === 'ar' ? 'الاستلام' : 'Inbound',
        type: 'line',
        smooth: true,
        data: stats?.weeklyTransactions.map(d => d.inbound) || [],
        areaStyle: { opacity: 0.3 },
        itemStyle: { color: '#22c55e' }
      },
      {
        name: language === 'ar' ? 'الصرف' : 'Outbound',
        type: 'line',
        smooth: true,
        data: stats?.weeklyTransactions.map(d => d.outbound) || [],
        areaStyle: { opacity: 0.3 },
        itemStyle: { color: '#3b82f6' }
      }
    ]
  };

  const categoryChartOption = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: stats?.inventoryByCategory || [],
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
    }]
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              {language === 'ar' ? 'لوحة تحكم المستودع' : 'Warehouse Dashboard'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'نظرة شاملة على المخزون والعمليات' : 'Complete overview of inventory and operations'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/wms/reports')}>
              <BarChart3 className="h-4 w-4 me-2" />
              {language === 'ar' ? 'التقارير' : 'Reports'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/wms/alerts')}>
              <AlertTriangle className="h-4 w-4 me-2" />
              {language === 'ar' ? 'التنبيهات' : 'Alerts'}
              {(stats?.lowStockItems || 0) + (stats?.expiringItems || 0) > 0 && (
                <Badge variant="destructive" className="ms-2">
                  {(stats?.lowStockItems || 0) + (stats?.expiringItems || 0)}
                </Badge>
              )}
            </Button>
            <Button onClick={() => navigate('/wms/shipments')}>
              <Truck className="h-4 w-4 me-2" />
              {language === 'ar' ? 'تتبع الشحنات' : 'Track Shipments'}
            </Button>
          </div>
        </div>

        {/* KPI Cards - Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/wms/inventory')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إجمالي الكمية' : 'Total Quantity'}</p>
                  <p className="text-2xl font-bold">{stats?.totalQuantity?.toLocaleString() || 0}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Package className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/wms/inventory')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'قيمة المخزون' : 'Inventory Value'}</p>
                  <p className="text-xl font-bold">{formatCurrency(stats?.totalInventoryValue || 0)}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/wms/products')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'المنتجات' : 'Products'}</p>
                  <p className="text-2xl font-bold">{stats?.totalProducts || 0}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Boxes className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/wms/locations')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'المواقع' : 'Locations'}</p>
                  <p className="text-2xl font-bold">{stats?.totalLocations || 0}</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards - Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-orange-500/30" onClick={() => navigate('/wms/alerts')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'مخزون منخفض' : 'Low Stock'}</p>
                  <p className="text-2xl font-bold text-orange-600">{stats?.lowStockItems || 0}</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/wms/inbound')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'أوامر استلام' : 'Inbound Orders'}</p>
                  <p className="text-2xl font-bold">{stats?.pendingInbound || 0}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <ArrowDownToLine className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/wms/outbound')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'أوامر صرف' : 'Outbound Orders'}</p>
                  <p className="text-2xl font-bold">{stats?.pendingOutbound || 0}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <ArrowUpFromLine className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'حركات اليوم' : 'Today\'s Activity'}</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.completedToday || 0}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5" />
                {language === 'ar' ? 'حركة المخزون (آخر 7 أيام)' : 'Inventory Movement (Last 7 Days)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts option={weeklyChartOption} style={{ height: 250 }} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="w-5 h-5" />
                {language === 'ar' ? 'توزيع الفئات' : 'Category Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts option={categoryChartOption} style={{ height: 250 }} />
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Orders */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5" />
                {language === 'ar' ? 'الأوامر النشطة' : 'Active Orders'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.activeOrders && stats.activeOrders.length > 0 ? (
                <div className="space-y-3">
                  {stats.activeOrders.slice(0, 6).map((order: any) => (
                    <div 
                      key={order.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/wms/${order.type}/${order.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${order.type === 'inbound' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-blue-500/20 text-blue-600'}`}>
                          {order.type === 'inbound' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.supplier?.name || order.customer_name || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="text-end">
                        <Badge variant={order.status === 'in_progress' ? 'default' : 'secondary'}>
                          {order.status === 'pending' ? (language === 'ar' ? 'معلق' : 'Pending') : (language === 'ar' ? 'قيد التنفيذ' : 'In Progress')}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.expectedDate 
                            ? format(new Date(order.expectedDate), 'MM-dd')
                            : '-'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  {language === 'ar' ? 'لا توجد أوامر نشطة' : 'No active orders'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions + Recent Activity */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/wms/inbound')}>
                  <ArrowDownToLine className="w-5 h-5" />
                  <span className="text-xs">{language === 'ar' ? 'استلام' : 'Receive'}</span>
                </Button>
                <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/wms/outbound')}>
                  <ArrowUpFromLine className="w-5 h-5" />
                  <span className="text-xs">{language === 'ar' ? 'صرف' : 'Ship'}</span>
                </Button>
                <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/wms/cycle-count')}>
                  <PackageCheck className="w-5 h-5" />
                  <span className="text-xs">{language === 'ar' ? 'جرد' : 'Count'}</span>
                </Button>
                <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/wms/transactions')}>
                  <Activity className="w-5 h-5" />
                  <span className="text-xs">{language === 'ar' ? 'الحركات' : 'Activity'}</span>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5" />
                  {language === 'ar' ? 'آخر الحركات' : 'Recent Activity'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {stats.recentTransactions.slice(0, 5).map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-full ${['receive', 'return'].includes(tx.transaction_type) ? 'bg-green-500/20 text-green-600' : 'bg-blue-500/20 text-blue-600'}`}>
                            {['receive', 'return'].includes(tx.transaction_type) ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          </div>
                          <div>
                            <p className="font-medium text-xs">{tx.product?.name?.substring(0, 20) || tx.product?.sku}</p>
                            <p className="text-xs text-muted-foreground">{getTransactionTypeLabel(tx.transaction_type)}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold">{tx.quantity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    {language === 'ar' ? 'لا توجد حركات' : 'No transactions'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
