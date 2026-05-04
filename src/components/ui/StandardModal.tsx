import { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * StandardModal — unified modal in WMS Pro style.
 *
 * Layout:
 *   ┌──────────────────────────────────────┐
 *   │ Title                            ✕   │  sticky header
 *   ├──────────────────────────────────────┤
 *   │  body (alerts, FormSections…)        │  scroll area
 *   ├──────────────────────────────────────┤
 *   │  [Save]  [Cancel]                    │  sticky footer
 *   └──────────────────────────────────────┘
 *
 * Designed to coexist with shadcn Dialog (uses it under the hood) so all
 * radix open-state, focus-trap and overlay logic keeps working.
 */

export interface StandardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Primary CTA shown in the footer */
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  /** Hide the footer entirely (e.g. read-only or custom footer in body) */
  hideFooter?: boolean;
  /** Replace footer entirely (custom buttons) */
  customFooter?: ReactNode;
  /** Replace primary CTA variant */
  submitVariant?: 'default' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Wrap body in a <form> with this id so Enter submits */
  formId?: string;
  className?: string;
}

const SIZE: Record<NonNullable<StandardModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export function StandardModal({
  open, onOpenChange,
  title, description,
  children,
  onSubmit, submitLabel, cancelLabel,
  submitting = false, submitDisabled = false,
  hideFooter = false, customFooter,
  submitVariant = 'default',
  size = 'md',
  formId,
  className,
}: StandardModalProps) {
  const { t } = useLanguage();

  const Body = (
    <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 gap-0 flex flex-col max-h-[90vh] overflow-hidden border-[hsl(var(--wms-border))]',
          'bg-[hsl(var(--wms-bg2))] text-[hsl(var(--wms-text))]',
          SIZE[size],
          className,
        )}
      >
        <DialogHeader className="px-5 py-3.5 border-b border-[hsl(var(--wms-border))] flex-row items-center justify-between space-y-0 sticky top-0 bg-[hsl(var(--wms-bg2))] z-10">
          <div className="min-w-0 flex-1 text-start">
            <DialogTitle className="text-[15px] font-semibold text-[hsl(var(--wms-text))] truncate">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-[12px] text-[hsl(var(--wms-text3))] mt-0.5 truncate">
                {description}
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        {formId ? (
          <form
            id={formId}
            onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            {Body}
          </form>
        ) : Body}

        {!hideFooter && (
          customFooter ? (
            <DialogFooter className="px-5 py-3 border-t border-[hsl(var(--wms-border))] bg-[hsl(var(--wms-bg2))] sticky bottom-0 flex-row gap-2 sm:justify-start">
              {customFooter}
            </DialogFooter>
          ) : (
            <DialogFooter className="px-5 py-3 border-t border-[hsl(var(--wms-border))] bg-[hsl(var(--wms-bg2))] sticky bottom-0 flex-row gap-2 sm:justify-start">
              <Button
                type={formId ? 'submit' : 'button'}
                form={formId}
                variant={submitVariant === 'destructive' ? 'destructive' : submitVariant === 'success' ? 'success' : 'default'}
                onClick={formId ? undefined : onSubmit}
                disabled={submitting || submitDisabled}
                className="gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitLabel || t('save') || 'حفظ'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                {cancelLabel || t('cancel') || 'إلغاء'}
              </Button>
            </DialogFooter>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}