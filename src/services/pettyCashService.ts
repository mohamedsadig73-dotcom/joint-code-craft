/**
 * Petty Cash Service — pure async API for petty_cash_periods,
 * petty_cash_expenses, cost_centers.
 *
 * Sprint 3 (P2 cont.). NO React, NO toasts, NO i18n. Throws `ServiceError`.
 *
 * NOTE: `petty_cash_expenses.total_amount` is a GENERATED column — never
 * include it in insert/update payloads. Mandated by data-integrity memory.
 */
import { supabase } from '@/integrations/supabase/client';
import { ServiceError, fromPostgrest, assert } from './_shared/supabaseErrors';

export type PettyCashStatus = 'open' | 'closed' | 'approved';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface PettyCashPeriod {
  id: string; period_number: string; location: string; responsible_person: string;
  budget_limit: number; opening_balance: number; current_balance: number;
  total_expenses: number; expenses_count: number; status: PettyCashStatus;
  opened_at: string; closed_at: string | null; opened_by: string | null;
  closed_by: string | null; approved_by: string | null; approved_at: string | null;
  notes: string | null; balance_disposition: string | null;
  disposition_amount: number | null; disposition_reference: string | null;
  carried_from_period_id: string | null;
  start_date: string | null; end_date: string | null;
  created_at: string; updated_at: string;
}

export interface PettyCashExpense {
  id: string; period_id: string; expense_date: string;
  invoice_number: string | null; vendor_name: string; description: string;
  quantity: number; unit_price: number; total_amount: number;
  cost_center: string; item_name: string | null; recipient: string | null;
  notes: string | null; status: ExpenseStatus;
  approved_by: string | null; approved_at: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}

export interface CostCenter {
  id: string; name: string; name_ar: string; description: string | null;
  active: boolean; created_at: string;
}

// ─────────── Periods ───────────
export async function listPeriods(): Promise<PettyCashPeriod[]> {
  const { data, error } = await supabase
    .from('petty_cash_periods').select('*').order('opened_at', { ascending: false });
  if (error) throw fromPostgrest(error);
  return (data ?? []) as PettyCashPeriod[];
}

export async function getOpenPeriod(): Promise<PettyCashPeriod | null> {
  const { data, error } = await supabase
    .from('petty_cash_periods').select('*').eq('status', 'open').maybeSingle();
  if (error) throw fromPostgrest(error);
  return (data as PettyCashPeriod | null) ?? null;
}

export interface OpenPeriodInput {
  period_number: string; location: string; responsible_person: string;
  opening_balance: number; budget_limit: number;
  start_date?: string | null; notes?: string | null;
  carried_from_period_id?: string | null;
}

export async function openPeriod(input: OpenPeriodInput, opts: { userId: string }): Promise<PettyCashPeriod> {
  assert(opts.userId, 'unauthorized', 'User ID required');
  const payload = {
    ...input,
    current_balance: input.opening_balance,
    status: 'open' as PettyCashStatus,
    opened_by: opts.userId,
  };
  const { data, error } = await supabase
    .from('petty_cash_periods').insert(payload as never).select().single();
  if (error || !data) throw fromPostgrest(error, 'Failed to open period');
  return data as PettyCashPeriod;
}

export async function closePeriod(
  id: string,
  args: { disposition: 'carried_forward' | 'refunded' | 'written_off'; amount: number; reference?: string | null; end_date?: string | null; notes?: string | null },
  opts: { userId: string }
): Promise<void> {
  assert(opts.userId, 'unauthorized', 'User ID required');
  const { error } = await supabase
    .from('petty_cash_periods')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: opts.userId,
      balance_disposition: args.disposition,
      disposition_amount: args.amount,
      disposition_reference: args.reference ?? null,
      end_date: args.end_date ?? null,
      notes: args.notes ?? null,
    } as never)
    .eq('id', id);
  if (error) throw fromPostgrest(error);
}

// ─────────── Expenses ───────────
export async function listExpenses(periodId?: string): Promise<PettyCashExpense[]> {
  let q = supabase.from('petty_cash_expenses').select('*').order('expense_date', { ascending: false });
  if (periodId) q = q.eq('period_id', periodId);
  const { data, error } = await q;
  if (error) throw fromPostgrest(error);
  return (data ?? []) as PettyCashExpense[];
}

export interface CreateExpenseInput {
  period_id: string; expense_date: string; invoice_number?: string | null;
  vendor_name: string; description: string;
  quantity: number; unit_price: number; cost_center: string;
  item_name?: string | null; recipient?: string | null; notes?: string | null;
}

export async function createExpense(input: CreateExpenseInput, opts: { userId: string }): Promise<PettyCashExpense> {
  assert(opts.userId, 'unauthorized', 'User ID required');
  assert(input.period_id, 'validation', 'Period is required');
  assert(input.quantity > 0 && input.unit_price > 0, 'validation', 'Quantity and unit price must be > 0');
  // total_amount is generated — DO NOT send it.
  const payload = { ...input, status: 'pending' as ExpenseStatus, created_by: opts.userId };
  const { data, error } = await supabase
    .from('petty_cash_expenses').insert(payload as never).select().single();
  if (error || !data) throw fromPostgrest(error, 'Failed to create expense');
  return data as PettyCashExpense;
}

export async function updateExpense(id: string, patch: Partial<Omit<PettyCashExpense, 'total_amount'>>): Promise<void> {
  // Strip total_amount defensively in case caller spreads the row
  const { total_amount: _ignore, ...safe } = patch as Record<string, unknown>;
  void _ignore;
  const { error } = await supabase.from('petty_cash_expenses').update(safe as never).eq('id', id);
  if (error) throw fromPostgrest(error);
}

export async function approveExpense(id: string, opts: { userId: string }): Promise<void> {
  assert(opts.userId, 'unauthorized', 'User ID required');
  const { error } = await supabase
    .from('petty_cash_expenses')
    .update({ status: 'approved', approved_by: opts.userId, approved_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw fromPostgrest(error);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('petty_cash_expenses').delete().eq('id', id);
  if (error) throw fromPostgrest(error);
}

// ─────────── Cost centers ───────────
export async function listCostCenters(activeOnly = true): Promise<CostCenter[]> {
  let q = supabase.from('cost_centers').select('*').order('name_ar');
  if (activeOnly) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw fromPostgrest(error);
  return (data ?? []) as CostCenter[];
}

export { ServiceError };