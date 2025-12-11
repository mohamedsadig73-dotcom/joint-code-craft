import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeUpdatesOptions {
  tables: string[];
  onUpdate: () => void;
  channelName?: string;
}

/**
 * Custom hook to subscribe to Supabase realtime updates
 * @param options - Configuration options
 * @returns cleanup function
 */
export function useRealtimeUpdates({
  tables,
  onUpdate,
  channelName = 'realtime-updates',
}: UseRealtimeUpdatesOptions) {
  const setupSubscription = useCallback(() => {
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        () => {
          onUpdate();
        }
      );
    });

    channel.subscribe();

    return channel;
  }, [tables, onUpdate, channelName]);

  useEffect(() => {
    const channel = setupSubscription();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setupSubscription]);
}

/**
 * Hook specifically for declarations realtime updates
 */
export function useDeclarationsRealtime(onUpdate: () => void) {
  useRealtimeUpdates({
    tables: ['declarations', 'declaration_status_history'],
    onUpdate,
    channelName: 'declarations-realtime',
  });
}

/**
 * Hook specifically for maintenance realtime updates
 */
export function useMaintenanceRealtime(onUpdate: () => void) {
  useRealtimeUpdates({
    tables: ['maintenance_items', 'maintenance_schedule', 'maintenance_assets'],
    onUpdate,
    channelName: 'maintenance-realtime',
  });
}

/**
 * Hook specifically for user management realtime updates
 */
export function useUsersRealtime(onUpdate: () => void) {
  useRealtimeUpdates({
    tables: ['profiles', 'user_roles'],
    onUpdate,
    channelName: 'users-realtime',
  });
}
