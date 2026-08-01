
CREATE OR REPLACE FUNCTION private.can_user_add(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.member_user_id = _user_id
      AND fm.can_add = false
  );
$$;

REVOKE ALL ON FUNCTION private.can_user_add(uuid) FROM PUBLIC;

DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
CREATE POLICY "Users can insert own expenses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND private.can_user_add(auth.uid()));

DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
CREATE POLICY "Users can update own expenses"
ON public.expenses FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND private.can_user_add(auth.uid()))
WITH CHECK (auth.uid() = user_id AND private.can_user_add(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own funds" ON public.funds;
CREATE POLICY "Users can insert own funds"
ON public.funds FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND private.can_user_add(auth.uid()));

DROP POLICY IF EXISTS "Users can update own funds" ON public.funds;
CREATE POLICY "Users can update own funds"
ON public.funds FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND private.can_user_add(auth.uid()))
WITH CHECK (auth.uid() = user_id AND private.can_user_add(auth.uid()));
