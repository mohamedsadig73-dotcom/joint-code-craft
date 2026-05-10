import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'success';
type Size = 'md' | 'sm';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function WmsButton({ variant = 'ghost', size = 'md', className, ...rest }: Props) {
  const cls = [
    'wms-btn',
    `wms-btn-${variant}`,
    size === 'sm' ? 'wms-btn-sm' : '',
    className ?? '',
  ].filter(Boolean).join(' ');
  return <button {...rest} className={cls} />;
}
