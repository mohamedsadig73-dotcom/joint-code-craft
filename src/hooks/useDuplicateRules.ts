import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_DUPLICATE_RULES,
  ALL_DUPLICATE_FIELDS,
  type DuplicateRules,
  type DuplicateField,
} from '@/utils/boxDuplicateAnalysis';

const SETTINGS_KEY = 'box_duplicate_rules';

function sanitize(input: unknown): DuplicateRules {
  const fallback = DEFAULT_DUPLICATE_RULES;
  if (!input || typeof input !== 'object') return fallback;
  const v = input as Record<string, unknown>;
  const fieldsRaw = Array.isArray(v.fields) ? (v.fields as unknown[]) : fallback.fields;
  const fields = fieldsRaw.filter((f): f is DuplicateField =>
    typeof f === 'string' && (ALL_DUPLICATE_FIELDS as string[]).includes(f)
  );
  return {
    fields: fields.length ? fields : fallback.fields,
    block_on_save: typeof v.block_on_save === 'boolean' ? v.block_on_save : fallback.block_on_save,
  };
}

export function useDuplicateRules() {
  const [rules, setRules] = useState<DuplicateRules>(DEFAULT_DUPLICATE_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();
    if (!error && data?.value) setRules(sanitize(data.value));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRules();
    const channel = supabase
      .channel('app_settings_dup_rules')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: `key=eq.${SETTINGS_KEY}` },
        () => fetchRules()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRules]);

  const saveRules = useCallback(async (next: DuplicateRules) => {
    setSaving(true);
    const sanitized = sanitize(next);
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        [{ key: SETTINGS_KEY, value: sanitized as unknown as never, description: 'Box receipt duplicate detection rules' }],
        { onConflict: 'key' }
      );
    if (!error) setRules(sanitized);
    setSaving(false);
    return !error;
  }, []);

  return { rules, loading, saving, saveRules, refetch: fetchRules };
}