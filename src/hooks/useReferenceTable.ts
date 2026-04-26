import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Generic hook for reference / master-data tables in the inventory module.
 * Each table follows the same shape: id, code, name_ar, name_en, is_active, created_at, updated_at, ...extra
 */
export interface ReferenceRow {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Extra free-form fields per table
  [key: string]: unknown;
}

export type ReferenceTableName =
  | 'warehouses'
  | 'item_groups'
  | 'item_categories'
  | 'units_of_measure'
  | 'suppliers'
  | 'departments'
  | 'projects';

export function useReferenceTable<T extends ReferenceRow = ReferenceRow>(
  table: ReferenceTableName,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();

  const fetchRows = useCallback(async () => {
    setLoading(true);
    // The reference tables aren't in the generated types yet — cast to any for the query builder.
    const { data, error } = await (supabase as any)
      .from(table)
      .select('*')
      .order('code', { ascending: true });
    if (error) {
      console.error(`[useReferenceTable:${table}]`, error);
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      setRows((data ?? []) as T[]);
    }
    setLoading(false);
  }, [table, toast, t]);

  useEffect(() => {
    fetchRows();
    const channel = supabase
      .channel(`ref_${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => fetchRows())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, fetchRows]);

  const create = useCallback(
    async (payload: Partial<T>) => {
      const { error } = await (supabase as any)
        .from(table)
        .insert([{ ...payload, created_by: user?.id ?? null }]);
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return false;
      }
      toast({ title: t('success'), description: t('savedSuccessfully') });
      return true;
    },
    [table, user?.id, toast, t],
  );

  const update = useCallback(
    async (id: string, payload: Partial<T>) => {
      const { error } = await (supabase as any).from(table).update(payload).eq('id', id);
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return false;
      }
      toast({ title: t('success'), description: t('savedSuccessfully') });
      return true;
    },
    [table, toast, t],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any).from(table).delete().eq('id', id);
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return false;
      }
      toast({ title: t('success'), description: t('deletedSuccessfully') });
      return true;
    },
    [table, toast, t],
  );

  return { rows, loading, refetch: fetchRows, create, update, remove };
}