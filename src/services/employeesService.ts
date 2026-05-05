/**
 * Employees Service — pure async API for master_employees (single source
 * of truth for employee identity).
 *
 * Sprint 3 (P2 cont.). NO React, NO toasts, NO i18n.
 */
import { supabase } from '@/integrations/supabase/client';
import { ServiceError, fromPostgrest, assert } from './_shared/supabaseErrors';

export interface MasterEmployee {
  id: string;
  employee_number: string;
  employee_name: string;
  job_title: string;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function listEmployees(opts?: { activeOnly?: boolean }): Promise<MasterEmployee[]> {
  let q = supabase
    .from('master_employees')
    .select('*')
    .order('employee_name');
  if (opts?.activeOnly ?? true) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw fromPostgrest(error);
  return (data ?? []) as MasterEmployee[];
}

export async function getEmployee(id: string): Promise<MasterEmployee | null> {
  const { data, error } = await supabase
    .from('master_employees').select('*').eq('id', id).maybeSingle();
  if (error) throw fromPostgrest(error);
  return (data as MasterEmployee | null) ?? null;
}

export interface CreateEmployeeInput {
  employee_number: string;
  employee_name: string;
  job_title?: string;
  department?: string | null;
  phone?: string | null;
}

export async function createEmployee(input: CreateEmployeeInput, opts: { userId: string }): Promise<MasterEmployee> {
  assert(opts.userId, 'unauthorized', 'User ID required');
  assert(input.employee_number && input.employee_name, 'validation', 'Employee number and name are required');
  const payload = {
    employee_number: input.employee_number,
    employee_name: input.employee_name,
    job_title: input.job_title ?? 'عامل',
    department: input.department ?? null,
    phone: input.phone ?? null,
    is_active: true,
    created_by: opts.userId,
  };
  const { data, error } = await supabase
    .from('master_employees').insert(payload as never).select().single();
  if (error || !data) throw fromPostgrest(error, 'Failed to create employee');
  return data as MasterEmployee;
}

export async function updateEmployee(id: string, patch: Partial<MasterEmployee>): Promise<void> {
  const { error } = await supabase.from('master_employees').update(patch as never).eq('id', id);
  if (error) throw fromPostgrest(error);
}

/** Master employees should be deactivated, not deleted, when linked data exists. */
export async function deactivateEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('master_employees').update({ is_active: false } as never).eq('id', id);
  if (error) throw fromPostgrest(error);
}

export { ServiceError };