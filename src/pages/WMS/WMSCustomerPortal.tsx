import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Globe, 
  Search, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  MapPin,
  FileText,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';

interface Order {
  id: string;
  order_number: string;
  customer_name: string | null;
  status: string;
  created_at: string;
  expected_ship_date: string | null;
  shipped_date: string | null;
  shipping_address: string | null;
  items_count: number;
}

interface RMARequest {
  id: string;
  rma_number: string;
  status: string;
  reason: string;
  requested_date: string;
  items_count: number;
}

const WMSCustomerPortal: React.FC = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [rmaRequests, setRMARequests] = useState<RMARequest[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    
    // Search orders
    const { data: ordersData } = await supabase
      .from('wms_outbound_orders')
      .select('*, lines:wms_outbound_lines(count)')
      .or(`order_number.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%,customer_reference.ilike.%${searchQuery}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (ordersData) {
      setOrders(ordersData.map(order => ({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        status: order.status,
        created_at: order.created_at || '',
        expected_ship_date: order.expected_ship_date,
        shipped_date: order.shipped_date,
        shipping_address: order.shipping_address,
        items_count: (order.lines as any)?.[0]?.count || 0
      })));
    }

    // Search RMA
    const { data: rmaData } = await supabase
      .from('wms_rma')
      .select('*, lines:wms_rma_lines(count)')
      .or(`rma_number.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (rmaData) {
      setRMARequests(rmaData.map(rma => ({
        id: rma.id,
        rma_number: rma.rma_number,
        status: rma.status,
        reason: rma.reason,
        requested_date: rma.requested_date,
        items_count: (rma.lines as any)?.[0]?.count || 0
      })));
    }

    setLoading(false);
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'draft': return 10;
      case 'pending': return 25;
      case 'in_progress': return 50;
      case 'completed': return 100;
      case 'cancelled': return 0;
      default: return 0;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      draft: { ar: 'مسودة', en: 'Draft' },
      pending: { ar: 'قيد الانتظار', en: 'Pending' },
      in_progress: { ar: 'قيد التنفيذ', en: 'In Progress' },
      completed: { ar: 'مكتمل', en: 'Completed' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
      approved: { ar: 'معتمد', en: 'Approved' },
      received: { ar: 'مستلم', en: 'Received' }
    };
    return labels[status]?.[language === 'ar' ? 'ar' : 'en'] || status;
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'بوابة العملاء' : 'Customer Portal' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            {language === 'ar' ? 'بوابة العملاء' : 'Customer Portal'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تتبع طلباتك ومرتجعاتك' : 'Track your orders and returns'}
          </p>
        </div>

        {/* Search Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'ابحث برقم الطلب أو اسم العميل...' : 'Search by order number or customer name...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="ps-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 me-2" />
                {language === 'ar' ? 'بحث' : 'Search'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : orders.length > 0 || rmaRequests.length > 0 ? (
          <Tabs defaultValue="orders" className="space-y-4">
            <TabsList>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                {language === 'ar' ? 'الطلبات' : 'Orders'}
                {orders.length > 0 && <Badge>{orders.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="returns" className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                {language === 'ar' ? 'المرتجعات' : 'Returns'}
                {rmaRequests.length > 0 && <Badge>{rmaRequests.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              <div className="grid gap-4">
                {orders.map(order => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {order.order_number}
                          </h3>
                          {order.customer_name && (
                            <p className="text-muted-foreground">{order.customer_name}</p>
                          )}
                        </div>
                        <Badge variant={getStatusVariant(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-muted-foreground mb-2">
                          <span>{language === 'ar' ? 'تقدم الطلب' : 'Order Progress'}</span>
                          <span>{getStatusProgress(order.status)}%</span>
                        </div>
                        <Progress value={getStatusProgress(order.status)} className="h-2" />
                      </div>

                      {/* Order Timeline */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{language === 'ar' ? 'تاريخ الطلب:' : 'Order Date:'}</span>
                          <span className="font-medium">
                            {format(new Date(order.created_at), 'yyyy-MM-dd')}
                          </span>
                        </div>
                        {order.expected_ship_date && (
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span>{language === 'ar' ? 'الشحن المتوقع:' : 'Expected Ship:'}</span>
                            <span className="font-medium">{order.expected_ship_date}</span>
                          </div>
                        )}
                        {order.shipped_date && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>{language === 'ar' ? 'تم الشحن:' : 'Shipped:'}</span>
                            <span className="font-medium">
                              {format(new Date(order.shipped_date), 'yyyy-MM-dd')}
                            </span>
                          </div>
                        )}
                      </div>

                      {order.shipping_address && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {order.shipping_address}
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {order.items_count} {language === 'ar' ? 'منتج' : 'items'}
                        </span>
                        <Button variant="outline" size="sm">
                          {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="returns">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'رقم المرتجع' : 'RMA Number'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead>{language === 'ar' ? 'السبب' : 'Reason'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المنتجات' : 'Items'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rmaRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                              {language === 'ar' ? 'لا توجد مرتجعات' : 'No returns found'}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rmaRequests.map(rma => (
                          <TableRow key={rma.id}>
                            <TableCell className="font-medium">{rma.rma_number}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(rma.status)}>
                                {getStatusLabel(rma.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>{rma.reason}</TableCell>
                            <TableCell>{format(new Date(rma.requested_date), 'yyyy-MM-dd')}</TableCell>
                            <TableCell>{rma.items_count}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : searchQuery ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {language === 'ar' ? 'لم يتم العثور على نتائج' : 'No results found'}
              </p>
              <p className="text-muted-foreground">
                {language === 'ar' ? 'جرب البحث بكلمات مختلفة' : 'Try searching with different keywords'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {language === 'ar' ? 'ابحث عن طلباتك' : 'Search for your orders'}
              </p>
              <p className="text-muted-foreground">
                {language === 'ar' ? 'أدخل رقم الطلب أو اسمك للبحث' : 'Enter order number or your name to search'}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default WMSCustomerPortal;
