// Force cleanup of old service workers - v4.0.0
// NUCLEAR OPTION: Unregister ALL service workers, clear ALL caches
// This script runs BEFORE the React app loads
(function() {
  'use strict';
  
  var APP_VERSION = '4.0.0';
  
  console.log('[DTS v' + APP_VERSION + '] Nuclear cache cleanup starting...');
  
  // STEP 1: Unregister ALL service workers immediately
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      if (registrations.length > 0) {
        console.log('[DTS] Found ' + registrations.length + ' service workers, unregistering ALL...');
        registrations.forEach(function(reg) {
          // Send skip waiting message first
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          if (reg.active) {
            reg.active.postMessage({ type: 'SKIP_WAITING' });
          }
          reg.unregister().then(function() {
            console.log('[DTS] SW unregistered: ' + reg.scope);
          });
        });
      }
    });
  }
  
  // STEP 2: Clear ALL caches
  if ('caches' in window) {
    caches.keys().then(function(names) {
      if (names.length > 0) {
        console.log('[DTS] Clearing ' + names.length + ' caches...');
        names.forEach(function(name) {
          caches.delete(name);
        });
      }
    });
  }
  
  // Force update function
  window.dtsForceUpdate = function() {
    console.log('[DTS] Force update triggered');
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        regs.forEach(function(r) { r.unregister(); });
      });
    }
    
    if ('caches' in window) {
      caches.keys().then(function(names) {
        Promise.all(names.map(function(n) { return caches.delete(n); })).then(function() {
          window.location.reload(true);
        });
      });
    } else {
      window.location.reload(true);
    }
  };
  
  window.dtsVersion = APP_VERSION;
  console.log('[DTS] Cleanup complete. Version: ' + APP_VERSION);
})();
