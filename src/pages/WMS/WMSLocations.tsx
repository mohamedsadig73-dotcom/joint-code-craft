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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Plus, Search, Edit, Trash2 } from 'lucide-react';

interface Location {
  id: string;
  code: string;
  zone: string;
  aisle: string | null;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
  location_type: string;
  is_active: boolean;
  temperature_zone: string | null;
  notes: string | null;
}

const locationTypes = [
  { value: 'storage', label: { ar: 'تخزين', en: 'Storage' } },
  { value: 'receiving', label: { ar: 'استلام', en: 'Receiving' } },
  { value: 'shipping', label: { ar: 'شحن', en: 'Shipping' } },
  { value: 'staging', label: { ar: 'تجهيز', en: 'Staging' } },
  { value: 'quarantine', label: { ar: 'حجر', en: 'Quarantine' } },
];

const temperatureZones = [
  { value: 'ambient', label: { ar: 'عادي', en: 'Ambient' } },
  { value: 'cold', label: { ar: 'مبرد', en: 'Cold' } },
  { value: 'frozen', label: { ar: 'مجمد', en: 'Frozen' } },
];

export default function WMSLocations() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    zone: '',
    aisle: '',
    rack: '',
    shelf: '',
    bin: '',
    location_type: 'storage',
    temperature_zone: '',
    is_active: true,
    notes: '',
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('wms_locations')
        .select('*')
        .order('code');

      if (error) throw error;
      setLocations(data || []);
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

  const handleSubmit = async () => {
    if (!formData.code || !formData.zone) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields',
      });
      return;
    }

    setSaving(true);
    try {
      const locationData = {
        code: formData.code,
        zone: formData.zone,
        aisle: formData.aisle || null,
        rack: formData.rack || null,
        shelf: formData.shelf || null,
        bin: formData.bin || null,
        location_type: formData.location_type,
        temperature_zone: formData.temperature_zone || null,
        is_active: formData.is_active,
        notes: formData.notes || null,
      };

      if (editingLocation) {
        const { error } = await supabase
          .from('wms_locations')
          .update(locationData)
          .eq('id', editingLocation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wms_locations')
          .insert(locationData);
        if (error) throw error;
      }

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: editingLocation 
          ? (language === 'ar' ? 'تم تحديث الموقع' : 'Location updated')
          : (language === 'ar' ? 'تم إضافة الموقع' : 'Location added'),
      });

      setIsDialogOpen(false);
      resetForm();
      loadLocations();
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

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الموقع؟' : 'Are you sure you want to delete this location?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('wms_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف الموقع بنجاح' : 'Location deleted successfully',
      });

      loadLocations();
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
      code: '',
      zone: '',
      aisle: '',
      rack: '',
      shelf: '',
      bin: '',
      location_type: 'storage',
      temperature_zone: '',
      is_active: true,
      notes: '',
    });
    setEditingLocation(null);
  };

  const openEditDialog = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      code: location.code,
      zone: location.zone,
      aisle: location.aisle || '',
      rack: location.rack || '',
      shelf: location.shelf || '',
      bin: location.bin || '',
      location_type: location.location_type,
      temperature_zone: location.temperature_zone || '',
      is_active: location.is_active,
      notes: location.notes || '',
    });
    setIsDialogOpen(true);
  };

  const filteredLocations = locations.filter(location =>
    location.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.zone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  // Group locations by zone
  const groupedLocations = filteredLocations.reduce((acc, location) => {
    const zone = location.zone;
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(location);
    return acc;
  }, {} as Record<string, Location[]>);

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="w-6 h-6" />
              {language === 'ar' ? 'إدارة المواقع' : 'Location Management'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'تعريف مواقع التخزين في المخزن' : 'Define storage locations in the warehouse'}
            </p>
          </div>

          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {language === 'ar' ? 'إضافة موقع' : 'Add Location'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingLocation 
                      ? (language === 'ar' ? 'تعديل الموقع' : 'Edit Location')
                      : (language === 'ar' ? 'إضافة موقع جديد' : 'Add New Location')
                    }
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'كود الموقع' : 'Location Code'} *</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="A-01-01-01"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'المنطقة' : 'Zone'} *</Label>
                    <Input
                      value={formData.zone}
                      onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                      placeholder="Zone-A"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الممر' : 'Aisle'}</Label>
                    <Input
                      value={formData.aisle}
                      onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الرف' : 'Rack'}</Label>
                    <Input
                      value={formData.rack}
                      onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الطابق' : 'Shelf'}</Label>
                    <Input
                      value={formData.shelf}
                      onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الخانة' : 'Bin'}</Label>
                    <Input
                      value={formData.bin}
                      onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'نوع الموقع' : 'Location Type'}</Label>
                    <Select
                      value={formData.location_type}
                      onValueChange={(value) => setFormData({ ...formData, location_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label[language]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'منطقة الحرارة' : 'Temperature Zone'}</Label>
                    <Select
                      value={formData.temperature_zone}
                      onValueChange={(value) => setFormData({ ...formData, temperature_zone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر...' : 'Select...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {temperatureZones.map((zone) => (
                          <SelectItem key={zone.value} value={zone.value}>
                            {zone.label[language]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <Checkbox
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                    />
                    <Label htmlFor="is_active">
                      {language === 'ar' ? 'موقع نشط' : 'Active Location'}
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving 
                      ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                      : (language === 'ar' ? 'حفظ' : 'Save')
                    }
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'بحث بالكود أو المنطقة...' : 'Search by code or zone...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
        </div>

        {/* Locations Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد مواقع' : 'No locations found'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المنطقة' : 'Zone'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الموقع' : 'Position'}</TableHead>
                    <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحرارة' : 'Temp'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    {canManage && <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-mono font-medium">{location.code}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{location.zone}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {[location.aisle, location.rack, location.shelf, location.bin]
                          .filter(Boolean)
                          .join(' / ') || '-'}
                      </TableCell>
                      <TableCell>
                        {locationTypes.find(t => t.value === location.location_type)?.label[language] || location.location_type}
                      </TableCell>
                      <TableCell>
                        {location.temperature_zone ? (
                          <Badge variant="secondary">
                            {temperatureZones.find(z => z.value === location.temperature_zone)?.label[language] || location.temperature_zone}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={location.is_active ? 'default' : 'secondary'}>
                          {location.is_active 
                            ? (language === 'ar' ? 'نشط' : 'Active')
                            : (language === 'ar' ? 'غير نشط' : 'Inactive')
                          }
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(location)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(location.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
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
