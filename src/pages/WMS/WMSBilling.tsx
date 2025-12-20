import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Receipt, 
  DollarSign, 
  Search, 
  Download,
  Calendar,
  TrendingUp,
  FileText,
  CreditCard,
  Building2,
  Package,
  Truck
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import ReactECharts from 'echarts-for-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  tenantName: string;
  tenantCode: string;
  period: string;
  storageCharges: number;
  handlingCharges: number;
  shippingCharges: number;
  additionalCharges: number;
  totalAmount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  createdAt: string;
}

interface BillingRate {
  id: string;
  service: string;
  description: string;
  rate: number;
  unit: string;
}

const WMSBilling: React.FC = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const billingRates: BillingRate[] = [
    { id: '1', service: language === 'ar' ? 'التخزين' : 'Storage', description: language === 'ar' ? 'لكل متر مربع / شهر' : 'Per sqm / month', rate: 50, unit: 'm²/month' },
    { id: '2', service: language === 'ar' ? 'الاستلام' : 'Receiving', description: language === 'ar' ? 'لكل باليت' : 'Per pallet', rate: 15, unit: 'pallet' },
    { id: '3', service: language === 'ar' ? 'الانتقاء' : 'Picking', description: language === 'ar' ? 'لكل طلب' : 'Per order', rate: 5, unit: 'order' },
    { id: '4', service: language === 'ar' ? 'التعبئة' : 'Packing', description: language === 'ar' ? 'لكل صندوق' : 'Per carton', rate: 3, unit: 'carton' },
    { id: '5', service: language === 'ar' ? 'الشحن' : 'Shipping', description: language === 'ar' ? 'لكل شحنة' : 'Per shipment', rate: 25, unit: 'shipment' },
  ];

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    
    // Generate sample invoices
    const sampleInvoices: Invoice[] = [];
    const tenants = [
      { name: 'ABC Trading', code: 'TN-001' },
      { name: 'XYZ Logistics', code: 'TN-002' },
      { name: 'Global Imports', code: 'TN-003' },
      { name: 'Quick Commerce', code: 'TN-004' },
    ];

    for (let i = 0; i < 12; i++) {
      const tenant = tenants[i % tenants.length];
      const date = subMonths(new Date(), Math.floor(i / tenants.length));
      const storage = Math.round(500 + Math.random() * 1000);
      const handling = Math.round(200 + Math.random() * 500);
      const shipping = Math.round(100 + Math.random() * 300);
      const additional = Math.round(Math.random() * 100);
      
      sampleInvoices.push({
        id: crypto.randomUUID(),
        invoiceNumber: `INV-${format(date, 'yyyyMM')}-${(i % tenants.length + 1).toString().padStart(3, '0')}`,
        tenantName: tenant.name,
        tenantCode: tenant.code,
        period: format(date, 'MMMM yyyy'),
        storageCharges: storage,
        handlingCharges: handling,
        shippingCharges: shipping,
        additionalCharges: additional,
        totalAmount: storage + handling + shipping + additional,
        status: i < 4 ? 'pending' : i < 8 ? 'paid' : Math.random() > 0.5 ? 'paid' : 'overdue',
        dueDate: format(new Date(date.getFullYear(), date.getMonth() + 1, 15), 'yyyy-MM-dd'),
        createdAt: format(date, 'yyyy-MM-dd')
      });
    }

    setInvoices(sampleInvoices);
    setLoading(false);
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.tenantName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0);
  const pendingAmount = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.totalAmount, 0);
  const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.totalAmount, 0);

  const revenueChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: language === 'ar' ? 'التخزين' : 'Storage',
        type: 'bar',
        stack: 'total',
        data: [4500, 5200, 4800, 5500, 6000, 5800],
        itemStyle: { color: '#3b82f6' }
      },
      {
        name: language === 'ar' ? 'المناولة' : 'Handling',
        type: 'bar',
        stack: 'total',
        data: [2000, 2500, 2200, 2800, 3000, 2900],
        itemStyle: { color: '#10b981' }
      },
      {
        name: language === 'ar' ? 'الشحن' : 'Shipping',
        type: 'bar',
        stack: 'total',
        data: [1500, 1800, 1600, 2000, 2200, 2100],
        itemStyle: { color: '#f59e0b' }
      }
    ]
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      paid: 'default',
      pending: 'secondary',
      overdue: 'destructive'
    };
    const labels: Record<string, { ar: string; en: string }> = {
      paid: { ar: 'مدفوع', en: 'Paid' },
      pending: { ar: 'معلق', en: 'Pending' },
      overdue: { ar: 'متأخر', en: 'Overdue' }
    };
    return (
      <Badge variant={variants[status]}>
        {labels[status]?.[language === 'ar' ? 'ar' : 'en']}
      </Badge>
    );
  };

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'الفوترة' : 'Billing' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              {language === 'ar' ? 'الفوترة والإيرادات' : 'Billing & Revenue'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة الفواتير وتتبع الإيرادات' : 'Manage invoices and track revenue'}
            </p>
          </div>
          <Button>
            <FileText className="h-4 w-4 me-2" />
            {language === 'ar' ? 'إنشاء فاتورة' : 'Generate Invoice'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
                  </p>
                  <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <CreditCard className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'المعلقة' : 'Pending'}
                  </p>
                  <p className="text-2xl font-bold">${pendingAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <Calendar className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'المتأخرة' : 'Overdue'}
                  </p>
                  <p className="text-2xl font-bold">${overdueAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'معدل التحصيل' : 'Collection Rate'}
                  </p>
                  <p className="text-2xl font-bold">
                    {Math.round((totalRevenue / (totalRevenue + pendingAmount + overdueAmount)) * 100)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList>
            <TabsTrigger value="invoices">
              <Receipt className="h-4 w-4 me-2" />
              {language === 'ar' ? 'الفواتير' : 'Invoices'}
            </TabsTrigger>
            <TabsTrigger value="rates">
              <DollarSign className="h-4 w-4 me-2" />
              {language === 'ar' ? 'أسعار الخدمات' : 'Service Rates'}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 me-2" />
              {language === 'ar' ? 'تحليل الإيرادات' : 'Revenue Analytics'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{language === 'ar' ? 'قائمة الفواتير' : 'Invoice List'}</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="ps-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المستأجر' : 'Tenant'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الفترة' : 'Period'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التخزين' : 'Storage'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المناولة' : 'Handling'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map(invoice => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>
                            <div>
                              <p>{invoice.tenantName}</p>
                              <p className="text-sm text-muted-foreground">{invoice.tenantCode}</p>
                            </div>
                          </TableCell>
                          <TableCell>{invoice.period}</TableCell>
                          <TableCell>${invoice.storageCharges}</TableCell>
                          <TableCell>${invoice.handlingCharges}</TableCell>
                          <TableCell className="font-bold">${invoice.totalAmount}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rates">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'أسعار الخدمات' : 'Service Rates'}</CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'الأسعار المطبقة على خدمات المستودع' : 'Rates applied to warehouse services'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'الخدمة' : 'Service'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                      <TableHead>{language === 'ar' ? 'السعر' : 'Rate'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوحدة' : 'Unit'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingRates.map(rate => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">{rate.service}</TableCell>
                        <TableCell>{rate.description}</TableCell>
                        <TableCell className="font-bold">${rate.rate}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{rate.unit}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'تحليل الإيرادات الشهرية' : 'Monthly Revenue Analysis'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={revenueChartOption} style={{ height: '400px' }} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default WMSBilling;
