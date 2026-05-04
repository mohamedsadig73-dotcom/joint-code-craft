import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MasterEmployee {
  id: string;
  employee_number: string;
  employee_name: string;
  job_title: string;
  department: string | null;
  phone: string | null;
  is_active: boolean;
}

export function useMasterEmployees() {
  const [employees, setEmployees] = useState<MasterEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('master_employees')
      .select('id,employee_number,employee_name,job_title,department,phone,is_active')
      .eq('is_active', true)
      .order('employee_name');
    setEmployees((data ?? []) as MasterEmployee[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { employees, loading, refetch: fetch };
}