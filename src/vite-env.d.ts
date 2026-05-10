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
    getPublishedVersion: <T = { version?: string; build?: string }>(url: string) => Promise<T>;
    openExternal: (url: string) => Promise<void>;
    printHTML: (html: string) => Promise<boolean | { success: boolean; path?: string }>;
    downloadUpdate: (downloadUrl: string, expectedVersion?: string) => Promise<{ success: boolean }>;
    onDownloadProgress: (callback: (data: DownloadProgressData) => void) => () => void;
    restartApp: () => Promise<void>;
    getShellVersion?: () => Promise<string>;
    testUpdateChannel?: (urls: { versionUrl: string; releaseUrl: string; downloadUrl?: string }) => Promise<{
      versionJson: { ok: boolean; status?: number; error?: string; data?: unknown };
      releaseJson: { ok: boolean; status?: number; error?: string; data?: unknown };
      downloadHead: { ok: boolean; status?: number; error?: string; size?: number };
    }>;
  };
}
