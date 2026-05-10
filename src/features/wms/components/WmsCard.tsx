import type { ReactNode } from 'react';

interface Props {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function WmsCard({ title, subtitle, actions, children, className }: Props) {
  return (
    <section className={`wms-card ${className ?? ''}`}>
      {(title || actions) && (
        <header className="wms-card-header">
          <div>
            {title && <div className="wms-card-title">{title}</div>}
            {subtitle && <div className="wms-card-sub">{subtitle}</div>}
          </div>
          {actions && <div style={{ display: 'flex', gap: '.5rem' }}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}