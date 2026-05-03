import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CategoryRow {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  is_active: boolean;
}
export interface UomRow {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  base_unit_id: string | null;
  conversion_factor: number;
  is_active: boolean;
}
export interface SupplierRow {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_number: string | null;
  notes: string | null;
  is_active: boolean;
}
export interface ProjectRow {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  is_active: boolean;
}
export interface ReceivingStaffRow {
  id: string;
  personal_id: string | null;
  employee_no: string | null;
  full_name: string;
  job_title: string | null;
  phone: string | null;
  authorized_by: string | null;
  notes: string | null;
  is_active: boolean;
}

type TableName = 'item_categories' | 'units_of_measure' | 'suppliers' | 'projects' | 'receiving_staff';

function useGenericCrud<T extends { id: string }>(table: TableName, orderBy: string = 'created_at') {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const query = supabase.from(table as any).select('*');
    if (table === 'receiving_staff') {
      query.is('deleted_at', null);
    }
    const { data, error } = await query.order(orderBy, { ascending: true });
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows((data || []) as T[]);
    }
    setLoading(false);
  }, [table, orderBy]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (payload: Partial<T>) => {
    const { error } = await supabase.from(table as any).insert(payload as any);
    if (error) { toast.error(error.message); return false; }
    toast.success('تم الحفظ');
    await load();
    return true;
  };
  const update = async (id: string, payload: Partial<T>) => {
    const { error } = await supabase.from(table as any).update(payload as any).eq('id', id);
    if (error) { toast.error(error.message); return false; }
    toast.success('تم التحديث');
    await load();
    return true;
  };
  const remove = async (id: string) => {
    const { error } = table === 'receiving_staff'
      ? await supabase.from(table as any).update({ deleted_at: new Date().toISOString() }).eq('id', id)
      : await supabase.from(table as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return false; }
    toast.success('تم الحذف');
    await load();
    return true;
  };

  return { rows, loading, reload: load, create, update, remove };
}

export const useCategories = () => useGenericCrud<CategoryRow>('item_categories', 'code');
export const useUnits = () => useGenericCrud<UomRow>('units_of_measure', 'code');
export const useSuppliers = () => useGenericCrud<SupplierRow>('suppliers', 'code');
export const useProjects = () => useGenericCrud<ProjectRow>('projects', 'code');
export const useReceivingStaff = () => useGenericCrud<ReceivingStaffRow>('receiving_staff', 'serial');