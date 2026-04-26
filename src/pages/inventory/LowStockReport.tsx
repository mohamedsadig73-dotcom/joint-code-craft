import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader2, ArrowLeft, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface LowRow {
  item_id: string;
  part_no: string;
  description: string;
  min_qty: number;
  reorder_qty: number | null;
  total_on_hand: number;
  shortage: number;
}

export default function LowStockReport() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<LowRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data: items, error } = await supabase
        .from('items_master')
        .select('id, part_no, description, min_qty, reorder_qty')
        .eq('is_active', true)
        .gt('min_qty', 0)
        .limit(1000);
      if (error) throw error;

      const ids = (items ?? []).map((i: any) => i.id);
      const balMap = new Map<string, number>();
      if (ids.length) {
        const { data: balances } = await supabase
          .from('stock_balances')
          .select('item_id, qty_on_hand')
          .in('item_id', ids);
        (balances ?? []).forEach((b: any) => {
          balMap.set(b.item_id, (balMap.get(b.item_id) ?? 0) + Number(b.qty_on_hand));
        });
      }

      const lows: LowRow[] = (items ?? [])
        .map((i: any) => {
          const onHand = balMap.get(i.id) ?? 0;
          return {
            item_id: i.id,
            part_no: i.part_no,
            description: i.description,
            min_qty: Number(i.min_qty),
            reorder_qty: i.reorder_qty != null ? Number(i.reorder_qty) : null,
            total_on_hand: onHand,
            shortage: Math.max(0, Number(i.min_qty) - onHand),
          };
        })
        .filter((r) => r.total_on_hand <= r.min_qty)
        .sort((a, b) => b.shortage - a.shortage);

      setRows(lows);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    return {
      count: rows.length,
      totalShortage: rows.reduce((s, r) => s + r.shortage, 0),
    };
  }, [rows]);

  function exportCsv() {
    const header = ['Part No', t('description'), t('qtyOnHand'), t('minQty'), t('shortage')];
    const lines = [header.join(',')];
    rows.forEach((r) => {
      lines.push([
        `"${r.part_no}"`,
        `"${r.description.replace(/"/g, '""')}"`,
        r.total_on_hand,
        r.min_qty,
        r.shortage,
      ].join(','));
    });
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `low-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('lowStockReport')}
          subtitle={t('lowStockReportDesc')}
          icon={AlertTriangle}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link to="/inventory">
                  <ArrowLeft className="w-4 h-4 me-1.5" />
                  {t('backToInventory')}
                </Link>
              </Button>
              <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
                <Download className="w-4 h-4 me-1.5" />
                {t('exportCsv')}
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">{t('totalItems')}</div>
            <div className="text-2xl font-bold mt-1">{totals.count}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">{t('shortage')}</div>
            <div className="text-2xl font-bold mt-1 text-destructive">{totals.totalShortage.toLocaleString()}</div>
          </Card>
        </div>

        <Card className="mt-4 overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">{t('noLowStock')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part No</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead className="text-end">{t('qtyOnHand')}</TableHead>
                  <TableHead className="text-end">{t('minQty')}</TableHead>
                  <TableHead className="text-end">{t('shortage')}</TableHead>
                  <TableHead className="text-end">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.item_id} className="bg-destructive/5">
                    <TableCell className="font-mono text-xs">{r.part_no}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{r.description}</TableCell>
                    <TableCell className="text-end font-medium text-destructive">
                      {r.total_on_hand.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-end">{r.min_qty.toLocaleString()}</TableCell>
                    <TableCell className="text-end">
                      <Badge variant="destructive">{r.shortage.toLocaleString()}</Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/inventory/stock-card?item=${r.item_id}`}>
                          <FileText className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
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