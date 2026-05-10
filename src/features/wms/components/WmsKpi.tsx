import type { ReactNode, CSSProperties } from 'react';

type Tone = 'accent' | 'green' | 'red' | 'yellow' | 'purple' | 'teal';

const TONE_VAR: Record<Tone, string> = {
  accent: 'hsl(var(--wms-accent))',
  green:  'hsl(var(--wms-green))',
  red:    'hsl(var(--wms-red))',
  yellow: 'hsl(var(--wms-yellow))',
  purple: 'hsl(var(--wms-purple))',
  teal:   'hsl(var(--wms-teal))',
};

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: { dir: 'up' | 'down' | 'warn'; text: string };
  tone?: Tone;
}

export function WmsKpi({ label, value, hint, trend, tone = 'accent' }: Props) {
  const style = { '--wms-stat-accent': TONE_VAR[tone] } as CSSProperties;
  return (
    <div className="wms-stat" style={style}>
      <div className="wms-stat-label">{label}</div>
      <div className="wms-stat-value">{value}</div>
      {hint && <div className="wms-stat-label">{hint}</div>}
      {trend && <div className={`wms-stat-trend ${trend.dir}`}>{trend.text}</div>}
    </div>
  );
}