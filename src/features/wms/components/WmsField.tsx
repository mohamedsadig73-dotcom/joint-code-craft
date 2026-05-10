import type {
  InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode,
} from 'react';

interface FieldShellProps { label?: ReactNode; children: ReactNode; }
export function WmsField({ label, children }: FieldShellProps) {
  return (
    <label className="wms-field">
      {label && <span className="wms-field-label">{label}</span>}
      {children}
    </label>
  );
}

export function WmsInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={`wms-input ${className ?? ''}`} />;
}

export function WmsSelect(
  props: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode },
) {
  const { className, children, ...rest } = props;
  return <select {...rest} className={`wms-select ${className ?? ''}`}>{children}</select>;
}

export function WmsTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={`wms-textarea ${className ?? ''}`} />;
}