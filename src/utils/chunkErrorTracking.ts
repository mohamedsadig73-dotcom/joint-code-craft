/**
 * Tracks dynamic-import / chunk-load failures so they can be diagnosed
 * after deploys (stale cached HTML pointing at old asset hashes).
 */

export interface ChunkErrorRecord {
  timestamp: number;
  message: string;
  url?: string;
  appVersion: string;
  buildVersion: string;
  userAgent: string;
  retried: boolean;
}

const STORAGE_KEY = '__chunk_error_log__';
const MAX_RECORDS = 20;

declare const __APP_VERSION__: string;
declare const __BUILD_VERSION__: string;

function safeVersion(): { app: string; build: string } {
  try {
    return {
      // @ts-ignore — injected by Vite define
      app: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown',
      // @ts-ignore
      build: typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'unknown',
    };
  } catch {
    return { app: 'unknown', build: 'unknown' };
  }
}

export function isChunkLoadError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError/i.test(
    msg
  );
}

export function trackChunkError(err: unknown, retried: boolean): ChunkErrorRecord {
  const v = safeVersion();
  const record: ChunkErrorRecord = {
    timestamp: Date.now(),
    message: String((err as any)?.message || err || 'unknown'),
    url: (err as any)?.url || (typeof window !== 'undefined' ? window.location.href : undefined),
    appVersion: v.app,
    buildVersion: v.build,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
    retried,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr: ChunkErrorRecord[] = raw ? JSON.parse(raw) : [];
    arr.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(0, MAX_RECORDS)));
  } catch {
    /* ignore quota */
  }

  // eslint-disable-next-line no-console
  console.error('[chunk-error]', record);
  return record;
}

export function getChunkErrorLog(): ChunkErrorRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearChunkErrorLog(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}