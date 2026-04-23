import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Locally-persisted log of image downloads (current/previous) performed
 * from the Image History viewer. Stored in localStorage to give an audit
 * trail per device — small, append-only, ring-buffered to ~500 entries.
 */
export interface DownloadLogEntry {
  id: string;
  at: string; // ISO
  username: string | null;
  kind: 'current' | 'previous';
  fileName: string;
  path: string;
  itemId: string;
  partNo: string | null;
}

const STORAGE_KEY = 'image_download_log_v1';
const MAX_ENTRIES = 500;

function read(): DownloadLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: DownloadLogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // quota exceeded — silently drop
  }
}

export function useImageDownloadLog() {
  const [entries, setEntries] = useState<DownloadLogEntry[]>(() => read());

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEntries(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const log = useCallback(
    async (info: Omit<DownloadLogEntry, 'id' | 'at' | 'username'>) => {
      const { data: auth } = await supabase.auth.getUser();
      let username: string | null = null;
      if (auth.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', auth.user.id)
          .maybeSingle();
        username = profile?.username ?? auth.user.email ?? null;
      }
      const entry: DownloadLogEntry = {
        id:
          (typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
        at: new Date().toISOString(),
        username,
        ...info,
      };
      const next = [entry, ...read()].slice(0, MAX_ENTRIES);
      write(next);
      setEntries(next);
      return entry;
    },
    []
  );

  const clear = useCallback(() => {
    write([]);
    setEntries([]);
  }, []);

  return { entries, log, clear };
}