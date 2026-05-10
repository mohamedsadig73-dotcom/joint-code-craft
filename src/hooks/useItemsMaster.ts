import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ItemMaster {
  id: string;
  part_no: string;
  description: string;
  default_supplier: string | null;
  default_unit: 'PCS' | 'SET' | 'BOX' | 'KG' | 'MTR' | 'LTR' | 'PAIR' | 'ROLL' | 'KIT' | 'BAG' | 'CTN' | 'DRUM' | 'PACK' | 'BTL' | 'M2' | 'M3';
  image_path: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ItemMasterInput = Omit<ItemMaster, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

export function useItemsMaster() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error, count } = await supabase
      .from('items_master')
      .select('*', { count: 'exact' })
      .order('part_no', { ascending: true })
      .range(0, 49999);
    if (error) {
      console.error('[useItemsMaster]', error);
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      setItems((data ?? []) as ItemMaster[]);
      setTotalCount(count ?? (data?.length ?? 0));
    }
    setLoading(false);
  }, [toast, t]);

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel('items_master_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items_master' }, () => fetchItems())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  const findByPartNo = useCallback(
    (partNo: string): ItemMaster | undefined => {
      const norm = partNo.trim().toLowerCase();
      return items.find((i) => i.part_no.trim().toLowerCase() === norm);
    },
    [items]
  );

  // Server-side safety-net lookup: used when the local list is large/stale
  // or when a part number is not found locally. Always queries the DB.
  const findByPartNoServer = useCallback(
    async (partNo: string): Promise<ItemMaster | null> => {
      const trimmed = partNo.trim();
      if (!trimmed) return null;
      const { data } = await supabase
        .from('items_master')
        .select('*')
        .ilike('part_no', trimmed)
        .limit(1)
        .maybeSingle();
      return (data as ItemMaster | null) ?? null;
    },
    []
  );

  // Server-side search fallback for the items dictionary page. Returns up to
  // 50 matches by part_no OR description, even if they're outside the local
  // window. Use only when the local search yields zero results.
  const searchServer = useCallback(
    async (query: string): Promise<ItemMaster[]> => {
      const q = query.trim();
      if (!q) return [];
      const like = `%${q}%`;
      const { data, error } = await supabase
        .from('items_master')
        .select('*')
        .or(`part_no.ilike.${like},description.ilike.${like}`)
        .order('part_no', { ascending: true })
        .limit(50);
      if (error) {
        console.error('[useItemsMaster.searchServer]', error);
        return [];
      }
      return (data ?? []) as ItemMaster[];
    },
    []
  );

  const createItem = useCallback(
    async (input: ItemMasterInput): Promise<ItemMaster | null> => {
      if (!user?.id) {
        toast({ title: t('error'), description: t('mustBeLoggedIn'), variant: 'destructive' });
        return null;
      }
      const existing = findByPartNo(input.part_no);
      if (existing) {
        toast({ title: t('error'), description: t('itemAlreadyExists'), variant: 'destructive' });
        return existing;
      }
      // Safety net: re-check on the server in case the local list is stale
      // or partially loaded (e.g., row count exceeded an earlier page size).
      const trimmed = input.part_no.trim();
      const { data: serverDup } = await supabase
        .from('items_master')
        .select('*')
        .ilike('part_no', trimmed)
        .limit(1)
        .maybeSingle();
      if (serverDup) {
        toast({ title: t('error'), description: t('itemAlreadyExists'), variant: 'destructive' });
        await fetchItems();
        return serverDup as ItemMaster;
      }
      const { data, error } = await supabase
        .from('items_master')
        .insert([{ ...input, part_no: trimmed, created_by: user.id }])
        .select()
        .single();
      if (error) {
        if (error.code === '23505' || /duplicate key|unique constraint/i.test(error.message)) {
          toast({ title: t('error'), description: t('itemAlreadyExists'), variant: 'destructive' });
          await fetchItems();
          return null;
        }
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return null;
      }
      toast({ title: t('success'), description: t('itemCreated') });
      return data as ItemMaster;
    },
    [user?.id, toast, t, findByPartNo, fetchItems]
  );

  const updateItem = useCallback(
    async (id: string, input: Partial<ItemMasterInput>) => {
      const payload = { ...input };
      if (payload.part_no) payload.part_no = payload.part_no.trim();
      const { data, error } = await supabase
        .from('items_master')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return null;
      }
      toast({ title: t('success'), description: t('itemUpdated') });
      return data as ItemMaster;
    },
    [toast, t]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('items_master').delete().eq('id', id);
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return false;
      }
      toast({ title: t('success'), description: t('itemDeleted') });
      return true;
    },
    [toast, t]
  );

  const toggleActive = useCallback(
    async (id: string, active: boolean) => updateItem(id, { is_active: active } as Partial<ItemMasterInput>),
    [updateItem]
  );

  return {
    items,
    loading,
    totalCount,
    refetch: fetchItems,
    findByPartNo,
    findByPartNoServer,
    searchServer,
    createItem,
    updateItem,
    deleteItem,
    toggleActive,
  };
}

export function useItemReceiptsCount(itemIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (itemIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('box_receipts')
        .select('item_id')
        .is('deleted_at', null)
        .in('item_id', itemIds);
      if (cancelled || error || !data) return;
      const map: Record<string, number> = {};
      for (const row of data as Array<{ item_id: string | null }>) {
        if (!row.item_id) continue;
        map[row.item_id] = (map[row.item_id] || 0) + 1;
      }
      setCounts(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [itemIds.join(',')]);

  return counts;
}