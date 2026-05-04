import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type SettingsMap = Record<string, any>;

let cache: SettingsMap | null = null;
const listeners = new Set<(s: SettingsMap) => void>();

async function fetchAll(): Promise<SettingsMap> {
  const { data, error } = await supabase.from('app_settings').select('key, value');
  if (error) return {};
  const out: SettingsMap = {};
  for (const row of data ?? []) out[(row as any).key] = (row as any).value;
  return out;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<SettingsMap>(cache ?? {});
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache !== null) return;
    let mounted = true;
    fetchAll().then((s) => {
      if (!mounted) return;
      cache = s;
      setSettings(s);
      setLoading(false);
      listeners.forEach((l) => l(s));
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const fn = (s: SettingsMap) => setSettings(s);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const refresh = useCallback(async () => {
    const s = await fetchAll();
    cache = s;
    setSettings(s);
    listeners.forEach((l) => l(s));
  }, []);

  const update = useCallback(async (key: string, value: any) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (!error) await refresh();
    return !error;
  }, [refresh]);

  return {
    settings,
    loading,
    refresh,
    update,
    /** Convenience: whether category is mandatory on items_master */
    categoryRequired: Boolean(settings['items.category_required']?.required ?? true),
    /** Convenience: fallback category id if any */
    defaultCategoryId: (settings['items.default_category_id']?.id ?? null) as string | null,
  };
}