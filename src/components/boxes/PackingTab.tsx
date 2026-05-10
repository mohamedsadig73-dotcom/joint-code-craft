import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoxReceipts } from '@/hooks/useBoxReceipts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, Package, Filter, Printer, ClipboardEdit } from 'lucide-react';
import { destinationBadgeClass } from './destinationStyles';
import { useAuth } from '@/contexts/AuthContext';
import { usePackingSelection } from '@/hooks/usePackingSelection';
import { PackingQuickSelectBar } from './packing/PackingQuickSelectBar';
import { BulkBoxAssignDialog } from './packing/BulkBoxAssignDialog';
import { buildPackingWorksheetHTML } from './packing/buildPackingWorksheetHTML';
import { printHTMLDocument } from './print/buildSupplierInvoiceHTML';

/**
 * PackingTab — workflow screen between "received" and "shipped".
 * Shows received items (boxed = unassigned to a box, loose = no box at all)
 * and lets admins/managers bulk-assign them to a box and mark them "packed".
 */
export function PackingTab() {
  const { t, language } = useLanguage();
  const { receipts, loading, bulkUpdateFields } = useBoxReceipts();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canPack = isAdmin || isManager;

  const [search, setSearch] = useState('');
  const [destFilter, setDestFilter] = useState('all');
  const [bulkOpen, setBulkOpen] = useState(false);

  /** Items eligible for packing: status=received and not yet 'packed' or 'shipped'. */
  const candidates = useMemo(
    () => receipts.filter((r) => r.status === 'received' || r.status === 'sorted'),
    [receipts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((r) => {
      if (destFilter !== 'all' && r.destination !== destFilter) return false;
      if (!q) return true;
      return (
        r.part_no.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.supplier.toLowerCase().includes(q) ||
        (r.box_no?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [candidates, search, destFilter]);

  const visibleIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const {
    selected, toggle, selectIds, deselectIds, clear, selectAllVisible,
  } = usePackingSelection(visibleIds);

  const selectedReceipts = useMemo(
    () => filtered.filter((r) => selected.has(r.id)),
    [filtered, selected],
  );

  const handlePrintWorksheet = async () => {
    if (selectedReceipts.length === 0) return;
    const isAr = language === 'ar';
    const html = buildPackingWorksheetHTML(selectedReceipts, {
      isAr,
      groupByDestination: true,
      labels: {
        title: t('packingWorksheetTitle'),
        date: t('date'),
        totalItems: t('totalItems'),
        responsible: t('responsible'),
        signature: t('signature'),
        page: t('page'),
        of: t('of'),
        num: '#',
        partNo: t('partNo'),
        description: t('description'),
        qty: t('qty'),
        unit: t('unit'),
        supplier: t('supplier'),
        destination: t('destination'),
        boxNo: t('boxNo'),
        notes: t('notes'),
        dest_morocco: t('dest_morocco'),
        dest_uzbekistan: t('dest_uzbekistan'),
        dest_unspecified: t('dest_unspecified'),
      },
    });
    await printHTMLDocument(html, t('packingWorksheetTitle'));
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search')}
            className="ps-10"
          />
        </div>
        <Select value={destFilter} onValueChange={setDestFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-3.5 h-3.5 me-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="morocco">{t('dest_morocco')}</SelectItem>
            <SelectItem value="uzbekistan">{t('dest_uzbekistan')}</SelectItem>
            <SelectItem value="unspecified">{t('dest_unspecified')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick selection bar */}
      {canPack && filtered.length > 0 && (
        <PackingQuickSelectBar
          visibleReceipts={filtered}
          selectedIds={selected}
          onSelectIds={selectIds}
          onDeselectIds={deselectIds}
          onClear={clear}
          onSelectAllVisible={selectAllVisible}
        />
      )}

      {/* Bulk action bar (sticky-feel) */}
      {selected.size > 0 && canPack && (
        <Card className="p-2.5 flex flex-wrap items-center gap-2 bg-primary/5 border-primary/30 sticky top-0 z-10">
          <span className="text-sm font-medium">
            {t('selectedCount').replace('{n}', selected.size.toLocaleString('en-US'))}
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handlePrintWorksheet} className="gap-1.5">
            <Printer className="w-4 h-4" />
            {t('printPackingWorksheet')}
          </Button>
          <Button size="sm" onClick={() => setBulkOpen(true)} className="gap-1.5">
            <ClipboardEdit className="w-4 h-4" />
            {t('enterBoxNumbers')}
          </Button>
        </Card>
      )}

      {/* Counts */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t('readyToPack')}: <span className="font-bold tabular-nums">{filtered.length.toLocaleString('en-US')}</span>
        </span>
        {filtered.length > 0 && (
          <button
            onClick={() =>
              filtered.every((r) => selected.has(r.id)) ? clear() : selectAllVisible()
            }
            className="text-primary hover:underline"
          >
            {filtered.every((r) => selected.has(r.id)) ? t('deselectAll') : t('selectAll')}
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Package className="w-12 h-12 mx-auto opacity-30 mb-2" />
          {t('noItemsToPack')}
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((r) => {
            const isChecked = selected.has(r.id);
            return (
              <Card
                key={r.id}
                className={`p-2.5 flex items-center gap-3 cursor-pointer transition-colors hover:bg-muted/50 ${isChecked ? 'bg-primary/5 border-primary/40' : ''}`}
                onClick={(e) => canPack && toggle(r.id, e.shiftKey)}
              >
                {canPack && (
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggle(r.id, false)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold">{r.part_no}</span>
                    <Badge className={destinationBadgeClass(r.destination)}>
                      {t(`dest_${r.destination}`)}
                    </Badge>
                    {r.box_no && (
                      <Badge variant="outline" className="font-mono text-[10px]">{r.box_no}</Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">{t(r.status)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</p>
                  <p className="text-[10px] text-muted-foreground">{r.supplier}</p>
                </div>
                <div className="text-end shrink-0">
                  <div className="text-sm font-bold tabular-nums">
                    {r.qty.toLocaleString('en-US')}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{r.unit}</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bulk box number entry dialog */}
      <BulkBoxAssignDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        receipts={selectedReceipts}
        bulkUpdateFields={bulkUpdateFields}
        onCompleted={clear}
      />
    </div>
  );
}