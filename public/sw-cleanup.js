// Force cleanup of old service workers - v3.0.0
// NO AUTO-REDIRECT - only clears caches, React Router handles routing
(function() {
  'use strict';
  
  var APP_VERSION = '3.0.0';
  var FORCE_CLEAR_KEY = 'dts-force-clear-v9';
  var CHECK_INTERVAL = 10000; // 10 seconds
  
  console.log('[DTS Cleanup v' + APP_VERSION + '] Initializing...');
  
  // Check if we need to force clear
  var lastClear = localStorage.getItem(FORCE_CLEAR_KEY);
  var needsClear = !lastClear || lastClear !== APP_VERSION;
  
  // Function to clear all caches WITHOUT redirecting
  function clearCachesOnly() {
    console.log('[DTS] Clearing caches...');
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        registrations.forEach(function(registration) {
          registration.unregister().then(function() {
            console.log('[DTS] Service Worker unregistered:', registration.scope);
          });
        });
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
        localStorage.setItem(FORCE_CLEAR_KEY, APP_VERSION);
      });
    }
  }
  
  // Force update function - clears caches and reloads current page
  function forceUpdate() {
    console.log('[DTS] Force update triggered...');
    clearCachesOnly();
    
    // Reload after a short delay to let caches clear
    setTimeout(function() {
      // Preserve current path when reloading
      window.location.reload();
    }, 500);
  }
  
  // Clear on first load if version mismatch - NO REDIRECT
  if (needsClear) {
    console.log('[DTS] Version mismatch detected, clearing caches...');
    clearCachesOnly();
  } else {
    console.log('[DTS] Version ' + APP_VERSION + ' already cleared');
  }
  
  // Check for updates when tab becomes visible
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      console.log('[DTS] Tab visible, checking for updates...');
      
      // Check if SW needs update
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
      }
    }
  });
  
  // Periodic update check
  setInterval(function() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
    }
  }, CHECK_INTERVAL);
  
  // Expose force update function globally
  window.dtsForceUpdate = forceUpdate;
  
  console.log('[DTS Cleanup] Ready. Call window.dtsForceUpdate() to force refresh.');
})();
