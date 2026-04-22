import { useMemo, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Download, Upload, Loader2 } from 'lucide-react';
import { useBoxReceipts, type BoxReceipt, type BoxReceiptInput } from '@/hooks/useBoxReceipts';
import { useBoxSummary } from '@/hooks/useBoxSummary';
import { ReceiptsTable } from './ReceiptsTable';
import { ReceiptMobileCard } from './ReceiptMobileCard';
import { ReceiptFormDialog } from './ReceiptFormDialog';
import { ReceiptsPrintPreview } from './ReceiptsPrintPreview';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { exportBoxesToExcel, parseReceiptsFromExcel } from '@/utils/boxesExcelExport';
import { BOX_DESTINATIONS, BOX_STATUSES, PACKING_TYPES } from '@/utils/boxNumberValidation';

export function ReceiptsTab() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { receipts, loading, createReceipt, updateReceipt, deleteReceipt, bulkInsertReceipts } = useBoxReceipts();
  const { summary } = useBoxSummary();

  const [search, setSearch] = useState('');
  const [destFilter, setDestFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [packingFilter, setPackingFilter] = useState<string>('all');
  const [editing, setEditing] = useState<BoxReceipt | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<BoxReceipt | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const canModify = (r: BoxReceipt) =>
    isAdmin || isManager || r.created_by === user?.id;

  const existingSuppliers = useMemo(
    () => Array.from(new Set(receipts.map((r) => r.supplier))).sort(),
    [receipts]
  );
  const existingBoxes = useMemo(
    () => Array.from(new Set(receipts.map((r) => r.box_no).filter((b): b is string => !!b))).sort(),
    [receipts]
  );

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
        (r.box_no?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [receipts, search, destFilter, statusFilter, packingFilter]);

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
        });
      }
      if (inputs.length === 0) {
        toast({ title: t('error'), description: t('noValidRows'), variant: 'destructive' });
      } else {
        await bulkInsertReceipts(inputs);
      }
    } catch (err) {
      toast({ title: t('error'), description: (err as Error).message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-2">
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={receipts.length === 0}>
            <Download className="w-4 h-4 me-1.5" />
            {t('export')}
          </Button>
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
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 me-1.5" />
            {t('addReceipt')}
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin me-2" />
          {t('loading')}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <ReceiptsTable
              receipts={filtered}
              onEdit={handleEdit}
              onDelete={setToDelete}
              canModify={canModify}
            />
          </div>
          <div className="md:hidden space-y-2">
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
    </div>
  );
}