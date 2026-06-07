-- Alter workers table to add login fields
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS campus_id TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS password TEXT;

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  class_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents" ON public.documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public select documents" ON public.documents FOR SELECT TO anon, authenticated USING (true);

-- Create marks table
CREATE TABLE IF NOT EXISTS public.marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  marks NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_marks NUMERIC(12,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marks TO authenticated;
GRANT ALL ON public.marks TO service_role;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own marks" ON public.marks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public select marks" ON public.marks FOR SELECT TO anon, authenticated USING (true);

-- Create fees table
CREATE TABLE IF NOT EXISTS public.fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fees TO authenticated;
GRANT ALL ON public.fees TO service_role;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fees" ON public.fees FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public select fees" ON public.fees FOR SELECT TO anon, authenticated USING (true);

-- Also allow public select on workers, work_entries, and clients so students can view class/roster/attendance info
DROP POLICY IF EXISTS "public select workers" ON public.workers;
CREATE POLICY "public select workers" ON public.workers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public select work_entries" ON public.work_entries;
CREATE POLICY "public select work_entries" ON public.work_entries FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public select clients" ON public.clients;
CREATE POLICY "public select clients" ON public.clients FOR SELECT TO anon, authenticated USING (true);
