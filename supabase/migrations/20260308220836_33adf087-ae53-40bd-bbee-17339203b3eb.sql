-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view families" ON public.families;

-- Allow only owners and members to view their family
CREATE POLICY "Members and owners can view family"
ON public.families FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
  OR public.is_family_member(auth.uid(), id)
);

-- Create a SECURITY DEFINER RPC to join by invite code (server-side lookup)
CREATE OR REPLACE FUNCTION public.join_family_by_invite_code(_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _family_id uuid;
  _user_id uuid;
  _existing boolean;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find family by invite code
  SELECT id INTO _family_id FROM public.families WHERE invite_code = _invite_code;
  IF _family_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Check if already a member
  SELECT EXISTS (
    SELECT 1 FROM public.family_members WHERE family_id = _family_id AND member_user_id = _user_id
  ) INTO _existing;
  IF _existing THEN
    RAISE EXCEPTION 'Already a member';
  END IF;

  -- Add as member
  INSERT INTO public.family_members (family_id, member_user_id, can_add)
  VALUES (_family_id, _user_id, false);

  RETURN _family_id;
END;
$$;