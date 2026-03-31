/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  electronAPI?: {
    getPublishedVersion: (url: string) => Promise<{ version?: string; build?: string }>;
    openExternal: (url: string) => Promise<void>;
    printHTML: (html: string) => Promise<boolean>;
    downloadUpdate: (downloadUrl: string) => Promise<{ success: boolean; filePath: string }>;
    onDownloadProgress: (callback: (data: { progress: number; downloaded: number; total: number }) => void) => () => void;
    restartApp: () => Promise<void>;
  };
}
