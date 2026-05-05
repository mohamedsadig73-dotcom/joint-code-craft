/**
 * Inventory Service — pure async API for inv_* tables.
 *
 * Sprint 2 (P2) of the architectural refactor. UI/hook code must call
 * these functions instead of touching `supabase.from('inv_*')` directly.
 *
 * NO React, NO toasts, NO i18n. Throws `ServiceError` on failure.
 */
import { supabase } from '@/integrations/supabase/client';
import { ServiceError, fromPostgrest, assert } from './_shared/supabaseErrors';

export type InvTxnType = 'in' | 'out' | 'transfer' | 'return';
export type InvTxnStatus = 'draft' | 'posted' | 'cancelled';
export type InvPartyType = 'employee' | 'department' | 'supplier' | 'external';

export interface Warehouse {
  id: string; code: string; name_ar: string; name_en: string;
  location: string | null; is_active: boolean;
}

export interface InvLocation {
  id: string; warehouse_id: string; code: string; name_ar: string; name_en: string;
  parent_id: string | null; notes: string | null; is_active: boolean; created_at: string;
}

export interface InvStock {
  id: string; item_id: string; warehouse_id: string; location_id: string | null;
  qty: number; last_movement_at: string | null;
}

export interface InvCustody {
  id: string; item_id: string; party_type: InvPartyType; party_name: string;
  party_ref: string | null; qty: number; last_movement_at: string | null;
}

export interface InvTransaction {
  id: string; txn_no: string; txn_type: InvTxnType; txn_date: string; status: InvTxnStatus;
  from_warehouse_id: string | null; from_location_id: string | null;
  to_warehouse_id: string | null;   to_location_id: string | null;
  party_type: InvPartyType | null; party_name: string | null; party_ref: string | null;
  reference: string | null; notes: string | null;
  linked_box_receipt_id: string | null; declaration_id: string | null;
  posted_at: string | null; created_by: string | null;
  created_at: string; deleted_at: string | null;
}

export interface InvTransactionItem {
  id: string; transaction_id: string; line_no: number;
  item_id: string; qty: number; unit: string | null; notes: string | null;
}

export interface CreateTransactionInput {
  txn_type: InvTxnType;
  txn_date: string;
  from_warehouse_id?: string | null;
  from_location_id?: string | null;
  to_warehouse_id?: string | null;
  to_location_id?: string | null;
  party_type?: InvPartyType | null;
  party_name?: string | null;
  party_ref?: string | null;
  reference?: string | null;
  notes?: string | null;
  linked_box_receipt_id?: string | null;
  items: Array<{ item_id: string; qty: number; unit?: string | null; notes?: string | null }>;
}

// ─────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────

export async function listWarehouses(): Promise<Warehouse[]> {
  const { data, error } = await supabase
    .from('warehouses')
    .select('id,code,name_ar,name_en,location,is_active')
    .order('code');
  if (error) throw fromPostgrest(error);
  return (data ?? []) as Warehouse[];
}

export async function listLocations(warehouseId?: string | null): Promise<InvLocation[]> {
  let q = supabase.from('inv_locations').select('*').order('code');
  if (warehouseId) q = q.eq('warehouse_id', warehouseId);
  const { data, error } = await q;
  if (error) throw fromPostgrest(error);
  return (data ?? []) as InvLocation[];
}

export async function listStock(): Promise<InvStock[]> {
  const { data, error } = await supabase
    .from('inv_stock').select('*')
    .order('updated_at', { ascending: false });
  if (error) throw fromPostgrest(error);
  return (data ?? []) as InvStock[];
}

export async function listCustody(): Promise<InvCustody[]> {
  const { data, error } = await supabase
    .from('inv_custody').select('*')
    .order('updated_at', { ascending: false });
  if (error) throw fromPostgrest(error);
  return (data ?? []) as InvCustody[];
}

export async function listTransactions(filters?: { type?: InvTxnType; status?: InvTxnStatus }): Promise<InvTransaction[]> {
  let q = supabase.from('inv_transactions').select('*')
    .is('deleted_at', null)
    .order('txn_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (filters?.type) q = q.eq('txn_type', filters.type);
  if (filters?.status) q = q.eq('status', filters.status);
  const { data, error } = await q;
  if (error) throw fromPostgrest(error);
  return (data ?? []) as InvTransaction[];
}

export async function listTransactionItems(transactionId: string): Promise<InvTransactionItem[]> {
  const { data, error } = await supabase
    .from('inv_transaction_items').select('*')
    .eq('transaction_id', transactionId)
    .order('line_no');
  if (error) throw fromPostgrest(error);
  return (data ?? []) as InvTransactionItem[];
}

// ─────────────────────────────────────────────────────────────────────
// Writes — single atomic-ish "create transaction"
// ─────────────────────────────────────────────────────────────────────

export interface CreateTransactionResult {
  id: string;
  declaration_id: string | null;
}

/**
 * Creates a draft inventory transaction with line items, optionally posts it,
 * then re-reads to obtain the trigger-generated `declaration_id`.
 */
export async function createTransaction(
  input: CreateTransactionInput,
  options: { userId: string; post?: boolean } = { userId: '', post: true }
): Promise<CreateTransactionResult> {
  const post = options.post ?? true;
  assert(options.userId, 'unauthorized', 'User ID required');
  assert(input.items.length > 0, 'validation', 'At least one item is required');

  // 1) Insert transaction (draft)
  const { data: txn, error: txnErr } = await supabase
    .from('inv_transactions')
    .insert({
      txn_type: input.txn_type,
      txn_date: input.txn_date,
      status: 'draft',
      from_warehouse_id: input.from_warehouse_id ?? null,
      from_location_id: input.from_location_id ?? null,
      to_warehouse_id: input.to_warehouse_id ?? null,
      to_location_id: input.to_location_id ?? null,
      party_type: input.party_type ?? null,
      party_name: input.party_name ?? null,
      party_ref: input.party_ref ?? null,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      linked_box_receipt_id: input.linked_box_receipt_id ?? null,
      created_by: options.userId,
    } as never)
    .select()
    .single();
  if (txnErr || !txn) throw fromPostgrest(txnErr, 'Failed to create transaction');
  const txnId = (txn as { id: string }).id;

  // 2) Insert lines
  const lines = input.items.map((it, idx) => ({
    transaction_id: txnId,
    line_no: idx + 1,
    item_id: it.item_id,
    qty: it.qty,
    unit: it.unit ?? null,
    notes: it.notes ?? null,
  }));
  const { error: linesErr } = await supabase
    .from('inv_transaction_items').insert(lines as never);
  if (linesErr) throw fromPostgrest(linesErr, 'Failed to insert transaction lines');

  // 3) Optional post
  if (post) {
    const { error: postErr } = await supabase
      .from('inv_transactions')
      .update({ status: 'posted' } as never)
      .eq('id', txnId);
    if (postErr) throw fromPostgrest(postErr, 'Failed to post transaction');
  }

  // 4) Re-read for declaration_id (set by DB trigger)
  const { data: refreshed } = await supabase
    .from('inv_transactions').select('id, declaration_id')
    .eq('id', txnId).maybeSingle();

  return {
    id: txnId,
    declaration_id: (refreshed as { declaration_id: string | null } | null)?.declaration_id ?? null,
  };
}

// Re-export for ergonomic imports.
export { ServiceError };