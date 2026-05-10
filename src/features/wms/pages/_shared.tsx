import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsListShell, type Column, type WmsRowBase } from '../components';

export function GenericListPage<T extends WmsRowBase>(props: {
  table: string;
  select?: string;
  titleKey: string;
  subtitleKey?: string;
  columns: Column<T>[];
  searchKeys?: (keyof T)[];
  orderBy?: { column: string; ascending?: boolean };
  filterDeleted?: boolean;
  emptyTitleKey?: string;
  emptyHintKey?: string;
}) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const sb = supabase as unknown as { from: (t: string) => unknown };
      type C = {
        select: (s: string) => C;
        is: (c: string, v: null) => C;
        order: (c: string, o: { ascending: boolean }) => C;
        limit: (n: number) => Promise<{ data: T[] | null; error: unknown }>;
        then: Promise<{ data: T[] | null; error: unknown }>['then'];
      };
      let q = (sb.from(props.table) as unknown as C).select(props.select ?? '*');
      if (props.filterDeleted) q = q.is('deleted_at', null);
      if (props.orderBy) q = q.order(props.orderBy.column, { ascending: props.orderBy.ascending ?? false });
      const res = (await (q as unknown as Promise<{ data: T[] | null }>));
      if (!cancelled) {
        setRows(res.data ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [props.table, props.select, props.filterDeleted, props.orderBy?.column, props.orderBy?.ascending]);

  return (
    <WmsListShell<T>
      title={t(props.titleKey)}
      subtitle={props.subtitleKey ? t(props.subtitleKey) : undefined}
      rows={rows}
      columns={props.columns}
      loading={loading}
      searchKeys={props.searchKeys}
      searchPlaceholder={t('wms.common.search-placeholder')}
      emptyTitle={props.emptyTitleKey ? t(props.emptyTitleKey) : undefined}
      emptyHint={props.emptyHintKey ? t(props.emptyHintKey) : undefined}
    />
  );
}
