-- Fix infinite recursion in RLS policies by using has_role() function

-- Drop and recreate policies on user_roles table
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Recreate user_roles policies using has_role()
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Drop and recreate declarations policies
DROP POLICY IF EXISTS "Admins and managers can view all declarations" ON public.declarations;

-- Recreate with has_role() function
CREATE POLICY "Admins and managers can view all declarations"
ON public.declarations FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);