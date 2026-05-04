import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * Standardized entity form drawer (create / edit).
 * - Slides from the side (RTL-aware via shadcn `Sheet`).
 * - Sticky footer with Cancel + Save.
 * - Caller wires <form id={formId}> in `children` and binds submit; this avoids
 *   coupling submit logic to the drawer.
 */
export interface EntityFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** id to wire the footer Save button to the form via `form="..."` */
  formId: string;
  children: ReactNode;
  saving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Hide footer for view-only drawers. */
  readOnly?: boolean;
}

const SIZE_MAP: Record<NonNullable<EntityFormDrawerProps['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

export function EntityFormDrawer({
  open,
  onOpenChange,
  title,
  description,
  formId,
  children,
  saving = false,
  saveLabel,
  cancelLabel,
  size = 'md',
  readOnly = false,
}: EntityFormDrawerProps) {
  const { t } = useLanguage();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn('w-full flex flex-col p-0', SIZE_MAP[size])}
      >
        <SheetHeader className="px-6 pt-6 pb-3 border-b">
          <SheetTitle className="text-start">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-start">{description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {!readOnly && (
          <SheetFooter className="px-6 py-3 border-t flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {cancelLabel || t('cancel') || 'إلغاء'}
            </Button>
            <Button
              type="submit"
              form={formId}
              className="flex-1 sm:flex-none gap-2"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saveLabel || t('save') || 'حفظ'}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}