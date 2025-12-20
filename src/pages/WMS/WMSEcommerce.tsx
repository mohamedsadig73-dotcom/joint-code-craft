import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  Link as LinkIcon, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Package,
  TrendingUp,
  Clock,
  ExternalLink,
  Zap,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';

export default function WMSEcommerce() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRTL = language === 'ar';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    platform_name: '',
    platform_type: 'shopify',
    api_url: ''
  });

  const { data: platforms = [], isLoading } = useQuery({
    queryKey: ['wms-ecommerce-platforms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wms_ecommerce_platforms')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['wms-ecommerce-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wms_ecommerce_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('wms_ecommerce_platforms').insert({
        platform_name: data.platform_name,
        platform_type: data.platform_type,
        api_url: data.api_url || null,
        created_by: user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-ecommerce-platforms'] });
      toast({ title: language === 'ar' ? 'تمت إضافة المنصة بنجاح' : 'Platform added successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  });

  const toggleConnectionMutation = useMutation({
    mutationFn: async ({ id, is_connected }: { id: string; is_connected: boolean }) => {
      const { error } = await supabase
        .from('wms_ecommerce_platforms')
        .update({ 
          is_connected, 
          last_sync_at: is_connected ? new Date().toISOString() : null,
          sync_status: is_connected ? 'synced' : 'idle'
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-ecommerce-platforms'] });
      toast({ title: language === 'ar' ? 'تم تحديث الاتصال' : 'Connection updated' });
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (platformId: string) => {
      setSyncing(platformId);
      await supabase
        .from('wms_ecommerce_platforms')
        .update({ sync_status: 'syncing' })
        .eq('id', platformId);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error } = await supabase
        .from('wms_ecommerce_platforms')
        .update({ 
          sync_status: 'synced',
          last_sync_at: new Date().toISOString()
        })
        .eq('id', platformId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-ecommerce-platforms'] });
      toast({ title: language === 'ar' ? 'تمت المزامنة بنجاح' : 'Sync completed' });
      setSyncing(null);
    },
    onError: () => {
      setSyncing(null);
    }
  });

  const resetForm = () => {
    setFormData({ platform_name: '', platform_type: 'shopify', api_url: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getPlatformIcon = (type: string) => {
    switch (type) {
      case 'shopify': return '🛍️';
      case 'woocommerce': return '🔌';
      case 'magento': return '🧲';
      case 'amazon': return '📦';
      default: return '🌐';
    }
  };

  const connectedPlatforms = platforms.filter((p: any) => p.is_connected);
  const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'التجارة الإلكترونية' : 'E-commerce' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              {language === 'ar' ? 'تكامل التجارة الإلكترونية' : 'E-commerce Integration'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'ربط المتاجر الإلكترونية ومزامنة الطلبات' : 'Connect online stores and sync orders'}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'إضافة منصة' : 'Add Platform'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{language === 'ar' ? 'إضافة منصة جديدة' : 'Add New Platform'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اسم المنصة' : 'Platform Name'}</Label>
                  <Input
                    value={formData.platform_name}
                    onChange={(e) => setFormData({ ...formData, platform_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'نوع المنصة' : 'Platform Type'}</Label>
                  <Select value={formData.platform_type} onValueChange={(v) => setFormData({ ...formData, platform_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shopify">🛍️ Shopify</SelectItem>
                      <SelectItem value="woocommerce">🔌 WooCommerce</SelectItem>
                      <SelectItem value="magento">🧲 Magento</SelectItem>
                      <SelectItem value="amazon">📦 Amazon</SelectItem>
                      <SelectItem value="other">🌐 {language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'رابط API (اختياري)' : 'API URL (optional)'}</Label>
                  <Input
                    value={formData.api_url}
                    onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
                  <Button type="submit" disabled={createMutation.isPending}>{language === 'ar' ? 'إنشاء' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <LinkIcon className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المنصات المتصلة' : 'Connected'}</p>
                  <p className="text-2xl font-bold">{connectedPlatforms.length}/{platforms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Package className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</p>
                  <p className="text-2xl font-bold">{pendingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <CheckCircle className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'حالة المزامنة' : 'Sync Status'}</p>
                  <p className="text-lg font-bold text-green-600">{language === 'ar' ? 'متصل' : 'Active'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="platforms" className="space-y-4">
          <TabsList>
            <TabsTrigger value="platforms">
              <LinkIcon className="h-4 w-4 me-2" />
              {language === 'ar' ? 'المنصات' : 'Platforms'}
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Package className="h-4 w-4 me-2" />
              {language === 'ar' ? 'الطلبات' : 'Orders'}
              {orders.length > 0 && <Badge variant="secondary" className="ms-2">{orders.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platforms">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
              </div>
            ) : platforms.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد منصات. أضف منصة جديدة للبدء.' : 'No platforms. Add a new platform to get started.'}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platforms.map((platform: any) => (
                  <Card key={platform.id} className={platform.is_connected ? 'border-green-500/30' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{getPlatformIcon(platform.platform_type)}</span>
                          <div>
                            <CardTitle className="text-lg">{platform.platform_name}</CardTitle>
                            <CardDescription className="capitalize">{platform.platform_type}</CardDescription>
                          </div>
                        </div>
                        {platform.is_connected ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{language === 'ar' ? 'الاتصال' : 'Connection'}</span>
                          <Switch
                            checked={platform.is_connected || false}
                            onCheckedChange={(checked) => toggleConnectionMutation.mutate({ id: platform.id, is_connected: checked })}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{language === 'ar' ? 'حالة المزامنة' : 'Sync Status'}</span>
                          <Badge variant={platform.is_connected ? 'default' : 'secondary'}>
                            {platform.sync_status === 'syncing' ? (language === 'ar' ? 'جاري...' : 'Syncing...') :
                             platform.is_connected ? (language === 'ar' ? 'متصل' : 'Connected') : (language === 'ar' ? 'غير متصل' : 'Disconnected')}
                          </Badge>
                        </div>

                        {platform.last_sync_at && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'آخر مزامنة' : 'Last Sync'}</span>
                            <span>{format(new Date(platform.last_sync_at), 'yyyy-MM-dd HH:mm')}</span>
                          </div>
                        )}

                        <Button 
                          className="w-full gap-2" 
                          variant="outline"
                          disabled={!platform.is_connected || syncing === platform.id}
                          onClick={() => syncMutation.mutate(platform.id)}
                        >
                          <RefreshCw className={`w-4 h-4 ${syncing === platform.id ? 'animate-spin' : ''}`} />
                          {language === 'ar' ? 'مزامنة الآن' : 'Sync Now'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'طلبات المتاجر' : 'Store Orders'}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد طلبات' : 'No orders yet'}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'رقم الطلب' : 'Order #'}</TableHead>
                        <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">{order.order_number || order.external_order_id}</TableCell>
                          <TableCell>{order.customer_name || '-'}</TableCell>
                          <TableCell>${order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === 'completed' ? 'default' : 'outline'}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.order_date ? format(new Date(order.order_date), 'yyyy-MM-dd') : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}