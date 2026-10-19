-- ==============================================================================
-- SYNCVET CAGAYAN DE ORO CITY VETERINARY OFFICE (CVO)
-- REALTIME ANNOUNCEMENTS & OFFICIAL ADVISORIES SCHEMA
-- Run this directly in your Supabase SQL Editor.
-- ==============================================================================

-- 1. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General' CHECK (category IN ('General', 'Vaccination Drive', 'Urgent Advisory', 'Clinic Schedule', 'Public Health')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    author_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT 'City Veterinary Office',
    author_role TEXT NOT NULL DEFAULT 'Administrator',
    target_barangay TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for authenticated citizen & staff access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Public read on announcements'
    ) THEN
        CREATE POLICY "Public read on announcements" ON public.announcements
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Public write on announcements'
    ) THEN
        CREATE POLICY "Public write on announcements" ON public.announcements
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Enable Realtime Replication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'announcements'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    END IF;
END $$;

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_announcements_active_created ON public.announcements(is_active, is_pinned DESC, created_at DESC);

-- Seed with official Cagayan de Oro CVO sample announcements
INSERT INTO public.announcements (title, content, category, priority, author_name, author_role, is_pinned)
VALUES 
(
    'Free Barangay Anti-Rabies Vaccination Caravan',
    'The Cagayan de Oro City Veterinary Office (CVO) mobile vaccination team will be stationed at Barangay Carmen Covered Court and Barangay Nazareth this Saturday from 8:00 AM to 3:00 PM. Bring your pets and digital passports!',
    'Vaccination Drive',
    'high',
    'Dr. Helen Ann P. Tacandong',
    'Veterinarian',
    true
),
(
    'Daily Free Spay & Neuter (Kapon) Quotas Open',
    'Walk-in surgical slots for canine and feline castrations/spays are available Monday to Friday at our main clinic in J. Pacana St., Macabalan. Please fast your pets for 8 hours prior to procedure.',
    'Clinic Schedule',
    'normal',
    'CVO Admin Desk',
    'Administrator',
    false
)
ON CONFLICT DO NOTHING;
