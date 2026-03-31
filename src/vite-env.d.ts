/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface DownloadProgressData {
  phase: 'downloading' | 'installing' | 'done';
  progress: number;
  downloaded: number;
  total: number;
}

interface Window {
  electronAPI?: {
    getPublishedVersion: (url: string) => Promise<{ version?: string; build?: string }>;
    openExternal: (url: string) => Promise<void>;
    printHTML: (html: string) => Promise<boolean>;
    downloadUpdate: (downloadUrl: string) => Promise<{ success: boolean }>;
    onDownloadProgress: (callback: (data: DownloadProgressData) => void) => () => void;
    restartApp: () => Promise<void>;
  };
}
