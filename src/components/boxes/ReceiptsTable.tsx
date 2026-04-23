import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';
import { destinationBadgeClass, destinationRowTint, statusBadgeClass } from './destinationStyles';
import { cn } from '@/lib/utils';

interface Props {
  receipts: BoxReceipt[];
  onEdit: (r: BoxReceipt) => void;
  onDelete: (r: BoxReceipt) => void;
  canModify: (r: BoxReceipt) => boolean;
}

function formatDate(d: string) {
  if (!d) return '';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function ReceiptsTable({ receipts, onEdit, onDelete, canModify }: Props) {
  const { t } = useLanguage();

  const totals = useMemo(() => {
    return receipts.reduce(
      (acc, r) => ({ rows: acc.rows + 1, qty: acc.qty + r.qty }),
      { rows: 0, qty: 0 }
    );
  }, [receipts]);

  // Sticky column classes — actions column stays pinned on the inline-end edge
  // so users can always reach Edit/Delete without horizontal scrolling.
  const stickyActions =
    'sticky end-0 z-20 bg-background shadow-[-4px_0_6px_-4px_hsl(var(--border))] rtl:shadow-[4px_0_6px_-4px_hsl(var(--border))]';
  const stickyActionsHead =
    'sticky end-0 z-30 bg-muted/95 backdrop-blur shadow-[-4px_0_6px_-4px_hsl(var(--border))] rtl:shadow-[4px_0_6px_-4px_hsl(var(--border))]';

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="w-16 text-center">{t('image')}</TableHead>
              <TableHead>{t('supplier')}</TableHead>
              <TableHead>{t('partNo')}</TableHead>
              <TableHead>{t('description')}</TableHead>
              <TableHead className="text-center">{t('qty')}</TableHead>
              <TableHead className="text-center">{t('unit')}</TableHead>
              <TableHead>{t('destination')}</TableHead>
              <TableHead className="text-center">{t('packingType')}</TableHead>
              <TableHead>{t('boxNo')}</TableHead>
              <TableHead>{t('date')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead className={cn('w-24 text-center', stickyActionsHead)}>{t('actions')}</TableHead>
            </TableRow>
            <TableRow className="bg-primary/5 font-semibold">
              <TableCell className="text-center">∑</TableCell>
              <TableCell />
              <TableCell colSpan={3} className="text-muted-foreground text-xs">
                {t('totalRows')}: {totals.rows.toLocaleString('en-US')}
              </TableCell>
              <TableCell className="text-center">{totals.qty.toLocaleString('en-US')}</TableCell>
              <TableCell colSpan={6} />
              <TableCell className={cn(stickyActions, 'bg-primary/5')} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                  {t('noReceiptsYet')}
                </TableCell>
              </TableRow>
            ) : (
              receipts.map((r, idx) => {
                const imgUrl = r.image_path
                  ? supabase.storage.from('box-images').getPublicUrl(r.image_path).data.publicUrl
                  : null;
                const allowed = canModify(r);
                const isLoose = r.packing_type === 'loose';
                return (
                  <TableRow key={r.id} className={cn('hover:bg-muted/40', destinationRowTint(r.destination))}>
                    <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center overflow-hidden">
                        {imgUrl ? (
                          <img src={imgUrl} alt={r.part_no} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-muted-foreground/60" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.supplier}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{r.part_no}</TableCell>
                    <TableCell className="text-sm max-w-[280px] truncate" title={r.description}>{r.description}</TableCell>
                    <TableCell className="text-center font-bold tabular-nums">{r.qty.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-center text-xs">{r.unit}</TableCell>
                    <TableCell>
                      <Badge className={destinationBadgeClass(r.destination)}>
                        {t(`dest_${r.destination}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-medium',
                          isLoose
                            ? 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                            : 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                        )}
                      >
                        {t(isLoose ? 'loose' : 'boxed')}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn('font-bold', isLoose ? 'text-muted-foreground' : 'text-destructive')}>
                      {isLoose ? '—' : r.box_no}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">{formatDate(r.receipt_date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass(r.status)}>
                        {t(`boxStatus_${r.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(r)} disabled={!allowed}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(r)} disabled={!allowed}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}