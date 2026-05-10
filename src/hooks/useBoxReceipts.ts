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
  unit: 'PCS' | 'SET' | 'BOX' | 'KG' | 'MTR' | 'LTR' | 'PAIR' | 'ROLL' | 'KIT' | 'BAG' | 'CTN' | 'DRUM' | 'PACK' | 'BTL' | 'M2' | 'M3';
  destination: 'morocco' | 'uzbekistan' | 'unspecified';
  packing_type: 'boxed' | 'loose';
  place: string | null;
  box_no: string | null;
  receipt_date: string;
  status: 'received' | 'sorted' | 'packed' | 'shipped' | 'dispatched';
  notes: string | null;
  image_path: string | null;
  invoice_number: string | null;
  item_id: string | null;
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
      const rows = (data ?? []) as BoxReceipt[];
      const itemIds = Array.from(
        new Set(rows.filter((r) => !r.image_path && r.item_id).map((r) => r.item_id as string))
      );

      if (itemIds.length === 0) {
        setReceipts(rows);
      } else {
        // Batch in chunks to avoid URL length limits with .in() on many UUIDs
        const CHUNK = 150;
        const imageByItemId = new Map<string, string | null>();
        for (let i = 0; i < itemIds.length; i += CHUNK) {
          const slice = itemIds.slice(i, i + CHUNK);
          const { data: items, error: itemsError } = await supabase
            .from('items_master')
            .select('id, image_path')
            .in('id', slice);
          if (itemsError) {
            console.error('[useBoxReceipts:items_master]', itemsError);
            continue;
          }
          (items ?? []).forEach((item) => imageByItemId.set(item.id, item.image_path));
        }
        setReceipts(
          rows.map((r) => ({
            ...r,
            image_path: r.image_path ?? (r.item_id ? imageByItemId.get(r.item_id) ?? null : null),
          }))
        );
      }
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

  /**
   * Merge a set of duplicate receipts into a single keeper record.
   * - Keeper qty is set to the sum of all involved receipts.
   * - All non-keeper receipts are soft-deleted with a traceable note.
   */
  const mergeReceipts = useCallback(
    async (keeperId: string, mergeIds: string[]) => {
      if (!user?.id) return false;
      const keeper = receipts.find((r) => r.id === keeperId);
      const merged = receipts.filter((r) => mergeIds.includes(r.id) && r.id !== keeperId);
      if (!keeper || merged.length === 0) return false;

      const newQty = keeper.qty + merged.reduce((s, r) => s + r.qty, 0);
      const { error: kErr } = await supabase
        .from('box_receipts')
        .update({ qty: newQty })
        .eq('id', keeper.id);
      if (kErr) {
        toast({ title: t('error'), description: kErr.message, variant: 'destructive' });
        return false;
      }

      const nowIso = new Date().toISOString();
      const noteSuffix = ` ${t('mergeNotePrefix')}${keeper.serial_no}]`;
      const updates = merged.map((r) =>
        supabase
          .from('box_receipts')
          .update({
            deleted_at: nowIso,
            deleted_by: user.id,
            notes: (r.notes ?? '') + noteSuffix,
          })
          .eq('id', r.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((res) => res.error);
      if (failed?.error) {
        toast({ title: t('error'), description: failed.error.message, variant: 'destructive' });
        return false;
      }
      toast({ title: t('success'), description: t('mergeSuccess') });
      return true;
    },
    [user?.id, receipts, toast, t]
  );

  const bulkAddQuantity = useCallback(
    async (updates: Array<{ id: string; addQty: number }>) => {
      if (!user?.id || updates.length === 0) return 0;
      let success = 0;
      for (const u of updates) {
        const target = receipts.find((r) => r.id === u.id);
        if (!target) continue;
        const { error } = await supabase
          .from('box_receipts')
          .update({ qty: target.qty + u.addQty })
          .eq('id', u.id);
        if (!error) success++;
      }
      return success;
    },
    [user?.id, receipts]
  );

  /**
   * Bulk-change the packing_type of multiple receipts.
   * When switching to 'loose', the box_no is cleared automatically.
   */
  const bulkUpdatePackingType = useCallback(
    async (ids: string[], packingType: 'boxed' | 'loose') => {
      if (!user?.id || ids.length === 0) return 0;
      const patch: Partial<BoxReceiptInput> =
        packingType === 'loose'
          ? { packing_type: 'loose', box_no: null }
          : { packing_type: 'boxed' };
      const { data, error } = await supabase
        .from('box_receipts')
        .update(patch)
        .in('id', ids)
        .select('id');
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return 0;
      }
      const updated = data?.length ?? 0;
      toast({ title: t('success'), description: `${updated} ${t('packingTypeUpdated')}` });
      return updated;
    },
    [user?.id, toast, t]
  );

  /**
   * Bulk-update arbitrary editable fields (supplier / destination / receipt_date)
   * across multiple receipts in a single round-trip.
   */
  const bulkUpdateFields = useCallback(
    async (ids: string[], patch: Partial<BoxReceiptInput>) => {
      if (!user?.id || ids.length === 0 || Object.keys(patch).length === 0) return 0;
      const { data, error } = await supabase
        .from('box_receipts')
        .update(patch)
        .in('id', ids)
        .select('id');
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        return 0;
      }
      return data?.length ?? 0;
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
    mergeReceipts,
    bulkAddQuantity,
    bulkUpdatePackingType,
    bulkUpdateFields,
  };
}