import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, DollarSign, FileText, TrendingUp, Clock } from 'lucide-react';
import { toGregorianDate } from '@/utils/dateUtils';

interface ItemDetails {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  start_date: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  estimated_cost: number | null;
  notes: string | null;
  active: boolean;
  asset: { name: string } | null;
  vendor: { name: string } | null;
}

interface MaintenanceHistory {
  id: string;
  year: number;
  month: number;
  status: string;
  scheduled_date: string;
  executed_date: string | null;
  actual_cost: number | null;
  notes: string | null;
}

const FREQUENCIES: Record<string, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  semiannual: 'نصف سنوي',
  annual: 'سنوي',
  ad_hoc: 'عند الحاجة',
};

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export default function MaintenanceItemDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ItemDetails | null>(null);
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadItemDetails();
    }
  }, [id]);

  const loadItemDetails = async () => {
    try {
      const { data: itemData, error: itemError } = await supabase
        .from('maintenance_items')
        .select(`
          *,
          asset:maintenance_assets(name),
          vendor:maintenance_vendors(name)
        `)
        .eq('id', id)
        .single();

      if (itemError) throw itemError;

      const { data: historyData, error: historyError } = await supabase
        .from('maintenance_schedule')
        .select('*')
        .eq('maintenance_item_id', id)
        .eq('status', 'done')
        .order('executed_date', { ascending: false });

      if (historyError) throw historyError;

      setItem(itemData);
      setHistory(historyData || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">جاري التحميل...</div>
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">البند غير موجود</div>
        </main>
      </div>
    );
  }

  const totalCost = history.reduce((sum, h) => sum + (h.actual_cost || 0), 0);
  const avgCost = history.length > 0 ? totalCost / history.length : 0;
  const completionRate = history.length;

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/maintenance')} className="mb-4">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2 gradient-text">{item.name}</h1>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
            <Badge variant={item.active ? 'default' : 'secondary'}>
              {item.active ? 'نشط' : 'غير نشط'}
            </Badge>
          </div>
        </div>

        {/* معلومات عامة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="glass-card border-border/50 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">التكرار</span>
            </div>
            <div className="text-2xl font-bold">{FREQUENCIES[item.frequency]}</div>
          </Card>

          <Card className="glass-card border-border/50 p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">التكلفة المقدرة</span>
            </div>
            <div className="text-2xl font-bold">
              {item.estimated_cost ? `${item.estimated_cost.toFixed(2)} ريال` : '-'}
            </div>
          </Card>

          <Card className="glass-card border-border/50 p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">متوسط التكلفة الفعلية</span>
            </div>
            <div className="text-2xl font-bold">{avgCost.toFixed(2)} ريال</div>
          </Card>

          <Card className="glass-card border-border/50 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">عدد مرات التنفيذ</span>
            </div>
            <div className="text-2xl font-bold">{completionRate}</div>
          </Card>
        </div>

        {/* تفاصيل إضافية */}
        <Card className="glass-card border-border/50 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">تفاصيل البند</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">تاريخ البداية:</span>
              <p className="font-medium">{toGregorianDate(item.start_date)}</p>
            </div>
            {item.last_maintenance_date && (
              <div>
                <span className="text-sm text-muted-foreground">آخر صيانة:</span>
                <p className="font-medium">{toGregorianDate(item.last_maintenance_date)}</p>
              </div>
            )}
            {item.next_maintenance_date && (
              <div>
                <span className="text-sm text-muted-foreground">الصيانة القادمة:</span>
                <p className="font-medium">{toGregorianDate(item.next_maintenance_date)}</p>
              </div>
            )}
            {item.asset && (
              <div>
                <span className="text-sm text-muted-foreground">الأصل المرتبط:</span>
                <p className="font-medium">{item.asset.name}</p>
              </div>
            )}
            {item.vendor && (
              <div>
                <span className="text-sm text-muted-foreground">الجهة المنفذة:</span>
                <p className="font-medium">{item.vendor.name}</p>
              </div>
            )}
            {item.notes && (
              <div className="md:col-span-2">
                <span className="text-sm text-muted-foreground">ملاحظات:</span>
                <p className="font-medium">{item.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* سجل التنفيذ */}
        <Card className="glass-card border-border/50 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            سجل التنفيذ الكامل
          </h2>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>الشهر</TableHead>
                <TableHead>التكلفة الفعلية</TableHead>
                <TableHead>ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    لا يوجد سجل تنفيذ
                  </TableCell>
                </TableRow>
              ) : (
                history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.executed_date ? toGregorianDate(record.executed_date) : '-'}
                    </TableCell>
                    <TableCell>
                      {MONTHS[record.month - 1]} {record.year}
                    </TableCell>
                    <TableCell>
                      {record.actual_cost ? `${record.actual_cost.toFixed(2)} ريال` : '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {record.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {history.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">إجمالي التكاليف:</span>
                <span className="font-bold">{totalCost.toFixed(2)} ريال</span>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
