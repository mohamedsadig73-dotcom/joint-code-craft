/**
 * Vouchers Service — declarations table + receipt/issue voucher helpers.
 *
 * Sprint 2 (P2). Wraps the legacy `declarations` table (still used as
 * authoritative ledger) with the new typed API. Also exposes voucher-
 * specific shortcuts that delegate to `inventoryService.createTransaction`.
 */
import { supabase } from '@/integrations/supabase/client';
import { ServiceError, fromPostgrest, assert } from './_shared/supabaseErrors';
import * as inv from './inventoryService';

export type DeclarationType = 'دخول' | 'خروج';
export type DeclarationStatus =
  | 'draft'
  | 'pending_warehouse_signature'
  | 'warehouse_signed'
  | 'sent_to_admin_office'
  | 'returned_to_warehouse'
  | 'archived'
  | 'rejected';

export interface CreateDeclarationInput {
  /** Numeric portion only, e.g. "0001". Will be wrapped in IN-YYYY / OUT-YYYY. */
  number: string;
  type: DeclarationType;
  status?: DeclarationStatus;
  year?: number;
  notes?: string | null;
}

/**
 * Resolve the next available numeric suffix for a given year and type.
 * Returns "0001" (zero-padded to 4) by default.
 */
export async function getNextDeclarationNumber(type: DeclarationType, year = new Date().getFullYear()): Promise<string> {
  const prefix = type === 'دخول' ? 'IN' : 'OUT';
  const { data, error } = await supabase
    .from('declarations')
    .select('id')
    .like('id', `${prefix}-${year}-%`)
    .order('id', { ascending: false })
    .limit(1);
  if (error) throw fromPostgrest(error, 'Failed to resolve next declaration number');

  const last = (data?.[0] as { id: string } | undefined)?.id;
  const lastNum = last ? parseInt(last.split('-').pop() || '0', 10) : 0;
  return String(lastNum + 1).padStart(4, '0');
}

/**
 * Insert a single declaration row. Caller must have provided a valid
 * authenticated user via Supabase session.
 */
export async function createDeclaration(input: CreateDeclarationInput, userId: string) {
  assert(userId, 'unauthorized', 'User ID required');
  assert(input.number, 'validation', 'Declaration number is required');

  const year = input.year ?? new Date().getFullYear();
  const prefix = input.type === 'دخول' ? 'IN' : 'OUT';
  const id = `${prefix}-${year}-${input.number.padStart(4, '0')}`;

  const { error } = await supabase.from('declarations').insert({
    id,
    type: input.type,
    status: input.status ?? 'draft',
    notes: input.notes ?? null,
    sender_id: userId,
  } as never);
  if (error) throw fromPostgrest(error, 'Failed to create declaration');
  return { id };
}

/**
 * Insert multiple declarations in chunks. Returns count inserted.
 * Used by the batch creation flow (up to 50 sequential numbers).
 */
export async function createDeclarationBatch(
  rows: Array<Omit<CreateDeclarationInput, 'number'> & { number: string }>,
  userId: string,
  options?: { chunkSize?: number; onProgress?: (done: number, total: number) => void }
): Promise<{ inserted: number }> {
  assert(userId, 'unauthorized', 'User ID required');
  const chunkSize = options?.chunkSize ?? 10;
  let inserted = 0;

  const payload = rows.map((r) => {
    const year = r.year ?? new Date().getFullYear();
    const prefix = r.type === 'دخول' ? 'IN' : 'OUT';
    return {
      id: `${prefix}-${year}-${r.number.padStart(4, '0')}`,
      type: r.type,
      status: r.status ?? 'draft',
      notes: r.notes ?? null,
      sender_id: userId,
    };
  });

  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error } = await supabase.from('declarations').insert(chunk as never);
    if (error) throw fromPostgrest(error, 'Failed to insert declaration chunk');
    inserted += chunk.length;
    options?.onProgress?.(inserted, payload.length);
  }

  return { inserted };
}

// ─────────────────────────────────────────────────────────────────────
// Voucher shortcuts — receipt / issue / opening
// ─────────────────────────────────────────────────────────────────────

export type VoucherKind = 'receipt' | 'issue' | 'opening';

const VOUCHER_TXN_TYPE: Record<VoucherKind, inv.InvTxnType> = {
  receipt: 'in',
  issue:   'out',
  opening: 'in', // opening balance posts as an inbound adjustment
};

export async function createVoucher(
  kind: VoucherKind,
  input: Omit<inv.CreateTransactionInput, 'txn_type'>,
  options: { userId: string; post?: boolean }
): Promise<inv.CreateTransactionResult> {
  return inv.createTransaction(
    { ...input, txn_type: VOUCHER_TXN_TYPE[kind] },
    options
  );
}

export { ServiceError };