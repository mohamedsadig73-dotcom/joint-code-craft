import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Context-aware Floating Action Button.
 *
 * Each page may register its primary action via `useRegisterFabAction()`.
 * The global <FAB /> reads from this context and renders the active action.
 * If no page registers anything, the FAB hides itself.
 *
 * Sprint 1 (P1) of the architectural refactor — replaces the legacy
 * hardcoded "Create Declaration" FAB.
 */

export interface FabAction {
  /** Stable id used to deregister on unmount */
  id: string;
  /** Accessible label / tooltip */
  label: string;
  /** Icon component (defaults to Plus in <FAB />) */
  icon?: LucideIcon;
  /** Callback fired when the FAB is pressed */
  onClick: () => void;
}

interface FabContextValue {
  action: FabAction | null;
  register: (a: FabAction) => void;
  deregister: (id: string) => void;
}

const FabContext = createContext<FabContextValue | null>(null);

export function FabProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<FabAction | null>(null);

  const register = useCallback((a: FabAction) => {
    setAction(a);
  }, []);

  const deregister = useCallback((id: string) => {
    setAction((current) => (current && current.id === id ? null : current));
  }, []);

  return (
    <FabContext.Provider value={{ action, register, deregister }}>
      {children}
    </FabContext.Provider>
  );
}

export function useFabContext(): FabContextValue {
  const ctx = useContext(FabContext);
  if (!ctx) {
    // Safe no-op when provider is absent (e.g. login pages).
    return {
      action: null,
      register: () => {},
      deregister: () => {},
    };
  }
  return ctx;
}