import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeftRight, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type MovementType = 'receipt' | 'issue' | 'transfer';

interface Warehouse { id: string; code: string; name_ar: string; name_en: string | null; }
interface Item { id: string; part_no: string; description: string | null; }
interface Supplier { id: string; code: string; name_ar: string; }

interface Line {
  key: string;
  item_id: string;
  qty: string;
  unit_cost: string;
  remarks: string;
}

const newLine = (): Line => ({
  key: crypto.randomUUID(),
  item_id: '',
  qty: '',
  unit_cost: '0',
  remarks: '',
});

export default function NewStockMovement() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [type, setType] = useState<MovementType>('receipt');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromWh, setFromWh] = useState<string>('');
  const [toWh, setToWh] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [saving, setSaving] = useState(false);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    (async () => {
      const [w, i, s] = await Promise.all([
        supabase.from('warehouses').select('id,code,name_ar,name_en').eq('is_active', true).order('code'),
        supabase.from('items_master').select('id,part_no,description').order('part_no').limit(2000),
        supabase.from('suppliers').select('id,code,name_ar').eq('is_active', true).order('code'),
      ]);
      if (w.data) setWarehouses(w.data as Warehouse[]);
      if (i.data) setItems(i.data as Item[]);
      if (s.data) setSuppliers(s.data as Supplier[]);
    })();
  }, []);

  const totals = useMemo(() => {
    let qty = 0;
    let value = 0;
    lines.forEach((l) => {
      const q = parseFloat(l.qty || '0') || 0;
      const c = parseFloat(l.unit_cost || '0') || 0;
      qty += q;
      value += q * c;
    });
    return { qty, value };
  }, [lines]);

  if (!canManage) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-12 text-center text-muted-foreground">
          {t('noPermission')}
        </main>
      </div>
    );
  }

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const validate = (): string | null => {
    if (type === 'receipt' && !toWh) return t('errToWarehouseRequired');
    if (type === 'issue' && !fromWh) return t('errFromWarehouseRequired');
    if (type === 'transfer') {
      if (!fromWh || !toWh) return t('errBothWarehousesRequired');
      if (fromWh === toWh) return t('errWarehousesMustDiffer');
    }
    if (lines.length === 0) return t('errAtLeastOneLine');
    for (const l of lines) {
      if (!l.item_id) return t('errLineItemRequired');
      const q = parseFloat(l.qty);
      if (!q || q <= 0) return t('errLineQtyPositive');
    }
    return null;
  };

  const handleSave = async (postNow: boolean) => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const insertHeader = {
        movement_no: '',
        movement_type: type,
        movement_date: date,
        status: 'draft' as const,
        from_warehouse_id: type === 'receipt' ? null : fromWh || null,
        to_warehouse_id: type === 'issue' ? null : toWh || null,
        supplier_id: type === 'receipt' && supplierId ? supplierId : null,
        reference_no: referenceNo || null,
        notes: notes || null,
        created_by: user?.id ?? null,
      };
      const { data: hdr, error: hdrErr } = await supabase
        .from('stock_movements')
        .insert(insertHeader as any)
        .select()
        .single();
      if (hdrErr) throw hdrErr;

      const linesPayload = lines.map((l, idx) => ({
        movement_id: hdr.id,
        line_no: idx + 1,
        item_id: l.item_id,
        qty: parseFloat(l.qty),
        unit_cost: parseFloat(l.unit_cost || '0'),
        remarks: l.remarks || null,
      }));
      const { error: linesErr } = await supabase
        .from('stock_movement_lines')
        .insert(linesPayload as any);
      if (linesErr) throw linesErr;

      if (postNow) {
        const { error: postErr } = await supabase
          .from('stock_movements')
          .update({ status: 'posted' } as any)
          .eq('id', hdr.id);
        if (postErr) throw postErr;
      }

      toast.success(postNow ? t('movementPostedSuccess') : t('movementSavedDraft'));
      navigate('/inventory/movements');
    } catch (e: any) {
      toast.error(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('newMovement')}
          subtitle={t('stockMovementsDesc')}
          icon={ArrowLeftRight}
        />

        <Card className="p-4 mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>{t('movementType')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as MovementType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">{t('movementReceipt')}</SelectItem>
                <SelectItem value="issue">{t('movementIssue')}</SelectItem>
                <SelectItem value="transfer">{t('movementTransfer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t('movementDate')}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <Label>{t('referenceNo')}</Label>
            <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          </div>

          {(type === 'issue' || type === 'transfer') && (
            <div>
              <Label>{t('fromWarehouse')}</Label>
              <Select value={fromWh} onValueChange={setFromWh}>
                <SelectTrigger><SelectValue placeholder={t('selectWarehouse')} /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.code} — {w.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(type === 'receipt' || type === 'transfer') && (
            <div>
              <Label>{t('toWarehouse')}</Label>
              <Select value={toWh} onValueChange={setToWh}>
                <SelectTrigger><SelectValue placeholder={t('selectWarehouse')} /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.code} — {w.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'receipt' && (
            <div>
              <Label>{t('supplierLabel')}</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder={t('selectSupplier')} /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.code} — {s.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="sm:col-span-2 lg:col-span-3">
            <Label>{t('notes')}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </Card>

        <Card className="p-4 mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">{t('movementLines')}</h3>
            <Button size="sm" variant="outline" onClick={() => setLines((p) => [...p, newLine()])}>
              <Plus className="w-4 h-4 me-1" />
              {t('addLine')}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="min-w-[260px]">{t('itemLabel')}</TableHead>
                  <TableHead className="w-32">{t('qtyLabel')}</TableHead>
                  <TableHead className="w-32">{t('unitCost')}</TableHead>
                  <TableHead className="w-32">{t('lineTotal')}</TableHead>
                  <TableHead>{t('remarks')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l, idx) => {
                  const lineTotal = (parseFloat(l.qty) || 0) * (parseFloat(l.unit_cost) || 0);
                  return (
                    <TableRow key={l.key}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <Select value={l.item_id} onValueChange={(v) => updateLine(l.key, { item_id: v })}>
                          <SelectTrigger><SelectValue placeholder={t('selectItem')} /></SelectTrigger>
                          <SelectContent className="max-h-72">
                            {items.map((it) => (
                              <SelectItem key={it.id} value={it.id}>
                                {it.part_no}{it.description ? ` — ${it.description.slice(0, 40)}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={l.qty}
                          onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={l.unit_cost}
                          onChange={(e) => updateLine(l.key, { unit_cost: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="font-mono">
                        {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={l.remarks}
                          onChange={(e) => updateLine(l.key, { remarks: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 pt-4 mt-4 border-t">
            <div className="flex gap-6 text-sm">
              <span>
                {t('totalQty')}:{' '}
                <span className="font-semibold">
                  {totals.qty.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                </span>
              </span>
              <span>
                {t('totalValue')}:{' '}
                <span className="font-semibold">
                  {totals.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/inventory/movements')}>
                {t('cancel')}
              </Button>
              <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Save className="w-4 h-4 me-1" />}
                {t('saveDraft')}
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Save className="w-4 h-4 me-1" />}
                {t('saveAndPost')}
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
