-- Create families table
CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create family_members table
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_add boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(family_id, member_user_id)
);

-- Enable RLS
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Security definer function: check if user is a member of a family
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE member_user_id = _user_id AND family_id = _family_id
  )
$$;

-- RLS for families: authenticated users can SELECT (needed for invite code lookup)
CREATE POLICY "Authenticated users can view families"
ON public.families FOR SELECT
TO authenticated
USING (true);

-- RLS for families: authenticated users can create families
CREATE POLICY "Users can create families"
ON public.families FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- RLS for families: only owner can update
CREATE POLICY "Owner can update family"
ON public.families FOR UPDATE
USING (auth.uid() = owner_id);

-- RLS for families: only owner can delete
CREATE POLICY "Owner can delete family"
ON public.families FOR DELETE
USING (auth.uid() = owner_id);

-- RLS for family_members: members can view other members in same family
CREATE POLICY "Members can view family members"
ON public.family_members FOR SELECT
USING (public.is_family_member(auth.uid(), family_id));

-- RLS for family_members: authenticated users can join (insert themselves)
CREATE POLICY "Users can join families"
ON public.family_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = member_user_id);

-- RLS for family_members: owner can update members
CREATE POLICY "Owner can update members"
ON public.family_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.families
    WHERE families.id = family_members.family_id
    AND families.owner_id = auth.uid()
  )
);

-- RLS for family_members: owner can remove members, or user can leave
CREATE POLICY "Owner or self can delete members"
ON public.family_members FOR DELETE
USING (
  auth.uid() = member_user_id
  OR EXISTS (
    SELECT 1 FROM public.families
    WHERE families.id = family_members.family_id
    AND families.owner_id = auth.uid()
  )
);

-- Add updated_at trigger for families
CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Allow profiles to be viewed by family members (for showing member emails)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own or family profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.family_members fm1
    JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.member_user_id = auth.uid()
    AND fm2.member_user_id = profiles.id
  )
);