import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register minimal service worker for PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch((err) => console.log('SW registration failed:', err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
