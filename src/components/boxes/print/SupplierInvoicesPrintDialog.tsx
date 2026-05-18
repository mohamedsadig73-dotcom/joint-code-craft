import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Printer, Building2, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';
import {
  groupBySupplierInvoice,
  buildSupplierInvoicesHTML,
  printHTMLDocument,
  type InvoicePrintOptions,
} from './buildSupplierInvoiceHTML';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  receipts: BoxReceipt[];
}

export function SupplierInvoicesPrintDialog({ open, onOpenChange, receipts }: Props) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const [includeImages, setIncludeImages] = useState(true);
  const [showCover, setShowCover] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const groups = useMemo(() => groupBySupplierInvoice(receipts), [receipts]);

  const groupKey = (g: { supplier: string; invoiceNumber: string | null }) =>
    `${g.supplier}::${g.invoiceNumber ?? '__NONE__'}`;

  const supplierMap = useMemo(() => {
    const m = new Map<string, typeof groups>();
    for (const g of groups) {
      const arr = m.get(g.supplier) || [];
      arr.push(g);
      m.set(g.supplier, arr);
    }
    return m;
  }, [groups]);

  const toggleGroup = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSupplier = (supplier: string) => {
    const supGroups = supplierMap.get(supplier) || [];
    const keys = supGroups.map(groupKey);
    const allSelected = keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(groups.map(groupKey)));
  const clearAll = () => setSelected(new Set());

  const handlePrint = async () => {
    const chosen = groups.filter((g) => selected.has(groupKey(g)));
    if (chosen.length === 0) return;

    const labels: InvoicePrintOptions['labels'] = {
      title: t('warehouseSystemTitle'),
      invoiceNo: t('invoiceNumber'),
      date: t('date'),
      supplier: t('supplier'),
      destination: t('destination'),
      packing: t('packingType'),
      image: t('image'),
      partNo: t('partNo'),
      description: t('description'),
      qty: t('qty'),
      unit: t('unit'),
      boxNo: t('boxNo'),
      status: t('status'),
      notes: t('notes'),
      totalItems: t('totalItems'),
      totalQty: t('totalQty'),
      distinctBoxes: t('distinctBoxes'),
      receiverSig: t('receiverSignature'),
      supplierSig: t('supplierSignature'),
      warehouseSeal: t('warehouseSeal'),
      page: t('page'),
      of: t('of'),
      coverTitle: t('supplierInvoicesCover'),
      invoicesCount: t('invoicesCount'),
      noInvoiceNumber: t('noInvoiceNumber'),
      dest_morocco: t('dest_morocco'),
      dest_uzbekistan: t('dest_uzbekistan'),
      dest_unspecified: t('dest_unspecified'),
      pack_boxed: t('boxed'),
      pack_loose: t('loose'),
      pack_mixed: t('mixedPacking'),
      status_received: t('boxStatus_received'),
      status_sorted: t('boxStatus_sorted'),
      status_packed: t('boxStatus_packed'),
      status_shipped: t('boxStatus_shipped'),
      status_dispatched: t('boxStatus_dispatched'),
    };

    const html = buildSupplierInvoicesHTML(chosen, {
      isAr, includeImages, showCoverPerSupplier: showCover, labels,
    });
    await printHTMLDocument(html, `${t('supplierInvoicesTitle')} - ${new Date().toLocaleDateString('en-GB')}`);
    onOpenChange(false);
  };

  const selectedCount = selected.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] max-h-[90vh] flex flex-col gap-0 gap-y-3 overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-x-2 ltr-flex">
            <Printer className="w-5 h-5" />
            {t('printSupplierInvoices')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-x-2 text-xs shrink-0 ltr-flex">
          <Button size="sm" variant="outline" onClick={selectAll} className="h-7 text-xs">{t('selectAll')}</Button>
          <Button size="sm" variant="outline" onClick={clearAll} className="h-7 text-xs">{t('clear')}</Button>
          <span className="ms-auto text-muted-foreground whitespace-nowrap">
            {t('selected')}: <strong className="inline-block text-foreground tabular-nums" dir="ltr">{selectedCount} / {groups.length}</strong>
          </span>
        </div>

        <ScrollArea type="always" className="flex-1 min-h-0 border rounded-md">
          <div className="p-2 space-y-2">
            {Array.from(supplierMap.entries()).map(([supplier, supGroups]) => {
              const keys = supGroups.map(groupKey);
              const allChecked = keys.every((k) => selected.has(k));
              const someChecked = keys.some((k) => selected.has(k));
              return (
                <div key={supplier} className="rounded-md border border-border/50 overflow-hidden">
                  <div className="flex items-center gap-x-3 px-3 py-2 bg-accent/30 ltr-flex">
                    <Checkbox
                      className="shrink-0"
                      checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                      onCheckedChange={() => toggleSupplier(supplier)}
                    />
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold text-sm flex-1 min-w-0 truncate">{supplier}</span>
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap rounded-full bg-background/60 px-2 py-0.5 border border-border/40">
                      {supGroups.length}&nbsp;{t('invoice')}
                    </span>
                  </div>
                  <div className="divide-y divide-border/40">
                    {supGroups.map((g) => {
                      const k = groupKey(g);
                      const totalQty = g.receipts.reduce((s, r) => s + (r.qty || 0), 0);
                      return (
                        <label
                          key={k}
                          className="flex items-center gap-x-3 px-3 py-2 ps-10 text-xs hover:bg-accent/20 cursor-pointer ltr-flex"
                        >
                          <Checkbox
                            className="shrink-0"
                            checked={selected.has(k)}
                            onCheckedChange={() => toggleGroup(k)}
                          />
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1 min-w-0 truncate" dir="ltr" style={{ textAlign: isAr ? 'right' : 'left' }}>
                            {g.invoiceNumber || t('noInvoiceNumber')}
                          </span>
                          <span
                            className="text-muted-foreground tabular-nums shrink-0 whitespace-nowrap rounded-md bg-background/60 px-2 py-0.5 border border-border/40"
                            dir="ltr"
                          >
                            {g.receipts.length} × {totalQty.toLocaleString('en-US')}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {groups.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">{t('noDataToPrint')}</div>
            )}
          </div>
        </ScrollArea>

        <div className="space-y-2 rounded-md border border-border/50 p-3 shrink-0">
          <div className="flex items-center justify-between">
            <Label htmlFor="incl-img" className="text-xs cursor-pointer">{t('includeImages')}</Label>
            <Switch id="incl-img" checked={includeImages} onCheckedChange={setIncludeImages} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-cover" className="text-xs cursor-pointer">{t('coverPagePerSupplier')}</Label>
            <Switch id="show-cover" checked={showCover} onCheckedChange={setShowCover} />
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={handlePrint} disabled={selectedCount === 0}>
            <Printer className="w-4 h-4 me-1.5" />
            {t('print')} ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}