import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BoxSummaryRow {
  box_no: string;
  suppliers: string;
  destination: 'morocco' | 'uzbekistan' | 'unspecified';
  items_count: number;
  total_qty: number;
  first_date: string;
  last_date: string;
  last_updated: string;
}

export function useBoxSummary() {
  const [summary, setSummary] = useState<BoxSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('box_summary')
      .select('*')
      .order('box_no', { ascending: true });

    if (error) {
      console.error('[useBoxSummary]', error);
    } else {
      setSummary((data ?? []) as BoxSummaryRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSummary();
    const channel = supabase
      .channel('box_summary_refresh')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'box_receipts' },
        () => fetchSummary()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSummary]);

  return { summary, loading, refetch: fetchSummary };
}