
-- Create enterprise_certifications table
CREATE TABLE public.enterprise_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL UNIQUE REFERENCES public.enterprises(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'uncertified',
  company_name text,
  credit_code text,
  legal_person text,
  business_license_url text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view certifications"
  ON public.enterprise_certifications FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert certification"
  ON public.enterprise_certifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update certification"
  ON public.enterprise_certifications FOR UPDATE
  USING (true);

-- Add UPDATE policy for members table
CREATE POLICY "Anyone can update member"
  ON public.members FOR UPDATE
  USING (true);
