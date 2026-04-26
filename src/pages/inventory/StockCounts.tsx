import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardCheck, Plus, Loader2, Search, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface CountRow {
  id: string;
  count_no: string;
  count_date: string;
  status: 'draft' | 'in_progress' | 'posted' | 'cancelled';
  warehouse_id: string;
  warehouse_name?: string;
  total_variance_qty: number;
  total_variance_value: number;
  notes: string | null;
  created_at: string;
}

const statusVariant: Record<CountRow['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  in_progress: 'secondary',
  posted: 'default',
  cancelled: 'destructive',
};

export default function StockCounts() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [rows, setRows] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  async function load() {
    setLoading(true);
    try {
      const [{ data: counts, error }, { data: whs }] = await Promise.all([
        supabase
          .from('stock_counts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('warehouses').select('id, name_ar, name_en'),
      ]);
      if (error) throw error;
      const whMap = new Map((whs ?? []).map((w: any) => [w.id, w]));
      setRows(
        (counts ?? []).map((c: any) => {
          const w = whMap.get(c.warehouse_id);
          return {
            ...c,
            warehouse_name: (language === 'ar' ? w?.name_ar : w?.name_en || w?.name_ar) ?? '—',
            total_variance_qty: Number(c.total_variance_qty),
            total_variance_value: Number(c.total_variance_value),
          };
        }),
      );
    } catch (e: any) {
      toast.error(e.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.count_no.toLowerCase().includes(q) ||
        (r.notes ?? '').toLowerCase().includes(q) ||
        (r.warehouse_name ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const statusLabel = (s: CountRow['status']) => {
    const map: Record<CountRow['status'], string> = {
      draft: t('countDraft'),
      in_progress: t('countInProgress'),
      posted: t('countPosted'),
      cancelled: t('countCancelled'),
    };
    return map[s];
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('stockCounts')}
          subtitle={t('stockCountsDesc')}
          icon={ClipboardCheck}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link to="/inventory">
                  <ArrowLeft className="w-4 h-4 me-1.5" />
                  {t('backToInventory')}
                </Link>
              </Button>
              {canManage && (
                <Button onClick={() => navigate('/inventory/counts/new')}>
                  <Plus className="w-4 h-4 me-1.5" />
                  {t('newStockCount')}
                </Button>
              )}
            </div>
          }
        />

        <Card className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('search')}
                className="ps-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {t('noRecordsInv')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('countNo')}</TableHead>
                  <TableHead>{t('countDate')}</TableHead>
                  <TableHead>{t('warehouseLabel')}</TableHead>
                  <TableHead>{t('countStatus')}</TableHead>
                  <TableHead className="text-end">{t('varianceQty')}</TableHead>
                  <TableHead className="text-end">{t('varianceValue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/inventory/counts/${r.id}`)}
                  >
                    <TableCell className="font-mono font-medium">{r.count_no}</TableCell>
                    <TableCell>{r.count_date}</TableCell>
                    <TableCell>{r.warehouse_name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[r.status]}>{statusLabel(r.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {r.total_variance_qty.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {r.total_variance_value.toLocaleString()}
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