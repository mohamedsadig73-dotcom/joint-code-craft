/**
 * WMS Pro Toast helpers — unified API on top of sonner.
 * Use these instead of importing `toast` directly so all messages share
 * the same tone, layout and durations.
 *
 * Usage:
 *   import { wmsToast } from '@/lib/wmsToast';
 *   wmsToast.success('Saved');
 *   wmsToast.error('Failed', { description: e.message });
 *   const id = wmsToast.loading('Uploading…');
 *   wmsToast.success('Done', { id });
 */
import { toast as sonner, type ExternalToast } from 'sonner';

type Opts = ExternalToast & { description?: string };

const DEFAULTS: ExternalToast = {
  duration: 3500,
  className: 'wms-toast',
};
const ERROR_DEFAULTS: ExternalToast = { ...DEFAULTS, duration: 5000 };

export const wmsToast = {
  success: (msg: string, o?: Opts) => sonner.success(msg, { ...DEFAULTS, ...o }),
  error:   (msg: string, o?: Opts) => sonner.error(msg,   { ...ERROR_DEFAULTS, ...o }),
  warn:    (msg: string, o?: Opts) => sonner.warning(msg, { ...DEFAULTS, ...o }),
  info:    (msg: string, o?: Opts) => sonner.info(msg,    { ...DEFAULTS, ...o }),
  loading: (msg: string, o?: Opts) => sonner.loading(msg, { ...DEFAULTS, ...o }),
  dismiss: (id?: string | number) => sonner.dismiss(id),
  /** Show success on resolve, error on reject; auto manages loading state. */
  promise: <T,>(p: Promise<T>, msgs: { loading: string; success: string | ((d: T) => string); error: string | ((e: any) => string) }) =>
    sonner.promise(p, { ...DEFAULTS, ...msgs }),
};

export default wmsToast;
