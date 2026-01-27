import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Declaration, DeletedDeclaration, DeclarationStats, Profile } from '@/types/declarations';
import { useDeclarationsRealtime } from '@/hooks/useRealtimeUpdates';

export function useDashboardData() {
  const { t } = useLanguage();
  
  // State
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [deletedDeclarations, setDeletedDeclarations] = useState<DeletedDeclaration[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTrash, setLoadingTrash] = useState(true);
  const [stats, setStats] = useState<DeclarationStats>({
    total: 0,
    draft: 0,
    pending_warehouse_signature: 0,
    warehouse_signed: 0,
    sent_to_admin_office: 0,
    received_by_admin_office: 0,
    returned_to_warehouse: 0,
    archived: 0,
    rejected: 0,
  });

  const loadDeclarations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`*, sender:profiles!sender_id(username)`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeclarations(data || []);
      
      // Calculate stats
      const newStats: DeclarationStats = {
        total: data?.length || 0,
        draft: data?.filter(d => d.status === 'draft').length || 0,
        pending_warehouse_signature: data?.filter(d => d.status === 'pending_warehouse_signature').length || 0,
        warehouse_signed: data?.filter(d => d.status === 'warehouse_signed').length || 0,
        sent_to_admin_office: data?.filter(d => d.status === 'sent_to_admin_office').length || 0,
        received_by_admin_office: data?.filter(d => d.status === 'received_by_admin_office').length || 0,
        returned_to_warehouse: data?.filter(d => d.status === 'returned_to_warehouse').length || 0,
        archived: data?.filter(d => d.status === 'archived').length || 0,
        rejected: data?.filter(d => d.status === 'rejected').length || 0,
      };
      setStats(newStats);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadDeletedDeclarations = useCallback(async () => {
    try {
      setLoadingTrash(true);
      const { data, error } = await supabase
        .from('declarations')
        .select(`*, sender:profiles!sender_id(username)`)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedDeclarations((data || []) as DeletedDeclaration[]);
    } catch (error: any) {
      console.error('Error loading deleted declarations:', error);
    } finally {
      setLoadingTrash(false);
    }
  }, []);

  const loadProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, created_at, updated_at')
        .order('username');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error loading profiles:', error);
    }
  }, []);

  useEffect(() => {
    loadDeclarations();
    loadDeletedDeclarations();
    loadProfiles();
  }, [loadDeclarations, loadDeletedDeclarations, loadProfiles]);

  // Realtime updates
  useDeclarationsRealtime(() => {
    loadDeclarations();
    loadDeletedDeclarations();
  });

  // Smart Nudges data
  const completionRate = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round((stats.archived / stats.total) * 100);
  }, [stats]);

  const hasOverdueItems = useMemo(() => {
    return stats.pending_warehouse_signature > 0 || stats.returned_to_warehouse > 0;
  }, [stats]);

  return {
    declarations,
    deletedDeclarations,
    profiles,
    loading,
    loadingTrash,
    stats,
    completionRate,
    hasOverdueItems,
    loadDeclarations,
    loadDeletedDeclarations,
  };
}
