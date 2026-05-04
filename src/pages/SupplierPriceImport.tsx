import { useEffect, useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/Combobox';
import { useSuppliers } from '@/hooks/useDataSetup';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { wmsToast as toast } from '@/lib/wmsToast';
import { FileSpreadsheet, Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import ExcelJS from 'exceljs';

interface ParsedRow {
  part_no: string;
  supplier_item_code?: string;
  purchase_price: number;
  notes?: string;
}

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export default function SupplierPriceImport() {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const { user } = useAuth();
  const { rows: suppliers } = useSuppliers();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const supplierOptions = useMemo(
    () => suppliers.filter((s) => s.is_active).map((s) => ({
      value: s.id, label: s.name_ar || s.name_en, hint: s.code,
    })),
    [suppliers]
  );

  useEffect(() => { setResult(null); }, [supplierId, file]);

  const parseFile = async (f: File) => {
    setParsing(true);
    setRows([]);
    try {
      const buf = await f.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const ws = wb.worksheets[0];
      if (!ws) throw new Error(isAr ? 'الملف فارغ' : 'Empty workbook');
      const out: ParsedRow[] = [];
      const header: Record<number, string> = {};
      ws.getRow(1).eachCell((cell, col) => {
        header[col] = String(cell.value ?? '').trim().toLowerCase();
      });
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        const map: Record<string, any> = {};
        row.eachCell((cell, col) => { map[header[col] ?? ''] = cell.value; });
        const part_no = String(map.part_no ?? map['رمز القطعة'] ?? map.partno ?? '').trim();
        const price = Number(map.price ?? map.purchase_price ?? map['السعر'] ?? 0);
        if (!part_no || !price || price < 0) return;
        out.push({
          part_no,
          supplier_item_code: String(map.supplier_code ?? map['كود المورد'] ?? '').trim() || undefined,
          purchase_price: price,
          notes: String(map.notes ?? map['ملاحظات'] ?? '').trim() || undefined,
        });
      });
      setRows(out);
      if (out.length === 0) toast.warning(isAr ? 'لم يتم العثور على صفوف صالحة' : 'No valid rows found');
    } catch (e: any) {
      toast.error(e?.message || 'Parse failed');
    } finally {
      setParsing(false);
    }
  };

  const runImport = async () => {
    if (!supplierId) return toast.error(isAr ? 'اختر المورد أولاً' : 'Select supplier first');
    if (rows.length === 0) return toast.error(isAr ? 'لا توجد بيانات للاستيراد' : 'No rows to import');
    setImporting(true);
    const errors: ImportResult['errors'] = [];
    let inserted = 0, updated = 0, skipped = 0;

    // Resolve part_no -> item_id in one query
    const partNos = Array.from(new Set(rows.map((r) => r.part_no)));
    const { data: items } = await supabase
      .from('items_master')
      .select('id, part_no')
      .in('part_no', partNos);
    const itemMap = new Map<string, string>();
    (items ?? []).forEach((it: any) => itemMap.set(it.part_no, it.id));

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const itemId = itemMap.get(r.part_no);
      if (!itemId) { skipped++; errors.push({ row: i + 2, reason: 'item not found' }); continue; }
      const { data: existing } = await supabase
        .from('item_suppliers')
        .select('id')
        .eq('item_id', itemId)
        .eq('supplier_id', supplierId)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from('item_suppliers')
          .update({
            purchase_price: r.purchase_price,
            supplier_item_code: r.supplier_item_code ?? null,
            notes: r.notes ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) { skipped++; errors.push({ row: i + 2, reason: error.message }); }
        else updated++;
      } else {
        const { error } = await supabase.from('item_suppliers').insert({
          item_id: itemId,
          supplier_id: supplierId,
          purchase_price: r.purchase_price,
          supplier_item_code: r.supplier_item_code ?? null,
          notes: r.notes ?? null,
          is_preferred: false,
        });
        if (error) { skipped++; errors.push({ row: i + 2, reason: error.message }); }
        else inserted++;
      }
    }

    const summary: ImportResult = { total: rows.length, inserted, updated, skipped, errors };
    setResult(summary);

    const sup = suppliers.find((s) => s.id === supplierId);
    await supabase.from('supplier_price_imports').insert({
      supplier_id: supplierId,
      supplier_name: sup?.name_ar ?? sup?.name_en ?? null,
      file_name: file?.name ?? null,
      rows_total: rows.length,
      rows_updated: updated,
      rows_inserted: inserted,
      rows_skipped: skipped,
      errors: errors.slice(0, 50),
      created_by: user?.id ?? null,
    });

    toast.success(`${isAr ? 'انتهى الاستيراد' : 'Import complete'}: +${inserted} / ~${updated} / !${skipped}`);
    setImporting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <PageHeader
          title={t('supplierPriceImport') || 'استيراد قائمة أسعار المورد'}
          subtitle={t('supplierPriceImportDesc') || 'حدّث أسعار الشراء من ملف Excel'}
          icon={FileSpreadsheet}
        />
        <Card className="p-4 mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('supplier') || 'المورد'} *</Label>
              <Combobox
                options={supplierOptions}
                value={supplierId}
                onChange={setSupplierId}
                placeholder={t('selectSupplier') || 'اختر المورد'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('file') || 'الملف'} (Excel: part_no, price, supplier_code, notes)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f) parseFile(f);
                }}
              />
            </div>
          </div>

          {parsing && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />{isAr ? 'جاري قراءة الملف...' : 'Parsing...'}
            </p>
          )}

          {rows.length > 0 && !result && (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">
                {isAr ? `جاهز للاستيراد: ${rows.length} صفّاً` : `Ready: ${rows.length} rows`}
              </p>
              <ul className="mt-2 text-xs text-muted-foreground max-h-40 overflow-auto">
                {rows.slice(0, 10).map((r, i) => (
                  <li key={i}>{r.part_no} — {r.purchase_price}</li>
                ))}
                {rows.length > 10 && <li>... +{rows.length - 10}</li>}
              </ul>
            </div>
          )}

          {result && (
            <div className="rounded-md border p-3 text-sm space-y-2">
              <p className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {isAr ? 'النتيجة' : 'Summary'}
              </p>
              <ul className="text-xs space-y-0.5">
                <li>{isAr ? 'الإجمالي' : 'Total'}: {result.total}</li>
                <li className="text-green-700">{isAr ? 'مُضاف' : 'Inserted'}: {result.inserted}</li>
                <li className="text-blue-700">{isAr ? 'مُحدَّث' : 'Updated'}: {result.updated}</li>
                <li className="text-amber-700">{isAr ? 'مُتجاهَل' : 'Skipped'}: {result.skipped}</li>
              </ul>
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> {result.errors.length} {isAr ? 'أخطاء' : 'errors'}
                  </summary>
                  <ul className="mt-1 text-xs max-h-40 overflow-auto">
                    {result.errors.slice(0, 30).map((e, i) => (
                      <li key={i}>row {e.row}: {e.reason}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button onClick={runImport} disabled={importing || rows.length === 0 || !supplierId}>
              {importing ? <Loader2 className="h-4 w-4 me-1.5 animate-spin" /> : <Upload className="h-4 w-4 me-1.5" />}
              {t('import') || 'استيراد'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}