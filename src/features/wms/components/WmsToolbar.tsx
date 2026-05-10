import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

interface Props {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  children?: ReactNode;
}

export function WmsToolbar({ search, children }: Props) {
  return (
    <div className="wms-toolbar">
      {search && (
        <div className="wms-search" style={{ minWidth: 240 }}>
          <Search size={14} />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder}
          />
        </div>
      )}
      <div className="wms-toolbar-spacer" />
      {children}
    </div>
  );
}