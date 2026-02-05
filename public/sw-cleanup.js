// Force cleanup of old service workers
(function() {
  'use strict';
  
  var APP_VERSION = '2.3.0';
  var FORCE_CLEAR_KEY = 'dts-force-clear-v2';
  
  console.log('[DTS Cleanup] Version:', APP_VERSION);
  
  // Check if we need to force clear
  var lastClear = localStorage.getItem(FORCE_CLEAR_KEY);
  var needsClear = !lastClear || lastClear !== APP_VERSION;
  
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
  
  // Clear all caches if needed or on first load
  if ('caches' in window && needsClear) {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('[DTS] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('[DTS] All caches cleared');
      localStorage.setItem(FORCE_CLEAR_KEY, APP_VERSION);
      
      // Reload after clearing
      if (sessionStorage.getItem('dts-cache-cleared') !== 'true') {
        sessionStorage.setItem('dts-cache-cleared', 'true');
        // Use cache-busting reload
        window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
      }
    });
  }
  
  // Also clear on visibility change (when user returns to tab)
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      console.log('[DTS] Tab became visible, checking for updates...');
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
      }
    }
  });
})();
