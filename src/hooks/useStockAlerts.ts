import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StockAlertRow {
  item_id: string;
  part_no: string;
  description: string;
  name_ar: string | null;
  min_qty: number | null;
  max_qty: number | null;
  reorder_qty: number | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  qty_on_hand: number;
  alert_level: 'out_of_stock' | 'below_min' | 'reorder' | 'above_max' | 'ok';
}

export function useStockAlerts() {
  const [rows, setRows] = useState<StockAlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('v_low_stock_alerts' as any)
      .select('*')
      .neq('alert_level', 'ok')
      .order('alert_level');
    setRows(((data as any) || []) as StockAlertRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { rows, loading, reload: load };
}