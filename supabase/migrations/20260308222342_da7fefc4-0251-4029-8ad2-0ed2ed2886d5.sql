
-- Helper function: check if two users are in the same family
CREATE OR REPLACE FUNCTION public.is_in_same_family(_user_id_1 uuid, _user_id_2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members fm1
    JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.member_user_id = _user_id_1
      AND fm2.member_user_id = _user_id_2
  )
$$;

-- EXPENSES: Replace ALL policy with granular policies
DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;

-- SELECT: own + family members' expenses
CREATE POLICY "Users can view own or family expenses"
ON public.expenses FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_in_same_family(auth.uid(), user_id)
);

-- INSERT: only own
CREATE POLICY "Users can insert own expenses"
ON public.expenses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: only own
CREATE POLICY "Users can update own expenses"
ON public.expenses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- DELETE: only own
CREATE POLICY "Users can delete own expenses"
ON public.expenses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- FUNDS: Replace ALL policy with granular policies
DROP POLICY IF EXISTS "Users can manage own funds" ON public.funds;

-- SELECT: own + family members' funds
CREATE POLICY "Users can view own or family funds"
ON public.funds FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_in_same_family(auth.uid(), user_id)
);

-- INSERT: only own
CREATE POLICY "Users can insert own funds"
ON public.funds FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: only own
CREATE POLICY "Users can update own funds"
ON public.funds FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- DELETE: only own
CREATE POLICY "Users can delete own funds"
ON public.funds FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- EXPENSE CATEGORIES: Allow family members to view
DROP POLICY IF EXISTS "Users can manage own categories" ON public.expense_categories;

CREATE POLICY "Users can view own or family categories"
ON public.expense_categories FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_in_same_family(auth.uid(), user_id)
);

CREATE POLICY "Users can insert own categories"
ON public.expense_categories FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
ON public.expense_categories FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
ON public.expense_categories FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- UNITS: Allow family members to view
DROP POLICY IF EXISTS "Users can manage own units" ON public.units;

CREATE POLICY "Users can view own or family units"
ON public.units FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_in_same_family(auth.uid(), user_id)
);

CREATE POLICY "Users can insert own units"
ON public.units FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own units"
ON public.units FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own units"
ON public.units FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
