import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export type ContainerStatus = 'preparing' | 'sealed' | 'shipped' | 'delivered';
export type ContainerDestination = 'morocco' | 'uzbekistan' | 'unspecified';

export interface ShippingContainer {
  id: string;
  container_no: string;
  shipping_company: string;
  destination: ContainerDestination;
  shipped_date: string | null;
  status: ContainerStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface ContainerSummaryRow {
  container_id: string | null;
  container_no: string | null;
  shipping_company: string | null;
  destination: ContainerDestination | null;
  status: ContainerStatus | null;
  shipped_date: string | null;
  created_at: string | null;
  boxes_count: number | null;
  loose_count: number | null;
  total_qty: number | null;
  suppliers: string | null;
}

export type ShippingContainerInput = Omit<
  ShippingContainer,
  'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'deleted_by' | 'created_by'
>;

export function useContainers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [containers, setContainers] = useState<ShippingContainer[]>([]);
  const [summary, setSummary] = useState<ContainerSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: rows, error }, { data: sumRows, error: sErr }] = await Promise.all([
      supabase
        .from('shipping_containers')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('container_summary').select('*'),
    ]);
    if (error) {
      console.error('[useContainers]', error);
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      setContainers((rows ?? []) as ShippingContainer[]);
    }
    if (sErr) {
      console.error('[useContainers/summary]', sErr);
    } else {
      setSummary((sumRows ?? []) as ContainerSummaryRow[]);
    }
    setLoading(false);
  }, [toast, t]);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('shipping_containers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipping_containers' }, () =>
        fetchAll()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'container_items' }, () =>
        fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const createContainer = useCallback(
    async (input: ShippingContainerInput) => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('shipping_containers')
        .insert([{ ...input, created_by: user.id }])
        .select()
        .single();
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return null;
      }
      toast({ title: t('success'), description: t('containerCreated') });
      return data as ShippingContainer;
    },
    [user?.id, toast, t]
  );

  const updateContainer = useCallback(
    async (id: string, input: Partial<ShippingContainerInput>) => {
      const { data, error } = await supabase
        .from('shipping_containers')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return null;
      }
      toast({ title: t('success'), description: t('containerUpdated') });
      return data as ShippingContainer;
    },
    [toast, t]
  );

  const deleteContainer = useCallback(
    async (id: string) => {
      if (!user?.id) return false;
      const { error } = await supabase
        .from('shipping_containers')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
        .eq('id', id);
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return false;
      }
      toast({ title: t('success'), description: t('containerDeleted') });
      return true;
    },
    [user?.id, toast, t]
  );

  return {
    containers,
    summary,
    loading,
    refetch: fetchAll,
    createContainer,
    updateContainer,
    deleteContainer,
  };
}

export function useContainer(id: string | undefined) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [container, setContainer] = useState<ShippingContainer | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOne = useCallback(async () => {
    if (!id) {
      setContainer(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('shipping_containers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      setContainer((data ?? null) as ShippingContainer | null);
    }
    setLoading(false);
  }, [id, toast, t]);

  useEffect(() => {
    fetchOne();
    if (!id) return;
    const channel = supabase
      .channel(`shipping_container_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipping_containers', filter: `id=eq.${id}` },
        () => fetchOne()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchOne]);

  return { container, loading, refetch: fetchOne };
}