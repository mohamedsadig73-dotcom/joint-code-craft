import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Version 4.0.0 - Force clear old caches on startup
const APP_VERSION = '4.0.0';

// Immediately unregister old service workers on app start
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      reg.unregister().then(() => {
        console.log(`[DTS v${APP_VERSION}] Old SW unregistered on startup`);
      });
    });
  });
}

// Clear old caches on startup
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log(`[DTS v${APP_VERSION}] Cache cleared: ${name}`);
    });
  });
}

console.log(`[DTS] App starting - Version ${APP_VERSION}`);

createRoot(document.getElementById("root")!).render(<App />);
