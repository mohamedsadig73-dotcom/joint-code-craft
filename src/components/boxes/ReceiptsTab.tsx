import { useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Plus, Search, Download, Upload, Loader2, Package, PackageOpen, Layers,
  Columns3, Trash2, X, FileText, Edit3,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBoxReceipts, type BoxReceipt, type BoxReceiptInput } from '@/hooks/useBoxReceipts';
import { useBoxSummary } from '@/hooks/useBoxSummary';
import { ReceiptsTable, ALL_RECEIPT_COLUMNS, type ReceiptColumnKey } from './ReceiptsTable';
import { ReceiptMobileCard } from './ReceiptMobileCard';
import { ReceiptFormDialog } from './ReceiptFormDialog';
import { InvoiceFormDialog } from './InvoiceFormDialog';
import { InvoicePickerDialog } from './InvoicePickerDialog';
import { ReceiptsPrintPreview } from './ReceiptsPrintPreview';
import { BulkEditReceiptsDialog, type BulkEditPatch } from './BulkEditReceiptsDialog';
import { EditPreviewDialog, type FieldDiff } from './EditPreviewDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { exportBoxesToExcel, parseReceiptsFromExcel } from '@/utils/boxesExcelExport';
import { BOX_DESTINATIONS, BOX_STATUSES, PACKING_TYPES } from '@/utils/boxNumberValidation';
import { ImportDuplicateDialog, type ImportResolution } from './ImportDuplicateDialog';
import { findImportDuplicates, type ImportDuplicateMatch } from '@/utils/boxDuplicateAnalysis';

const COLUMN_PREFS_KEY = 'receipts.visibleColumns.v1';

export function ReceiptsTab() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const {
    receipts,
    loading,
    createReceipt,
    updateReceipt,
    deleteReceipt,
    bulkInsertReceipts,
    bulkAddQuantity,
    bulkUpdatePackingType,
    bulkUpdateFields,
  } = useBoxReceipts();
  const { summary } = useBoxSummary();

  const [search, setSearch] = useState('');
  const [destFilter, setDestFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [packingFilter, setPackingFilter] = useState<string>('all');
  const [editing, setEditing] = useState<BoxReceipt | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoicePickerOpen, setInvoicePickerOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<{
    invoiceNumber: string;
    receipts: BoxReceipt[];
  } | null>(null);
  const [toDelete, setToDelete] = useState<BoxReceipt | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkRepacking, setBulkRepacking] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  // Edit preview state
  const [pendingEdit, setPendingEdit] = useState<{
    diffs: FieldDiff[];
    apply: () => Promise<unknown>;
  } | null>(null);
  const [previewSubmitting, setPreviewSubmitting] = useState(false);

  // Column visibility (persisted)
  const [visibleColumns, setVisibleColumns] = useState<ReceiptColumnKey[]>(() => {
    try {
      const raw = localStorage.getItem(COLUMN_PREFS_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as ReceiptColumnKey[];
        if (Array.isArray(arr) && arr.length > 0) {
          return arr.filter((c) => ALL_RECEIPT_COLUMNS.includes(c));
        }
      }
    } catch { /* noop */ }
    return ALL_RECEIPT_COLUMNS;
  });

  useEffect(() => {
    try { localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify(visibleColumns)); } catch { /* noop */ }
  }, [visibleColumns]);

  const toggleColumn = (key: ReceiptColumnKey) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...ALL_RECEIPT_COLUMNS.filter((c) => prev.includes(c) || c === key)]
    );
  };

  // Import duplicate detection state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingDuplicates, setPendingDuplicates] = useState<ImportDuplicateMatch<BoxReceiptInput>[]>([]);
  const [pendingUniques, setPendingUniques] = useState<BoxReceiptInput[]>([]);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const canModify = (r: BoxReceipt) =>
    // Shipped receipts are locked for everyone (except admin) to preserve audit integrity
    r.status === 'shipped'
      ? isAdmin
      : (isAdmin || isManager || r.created_by === user?.id);

  const existingSuppliers = useMemo(
    () => Array.from(new Set(receipts.map((r) => r.supplier))).sort(),
    [receipts]
  );
  const existingBoxes = useMemo(
    () => Array.from(new Set(receipts.map((r) => r.box_no).filter((b): b is string => !!b))).sort(),
    [receipts]
  );

  const counts = useMemo(() => {
    let boxed = 0;
    let loose = 0;
    for (const r of receipts) {
      if (r.packing_type === 'boxed') boxed++;
      else if (r.packing_type === 'loose') loose++;
    }
    return { all: receipts.length, boxed, loose };
  }, [receipts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return receipts.filter((r) => {
      if (destFilter !== 'all' && r.destination !== destFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (packingFilter !== 'all' && r.packing_type !== packingFilter) return false;
      if (!q) return true;
      return (
        r.supplier.toLowerCase().includes(q) ||
        r.part_no.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.box_no?.toLowerCase().includes(q) ?? false) ||
        (r.invoice_number?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [receipts, search, destFilter, statusFilter, packingFilter]);

  // Drop selections that no longer match the filter
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const visibleIds = new Set(filtered.map((r) => r.id));
    let changed = false;
    const next = new Set<string>();
    selectedIds.forEach((id) => {
      if (visibleIds.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelectedIds(next);
  }, [filtered, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (filtered.every((r) => selectedIds.has(r.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedReceipts = useMemo(
    () => filtered.filter((r) => selectedIds.has(r.id)),
    [filtered, selectedIds]
  );

  const handleBulkDelete = async () => {
    if (selectedReceipts.length === 0) return;
    setBulkDeleting(true);
    try {
      const allowed = selectedReceipts.filter(canModify);
      let ok = 0;
      for (const r of allowed) {
        try { await deleteReceipt(r.id); ok++; } catch { /* continue */ }
      }
      toast({
        title: t('success'),
        description: `${ok}/${selectedReceipts.length} ${t('deleted')}`,
      });
      clearSelection();
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const handleBulkExport = async () => {
    await exportBoxesToExcel(selectedReceipts, summary, language);
    toast({ title: t('success'), description: t('excelExported') });
  };

  const handleBulkChangePacking = async (target: 'boxed' | 'loose') => {
    const allowed = selectedReceipts.filter(canModify).filter((r) => r.packing_type !== target);
    if (allowed.length === 0) {
      toast({ title: t('info'), description: t('noEligibleRows') });
      return;
    }
    setBulkRepacking(true);
    try {
      await bulkUpdatePackingType(allowed.map((r) => r.id), target);
      clearSelection();
    } finally {
      setBulkRepacking(false);
    }
  };

  const handleBulkEditApply = async (ids: string[], patch: BulkEditPatch): Promise<number> => {
    // Filter to only modifiable rows (in case admin/manager status changed mid-flow)
    const idSet = new Set(ids);
    const allowed = selectedReceipts.filter((r) => idSet.has(r.id) && canModify(r));
    if (allowed.length === 0) return 0;
    const updated = await bulkUpdateFields(
      allowed.map((r) => r.id),
      patch as Partial<BoxReceiptInput>,
    );
    if (updated > 0) clearSelection();
    return updated;
  };

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (r: BoxReceipt) => {
    setEditing(r);
    setFormOpen(true);
  };

  const handleSubmit = async (values: BoxReceiptInput) => {
    if (editing) return updateReceipt(editing.id, values);
    return createReceipt(values);
  };

  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    await deleteReceipt(toDelete.id);
    setToDelete(null);
  };

  const handleExport = async () => {
    await exportBoxesToExcel(receipts, summary, language);
    toast({ title: t('success'), description: t('excelExported') });
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const rows = await parseReceiptsFromExcel(file);
      const inputs: BoxReceiptInput[] = [];
      for (const r of rows) {
        const supplier = String((r['supplier'] ?? r['المورد'] ?? '') || '').trim();
        const partNo = String((r['part_no'] ?? r['part no'] ?? r['رقم القطعة'] ?? '') || '').trim();
        const description = String((r['description'] ?? r['الوصف'] ?? '') || '').trim();
        const qty = Number(r['qty'] ?? r['الكمية'] ?? 0);
        const boxNo = String((r['box_no'] ?? r['box no'] ?? r['رقم الصندوق'] ?? '') || '').trim();
        if (!supplier || !partNo || !description || !boxNo || qty <= 0) continue;
        inputs.push({
          supplier,
          part_no: partNo,
          description,
          qty,
          unit: 'PCS',
          destination: 'unspecified',
          place: 'مخزنة بالمخزن (B)',
          packing_type: 'boxed',
          box_no: boxNo,
          receipt_date: new Date().toISOString().slice(0, 10),
          status: 'received',
          notes: null,
          image_path: null,
          invoice_number: null,
          item_id: null,
        });
      }
      if (inputs.length === 0) {
        toast({ title: t('error'), description: t('noValidRows'), variant: 'destructive' });
      } else {
        // Validate against existing receipts for duplicates
        const { duplicates, uniques } = findImportDuplicates(inputs, receipts);
        if (duplicates.length === 0) {
          await bulkInsertReceipts(inputs);
        } else {
          setPendingDuplicates(duplicates);
          setPendingUniques(uniques);
          setImportDialogOpen(true);
        }
      }
    } catch (err) {
      toast({ title: t('error'), description: (err as Error).message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResolveImport = async (resolution: ImportResolution) => {
    setImportDialogOpen(false);
    try {
      if (resolution === 'merge') {
        if (pendingUniques.length > 0) await bulkInsertReceipts(pendingUniques);
        const updates = pendingDuplicates.map((d) => ({ id: d.existing.id, addQty: d.input.qty }));
        const merged = await bulkAddQuantity(updates);
        toast({
          title: t('success'),
          description: `${pendingUniques.length} ${t('rowsImported')} · ${merged} ${t('mergedRecordsCount').replace('{count}', String(merged))}`,
        });
      } else if (resolution === 'skip') {
        if (pendingUniques.length > 0) await bulkInsertReceipts(pendingUniques);
      } else {
        const all = [...pendingUniques, ...pendingDuplicates.map((d) => d.input)];
        await bulkInsertReceipts(all);
      }
    } finally {
      setPendingDuplicates([]);
      setPendingUniques([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick packing toggle */}
      <ToggleGroup
        type="single"
        value={packingFilter}
        onValueChange={(v) => v && setPackingFilter(v)}
        className="justify-start flex-wrap gap-1"
      >
        <ToggleGroupItem value="all" aria-label={t('allItems')} className="gap-1.5 h-9 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          <Layers className="w-3.5 h-3.5" />
          <span className="text-xs">{t('allItems')}</span>
          <span className="text-xs tabular-nums opacity-80">({counts.all.toLocaleString('en-US')})</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="boxed" aria-label={t('boxedOnly')} className="gap-1.5 h-9 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          <Package className="w-3.5 h-3.5" />
          <span className="text-xs">{t('boxedOnly')}</span>
          <span className="text-xs tabular-nums opacity-80">({counts.boxed.toLocaleString('en-US')})</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="loose" aria-label={t('looseOnly')} className="gap-1.5 h-9 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          <PackageOpen className="w-3.5 h-3.5" />
          <span className="text-xs">{t('looseOnly')}</span>
          <span className="text-xs tabular-nums opacity-80">({counts.loose.toLocaleString('en-US')})</span>
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 -mx-2 px-2 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/60 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchReceipts')}
            className="ps-10"
          />
        </div>
        <Select value={destFilter} onValueChange={setDestFilter}>
          <SelectTrigger className="w-full md:w-44"><SelectValue placeholder={t('destination')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {BOX_DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{t(`dest_${d}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder={t('status')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {BOX_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`boxStatus_${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={packingFilter} onValueChange={setPackingFilter}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder={t('packingType')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {PACKING_TYPES.map((p) => <SelectItem key={p} value={p}>{t(p)}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                <Columns3 className="w-4 h-4" />
                <span className="hidden sm:inline">{t('columns')}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  ({visibleColumns.length}/{ALL_RECEIPT_COLUMNS.length})
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('toggleColumns')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_RECEIPT_COLUMNS.map((col) => {
                const labelKey =
                  col === 'packing' ? 'packingType'
                  : col === 'partNo' ? 'partNo'
                  : col === 'boxNo' ? 'boxNo'
                  : col;
                return (
                  <DropdownMenuCheckboxItem
                    key={col}
                    checked={visibleColumns.includes(col)}
                    onCheckedChange={() => toggleColumn(col)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {t(labelKey)}
                  </DropdownMenuCheckboxItem>
                );
              })}
              <DropdownMenuSeparator />
              <button
                type="button"
                className="w-full text-xs px-2 py-1.5 text-muted-foreground hover:bg-accent rounded-sm text-start"
                onClick={() => setVisibleColumns(ALL_RECEIPT_COLUMNS)}
              >
                {t('resetColumns')}
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={handleExport} disabled={receipts.length === 0}>
            <Download className="w-4 h-4 me-1.5" />
            {t('export')}
          </Button>
          <ReceiptsPrintPreview
            receipts={filtered}
            filterSummary={
              [
                destFilter !== 'all' ? `${t('destination')}: ${t(`dest_${destFilter}`)}` : null,
                statusFilter !== 'all' ? `${t('status')}: ${t(`boxStatus_${statusFilter}`)}` : null,
                packingFilter !== 'all' ? `${t('packingType')}: ${t(packingFilter)}` : null,
                search ? `${t('search')}: "${search}"` : null,
              ]
                .filter(Boolean)
                .join(' • ') || undefined
            }
          />
          <Button variant="outline" onClick={handleImportClick} disabled={importing}>
            {importing ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" /> : <Upload className="w-4 h-4 me-1.5" />}
            {t('import')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="outline" onClick={() => setInvoiceOpen(true)} className="gap-1.5">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">{t('addFullInvoice')}</span>
            <span className="sm:hidden">{t('invoice')}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setInvoicePickerOpen(true)}
            className="gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">{t('editFullInvoice')}</span>
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 me-1.5" />
            {t('addReceipt')}
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-[64px] z-20 flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm animate-in slide-in-from-top-2 fade-in duration-200">
          <span className="font-semibold">
            {selectedIds.size} {t('selected')}
          </span>
          <div className="ms-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkExport}>
              <Download className="w-3.5 h-3.5 me-1.5" />
              {t('export')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkRepacking || !selectedReceipts.some(canModify)}
                  className="gap-1.5"
                >
                  {bulkRepacking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Package className="w-3.5 h-3.5" />
                  )}
                  {t('changePackingType')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('changeTo')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleBulkChangePacking('loose')}>
                  <PackageOpen className="w-3.5 h-3.5 me-2" />
                  {t('loose')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleBulkChangePacking('boxed')}>
                  <Package className="w-3.5 h-3.5 me-2" />
                  {t('boxed')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={!selectedReceipts.some(canModify)}
            >
              <Trash2 className="w-3.5 h-3.5 me-1.5" />
              {t('delete')}
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              <X className="w-3.5 h-3.5 me-1.5" />
              {t('clear')}
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin me-2" />
          {t('loading')}
        </div>
      ) : (
        <>
          <div className="hidden lg:block">
            <ReceiptsTable
              receipts={filtered}
              onEdit={handleEdit}
              onDelete={setToDelete}
              canModify={canModify}
              visibleColumns={visibleColumns}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
            />
          </div>
          <div className="lg:hidden space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">{t('noReceiptsYet')}</div>
            ) : (
              filtered.map((r) => (
                <ReceiptMobileCard
                  key={r.id}
                  receipt={r}
                  onEdit={handleEdit}
                  onDelete={setToDelete}
                  canModify={canModify(r)}
                />
              ))
            )}
          </div>
        </>
      )}

      <ReceiptFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={handleSubmit}
        existingSuppliers={existingSuppliers}
        existingBoxes={existingBoxes}
      />

      <InvoiceFormDialog
        open={invoiceOpen}
        onOpenChange={(o) => {
          setInvoiceOpen(o);
          if (!o) setEditingInvoice(null);
        }}
        onSubmit={bulkInsertReceipts}
        existingSuppliers={existingSuppliers}
        editing={editingInvoice}
        onUpdateLine={(id, patch) => updateReceipt(id, patch)}
        onDeleteLine={(id) => deleteReceipt(id)}
      />

      <InvoicePickerDialog
        open={invoicePickerOpen}
        onOpenChange={setInvoicePickerOpen}
        receipts={receipts}
        onPick={({ invoiceNumber, receiptIds }) => {
          const ids = new Set(receiptIds);
          const matched = receipts.filter(
            (r) => ids.has(r.id)
          );
          if (matched.length === 0) return;
          setEditingInvoice({ invoiceNumber, receipts: matched });
          setInvoiceOpen(true);
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteReceipt')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteReceiptConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bulkDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bulkDeleteConfirm').replace('{count}', String(selectedReceipts.filter(canModify).length))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDuplicateDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        duplicates={pendingDuplicates}
        uniqueCount={pendingUniques.length}
        onResolve={handleResolveImport}
      />
    </div>
  );
}