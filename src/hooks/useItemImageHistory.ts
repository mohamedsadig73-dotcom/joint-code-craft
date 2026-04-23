import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ItemImageHistoryEntry {
  id: string;
  item_id: string;
  action: 'upload' | 'replace' | 'remove';
  old_path: string | null;
  new_path: string | null;
  changed_by: string | null;
  changed_at: string;
  changed_by_username?: string | null;
  item_part_no?: string | null;
}

interface Options {
  itemId?: string;
  limit?: number;
}

export function useItemImageHistory({ itemId, limit = 100 }: Options = {}) {
  const [entries, setEntries] = useState<ItemImageHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('item_image_history' as never)
      .select(
        `id, item_id, action, old_path, new_path, changed_by, changed_at,
         items_master:item_id ( part_no ),
         profiles:changed_by ( username )` as never
      )
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (itemId) {
      query = (query as ReturnType<typeof query.eq>).eq('item_id', itemId);
    }
    const { data, error } = await query;
    if (!error && data) {
      const rows = (data as unknown as Array<{
        id: string;
        item_id: string;
        action: 'upload' | 'replace' | 'remove';
        old_path: string | null;
        new_path: string | null;
        changed_by: string | null;
        changed_at: string;
        items_master: { part_no: string } | null;
        profiles: { username: string } | null;
      }>).map((r) => ({
        id: r.id,
        item_id: r.item_id,
        action: r.action,
        old_path: r.old_path,
        new_path: r.new_path,
        changed_by: r.changed_by,
        changed_at: r.changed_at,
        changed_by_username: r.profiles?.username ?? null,
        item_part_no: r.items_master?.part_no ?? null,
      }));
      setEntries(rows);
    }
    setLoading(false);
  }, [itemId, limit]);

  useEffect(() => {
    fetchEntries();
    const channel = supabase
      .channel(`item_image_history_${itemId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'item_image_history' },
        () => fetchEntries()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntries, itemId]);

  return { entries, loading, refetch: fetchEntries };
}
