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
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightLeft, Plus, Search, Eye, Play, CheckCircle, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface CrossDock {
  id: string;
  cross_dock_number: string;
  inbound_order_id: string | null;
  outbound_order_id: string | null;
  status: string;
  scheduled_date: string | null;
  completed_date: string | null;
  priority: string;
  notes: string | null;
  created_at: string;
}

interface CrossDockLine {
  id: string;
  cross_dock_id: string;
  product_id: string;
  quantity: number;
  transferred_quantity: number;
  status: string;
  lot_number: string | null;
  serial_number: string | null;
  product?: { name: string; sku: string };
}

interface InboundOrder {
  id: string;
  order_number: string;
  status: string;
  supplier?: { name: string };
}

interface OutboundOrder {
  id: string;
  order_number: string;
  status: string;
  customer_name: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Location {
  id: string;
  code: string;
  zone: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In Progress' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

const priorityLabels: Record<string, { ar: string; en: string }> = {
  low: { ar: 'منخفض', en: 'Low' },
  normal: { ar: 'عادي', en: 'Normal' },
  high: { ar: 'عالي', en: 'High' },
  urgent: { ar: 'عاجل', en: 'Urgent' },
};

export default function WMSCrossDock() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [crossDocks, setCrossDocks] = useState<CrossDock[]>([]);
  const [inboundOrders, setInboundOrders] = useState<InboundOrder[]>([]);
  const [outboundOrders, setOutboundOrders] = useState<OutboundOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinesDialogOpen, setIsLinesDialogOpen] = useState(false);
  const [selectedCrossDock, setSelectedCrossDock] = useState<CrossDock | null>(null);
  const [crossDockLines, setCrossDockLines] = useState<CrossDockLine[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    inbound_order_id: '',
    outbound_order_id: '',
    scheduled_date: '',
    priority: 'normal',
    dock_location_id: '',
    notes: '',
  });

  const [lineFormData, setLineFormData] = useState({
    product_id: '',
    quantity: '',
    lot_number: '',
    serial_number: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [crossDocksRes, inboundRes, outboundRes, productsRes, locationsRes] = await Promise.all([
        supabase.from('wms_cross_dock').select('*').order('created_at', { ascending: false }),
        supabase.from('wms_inbound_orders').select('id, order_number, status').in('status', ['pending', 'in_progress']),
        supabase.from('wms_outbound_orders').select('id, order_number, status, customer_name').in('status', ['draft', 'pending']),
        supabase.from('wms_products').select('id, name, sku').eq('is_active', true),
        supabase.from('wms_locations').select('id, code, zone').eq('location_type', 'dock'),
      ]);

      if (crossDocksRes.error) throw crossDocksRes.error;
      setCrossDocks(crossDocksRes.data || []);
      setInboundOrders(inboundRes.data || []);
      setOutboundOrders(outboundRes.data || []);
      setProducts(productsRes.data || []);
      setLocations(locationsRes.data || []);
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

  const loadCrossDockLines = async (crossDockId: string) => {
    try {
      const { data, error } = await supabase
        .from('wms_cross_dock_lines')
        .select('*')
        .eq('cross_dock_id', crossDockId);

      if (error) throw error;

      const enrichedLines = (data || []).map(line => ({
        ...line,
        product: products.find(p => p.id === line.product_id),
      }));

      setCrossDockLines(enrichedLines);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const generateCrossDockNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `XD-${year}${month}${day}-${random}`;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('wms_cross_dock')
        .insert({
          cross_dock_number: generateCrossDockNumber(),
          inbound_order_id: formData.inbound_order_id || null,
          outbound_order_id: formData.outbound_order_id || null,
          scheduled_date: formData.scheduled_date || null,
          priority: formData.priority,
          dock_location_id: formData.dock_location_id || null,
          notes: formData.notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إنشاء عملية Cross-Dock' : 'Cross-dock operation created',
      });

      setIsDialogOpen(false);
      resetForm();
      loadData();

      // Open lines dialog
      setSelectedCrossDock(data);
      setIsLinesDialogOpen(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddLine = async () => {
    if (!selectedCrossDock || !lineFormData.product_id || !lineFormData.quantity) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى اختيار المنتج والكمية' : 'Please select product and quantity',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('wms_cross_dock_lines')
        .insert({
          cross_dock_id: selectedCrossDock.id,
          product_id: lineFormData.product_id,
          quantity: parseFloat(lineFormData.quantity),
          lot_number: lineFormData.lot_number || null,
          serial_number: lineFormData.serial_number || null,
        });

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إضافة المنتج' : 'Product added',
      });

      setLineFormData({
        product_id: '',
        quantity: '',
        lot_number: '',
        serial_number: '',
      });
      loadCrossDockLines(selectedCrossDock.id);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const startCrossDock = async (id: string) => {
    try {
      const { error } = await supabase
        .from('wms_cross_dock')
        .update({ status: 'in_progress' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم بدء عملية Cross-Dock' : 'Cross-dock started',
      });

      loadData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const transferItem = async (lineId: string, quantity: number) => {
    try {
      const line = crossDockLines.find(l => l.id === lineId);
      if (!line) return;

      const newTransferred = line.transferred_quantity + quantity;
      const newStatus = newTransferred >= line.quantity ? 'completed' : 'transferring';

      const { error } = await supabase
        .from('wms_cross_dock_lines')
        .update({ 
          transferred_quantity: newTransferred,
          status: newStatus,
        })
        .eq('id', lineId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم نقل المنتج' : 'Item transferred',
      });

      if (selectedCrossDock) {
        loadCrossDockLines(selectedCrossDock.id);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const completeCrossDock = async (id: string) => {
    try {
      const { error } = await supabase
        .from('wms_cross_dock')
        .update({ 
          status: 'completed',
          completed_date: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إتمام عملية Cross-Dock' : 'Cross-dock completed',
      });

      loadData();
      setIsLinesDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      inbound_order_id: '',
      outbound_order_id: '',
      scheduled_date: '',
      priority: 'normal',
      dock_location_id: '',
      notes: '',
    });
  };

  const openDetails = (crossDock: CrossDock) => {
    setSelectedCrossDock(crossDock);
    loadCrossDockLines(crossDock.id);
    setIsLinesDialogOpen(true);
  };

  const filteredCrossDocks = crossDocks.filter(cd => {
    const matchesSearch = cd.cross_dock_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cd.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-6 h-6" />
              {language === 'ar' ? 'Cross-Docking' : 'Cross-Docking'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'نقل مباشر من الاستلام إلى الشحن' : 'Direct transfer from receiving to shipping'}
            </p>
          </div>

          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {language === 'ar' ? 'عملية جديدة' : 'New Operation'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {language === 'ar' ? 'إنشاء عملية Cross-Dock' : 'Create Cross-Dock Operation'}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'أمر الاستلام (اختياري)' : 'Inbound Order (Optional)'}</Label>
                    <Select
                      value={formData.inbound_order_id}
                      onValueChange={(value) => setFormData({ ...formData, inbound_order_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر أمر الاستلام' : 'Select inbound order'} />
                      </SelectTrigger>
                      <SelectContent>
                        {inboundOrders.map(order => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.order_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'أمر الشحن (اختياري)' : 'Outbound Order (Optional)'}</Label>
                    <Select
                      value={formData.outbound_order_id}
                      onValueChange={(value) => setFormData({ ...formData, outbound_order_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر أمر الشحن' : 'Select outbound order'} />
                      </SelectTrigger>
                      <SelectContent>
                        {outboundOrders.map(order => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.order_number} - {order.customer_name || 'N/A'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'موقع الرصيف' : 'Dock Location'}</Label>
                    <Select
                      value={formData.dock_location_id}
                      onValueChange={(value) => setFormData({ ...formData, dock_location_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر الموقع' : 'Select location'} />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.code} - {loc.zone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'تاريخ الجدولة' : 'Scheduled Date'}</Label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الأولوية' : 'Priority'}</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label[language]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving
                      ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                      : (language === 'ar' ? 'إنشاء' : 'Create')
                    }
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'بحث برقم العملية...' : 'Search by operation number...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label[language]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{crossDocks.filter(c => c.status === 'pending').length}</div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'قيد الانتظار' : 'Pending'}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{crossDocks.filter(c => c.status === 'in_progress').length}</div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{crossDocks.filter(c => c.status === 'completed').length}</div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'مكتمل' : 'Completed'}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{crossDocks.filter(c => c.priority === 'urgent').length}</div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'عاجل' : 'Urgent'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cross-Dock Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredCrossDocks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد عمليات Cross-Dock' : 'No cross-dock operations found'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'رقم العملية' : 'Operation #'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ الجدولة' : 'Scheduled Date'}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</TableHead>
                    <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCrossDocks.map((cd) => (
                    <TableRow key={cd.id}>
                      <TableCell className="font-mono font-medium">{cd.cross_dock_number}</TableCell>
                      <TableCell>
                        <Badge variant={cd.priority === 'urgent' ? 'destructive' : cd.priority === 'high' ? 'default' : 'outline'}>
                          {priorityLabels[cd.priority]?.[language] || cd.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[cd.status] || ''}>
                          {statusLabels[cd.status]?.[language] || cd.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cd.scheduled_date
                          ? format(new Date(cd.scheduled_date), 'dd/MM/yyyy HH:mm', {
                              locale: language === 'ar' ? ar : enUS,
                            })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {format(new Date(cd.created_at), 'dd/MM/yyyy', {
                          locale: language === 'ar' ? ar : enUS,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDetails(cd)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canManage && cd.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startCrossDock(cd.id)}
                            >
                              <Play className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Lines Dialog */}
        <Dialog open={isLinesDialogOpen} onOpenChange={setIsLinesDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? 'تفاصيل Cross-Dock' : 'Cross-Dock Details'} - {selectedCrossDock?.cross_dock_number}
              </DialogTitle>
            </DialogHeader>

            {selectedCrossDock && (
              <div className="space-y-6">
                {/* Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</p>
                    <Badge className={statusColors[selectedCrossDock.status] || ''}>
                      {statusLabels[selectedCrossDock.status]?.[language] || selectedCrossDock.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الأولوية' : 'Priority'}</p>
                    <p className="font-medium">{priorityLabels[selectedCrossDock.priority]?.[language] || selectedCrossDock.priority}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تاريخ الجدولة' : 'Scheduled'}</p>
                    <p className="font-medium">
                      {selectedCrossDock.scheduled_date
                        ? format(new Date(selectedCrossDock.scheduled_date), 'dd/MM/yyyy HH:mm')
                        : '-'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الملاحظات' : 'Notes'}</p>
                    <p className="font-medium truncate">{selectedCrossDock.notes || '-'}</p>
                  </div>
                </div>

                {/* Add Line Form */}
                {canManage && selectedCrossDock.status !== 'completed' && (
                  <div className="p-4 border rounded-lg space-y-4">
                    <h4 className="font-medium">{language === 'ar' ? 'إضافة منتج' : 'Add Product'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Select
                        value={lineFormData.product_id}
                        onValueChange={(value) => setLineFormData({ ...lineFormData, product_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'ar' ? 'اختر المنتج' : 'Select product'} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder={language === 'ar' ? 'الكمية' : 'Quantity'}
                        value={lineFormData.quantity}
                        onChange={(e) => setLineFormData({ ...lineFormData, quantity: e.target.value })}
                      />
                      <Input
                        placeholder={language === 'ar' ? 'رقم الدفعة' : 'Lot Number'}
                        value={lineFormData.lot_number}
                        onChange={(e) => setLineFormData({ ...lineFormData, lot_number: e.target.value })}
                      />
                      <Button onClick={handleAddLine}>
                        <Plus className="w-4 h-4 me-2" />
                        {language === 'ar' ? 'إضافة' : 'Add'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lines Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الكمية' : 'Quantity'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المنقول' : 'Transferred'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      {canManage && <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crossDockLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{line.product?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{line.product?.sku}</p>
                            {line.serial_number && (
                              <p className="text-xs text-blue-500">SN: {line.serial_number}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{line.quantity}</TableCell>
                        <TableCell>{line.transferred_quantity}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[line.status] || ''}>
                            {statusLabels[line.status]?.[language] || line.status}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            {selectedCrossDock.status === 'in_progress' && line.transferred_quantity < line.quantity && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const remaining = line.quantity - line.transferred_quantity;
                                  const qty = prompt(
                                    language === 'ar' ? `أدخل الكمية للنقل (المتبقي: ${remaining})` : `Enter quantity to transfer (Remaining: ${remaining})`,
                                    String(remaining)
                                  );
                                  if (qty) transferItem(line.id, parseFloat(qty));
                                }}
                              >
                                <Package className="w-4 h-4 me-1" />
                                {language === 'ar' ? 'نقل' : 'Transfer'}
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Complete Action */}
                {canManage && selectedCrossDock.status === 'in_progress' && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={() => completeCrossDock(selectedCrossDock.id)}>
                      <CheckCircle className="w-4 h-4 me-2" />
                      {language === 'ar' ? 'إتمام العملية' : 'Complete Operation'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
