/**
 * Boxes Service — pure async API for box_receipts / box_dispatches /
 * box_dispatch_items / container_items.
 *
 * Sprint 3 (P2 cont.): UI/hook code must call these functions instead of
 * touching `supabase.from('box_*')` directly. NO React, NO toasts, NO i18n.
 * Throws `ServiceError` on failure.
 */
import { supabase } from '@/integrations/supabase/client';
import { ServiceError, fromPostgrest, assert } from './_shared/supabaseErrors';

export type BoxReceiptStatus = 'received' | 'packed' | 'dispatched' | 'cancelled';
export type BoxDestination = string;
export type BoxUnit = string;
export type PackingType = 'boxed' | 'loose';

export interface BoxReceipt {
  id: string;
  serial_no: number;
  receipt_date: string;
  supplier: string;
  part_no: string;
  description: string;
  qty: number;
  unit: BoxUnit;
  destination: BoxDestination;
  place: string | null;
  box_no: string | null;
  invoice_number: string | null;
  item_id: string | null;
  packing_type: PackingType;
  status: BoxReceiptStatus;
  notes: string | null;
  image_path: string | null;
  inv_transaction_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface BoxDispatch {
  id: string;
  serial_no: number;
  dispatch_no: string;
  dispatch_date: string;
  destination: BoxDestination;
  department_id: string | null;
  department_name: string;
  project_id: string | null;
  receiving_staff_id: string | null;
  signer_name: string;
  signer_title: string | null;
  shipping_company: string | null;
  status: string;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BoxDispatchItem {
  id: string;
  dispatch_id: string;
  receipt_id: string;
  qty_dispatched: number;
  notes: string | null;
}

// ─────────── Receipts ───────────
export async function listReceipts(opts?: { includeDeleted?: boolean }): Promise<BoxReceipt[]> {
  let q = supabase
    .from('box_receipts')
    .select('*')
    .order('serial_no', { ascending: false });
  if (!opts?.includeDeleted) q = q.is('deleted_at', null);
  const { data, error } = await q;
  if (error) throw fromPostgrest(error);
  return (data ?? []) as BoxReceipt[];
}

export async function createReceipt(
  payload: Partial<BoxReceipt>,
  opts: { userId: string }
): Promise<BoxReceipt> {
  assert(opts.userId, 'unauthorized', 'User ID required');
  assert(payload.supplier && payload.part_no && payload.description, 'validation', 'Missing required fields');
  const { data, error } = await supabase
    .from('box_receipts')
    .insert({ ...(payload as never), created_by: opts.userId } as never)
    .select()
    .single();
  if (error || !data) throw fromPostgrest(error, 'Failed to create receipt');
  return data as BoxReceipt;
}

export async function updateReceipt(id: string, patch: Partial<BoxReceipt>): Promise<void> {
  const { error } = await supabase.from('box_receipts').update(patch as never).eq('id', id);
  if (error) throw fromPostgrest(error);
}

export async function softDeleteReceipt(id: string, userId: string): Promise<void> {
  assert(userId, 'unauthorized', 'User ID required');
  const { error } = await supabase
    .from('box_receipts')
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId } as never)
    .eq('id', id);
  if (error) throw fromPostgrest(error);
}

export async function restoreReceipt(id: string): Promise<void> {
  const { error } = await supabase
    .from('box_receipts')
    .update({ deleted_at: null, deleted_by: null } as never)
    .eq('id', id);
  if (error) throw fromPostgrest(error);
}

// ─────────── Dispatches ───────────
export async function listDispatches(): Promise<BoxDispatch[]> {
  const { data, error } = await supabase
    .from('box_dispatches')
    .select('*')
    .is('deleted_at', null)
    .order('serial_no', { ascending: false });
  if (error) throw fromPostgrest(error);
  return (data ?? []) as BoxDispatch[];
}

export async function listDispatchItems(dispatchId: string): Promise<BoxDispatchItem[]> {
  const { data, error } = await supabase
    .from('box_dispatch_items')
    .select('*')
    .eq('dispatch_id', dispatchId);
  if (error) throw fromPostgrest(error);
  return (data ?? []) as BoxDispatchItem[];
}

export interface CreateDispatchInput {
  dispatch_no: string;
  dispatch_date: string;
  destination: BoxDestination;
  department_name: string;
  department_id?: string | null;
  project_id?: string | null;
  receiving_staff_id?: string | null;
  signer_name: string;
  signer_title?: string | null;
  shipping_company?: string | null;
  notes?: string | null;
  items: Array<{ receipt_id: string; qty_dispatched: number; notes?: string | null }>;
}

export async function createDispatch(
  input: CreateDispatchInput,
  opts: { userId: string }
): Promise<{ id: string }> {
  assert(opts.userId, 'unauthorized', 'User ID required');
  assert(input.items.length > 0, 'validation', 'At least one item is required');

  const { data: disp, error: dErr } = await supabase
    .from('box_dispatches')
    .insert({
      dispatch_no: input.dispatch_no,
      dispatch_date: input.dispatch_date,
      destination: input.destination,
      department_id: input.department_id ?? null,
      department_name: input.department_name,
      project_id: input.project_id ?? null,
      receiving_staff_id: input.receiving_staff_id ?? null,
      signer_name: input.signer_name,
      signer_title: input.signer_title ?? null,
      shipping_company: input.shipping_company ?? null,
      notes: input.notes ?? null,
      created_by: opts.userId,
    } as never)
    .select('id')
    .single();
  if (dErr || !disp) throw fromPostgrest(dErr, 'Failed to create dispatch');
  const dispatchId = (disp as { id: string }).id;

  const lines = input.items.map((it) => ({
    dispatch_id: dispatchId,
    receipt_id: it.receipt_id,
    qty_dispatched: it.qty_dispatched,
    notes: it.notes ?? null,
  }));
  const { error: liErr } = await supabase
    .from('box_dispatch_items')
    .insert(lines as never);
  if (liErr) throw fromPostgrest(liErr, 'Failed to insert dispatch items');

  return { id: dispatchId };
}

// ─────────── Container items ───────────
export async function addReceiptsToContainer(containerId: string, receiptIds: string[], userId: string): Promise<void> {
  assert(userId, 'unauthorized', 'User ID required');
  if (receiptIds.length === 0) return;
  const rows = receiptIds.map((rid) => ({ container_id: containerId, receipt_id: rid, added_by: userId }));
  const { error } = await supabase.from('container_items').insert(rows as never);
  if (error) throw fromPostgrest(error);
}

export async function removeFromContainer(containerItemId: string): Promise<void> {
  const { error } = await supabase.from('container_items').delete().eq('id', containerItemId);
  if (error) throw fromPostgrest(error);
}

export { ServiceError };