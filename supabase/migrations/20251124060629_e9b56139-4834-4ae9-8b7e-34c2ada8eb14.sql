-- إصلاح مشاكل الأمان في RLS Policies
-- Fix critical security issues in Row Level Security

-- 1. تقييد الوصول إلى جدول profiles - السماح فقط بعرض البروفايل الخاص والمدراء يرون الكل
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 2. تقييد الوصول إلى جدول user_roles - المستخدم يرى دوره فقط والمدراء يرون الكل
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- 3. تقييد الوصول إلى جدول declarations - المستخدم يرى إقراراته فقط والمدراء/المديرين يرون الكل
DROP POLICY IF EXISTS "Users can view all declarations" ON public.declarations;

CREATE POLICY "Users can view own declarations"
ON public.declarations
FOR SELECT
USING (auth.uid() = sender_id);

CREATE POLICY "Admins and managers can view all declarations"
ON public.declarations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- 4. تقييد الوصول إلى جدول declaration_status_history - فقط لسجلات الإقرارات التي يملكها المستخدم
DROP POLICY IF EXISTS "Users can view all status history" ON public.declaration_status_history;

CREATE POLICY "Users can view own declaration history"
ON public.declaration_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.declarations
    WHERE declarations.id = declaration_status_history.declaration_id
    AND declarations.sender_id = auth.uid()
  )
);

CREATE POLICY "Admins and managers can view all history"
ON public.declaration_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- 5. إضافة تعليق توضيحي للوثائق
COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 
'يسمح للمستخدمين بعرض ملفهم الشخصي فقط';

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 
'يسمح للمدراء بعرض جميع الملفات الشخصية';

COMMENT ON POLICY "Users can view own declarations" ON public.declarations IS 
'يسمح للمستخدمين بعرض إقراراتهم الخاصة فقط';

COMMENT ON POLICY "Admins and managers can view all declarations" ON public.declarations IS 
'يسمح للمدراء والمديرين بعرض جميع الإقرارات';