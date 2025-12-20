import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar,
  User,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface Shipment {
  id: string;
  order_number: string;
  type: 'inbound' | 'outbound';
  status: string;
  customer_name?: string | null;
  supplier_name?: string | null;
  expected_date: string | null;
  actual_date: string | null;
  items_count: number;
  shipping_address?: string | null;
  notes?: string | null;
  created_at: string;
}

interface ShipmentUpdate {
  id: string;
  shipment_id: string;
  status: string;
  timestamp: string;
  notes?: string | null;
  location?: string | null;
}

const WMSShipments: React.FC = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    loadShipments();

    // Set up realtime subscriptions
    const inboundChannel = supabase
      .channel('inbound-shipments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wms_inbound_orders' }, () => {
        loadShipments();
      })
      .subscribe();

    const outboundChannel = supabase
      .channel('outbound-shipments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wms_outbound_orders' }, () => {
        loadShipments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(inboundChannel);
      supabase.removeChannel(outboundChannel);
    };
  }, []);

  const loadShipments = async () => {
    setLoading(true);
    try {
      const [inboundResult, outboundResult] = await Promise.all([
        supabase
          .from('wms_inbound_orders')
          .select(`
            id,
            order_number,
            status,
            expected_date,
            received_date,
            notes,
            created_at,
            supplier:wms_suppliers(name),
            lines:wms_inbound_lines(id)
          `)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('wms_outbound_orders')
          .select(`
            id,
            order_number,
            status,
            expected_ship_date,
            shipped_date,
            customer_name,
            shipping_address,
            notes,
            created_at,
            lines:wms_outbound_lines(id)
          `)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      const inboundShipments: Shipment[] = (inboundResult.data || []).map(o => ({
        id: o.id,
        order_number: o.order_number,
        type: 'inbound' as const,
        status: o.status,
        supplier_name: (o.supplier as any)?.name,
        expected_date: o.expected_date,
        actual_date: o.received_date,
        items_count: (o.lines as any[])?.length || 0,
        notes: o.notes,
        created_at: o.created_at || ''
      }));

      const outboundShipments: Shipment[] = (outboundResult.data || []).map(o => ({
        id: o.id,
        order_number: o.order_number,
        type: 'outbound' as const,
        status: o.status,
        customer_name: o.customer_name,
        shipping_address: o.shipping_address,
        expected_date: o.expected_ship_date,
        actual_date: o.shipped_date,
        items_count: (o.lines as any[])?.length || 0,
        notes: o.notes,
        created_at: o.created_at || ''
      }));

      const allShipments = [...inboundShipments, ...outboundShipments]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setShipments(allShipments);
    } catch (error) {
      console.error('Error loading shipments:', error);
    }
    setLoading(false);
  };

  const refreshShipments = async () => {
    setRefreshing(true);
    await loadShipments();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      pending: 'bg-yellow-500/20 text-yellow-600',
      in_progress: 'bg-blue-500/20 text-blue-600',
      completed: 'bg-green-500/20 text-green-600',
      cancelled: 'bg-red-500/20 text-red-600'
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      draft: { ar: 'مسودة', en: 'Draft' },
      pending: { ar: 'معلق', en: 'Pending' },
      in_progress: { ar: 'قيد التنفيذ', en: 'In Progress' },
      completed: { ar: 'مكتمل', en: 'Completed' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' }
    };
    return labels[status]?.[language] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress': return <Truck className="h-5 w-5 text-blue-500" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return <Package className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const filteredShipments = shipments.filter(s => {
    const matchesSearch = s.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'inbound' && s.type === 'inbound') ||
      (activeTab === 'outbound' && s.type === 'outbound') ||
      (activeTab === 'active' && ['pending', 'in_progress'].includes(s.status)) ||
      (activeTab === 'completed' && s.status === 'completed');

    return matchesSearch && matchesTab;
  });

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'تتبع الشحنات' : 'Shipment Tracking' }
  ];

  // Stats
  const activeCount = shipments.filter(s => ['pending', 'in_progress'].includes(s.status)).length;
  const inboundCount = shipments.filter(s => s.type === 'inbound' && ['pending', 'in_progress'].includes(s.status)).length;
  const outboundCount = shipments.filter(s => s.type === 'outbound' && ['pending', 'in_progress'].includes(s.status)).length;
  const completedToday = shipments.filter(s => {
    if (s.status !== 'completed' || !s.actual_date) return false;
    return format(new Date(s.actual_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  }).length;

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-7 w-7" />
              {language === 'ar' ? 'تتبع الشحنات' : 'Shipment Tracking'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'متابعة حالة جميع الشحنات الواردة والصادرة' : 'Track all inbound and outbound shipments'}
            </p>
          </div>
          <Button onClick={refreshShipments} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 me-2 ${refreshing ? 'animate-spin' : ''}`} />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'شحنات نشطة' : 'Active'}</p>
                  <p className="text-2xl font-bold">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <ArrowDownToLine className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'واردة' : 'Inbound'}</p>
                  <p className="text-2xl font-bold">{inboundCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <ArrowUpFromLine className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'صادرة' : 'Outbound'}</p>
                  <p className="text-2xl font-bold">{outboundCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مكتملة اليوم' : 'Completed Today'}</p>
                  <p className="text-2xl font-bold">{completedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'البحث برقم الأمر أو اسم العميل...' : 'Search by order number or customer...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              {language === 'ar' ? 'الكل' : 'All'}
              <Badge variant="secondary" className="ms-2">{shipments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active">
              <Activity className="h-4 w-4 me-2" />
              {language === 'ar' ? 'نشطة' : 'Active'}
              <Badge variant="secondary" className="ms-2">{activeCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inbound">
              <ArrowDownToLine className="h-4 w-4 me-2" />
              {language === 'ar' ? 'واردة' : 'Inbound'}
            </TabsTrigger>
            <TabsTrigger value="outbound">
              <ArrowUpFromLine className="h-4 w-4 me-2" />
              {language === 'ar' ? 'صادرة' : 'Outbound'}
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CheckCircle className="h-4 w-4 me-2" />
              {language === 'ar' ? 'مكتملة' : 'Completed'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : filteredShipments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-muted-foreground">
                    {language === 'ar' ? 'لا توجد شحنات' : 'No shipments found'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredShipments.map(shipment => (
                  <Card 
                    key={shipment.id} 
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedShipment?.id === shipment.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedShipment(selectedShipment?.id === shipment.id ? null : shipment)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${
                            shipment.type === 'inbound' ? 'bg-emerald-500/10' : 'bg-blue-500/10'
                          }`}>
                            {shipment.type === 'inbound' 
                              ? <ArrowDownToLine className="h-6 w-6 text-emerald-600" />
                              : <ArrowUpFromLine className="h-6 w-6 text-blue-600" />
                            }
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{shipment.order_number}</h3>
                              <Badge variant="outline" className="text-xs">
                                {shipment.type === 'inbound' 
                                  ? (language === 'ar' ? 'وارد' : 'Inbound')
                                  : (language === 'ar' ? 'صادر' : 'Outbound')
                                }
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {shipment.customer_name || shipment.supplier_name || '-'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-end">
                            <div className="flex items-center gap-2 justify-end">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{shipment.items_count} {language === 'ar' ? 'بند' : 'items'}</span>
                            </div>
                            <div className="flex items-center gap-2 justify-end text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span className="text-xs">
                                {shipment.expected_date 
                                  ? format(new Date(shipment.expected_date), 'yyyy-MM-dd')
                                  : '-'
                                }
                              </span>
                            </div>
                          </div>
                          <Badge className={getStatusColor(shipment.status)}>
                            {getStatusLabel(shipment.status)}
                          </Badge>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedShipment?.id === shipment.id && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Timeline */}
                            <div className="md:col-span-2">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {language === 'ar' ? 'سجل الحركة' : 'Timeline'}
                              </h4>
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <div className="p-1.5 rounded-full bg-muted">
                                    <Package className="h-3 w-3" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{language === 'ar' ? 'تم الإنشاء' : 'Created'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(shipment.created_at), 'yyyy-MM-dd HH:mm')}
                                    </p>
                                  </div>
                                </div>
                                
                                {['pending', 'in_progress', 'completed'].includes(shipment.status) && (
                                  <div className="flex items-start gap-3">
                                    <div className={`p-1.5 rounded-full ${
                                      shipment.status !== 'draft' ? 'bg-yellow-500/20' : 'bg-muted'
                                    }`}>
                                      <Clock className={`h-3 w-3 ${shipment.status !== 'draft' ? 'text-yellow-600' : ''}`} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{language === 'ar' ? 'قيد المعالجة' : 'Processing'}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {language === 'ar' ? 'تاريخ التوقع' : 'Expected'}: {shipment.expected_date 
                                          ? format(new Date(shipment.expected_date), 'yyyy-MM-dd')
                                          : '-'
                                        }
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {shipment.status === 'completed' && shipment.actual_date && (
                                  <div className="flex items-start gap-3">
                                    <div className="p-1.5 rounded-full bg-green-500/20">
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{language === 'ar' ? 'تم الإكمال' : 'Completed'}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(shipment.actual_date), 'yyyy-MM-dd HH:mm')}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Quick Info */}
                            <div>
                              <h4 className="font-medium mb-3">{language === 'ar' ? 'معلومات' : 'Info'}</h4>
                              <div className="space-y-2 text-sm">
                                {shipment.shipping_address && (
                                  <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <span className="text-muted-foreground">{shipment.shipping_address}</span>
                                  </div>
                                )}
                                {shipment.notes && (
                                  <div className="p-2 bg-muted/50 rounded text-xs">
                                    {shipment.notes}
                                  </div>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                className="mt-4 w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/wms/${shipment.type}/${shipment.id}`;
                                }}
                              >
                                {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default WMSShipments;
