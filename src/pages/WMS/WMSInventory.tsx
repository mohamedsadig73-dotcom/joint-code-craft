import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Boxes, Search, AlertTriangle, Package, MapPin, Download } from 'lucide-react';

interface InventoryItem {
  id: string;
  product_id: string;
  location_id: string;
  lot_number: string | null;
  serial_number: string | null;
  expiry_date: string | null;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  status: string;
  cost_per_unit: number | null;
  product: {
    sku: string;
    name: string;
    unit_of_measure: string;
    min_stock_level: number | null;
  };
  location: {
    code: string;
    zone: string;
  };
}

export default function WMSInventory() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [zones, setZones] = useState<string[]>([]);

  useEffect(() => {
    loadInventory();
    loadZones();
  }, []);

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('wms_inventory')
        .select(`
          *,
          product:wms_products(sku, name, unit_of_measure, min_stock_level),
          location:wms_locations(code, zone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInventory(data as any || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async () => {
    try {
      const { data } = await supabase
        .from('wms_locations')
        .select('zone')
        .order('zone');
      
      const uniqueZones = [...new Set(data?.map(l => l.zone) || [])];
      setZones(uniqueZones);
    } catch (error) {
      console.error('Error loading zones:', error);
    }
  };

  const getStatusBadge = (status: string, quantity: number, minStock: number | null) => {
    if (status === 'expired') {
      return <Badge variant="destructive">{language === 'ar' ? 'منتهي' : 'Expired'}</Badge>;
    }
    if (status === 'on_hold') {
      return <Badge variant="outline">{language === 'ar' ? 'محجوز' : 'On Hold'}</Badge>;
    }
    if (status === 'damaged') {
      return <Badge variant="destructive">{language === 'ar' ? 'تالف' : 'Damaged'}</Badge>;
    }
    if (minStock && quantity < minStock) {
      return <Badge className="bg-yellow-500">{language === 'ar' ? 'منخفض' : 'Low Stock'}</Badge>;
    }
    return <Badge className="bg-green-500">{language === 'ar' ? 'متاح' : 'Available'}</Badge>;
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.lot_number && item.lot_number.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesZone = zoneFilter === 'all' || item.location?.zone === zoneFilter;
    
    return matchesSearch && matchesStatus && matchesZone;
  });

  const totalQuantity = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = filteredInventory.reduce((sum, item) => sum + (item.quantity * (item.cost_per_unit || 0)), 0);
  const lowStockCount = filteredInventory.filter(item => 
    item.product?.min_stock_level && item.quantity < item.product.min_stock_level
  ).length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const exportToCSV = () => {
    const headers = ['SKU', 'Product', 'Location', 'Zone', 'Lot', 'Quantity', 'Available', 'Status', 'Expiry'];
    const rows = filteredInventory.map(item => [
      item.product?.sku,
      item.product?.name,
      item.location?.code,
      item.location?.zone,
      item.lot_number || '',
      item.quantity,
      item.available_quantity,
      item.status,
      item.expiry_date || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: language === 'ar' ? 'تم التصدير' : 'Exported',
      description: language === 'ar' ? 'تم تصدير المخزون بنجاح' : 'Inventory exported successfully',
    });
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Boxes className="w-6 h-6" />
              {language === 'ar' ? 'المخزون' : 'Inventory'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'عرض وإدارة المخزون الحالي' : 'View and manage current inventory'}
            </p>
          </div>

          <Button variant="outline" className="gap-2" onClick={exportToCSV}>
            <Download className="w-4 h-4" />
            {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الكمية' : 'Total Quantity'}</p>
                  <p className="text-2xl font-bold">{totalQuantity.toLocaleString()}</p>
                </div>
                <Package className="w-8 h-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'القيمة الإجمالية' : 'Total Value'}</p>
                  <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
                </div>
                <Boxes className="w-8 h-8 text-green-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'عدد السجلات' : 'Records'}</p>
                  <p className="text-2xl font-bold">{filteredInventory.length}</p>
                </div>
                <MapPin className="w-8 h-8 text-blue-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مخزون منخفض' : 'Low Stock'}</p>
                  <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'بحث بالمنتج، SKU، الموقع، أو الدفعة...' : 'Search by product, SKU, location, or lot...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
              <SelectItem value="available">{language === 'ar' ? 'متاح' : 'Available'}</SelectItem>
              <SelectItem value="reserved">{language === 'ar' ? 'محجوز' : 'Reserved'}</SelectItem>
              <SelectItem value="on_hold">{language === 'ar' ? 'قيد الانتظار' : 'On Hold'}</SelectItem>
              <SelectItem value="damaged">{language === 'ar' ? 'تالف' : 'Damaged'}</SelectItem>
              <SelectItem value="expired">{language === 'ar' ? 'منتهي' : 'Expired'}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={language === 'ar' ? 'المنطقة' : 'Zone'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'جميع المناطق' : 'All Zones'}</SelectItem>
              {zones.map(zone => (
                <SelectItem key={zone} value={zone}>{zone}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Inventory Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Boxes className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد سجلات مخزون' : 'No inventory records found'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الموقع' : 'Location'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الدفعة' : 'Lot'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الكمية' : 'Quantity'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'متاح' : 'Available'}</TableHead>
                    <TableHead>{language === 'ar' ? 'انتهاء الصلاحية' : 'Expiry'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.product?.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono">{item.location?.code}</p>
                          <p className="text-xs text-muted-foreground">{item.location?.zone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.lot_number || '-'}</TableCell>
                      <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-center">
                        <span className={item.available_quantity < 1 ? 'text-red-500' : ''}>
                          {item.available_quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.expiry_date ? (
                          <span className={new Date(item.expiry_date) < new Date() ? 'text-red-500' : ''}>
                            {new Date(item.expiry_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status, item.quantity, item.product?.min_stock_level)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
