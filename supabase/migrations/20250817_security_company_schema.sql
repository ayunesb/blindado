-- PROFILES: ensure company_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='company_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN company_id uuid NULL;
  END IF;
END$$;

-- COMPANIES
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- GUARDS
CREATE TABLE IF NOT EXISTS public.guards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- VEHICLES
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  type text,
  plate text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- GUARD DOCUMENTS
CREATE TABLE IF NOT EXISTS public.guard_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id uuid REFERENCES public.guards(id) ON DELETE CASCADE,
  doc_type text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_guards_company_id ON public.guards(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON public.vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_guard_docs_guard_id ON public.guard_documents(guard_id);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_documents ENABLE ROW LEVEL SECURITY;

-- POLICIES: drop then recreate
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles self';
  IF FOUND THEN EXECUTE 'DROP POLICY "profiles self" ON public.profiles'; END IF;
END $$;

CREATE POLICY "profiles self" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='companies' AND policyname='company admins manage own company';
  IF FOUND THEN EXECUTE 'DROP POLICY "company admins manage own company" ON public.companies'; END IF;
END $$;

CREATE POLICY "company admins manage own company" ON public.companies
  FOR ALL
  USING (id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='guards' AND policyname='guards manage';
  IF FOUND THEN EXECUTE 'DROP POLICY "guards manage" ON public.guards'; END IF;
END $$;

CREATE POLICY "guards manage" ON public.guards
  FOR ALL
  USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='vehicles' AND policyname='vehicles manage';
  IF FOUND THEN EXECUTE 'DROP POLICY "vehicles manage" ON public.vehicles'; END IF;
END $$;

CREATE POLICY "vehicles manage" ON public.vehicles
  FOR ALL
  USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='guard_documents' AND policyname='guard docs manage';
  IF FOUND THEN EXECUTE 'DROP POLICY "guard docs manage" ON public.guard_documents'; END IF;
END $$;

CREATE POLICY "guard docs manage" ON public.guard_documents
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.guards g WHERE g.id = guard_id AND g.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.guards g WHERE g.id = guard_id AND g.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
