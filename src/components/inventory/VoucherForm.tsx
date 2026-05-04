import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Save, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useWarehouses, useCreateInvTransaction, type InvTxnType, type InvPartyType } from '@/hooks/useInventory';
import { useItemsMaster, type ItemMaster } from '@/hooks/useItemsMaster';
import { useMasterEmployees } from '@/hooks/useMasterEmployees';

export type VoucherKind = 'opening' | 'receipt' | 'issue';

interface Line {
  key: string;
  item_id: string;
  qty: number;
  unit: string;
  expiry: string;
  barcode: string;
  notes: string;
}

const newLine = (): Line => ({
  key: Math.random().toString(36).slice(2),
  item_id: '', qty: 0, unit: '', expiry: '', barcode: '', notes: '',
});

interface VoucherFormProps {
  kind: VoucherKind;
}

export function VoucherForm({ kind }: VoucherFormProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { warehouses } = useWarehouses();
  const { items } = useItemsMaster();
  const { employees } = useMasterEmployees();
  const { create } = useCreateInvTransaction();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [reference, setReference] = useState('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [partyType, setPartyType] = useState<InvPartyType>(kind === 'receipt' ? 'supplier' : 'employee');
  const [partyName, setPartyName] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>(() => Array.from({ length: 5 }, newLine));
  const [saving, setSaving] = useState(false);

  const itemsById = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const employee = employees.find(e => e.id === employeeId);

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)));
  };

  const onPickItem = (key: string, itemId: string) => {
    const it = itemsById.get(itemId);
    updateLine(key, {
      item_id: itemId,
      unit: it?.default_unit ?? '',
      barcode: it?.barcode ?? '',
    });
  };

  const validLines = lines.filter(l => l.item_id && l.qty > 0);

  const txnType: InvTxnType = kind === 'issue' ? 'out' : 'in';

  const titleKey = kind === 'opening' ? 'openingBalanceVoucher'
    : kind === 'receipt' ? 'materialReceiptVoucher' : 'materialIssueVoucher';

  const handleSave = async () => {
    if (!warehouseId) {
      toast({ title: t('error'), description: t('selectWarehouseRequired'), variant: 'destructive' });
      return;
    }
    if (!validLines.length) {
      toast({ title: t('error'), description: t('atLeastOneItemRequired'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    const partyNameFinal = employee
      ? `${employee.employee_number} - ${employee.employee_name}`
      : partyName || null;
    const noteParts: string[] = [];
    if (kind === 'opening') noteParts.push('[OPENING BALANCE]');
    if (notes) noteParts.push(notes);
    if (employee?.job_title) noteParts.push(`${t('jobTitle')}: ${employee.job_title}`);

    const result = await create({
      txn_type: txnType,
      txn_date: date,
      from_warehouse_id: kind === 'issue' ? warehouseId : null,
      to_warehouse_id: kind !== 'issue' ? warehouseId : null,
      party_type: partyType,
      party_name: partyNameFinal,
      party_ref: employee?.employee_number ?? null,
      reference: reference || null,
      notes: noteParts.join(' | ') || null,
      items: validLines.map(l => ({
        item_id: l.item_id,
        qty: Number(l.qty),
        unit: l.unit || null,
        notes: [l.expiry && `EXP:${l.expiry}`, l.notes].filter(Boolean).join(' | ') || null,
      })),
    }, true);
    setSaving(false);
    if (result) {
      toast({ title: t('success'), description: t('voucherSaved') });
      navigate('/inventory?tab=transactions');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-3">
          <div>
            <Label>{t('date')}</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>{t('referenceNo')}</Label>
            <Input value={reference} onChange={e => setReference(e.target.value)} placeholder={t('referenceNo')} />
          </div>
          <div>
            <Label>{t('warehouse')} *</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue placeholder={t('selectWarehouse')} /></SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.code} — {language === 'ar' ? w.name_ar : w.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {kind !== 'opening' && (
            <>
              <div>
                <Label>{kind === 'receipt' ? t('receivingStaff') : t('issuingStaff')}</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger><SelectValue placeholder={t('selectEmployee')} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.employee_number} - {e.employee_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('jobTitle')}</Label>
                <Input value={employee?.job_title ?? ''} readOnly placeholder="—" />
              </div>
              <div>
                <Label>{kind === 'receipt' ? t('supplierOrSource') : t('beneficiaryParty')}</Label>
                <Input value={partyName} onChange={e => setPartyName(e.target.value)} placeholder="—" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lines table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-2 text-start w-8">#</th>
                <th className="p-2 text-start min-w-[220px]">{t('item')} *</th>
                <th className="p-2 text-start">{t('barcode')}</th>
                <th className="p-2 text-start w-24">{t('unit')}</th>
                <th className="p-2 text-end w-24">{t('qty')} *</th>
                <th className="p-2 text-start w-36">{t('expiryDate')}</th>
                <th className="p-2 text-start">{t('notes')}</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => {
                const it = itemsById.get(l.item_id);
                return (
                  <tr key={l.key} className="border-t border-border/40">
                    <td className="p-2 text-muted-foreground">{idx + 1}</td>
                    <td className="p-2">
                      <Select value={l.item_id} onValueChange={v => onPickItem(l.key, v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t('selectItem')} /></SelectTrigger>
                        <SelectContent>
                          {items.slice(0, 500).map(i => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.part_no} — {language === 'ar' ? (i.name_ar || i.description) : (i.name_en || i.description)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2"><Input className="h-9 font-mono text-xs" value={l.barcode} onChange={e => updateLine(l.key, { barcode: e.target.value })} /></td>
                    <td className="p-2"><Input className="h-9" value={l.unit} onChange={e => updateLine(l.key, { unit: e.target.value })} /></td>
                    <td className="p-2"><Input className="h-9 text-end tabular-nums" type="number" min={0} step="any" value={l.qty || ''} onChange={e => updateLine(l.key, { qty: Number(e.target.value) })} /></td>
                    <td className="p-2"><Input className="h-9" type="date" value={l.expiry} onChange={e => updateLine(l.key, { expiry: e.target.value })} disabled={!it?.has_expiry && !l.item_id} /></td>
                    <td className="p-2"><Input className="h-9" value={l.notes} onChange={e => updateLine(l.key, { notes: e.target.value })} /></td>
                    <td className="p-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => setLines(prev => prev.length > 1 ? prev.filter(x => x.key !== l.key) : prev)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
        <div className="flex-1">
          <Label>{t('notes')}</Label>
          <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2 md:w-64">
          <div className="text-sm flex justify-between"><span className="text-muted-foreground">{t('totalLines')}:</span> <span className="font-semibold tabular-nums">{validLines.length}</span></div>
          <div className="text-sm flex justify-between"><span className="text-muted-foreground">{t('totalQty')}:</span> <span className="font-semibold tabular-nums">{validLines.reduce((s, l) => s + Number(l.qty || 0), 0)}</span></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={() => setLines(prev => [...prev, newLine()])} className="gap-1.5">
          <Plus className="w-4 h-4" /> {t('addRow')}
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('saveAndPost')}
        </Button>
      </div>
    </div>
  );
}