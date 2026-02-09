// Force cleanup of old service workers - v4.0.0
// AGGRESSIVE CACHE CLEARING - Forces complete refresh
(function() {
  'use strict';
  
  var APP_VERSION = '4.0.0';
  var BUILD_TIME = '20260209160000';
  var FORCE_CLEAR_KEY = 'dts-force-clear-v10';
  
  console.log('[DTS v' + APP_VERSION + '-' + BUILD_TIME + '] Initializing aggressive cleanup...');
  
  // Check if we need to force clear
  var storedVersion = localStorage.getItem(FORCE_CLEAR_KEY);
  var currentVersionKey = APP_VERSION + '-' + BUILD_TIME;
  var needsClear = storedVersion !== currentVersionKey;
  
  // AGGRESSIVE: Clear ALL storage and caches
  function aggressiveClear(callback) {
    console.log('[DTS] AGGRESSIVE CLEAR: Removing all caches and service workers...');
    
    var promises = [];
    
    // 1. Unregister ALL service workers
    if ('serviceWorker' in navigator) {
      promises.push(
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          return Promise.all(registrations.map(function(reg) {
            console.log('[DTS] Unregistering SW:', reg.scope);
            return reg.unregister();
          }));
        })
      );
    }
    
    // 2. Clear ALL caches
    if ('caches' in window) {
      promises.push(
        caches.keys().then(function(cacheNames) {
          console.log('[DTS] Clearing', cacheNames.length, 'caches');
          return Promise.all(cacheNames.map(function(name) {
            return caches.delete(name);
          }));
        })
      );
    }
    
    // 3. Clear old localStorage keys
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith('dts-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(function(key) {
      if (key !== FORCE_CLEAR_KEY) {
        localStorage.removeItem(key);
      }
    });
    
    // 4. Clear sessionStorage
    try {
      var authKeys = [];
      for (var j = 0; j < sessionStorage.length; j++) {
        var sKey = sessionStorage.key(j);
        if (sKey && sKey.startsWith('dts-')) {
          authKeys.push(sKey);
        }
      }
      authKeys.forEach(function(k) { sessionStorage.removeItem(k); });
    } catch(e) {}
    
    Promise.all(promises).then(function() {
      console.log('[DTS] All caches cleared successfully');
      localStorage.setItem(FORCE_CLEAR_KEY, currentVersionKey);
      if (callback) callback();
    }).catch(function(err) {
      console.error('[DTS] Error clearing caches:', err);
      localStorage.setItem(FORCE_CLEAR_KEY, currentVersionKey);
      if (callback) callback();
    });
  }
  
  // Force update function - clears everything and reloads
  function forceUpdate() {
    console.log('[DTS] Force update triggered...');
    aggressiveClear(function() {
      setTimeout(function() {
        window.location.reload(true);
      }, 500);
    });
  }
  
  // On version mismatch, clear and reload ONCE
  if (needsClear) {
    console.log('[DTS] VERSION MISMATCH! Stored:', storedVersion, 'Current:', currentVersionKey);
    aggressiveClear(function() {
      // Check if we already reloaded to prevent loop
      var reloadKey = 'dts-reload-' + currentVersionKey;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        console.log('[DTS] Reloading page with new version...');
        setTimeout(function() {
          window.location.reload(true);
        }, 300);
      } else {
        console.log('[DTS] Already reloaded, skipping...');
      }
    });
  } else {
    console.log('[DTS] Version ' + currentVersionKey + ' is current');
  }
  
  // Check for updates when tab becomes visible
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
      }
    }
  });
  
  // Expose force update globally
  window.dtsForceUpdate = forceUpdate;
  window.dtsVersion = APP_VERSION + '-' + BUILD_TIME;
  
  console.log('[DTS] Ready. Version:', window.dtsVersion);
})();
