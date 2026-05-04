import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UomDict {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  sort_order: number;
}

export interface ItemCategory {
  id: string;
  code: string;
  parent_id: string | null;
  name_ar: string;
  name_en: string;
  level: number;
  sort_order: number;
}

export interface NamingRule {
  rule_key: string;
  rule_value: any;
  description: string | null;
}

export interface SimilarItem {
  id: string;
  internal_ref: string | null;
  name_ar: string | null;
  name_en: string | null;
  similarity: number;
  category_id: string | null;
}

export function useUomDictionary() {
  const [data, setData] = useState<UomDict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('uom_dictionary' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (!cancelled && rows) setData(rows as unknown as UomDict[]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { data, loading };
}

export function useItemCategories() {
  const [data, setData] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('item_categories' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (!cancelled && rows) setData(rows as unknown as ItemCategory[]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const mainCategories = data.filter((c) => c.level === 1);
  const subCategories = (parentId: string) =>
    data.filter((c) => c.parent_id === parentId);

  return { data, loading, mainCategories, subCategories };
}

export function useNamingRules() {
  const [rules, setRules] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('item_naming_rules' as any)
        .select('rule_key, rule_value');
      if (!cancelled && rows) {
        const map: Record<string, any> = {};
        (rows as any[]).forEach((r) => { map[r.rule_key] = r.rule_value; });
        setRules(map);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { rules, loading };
}

export function useFindSimilarItems() {
  return useCallback(
    async (
      name: string,
      categoryId?: string | null,
      threshold = 0.55,
      limit = 5,
    ): Promise<SimilarItem[]> => {
      if (!name || name.trim().length < 3) return [];
      const { data, error } = await supabase.rpc('find_similar_items' as any, {
        _name: name.trim(),
        _category_id: categoryId ?? null,
        _threshold: threshold,
        _limit: limit,
      });
      if (error) return [];
      return (data as unknown as SimilarItem[]) ?? [];
    },
    [],
  );
}

export async function generateInternalRef(
  categoryCode: string,
  subCategoryCode?: string | null,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('generate_item_internal_ref' as any, {
    _category_code: categoryCode,
    _sub_category_code: subCategoryCode ?? null,
  });
  if (error) return null;
  return (data as unknown as string) ?? null;
}