import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardCheck, Plus, Trash2, Save, Loader2, Download as DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Warehouse { id: string; code: string; name_ar: string; name_en: string | null; }
interface Item { id: string; part_no: string; description: string | null; }

interface Line {
  key: string;
  item_id: string;
  book_qty: string;
  counted_qty: string;
  unit_cost: string;
  remarks: string;
}

const newLine = (): Line => ({
  key: crypto.randomUUID(),
  item_id: '',
  book_qty: '0',
  counted_qty: '',
  unit_cost: '0',
  remarks: '',
});

export default function NewStockCount() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const [w, i] = await Promise.all([
        supabase.from('warehouses').select('id,code,name_ar,name_en').eq('is_active', true).order('code'),
        supabase.from('items_master').select('id,part_no,description').order('part_no').limit(5000),
      ]);
      if (w.data) setWarehouses(w.data as Warehouse[]);
      if (i.data) setItems(i.data as Item[]);
    })();
  }, []);

  const totals = useMemo(() => {
    let variance = 0;
    let varianceValue = 0;
    lines.forEach((l) => {
      const b = parseFloat(l.book_qty || '0') || 0;
      const c = parseFloat(l.counted_qty || '0') || 0;
      const cost = parseFloat(l.unit_cost || '0') || 0;
      const v = c - b;
      variance += Math.abs(v);
      varianceValue += Math.abs(v) * cost;
    });
    return { variance, varianceValue };
  }, [lines]);

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const loadBalancesForWarehouse = async () => {
    if (!warehouseId) {
      toast.error(t('errToWarehouseRequired'));
      return;
    }
    setLoadingBalances(true);
    try {
      const { data, error } = await supabase
        .from('stock_balances')
        .select('item_id, qty_on_hand, avg_cost')
        .eq('warehouse_id', warehouseId)
        .gt('qty_on_hand', 0)
        .limit(5000);
      if (error) throw error;
      const newLines: Line[] = (data ?? []).map((b: any) => ({
        key: crypto.randomUUID(),
        item_id: b.item_id,
        book_qty: String(b.qty_on_hand),
        counted_qty: String(b.qty_on_hand),
        unit_cost: String(b.avg_cost ?? 0),
        remarks: '',
      }));
      if (newLines.length === 0) {
        toast.warning(t('noStockData'));
        return;
      }
      setLines(newLines);
      toast.success(`${newLines.length} ${t('itemLabel')}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingBalances(false);
    }
  };

  const handleSave = async () => {
    if (!warehouseId) {
      toast.error(t('errToWarehouseRequired'));
      return;
    }
    const validLines = lines.filter((l) => l.item_id);
    if (validLines.length === 0) {
      toast.error(t('errAtLeastOneLine'));
      return;
    }
    setSaving(true);
    try {
      const { data: count, error } = await supabase
        .from('stock_counts')
        .insert({
          count_date: date,
          warehouse_id: warehouseId,
          status: 'draft',
          notes: notes || null,
          created_by: user?.id ?? null,
        } as any)
        .select('id, count_no')
        .single();
      if (error) throw error;

      const linesPayload = validLines.map((l, idx) => ({
        count_id: count.id,
        line_no: idx + 1,
        item_id: l.item_id,
        book_qty: parseFloat(l.book_qty || '0') || 0,
        counted_qty: parseFloat(l.counted_qty || '0') || 0,
        unit_cost: parseFloat(l.unit_cost || '0') || 0,
        remarks: l.remarks || null,
      }));
      const { error: lErr } = await supabase.from('stock_count_lines').insert(linesPayload);
      if (lErr) throw lErr;

      toast.success(t('countSavedSuccess'));
      navigate(`/inventory/counts/${count.id}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 py-12 text-center text-muted-foreground">
          {t('noPermission')}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('newStockCount')}
          subtitle={t('stockCountsDesc')}
          icon={ClipboardCheck}
          actions={
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" /> : <Save className="w-4 h-4 me-1.5" />}
              {t('saveCount')}
            </Button>
          }
        />

        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>{t('countDate')}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('warehouseLabel')}</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder={t('selectWarehouse')} /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code} — {language === 'ar' ? w.name_ar : (w.name_en || w.name_ar)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={loadBalancesForWarehouse}
                disabled={loadingBalances || !warehouseId}
                className="w-full"
              >
                {loadingBalances ? (
                  <Loader2 className="w-4 h-4 me-1.5 animate-spin" />
                ) : (
                  <DownloadIcon className="w-4 h-4 me-1.5" />
                )}
                {t('loadBalances')}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('remarks')}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </Card>

        <Card className="p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{t('movementLines')}</h3>
            <Button size="sm" variant="outline" onClick={() => setLines((p) => [...p, newLine()])}>
              <Plus className="w-4 h-4 me-1.5" />
              {t('addCountLine')}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('itemLabel')}</TableHead>
                  <TableHead className="w-28 text-end">{t('bookQty')}</TableHead>
                  <TableHead className="w-28 text-end">{t('countedQty')}</TableHead>
                  <TableHead className="w-28 text-end">{t('varianceQty')}</TableHead>
                  <TableHead className="w-28 text-end">{t('unitCost')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l, idx) => {
                  const b = parseFloat(l.book_qty || '0') || 0;
                  const c = parseFloat(l.counted_qty || '0') || 0;
                  const v = c - b;
                  return (
                    <TableRow key={l.key}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <Select value={l.item_id} onValueChange={(val) => updateLine(l.key, { item_id: val })}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={t('selectItem')} />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((it) => (
                              <SelectItem key={it.id} value={it.id}>
                                {it.part_no} {it.description ? `— ${it.description}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.001"
                          value={l.book_qty}
                          onChange={(e) => updateLine(l.key, { book_qty: e.target.value })}
                          className="h-9 text-end"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.001"
                          value={l.counted_qty}
                          onChange={(e) => updateLine(l.key, { counted_qty: e.target.value })}
                          className="h-9 text-end"
                        />
                      </TableCell>
                      <TableCell
                        className={`text-end tabular-nums font-medium ${
                          v > 0 ? 'text-green-600' : v < 0 ? 'text-amber-600' : ''
                        }`}
                      >
                        {v.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.0001"
                          value={l.unit_cost}
                          onChange={(e) => updateLine(l.key, { unit_cost: e.target.value })}
                          className="h-9 text-end"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeLine(l.key)}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 justify-end text-sm">
            <div>
              <span className="text-muted-foreground me-2">{t('varianceQty')}:</span>
              <span className="font-bold tabular-nums">{totals.variance.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground me-2">{t('varianceValue')}:</span>
              <span className="font-bold tabular-nums">{totals.varianceValue.toFixed(2)}</span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}