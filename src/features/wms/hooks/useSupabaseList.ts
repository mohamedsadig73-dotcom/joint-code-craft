import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UseListOptions {
  table: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  filterDeleted?: boolean; // adds .is('deleted_at', null)
  limit?: number;
}

export function useSupabaseList<T = Record<string, unknown>>(opts: UseListOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    let q = (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          is?: (c: string, v: null) => unknown;
          order?: (c: string, o: { ascending: boolean }) => unknown;
          limit?: (n: number) => unknown;
        };
      };
    }).from(opts.table).select(opts.select ?? '*') as unknown as {
      is: (c: string, v: null) => unknown;
      order: (c: string, o: { ascending: boolean }) => unknown;
      limit: (n: number) => unknown;
    };
    if (opts.filterDeleted) q = (q as { is: typeof q['is'] }).is('deleted_at', null) as typeof q;
    if (opts.orderBy)
      q = (q as { order: typeof q['order'] }).order(opts.orderBy.column, {
        ascending: opts.orderBy.ascending ?? false,
      }) as typeof q;
    if (opts.limit) q = (q as { limit: typeof q['limit'] }).limit(opts.limit) as typeof q;
    const res = (await (q as unknown as Promise<{ data: T[] | null; error: { message: string } | null }>));
    if (res.error) setError(res.error.message);
    else setData((res.data ?? []) as T[]);
    setLoading(false);
  }, [opts.table, opts.select, opts.orderBy?.column, opts.orderBy?.ascending, opts.filterDeleted, opts.limit]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}