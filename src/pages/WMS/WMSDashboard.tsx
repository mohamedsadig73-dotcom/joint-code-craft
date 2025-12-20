import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  Truck
} from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalLocations: number;
  totalInventoryValue: number;
  lowStockItems: number;
  pendingInbound: number;
  pendingOutbound: number;
  recentTransactions: any[];
}

export default function WMSDashboard() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const [
        productsResult,
        locationsResult,
        inventoryResult,
        inboundResult,
        outboundResult,
        transactionsResult
      ] = await Promise.all([
        supabase.from('wms_products').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('wms_locations').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('wms_inventory').select('quantity, cost_per_unit, product_id'),
        supabase.from('wms_inbound_orders').select('id', { count: 'exact' }).in('status', ['draft', 'pending', 'in_progress']),
        supabase.from('wms_outbound_orders').select('id', { count: 'exact' }).in('status', ['draft', 'pending', 'in_progress']),
        supabase.from('wms_transactions').select('*, product:wms_products(name, sku)').order('performed_at', { ascending: false }).limit(10)
      ]);

      // Calculate inventory value and low stock
      const inventory = inventoryResult.data || [];
      const totalValue = inventory.reduce((sum, item) => {
        return sum + ((item.quantity || 0) * (item.cost_per_unit || 0));
      }, 0);

      // Get low stock items count
      const { count: lowStockCount } = await supabase
        .from('wms_inventory')
        .select('id', { count: 'exact' })
        .lt('quantity', 10);

      setStats({
        totalProducts: productsResult.count || 0,
        totalLocations: locationsResult.count || 0,
        totalInventoryValue: totalValue,
        lowStockItems: lowStockCount || 0,
        pendingInbound: inboundResult.count || 0,
        pendingOutbound: outboundResult.count || 0,
        recentTransactions: transactionsResult.data || []
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            {language === 'ar' ? 'لوحة تحكم المخزون' : 'Inventory Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'نظرة شاملة على حالة المخزون والعمليات' : 'Overview of inventory status and operations'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/wms/products')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المنتجات' : 'Products'}</p>
                  <p className="text-2xl font-bold">{stats?.totalProducts || 0}</p>
                </div>
                <Package className="w-10 h-10 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/wms/locations')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المواقع' : 'Locations'}</p>
                  <p className="text-2xl font-bold">{stats?.totalLocations || 0}</p>
                </div>
                <MapPin className="w-10 h-10 text-blue-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/wms/inventory')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'قيمة المخزون' : 'Inventory Value'}</p>
                  <p className="text-xl font-bold">{formatCurrency(stats?.totalInventoryValue || 0)}</p>
                </div>
                <BarChart3 className="w-10 h-10 text-green-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer border-yellow-500/30" onClick={() => navigate('/wms/inventory?filter=low_stock')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مخزون منخفض' : 'Low Stock'}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats?.lowStockItems || 0}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-yellow-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/wms/inbound')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'أوامر استلام' : 'Pending Inbound'}</p>
                  <p className="text-2xl font-bold">{stats?.pendingInbound || 0}</p>
                </div>
                <ArrowDownToLine className="w-10 h-10 text-emerald-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/wms/outbound')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'أوامر صرف' : 'Pending Outbound'}</p>
                  <p className="text-2xl font-bold">{stats?.pendingOutbound || 0}</p>
                </div>
                <ArrowUpFromLine className="w-10 h-10 text-orange-500/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="w-5 h-5" />
                {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/wms/inbound/new')}>
                <ArrowDownToLine className="w-6 h-6" />
                <span>{language === 'ar' ? 'أمر استلام جديد' : 'New Inbound Order'}</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/wms/outbound/new')}>
                <ArrowUpFromLine className="w-6 h-6" />
                <span>{language === 'ar' ? 'أمر صرف جديد' : 'New Outbound Order'}</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/wms/products/new')}>
                <Package className="w-6 h-6" />
                <span>{language === 'ar' ? 'إضافة منتج' : 'Add Product'}</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/wms/cycle-count')}>
                <BarChart3 className="w-6 h-6" />
                <span>{language === 'ar' ? 'جرد دوري' : 'Cycle Count'}</span>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {language === 'ar' ? 'آخر الحركات' : 'Recent Transactions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentTransactions.slice(0, 5).map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          ['receive', 'return'].includes(tx.transaction_type) 
                            ? 'bg-green-500/20 text-green-600' 
                            : 'bg-orange-500/20 text-orange-600'
                        }`}>
                          {['receive', 'return'].includes(tx.transaction_type) 
                            ? <TrendingUp className="w-4 h-4" />
                            : <TrendingDown className="w-4 h-4" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tx.product?.name || tx.product?.sku}</p>
                          <p className="text-xs text-muted-foreground">
                            {getTransactionTypeLabel(tx.transaction_type)} • {tx.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(tx.performed_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد حركات حديثة' : 'No recent transactions'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
