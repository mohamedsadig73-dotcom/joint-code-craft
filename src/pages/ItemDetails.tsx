import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Library, Loader2, ImageIcon, Info, History } from 'lucide-react';
import { format } from 'date-fns';
import { ItemImageUpload } from '@/components/boxes/items/ItemImageUpload';
import { useItemImageHistory, type ItemImageHistoryEntry } from '@/hooks/useItemImageHistory';
import { ItemImageHistoryList } from '@/components/boxes/items/ItemImageHistoryList';
import { useToast } from '@/hooks/use-toast';

/** Window during which a receipt is considered "recent" and protects the master image. */
const RECENT_RECEIPT_DAYS = 30;

export default function ItemDetails() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, loading: itemsLoading, updateItem } = useItemsMaster();
  const [receipts, setReceipts] = useState<BoxReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);
  const imageUrl = item?.image_path
    ? supabase.storage.from('box-images').getPublicUrl(item.image_path).data.publicUrl
    : null;

  const { entries: imgHistory, loading: imgHistoryLoading } = useItemImageHistory({
    itemId: id,
    limit: 20,
  });

  const handleImageChange = async (path: string | null) => {
    if (!item) return;
    await updateItem(item.id, { image_path: path });
  };

  /**
   * Block image removal when there are recent receipts referencing the
   * current master image. Replacement is still allowed (snapshots on
   * existing receipts remain intact).
   */
  const guardRemoval = useCallback(async (): Promise<boolean> => {
    if (!item?.image_path) return true;
    const since = new Date();
    since.setDate(since.getDate() - RECENT_RECEIPT_DAYS);
    const { count } = await supabase
      .from('box_receipts')
      .select('id', { count: 'exact', head: true })
      .eq('item_id', item.id)
      .eq('image_path', item.image_path)
      .gte('receipt_date', since.toISOString().slice(0, 10))
      .is('deleted_at', null);
    if ((count ?? 0) > 0) {
      toast({
        title: t('cannotRemoveImageInUse'),
        description: t('cannotRemoveImageInUseDesc').replace('{count}', String(count)),
        variant: 'destructive',
      });
      return false;
    }
    return true;
  }, [item, t, toast]);

  const handleRestore = useCallback(
    async (_entry: ItemImageHistoryEntry, path: string) => {
      if (!item) return;
      await updateItem(item.id, { image_path: path });
      toast({ title: t('success'), description: t('imageRestored') });
    },
    [item, updateItem, toast, t]
  );

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
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('itemImage')}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <div className="w-full aspect-square rounded-md bg-muted/30 border overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={item.part_no}
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground gap-1.5">
                    <ImageIcon className="w-10 h-10 opacity-40" />
                    <span className="text-xs">{t('noImage')}</span>
                  </div>
                )}
              </div>
              <ItemImageUpload
                partNo={item.part_no}
                imagePath={item.image_path}
                onChange={handleImageChange}
                cleanupOnReplace
                compact
                onBeforeRemove={guardRemoval}
              />
              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{t('imageSnapshotNote')}</span>
              </p>
            </CardContent>
          </Card>
          <Card className="md:col-span-2 flex items-center justify-center">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">{t('description')}</p>
              <p className="text-base font-medium">{item.description}</p>
              {item.notes && (
                <>
                  <p className="text-sm text-muted-foreground mt-3 mb-1">{t('notes')}</p>
                  <p className="text-sm">{item.notes}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              {t('itemImageHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ItemImageHistoryList
              entries={imgHistory}
              loading={imgHistoryLoading}
              onRestore={handleRestore}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}