-- Harden WMS table policies: restrict to admin/manager roles only

-- 1. wms_3pl_tenants
DROP POLICY IF EXISTS "Authenticated users can manage 3PL tenants" ON public.wms_3pl_tenants;

CREATE POLICY "Admins and managers can manage 3PL tenants" 
ON public.wms_3pl_tenants 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'manager')
  )
);

-- 2. wms_ecommerce_orders
DROP POLICY IF EXISTS "Authenticated users can manage ecommerce orders" ON public.wms_ecommerce_orders;

CREATE POLICY "Admins and managers can manage ecommerce orders" 
ON public.wms_ecommerce_orders 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'manager')
  )
);

-- 3. wms_invoice_lines
DROP POLICY IF EXISTS "Authenticated users can manage invoice lines" ON public.wms_invoice_lines;

CREATE POLICY "Admins and managers can manage invoice lines" 
ON public.wms_invoice_lines 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'manager')
  )
);

-- 4. wms_invoices
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON public.wms_invoices;

CREATE POLICY "Admins and managers can manage invoices" 
ON public.wms_invoices 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'manager')
  )
);