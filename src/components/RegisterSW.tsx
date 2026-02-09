import { useEffect } from 'react';

/**
 * This component only cleans up old service workers.
 * No new service workers are registered - the app loads directly from the network.
 */
export function RegisterSW() {
  useEffect(() => {
    // Unregister ALL service workers on mount
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => {
          reg.unregister().then(() => {
            console.log('[DTS] Old SW unregistered:', reg.scope);
          });
        });
      });
    }

    // Clear ALL caches on mount
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
        if (names.length > 0) {
          console.log('[DTS] Cleared', names.length, 'old caches');
        }
      });
    }
  }, []);

  return null;
}
