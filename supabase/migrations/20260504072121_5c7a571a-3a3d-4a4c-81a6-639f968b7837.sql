-- App-wide settings (key/value)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read app_settings"
  ON public.app_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admin write app_settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "block anon app_settings"
  ON public.app_settings FOR SELECT
  TO anon USING (false);

-- Seed defaults
INSERT INTO public.app_settings (key, value, description) VALUES
  ('items.category_required', '{"required": true}'::jsonb, 'Whether category_id is mandatory when creating items'),
  ('items.default_category_id', '{"id": null}'::jsonb, 'Fallback category id used when category is missing and not strictly required')
ON CONFLICT (key) DO NOTHING;

CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Supplier price import history
CREATE TABLE IF NOT EXISTS public.supplier_price_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID,
  supplier_name TEXT,
  file_name TEXT,
  rows_total INT NOT NULL DEFAULT 0,
  rows_updated INT NOT NULL DEFAULT 0,
  rows_inserted INT NOT NULL DEFAULT 0,
  rows_skipped INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_price_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin/mgr read price imports"
  ON public.supplier_price_imports FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "admin/mgr insert price imports"
  ON public.supplier_price_imports FOR INSERT
  TO authenticated WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)) AND auth.uid() = created_by);

CREATE POLICY "admin delete price imports"
  ON public.supplier_price_imports FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "block anon price imports"
  ON public.supplier_price_imports FOR SELECT
  TO anon USING (false);

CREATE INDEX IF NOT EXISTS idx_spi_supplier ON public.supplier_price_imports(supplier_id);
CREATE INDEX IF NOT EXISTS idx_spi_created ON public.supplier_price_imports(created_at DESC);