import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { wmsToast as toast } from '@/lib/wmsToast';

export interface StockCount {
  id: string;
  count_no: string;
  count_date: string;
  warehouse_id: string;
  status: 'draft' | 'in_progress' | 'submitted' | 'posted' | 'cancelled';
  notes: string | null;
  total_variance_qty: number;
  total_variance_value: number;
  created_at: string;
}

export interface StockCountLine {
  id: string;
  count_id: string;
  line_no: number;
  item_id: string;
  expected_qty: number;
  counted_qty: number;
  variance_qty: number;
  unit_cost: number;
  remarks: string | null;
}

export function useStockCounts() {
  const [rows, setRows] = useState<StockCount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stock_counts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows(((data as any) || []) as StockCount[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (warehouse_id: string, notes?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('stock_counts')
      .insert({ warehouse_id, notes, created_by: user?.id, status: 'in_progress' })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    toast.success('تم الإنشاء');
    await load();
    return data as any as StockCount;
  };

  return { rows, loading, reload: load, create };
}

export function useStockCountLines(countId: string | null) {
  const [lines, setLines] = useState<(StockCountLine & { part_no?: string; description?: string })[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!countId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('stock_count_lines')
      .select('*, items_master(part_no, description, name_ar)')
      .eq('count_id', countId)
      .order('line_no');
    if (error) toast.error(error.message);
    setLines(((data as any) || []).map((l: any) => ({
      ...l,
      part_no: l.items_master?.part_no,
      description: l.items_master?.name_ar || l.items_master?.description,
    })));
    setLoading(false);
  }, [countId]);

  useEffect(() => { load(); }, [load]);

  const upsertCount = async (item_id: string, counted_qty: number, expected_qty = 0) => {
    if (!countId) return false;
    const { data: { user } } = await supabase.auth.getUser();
    const nextLine = lines.length + 1;
    const { error } = await supabase.from('stock_count_lines').upsert(
      { count_id: countId, item_id, counted_qty, expected_qty, line_no: nextLine, counted_by: user?.id, counted_at: new Date().toISOString() },
      { onConflict: 'count_id,item_id,location_id' as any }
    );
    if (error) { toast.error(error.message); return false; }
    await load();
    return true;
  };

  const removeLine = async (id: string) => {
    const { error } = await supabase.from('stock_count_lines').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  return { lines, loading, reload: load, upsertCount, removeLine };
}