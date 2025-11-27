import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Calendar, Check, X, Clock, AlertCircle } from 'lucide-react';

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const STATUS_COLORS = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-700 dark:text-yellow-300', icon: Clock },
  done: { bg: 'bg-green-500/20', text: 'text-green-700 dark:text-green-300', icon: Check },
  not_required: { bg: 'bg-gray-500/20', text: 'text-gray-700 dark:text-gray-300', icon: X },
  overdue: { bg: 'bg-red-500/20', text: 'text-red-700 dark:text-red-300', icon: AlertCircle },
};

interface ScheduleEntry {
  id: string;
  maintenance_item_id: string;
  year: number;
  month: number;
  status: 'pending' | 'done' | 'not_required' | 'overdue';
  scheduled_date: string;
  executed_date: string | null;
  notes: string | null;
  actual_cost: number | null;
}

interface MaintenanceItem {
  id: string;
  name: string;
  frequency: string;
}

export function AnnualSchedule() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [schedule, setSchedule] = useState<Record<string, ScheduleEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<ScheduleEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState<{
    status: 'pending' | 'done' | 'not_required' | 'overdue';
    executed_date: string;
    notes: string;
    actual_cost: string;
  }>({
    status: 'pending',
    executed_date: '',
    notes: '',
    actual_cost: '',
  });

  useEffect(() => {
    loadSchedule();
  }, [selectedYear]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      
      const [itemsRes, scheduleRes] = await Promise.all([
        supabase
          .from('maintenance_items')
          .select('id, name, frequency')
          .eq('active', true)
          .order('name'),
        supabase
          .from('maintenance_schedule')
          .select('*')
          .eq('year', selectedYear)
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (scheduleRes.error) throw scheduleRes.error;

      setItems(itemsRes.data || []);
      
      // تنظيم الجدول حسب البند
      const scheduleByItem: Record<string, ScheduleEntry[]> = {};
      (scheduleRes.data || []).forEach((entry: ScheduleEntry) => {
        if (!scheduleByItem[entry.maintenance_item_id]) {
          scheduleByItem[entry.maintenance_item_id] = [];
        }
        scheduleByItem[entry.maintenance_item_id].push(entry);
      });
      
      setSchedule(scheduleByItem);
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

  const handleCellClick = (itemId: string, month: number) => {
    const itemSchedule = schedule[itemId] || [];
    const entry = itemSchedule.find(e => e.month === month);
    
    if (entry) {
      setSelectedCell(entry);
      setUpdateData({
        status: entry.status,
        executed_date: entry.executed_date || '',
        notes: entry.notes || '',
        actual_cost: entry.actual_cost?.toString() || '',
      });
      setDialogOpen(true);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCell) return;

    try {
      const { error } = await supabase
        .from('maintenance_schedule')
        .update({
          status: updateData.status,
          executed_date: updateData.executed_date || null,
          notes: updateData.notes || null,
          actual_cost: updateData.actual_cost ? parseFloat(updateData.actual_cost) : null,
        })
        .eq('id', selectedCell.id);

      if (error) throw error;

      toast({ title: 'تم تحديث الحالة بنجاح' });
      setDialogOpen(false);
      loadSchedule();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const generateScheduleForYear = async () => {
    if (!window.confirm(`هل تريد توليد جدول الصيانة لعام ${selectedYear}؟`)) return;

    try {
      for (const item of items) {
        const { error } = await supabase.rpc('generate_maintenance_schedule', {
          _item_id: item.id,
          _year: selectedYear,
        });
        
        if (error) throw error;
      }

      toast({ title: 'تم توليد الجدول السنوي بنجاح' });
      loadSchedule();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getCellStatus = (itemId: string, month: number) => {
    const itemSchedule = schedule[itemId] || [];
    const entry = itemSchedule.find(e => e.month === month);
    return entry?.status || 'not_required';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">الجدول السنوي للصيانة</h2>
          <p className="text-muted-foreground">متابعة تنفيذ الصيانة الدورية</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={generateScheduleForYear} variant="outline">
            <Calendar className="w-4 h-4 ml-2" />
            توليد الجدول
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([status, config]) => {
          const Icon = config.icon;
          return (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${config.bg}`} />
              <span className="text-sm">
                {status === 'pending' && 'مطلوب'}
                {status === 'done' && 'تم'}
                {status === 'not_required' && 'غير مطلوب'}
                {status === 'overdue' && 'متأخر'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-right font-semibold sticky right-0 bg-muted/50 min-w-[200px]">
                بند الصيانة
              </th>
              {MONTHS.map((month, idx) => (
                <th key={idx} className="p-4 text-center font-semibold min-w-[100px]">
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} className="text-center py-8">
                  جاري التحميل...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-8">
                  لا توجد بنود صيانة
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="p-4 font-medium sticky right-0 bg-background">
                    {item.name}
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
                    const status = getCellStatus(item.id, month);
                    const config = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
                    const Icon = config.icon;
                    
                    return (
                      <td
                        key={month}
                        className={`p-4 text-center cursor-pointer hover:opacity-80 ${config.bg}`}
                        onClick={() => handleCellClick(item.id, month)}
                      >
                        <Icon className={`w-5 h-5 mx-auto ${config.text}`} />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث حالة الصيانة</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select 
                value={updateData.status} 
                onValueChange={(val) => setUpdateData({ 
                  ...updateData, 
                  status: val as 'pending' | 'done' | 'not_required' | 'overdue'
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">مطلوب</SelectItem>
                  <SelectItem value="done">تم</SelectItem>
                  <SelectItem value="not_required">غير مطلوب</SelectItem>
                  <SelectItem value="overdue">متأخر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {updateData.status === 'done' && (
              <>
                <div className="space-y-2">
                  <Label>تاريخ التنفيذ</Label>
                  <Input
                    type="date"
                    value={updateData.executed_date}
                    onChange={(e) => setUpdateData({ ...updateData, executed_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>التكلفة الفعلية</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={updateData.actual_cost}
                    onChange={(e) => setUpdateData({ ...updateData, actual_cost: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={updateData.notes}
                onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleUpdate}>
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
