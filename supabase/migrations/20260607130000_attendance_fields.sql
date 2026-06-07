-- Add roll_number and class_id to workers (Students)
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS roll_number TEXT DEFAULT '';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add class_id and notes to work_entries (Attendance records)
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS notes TEXT;
