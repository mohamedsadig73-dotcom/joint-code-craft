/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  electronAPI?: {
    getPublishedVersion: (url: string) => Promise<{ version?: string; build?: string }>;
    openExternal: (url: string) => Promise<void>;
  };
}

