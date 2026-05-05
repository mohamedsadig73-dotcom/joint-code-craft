import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';
import { useFabContext } from '@/contexts/FabContext';

interface FABProps {
  className?: string;
}

/**
 * Global context-aware Floating Action Button.
 *
 * Renders ONLY when a page has registered a primary action via
 * `useRegisterFabAction()`. Sprint 1 (P1) refactor — no business
 * logic lives here anymore.
 *
 * The legacy `onSuccess` prop is intentionally removed; pages now own
 * their action's `onClick` and refresh logic directly.
 */
export function FAB({ className }: FABProps) {
  const { action } = useFabContext();
  if (!action) return null;

  const Icon = action.icon ?? Plus;

  return (
    <div
      className={cn('fixed end-4 md:end-6 z-50 print:hidden', className)}
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <Button
        size="lg"
        aria-label={action.label}
        title={action.label}
        onClick={() => {
          hapticLight();
          action.onClick();
        }}
        className="rounded-full w-14 h-14 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105 active:scale-95 tap-highlight-none"
      >
        <Icon className="w-6 h-6" />
      </Button>
    </div>
  );
}
