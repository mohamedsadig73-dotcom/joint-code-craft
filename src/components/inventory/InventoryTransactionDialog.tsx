import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useItemsMaster } from '@/hooks/useItemsMaster';
import { useWarehouses, useInvLocations, useCreateInvTransaction, type InvTxnType, type InvPartyType } from '@/hooks/useInventory';
import { Plus, Trash2, Loader2, CheckCircle2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StandardModal } from '@/components/ui/StandardModal';
import { FormSection, FormField, FormCode } from '@/components/ui/StandardForm';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: InvTxnType;
  onSuccess?: () => void;
}

interface LineItem {
  item_id: string;
  qty: number;
}

export function InventoryTransactionDialog({ open, onOpenChange, type, onSuccess }: Props) {
  const { t } = useLanguage();
  const { items } = useItemsMaster();
  const { warehouses } = useWarehouses();
  const { create } = useCreateInvTransaction();

  const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromWarehouseId, setFromWarehouseId] = useState<string>('');
  const [fromLocationId, setFromLocationId] = useState<string>('');
  const [toWarehouseId, setToWarehouseId] = useState<string>('');
  const [toLocationId, setToLocationId] = useState<string>('');
  const [partyType, setPartyType] = useState<InvPartyType>('employee');
  const [partyName, setPartyName] = useState('');
  const [partyRef, setPartyRef] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([{ item_id: '', qty: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [nextDeclNo, setNextDeclNo] = useState<string>('');
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [createdDeclId, setCreatedDeclId] = useState<string | null>(null);

  const { locations: fromLocs } = useInvLocations(fromWarehouseId || null);
  const { locations: toLocs } = useInvLocations(toWarehouseId || null);

  const needsSource = type === 'out' || type === 'transfer';
  const needsDest = type === 'in' || type === 'transfer' || type === 'return';
  const needsParty = type === 'out' || type === 'return';

  const titleKey = useMemo(() => ({
    in: 'newReceiptTxn', out: 'newIssueTxn', transfer: 'newTransferTxn', return: 'newReturnTxn'
  } as const)[type], [type]);

  const isDeclaration = type === 'in' || type === 'out';

  // Compute next declaration number for IN/OUT (preview only) — independent per year
  useEffect(() => {
    if (!open || !isDeclaration) { setNextDeclNo(''); return; }
    const prefix = type === 'in' ? 'IN' : 'OUT';
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;
    supabase
      .from('declarations')
      .select('id')
      .like('id', pattern)
      .order('id', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const last = data?.[0]?.id;
        const seq = last ? parseInt(last.split('-')[2], 10) + 1 : 1;
        setNextDeclNo(`${prefix}-${year}-${String(seq).padStart(4, '0')}`);
      });
  }, [open, type, isDeclaration, step]);

  const reset = () => {
    setLines([{ item_id: '', qty: 1 }]);
    setNotes(''); setReference(''); setPartyName(''); setPartyRef('');
    setStep('form'); setCreatedDeclId(null);
  };

  const validLines = useMemo(() => lines.filter(l => l.item_id && l.qty > 0), [lines]);

  const handleProceed = () => {
    if (!validLines.length) return;
    if (isDeclaration) { setStep('confirm'); return; }
    void doSubmit();
  };

  const doSubmit = async () => {
    if (!validLines.length) return;
    setSubmitting(true);
    const result = await create({
      txn_type: type,
      txn_date: txnDate,
      from_warehouse_id: needsSource ? fromWarehouseId || null : null,
      from_location_id: needsSource ? fromLocationId || null : null,
      to_warehouse_id: needsDest ? toWarehouseId || null : null,
      to_location_id: needsDest ? toLocationId || null : null,
      party_type: needsParty ? partyType : null,
      party_name: needsParty ? partyName.trim() || null : null,
      party_ref: needsParty ? partyRef.trim() || null : null,
      // For IN/OUT the external reference is auto-set to the declaration no.
      reference: isDeclaration ? null : (reference.trim() || null),
      notes: notes.trim() || null,
      items: validLines,
    }, true);
    setSubmitting(false);
    if (result) {
      onSuccess?.();
      if (isDeclaration) {
        setCreatedDeclId(result.declaration_id);
        setStep('success');
      } else {
        reset();
        onOpenChange(false);
      }
    }
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const TypeIcon = type === 'in' ? ArrowDownToLine : ArrowUpFromLine;
  const typeColor = type === 'in' ? 'text-green-600' : 'text-orange-600';

  return (
    <StandardModal
      open={open}
      onOpenChange={handleClose}
      title={t(titleKey)}
      size="lg"
      hideFooter
    >
      {step === 'form' && (
        <div className="space-y-1">
          <FormSection title={t('basicInfo') || 'البيانات الأساسية'} columns={2}>
            <FormField label={t('invDate')} required>
              <Input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
            </FormField>
            {isDeclaration ? (
              <FormField label={t('nextDeclarationNo') || 'رقم السند'}>
                <FormCode value={nextDeclNo} placeholder="…" />
              </FormField>
            ) : (
              <FormField label={t('invReference')} hint={t('optional')}>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t('optional')} />
              </FormField>
            )}
          </FormSection>

          {needsSource && (
            <FormSection title={t('source') || 'المصدر'} columns={2}>
              <FormField label={t('fromWarehouse')} required>
                <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                  <SelectTrigger><SelectValue placeholder={t('selectWarehouse')} /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.is_active).map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.code} - {w.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t('fromLocation')} hint={t('optional')}>
                <Select value={fromLocationId} onValueChange={setFromLocationId} disabled={!fromWarehouseId}>
                  <SelectTrigger><SelectValue placeholder={t('selectLocation')} /></SelectTrigger>
                  <SelectContent>
                    {fromLocs.filter(l => l.is_active).map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.code} - {l.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormSection>
          )}

          {needsDest && (
            <FormSection title={t('destination') || 'الوجهة'} columns={2}>
              <FormField label={t('toWarehouse')} required>
                <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                  <SelectTrigger><SelectValue placeholder={t('selectWarehouse')} /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.is_active).map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.code} - {w.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t('toLocation')} hint={t('optional')}>
                <Select value={toLocationId} onValueChange={setToLocationId} disabled={!toWarehouseId}>
                  <SelectTrigger><SelectValue placeholder={t('selectLocation')} /></SelectTrigger>
                  <SelectContent>
                    {toLocs.filter(l => l.is_active).map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.code} - {l.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormSection>
          )}

          {needsParty && (
            <FormSection title={t('party') || 'الطرف الآخر'} columns={3}>
              <FormField label={t('partyType')} required>
                <Select value={partyType} onValueChange={(v) => setPartyType(v as InvPartyType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">{t('employee')}</SelectItem>
                    <SelectItem value="department">{t('department')}</SelectItem>
                    <SelectItem value="supplier">{t('supplier')}</SelectItem>
                    <SelectItem value="external">{t('external')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t('partyName')} required>
                <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} />
              </FormField>
              <FormField label={t('partyRef')} hint={t('optional')}>
                <Input value={partyRef} onChange={(e) => setPartyRef(e.target.value)} placeholder={t('idOrCode')} />
              </FormField>
            </FormSection>
          )}

          <FormSection title={t('items')} columns={1}>
            <div className="flex items-center justify-end -mt-2 mb-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { item_id: '', qty: 1 }])}>
                <Plus className="w-4 h-4" /> {t('addLine')}
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select value={line.item_id} onValueChange={(v) => {
                      const next = [...lines]; next[idx].item_id = v; setLines(next);
                    }}>
                      <SelectTrigger><SelectValue placeholder={t('selectItem')} /></SelectTrigger>
                      <SelectContent>
                        {items.filter(i => i.is_active).map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.part_no} - {i.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Input type="number" min="0.01" step="any" value={line.qty} onChange={(e) => {
                      const next = [...lines]; next[idx].qty = Number(e.target.value); setLines(next);
                    }} />
                  </div>
                  {lines.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection columns={1}>
            <FormField label={t('notes')}>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </FormField>
          </FormSection>
        </div>
      )}

      {step === 'confirm' && (
          <div className="space-y-4 py-2">
            <div className={`flex items-center gap-3 p-4 rounded-lg border-2 border-primary/40 bg-primary/5`}>
              <TypeIcon className={`w-8 h-8 ${typeColor}`} />
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">{t('aboutToCreate')}</div>
                <div className="text-lg font-semibold">{t(titleKey)}</div>
              </div>
              <div className="text-end">
                <div className="text-xs text-muted-foreground">{t('nextDeclarationNo')}</div>
                <div className="font-mono font-bold text-primary">{nextDeclNo}</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-1 px-1">
              <div>{t('invDate')}: <span className="font-medium text-foreground">{txnDate}</span></div>
              <div>{t('items')}: <span className="font-medium text-foreground">{validLines.length}</span></div>
              {needsParty && partyName && (
                <div>{t('partyName')}: <span className="font-medium text-foreground">{partyName}</span></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t('confirmDeclarationHint')}</p>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 py-4 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold">{t('declarationCreated')}</div>
              <div className="text-sm text-muted-foreground mt-1">{t(titleKey)}</div>
            </div>
            {createdDeclId && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary/40 bg-primary/5 mx-auto">
                <span className="text-xs text-muted-foreground">{t('declarationNo')}:</span>
                <span className="font-mono font-bold text-primary text-lg">{createdDeclId}</span>
              </div>
            )}
          </div>
        )}

      <div className="px-5 py-3 border-t border-[hsl(var(--wms-border))] bg-[hsl(var(--wms-bg2))] flex flex-row gap-2 sticky bottom-0">
        {step === 'form' && (
          <>
            <Button onClick={handleProceed} disabled={!validLines.length}>
              {isDeclaration ? t('continueAction') : t('postTransaction')}
            </Button>
            <Button variant="outline" onClick={() => handleClose(false)}>{t('cancel')}</Button>
          </>
        )}
        {step === 'confirm' && (
          <>
            <Button onClick={doSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin me-1" />}
              {t('confirmAndCreate')}
            </Button>
            <Button variant="outline" onClick={() => setStep('form')} disabled={submitting}>{t('goBack')}</Button>
          </>
        )}
        {step === 'success' && (
          <Button onClick={() => handleClose(false)} className="w-full sm:w-auto">{t('done')}</Button>
        )}
      </div>
    </StandardModal>
  );
}