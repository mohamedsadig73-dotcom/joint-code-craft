import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';
import { destinationBadgeClass, destinationRowTint, statusBadgeClass } from './destinationStyles';
import { cn } from '@/lib/utils';

export type ReceiptColumnKey =
  | 'image' | 'supplier' | 'partNo' | 'description' | 'qty' | 'unit'
  | 'destination' | 'packing' | 'boxNo' | 'date' | 'status';

export const ALL_RECEIPT_COLUMNS: ReceiptColumnKey[] = [
  'image', 'supplier', 'partNo', 'description', 'qty', 'unit',
  'destination', 'packing', 'boxNo', 'date', 'status',
];

interface Props {
  receipts: BoxReceipt[];
  onEdit: (r: BoxReceipt) => void;
  onDelete: (r: BoxReceipt) => void;
  canModify: (r: BoxReceipt) => boolean;
  visibleColumns?: ReceiptColumnKey[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

function formatDate(d: string) {
  if (!d) return '';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function ReceiptsTable({
  receipts, onEdit, onDelete, canModify,
  visibleColumns = ALL_RECEIPT_COLUMNS,
  selectedIds, onToggleSelect, onToggleSelectAll,
}: Props) {
  const { t } = useLanguage();
  const visible = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const show = (k: ReceiptColumnKey) => visible.has(k);
  const selectionEnabled = !!selectedIds && !!onToggleSelect;

  const totals = useMemo(() => {
    return receipts.reduce(
      (acc, r) => ({ rows: acc.rows + 1, qty: acc.qty + r.qty }),
      { rows: 0, qty: 0 }
    );
  }, [receipts]);

  const allChecked = selectionEnabled && receipts.length > 0
    && receipts.every((r) => selectedIds!.has(r.id));
  const someChecked = selectionEnabled && !allChecked
    && receipts.some((r) => selectedIds!.has(r.id));

  // Sticky column classes — actions column stays pinned on the inline-end edge
  // so users can always reach Edit/Delete without horizontal scrolling.
  // Uses a SOLID background + a left border to clearly separate from data,
  // and a wider min-width so the two icon buttons never overlap each other
  // or bleed into the previous column.
  const stickyActionsBase =
    'sticky end-0 z-20 min-w-[96px] w-[96px] border-s border-border ' +
    'shadow-[-6px_0_8px_-6px_hsl(var(--border))] ' +
    'rtl:shadow-[6px_0_8px_-6px_hsl(var(--border))]';
  const stickyActionsHead =
    'sticky end-0 z-40 min-w-[96px] w-[96px] border-s border-border bg-muted ' +
    'shadow-[-6px_0_8px_-6px_hsl(var(--border))] ' +
    'rtl:shadow-[6px_0_8px_-6px_hsl(var(--border))]';

  // Total visible columns (incl. # + optional select + actions) for empty-state colSpan
  const totalCols = 1 + (selectionEnabled ? 1 : 0) + visibleColumns.length + 1;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-auto max-h-[70vh]">
        <Table>
          <TableHeader className="bg-muted/95 backdrop-blur sticky top-0 z-30">
            <TableRow>
              {selectionEnabled && (
                <TableHead className="w-10 text-center">
                  <Checkbox
                    checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                    onCheckedChange={() => onToggleSelectAll?.()}
                    aria-label={t('selectAll')}
                  />
                </TableHead>
              )}
              <TableHead className="w-12 text-center">#</TableHead>
              {show('image') && <TableHead className="w-16 text-center">{t('image')}</TableHead>}
              {show('supplier') && <TableHead>{t('supplier')}</TableHead>}
              {show('partNo') && <TableHead>{t('partNo')}</TableHead>}
              {show('description') && <TableHead>{t('description')}</TableHead>}
              {show('qty') && <TableHead className="text-center">{t('qty')}</TableHead>}
              {show('unit') && <TableHead className="text-center">{t('unit')}</TableHead>}
              {show('destination') && <TableHead>{t('destination')}</TableHead>}
              {show('packing') && <TableHead className="text-center">{t('packingType')}</TableHead>}
              {show('boxNo') && <TableHead>{t('boxNo')}</TableHead>}
              {show('date') && <TableHead>{t('date')}</TableHead>}
              {show('status') && <TableHead>{t('status')}</TableHead>}
              <TableHead className={cn('text-center', stickyActionsHead)}>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Totals row (now in body so it scrolls naturally with data) */}
            <TableRow className="bg-primary/5 font-semibold sticky top-[41px] z-20">
              {selectionEnabled && <TableCell />}
              <TableCell className="text-center">∑</TableCell>
              <TableCell colSpan={Math.max(0, visibleColumns.length - 1)} className="text-muted-foreground text-xs">
                {t('totalRows')}: {totals.rows.toLocaleString('en-US')} · {t('qty')}: {totals.qty.toLocaleString('en-US')}
              </TableCell>
              <TableCell className={cn(stickyActionsBase, 'bg-muted')} />
            </TableRow>
            {receipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalCols} className="text-center py-12 text-muted-foreground">
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
                const isSelected = selectionEnabled && selectedIds!.has(r.id);
                return (
                  <TableRow key={r.id} className={cn('hover:bg-muted/40', destinationRowTint(r.destination), isSelected && 'bg-primary/10')}>
                    {selectionEnabled && (
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleSelect!(r.id)}
                          aria-label={t('selectRow')}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                    {show('image') && (
                      <TableCell>
                        <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center overflow-hidden">
                          {imgUrl ? (
                            <img src={imgUrl} alt={r.part_no} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-muted-foreground/60" />
                          )}
                        </div>
                      </TableCell>
                    )}
                    {show('supplier') && <TableCell className="text-sm">{r.supplier}</TableCell>}
                    {show('partNo') && <TableCell className="font-mono text-xs font-semibold">{r.part_no}</TableCell>}
                    {show('description') && (
                      <TableCell className="text-sm max-w-[280px] truncate" title={r.description}>{r.description}</TableCell>
                    )}
                    {show('qty') && <TableCell className="text-center font-bold tabular-nums">{r.qty.toLocaleString('en-US')}</TableCell>}
                    {show('unit') && <TableCell className="text-center text-xs">{r.unit}</TableCell>}
                    {show('destination') && (
                      <TableCell>
                        <Badge className={destinationBadgeClass(r.destination)}>
                          {t(`dest_${r.destination}`)}
                        </Badge>
                      </TableCell>
                    )}
                    {show('packing') && (
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
                    )}
                    {show('boxNo') && (
                      <TableCell className={cn('font-bold', isLoose ? 'text-muted-foreground' : 'text-destructive')}>
                        {isLoose ? '—' : r.box_no}
                      </TableCell>
                    )}
                    {show('date') && <TableCell className="text-xs text-muted-foreground tabular-nums">{formatDate(r.receipt_date)}</TableCell>}
                    {show('status') && (
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(r.status)}>
                          {t(`boxStatus_${r.status}`)}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell
                      className={cn(
                        stickyActionsBase,
                        // Solid, opaque background so columns underneath never bleed through
                        isSelected ? 'bg-primary/15' : 'bg-card',
                      )}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => onEdit(r)}
                          disabled={!allowed}
                          aria-label={t('edit')}
                          title={t('edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onDelete(r)}
                          disabled={!allowed}
                          aria-label={t('delete')}
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
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