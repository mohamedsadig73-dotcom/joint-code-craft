import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export interface BoxReceipt {
  id: string;
  serial_no: number;
  supplier: string;
  part_no: string;
  description: string;
  qty: number;
  unit: 'PCS' | 'SET' | 'BOX' | 'KG' | 'MTR' | 'LTR' | 'PAIR';
  destination: 'morocco' | 'uzbekistan' | 'unspecified';
  place: string | null;
  box_no: string;
  receipt_date: string;
  status: 'received' | 'sorted' | 'packed' | 'shipped';
  notes: string | null;
  image_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export type BoxReceiptInput = Omit<
  BoxReceipt,
  'id' | 'serial_no' | 'created_at' | 'updated_at' | 'deleted_at' | 'deleted_by' | 'created_by'
>;

export function useBoxReceipts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [receipts, setReceipts] = useState<BoxReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('box_receipts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[useBoxReceipts]', error);
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      setReceipts((data ?? []) as BoxReceipt[]);
    }
    setLoading(false);
  }, [toast, t]);

  useEffect(() => {
    fetchReceipts();

    const channel = supabase
      .channel('box_receipts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'box_receipts' },
        () => fetchReceipts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReceipts]);

  const createReceipt = useCallback(
    async (input: BoxReceiptInput) => {
      if (!user?.id) {
        toast({ title: t('error'), description: t('mustBeLoggedIn'), variant: 'destructive' });
        return null;
      }
      const { data, error } = await supabase
        .from('box_receipts')
        .insert([{ ...input, created_by: user.id }])
        .select()
        .single();

      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return null;
      }
      toast({ title: t('success'), description: t('receiptCreated') });
      return data as BoxReceipt;
    },
    [user?.id, toast, t]
  );

  const updateReceipt = useCallback(
    async (id: string, input: Partial<BoxReceiptInput>) => {
      const { data, error } = await supabase
        .from('box_receipts')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return null;
      }
      toast({ title: t('success'), description: t('receiptUpdated') });
      return data as BoxReceipt;
    },
    [toast, t]
  );

  const deleteReceipt = useCallback(
    async (id: string) => {
      if (!user?.id) return false;
      const { error } = await supabase
        .from('box_receipts')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
        .eq('id', id);

      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return false;
      }
      toast({ title: t('success'), description: t('receiptDeleted') });
      return true;
    },
    [user?.id, toast, t]
  );

  const bulkInsertReceipts = useCallback(
    async (inputs: BoxReceiptInput[]) => {
      if (!user?.id) return { inserted: 0, failed: inputs.length };
      const rows = inputs.map((r) => ({ ...r, created_by: user.id }));
      const { data, error } = await supabase.from('box_receipts').insert(rows).select('id');
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return { inserted: 0, failed: inputs.length };
      }
      const inserted = data?.length ?? 0;
      toast({ title: t('success'), description: `${inserted} ${t('rowsImported')}` });
      return { inserted, failed: inputs.length - inserted };
    },
    [user?.id, toast, t]
  );

  return {
    receipts,
    loading,
    refetch: fetchReceipts,
    createReceipt,
    updateReceipt,
    deleteReceipt,
    bulkInsertReceipts,
  };
}