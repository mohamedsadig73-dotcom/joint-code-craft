import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const hostname = window.location.hostname;
const isPreviewHost =
  hostname.includes("id-preview--") || hostname.includes("lovableproject.com");
const isElectron =
  Boolean(window.electronAPI) || navigator.userAgent.toLowerCase().includes("electron");
const shouldDisableServiceWorker =
  isInIframe || isPreviewHost || isElectron || window.location.protocol === "file:";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (shouldDisableServiceWorker) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
      return;
    }

    navigator.serviceWorker
      .register("./sw.js")
      .then(() => console.log("SW registered"))
      .catch((err) => console.log("SW registration failed:", err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
