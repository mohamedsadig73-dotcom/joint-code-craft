import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  BarChart3,
  PieChart
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface InventoryStats {
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
  expiringCount: number;
}

interface TransactionStats {
  receives: number;
  shipments: number;
  adjustments: number;
  transfers: number;
}

const WMSReports: React.FC = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats>({
    totalProducts: 0,
    totalQuantity: 0,
    totalValue: 0,
    lowStockCount: 0,
    expiringCount: 0
  });
  const [transactionStats, setTransactionStats] = useState<TransactionStats>({
    receives: 0,
    shipments: 0,
    adjustments: 0,
    transfers: 0
  });
  const [dailyTransactions, setDailyTransactions] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadInventoryStats(),
      loadTransactionStats(),
      loadDailyTransactions(),
      loadCategoryData(),
      loadTopProducts(),
      loadLowStockProducts()
    ]);
    setLoading(false);
  };

  const loadInventoryStats = async () => {
    const { data: inventory } = await supabase
      .from('wms_inventory')
      .select('quantity, cost_per_unit, expiry_date, product:wms_products(min_stock_level)');

    if (inventory) {
      const today = new Date();
      const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      setInventoryStats({
        totalProducts: inventory.length,
        totalQuantity: inventory.reduce((sum, i) => sum + (i.quantity || 0), 0),
        totalValue: inventory.reduce((sum, i) => sum + ((i.quantity || 0) * (i.cost_per_unit || 0)), 0),
        lowStockCount: inventory.filter(i => {
          const minStock = (i.product as any)?.min_stock_level || 0;
          return i.quantity <= minStock;
        }).length,
        expiringCount: inventory.filter(i => {
          if (!i.expiry_date) return false;
          const expiry = new Date(i.expiry_date);
          return expiry <= thirtyDaysLater;
        }).length
      });
    }
  };

  const loadTransactionStats = async () => {
    const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const { data: transactions } = await supabase
      .from('wms_transactions')
      .select('transaction_type')
      .gte('performed_at', startDate)
      .lte('performed_at', endDate);

    if (transactions) {
      setTransactionStats({
        receives: transactions.filter(t => t.transaction_type === 'receive').length,
        shipments: transactions.filter(t => t.transaction_type === 'ship').length,
        adjustments: transactions.filter(t => t.transaction_type === 'adjustment').length,
        transfers: transactions.filter(t => t.transaction_type === 'transfer').length
      });
    }
  };

  const loadDailyTransactions = async () => {
    const last30Days = subDays(new Date(), 30);
    
    const { data: transactions } = await supabase
      .from('wms_transactions')
      .select('transaction_type, performed_at, quantity')
      .gte('performed_at', format(last30Days, 'yyyy-MM-dd'))
      .order('performed_at', { ascending: true });

    if (transactions) {
      const grouped: Record<string, { receives: number; shipments: number }> = {};
      
      transactions.forEach(t => {
        const date = format(new Date(t.performed_at || ''), 'MM-dd');
        if (!grouped[date]) {
          grouped[date] = { receives: 0, shipments: 0 };
        }
        if (t.transaction_type === 'receive') {
          grouped[date].receives += t.quantity;
        } else if (t.transaction_type === 'ship') {
          grouped[date].shipments += t.quantity;
        }
      });

      setDailyTransactions(Object.entries(grouped).map(([date, data]) => ({
        date,
        ...data
      })));
    }
  };

  const loadCategoryData = async () => {
    const { data: products } = await supabase
      .from('wms_products')
      .select('category');

    if (products) {
      const grouped: Record<string, number> = {};
      products.forEach(p => {
        const cat = p.category || (language === 'ar' ? 'غير مصنف' : 'Uncategorized');
        grouped[cat] = (grouped[cat] || 0) + 1;
      });

      setCategoryData(Object.entries(grouped).map(([name, value]) => ({ name, value })));
    }
  };

  const loadTopProducts = async () => {
    const { data } = await supabase
      .from('wms_inventory')
      .select('quantity, cost_per_unit, product:wms_products(name, sku)')
      .order('quantity', { ascending: false })
      .limit(5);

    if (data) {
      setTopProducts(data.map(d => ({
        name: (d.product as any)?.name || '',
        sku: (d.product as any)?.sku || '',
        quantity: d.quantity,
        value: d.quantity * (d.cost_per_unit || 0)
      })));
    }
  };

  const loadLowStockProducts = async () => {
    const { data } = await supabase
      .from('wms_inventory')
      .select('quantity, product:wms_products(name, sku, min_stock_level)')
      .order('quantity', { ascending: true })
      .limit(10);

    if (data) {
      setLowStockProducts(data.filter(d => {
        const minStock = (d.product as any)?.min_stock_level || 0;
        return d.quantity <= minStock;
      }).map(d => ({
        name: (d.product as any)?.name || '',
        sku: (d.product as any)?.sku || '',
        quantity: d.quantity,
        minStock: (d.product as any)?.min_stock_level || 0
      })));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Chart options
  const transactionChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { 
      data: [language === 'ar' ? 'الاستلام' : 'Receives', language === 'ar' ? 'الشحن' : 'Shipments'],
      bottom: 0
    },
    xAxis: {
      type: 'category',
      data: dailyTransactions.map(d => d.date)
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: language === 'ar' ? 'الاستلام' : 'Receives',
        type: 'bar',
        data: dailyTransactions.map(d => d.receives),
        itemStyle: { color: '#22c55e' }
      },
      {
        name: language === 'ar' ? 'الشحن' : 'Shipments',
        type: 'bar',
        data: dailyTransactions.map(d => d.shipments),
        itemStyle: { color: '#3b82f6' }
      }
    ]
  };

  const categoryChartOption = {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: language === 'ar' ? 'الفئات' : 'Categories',
        type: 'pie',
        radius: '50%',
        data: categoryData,
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

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'التقارير' : 'Reports' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="mb-6">
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'تقارير المستودع' : 'Warehouse Reports'}</h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تحليل شامل لأداء المستودع' : 'Comprehensive warehouse performance analysis'}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {loading ? (
            Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Package className="h-4 w-4" />
                    <span className="text-xs">{language === 'ar' ? 'إجمالي الكمية' : 'Total Qty'}</span>
                  </div>
                  <p className="text-2xl font-bold">{inventoryStats.totalQuantity.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">{language === 'ar' ? 'قيمة المخزون' : 'Inventory Value'}</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(inventoryStats.totalValue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">{language === 'ar' ? 'استلام الشهر' : 'Month Receives'}</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{transactionStats.receives}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-xs">{language === 'ar' ? 'شحنات الشهر' : 'Month Shipments'}</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{transactionStats.shipments}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-destructive mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs">{language === 'ar' ? 'تنبيهات' : 'Alerts'}</span>
                  </div>
                  <p className="text-2xl font-bold text-destructive">
                    {inventoryStats.lowStockCount + inventoryStats.expiringCount}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 me-2" />
              {language === 'ar' ? 'نظرة عامة' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <Package className="h-4 w-4 me-2" />
              {language === 'ar' ? 'المخزون' : 'Inventory'}
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <AlertTriangle className="h-4 w-4 me-2" />
              {language === 'ar' ? 'التنبيهات' : 'Alerts'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === 'ar' ? 'حركة المخزون (آخر 30 يوم)' : 'Inventory Movement (Last 30 Days)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-64" />
                  ) : (
                    <ReactECharts option={transactionChartOption} style={{ height: 300 }} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === 'ar' ? 'توزيع الفئات' : 'Category Distribution'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-64" />
                  ) : (
                    <ReactECharts option={categoryChartOption} style={{ height: 300 }} />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {language === 'ar' ? 'أعلى المنتجات كمية' : 'Top Products by Quantity'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.sku}</p>
                        </div>
                        <div className="text-end">
                          <p className="font-bold">{product.quantity.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(product.value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    {language === 'ar' ? 'مخزون منخفض' : 'Low Stock'}
                    <Badge variant="destructive">{lowStockProducts.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}
                    </div>
                  ) : lowStockProducts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      {language === 'ar' ? 'لا توجد منتجات منخفضة المخزون' : 'No low stock products'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lowStockProducts.map((product, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.sku}</p>
                          </div>
                          <div className="text-end">
                            <p className="font-bold text-orange-600">{product.quantity}</p>
                            <p className="text-xs text-muted-foreground">
                              {language === 'ar' ? 'الحد الأدنى' : 'Min'}: {product.minStock}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-red-500" />
                    {language === 'ar' ? 'قريبة الانتهاء' : 'Expiring Soon'}
                    <Badge variant="destructive">{inventoryStats.expiringCount}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-4">
                    {language === 'ar' 
                      ? `${inventoryStats.expiringCount} منتجات ستنتهي خلال 30 يوم`
                      : `${inventoryStats.expiringCount} products expiring within 30 days`}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default WMSReports;
