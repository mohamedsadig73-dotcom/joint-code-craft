
-- ============================================================
-- M1: Item Naming System Foundation (revised)
-- ============================================================

-- 1) Enable fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- 2) Units of Measure dictionary
CREATE TABLE IF NOT EXISTS public.uom_dictionary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.uom_dictionary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uom_select_all" ON public.uom_dictionary;
CREATE POLICY "uom_select_all" ON public.uom_dictionary FOR SELECT USING (true);
DROP POLICY IF EXISTS "uom_admin_manage" ON public.uom_dictionary;
CREATE POLICY "uom_admin_manage" ON public.uom_dictionary FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

INSERT INTO public.uom_dictionary (code, name_ar, name_en, sort_order) VALUES
  ('PCS', 'قطعة', 'Piece', 1),
  ('BOX', 'صندوق', 'Box', 2),
  ('CTN', 'كرتون', 'Carton', 3),
  ('SET', 'طقم', 'Set', 4),
  ('BAG', 'كيس', 'Bag', 5),
  ('ROL', 'رول', 'Roll', 6),
  ('PLT', 'باليت', 'Pallet', 7),
  ('MTR', 'متر', 'Meter', 8),
  ('LTR', 'لتر', 'Liter', 9),
  ('KG',  'كيلو', 'Kilogram', 10)
ON CONFLICT (code) DO NOTHING;

-- 3) Extend existing item_categories table with level + sort_order
ALTER TABLE public.item_categories
  ADD COLUMN IF NOT EXISTS level int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

-- Make name_en NOT NULL safe (some existing rows may have NULL)
UPDATE public.item_categories SET name_en = name_ar WHERE name_en IS NULL;

-- Seed 10 main categories (skip if exist)
INSERT INTO public.item_categories (code, name_ar, name_en, level, sort_order) VALUES
  ('FURN','أثاث وديكور','Furniture & Decor',1,1),
  ('ELEC','إلكترونيات','Electronics',1,2),
  ('FOOD','مواد غذائية','Food',1,3),
  ('CLEN','مواد تنظيف','Cleaning',1,4),
  ('BLDG','مواد بناء','Building Materials',1,5),
  ('ELCL','كهرباء ومعدات','Electrical & Equipment',1,6),
  ('VHCL','مركبات وقطع غيار','Vehicles & Spare Parts',1,7),
  ('OFFC','مستلزمات مكتبية','Office Supplies',1,8),
  ('AGRI','مستلزمات زراعية','Agricultural',1,9),
  ('HUNT','مواد مقناص وصيد','Hunting & Fishing',1,10)
ON CONFLICT (code) DO UPDATE SET level = 1, sort_order = EXCLUDED.sort_order;

-- Seed sub-categories
WITH parents AS (SELECT id, code FROM public.item_categories WHERE level=1)
INSERT INTO public.item_categories (code, parent_id, name_ar, name_en, level, sort_order)
SELECT v.code, p.id, v.name_ar, v.name_en, 2, v.sort_order
FROM (VALUES
  ('FURN','FUR-TAB','طاولات','Tables',1),
  ('FURN','FUR-CHR','كراسي','Chairs',2),
  ('FURN','FUR-BED','أسرّة','Beds',3),
  ('FURN','FUR-DEC','ديكور','Decor',4),
  ('ELEC','ELE-TVS','تلفزيونات','TVs',1),
  ('ELEC','ELE-CPU','حاسبات','Computers',2),
  ('ELEC','ELE-PHN','هواتف','Phones',3),
  ('ELEC','ELE-SCR','شاشات','Screens',4),
  ('FOOD','FOD-DRY','جاف','Dry',1),
  ('FOOD','FOD-FRZ','مجمد','Frozen',2),
  ('FOOD','FOD-FRS','طازج','Fresh',3),
  ('FOOD','FOD-BEV','مشروبات','Beverages',4),
  ('CLEN','CLN-LQD','سائل','Liquid',1),
  ('CLEN','CLN-PWD','مسحوق','Powder',2),
  ('CLEN','CLN-EQP','معدات','Equipment',3),
  ('BLDG','BLD-CMT','أسمنت','Cement',1),
  ('BLDG','BLD-PLT','دهانات','Paint',2),
  ('BLDG','BLD-TLE','سيراميك','Tiles',3),
  ('BLDG','BLD-PLM','سباكة','Plumbing',4),
  ('ELCL','ELC-BLB','لمبات','Bulbs',1),
  ('ELCL','ELC-CBL','كابلات','Cables',2),
  ('ELCL','ELC-GNR','مولدات','Generators',3),
  ('VHCL','VHC-CAR','سيارات','Cars',1),
  ('VHCL','VHC-SPC','قطع غيار','Spare Parts',2),
  ('VHCL','VHC-TYR','إطارات','Tires',3),
  ('OFFC','OFC-STN','قرطاسية','Stationery',1),
  ('OFFC','OFC-FRN','أثاث مكتبي','Office Furniture',2),
  ('OFFC','OFC-EQP','معدات','Equipment',3),
  ('AGRI','AGR-SED','بذور','Seeds',1),
  ('AGRI','AGR-FRT','سماد','Fertilizer',2),
  ('AGRI','AGR-EQP','معدات','Equipment',3),
  ('HUNT','HNT-EQP','معدات','Equipment',1),
  ('HUNT','HNT-ACC','إكسسوار','Accessories',2)
) AS v(parent_code, code, name_ar, name_en, sort_order)
JOIN parents p ON p.code = v.parent_code
ON CONFLICT (code) DO UPDATE SET level = 2, sort_order = EXCLUDED.sort_order;

-- 4) Extend items_master
ALTER TABLE public.items_master
  ADD COLUMN IF NOT EXISTS internal_ref text,
  ADD COLUMN IF NOT EXISTS sub_category_id uuid REFERENCES public.item_categories(id),
  ADD COLUMN IF NOT EXISTS uom_dict_id uuid REFERENCES public.uom_dictionary(id),
  ADD COLUMN IF NOT EXISTS spec text,
  ADD COLUMN IF NOT EXISTS variant_code text,
  ADD COLUMN IF NOT EXISTS qr_payload text,
  ADD COLUMN IF NOT EXISTS naming_quality_score int DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_master_internal_ref
  ON public.items_master(internal_ref) WHERE internal_ref IS NOT NULL;

-- 5) Trigram indexes
CREATE INDEX IF NOT EXISTS idx_items_master_name_ar_trgm
  ON public.items_master USING gin (name_ar extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_items_master_name_en_trgm
  ON public.items_master USING gin (name_en extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_items_master_desc_trgm
  ON public.items_master USING gin (description extensions.gin_trgm_ops);

-- 6) Generate internal_ref
CREATE OR REPLACE FUNCTION public.generate_item_internal_ref(
  _category_code text,
  _sub_category_code text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_prefix text; v_seq int;
BEGIN
  IF _sub_category_code IS NOT NULL THEN
    v_prefix := UPPER(_sub_category_code);
  ELSE
    v_prefix := UPPER(LEFT(_category_code, 3)) || '-GEN';
  END IF;
  SELECT COALESCE(MAX(CAST(SUBSTRING(internal_ref FROM '[0-9]+$') AS int)), 0) + 1
    INTO v_seq
  FROM public.items_master WHERE internal_ref LIKE v_prefix || '-%';
  RETURN v_prefix || '-' || LPAD(v_seq::text, 5, '0');
END;
$$;

-- 7) Find similar items
CREATE OR REPLACE FUNCTION public.find_similar_items(
  _name text,
  _category_id uuid DEFAULT NULL,
  _threshold real DEFAULT 0.55,
  _limit int DEFAULT 5
) RETURNS TABLE (
  id uuid, internal_ref text, name_ar text, name_en text,
  similarity real, category_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT i.id, i.internal_ref, i.name_ar, i.name_en,
         GREATEST(
           similarity(COALESCE(i.name_ar,''), _name),
           similarity(COALESCE(i.name_en,''), _name),
           similarity(COALESCE(i.description,''), _name)
         ) AS sim,
         i.category_id
  FROM public.items_master i
  WHERE i.is_active = true
    AND (_category_id IS NULL OR i.category_id = _category_id OR i.sub_category_id = _category_id)
    AND (
      COALESCE(i.name_ar,'') % _name
      OR COALESCE(i.name_en,'') % _name
      OR COALESCE(i.description,'') % _name
    )
  ORDER BY sim DESC
  LIMIT _limit;
$$;

-- 8) Normalize UOM
CREATE OR REPLACE FUNCTION public.normalize_uom(_raw text)
RETURNS text LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE UPPER(TRIM(COALESCE(_raw,'')))
    WHEN 'UNIT' THEN 'PCS'
    WHEN 'PIECE' THEN 'PCS'
    WHEN 'PIECES' THEN 'PCS'
    WHEN 'PC' THEN 'PCS'
    WHEN 'CARTON' THEN 'CTN'
    WHEN 'BOX' THEN 'BOX'
    WHEN 'PALLET' THEN 'PLT'
    WHEN 'SET*2*1' THEN 'SET'
    WHEN 'SET' THEN 'SET'
    WHEN 'BAG' THEN 'BAG'
    WHEN 'ROLL' THEN 'ROL'
    WHEN 'METER' THEN 'MTR'
    WHEN 'LITER' THEN 'LTR'
    WHEN 'KG' THEN 'KG'
    WHEN '' THEN 'PCS'
    ELSE UPPER(TRIM(_raw))
  END;
$$;

-- 9) Quality score
CREATE OR REPLACE FUNCTION public.calculate_item_quality_score(_item_id uuid)
RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_score int := 0; r record;
BEGIN
  SELECT * INTO r FROM public.items_master WHERE id = _item_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF r.internal_ref IS NOT NULL THEN v_score := v_score + 20; END IF;
  IF r.category_id IS NOT NULL THEN v_score := v_score + 15; END IF;
  IF r.sub_category_id IS NOT NULL THEN v_score := v_score + 15; END IF;
  IF r.uom_dict_id IS NOT NULL THEN v_score := v_score + 10; END IF;
  IF r.name_ar IS NOT NULL AND LENGTH(r.name_ar) >= 3 THEN v_score := v_score + 10; END IF;
  IF r.name_en IS NOT NULL AND LENGTH(r.name_en) >= 3 THEN v_score := v_score + 10; END IF;
  IF r.spec IS NOT NULL THEN v_score := v_score + 10; END IF;
  IF r.barcode IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF r.supplier_id IS NOT NULL THEN v_score := v_score + 5; END IF;
  RETURN LEAST(v_score, 100);
END;
$$;

-- 10) Naming rules
CREATE TABLE IF NOT EXISTS public.item_naming_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.item_naming_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rules_select_all" ON public.item_naming_rules;
CREATE POLICY "rules_select_all" ON public.item_naming_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS "rules_admin_manage" ON public.item_naming_rules;
CREATE POLICY "rules_admin_manage" ON public.item_naming_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.item_naming_rules (rule_key, rule_value, description) VALUES
  ('format', '"[BRAND]-[UOM]-[SPEC]-[ITEM_NAME]-[CAT]"'::jsonb, 'Standard naming format'),
  ('fuzzy_threshold', '0.85'::jsonb, 'Near-match similarity threshold (0..1)'),
  ('require_approval_for_new', 'true'::jsonb, 'New items require approval workflow'),
  ('arabic_required', 'true'::jsonb, 'Arabic name is mandatory'),
  ('english_required', 'false'::jsonb, 'English name optional')
ON CONFLICT (rule_key) DO NOTHING;
