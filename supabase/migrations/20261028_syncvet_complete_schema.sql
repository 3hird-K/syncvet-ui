-- ==============================================================================
-- SYNCVET MUNICIPAL VETERINARY SYSTEM - COMPLETE DATABASE SCHEMA & REALTIME
-- Based on: supabase.types.ts & database.types.ts
-- Run this in the Supabase SQL Editor: Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE (Accounts, Staff & Pet Owners)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL DEFAULT 'Pet Owner',
    phone_number TEXT,
    address TEXT,
    avatar_url TEXT,
    profile_completed BOOLEAN DEFAULT false,
    raw_user_meta_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. PETS TABLE (Registered Municipal Companion Animals)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pets (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT NOT NULL DEFAULT 'Dog',
    breed TEXT,
    gender TEXT,
    birth_date DATE,
    color TEXT,
    distinctive_features TEXT,
    microchip_number TEXT,
    is_vaccinated BOOLEAN DEFAULT false,
    rabies_vaccinated BOOLEAN DEFAULT false,
    is_spayed_neutered BOOLEAN DEFAULT false,
    last_vaccination_date DATE,
    next_vaccination_date DATE,
    vaccination_doses INTEGER DEFAULT 0,
    weight_category TEXT,
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure is_spayed_neutered exists if table was created previously
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS is_spayed_neutered BOOLEAN DEFAULT false;

-- ------------------------------------------------------------------------------
-- 3. APPOINTMENTS TABLE (Clinic Scheduled Procedures)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY DEFAULT ('apt_' || replace(gen_random_uuid()::text, '-', '')),
    owner_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    pet_id TEXT,
    pet_name TEXT NOT NULL,
    service_id TEXT NOT NULL,
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    location TEXT DEFAULT 'City Veterinary Office Main Clinic',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. SERVICE TRANSACTIONS TABLE (Public Audit & Booking History Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_transactions (
    id TEXT PRIMARY KEY DEFAULT ('txn_' || replace(gen_random_uuid()::text, '-', '')),
    owner_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    transaction_no TEXT NOT NULL UNIQUE,
    transaction_type TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'confirmed',
    reference_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. CLINICAL CONSULTATIONS TABLE (Veterinary EMR & Examination Records)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_no TEXT NOT NULL UNIQUE,
    pet_id TEXT,
    pet_name TEXT NOT NULL,
    species TEXT NOT NULL DEFAULT 'Dog',
    breed TEXT,
    owner_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    owner_name TEXT NOT NULL,
    owner_contact TEXT,
    owner_barangay TEXT,
    vet_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT NOT NULL DEFAULT '08:00 AM',
    chief_complaint TEXT NOT NULL,
    symptoms TEXT[] DEFAULT '{}'::TEXT[],
    weight_kg NUMERIC(5,2),
    temperature_c NUMERIC(4,1),
    heart_rate_bpm INTEGER,
    mucous_membrane TEXT,
    diagnosis TEXT NOT NULL,
    treatment TEXT NOT NULL,
    medication TEXT,
    dosage_instructions TEXT,
    follow_up_date DATE,
    status TEXT NOT NULL DEFAULT 'waiting',
    service_type TEXT NOT NULL DEFAULT 'Free Consultation',
    veterinarian_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. INVENTORY ITEMS TABLE (Cold-chain Vaccines, Medicine & Medical Supplies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Vaccines', 'Medicines', 'Medical Supplies', 'Surgical Supplies', 'Equipment')),
    batch_number TEXT NOT NULL,
    manufacturer TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'doses' CHECK (unit IN ('doses', 'vials', 'tablets', 'boxes', 'units')),
    minimum_stock INTEGER NOT NULL DEFAULT 50,
    expiration_date DATE NOT NULL,
    storage_location TEXT DEFAULT 'Main Vaccine Refrigerator (2°C – 8°C)',
    status TEXT NOT NULL DEFAULT 'in-stock' CHECK (status IN ('in-stock', 'low-stock', 'expiring-soon', 'expired')),
    fefo_priority INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. VACCINATION RECORDS TABLE (Official Municipal Rabies & Core Vaccination Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vaccination_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_no TEXT NOT NULL UNIQUE DEFAULT ('VR-' || to_char(CURRENT_DATE, 'YYYY') || '-' || substr(md5(random()::text), 1, 6)),
    pet_id TEXT,
    pet_name TEXT NOT NULL,
    species TEXT DEFAULT 'Dog',
    breed TEXT,
    owner_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    owner_name TEXT NOT NULL,
    owner_contact TEXT,
    vaccine_name TEXT NOT NULL,
    batch_number TEXT,
    administered_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_due_date DATE,
    veterinarian TEXT NOT NULL DEFAULT 'City Veterinary Officer',
    barangay TEXT,
    status TEXT NOT NULL DEFAULT 'complete',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. ANIMAL CONTROL CASES TABLE (Impounding, Bite Observation & Apprehension)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.animal_control_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id TEXT NOT NULL UNIQUE,
    animal_description TEXT NOT NULL,
    species TEXT NOT NULL DEFAULT 'Dog',
    breed_estimate TEXT,
    color TEXT,
    estimated_age TEXT,
    gender TEXT DEFAULT 'Unknown',
    date_captured DATE NOT NULL DEFAULT CURRENT_DATE,
    capture_time TEXT DEFAULT '08:00 AM',
    barangay TEXT NOT NULL,
    specific_location TEXT,
    reason TEXT NOT NULL DEFAULT 'Stray Roaming',
    impounding_facility TEXT DEFAULT 'CVO Animal Impounding Facility — Brgy. Agusan',
    intake_officer TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'impounded',
    holding_days_elapsed INTEGER NOT NULL DEFAULT 0,
    max_holding_days INTEGER NOT NULL DEFAULT 5,
    owner_claimant JSONB,
    timeline JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. FIELD OPERATIONS TABLE (Barangay Outreach Caravans & Mobile Drives)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.field_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    op_id TEXT NOT NULL UNIQUE,
    barangay TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    lead TEXT NOT NULL,
    scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_pets INTEGER NOT NULL DEFAULT 100,
    vaccinated_pets INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. AUDIT LOGS TABLE (Official Municipal Action Trail)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    record_id TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. ANNOUNCEMENTS TABLE (City Veterinary Public Bulletins)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Announcement',
    priority TEXT NOT NULL DEFAULT 'normal',
    target_barangay TEXT,
    author_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'Administrator',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 12. CHATS & MESSAGES (Telemedicine & Citizen Inquiry Desk)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    user_name TEXT NOT NULL,
    user_email TEXT,
    user_phone TEXT,
    user_avatar TEXT,
    assigned_vet_id TEXT,
    assigned_vet_name TEXT,
    last_message TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    unread_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id TEXT,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'owner',
    message_text TEXT NOT NULL,
    attachment_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - PERMISSIVE FOR SYNCVET APP CLIENTS
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_control_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper to safely grant full CRUD policies for public & authenticated
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'users', 'pets', 'appointments', 'service_transactions', 
        'consultations', 'inventory_items', 'vaccination_records', 
        'animal_control_cases', 'field_operations', 
        'audit_logs', 'announcements', 'chats', 'chat_messages'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "allow_all_read_%I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "allow_all_read_%I" ON public.%I FOR SELECT USING (true)', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "allow_all_insert_%I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "allow_all_insert_%I" ON public.%I FOR INSERT WITH CHECK (true)', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "allow_all_update_%I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "allow_all_update_%I" ON public.%I FOR UPDATE USING (true) WITH CHECK (true)', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "allow_all_delete_%I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "allow_all_delete_%I" ON public.%I FOR DELETE USING (true)', tbl, tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- SUPABASE REALTIME REPLICATION (Instant TanStack Query Live Sync)
-- ==============================================================================
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'users', 'pets', 'appointments', 'service_transactions', 
        'consultations', 'inventory_items', 'vaccination_records', 
        'animal_control_cases', 'field_operations', 
        'audit_logs', 'announcements', 'chats', 'chat_messages'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
