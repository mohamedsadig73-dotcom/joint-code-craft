import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2, ArrowLeft, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Item { id: string; part_no: string; description: string }
interface MoveRow {
  id: string;
  movement_no: string;
  movement_type: 'receipt' | 'issue' | 'transfer';
  movement_date: string;
  status: string;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  qty: number;
  unit_cost: number;
  in_qty: number;
  out_qty: number;
  warehouse_name: string;
  running: number;
}

export default function StockCard() {
  const { t, language } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>('all');
  const [itemId, setItemId] = useState<string>(params.get('item') ?? '');
  const [rows, setRows] = useState<MoveRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadRefs();
  }, []);

  useEffect(() => {
    if (itemId) void loadCard();
    else setRows([]);
  }, [itemId, warehouseId]);

  async function loadRefs() {
    const [{ data: its }, { data: whs }] = await Promise.all([
      supabase.from('items_master').select('id, part_no, description').eq('is_active', true).order('part_no').limit(1000),
      supabase.from('warehouses').select('id, name_ar, name_en'),
    ]);
    setItems((its ?? []) as any);
    setWarehouses((whs ?? []) as any);
  }

  async function loadCard() {
    setLoading(true);
    try {
      const { data: lines, error } = await supabase
        .from('stock_movement_lines')
        .select('id, qty, unit_cost, movement_id, stock_movements!inner(id, movement_no, movement_type, movement_date, status, from_warehouse_id, to_warehouse_id, created_at)')
        .eq('item_id', itemId)
        .eq('stock_movements.status', 'posted')
        .order('created_at', { foreignTable: 'stock_movements', ascending: true })
        .limit(2000);
      if (error) throw error;

      const whMap = new Map(warehouses.map((w: any) => [w.id, w]));
      const expanded: MoveRow[] = [];

      (lines ?? []).forEach((l: any) => {
        const m = l.stock_movements;
        if (!m) return;
        const qty = Number(l.qty);
        const uc = Number(l.unit_cost);
        // Receipt: +to_warehouse
        if (m.movement_type === 'receipt' && m.to_warehouse_id) {
          if (warehouseId === 'all' || m.to_warehouse_id === warehouseId) {
            const w = whMap.get(m.to_warehouse_id);
            expanded.push({
              id: l.id + ':in',
              movement_no: m.movement_no,
              movement_type: m.movement_type,
              movement_date: m.movement_date,
              status: m.status,
              from_warehouse_id: null,
              to_warehouse_id: m.to_warehouse_id,
              qty, unit_cost: uc,
              in_qty: qty, out_qty: 0,
              warehouse_name: language === 'ar' ? w?.name_ar : (w?.name_en || w?.name_ar) || '—',
              running: 0,
            });
          }
        } else if (m.movement_type === 'issue' && m.from_warehouse_id) {
          if (warehouseId === 'all' || m.from_warehouse_id === warehouseId) {
            const w = whMap.get(m.from_warehouse_id);
            expanded.push({
              id: l.id + ':out',
              movement_no: m.movement_no,
              movement_type: m.movement_type,
              movement_date: m.movement_date,
              status: m.status,
              from_warehouse_id: m.from_warehouse_id,
              to_warehouse_id: null,
              qty, unit_cost: uc,
              in_qty: 0, out_qty: qty,
              warehouse_name: language === 'ar' ? w?.name_ar : (w?.name_en || w?.name_ar) || '—',
              running: 0,
            });
          }
        } else if (m.movement_type === 'transfer') {
          if (m.from_warehouse_id && (warehouseId === 'all' || m.from_warehouse_id === warehouseId)) {
            const w = whMap.get(m.from_warehouse_id);
            expanded.push({
              id: l.id + ':tout',
              movement_no: m.movement_no,
              movement_type: m.movement_type,
              movement_date: m.movement_date,
              status: m.status,
              from_warehouse_id: m.from_warehouse_id,
              to_warehouse_id: m.to_warehouse_id,
              qty, unit_cost: uc,
              in_qty: 0, out_qty: qty,
              warehouse_name: language === 'ar' ? w?.name_ar : (w?.name_en || w?.name_ar) || '—',
              running: 0,
            });
          }
          if (m.to_warehouse_id && (warehouseId === 'all' || m.to_warehouse_id === warehouseId)) {
            const w = whMap.get(m.to_warehouse_id);
            expanded.push({
              id: l.id + ':tin',
              movement_no: m.movement_no,
              movement_type: m.movement_type,
              movement_date: m.movement_date,
              status: m.status,
              from_warehouse_id: m.from_warehouse_id,
              to_warehouse_id: m.to_warehouse_id,
              qty, unit_cost: uc,
              in_qty: qty, out_qty: 0,
              warehouse_name: language === 'ar' ? w?.name_ar : (w?.name_en || w?.name_ar) || '—',
              running: 0,
            });
          }
        }
      });

      let running = 0;
      expanded.forEach((r) => {
        running += r.in_qty - r.out_qty;
        r.running = running;
      });

      setRows(expanded);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const itemLabel = useMemo(() => {
    const i = items.find((x) => x.id === itemId);
    return i ? `${i.part_no} — ${i.description}` : '';
  }, [itemId, items]);

  const totals = useMemo(() => {
    const inQ = rows.reduce((s, r) => s + r.in_qty, 0);
    const outQ = rows.reduce((s, r) => s + r.out_qty, 0);
    return { inQ, outQ, balance: inQ - outQ };
  }, [rows]);

  function exportCsv() {
    const header = [t('movementNoCol'), t('typeCol'), t('warehouseLabel'), t('movementDate'), t('inQty'), t('outQty'), t('runningBalance')];
    const lines = [header.join(',')];
    rows.forEach((r) => {
      lines.push([
        r.movement_no,
        r.movement_type,
        `"${r.warehouse_name}"`,
        r.movement_date,
        r.in_qty,
        r.out_qty,
        r.running,
      ].join(','));
    });
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stock-card-${itemId}.csv`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('stockCard')}
          subtitle={t('stockCardDesc')}
          icon={FileText}
          actions={
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="outline" asChild>
                <Link to="/inventory/balances">
                  <ArrowLeft className="w-4 h-4 me-1.5" />
                  {t('stockBalances')}
                </Link>
              </Button>
              <Button variant="outline" onClick={() => window.print()} disabled={!rows.length}>
                <Printer className="w-4 h-4 me-1.5" />
                {t('print')}
              </Button>
              <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
                <Download className="w-4 h-4 me-1.5" />
                {t('exportCsv')}
              </Button>
            </div>
          }
        />

        <Card className="mt-4 p-3 flex flex-wrap gap-2 items-center print:hidden">
          <Select
            value={itemId || undefined}
            onValueChange={(v) => {
              setItemId(v);
              setParams({ item: v });
            }}
          >
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder={t('selectItem')} />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.part_no} — {i.description.slice(0, 60)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allWarehouses')}</SelectItem>
              {warehouses.map((w: any) => (
                <SelectItem key={w.id} value={w.id}>
                  {language === 'ar' ? w.name_ar : (w.name_en || w.name_ar)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {itemLabel && (
          <Card className="mt-4 p-4">
            <div className="text-sm text-muted-foreground">{t('itemLabel')}</div>
            <div className="text-lg font-semibold mt-0.5">{itemLabel}</div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <div className="text-xs text-muted-foreground">{t('inQty')}</div>
                <div className="text-lg font-bold text-emerald-600">{totals.inQ.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('outQty')}</div>
                <div className="text-lg font-bold text-destructive">{totals.outQ.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('runningBalance')}</div>
                <div className="text-lg font-bold">{totals.balance.toLocaleString()}</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="mt-4 overflow-hidden">
          {!itemId ? (
            <div className="py-16 text-center text-muted-foreground">{t('selectItemFirst')}</div>
          ) : loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">{t('noMovementsForItem')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('movementDate')}</TableHead>
                  <TableHead>{t('movementNoCol')}</TableHead>
                  <TableHead>{t('typeCol')}</TableHead>
                  <TableHead>{t('warehouseLabel')}</TableHead>
                  <TableHead className="text-end">{t('inQty')}</TableHead>
                  <TableHead className="text-end">{t('outQty')}</TableHead>
                  <TableHead className="text-end">{t('runningBalance')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{format(new Date(r.movement_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link to={`/inventory/movements/${r.id.split(':')[0].split('-')[0] || ''}`} className="text-primary hover:underline">
                        {r.movement_no}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(r.movement_type as any)}</Badge>
                    </TableCell>
                    <TableCell>{r.warehouse_name}</TableCell>
                    <TableCell className="text-end text-emerald-600 font-medium">
                      {r.in_qty ? r.in_qty.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-end text-destructive font-medium">
                      {r.out_qty ? r.out_qty.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-end font-bold">{r.running.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>
    </div>
  );
}