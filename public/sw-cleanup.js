// Force cleanup of old service workers - v2.5.0
(function() {
  'use strict';
  
  var APP_VERSION = '2.5.0';
  var FORCE_CLEAR_KEY = 'dts-force-clear-v4';
  var CHECK_INTERVAL = 5000; // Check every 5 seconds (more aggressive)
  
  console.log('[DTS Cleanup v' + APP_VERSION + '] Initializing...');
  
  // Check if we need to force clear
  var lastClear = localStorage.getItem(FORCE_CLEAR_KEY);
  var needsClear = !lastClear || lastClear !== APP_VERSION;
  
  // Function to clear all caches and reload
  function forceCleanAndReload() {
    console.log('[DTS] Force clean triggered...');
    
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
        
        // Reload with cache busting
        if (sessionStorage.getItem('dts-cleanup-reload') !== 'true') {
          sessionStorage.setItem('dts-cleanup-reload', 'true');
          var reloadUrl = window.location.origin + window.location.pathname + '?v=' + Date.now();
          window.location.replace(reloadUrl);
        }
      });
    }
  }
  
  // Clear on first load if version mismatch
  if (needsClear) {
    console.log('[DTS] Version mismatch detected, clearing caches...');
    forceCleanAndReload();
  } else {
    console.log('[DTS] Version ' + APP_VERSION + ' already cleared');
    sessionStorage.removeItem('dts-cleanup-reload');
  }
  
  // Check for updates when tab becomes visible
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      console.log('[DTS] Tab visible, checking for updates...');
      
      // Check if SW needs update
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
      }
      
      // Also try to fetch fresh version
      fetch('/?check=' + Date.now(), { cache: 'no-store' })
        .then(function(response) {
          if (response.ok) {
            console.log('[DTS] Fresh content available');
          }
        })
        .catch(function() {});
    }
  });
  
  // Periodic update check (every 10 seconds)
  setInterval(function() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
    }
  }, CHECK_INTERVAL);
  
  // Expose force update function globally
  window.dtsForceUpdate = forceCleanAndReload;
  
  console.log('[DTS Cleanup] Ready. Call window.dtsForceUpdate() to force refresh.');
})();
