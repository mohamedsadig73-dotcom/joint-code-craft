import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Package, Plus, Search, Edit, Trash2, Barcode } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  name_en: string | null;
  description: string | null;
  category: string | null;
  unit_of_measure: string;
  weight: number | null;
  min_stock_level: number | null;
  requires_lot_tracking: boolean;
  requires_expiry_tracking: boolean;
  is_active: boolean;
  created_at: string;
}

const unitOptions = [
  { value: 'piece', label: { ar: 'قطعة', en: 'Piece' } },
  { value: 'kg', label: { ar: 'كيلوغرام', en: 'Kilogram' } },
  { value: 'box', label: { ar: 'صندوق', en: 'Box' } },
  { value: 'pallet', label: { ar: 'منصة نقالة', en: 'Pallet' } },
  { value: 'liter', label: { ar: 'لتر', en: 'Liter' } },
  { value: 'meter', label: { ar: 'متر', en: 'Meter' } },
];

export default function WMSProducts() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    name_en: '',
    description: '',
    category: '',
    unit_of_measure: 'piece',
    weight: '',
    min_stock_level: '',
    requires_lot_tracking: false,
    requires_expiry_tracking: false,
    is_active: true,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('wms_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
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
    if (!formData.sku || !formData.name) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields',
      });
      return;
    }

    setSaving(true);
    try {
      const productData = {
        sku: formData.sku,
        barcode: formData.barcode || null,
        name: formData.name,
        name_en: formData.name_en || null,
        description: formData.description || null,
        category: formData.category || null,
        unit_of_measure: formData.unit_of_measure,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        min_stock_level: formData.min_stock_level ? parseFloat(formData.min_stock_level) : null,
        requires_lot_tracking: formData.requires_lot_tracking,
        requires_expiry_tracking: formData.requires_expiry_tracking,
        is_active: formData.is_active,
        created_by: user?.id,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('wms_products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wms_products')
          .insert(productData);
        if (error) throw error;
      }

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: editingProduct 
          ? (language === 'ar' ? 'تم تحديث المنتج' : 'Product updated')
          : (language === 'ar' ? 'تم إضافة المنتج' : 'Product added'),
      });

      setIsDialogOpen(false);
      resetForm();
      loadProducts();
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
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المنتج؟' : 'Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('wms_products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف المنتج بنجاح' : 'Product deleted successfully',
      });

      loadProducts();
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
      sku: '',
      barcode: '',
      name: '',
      name_en: '',
      description: '',
      category: '',
      unit_of_measure: 'piece',
      weight: '',
      min_stock_level: '',
      requires_lot_tracking: false,
      requires_expiry_tracking: false,
      is_active: true,
    });
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      barcode: product.barcode || '',
      name: product.name,
      name_en: product.name_en || '',
      description: product.description || '',
      category: product.category || '',
      unit_of_measure: product.unit_of_measure,
      weight: product.weight?.toString() || '',
      min_stock_level: product.min_stock_level?.toString() || '',
      requires_lot_tracking: product.requires_lot_tracking,
      requires_expiry_tracking: product.requires_expiry_tracking,
      is_active: product.is_active,
    });
    setIsDialogOpen(true);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchQuery))
  );

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
              <Package className="w-6 h-6" />
              {language === 'ar' ? 'إدارة المنتجات' : 'Product Management'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إضافة وتعديل المنتجات في النظام' : 'Add and edit products in the system'}
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
                  {language === 'ar' ? 'إضافة منتج' : 'Add Product'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct 
                      ? (language === 'ar' ? 'تعديل المنتج' : 'Edit Product')
                      : (language === 'ar' ? 'إضافة منتج جديد' : 'Add New Product')
                    }
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'رمز المنتج (SKU)' : 'SKU'} *</Label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="PRD-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الباركود' : 'Barcode'}</Label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="ps-10"
                        placeholder="123456789"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'اسم المنتج (عربي)' : 'Product Name (Arabic)'} *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'اسم المنتج (إنجليزي)' : 'Product Name (English)'}</Label>
                    <Input
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'التصنيف' : 'Category'}</Label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'وحدة القياس' : 'Unit of Measure'}</Label>
                    <Select
                      value={formData.unit_of_measure}
                      onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label[language]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الوزن (كجم)' : 'Weight (kg)'}</Label>
                    <Input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الحد الأدنى للمخزون' : 'Min Stock Level'}</Label>
                    <Input
                      type="number"
                      value={formData.min_stock_level}
                      onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="lot_tracking"
                        checked={formData.requires_lot_tracking}
                        onCheckedChange={(checked) => setFormData({ ...formData, requires_lot_tracking: !!checked })}
                      />
                      <Label htmlFor="lot_tracking">
                        {language === 'ar' ? 'يتطلب تتبع الدفعات (Lot)' : 'Requires Lot Tracking'}
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="expiry_tracking"
                        checked={formData.requires_expiry_tracking}
                        onCheckedChange={(checked) => setFormData({ ...formData, requires_expiry_tracking: !!checked })}
                      />
                      <Label htmlFor="expiry_tracking">
                        {language === 'ar' ? 'يتطلب تتبع تاريخ الانتهاء' : 'Requires Expiry Tracking'}
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                      />
                      <Label htmlFor="is_active">
                        {language === 'ar' ? 'منتج نشط' : 'Active Product'}
                      </Label>
                    </div>
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
              placeholder={language === 'ar' ? 'بحث بالاسم أو SKU أو الباركود...' : 'Search by name, SKU, or barcode...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
        </div>

        {/* Products Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد منتجات' : 'No products found'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'SKU' : 'SKU'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{language === 'ar' ? 'التصنيف' : 'Category'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الوحدة' : 'Unit'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    {canManage && <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.sku}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.barcode && (
                            <p className="text-xs text-muted-foreground">{product.barcode}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{product.category || '-'}</TableCell>
                      <TableCell>
                        {unitOptions.find(u => u.value === product.unit_of_measure)?.label[language] || product.unit_of_measure}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active 
                            ? (language === 'ar' ? 'نشط' : 'Active')
                            : (language === 'ar' ? 'غير نشط' : 'Inactive')
                          }
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(product)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
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
