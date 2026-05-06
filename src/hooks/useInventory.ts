import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export type InvTxnType = 'in' | 'out' | 'transfer' | 'return';
export type InvTxnStatus = 'draft' | 'posted' | 'cancelled';
export type InvPartyType = 'employee' | 'department' | 'supplier' | 'external';

export interface Warehouse {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  location: string | null;
  is_active: boolean;
}

export interface InvLocation {
  id: string;
  warehouse_id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InvStock {
  id: string;
  item_id: string;
  warehouse_id: string;
  location_id: string | null;
  qty: number;
  last_movement_at: string | null;
}

export interface InvCustody {
  id: string;
  item_id: string;
  party_type: InvPartyType;
  party_name: string;
  party_ref: string | null;
  qty: number;
  last_movement_at: string | null;
}

export interface InvTransaction {
  id: string;
  txn_no: string;
  txn_type: InvTxnType;
  txn_date: string;
  status: InvTxnStatus;
  from_warehouse_id: string | null;
  from_location_id: string | null;
  to_warehouse_id: string | null;
  to_location_id: string | null;
  party_type: InvPartyType | null;
  party_name: string | null;
  party_ref: string | null;
  reference: string | null;
  notes: string | null;
  linked_box_receipt_id: string | null;
  declaration_id: string | null;
  posted_at: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface InvTransactionItem {
  id: string;
  transaction_id: string;
  line_no: number;
  item_id: string;
  qty: number;
  unit: string | null;
  notes: string | null;
}

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('warehouses').select('id,code,name_ar,name_en,location,is_active').order('code');
    setWarehouses((data ?? []) as Warehouse[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { warehouses, loading, refetch: fetch };
}

export function useInvLocations(warehouseId?: string | null) {
  const [locations, setLocations] = useState<InvLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('inv_locations').select('*').order('code');
    if (warehouseId) q = q.eq('warehouse_id', warehouseId);
    const { data } = await q;
    setLocations((data ?? []) as InvLocation[]);
    setLoading(false);
  }, [warehouseId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { locations, loading, refetch: fetch };
}

export function useInvStock() {
  const [stock, setStock] = useState<InvStock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('inv_stock').select('*').order('updated_at', { ascending: false });
    setStock((data ?? []) as InvStock[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('inv_stock_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inv_stock' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  return { stock, loading, refetch: fetch };
}

export function useInvCustody() {
  const [custody, setCustody] = useState<InvCustody[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('inv_custody').select('*').order('updated_at', { ascending: false });
    setCustody((data ?? []) as InvCustody[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('inv_custody_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inv_custody' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  return { custody, loading, refetch: fetch };
}

export function useInvTransactions(filters?: { type?: InvTxnType; status?: InvTxnStatus }) {
  const [transactions, setTransactions] = useState<InvTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('inv_transactions').select('*').is('deleted_at', null).order('txn_date', { ascending: false }).order('created_at', { ascending: false });
    if (filters?.type) q = q.eq('txn_type', filters.type);
    if (filters?.status) q = q.eq('status', filters.status);
    const { data } = await q;
    setTransactions((data ?? []) as InvTransaction[]);
    setLoading(false);
  }, [filters?.type, filters?.status]);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('inv_txn_ch_' + (filters?.type ?? 'all'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inv_transactions' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch, filters?.type]);

  return { transactions, loading, refetch: fetch };
}

export interface CreateTransactionPayload {
  txn_type: InvTxnType;
  txn_date: string;
  from_warehouse_id?: string | null;
  from_location_id?: string | null;
  to_warehouse_id?: string | null;
  to_location_id?: string | null;
  party_type?: InvPartyType | null;
  party_name?: string | null;
  party_ref?: string | null;
  reference?: string | null;
  notes?: string | null;
  linked_box_receipt_id?: string | null;
  items: Array<{ item_id: string; qty: number; unit?: string | null; notes?: string | null }>;
}

export function useCreateInvTransaction() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const create = useCallback(async (payload: CreateTransactionPayload, post = true): Promise<{ id: string; declaration_id: string | null } | null> => {
    if (!user?.id) {
      toast({ title: t('error'), description: t('mustBeLoggedIn'), variant: 'destructive' });
      return null;
    }
    if (!payload.items.length) {
      toast({ title: t('error'), description: t('atLeastOneItemRequired'), variant: 'destructive' });
      return null;
    }

    // 1. Insert transaction as draft
    const { data: txn, error: txnErr } = await supabase
      .from('inv_transactions')
      .insert({
        txn_type: payload.txn_type,
        txn_date: payload.txn_date,
        status: 'draft',
        from_warehouse_id: payload.from_warehouse_id ?? null,
        from_location_id: payload.from_location_id ?? null,
        to_warehouse_id: payload.to_warehouse_id ?? null,
        to_location_id: payload.to_location_id ?? null,
        party_type: payload.party_type ?? null,
        party_name: payload.party_name ?? null,
        party_ref: payload.party_ref ?? null,
        reference: payload.reference ?? null,
        notes: payload.notes ?? null,
        linked_box_receipt_id: payload.linked_box_receipt_id ?? null,
        created_by: user.id,
      } as never)
      .select()
      .single();

    if (txnErr || !txn) {
      toast({ title: t('error'), description: txnErr?.message, variant: 'destructive' });
      return null;
    }

    // 2. Insert lines
    const lines = payload.items.map((it, idx) => ({
      transaction_id: (txn as { id: string }).id,
      line_no: idx + 1,
      item_id: it.item_id,
      qty: it.qty,
      unit: it.unit ?? null,
      notes: it.notes ?? null,
    }));
    const { error: linesErr } = await supabase.from('inv_transaction_items').insert(lines as never);
    if (linesErr) {
      toast({ title: t('error'), description: linesErr.message, variant: 'destructive' });
      return null;
    }

    // 3. Post if requested
    if (post) {
      const { error: postErr } = await supabase
        .from('inv_transactions')
        .update({ status: 'posted' } as never)
        .eq('id', (txn as { id: string }).id);
      if (postErr) {
        toast({ title: t('error'), description: postErr.message, variant: 'destructive' });
        return { id: (txn as { id: string }).id, declaration_id: null };
      }
    }

    // 4. Re-fetch to get auto-generated declaration_id from trigger
    const { data: refreshed } = await supabase
      .from('inv_transactions')
      .select('id, declaration_id')
      .eq('id', (txn as { id: string }).id)
      .maybeSingle();

    toast({ title: t('success'), description: t('transactionCreated') });
    return {
      id: (txn as { id: string }).id,
      declaration_id: (refreshed as { declaration_id: string | null } | null)?.declaration_id ?? null,
    };
  }, [user?.id, toast, t]);

  return { create };
}

export function useTransactionItems(transactionId?: string | null) {
  const [items, setItems] = useState<InvTransactionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!transactionId) { setItems([]); return; }
    setLoading(true);
    supabase.from('inv_transaction_items').select('*').eq('transaction_id', transactionId).order('line_no')
      .then(({ data }) => {
        setItems((data ?? []) as InvTransactionItem[]);
        setLoading(false);
      });
  }, [transactionId]);

  return { items, loading };
}