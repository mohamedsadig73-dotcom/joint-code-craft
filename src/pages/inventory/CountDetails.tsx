import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ClipboardCheck, Loader2, ArrowLeft, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Count {
  id: string;
  count_no: string;
  count_date: string;
  status: 'draft' | 'in_progress' | 'posted' | 'cancelled';
  warehouse_id: string;
  notes: string | null;
  total_variance_qty: number;
  total_variance_value: number;
  adjustment_movement_id: string | null;
  posted_at: string | null;
}

interface Line {
  id: string;
  line_no: number;
  item_id: string;
  book_qty: number;
  counted_qty: number;
  variance_qty: number;
  unit_cost: number;
  remarks: string | null;
  item_part?: string;
  item_desc?: string;
}

const statusVariant: Record<Count['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  in_progress: 'secondary',
  posted: 'default',
  cancelled: 'destructive',
};

export default function CountDetails() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [count, setCount] = useState<Count | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [warehouseName, setWarehouseName] = useState<string>('—');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (id) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const { data: c, error } = await supabase
        .from('stock_counts')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      setCount({
        ...(c as any),
        total_variance_qty: Number(c.total_variance_qty),
        total_variance_value: Number(c.total_variance_value),
      });

      const [{ data: ls }, { data: wh }] = await Promise.all([
        supabase
          .from('stock_count_lines')
          .select('*')
          .eq('count_id', id!)
          .order('line_no'),
        supabase.from('warehouses').select('id, name_ar, name_en').eq('id', c.warehouse_id).single(),
      ]);
      const itemIds = Array.from(new Set((ls ?? []).map((l: any) => l.item_id)));
      let itemMap = new Map<string, any>();
      if (itemIds.length > 0) {
        const { data: items } = await supabase
          .from('items_master')
          .select('id, part_no, description')
          .in('id', itemIds);
        itemMap = new Map((items ?? []).map((i: any) => [i.id, i]));
      }
      setLines(
        (ls ?? []).map((l: any) => {
          const it = itemMap.get(l.item_id);
          return {
            ...l,
            book_qty: Number(l.book_qty),
            counted_qty: Number(l.counted_qty),
            variance_qty: Number(l.variance_qty),
            unit_cost: Number(l.unit_cost),
            item_part: it?.part_no ?? '—',
            item_desc: it?.description ?? '',
          };
        }),
      );
      if (wh) {
        setWarehouseName((language === 'ar' ? wh.name_ar : wh.name_en || wh.name_ar) ?? '—');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handlePost = async () => {
    if (!count) return;
    setPosting(true);
    try {
      const { data, error } = await supabase.rpc('post_stock_count', { p_count_id: count.id });
      if (error) throw error;
      toast.success(t('countPostedSuccess'));
      await load();
      if (data) navigate(`/inventory/movements/${data}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Error');
    } finally {
      setPosting(false);
    }
  };

  const statusLabel = (s: Count['status']) => {
    const map: Record<Count['status'], string> = {
      draft: t('countDraft'),
      in_progress: t('countInProgress'),
      posted: t('countPosted'),
      cancelled: t('countCancelled'),
    };
    return map[s];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!count) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-3xl mx-auto py-12 text-center text-muted-foreground">
          {t('noRecordsInv')}
        </main>
      </div>
    );
  }

  const canPost = canManage && count.status === 'draft';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={`${t('countDetails')} — ${count.count_no}`}
          subtitle={count.count_date}
          icon={ClipboardCheck}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link to="/inventory/counts">
                  <ArrowLeft className="w-4 h-4 me-1.5" />
                  {t('back') || t('backToInventory')}
                </Link>
              </Button>
              {count.adjustment_movement_id && (
                <Button variant="outline" asChild>
                  <Link to={`/inventory/movements/${count.adjustment_movement_id}`}>
                    <FileText className="w-4 h-4 me-1.5" />
                    {t('viewAdjustment')}
                  </Link>
                </Button>
              )}
              {canPost && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={posting}>
                      {posting ? (
                        <Loader2 className="w-4 h-4 me-1.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 me-1.5" />
                      )}
                      {t('postCount')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('postCount')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('confirmPostCount')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePost}>{t('confirm') || 'OK'}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          }
        />

        <Card className="p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">{t('countStatus')}</div>
              <Badge variant={statusVariant[count.status]} className="mt-1">{statusLabel(count.status)}</Badge>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">{t('warehouseLabel')}</div>
              <div className="font-medium mt-1">{warehouseName}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">{t('varianceQty')}</div>
              <div className="font-bold tabular-nums mt-1">{count.total_variance_qty.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">{t('varianceValue')}</div>
              <div className="font-bold tabular-nums mt-1">{count.total_variance_value.toLocaleString()}</div>
            </div>
          </div>
          {count.notes && (
            <div className="mt-3 pt-3 border-t text-sm">
              <div className="text-muted-foreground text-xs mb-1">{t('remarks')}</div>
              <div>{count.notes}</div>
            </div>
          )}
        </Card>

        <Card className="p-4">
          {lines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">{t('noCountLines')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('itemLabel')}</TableHead>
                  <TableHead className="text-end">{t('bookQty')}</TableHead>
                  <TableHead className="text-end">{t('countedQty')}</TableHead>
                  <TableHead className="text-end">{t('varianceQty')}</TableHead>
                  <TableHead className="text-end">{t('unitCost')}</TableHead>
                  <TableHead className="text-end">{t('varianceValue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground">{l.line_no}</TableCell>
                    <TableCell>
                      <div className="font-medium">{l.item_part}</div>
                      {l.item_desc && (
                        <div className="text-xs text-muted-foreground">{l.item_desc}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{l.book_qty.toLocaleString()}</TableCell>
                    <TableCell className="text-end tabular-nums">{l.counted_qty.toLocaleString()}</TableCell>
                    <TableCell
                      className={`text-end tabular-nums font-medium ${
                        l.variance_qty > 0
                          ? 'text-green-600'
                          : l.variance_qty < 0
                          ? 'text-amber-600'
                          : ''
                      }`}
                    >
                      {l.variance_qty.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{l.unit_cost.toLocaleString()}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {(Math.abs(l.variance_qty) * l.unit_cost).toLocaleString()}
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