import type { ReactNode } from 'react';

type Tone = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'teal' | 'gray';

export function WmsBadge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`wms-badge wms-badge-${tone}`}>{children}</span>;
}