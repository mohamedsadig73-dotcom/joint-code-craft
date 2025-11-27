import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Calendar, DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const FREQUENCIES = [
  { value: 'monthly', label: 'شهري' },
  { value: 'quarterly', label: 'ربع سنوي' },
  { value: 'semiannual', label: 'نصف سنوي' },
  { value: 'annual', label: 'سنوي' },
  { value: 'ad_hoc', label: 'عند الحاجة' },
];

interface MaintenanceItem {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  start_date: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  estimated_cost: number | null;
  reminder_days: number;
  notes: string | null;
  active: boolean;
  asset_id: string | null;
  vendor_id: string | null;
}

interface Asset {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
}

export function MaintenanceItems() {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaintenanceItem | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    frequency: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'ad_hoc';
    start_date: string;
    estimated_cost: string;
    reminder_days: string;
    notes: string;
    active: boolean;
    asset_id: string;
    vendor_id: string;
  }>({
    name: '',
    description: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    estimated_cost: '',
    reminder_days: '7',
    notes: '',
    active: true,
    asset_id: '',
    vendor_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [itemsRes, assetsRes, vendorsRes] = await Promise.all([
        supabase.from('maintenance_items').select('*').order('name'),
        supabase.from('maintenance_assets').select('id, name').eq('active', true),
        supabase.from('maintenance_vendors').select('id, name').eq('active', true),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (assetsRes.error) throw assetsRes.error;
      if (vendorsRes.error) throw vendorsRes.error;

      setItems(itemsRes.data || []);
      setAssets(assetsRes.data || []);
      setVendors(vendorsRes.data || []);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        reminder_days: parseInt(formData.reminder_days),
        asset_id: formData.asset_id || null,
        vendor_id: formData.vendor_id || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('maintenance_items')
          .update(submitData)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: 'تم تحديث البند بنجاح' });
      } else {
        const { data: newItem, error } = await supabase
          .from('maintenance_items')
          .insert([submitData])
          .select()
          .single();
        
        if (error) throw error;
        
        // توليد الجدول السنوي للبند الجديد
        const currentYear = new Date().getFullYear();
        const { error: scheduleError } = await supabase
          .rpc('generate_maintenance_schedule', {
            _item_id: newItem.id,
            _year: currentYear,
          });
        
        if (scheduleError) throw scheduleError;
        toast({ title: 'تم إضافة البند وتوليد الجدول السنوي بنجاح' });
      }
      
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا البند؟ سيتم حذف جميع الجداول المرتبطة به.')) return;
    
    try {
      const { error } = await supabase
        .from('maintenance_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'تم حذف البند بنجاح' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: MaintenanceItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      frequency: item.frequency as 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'ad_hoc',
      start_date: item.start_date,
      estimated_cost: item.estimated_cost?.toString() || '',
      reminder_days: item.reminder_days.toString(),
      notes: item.notes || '',
      active: item.active ?? true,
      asset_id: item.asset_id || '',
      vendor_id: item.vendor_id || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      estimated_cost: '',
      reminder_days: '7',
      notes: '',
      active: true,
      asset_id: '',
      vendor_id: '',
    });
  };

  const getFrequencyLabel = (freq: string) => {
    return FREQUENCIES.find(f => f.value === freq)?.label || freq;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">إدارة بنود الصيانة</h2>
          <p className="text-muted-foreground">تحديد المهام الدورية والمتطلبات</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة بند جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'تعديل بند الصيانة' : 'إضافة بند صيانة جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">اسم البند *</Label>
                  <Input
                    id="name"
                    required
                    placeholder="مثال: صيانة مكيف الهواء - الطابق الأول"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asset_id">الأصل المرتبط</Label>
                  <Select value={formData.asset_id} onValueChange={(value) => setFormData({ ...formData, asset_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الأصل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون أصل</SelectItem>
                      {assets.map(asset => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor_id">الجهة المنفذة</Label>
                  <Select value={formData.vendor_id} onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المورد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون مورد</SelectItem>
                      {vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">التكرار *</Label>
                  <Select 
                    value={formData.frequency} 
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      frequency: value as 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'ad_hoc'
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map(freq => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_date">تاريخ البداية *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_cost">التكلفة المقدرة</Label>
                  <Input
                    id="estimated_cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminder_days">التذكير قبل (أيام)</Label>
                  <Input
                    id="reminder_days"
                    type="number"
                    min="1"
                    value={formData.reminder_days}
                    onChange={(e) => setFormData({ ...formData, reminder_days: e.target.value })}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active">بند نشط</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit">
                  {editingItem ? 'تحديث' : 'إضافة'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم البند</TableHead>
              <TableHead>التكرار</TableHead>
              <TableHead>آخر صيانة</TableHead>
              <TableHead>الصيانة القادمة</TableHead>
              <TableHead>التكلفة المقدرة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  لا توجد بنود صيانة مسجلة
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getFrequencyLabel(item.frequency)}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.last_maintenance_date ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.last_maintenance_date).toLocaleDateString('ar-SA')}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {item.next_maintenance_date ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.next_maintenance_date).toLocaleDateString('ar-SA')}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {item.estimated_cost ? (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {item.estimated_cost.toFixed(2)}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.active ? 'default' : 'secondary'}>
                      {item.active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
