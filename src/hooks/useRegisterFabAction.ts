import { useEffect, useId } from 'react';
import { useFabContext, FabAction } from '@/contexts/FabContext';

/**
 * Register a primary floating-action for the current page.
 * Automatically deregisters on unmount.
 *
 * Pass `null` to opt out (e.g. when a feature flag is off).
 *
 * @example
 *   useRegisterFabAction({
 *     label: t('createReceiptVoucher'),
 *     icon: Plus,
 *     onClick: () => setOpen(true),
 *   });
 */
export function useRegisterFabAction(action: Omit<FabAction, 'id'> | null) {
  const { register, deregister } = useFabContext();
  const generatedId = useId();

  useEffect(() => {
    if (!action) return;
    const id = generatedId;
    register({ ...action, id });
    return () => deregister(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action?.label, action?.onClick, action?.icon]);
}