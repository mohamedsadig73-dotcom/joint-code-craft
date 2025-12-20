import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
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
import { 
  ShoppingCart, 
  Link as LinkIcon, 
  Settings,
  CheckCircle,
  XCircle,
  RefreshCw,
  Package,
  TrendingUp,
  Clock,
  ExternalLink,
  Zap
} from 'lucide-react';

interface EcommerceChannel {
  id: string;
  name: string;
  platform: string;
  logo: string;
  isConnected: boolean;
  lastSync: string | null;
  ordersToday: number;
  ordersTotal: number;
  syncEnabled: boolean;
  apiKey?: string;
}

interface PendingOrder {
  id: string;
  orderNumber: string;
  channel: string;
  customerName: string;
  items: number;
  total: number;
  status: string;
  createdAt: string;
}

const WMSEcommerce: React.FC = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === 'ar';

  const [syncing, setSyncing] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<EcommerceChannel | null>(null);

  const [channels, setChannels] = useState<EcommerceChannel[]>([
    {
      id: '1',
      name: 'Shopify Store',
      platform: 'shopify',
      logo: '🛍️',
      isConnected: true,
      lastSync: new Date().toISOString(),
      ordersToday: 24,
      ordersTotal: 1250,
      syncEnabled: true
    },
    {
      id: '2',
      name: 'WooCommerce',
      platform: 'woocommerce',
      logo: '🛒',
      isConnected: true,
      lastSync: new Date(Date.now() - 3600000).toISOString(),
      ordersToday: 12,
      ordersTotal: 890,
      syncEnabled: true
    },
    {
      id: '3',
      name: 'Amazon Seller',
      platform: 'amazon',
      logo: '📦',
      isConnected: false,
      lastSync: null,
      ordersToday: 0,
      ordersTotal: 0,
      syncEnabled: false
    },
    {
      id: '4',
      name: 'eBay Store',
      platform: 'ebay',
      logo: '🏪',
      isConnected: false,
      lastSync: null,
      ordersToday: 0,
      ordersTotal: 0,
      syncEnabled: false
    },
    {
      id: '5',
      name: 'Magento',
      platform: 'magento',
      logo: '🔶',
      isConnected: false,
      lastSync: null,
      ordersToday: 0,
      ordersTotal: 0,
      syncEnabled: false
    }
  ]);

  const pendingOrders: PendingOrder[] = [
    { id: '1', orderNumber: 'SH-1001', channel: 'Shopify', customerName: 'John Doe', items: 3, total: 149.99, status: 'pending', createdAt: new Date().toISOString() },
    { id: '2', orderNumber: 'SH-1002', channel: 'Shopify', customerName: 'Jane Smith', items: 1, total: 59.99, status: 'pending', createdAt: new Date().toISOString() },
    { id: '3', orderNumber: 'WC-502', channel: 'WooCommerce', customerName: 'Bob Wilson', items: 5, total: 299.99, status: 'processing', createdAt: new Date().toISOString() },
    { id: '4', orderNumber: 'SH-1003', channel: 'Shopify', customerName: 'Alice Brown', items: 2, total: 89.99, status: 'pending', createdAt: new Date().toISOString() },
  ];

  const handleSync = async (channelId: string) => {
    setSyncing(channelId);
    
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setChannels(prev => prev.map(ch => 
      ch.id === channelId 
        ? { ...ch, lastSync: new Date().toISOString() }
        : ch
    ));

    toast({
      title: language === 'ar' ? 'تمت المزامنة' : 'Sync Complete',
      description: language === 'ar' ? 'تم مزامنة الطلبات بنجاح' : 'Orders synced successfully'
    });
    
    setSyncing(null);
  };

  const handleConnect = (channel: EcommerceChannel) => {
    setSelectedChannel(channel);
    setConfigDialogOpen(true);
  };

  const handleToggleSync = (channelId: string, enabled: boolean) => {
    setChannels(prev => prev.map(ch =>
      ch.id === channelId ? { ...ch, syncEnabled: enabled } : ch
    ));
  };

  const totalOrdersToday = channels.reduce((sum, ch) => sum + ch.ordersToday, 0);
  const connectedChannels = channels.filter(ch => ch.isConnected).length;

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'التجارة الإلكترونية' : 'E-commerce' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              {language === 'ar' ? 'تكامل التجارة الإلكترونية' : 'E-commerce Integration'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'ربط المتاجر الإلكترونية ومزامنة الطلبات' : 'Connect online stores and sync orders'}
            </p>
          </div>
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
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'القنوات المتصلة' : 'Connected Channels'}
                  </p>
                  <p className="text-2xl font-bold">{connectedChannels}/{channels.length}</p>
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
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'طلبات اليوم' : 'Orders Today'}
                  </p>
                  <p className="text-2xl font-bold">{totalOrdersToday}</p>
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
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'قيد الانتظار' : 'Pending'}
                  </p>
                  <p className="text-2xl font-bold">{pendingOrders.filter(o => o.status === 'pending').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}
                  </p>
                  <p className="text-2xl font-bold">{channels.reduce((sum, ch) => sum + ch.ordersTotal, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="channels" className="space-y-4">
          <TabsList>
            <TabsTrigger value="channels">
              <LinkIcon className="h-4 w-4 me-2" />
              {language === 'ar' ? 'القنوات' : 'Channels'}
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Package className="h-4 w-4 me-2" />
              {language === 'ar' ? 'الطلبات المعلقة' : 'Pending Orders'}
              <Badge variant="secondary" className="ms-2">{pendingOrders.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="channels">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map(channel => (
                <Card key={channel.id} className={channel.isConnected ? 'border-green-500/30' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{channel.logo}</span>
                        <div>
                          <CardTitle className="text-lg">{channel.name}</CardTitle>
                          <CardDescription>{channel.platform}</CardDescription>
                        </div>
                      </div>
                      {channel.isConnected ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {channel.isConnected ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">{language === 'ar' ? 'طلبات اليوم' : 'Today'}</p>
                            <p className="text-2xl font-bold">{channel.ordersToday}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
                            <p className="text-2xl font-bold">{channel.ordersTotal}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={channel.syncEnabled}
                              onCheckedChange={(checked) => handleToggleSync(channel.id, checked)}
                            />
                            <span className="text-sm">
                              {language === 'ar' ? 'مزامنة تلقائية' : 'Auto-sync'}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSync(channel.id)}
                            disabled={syncing === channel.id}
                          >
                            <RefreshCw className={`h-4 w-4 me-1 ${syncing === channel.id ? 'animate-spin' : ''}`} />
                            {language === 'ar' ? 'مزامنة' : 'Sync'}
                          </Button>
                        </div>

                        {channel.lastSync && (
                          <p className="text-xs text-muted-foreground">
                            {language === 'ar' ? 'آخر مزامنة:' : 'Last sync:'} {new Date(channel.lastSync).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'غير متصل. اضغط للربط.' : 'Not connected. Click to connect.'}
                        </p>
                        <Button onClick={() => handleConnect(channel)} className="w-full">
                          <Zap className="h-4 w-4 me-2" />
                          {language === 'ar' ? 'ربط' : 'Connect'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'الطلبات المعلقة من المتاجر' : 'Pending Store Orders'}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'رقم الطلب' : 'Order #'}</TableHead>
                      <TableHead>{language === 'ar' ? 'القناة' : 'Channel'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المنتجات' : 'Items'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.channel}</Badge>
                        </TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>{order.items}</TableCell>
                        <TableCell>${order.total}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
                            {order.status === 'pending' 
                              ? (language === 'ar' ? 'معلق' : 'Pending')
                              : (language === 'ar' ? 'قيد التنفيذ' : 'Processing')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Config Dialog */}
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? 'ربط' : 'Connect'} {selectedChannel?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>{language === 'ar' ? 'مفتاح API' : 'API Key'}</Label>
                <Input placeholder="sk_live_..." type="password" />
              </div>
              <div>
                <Label>{language === 'ar' ? 'رابط المتجر' : 'Store URL'}</Label>
                <Input placeholder="https://yourstore.com" />
              </div>
              <Button className="w-full">
                <LinkIcon className="h-4 w-4 me-2" />
                {language === 'ar' ? 'ربط المتجر' : 'Connect Store'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default WMSEcommerce;
