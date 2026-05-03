import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ItemSupplierLink {
  id: string;
  item_id: string;
  supplier_id: string;
  supplier_item_code: string | null;
  purchase_price: number;
  is_preferred: boolean;
  notes: string | null;
}

export interface ItemWarehouseLink {
  id: string;
  item_id: string;
  warehouse_id: string;
  is_default: boolean;
  min_qty: number | null;
  max_qty: number | null;
  notes: string | null;
}

export function useItemSuppliers(itemId?: string | null) {
  const [links, setLinks] = useState<ItemSupplierLink[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const fetch = useCallback(async () => {
    if (!itemId) { setLinks([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('item_suppliers' as never)
      .select('*')
      .eq('item_id', itemId);
    if (error) toast({ title: t('error'), description: error.message, variant: 'destructive' });
    setLinks((data ?? []) as ItemSupplierLink[]);
    setLoading(false);
  }, [itemId, toast, t]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsert = useCallback(async (row: Partial<ItemSupplierLink>) => {
    const { error } = await supabase.from('item_suppliers' as never).upsert(row as never, { onConflict: 'item_id,supplier_id' });
    if (error) { toast({ title: t('error'), description: error.message, variant: 'destructive' }); return false; }
    await fetch();
    return true;
  }, [fetch, toast, t]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('item_suppliers' as never).delete().eq('id', id);
    if (error) { toast({ title: t('error'), description: error.message, variant: 'destructive' }); return false; }
    await fetch();
    return true;
  }, [fetch, toast, t]);

  return { links, loading, upsert, remove, refetch: fetch };
}

export function useItemWarehouses(itemId?: string | null) {
  const [links, setLinks] = useState<ItemWarehouseLink[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const fetch = useCallback(async () => {
    if (!itemId) { setLinks([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('item_warehouses' as never)
      .select('*')
      .eq('item_id', itemId);
    if (error) toast({ title: t('error'), description: error.message, variant: 'destructive' });
    setLinks((data ?? []) as ItemWarehouseLink[]);
    setLoading(false);
  }, [itemId, toast, t]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsert = useCallback(async (row: Partial<ItemWarehouseLink>) => {
    const { error } = await supabase.from('item_warehouses' as never).upsert(row as never, { onConflict: 'item_id,warehouse_id' });
    if (error) { toast({ title: t('error'), description: error.message, variant: 'destructive' }); return false; }
    await fetch();
    return true;
  }, [fetch, toast, t]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('item_warehouses' as never).delete().eq('id', id);
    if (error) { toast({ title: t('error'), description: error.message, variant: 'destructive' }); return false; }
    await fetch();
    return true;
  }, [fetch, toast, t]);

  return { links, loading, upsert, remove, refetch: fetch };
}

export function useSuppliersList() {
  const [list, setList] = useState<Array<{ id: string; code: string; name_ar: string; name_en: string | null }>>([]);
  useEffect(() => {
    supabase.from('suppliers').select('id,code,name_ar,name_en').eq('is_active', true).order('code')
      .then(({ data }) => setList((data ?? []) as never));
  }, []);
  return list;
}