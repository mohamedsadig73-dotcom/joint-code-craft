import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Factory, 
  Cog, 
  Package,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Layers,
  ArrowRight
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

interface ProductionOrder {
  id: string;
  orderNumber: string;
  productName: string;
  targetQty: number;
  completedQty: number;
  wipQty: number;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'high' | 'medium' | 'low';
  startDate: string | null;
  dueDate: string;
  workCenter: string;
}

interface WIPItem {
  id: string;
  productName: string;
  stage: string;
  quantity: number;
  startedAt: string;
  estimatedCompletion: string;
  operator: string;
  status: 'active' | 'paused' | 'blocked';
}

interface WorkCenter {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'maintenance';
  currentOrder: string | null;
  efficiency: number;
  uptime: number;
}

const WMSMES: React.FC = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([
    { id: '1', orderNumber: 'PO-001', productName: 'Widget A', targetQty: 1000, completedQty: 750, wipQty: 150, status: 'in_progress', priority: 'high', startDate: '2024-01-15', dueDate: '2024-01-20', workCenter: 'Assembly Line 1' },
    { id: '2', orderNumber: 'PO-002', productName: 'Widget B', targetQty: 500, completedQty: 500, wipQty: 0, status: 'completed', priority: 'medium', startDate: '2024-01-14', dueDate: '2024-01-18', workCenter: 'Assembly Line 2' },
    { id: '3', orderNumber: 'PO-003', productName: 'Component X', targetQty: 2000, completedQty: 0, wipQty: 0, status: 'pending', priority: 'low', startDate: null, dueDate: '2024-01-25', workCenter: 'Machine Shop' },
    { id: '4', orderNumber: 'PO-004', productName: 'Assembly Y', targetQty: 300, completedQty: 100, wipQty: 50, status: 'on_hold', priority: 'high', startDate: '2024-01-16', dueDate: '2024-01-22', workCenter: 'Assembly Line 1' },
  ]);

  const [wipItems, setWIPItems] = useState<WIPItem[]>([
    { id: '1', productName: 'Widget A', stage: 'Assembly', quantity: 100, startedAt: '2024-01-17 08:00', estimatedCompletion: '2024-01-17 14:00', operator: 'Ahmed', status: 'active' },
    { id: '2', productName: 'Widget A', stage: 'Quality Check', quantity: 50, startedAt: '2024-01-17 10:00', estimatedCompletion: '2024-01-17 12:00', operator: 'Sara', status: 'active' },
    { id: '3', productName: 'Assembly Y', stage: 'Packaging', quantity: 50, startedAt: '2024-01-17 09:00', estimatedCompletion: '2024-01-17 11:00', operator: 'Mohamed', status: 'paused' },
  ]);

  const workCenters: WorkCenter[] = [
    { id: '1', name: 'Assembly Line 1', status: 'running', currentOrder: 'PO-001', efficiency: 92, uptime: 98 },
    { id: '2', name: 'Assembly Line 2', status: 'idle', currentOrder: null, efficiency: 0, uptime: 95 },
    { id: '3', name: 'Machine Shop', status: 'running', currentOrder: 'PO-005', efficiency: 88, uptime: 96 },
    { id: '4', name: 'Packaging Station', status: 'maintenance', currentOrder: null, efficiency: 0, uptime: 0 },
  ];

  const totalProduction = productionOrders.reduce((sum, o) => sum + o.completedQty, 0);
  const totalWIP = productionOrders.reduce((sum, o) => sum + o.wipQty, 0);
  const activeOrders = productionOrders.filter(o => o.status === 'in_progress').length;

  const productionChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: [language === 'ar' ? 'مكتمل' : 'Completed', language === 'ar' ? 'قيد التنفيذ' : 'WIP'] },
    xAxis: { type: 'category', data: productionOrders.map(o => o.orderNumber) },
    yAxis: { type: 'value' },
    series: [
      {
        name: language === 'ar' ? 'مكتمل' : 'Completed',
        type: 'bar',
        stack: 'total',
        data: productionOrders.map(o => o.completedQty),
        itemStyle: { color: '#10b981' }
      },
      {
        name: language === 'ar' ? 'قيد التنفيذ' : 'WIP',
        type: 'bar',
        stack: 'total',
        data: productionOrders.map(o => o.wipQty),
        itemStyle: { color: '#f59e0b' }
      }
    ]
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      in_progress: 'default',
      completed: 'secondary',
      pending: 'outline',
      on_hold: 'destructive'
    };
    const labels: Record<string, { ar: string; en: string }> = {
      in_progress: { ar: 'قيد التنفيذ', en: 'In Progress' },
      completed: { ar: 'مكتمل', en: 'Completed' },
      pending: { ar: 'معلق', en: 'Pending' },
      on_hold: { ar: 'متوقف', en: 'On Hold' }
    };
    return (
      <Badge variant={variants[status]}>
        {labels[status]?.[language === 'ar' ? 'ar' : 'en']}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    };
    return <div className={`h-2 w-2 rounded-full ${colors[priority]}`} />;
  };

  const getWorkCenterStatus = (status: string) => {
    switch (status) {
      case 'running': return <Badge className="bg-green-500">{language === 'ar' ? 'يعمل' : 'Running'}</Badge>;
      case 'idle': return <Badge variant="secondary">{language === 'ar' ? 'خامل' : 'Idle'}</Badge>;
      case 'maintenance': return <Badge variant="destructive">{language === 'ar' ? 'صيانة' : 'Maintenance'}</Badge>;
    }
  };

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'تكامل MES' : 'MES Integration' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Factory className="h-6 w-6" />
              {language === 'ar' ? 'تكامل نظام التصنيع (MES)' : 'Manufacturing Execution System (MES)'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة أوامر الإنتاج والعمل الجاري' : 'Manage production orders and work-in-progress'}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'الإنتاج المكتمل' : 'Completed'}
                  </p>
                  <p className="text-2xl font-bold">{totalProduction.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <Layers className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'العمل الجاري (WIP)' : 'Work in Progress'}
                  </p>
                  <p className="text-2xl font-bold">{totalWIP.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Cog className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'أوامر نشطة' : 'Active Orders'}
                  </p>
                  <p className="text-2xl font-bold">{activeOrders}</p>
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
                    {language === 'ar' ? 'متوسط الكفاءة' : 'Avg Efficiency'}
                  </p>
                  <p className="text-2xl font-bold">
                    {Math.round(workCenters.filter(w => w.status === 'running').reduce((sum, w) => sum + w.efficiency, 0) / workCenters.filter(w => w.status === 'running').length || 0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">
              <Package className="h-4 w-4 me-2" />
              {language === 'ar' ? 'أوامر الإنتاج' : 'Production Orders'}
            </TabsTrigger>
            <TabsTrigger value="wip">
              <Layers className="h-4 w-4 me-2" />
              {language === 'ar' ? 'العمل الجاري' : 'Work in Progress'}
              <Badge variant="secondary" className="ms-2">{wipItems.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="workcenters">
              <Factory className="h-4 w-4 me-2" />
              {language === 'ar' ? 'مراكز العمل' : 'Work Centers'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'أوامر الإنتاج' : 'Production Orders'}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'الأمر' : 'Order'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التقدم' : 'Progress'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead>{language === 'ar' ? 'مركز العمل' : 'Work Center'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productionOrders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPriorityBadge(order.priority)}
                              <span className="font-medium">{order.orderNumber}</span>
                            </div>
                          </TableCell>
                          <TableCell>{order.productName}</TableCell>
                          <TableCell>
                            <div className="space-y-1 min-w-[120px]">
                              <Progress value={(order.completedQty / order.targetQty) * 100} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {order.completedQty} / {order.targetQty}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-sm">{order.workCenter}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'ملخص الإنتاج' : 'Production Summary'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={productionChartOption} style={{ height: '300px' }} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="wip">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  {language === 'ar' ? 'العمل الجاري (WIP)' : 'Work in Progress (WIP)'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'المنتجات قيد التصنيع حالياً' : 'Products currently being manufactured'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المرحلة' : 'Stage'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الكمية' : 'Quantity'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المشغل' : 'Operator'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wipItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.stage}</Badge>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.operator}</TableCell>
                        <TableCell>
                          {item.status === 'active' 
                            ? <Badge className="bg-green-500">{language === 'ar' ? 'نشط' : 'Active'}</Badge>
                            : item.status === 'paused'
                              ? <Badge variant="secondary">{language === 'ar' ? 'متوقف' : 'Paused'}</Badge>
                              : <Badge variant="destructive">{language === 'ar' ? 'محجوب' : 'Blocked'}</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {item.status === 'active' ? (
                              <Button variant="ghost" size="sm"><Pause className="h-4 w-4" /></Button>
                            ) : (
                              <Button variant="ghost" size="sm"><Play className="h-4 w-4" /></Button>
                            )}
                            <Button variant="ghost" size="sm"><ArrowRight className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workcenters">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {workCenters.map(wc => (
                <Card key={wc.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{wc.name}</CardTitle>
                      {getWorkCenterStatus(wc.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {wc.status === 'running' ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الأمر الحالي' : 'Current Order'}</p>
                          <p className="font-medium">{wc.currentOrder}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الكفاءة' : 'Efficiency'}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold">{wc.efficiency}%</span>
                              <Progress value={wc.efficiency} className="flex-1 h-2" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{language === 'ar' ? 'وقت التشغيل' : 'Uptime'}</p>
                            <span className="text-2xl font-bold">{wc.uptime}%</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        {wc.status === 'idle' ? (
                          <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        ) : (
                          <Cog className="h-8 w-8 mx-auto text-muted-foreground mb-2 animate-spin" />
                        )}
                        <p className="text-muted-foreground">
                          {wc.status === 'idle' 
                            ? (language === 'ar' ? 'في انتظار العمل' : 'Waiting for work')
                            : (language === 'ar' ? 'تحت الصيانة' : 'Under maintenance')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default WMSMES;
