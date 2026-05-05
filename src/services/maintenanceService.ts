/**
 * Maintenance Service — pure async API for maintenance_assets,
 * maintenance_items, maintenance_vendors.
 *
 * Sprint 3 (P2 cont.). NO React, NO toasts, NO i18n. Throws `ServiceError`.
 */
import { supabase } from '@/integrations/supabase/client';
import { ServiceError, fromPostgrest, assert } from './_shared/supabaseErrors';

export type MaintenanceFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual';

export interface MaintenanceAsset {
  id: string; name: string; code: string | null; type: string; location: string;
  site: string | null; description: string | null;
  purchase_date: string | null; warranty_expiry: string | null;
  active: boolean; notes: string | null; created_by: string | null;
  created_at: string; updated_at: string;
}

export interface MaintenanceItem {
  id: string; asset_id: string | null; name: string; description: string | null;
  frequency: MaintenanceFrequency; start_date: string;
  last_maintenance_date: string | null; next_maintenance_date: string | null;
  vendor_id: string | null; estimated_cost: number | null;
  reminder_days: number | null; active: boolean | null; notes: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}

export interface MaintenanceVendor {
  id: string; name: string; contact_person: string | null;
  phone: string | null; email: string | null; address: string | null;
  specialization: string | null; notes: string | null; active: boolean | null;
  created_at: string; updated_at: string;
}

// Assets
export async function listAssets(): Promise<MaintenanceAsset[]> {
  const { data, error } = await supabase
    .from('maintenance_assets').select('*').order('name');
  if (error) throw fromPostgrest(error);
  return (data ?? []) as MaintenanceAsset[];
}

export async function createAsset(payload: Partial<MaintenanceAsset>, opts: { userId: string }): Promise<MaintenanceAsset> {
  assert(opts.userId, 'unauthorized', 'User ID required');
  assert(payload.name && payload.type && payload.location, 'validation', 'Missing required fields');
  const insertPayload = { ...(payload as Record<string, unknown>), created_by: opts.userId };
  const { data, error } = await supabase
    .from('maintenance_assets').insert(insertPayload as never).select().single();
  if (error || !data) throw fromPostgrest(error, 'Failed to create asset');
  return data as MaintenanceAsset;
}

export async function updateAsset(id: string, patch: Partial<MaintenanceAsset>): Promise<void> {
  const { error } = await supabase.from('maintenance_assets').update(patch as never).eq('id', id);
  if (error) throw fromPostgrest(error);
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from('maintenance_assets').delete().eq('id', id);
  if (error) throw fromPostgrest(error);
}

// Items (tasks)
export async function listItems(filters?: { activeOnly?: boolean; assetId?: string }): Promise<MaintenanceItem[]> {
  let q = supabase.from('maintenance_items').select('*').order('next_maintenance_date', { ascending: true });
  if (filters?.activeOnly) q = q.eq('active', true);
  if (filters?.assetId) q = q.eq('asset_id', filters.assetId);
  const { data, error } = await q;
  if (error) throw fromPostgrest(error);
  return (data ?? []) as MaintenanceItem[];
}

export async function createItem(payload: Partial<MaintenanceItem>, opts: { userId: string }): Promise<MaintenanceItem> {
  assert(opts.userId, 'unauthorized', 'User ID required');
  assert(payload.name && payload.frequency, 'validation', 'Missing required fields');
  const insertPayload = { ...(payload as Record<string, unknown>), created_by: opts.userId };
  const { data, error } = await supabase
    .from('maintenance_items').insert(insertPayload as never).select().single();
  if (error || !data) throw fromPostgrest(error, 'Failed to create maintenance item');
  return data as MaintenanceItem;
}

export async function updateItem(id: string, patch: Partial<MaintenanceItem>): Promise<void> {
  const { error } = await supabase.from('maintenance_items').update(patch as never).eq('id', id);
  if (error) throw fromPostgrest(error);
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('maintenance_items').delete().eq('id', id);
  if (error) throw fromPostgrest(error);
}

/** Mark a maintenance item as completed today, advancing next_maintenance_date by frequency. */
export async function completeItem(id: string, completionDate: string): Promise<void> {
  // Read frequency to compute next date
  const { data, error } = await supabase
    .from('maintenance_items').select('frequency').eq('id', id).maybeSingle();
  if (error || !data) throw fromPostgrest(error, 'Item not found');
  const freq = (data as { frequency: MaintenanceFrequency }).frequency;
  const next = advanceDate(completionDate, freq);
  const { error: uErr } = await supabase
    .from('maintenance_items')
    .update({ last_maintenance_date: completionDate, next_maintenance_date: next } as never)
    .eq('id', id);
  if (uErr) throw fromPostgrest(uErr);
}

function advanceDate(iso: string, freq: MaintenanceFrequency): string {
  const d = new Date(iso);
  switch (freq) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'biannual': d.setMonth(d.getMonth() + 6); break;
    case 'annual': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}

// Vendors
export async function listVendors(): Promise<MaintenanceVendor[]> {
  const { data, error } = await supabase.from('maintenance_vendors').select('*').order('name');
  if (error) throw fromPostgrest(error);
  return (data ?? []) as MaintenanceVendor[];
}

export async function createVendor(payload: Partial<MaintenanceVendor>): Promise<MaintenanceVendor> {
  assert(payload.name, 'validation', 'Vendor name required');
  const { data, error } = await supabase
    .from('maintenance_vendors').insert(payload as never).select().single();
  if (error || !data) throw fromPostgrest(error, 'Failed to create vendor');
  return data as MaintenanceVendor;
}

export async function updateVendor(id: string, patch: Partial<MaintenanceVendor>): Promise<void> {
  const { error } = await supabase.from('maintenance_vendors').update(patch as never).eq('id', id);
  if (error) throw fromPostgrest(error);
}

export async function deleteVendor(id: string): Promise<void> {
  const { error } = await supabase.from('maintenance_vendors').delete().eq('id', id);
  if (error) throw fromPostgrest(error);
}

export { ServiceError };