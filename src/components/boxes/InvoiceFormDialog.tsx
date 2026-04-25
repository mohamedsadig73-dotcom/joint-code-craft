import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  BOX_UNITS,
  BOX_DESTINATIONS,
  BOX_STATUSES,
  normalizeBoxNo,
} from '@/utils/boxNumberValidation';
import type { BoxReceiptInput } from '@/hooks/useBoxReceipts';
import { useItemsMaster } from '@/hooks/useItemsMaster';
import { Loader2, Plus, Trash2, Package, PackageOpen, FileText } from 'lucide-react';
import { ItemPickerCombobox } from './items/ItemPickerCombobox';
import { QuickAddItemDialog } from './items/QuickAddItemDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rows: BoxReceiptInput[]) => Promise<{ inserted: number; failed: number }>;
  existingSuppliers: string[];
}

interface InvoiceLine {
  key: string;
  selectedItemId: string | null;
  part_no: string;
  description: string;
  qty: number;
  unit: BoxReceiptInput['unit'];
  notes: string;
}

interface InvoiceHeader {
  supplier: string;
  receipt_date: string;
  invoice_number: string;
  destination: BoxReceiptInput['destination'];
  packing_type: BoxReceiptInput['packing_type'];
  box_no: string;
  place: string;
  status: BoxReceiptInput['status'];
}

const HEADER_DEFAULT: InvoiceHeader = {
  supplier: '',
  receipt_date: new Date().toISOString().slice(0, 10),
  invoice_number: '',
  destination: 'unspecified',
  packing_type: 'boxed',
  box_no: 'B-01',
  place: 'مخزنة بالمخزن (B)',
  status: 'received',
};

function makeEmptyLine(): InvoiceLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    selectedItemId: null,
    part_no: '',
    description: '',
    qty: 1,
    unit: 'PCS',
    notes: '',
  };
}

export function InvoiceFormDialog({ open, onOpenChange, onSubmit, existingSuppliers }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { items } = useItemsMaster();

  const [header, setHeader] = useState<InvoiceHeader>(HEADER_DEFAULT);
  const [lines, setLines] = useState<InvoiceLine[]>([makeEmptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ supplier?: string; lines?: Record<string, string> }>({});
  const [quickAdd, setQuickAdd] = useState<{ open: boolean; lineKey: string | null; partNo: string }>({
    open: false,
    lineKey: null,
    partNo: '',
  });

  useEffect(() => {
    if (open) {
      setHeader(HEADER_DEFAULT);
      setLines([makeEmptyLine()]);
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  const totals = useMemo(() => {
    const totalQty = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
    return { rows: lines.length, qty: totalQty };
  }, [lines]);

  const updateLine = (key: string, patch: Partial<InvoiceLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, makeEmptyLine()]);
  };

  const handleSelectItem = (key: string, item: { id: string; part_no: string; description: string; default_unit: BoxReceiptInput['unit']; default_supplier: string | null }) => {
    updateLine(key, {
      selectedItemId: item.id,
      part_no: item.part_no,
      description: item.description,
      unit: item.default_unit,
    });
    // If header supplier is empty and item has a default supplier, suggest it
    if (!header.supplier && item.default_supplier) {
      setHeader((h) => ({ ...h, supplier: item.default_supplier as string }));
    }
  };

  const openQuickAdd = (lineKey: string, partNo: string) => {
    setQuickAdd({ open: true, lineKey, partNo });
  };

  const handleQuickAddCreated = (item: { id: string; part_no: string; description: string; default_unit: BoxReceiptInput['unit']; default_supplier: string | null }) => {
    if (quickAdd.lineKey) {
      handleSelectItem(quickAdd.lineKey, item);
    }
  };

  const validate = (): boolean => {
    const lineErrors: Record<string, string> = {};
    let supplierErr: string | undefined;

    if (!header.supplier.trim()) supplierErr = t('required');

    lines.forEach((l, idx) => {
      if (!l.part_no.trim()) lineErrors[l.key] = `${t('row')} ${idx + 1}: ${t('partNo')} ${t('required')}`;
      else if (!l.description.trim()) lineErrors[l.key] = `${t('row')} ${idx + 1}: ${t('description')} ${t('required')}`;
      else if (!l.qty || l.qty <= 0) lineErrors[l.key] = `${t('row')} ${idx + 1}: ${t('qtyMustBePositive')}`;
    });

    setErrors({ supplier: supplierErr, lines: lineErrors });
    return !supplierErr && Object.keys(lineErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast({ title: t('error'), description: t('fixValidationErrors'), variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const invoicePrefix = header.invoice_number.trim()
      ? `[${t('invoiceNumber')}: ${header.invoice_number.trim()}] `
      : '';

    const rows: BoxReceiptInput[] = lines.map((l) => ({
      supplier: header.supplier.trim(),
      part_no: l.part_no.trim(),
      description: l.description.trim(),
      qty: Number(l.qty),
      unit: l.unit,
      destination: header.destination,
      packing_type: header.packing_type,
      place: header.packing_type === 'boxed' ? header.place.trim() || null : null,
      box_no: header.packing_type === 'boxed' ? normalizeBoxNo(header.box_no) : null,
      receipt_date: header.receipt_date,
      status: header.status,
      notes: `${invoicePrefix}${l.notes.trim()}`.trim() || null,
      image_path: null,
    }));

    const result = await onSubmit(rows);
    setSubmitting(false);

    if (result.failed === 0) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {t('addFullInvoice')}
          </DialogTitle>
        </DialogHeader>

        {/* Invoice Header */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t('invoiceHeader')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-supplier" className="text-xs">
                {t('supplier')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inv-supplier"
                list="inv-supplier-list"
                value={header.supplier}
                onChange={(e) => setHeader({ ...header, supplier: e.target.value })}
                placeholder={t('supplier')}
                aria-invalid={!!errors.supplier}
              />
              <datalist id="inv-supplier-list">
                {existingSuppliers.map((s) => <option key={s} value={s} />)}
              </datalist>
              {errors.supplier && <p className="text-xs text-destructive">{errors.supplier}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-date" className="text-xs">{t('receiptDate')}</Label>
              <Input
                id="inv-date"
                type="date"
                value={header.receipt_date}
                onChange={(e) => setHeader({ ...header, receipt_date: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-no" className="text-xs">{t('invoiceNumber')}</Label>
              <Input
                id="inv-no"
                value={header.invoice_number}
                onChange={(e) => setHeader({ ...header, invoice_number: e.target.value })}
                placeholder={t('optional')}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('destination')}</Label>
              <Select
                value={header.destination}
                onValueChange={(v) => setHeader({ ...header, destination: v as BoxReceiptInput['destination'] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOX_DESTINATIONS.map((d) => (
                    <SelectItem key={d} value={d}>{t(`dest_${d}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('packingType')}</Label>
              <Select
                value={header.packing_type}
                onValueChange={(v) => setHeader({ ...header, packing_type: v as BoxReceiptInput['packing_type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boxed">
                    <span className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5" />
                      {t('boxed')}
                    </span>
                  </SelectItem>
                  <SelectItem value="loose">
                    <span className="flex items-center gap-2">
                      <PackageOpen className="w-3.5 h-3.5" />
                      {t('loose')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('status')}</Label>
              <Select
                value={header.status}
                onValueChange={(v) => setHeader({ ...header, status: v as BoxReceiptInput['status'] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOX_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{t(`boxStatus_${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {header.packing_type === 'boxed' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-box" className="text-xs">{t('boxNo')}</Label>
                  <Input
                    id="inv-box"
                    value={header.box_no}
                    onChange={(e) => setHeader({ ...header, box_no: e.target.value })}
                    onBlur={(e) => setHeader({ ...header, box_no: normalizeBoxNo(e.target.value) })}
                    placeholder="B-01"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="inv-place" className="text-xs">{t('place')}</Label>
                  <Input
                    id="inv-place"
                    value={header.place}
                    onChange={(e) => setHeader({ ...header, place: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Lines */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{t('invoiceItems')}</h3>
            <div className="text-xs text-muted-foreground tabular-nums">
              {t('totalRows')}: <span className="font-semibold text-foreground">{totals.rows}</span>
              {' • '}
              {t('totalQty')}: <span className="font-semibold text-foreground">{totals.qty.toLocaleString('en-US')}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-start py-2 px-2 w-10">#</th>
                  <th className="text-start py-2 px-2 min-w-[220px]">{t('partNo')}</th>
                  <th className="text-start py-2 px-2 min-w-[200px]">{t('description')}</th>
                  <th className="text-start py-2 px-2 w-24">{t('qty')}</th>
                  <th className="text-start py-2 px-2 w-24">{t('unit')}</th>
                  <th className="text-start py-2 px-2 min-w-[140px]">{t('notes')}</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={line.key} className="border-b border-border/40 align-top">
                    <td className="py-2 px-2 text-muted-foreground tabular-nums pt-3">{idx + 1}</td>
                    <td className="py-2 px-2">
                      <ItemPickerCombobox
                        items={items}
                        value={line.selectedItemId}
                        onSelect={(item) => handleSelectItem(line.key, item)}
                        onCreateNew={(partNo) => openQuickAdd(line.key, partNo)}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        className="h-10"
                        value={line.description}
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                        placeholder={t('description')}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        min={1}
                        className="h-10 tabular-nums"
                        value={line.qty}
                        onChange={(e) => updateLine(line.key, { qty: parseInt(e.target.value, 10) || 0 })}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Select
                        value={line.unit}
                        onValueChange={(v) => updateLine(line.key, { unit: v as BoxReceiptInput['unit'] })}
                      >
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {BOX_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        className="h-10"
                        value={line.notes}
                        onChange={(e) => updateLine(line.key, { notes: e.target.value })}
                        placeholder={t('optional')}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length === 1}
                        aria-label={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {errors.lines && Object.keys(errors.lines).length > 0 && (
            <ul className="text-xs text-destructive space-y-0.5 ps-4 list-disc">
              {Object.values(errors.lines).map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          )}

          <Button type="button" variant="outline" onClick={addLine} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t('addLine')}
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 me-1.5 animate-spin" />}
            {t('saveInvoice')}
          </Button>
        </DialogFooter>
      </DialogContent>
      <QuickAddItemDialog
        open={quickAdd.open}
        onOpenChange={(open) => setQuickAdd((q) => ({ ...q, open }))}
        initialPartNo={quickAdd.partNo}
        initialSupplier={header.supplier}
        onCreated={handleQuickAddCreated}
      />
    </Dialog>
  );
}