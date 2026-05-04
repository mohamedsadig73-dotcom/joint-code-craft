import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoxReceipts } from '@/hooks/useBoxReceipts';
import { useBoxDispatches, type DispatchInput } from '@/hooks/useBoxDispatches';
import { useProjects, useReceivingStaff } from '@/hooks/useDataSetup';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, Send, Plus } from 'lucide-react';
import { destinationBadgeClass } from '../destinationStyles';
import { useToast } from '@/hooks/use-toast';

interface Dept {
  id: string;
  name_ar: string;
  name_en: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}

export function CreateDispatchDialog({ open, onOpenChange, onCreated }: Props) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { receipts } = useBoxReceipts();
  const { createDispatch } = useBoxDispatches();
  const { rows: projects } = useProjects();
  const { rows: staff } = useReceivingStaff();

  const [departments, setDepartments] = useState<Dept[]>([]);
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptAr, setNewDeptAr] = useState('');
  const [newDeptEn, setNewDeptEn] = useState('');
  const [savingDept, setSavingDept] = useState(false);

  const [departmentId, setDepartmentId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [receivingStaffId, setReceivingStaffId] = useState<string>('');
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');
  const [destination, setDestination] = useState<'morocco' | 'uzbekistan' | 'unspecified'>('unspecified');
  const [notes, setNotes] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));

  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Map<string, number>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPicked(new Map());
      setSearch('');
      setSignerName('');
      setSignerTitle('');
      setShippingCompany('');
      setNotes('');
      setDestination('unspecified');
      setDepartmentId('');
      setProjectId('');
      setReceivingStaffId('');
      setShowAddDept(false);
      setNewDeptAr('');
      setNewDeptEn('');
    }
  }, [open]);

  // Load departments
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from('departments')
        .select('id, name_ar, name_en')
        .eq('is_active', true)
        .order('name_ar');
      setDepartments((data ?? []) as Dept[]);
    })();
  }, [open]);

  /** Only items currently in stock with qty > 0 and not yet shipped/dispatched. */
  const available = useMemo(
    () => receipts.filter((r) => r.qty > 0 && r.status !== 'shipped' && r.status !== 'dispatched'),
    [receipts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return available.filter((r) => {
      if (!q) return true;
      return (
        r.part_no.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.supplier.toLowerCase().includes(q) ||
        (r.box_no?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [available, search]);

  const togglePick = (id: string, defaultQty: number) => {
    setPicked((prev) => {
      const n = new Map(prev);
      if (n.has(id)) n.delete(id);
      else n.set(id, defaultQty);
      return n;
    });
  };

  const setQty = (id: string, qty: number, max: number) => {
    setPicked((prev) => {
      const n = new Map(prev);
      n.set(id, Math.max(1, Math.min(qty, max)));
      return n;
    });
  };

  const handleAddDept = async () => {
    if (!newDeptAr.trim()) return;
    setSavingDept(true);
    try {
      const code = newDeptAr.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 12);
      const { data, error } = await supabase
        .from('departments')
        .insert([{ code, name_ar: newDeptAr.trim(), name_en: newDeptEn.trim() || newDeptAr.trim() }])
        .select('id, name_ar, name_en')
        .single();
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return;
      }
      const dept = data as Dept;
      setDepartments((prev) => [...prev, dept].sort((a, b) => a.name_ar.localeCompare(b.name_ar)));
      setDepartmentId(dept.id);
      setShowAddDept(false);
      setNewDeptAr('');
      setNewDeptEn('');
      toast({ title: t('success'), description: t('departmentAdded') });
    } finally {
      setSavingDept(false);
    }
  };

  const handleSubmit = async () => {
    const dept = departments.find((d) => d.id === departmentId);
    if (!dept) {
      toast({ title: t('error'), description: t('selectDepartment'), variant: 'destructive' });
      return;
    }
    if (!signerName.trim()) {
      toast({ title: t('error'), description: t('signerNameRequired'), variant: 'destructive' });
      return;
    }
    if (picked.size === 0) {
      toast({ title: t('error'), description: t('noItemsSelected'), variant: 'destructive' });
      return;
    }
    const items = Array.from(picked.entries()).map(([receipt_id, qty_dispatched]) => ({
      receipt_id,
      qty_dispatched,
    }));
    const input: DispatchInput = {
      dispatch_date: dispatchDate,
      department_id: dept.id,
      department_name: language === 'ar' ? dept.name_ar : (dept.name_en ?? dept.name_ar),
      signer_name: signerName.trim(),
      signer_title: signerTitle.trim() || null,
      shipping_company: shippingCompany.trim() || null,
      destination,
      notes: notes.trim() || null,
      project_id: projectId || null,
      receiving_staff_id: receivingStaffId || null,
      items,
    };
    setSubmitting(true);
    try {
      const created = await createDispatch(input);
      if (created) {
        onCreated?.();
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {t('newDispatch')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pe-1">
          {/* Header form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>{t('beneficiaryDepartment')} *</Label>
              <div className="flex gap-2">
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t('selectDepartment')} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {language === 'ar' ? d.name_ar : (d.name_en ?? d.name_ar)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setShowAddDept((v) => !v)} title={t('addDepartment')}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {showAddDept && (
                <Card className="p-2 mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/30">
                  <Input value={newDeptAr} onChange={(e) => setNewDeptAr(e.target.value)} placeholder={t('nameAr')} />
                  <Input value={newDeptEn} onChange={(e) => setNewDeptEn(e.target.value)} placeholder={t('nameEn')} />
                  <Button onClick={handleAddDept} disabled={savingDept || !newDeptAr.trim()} size="sm">
                    {savingDept ? <Loader2 className="w-4 h-4 animate-spin" /> : t('save')}
                  </Button>
                </Card>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t('signerName')} *</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('signerTitle')}</Label>
              <Input value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('shippingCompany')}</Label>
              <Input value={shippingCompany} onChange={(e) => setShippingCompany(e.target.value)} placeholder={t('actualReceiver')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('destination')}</Label>
              <Select value={destination} onValueChange={(v) => setDestination(v as typeof destination)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">{t('dest_unspecified')}</SelectItem>
                  <SelectItem value="morocco">{t('dest_morocco')}</SelectItem>
                  <SelectItem value="uzbekistan">{t('dest_uzbekistan')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('dispatchDate')}</Label>
              <Input type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('projects')}</Label>
              <Select value={projectId || 'none'} onValueChange={(v) => setProjectId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder={t('selectOption') || '—'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {projects.filter(p => p.is_active).map(p => (
                    <SelectItem key={p.id} value={p.id}>{language === 'ar' ? p.name_ar : (p.name_en || p.name_ar)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('receivingStaff')}</Label>
              <Select value={receivingStaffId || 'none'} onValueChange={(v) => setReceivingStaffId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder={t('selectOption') || '—'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {staff.filter(s => s.is_active).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}{s.job_title ? ` — ${s.job_title}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>{t('notes')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          {/* Item picker */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-bold">{t('itemsToDispatch')}</Label>
              <Badge variant="secondary">{picked.size} {t('selected')}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('search')}
                className="ps-10"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto rounded-md border border-border">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">{t('noAvailableItems')}</div>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((r) => {
                    const isPicked = picked.has(r.id);
                    const qty = picked.get(r.id) ?? r.qty;
                    return (
                      <li
                        key={r.id}
                        className={`p-2 flex items-center gap-2.5 ${isPicked ? 'bg-primary/5' : ''}`}
                      >
                        <Checkbox
                          checked={isPicked}
                          onCheckedChange={() => togglePick(r.id, r.qty)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold">{r.part_no}</span>
                            <Badge className={destinationBadgeClass(r.destination)}>
                              {t(`dest_${r.destination}`)}
                            </Badge>
                            {r.box_no && <Badge variant="outline" className="font-mono text-[10px]">{r.box_no}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                        </div>
                        <div className="text-end shrink-0 w-20">
                          {isPicked ? (
                            <Input
                              type="number"
                              min={1}
                              max={r.qty}
                              value={qty}
                              onChange={(e) => setQty(r.id, Number(e.target.value) || 1, r.qty)}
                              className="h-8 text-xs text-center"
                            />
                          ) : (
                            <div className="text-sm font-bold tabular-nums">{r.qty.toLocaleString('en-US')}</div>
                          )}
                          <div className="text-[10px] text-muted-foreground">/ {r.qty} {r.unit}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {t('createDispatch')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}