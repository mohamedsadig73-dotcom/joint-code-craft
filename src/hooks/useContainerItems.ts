import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';

export interface ContainerItemRow {
  id: string;
  container_id: string;
  receipt_id: string;
  added_at: string;
  added_by: string | null;
  receipt: BoxReceipt;
}

/**
 * Loads all items linked to a container, joined with their full box_receipt.
 */
export function useContainerItems(containerId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = useState<ContainerItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!containerId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('container_items')
      .select('*, receipt:box_receipts(*)')
      .eq('container_id', containerId)
      .order('added_at', { ascending: true });
    if (error) {
      console.error('[useContainerItems]', error);
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
      setItems([]);
    } else {
      const rows = (data ?? []).filter((r: any) => r.receipt && !r.receipt.deleted_at) as ContainerItemRow[];
      setItems(rows);
    }
    setLoading(false);
  }, [containerId, toast, t]);

  useEffect(() => {
    fetchItems();
    if (!containerId) return;
    const channel = supabase
      .channel(`container_items_${containerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'container_items', filter: `container_id=eq.${containerId}` },
        () => fetchItems()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [containerId, fetchItems]);

  const boxedItems = useMemo(
    () => items.filter((i) => i.receipt.packing_type === 'boxed'),
    [items]
  );
  const looseItems = useMemo(
    () => items.filter((i) => i.receipt.packing_type === 'loose'),
    [items]
  );

  /** Group boxed items by box_no for display in the manifest */
  const boxedGroups = useMemo(() => {
    const map = new Map<string, ContainerItemRow[]>();
    for (const it of boxedItems) {
      const key = it.receipt.box_no || '—';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries()).map(([box_no, rows]) => ({
      box_no,
      destination: rows[0]?.receipt.destination ?? 'unspecified',
      items: rows,
      total_qty: rows.reduce((s, r) => s + (r.receipt.qty || 0), 0),
    }));
  }, [boxedItems]);

  const addReceipts = useCallback(
    async (receiptIds: string[]) => {
      if (!containerId || !user?.id || receiptIds.length === 0) return false;
      const rows = receiptIds.map((rid) => ({
        container_id: containerId,
        receipt_id: rid,
        added_by: user.id,
      }));
      const { error } = await supabase.from('container_items').insert(rows);
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return false;
      }
      toast({ title: t('success'), description: `${receiptIds.length} ${t('itemsAddedToContainer')}` });
      return true;
    },
    [containerId, user?.id, toast, t]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const { error } = await supabase.from('container_items').delete().eq('id', itemId);
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return false;
      }
      toast({ title: t('success'), description: t('itemRemovedFromContainer') });
      return true;
    },
    [toast, t]
  );

  return {
    items,
    boxedItems,
    looseItems,
    boxedGroups,
    loading,
    refetch: fetchItems,
    addReceipts,
    removeItem,
  };
}

/**
 * Loads receipts available to be added to a given container.
 * - Excludes receipts already in this container
 * - Excludes receipts already linked to ANOTHER container
 * - Filters by destination (matching the container's destination, or unspecified)
 */
export function useAvailableReceipts(opts: {
  containerId: string | undefined;
  destination: 'morocco' | 'uzbekistan' | 'unspecified' | null;
  packingType: 'boxed' | 'loose';
}) {
  const { containerId, destination, packingType } = opts;
  const [available, setAvailable] = useState<BoxReceipt[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAvailable = useCallback(async () => {
    if (!containerId) {
      setAvailable([]);
      return;
    }
    setLoading(true);

    // 1. Get all receipt IDs already linked to ANY container
    const { data: linked } = await supabase
      .from('container_items')
      .select('receipt_id');
    const linkedIds = new Set((linked ?? []).map((r: any) => r.receipt_id));

    // 2. Fetch candidate receipts
    let q = supabase
      .from('box_receipts')
      .select('*')
      .is('deleted_at', null)
      .eq('packing_type', packingType)
      .order('created_at', { ascending: false });

    if (destination && destination !== 'unspecified') {
      // Match container destination OR unspecified items (can be assigned anywhere)
      q = q.in('destination', [destination, 'unspecified']);
    }

    const { data, error } = await q;
    if (error) {
      console.error('[useAvailableReceipts]', error);
      setAvailable([]);
    } else {
      const rows = (data ?? []) as BoxReceipt[];
      setAvailable(rows.filter((r) => !linkedIds.has(r.id)));
    }
    setLoading(false);
  }, [containerId, destination, packingType]);

  useEffect(() => {
    fetchAvailable();
  }, [fetchAvailable]);

  return { available, loading, refetch: fetchAvailable };
}