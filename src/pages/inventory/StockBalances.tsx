import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { BarChart3, Loader2, Search, Download, FileText, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface BalanceRow {
  id: string;
  warehouse_id: string;
  item_id: string;
  qty_on_hand: number;
  avg_cost: number;
  last_movement_at: string | null;
  warehouse_name: string;
  item_part: string;
  item_desc: string;
  min_qty: number;
}

export default function StockBalances() {
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name_ar: string; name_en: string | null }[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [{ data: balances, error: bErr }, { data: whs }, { data: items }] = await Promise.all([
        supabase.from('stock_balances').select('*').order('updated_at', { ascending: false }).limit(2000),
        supabase.from('warehouses').select('id, name_ar, name_en'),
        supabase.from('items_master').select('id, part_no, description, min_qty'),
      ]);
      if (bErr) throw bErr;
      const whMap = new Map((whs ?? []).map((w: any) => [w.id, w]));
      const itemMap = new Map((items ?? []).map((i: any) => [i.id, i]));
      const enriched: BalanceRow[] = (balances ?? []).map((b: any) => {
        const w = whMap.get(b.warehouse_id);
        const i = itemMap.get(b.item_id);
        return {
          id: b.id,
          warehouse_id: b.warehouse_id,
          item_id: b.item_id,
          qty_on_hand: Number(b.qty_on_hand),
          avg_cost: Number(b.avg_cost),
          last_movement_at: b.last_movement_at,
          warehouse_name: (language === 'ar' ? w?.name_ar : w?.name_en || w?.name_ar) ?? '—',
          item_part: i?.part_no ?? '—',
          item_desc: i?.description ?? '—',
          min_qty: Number(i?.min_qty ?? 0),
        };
      });
      setWarehouses((whs ?? []) as any);
      setRows(enriched);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (warehouseId !== 'all' && r.warehouse_id !== warehouseId) return false;
      if (q && !`${r.item_part} ${r.item_desc} ${r.warehouse_name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, warehouseId, search]);

  const totals = useMemo(() => {
    const totalQty = filtered.reduce((s, r) => s + r.qty_on_hand, 0);
    const totalValue = filtered.reduce((s, r) => s + r.qty_on_hand * r.avg_cost, 0);
    return { count: filtered.length, totalQty, totalValue };
  }, [filtered]);

  function exportCsv() {
    const header = [
      t('warehouseLabel'),
      'Part No',
      t('description'),
      t('qtyOnHand'),
      t('avgCostCol'),
      t('stockValue'),
    ];
    const lines = [header.join(',')];
    filtered.forEach((r) => {
      lines.push([
        `"${r.warehouse_name}"`,
        `"${r.item_part}"`,
        `"${r.item_desc.replace(/"/g, '""')}"`,
        r.qty_on_hand,
        r.avg_cost,
        (r.qty_on_hand * r.avg_cost).toFixed(2),
      ].join(','));
    });
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-balances-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('stockBalances')}
          subtitle={t('stockBalancesDesc')}
          icon={BarChart3}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link to="/inventory">
                  <ArrowLeft className="w-4 h-4 me-1.5" />
                  {t('backToInventory')}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/inventory/stock-card">
                  <FileText className="w-4 h-4 me-1.5" />
                  {t('stockCard')}
                </Link>
              </Button>
              <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
                <Download className="w-4 h-4 me-1.5" />
                {t('exportCsv')}
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">{t('totalItems')}</div>
            <div className="text-2xl font-bold mt-1">{totals.count}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">{t('totalQty')}</div>
            <div className="text-2xl font-bold mt-1">{totals.totalQty.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">{t('totalStockValue')}</div>
            <div className="text-2xl font-bold mt-1">{totals.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </Card>
        </div>

        <Card className="mt-4 p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="ps-8"
            />
          </div>
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

        <Card className="mt-4 overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">{t('noStockData')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('warehouseLabel')}</TableHead>
                  <TableHead>Part No</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead className="text-end">{t('qtyOnHand')}</TableHead>
                  <TableHead className="text-end">{t('avgCostCol')}</TableHead>
                  <TableHead className="text-end">{t('stockValue')}</TableHead>
                  <TableHead className="text-end">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const isLow = r.min_qty > 0 && r.qty_on_hand <= r.min_qty;
                  return (
                    <TableRow key={r.id} className={isLow ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">{r.warehouse_name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.item_part}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{r.item_desc}</TableCell>
                      <TableCell className={`text-end font-medium ${isLow ? 'text-destructive' : ''}`}>
                        {r.qty_on_hand.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-end">{r.avg_cost.toFixed(2)}</TableCell>
                      <TableCell className="text-end font-medium">
                        {(r.qty_on_hand * r.avg_cost).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/inventory/stock-card?item=${r.item_id}`}>
                            <FileText className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>
    </div>
  );
}