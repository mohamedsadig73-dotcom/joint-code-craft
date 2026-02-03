// Force cleanup of old service workers
(function() {
  'use strict';
  
  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (let registration of registrations) {
        registration.unregister().then(function() {
          console.log('[DTS] Service Worker unregistered');
        });
      }
    });
  }
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('[DTS] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('[DTS] All caches cleared');
      // Reload after clearing
      if (sessionStorage.getItem('dts-cache-cleared') !== 'true') {
        sessionStorage.setItem('dts-cache-cleared', 'true');
        window.location.reload(true);
      }
    });
  }
})();
