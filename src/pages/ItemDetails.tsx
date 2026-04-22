import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useItemsMaster } from '@/hooks/useItemsMaster';
import { supabase } from '@/integrations/supabase/client';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';
import { ArrowLeft, Library, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ItemDetails() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { items, loading: itemsLoading } = useItemsMaster();
  const [receipts, setReceipts] = useState<BoxReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('box_receipts')
        .select('*')
        .eq('item_id', id)
        .is('deleted_at', null)
        .order('receipt_date', { ascending: false });
      if (!cancelled && !error) setReceipts((data ?? []) as BoxReceipt[]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const totals = useMemo(() => {
    const byDest: Record<string, number> = {};
    let total = 0;
    for (const r of receipts) {
      byDest[r.destination] = (byDest[r.destination] || 0) + r.qty;
      total += r.qty;
    }
    return { byDest, total };
  }, [receipts]);

  if (itemsLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-muted-foreground">{t('itemNotFound')}</p>
          <Button variant="outline" onClick={() => navigate('/boxes/items')} className="mt-4 gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/boxes/items')} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </Button>

        <PageHeader
          title={item.part_no}
          subtitle={item.description}
          icon={Library}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{t('defaultSupplier')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base font-medium">{item.default_supplier || '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{t('defaultUnit')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">{item.default_unit}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{t('totalQty')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totals.total}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(totals.byDest).map(([dest, qty]) => (
                  <Badge key={dest} variant="secondary" className="text-[10px]">
                    {t(`dest_${dest}`)}: {qty}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('movementHistory')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {receipts.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">{t('noMovements')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('supplier')}</TableHead>
                    <TableHead className="text-center">{t('qty')}</TableHead>
                    <TableHead>{t('destination')}</TableHead>
                    <TableHead>{t('boxNo')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">#{r.serial_no}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(r.receipt_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">{r.supplier}</TableCell>
                      <TableCell className="text-center font-medium">{r.qty} {r.unit}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t(`dest_${r.destination}`)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.box_no || <span className="text-muted-foreground">{t('loose')}</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t(`boxStatus_${r.status}`)}</Badge>
                      </TableCell>
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