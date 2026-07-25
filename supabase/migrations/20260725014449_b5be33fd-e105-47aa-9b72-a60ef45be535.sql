
-- 1. Receipts bucket UPDATE policy
CREATE POLICY "Users can update their own receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Move family helpers to a private schema (not exposed by PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.is_family_member(_user_id uuid, _family_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE member_user_id = _user_id AND family_id = _family_id
  )
$$;

CREATE OR REPLACE FUNCTION private.is_in_same_family(_user_id_1 uuid, _user_id_2 uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members fm1
    JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.member_user_id = _user_id_1
      AND fm2.member_user_id = _user_id_2
  )
$$;

-- Policies use these via SECURITY DEFINER — grant EXECUTE explicitly to authenticated
GRANT EXECUTE ON FUNCTION private.is_family_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_in_same_family(uuid, uuid) TO authenticated;

-- Recreate policies to use the private-schema versions
DROP POLICY IF EXISTS "Members and owners can view family" ON public.families;
CREATE POLICY "Members and owners can view family" ON public.families
FOR SELECT TO authenticated
USING ((auth.uid() = owner_id) OR private.is_family_member(auth.uid(), id));

DROP POLICY IF EXISTS "Members can view family members" ON public.family_members;
CREATE POLICY "Members can view family members" ON public.family_members
FOR SELECT TO authenticated
USING (private.is_family_member(auth.uid(), family_id));

DROP POLICY IF EXISTS "Users can view own or family categories" ON public.expense_categories;
CREATE POLICY "Users can view own or family categories" ON public.expense_categories
FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR private.is_in_same_family(auth.uid(), user_id));

DROP POLICY IF EXISTS "Users can view own or family expenses" ON public.expenses;
CREATE POLICY "Users can view own or family expenses" ON public.expenses
FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR private.is_in_same_family(auth.uid(), user_id));

DROP POLICY IF EXISTS "Users can view own or family funds" ON public.funds;
CREATE POLICY "Users can view own or family funds" ON public.funds
FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR private.is_in_same_family(auth.uid(), user_id));

DROP POLICY IF EXISTS "Users can view own or family units" ON public.units;
CREATE POLICY "Users can view own or family units" ON public.units
FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR private.is_in_same_family(auth.uid(), user_id));

-- Drop the now-unused public helper functions
DROP FUNCTION IF EXISTS public.is_family_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_in_same_family(uuid, uuid);

-- 3. Revoke direct client execution on trigger-only helpers
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
