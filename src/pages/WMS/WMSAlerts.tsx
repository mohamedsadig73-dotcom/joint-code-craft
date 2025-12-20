import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AutoReplenishmentPanel } from '@/components/wms/AutoReplenishmentPanel';
import { 
  AlertTriangle, 
  Package, 
  Calendar, 
  Bell,
  CheckCircle,
  RefreshCw,
  TrendingDown,
  Mail,
  ShoppingCart
} from 'lucide-react';
import { format, addDays } from 'date-fns';

interface LowStockAlert {
  id: string;
  productName: string;
  sku: string;
  currentQty: number;
  minStock: number;
  locationCode: string;
}

interface ExpiryAlert {
  id: string;
  productName: string;
  sku: string;
  lotNumber: string | null;
  expiryDate: string;
  quantity: number;
  daysUntilExpiry: number;
  locationCode: string;
}

const WMSAlerts: React.FC = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    await Promise.all([
      loadLowStockAlerts(),
      loadExpiryAlerts()
    ]);
    setLoading(false);
  };

  const refreshAlerts = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const sendEmailAlerts = async () => {
    if (!user?.email) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'لا يوجد بريد إلكتروني' : 'No email found',
        variant: 'destructive'
      });
      return;
    }

    setSendingEmail(true);
    try {
      const alerts = [
        ...lowStockAlerts.map(a => ({
          productName: a.productName,
          sku: a.sku,
          quantity: a.currentQty,
          minStock: a.minStock,
          locationCode: a.locationCode
        })),
        ...expiryAlerts.map(a => ({
          productName: a.productName,
          sku: a.sku,
          quantity: a.quantity,
          expiryDate: a.expiryDate,
          daysUntilExpiry: a.daysUntilExpiry,
          locationCode: a.locationCode
        }))
      ];

      const { error } = await supabase.functions.invoke('send-wms-alert-email', {
        body: {
          alertType: 'critical',
          recipientEmail: user.email,
          alerts
        }
      });

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الإرسال' : 'Sent',
        description: language === 'ar' ? 'تم إرسال التنبيهات بالبريد' : 'Alerts sent via email'
      });
    } catch (err) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل إرسال البريد' : 'Failed to send email',
        variant: 'destructive'
      });
    }
    setSendingEmail(false);
  };

  const loadLowStockAlerts = async () => {
    const { data } = await supabase
      .from('wms_inventory')
      .select(`
        id,
        quantity,
        product:wms_products(name, sku, min_stock_level),
        location:wms_locations(code)
      `)
      .order('quantity', { ascending: true });

    if (data) {
      const alerts: LowStockAlert[] = [];
      data.forEach(item => {
        const minStock = (item.product as any)?.min_stock_level || 0;
        if (item.quantity <= minStock) {
          alerts.push({
            id: item.id,
            productName: (item.product as any)?.name || '',
            sku: (item.product as any)?.sku || '',
            currentQty: item.quantity,
            minStock: minStock,
            locationCode: (item.location as any)?.code || ''
          });
        }
      });
      setLowStockAlerts(alerts);
    }
  };

  const loadExpiryAlerts = async () => {
    const today = new Date();
    const thirtyDaysLater = addDays(today, 30);

    const { data } = await supabase
      .from('wms_inventory')
      .select(`
        id,
        quantity,
        lot_number,
        expiry_date,
        product:wms_products(name, sku),
        location:wms_locations(code)
      `)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', format(thirtyDaysLater, 'yyyy-MM-dd'))
      .order('expiry_date', { ascending: true });

    if (data) {
      const alerts: ExpiryAlert[] = data.map(item => {
        const expiryDate = new Date(item.expiry_date!);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: item.id,
          productName: (item.product as any)?.name || '',
          sku: (item.product as any)?.sku || '',
          lotNumber: item.lot_number,
          expiryDate: item.expiry_date!,
          quantity: item.quantity,
          daysUntilExpiry,
          locationCode: (item.location as any)?.code || ''
        };
      });
      setExpiryAlerts(alerts);
    }
  };

  const getExpiryBadgeVariant = (days: number) => {
    if (days <= 0) return 'destructive';
    if (days <= 7) return 'destructive';
    if (days <= 14) return 'default';
    return 'secondary';
  };

  const getExpiryLabel = (days: number) => {
    if (days <= 0) return language === 'ar' ? 'منتهي' : 'Expired';
    if (days === 1) return language === 'ar' ? 'غداً' : 'Tomorrow';
    return language === 'ar' ? `${days} يوم` : `${days} days`;
  };

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'التنبيهات' : 'Alerts' }
  ];

  const totalAlerts = lowStockAlerts.length + expiryAlerts.length;

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              {language === 'ar' ? 'تنبيهات المستودع' : 'Warehouse Alerts'}
              {totalAlerts > 0 && (
                <Badge variant="destructive" className="text-lg px-3">
                  {totalAlerts}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'مراقبة المخزون المنخفض والمنتجات قريبة الانتهاء' : 'Monitor low stock and expiring products'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={sendEmailAlerts} disabled={sendingEmail || totalAlerts === 0} variant="outline">
              <Mail className={`h-4 w-4 me-2 ${sendingEmail ? 'animate-pulse' : ''}`} />
              {language === 'ar' ? 'إرسال بالبريد' : 'Email Alerts'}
            </Button>
            <Button onClick={refreshAlerts} disabled={refreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 me-2 ${refreshing ? 'animate-spin' : ''}`} />
              {language === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className={lowStockAlerts.length > 0 ? 'border-orange-500/50' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${lowStockAlerts.length > 0 ? 'bg-orange-500/20' : 'bg-muted'}`}>
                  <TrendingDown className={`h-6 w-6 ${lowStockAlerts.length > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'مخزون منخفض' : 'Low Stock'}
                  </p>
                  <p className="text-2xl font-bold">{lowStockAlerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={expiryAlerts.filter(a => a.daysUntilExpiry <= 7).length > 0 ? 'border-red-500/50' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${expiryAlerts.filter(a => a.daysUntilExpiry <= 7).length > 0 ? 'bg-red-500/20' : 'bg-muted'}`}>
                  <AlertTriangle className={`h-6 w-6 ${expiryAlerts.filter(a => a.daysUntilExpiry <= 7).length > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'ينتهي خلال 7 أيام' : 'Expiring in 7 days'}
                  </p>
                  <p className="text-2xl font-bold">{expiryAlerts.filter(a => a.daysUntilExpiry <= 7).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={expiryAlerts.filter(a => a.daysUntilExpiry <= 0).length > 0 ? 'border-destructive' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${expiryAlerts.filter(a => a.daysUntilExpiry <= 0).length > 0 ? 'bg-destructive/20' : 'bg-muted'}`}>
                  <Calendar className={`h-6 w-6 ${expiryAlerts.filter(a => a.daysUntilExpiry <= 0).length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'منتهي الصلاحية' : 'Expired'}
                  </p>
                  <p className="text-2xl font-bold">{expiryAlerts.filter(a => a.daysUntilExpiry <= 0).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Auto Replenishment Panel */}
        <AutoReplenishmentPanel autoCheck={true} />

        <Tabs defaultValue="low-stock" className="space-y-4 mt-6">
          <TabsList>
            <TabsTrigger value="low-stock" className="relative">
              <Package className="h-4 w-4 me-2" />
              {language === 'ar' ? 'مخزون منخفض' : 'Low Stock'}
              {lowStockAlerts.length > 0 && (
                <Badge variant="destructive" className="ms-2">{lowStockAlerts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expiry" className="relative">
              <Calendar className="h-4 w-4 me-2" />
              {language === 'ar' ? 'قريبة الانتهاء' : 'Expiring Soon'}
              {expiryAlerts.length > 0 && (
                <Badge variant="destructive" className="ms-2">{expiryAlerts.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="low-stock">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-orange-500" />
                  {language === 'ar' ? 'منتجات تحت الحد الأدنى' : 'Products Below Minimum Stock'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : lowStockAlerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">
                      {language === 'ar' ? 'جميع المنتجات فوق الحد الأدنى' : 'All products above minimum stock'}
                    </p>
                    <p className="text-muted-foreground">
                      {language === 'ar' ? 'لا توجد تنبيهات حالياً' : 'No alerts at this time'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lowStockAlerts.map(alert => (
                      <div 
                        key={alert.id} 
                        className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg border border-orange-500/20"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-orange-500/20 rounded-lg">
                            <Package className="h-5 w-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="font-medium">{alert.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {alert.sku} | {language === 'ar' ? 'الموقع' : 'Location'}: {alert.locationCode}
                            </p>
                          </div>
                        </div>
                        <div className="text-end">
                          <p className="text-2xl font-bold text-orange-600">{alert.currentQty}</p>
                          <p className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'الحد الأدنى' : 'Min'}: {alert.minStock}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expiry">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-red-500" />
                  {language === 'ar' ? 'منتجات قريبة الانتهاء' : 'Products Expiring Soon'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : expiryAlerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">
                      {language === 'ar' ? 'لا توجد منتجات قريبة الانتهاء' : 'No products expiring soon'}
                    </p>
                    <p className="text-muted-foreground">
                      {language === 'ar' ? 'جميع المنتجات صالحة لأكثر من 30 يوم' : 'All products valid for more than 30 days'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expiryAlerts.map(alert => (
                      <div 
                        key={alert.id} 
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          alert.daysUntilExpiry <= 0 
                            ? 'bg-destructive/10 border-destructive/20' 
                            : alert.daysUntilExpiry <= 7 
                              ? 'bg-red-500/10 border-red-500/20'
                              : 'bg-yellow-500/10 border-yellow-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${
                            alert.daysUntilExpiry <= 0 
                              ? 'bg-destructive/20' 
                              : alert.daysUntilExpiry <= 7 
                                ? 'bg-red-500/20'
                                : 'bg-yellow-500/20'
                          }`}>
                            <Calendar className={`h-5 w-5 ${
                              alert.daysUntilExpiry <= 0 
                                ? 'text-destructive' 
                                : alert.daysUntilExpiry <= 7 
                                  ? 'text-red-500'
                                  : 'text-yellow-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">{alert.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {alert.sku} 
                              {alert.lotNumber && ` | ${language === 'ar' ? 'الدفعة' : 'Lot'}: ${alert.lotNumber}`}
                              {` | ${language === 'ar' ? 'الموقع' : 'Location'}: ${alert.locationCode}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-end">
                          <Badge variant={getExpiryBadgeVariant(alert.daysUntilExpiry)}>
                            {getExpiryLabel(alert.daysUntilExpiry)}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(alert.expiryDate), 'yyyy-MM-dd')}
                          </p>
                          <p className="text-sm">
                            {language === 'ar' ? 'الكمية' : 'Qty'}: {alert.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default WMSAlerts;
