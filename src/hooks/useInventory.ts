import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import * as invSvc from '@/services/inventoryService';
import type {
  Warehouse, InvLocation, InvStock, InvCustody, InvTransaction,
  InvTransactionItem, InvTxnType, InvTxnStatus, InvPartyType,
  CreateTransactionInput,
} from '@/services/inventoryService';

// Re-export service types for backwards compatibility with existing imports.
export type { InvTxnType, InvTxnStatus, InvPartyType, Warehouse, InvLocation, InvStock, InvCustody, InvTransaction, InvTransactionItem };
export type CreateTransactionPayload = CreateTransactionInput;

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    setWarehouses(await invSvc.listWarehouses().catch(() => []));
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
    setLocations(await invSvc.listLocations(warehouseId).catch(() => []));
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
    setStock(await invSvc.listStock().catch(() => []));
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
    setCustody(await invSvc.listCustody().catch(() => []));
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
    setTransactions(await invSvc.listTransactions(filters).catch(() => []));
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

export function useCreateInvTransaction() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const create = useCallback(async (payload: CreateTransactionPayload, post = true): Promise<{ id: string; declaration_id: string | null } | null> => {
    if (!user?.id) {
      toast({ title: t('error'), description: t('mustBeLoggedIn'), variant: 'destructive' });
      return null;
    }
    try {
      const result = await invSvc.createTransaction(payload, { userId: user.id, post });
      toast({ title: t('success'), description: t('transactionCreated') });
      return result;
    } catch (err) {
      const msg = err instanceof invSvc.ServiceError ? err.message : (err as Error)?.message;
      toast({ title: t('error'), description: msg, variant: 'destructive' });
      return null;
    }
  }, [user?.id, toast, t]);

  return { create };
}

export function useTransactionItems(transactionId?: string | null) {
  const [items, setItems] = useState<InvTransactionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!transactionId) { setItems([]); return; }
    setLoading(true);
    invSvc.listTransactionItems(transactionId)
      .then((rows) => { setItems(rows); })
      .catch(() => { setItems([]); })
      .finally(() => setLoading(false));
  }, [transactionId]);

  return { items, loading };
}