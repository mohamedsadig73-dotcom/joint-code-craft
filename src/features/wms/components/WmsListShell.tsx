import { useMemo, useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { WmsCard } from './WmsCard';
import { WmsToolbar } from './WmsToolbar';
import { WmsEmpty } from './WmsEmpty';

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

/**
 * Minimal shape for any row passed into WMS list components.
 * Keep this as loose as possible — only `id` is consumed internally.
 * Pages should extend this so Row/Item/Txn never trigger TS2344 again.
 */
export interface WmsRowBase {
  id?: string | number;
}

interface Props<T> {
  title?: string;
  subtitle?: string;
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  rightActions?: ReactNode;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyHint?: string;
}

export function WmsListShell<T extends WmsRowBase>({
  title, subtitle, rows, columns, loading, searchKeys, searchPlaceholder,
  rightActions, onRowClick, emptyTitle, emptyHint,
}: Props<T>) {
  const { t } = useLanguage();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term || !searchKeys?.length) return rows;
    return rows.filter((row) =>
      searchKeys.some((k) => String((row as Record<string, unknown>)[k as string] ?? '').toLowerCase().includes(term)),
    );
  }, [rows, q, searchKeys]);

  return (
    <WmsCard title={title} subtitle={subtitle}>
      <WmsToolbar
        search={searchKeys ? { value: q, onChange: setQ, placeholder: searchPlaceholder } : undefined}
      >
        {rightActions}
      </WmsToolbar>
      {loading ? (
        <div className="wms-empty">
          <div className="wms-empty-text">{t('wms.common.loading')}</div>
        </div>
      ) : filtered.length === 0 ? (
        <WmsEmpty title={emptyTitle} hint={emptyHint} />
      ) : (
        <div className="wms-table-wrap">
          <table className="wms-table">
            <thead>
              <tr>{columns.map((c) => <th key={c.key}>{c.header}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={(row as { id?: string }).id ?? i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={c.className}>{c.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WmsCard>
  );
}
