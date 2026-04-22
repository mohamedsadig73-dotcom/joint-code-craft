import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

declare const __APP_VERSION__: string;

export type UpdatePhase =
  | 'check'
  | 'download'
  | 'extract'
  | 'install'
  | 'done'
  | 'failed'
  | 'shell-mismatch'
  | 'self-test';

export type UpdateStatus = 'success' | 'error' | 'info';

export interface UpdateLogEntry {
  phase: UpdatePhase;
  status: UpdateStatus;
  targetVersion?: string | null;
  attemptedUrl?: string | null;
  errorMessage?: string | null;
  shellVersion?: string | null;
  metadata?: Record<string, unknown>;
}

export function useUpdateLogger() {
  const { user } = useAuth();

  const log = useCallback(
    async (entry: UpdateLogEntry) => {
      try {
        const platform =
          typeof window !== 'undefined' && window.electronAPI ? 'electron' : 'web';

        const payload = {
          user_id: user?.id ?? null,
          app_version: __APP_VERSION__ ?? null,
          shell_version: entry.shellVersion ?? null,
          target_version: entry.targetVersion ?? null,
          attempted_url: entry.attemptedUrl ?? null,
          phase: entry.phase,
          status: entry.status,
          error_message: entry.errorMessage ?? null,
          platform,
          user_agent:
            typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
          metadata: entry.metadata ?? null,
        };

        const { error } = await supabase.from('update_logs').insert([payload]);
        if (error) console.warn('[updateLogger] insert failed:', error.message);
      } catch (err) {
        console.warn('[updateLogger] unexpected error:', err);
      }
    },
    [user?.id]
  );

  return { log };
}