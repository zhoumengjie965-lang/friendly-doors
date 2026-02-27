
-- Add new columns to organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS monthly_budget numeric NULL,
  ADD COLUMN IF NOT EXISTS current_month_budget numeric NULL,
  ADD COLUMN IF NOT EXISTS admin_phone text NULL;

-- Add UPDATE and DELETE RLS policies for organizations
CREATE POLICY "Anyone can update organization"
  ON public.organizations FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete organization"
  ON public.organizations FOR DELETE
  USING (true);

-- Add role column to invitations table for org_admin invitations
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS invited_role text NOT NULL DEFAULT 'member';
