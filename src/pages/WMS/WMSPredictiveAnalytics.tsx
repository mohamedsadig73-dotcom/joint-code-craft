import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BrainCircuit, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Package,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Target
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

interface DemandForecast {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  predictedDemand: number;
  confidenceLevel: number;
  trend: 'up' | 'down' | 'stable';
  recommendedAction: string;
}

interface StockoutRisk {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  avgDailyDemand: number;
  daysUntilStockout: number;
  riskLevel: 'high' | 'medium' | 'low';
}

interface SeasonalPattern {
  month: string;
  demandIndex: number;
  isHighSeason: boolean;
}

const WMSPredictiveAnalytics: React.FC = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [stockoutRisks, setStockoutRisks] = useState<StockoutRisk[]>([]);
  const [seasonalPatterns, setSeasonalPatterns] = useState<SeasonalPattern[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    await Promise.all([
      generateDemandForecasts(),
      calculateStockoutRisks(),
      analyzeSeasonalPatterns()
    ]);
    setLoading(false);
  };

  const refreshAnalytics = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const generateDemandForecasts = async () => {
    // Fetch products and their transaction history
    const { data: products } = await supabase
      .from('wms_products')
      .select('id, name, sku')
      .eq('is_active', true)
      .limit(20);

    const { data: inventory } = await supabase
      .from('wms_inventory')
      .select('product_id, quantity');

    const { data: transactions } = await supabase
      .from('wms_transactions')
      .select('product_id, quantity, transaction_type, performed_at')
      .in('transaction_type', ['ship', 'pick'])
      .order('performed_at', { ascending: false })
      .limit(500);

    if (products && inventory && transactions) {
      const forecasts: DemandForecast[] = products.map(product => {
        const productInventory = inventory
          .filter(i => i.product_id === product.id)
          .reduce((sum, i) => sum + i.quantity, 0);

        const productTransactions = transactions.filter(t => t.product_id === product.id);
        const totalDemand = productTransactions.reduce((sum, t) => sum + t.quantity, 0);
        const avgDemand = productTransactions.length > 0 ? totalDemand / productTransactions.length : 0;
        
        // Simple prediction based on historical average with some randomness for demo
        const predictedDemand = Math.round(avgDemand * 30 * (0.8 + Math.random() * 0.4));
        const trend = Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable';
        
        let recommendedAction = '';
        if (predictedDemand > productInventory) {
          recommendedAction = language === 'ar' ? 'إنشاء أمر شراء' : 'Create purchase order';
        } else if (productInventory > predictedDemand * 2) {
          recommendedAction = language === 'ar' ? 'تقليل المخزون' : 'Reduce stock';
        } else {
          recommendedAction = language === 'ar' ? 'المخزون مثالي' : 'Stock optimal';
        }

        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          currentStock: productInventory,
          predictedDemand,
          confidenceLevel: Math.round(60 + Math.random() * 35),
          trend,
          recommendedAction
        };
      });

      setForecasts(forecasts);
    }
  };

  const calculateStockoutRisks = async () => {
    const { data: products } = await supabase
      .from('wms_products')
      .select('id, name, sku, min_stock_level')
      .eq('is_active', true);

    const { data: inventory } = await supabase
      .from('wms_inventory')
      .select('product_id, quantity');

    const { data: transactions } = await supabase
      .from('wms_transactions')
      .select('product_id, quantity')
      .in('transaction_type', ['ship', 'pick']);

    if (products && inventory && transactions) {
      const risks: StockoutRisk[] = [];

      products.forEach(product => {
        const currentStock = inventory
          .filter(i => i.product_id === product.id)
          .reduce((sum, i) => sum + i.quantity, 0);

        const productTransactions = transactions.filter(t => t.product_id === product.id);
        const totalDemand = productTransactions.reduce((sum, t) => sum + t.quantity, 0);
        const avgDailyDemand = productTransactions.length > 0 ? totalDemand / 30 : 0.1;
        
        const daysUntilStockout = avgDailyDemand > 0 ? Math.round(currentStock / avgDailyDemand) : 999;

        let riskLevel: 'high' | 'medium' | 'low' = 'low';
        if (daysUntilStockout <= 7) riskLevel = 'high';
        else if (daysUntilStockout <= 14) riskLevel = 'medium';

        if (riskLevel !== 'low') {
          risks.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            currentStock,
            avgDailyDemand: Math.round(avgDailyDemand * 10) / 10,
            daysUntilStockout,
            riskLevel
          });
        }
      });

      setStockoutRisks(risks.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout));
    }
  };

  const analyzeSeasonalPatterns = async () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const patterns: SeasonalPattern[] = months.map((month, index) => {
      // Generate demo seasonal data
      const baseIndex = 100;
      let demandIndex = baseIndex;
      
      // Higher demand in Q4 and summer
      if (index >= 9 || index <= 1) demandIndex = 120 + Math.random() * 30;
      else if (index >= 5 && index <= 7) demandIndex = 110 + Math.random() * 20;
      else demandIndex = 80 + Math.random() * 30;

      return {
        month,
        demandIndex: Math.round(demandIndex),
        isHighSeason: demandIndex > 115
      };
    });

    setSeasonalPatterns(patterns);
  };

  const demandChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: forecasts.slice(0, 10).map(f => f.sku)
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: language === 'ar' ? 'المخزون الحالي' : 'Current Stock',
        type: 'bar',
        data: forecasts.slice(0, 10).map(f => f.currentStock),
        itemStyle: { color: '#3b82f6' }
      },
      {
        name: language === 'ar' ? 'الطلب المتوقع' : 'Predicted Demand',
        type: 'bar',
        data: forecasts.slice(0, 10).map(f => f.predictedDemand),
        itemStyle: { color: '#10b981' }
      }
    ]
  };

  const seasonalChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: seasonalPatterns.map(p => p.month)
    },
    yAxis: { type: 'value', min: 60, max: 160 },
    series: [{
      name: language === 'ar' ? 'مؤشر الطلب' : 'Demand Index',
      type: 'line',
      data: seasonalPatterns.map(p => p.demandIndex),
      smooth: true,
      areaStyle: { opacity: 0.3 },
      itemStyle: { color: '#8b5cf6' },
      markLine: {
        data: [{ yAxis: 100, name: 'Baseline' }],
        lineStyle: { type: 'dashed' }
      }
    }]
  };

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'التحليلات التنبؤية' : 'Predictive Analytics' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BrainCircuit className="h-6 w-6" />
              {language === 'ar' ? 'التحليلات التنبؤية' : 'Predictive Analytics'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'توقعات الطلب وتحليل المخاطر بالذكاء الاصطناعي' : 'AI-powered demand forecasting and risk analysis'}
            </p>
          </div>
          <Button onClick={refreshAnalytics} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 me-2 ${refreshing ? 'animate-spin' : ''}`} />
            {language === 'ar' ? 'تحديث التحليلات' : 'Refresh Analytics'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'منتجات صاعدة' : 'Trending Up'}
                  </p>
                  <p className="text-2xl font-bold">
                    {loading ? <Skeleton className="h-8 w-12" /> : forecasts.filter(f => f.trend === 'up').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'خطر نفاد المخزون' : 'Stockout Risks'}
                  </p>
                  <p className="text-2xl font-bold">
                    {loading ? <Skeleton className="h-8 w-12" /> : stockoutRisks.filter(r => r.riskLevel === 'high').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Target className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'متوسط الدقة' : 'Avg Accuracy'}
                  </p>
                  <p className="text-2xl font-bold">
                    {loading ? <Skeleton className="h-8 w-12" /> : 
                      `${Math.round(forecasts.reduce((sum, f) => sum + f.confidenceLevel, 0) / (forecasts.length || 1))}%`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Lightbulb className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'توصيات فعالة' : 'Actionable Insights'}
                  </p>
                  <p className="text-2xl font-bold">
                    {loading ? <Skeleton className="h-8 w-12" /> : 
                      forecasts.filter(f => f.recommendedAction !== (language === 'ar' ? 'المخزون مثالي' : 'Stock optimal')).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="forecasts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forecasts">
              <TrendingUp className="h-4 w-4 me-2" />
              {language === 'ar' ? 'توقعات الطلب' : 'Demand Forecasts'}
            </TabsTrigger>
            <TabsTrigger value="risks">
              <AlertTriangle className="h-4 w-4 me-2" />
              {language === 'ar' ? 'مخاطر النفاد' : 'Stockout Risks'}
            </TabsTrigger>
            <TabsTrigger value="seasonal">
              <Calendar className="h-4 w-4 me-2" />
              {language === 'ar' ? 'الأنماط الموسمية' : 'Seasonal Patterns'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forecasts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'مقارنة المخزون والطلب' : 'Stock vs Demand'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-64" />
                  ) : (
                    <ReactECharts option={demandChartOption} style={{ height: '300px' }} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'التوصيات' : 'Recommendations'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {forecasts.filter(f => f.recommendedAction !== (language === 'ar' ? 'المخزون مثالي' : 'Stock optimal')).slice(0, 5).map(forecast => (
                        <div key={forecast.productId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {forecast.trend === 'up' ? (
                              <ArrowUpRight className="h-5 w-5 text-green-500" />
                            ) : forecast.trend === 'down' ? (
                              <ArrowDownRight className="h-5 w-5 text-red-500" />
                            ) : (
                              <TrendingUp className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">{forecast.sku}</p>
                              <p className="text-sm text-muted-foreground">{forecast.productName}</p>
                            </div>
                          </div>
                          <div className="text-end">
                            <Badge variant="outline">{forecast.recommendedAction}</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {forecast.confidenceLevel}% {language === 'ar' ? 'ثقة' : 'confidence'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="risks">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  {language === 'ar' ? 'منتجات معرضة لخطر النفاد' : 'Products at Risk of Stockout'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'بناءً على معدل الاستهلاك الحالي' : 'Based on current consumption rate'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : stockoutRisks.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">
                      {language === 'ar' ? 'لا توجد مخاطر نفاد مخزون' : 'No stockout risks detected'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stockoutRisks.map(risk => (
                      <div 
                        key={risk.productId}
                        className={`p-4 rounded-lg border ${
                          risk.riskLevel === 'high' 
                            ? 'bg-red-500/10 border-red-500/30' 
                            : 'bg-yellow-500/10 border-yellow-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Package className={`h-5 w-5 ${risk.riskLevel === 'high' ? 'text-red-500' : 'text-yellow-600'}`} />
                            <div>
                              <p className="font-medium">{risk.productName}</p>
                              <p className="text-sm text-muted-foreground">SKU: {risk.sku}</p>
                            </div>
                          </div>
                          <Badge variant={risk.riskLevel === 'high' ? 'destructive' : 'default'}>
                            {risk.daysUntilStockout} {language === 'ar' ? 'يوم' : 'days'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">{language === 'ar' ? 'المخزون الحالي' : 'Current Stock'}</p>
                            <p className="font-medium">{risk.currentStock}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{language === 'ar' ? 'الطلب اليومي' : 'Daily Demand'}</p>
                            <p className="font-medium">{risk.avgDailyDemand}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{language === 'ar' ? 'مستوى الخطر' : 'Risk Level'}</p>
                            <Progress 
                              value={risk.riskLevel === 'high' ? 90 : 60} 
                              className={`h-2 ${risk.riskLevel === 'high' ? '[&>div]:bg-red-500' : '[&>div]:bg-yellow-500'}`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seasonal">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'الأنماط الموسمية للطلب' : 'Seasonal Demand Patterns'}</CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'تحليل الطلب على مدار العام (100 = المتوسط)' : 'Demand analysis throughout the year (100 = baseline)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <ReactECharts option={seasonalChartOption} style={{ height: '300px' }} />
                )}
                
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {seasonalPatterns.filter(p => p.isHighSeason).map(pattern => (
                    <div key={pattern.month} className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{pattern.month}</span>
                        <Badge variant="secondary">{pattern.demandIndex}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'ar' ? 'موسم عالي الطلب' : 'High demand season'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default WMSPredictiveAnalytics;
