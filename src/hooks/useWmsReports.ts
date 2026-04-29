import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LowStockItem {
  item_id: string;
  part_no: string;
  description: string;
  min_qty: number;
  total_qty: number;
}

export interface StockSummaryRow {
  item_id: string;
  part_no: string;
  description: string;
  unit: string;
  min_qty: number | null;
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name_ar: string;
  warehouse_name_en: string;
  location_id: string | null;
  location_code: string | null;
  qty: number;
  last_movement_at: string | null;
}

export function useLowStock() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => Promise<{ data: LowStockItem[] | null }>;
      };
    }).from('inv_low_stock').select('*');
    setItems((data ?? []) as LowStockItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { items, loading, refetch: fetch };
}

export function useStockSummary() {
  const [rows, setRows] = useState<StockSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          order: (c: string) => Promise<{ data: StockSummaryRow[] | null }>;
        };
      };
    }).from('inv_stock_summary').select('*').order('part_no');
    setRows((data ?? []) as StockSummaryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { rows, loading, refetch: fetch };
}

export interface WmsKpis {
  totalItems: number;
  totalLocations: number;
  todayMovements: number;
  lowStockCount: number;
  totalCustody: number;
}

export function useWmsKpis() {
  const [kpis, setKpis] = useState<WmsKpis>({ totalItems: 0, totalLocations: 0, todayMovements: 0, lowStockCount: 0, totalCustody: 0 });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [items, locs, movs, low, cust] = await Promise.all([
      supabase.from('items_master').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('inv_locations').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('inv_transactions').select('id', { count: 'exact', head: true }).eq('txn_date', today).is('deleted_at', null),
      (supabase as unknown as { from: (t: string) => { select: (s: string, o?: object) => Promise<{ count: number | null }> } })
        .from('inv_low_stock').select('item_id', { count: 'exact', head: true }),
      supabase.from('inv_custody').select('id', { count: 'exact', head: true }).gt('qty', 0),
    ]);
    setKpis({
      totalItems: items.count ?? 0,
      totalLocations: locs.count ?? 0,
      todayMovements: movs.count ?? 0,
      lowStockCount: low.count ?? 0,
      totalCustody: cust.count ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { kpis, loading, refetch: fetch };
}