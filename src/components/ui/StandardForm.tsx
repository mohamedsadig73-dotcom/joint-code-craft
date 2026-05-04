import { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionDivider } from './SectionDivider';

/* ------------------------------------------------------------------ */
/* FormSection — labeled group with grid of fields                    */
/* ------------------------------------------------------------------ */
export interface FormSectionProps {
  title?: string;
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}

const COLS: Record<1 | 2 | 3, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
};

export function FormSection({ title, columns = 2, children, className }: FormSectionProps) {
  return (
    <div className={cn('mb-4', className)}>
      {title && <SectionDivider>{title}</SectionDivider>}
      <div className={cn('grid gap-3', COLS[columns])}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FormField — label + input slot + optional hint                     */
/* ------------------------------------------------------------------ */
export interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
  /** Make the field span the full row in a multi-column grid */
  fullWidth?: boolean;
}

export function FormField({ label, required, hint, children, className, fullWidth }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'sm:col-span-2 md:col-span-3', className)}>
      <label className="text-[12px] font-medium text-[hsl(var(--wms-text2))] flex items-center gap-1">
        {label}
        {required && <span className="text-[hsl(var(--wms-red))]">*</span>}
      </label>
      {children}
      {hint && <span className="text-[11px] text-[hsl(var(--wms-text3))]">{hint}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* InputGroup — input + button glued together                         */
/* ------------------------------------------------------------------ */
export function InputGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-stretch [&>*:first-child]:rounded-e-none [&>*:last-child]:rounded-s-none [&>*:not(:first-child)]:-ms-px', className)}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* GeneratedPreview — boxed read-only preview (e.g. auto-built name)  */
/* ------------------------------------------------------------------ */
export function GeneratedPreview({ label, value, placeholder }: { label: string; value?: string | null; placeholder?: string }) {
  return (
    <div className="rounded-md border p-3 bg-[hsl(var(--wms-bg4))] border-[hsl(var(--wms-border2))]">
      <div className="text-[11px] font-medium text-[hsl(var(--wms-text3))] mb-1">{label}</div>
      <div className="text-sm font-semibold text-[hsl(var(--wms-accent))] min-h-[20px] font-mono break-words">
        {value || <span className="text-[hsl(var(--wms-text3))] font-normal">{placeholder || '—'}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StandardAlert — info/warn/success/danger inline alert              */
/* ------------------------------------------------------------------ */
export type AlertTone = 'info' | 'warn' | 'success' | 'danger';

const ALERT_STYLES: Record<AlertTone, { bg: string; text: string; border: string; Icon: typeof Info }> = {
  info:    { bg: 'bg-[hsl(var(--wms-accent-soft))]', text: 'text-[hsl(var(--wms-accent))]', border: 'border-[hsl(var(--wms-accent)_/_0.25)]', Icon: Info },
  warn:    { bg: 'bg-[hsl(var(--wms-yellow-soft))]', text: 'text-[hsl(var(--wms-yellow))]', border: 'border-[hsl(var(--wms-yellow)_/_0.25)]', Icon: AlertTriangle },
  success: { bg: 'bg-[hsl(var(--wms-green-soft))]',  text: 'text-[hsl(var(--wms-green))]',  border: 'border-[hsl(var(--wms-green)_/_0.25)]',  Icon: CheckCircle2 },
  danger:  { bg: 'bg-[hsl(var(--wms-red-soft))]',    text: 'text-[hsl(var(--wms-red))]',    border: 'border-[hsl(var(--wms-red)_/_0.25)]',    Icon: AlertCircle },
};

export function StandardAlert({ tone = 'info', children, className }: { tone?: AlertTone; children: ReactNode; className?: string }) {
  const s = ALERT_STYLES[tone];
  const Icon = s.Icon;
  return (
    <div className={cn('flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-[13px]', s.bg, s.text, s.border, className)}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FuzzyWarning — "X similar items found" callout                     */
/* ------------------------------------------------------------------ */
export function FuzzyWarning({ count, sampleNames }: { count: number; sampleNames?: string[] }) {
  if (count <= 0) return null;
  return (
    <StandardAlert tone="warn" className="mb-3">
      <span className="font-medium">تحذير:</span> وُجِد {count} صنف مشابه
      {sampleNames && sampleNames.length > 0 && (
        <span className="opacity-80"> — {sampleNames.slice(0, 3).join('، ')}</span>
      )}
      <span className="opacity-80"> — هل تريد إضافة جديد أم تعديل الموجود؟</span>
    </StandardAlert>
  );
}

/* ------------------------------------------------------------------ */
/* FormCode — monospace read-only code preview                        */
/* ------------------------------------------------------------------ */
export function FormCode({ value, placeholder }: { value?: string; placeholder?: string }) {
  return (
    <div className="rounded-md border px-3 py-2 bg-[hsl(var(--wms-bg3))] border-[hsl(var(--wms-border))] font-mono text-[12px] tracking-wider text-[hsl(var(--wms-accent))] min-h-[36px] flex items-center">
      {value || <span className="text-[hsl(var(--wms-text3))]">{placeholder || 'تلقائي'}</span>}
    </div>
  );
}