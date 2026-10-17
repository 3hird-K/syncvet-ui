-- ==============================================================================
-- CAGAYAN DE ORO CITY VETERINARY OFFICE (CVO) - CLEAN PRODUCTION SCHEMA
-- Pure schema definition without dummy data.
-- Run this directly in your Supabase SQL Editor.
-- ==============================================================================

-- 1. CLINICAL CONSULTATIONS TABLE (EMR & Today's Clinic Queue)
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_no TEXT NOT NULL UNIQUE,
    pet_id TEXT,
    pet_name TEXT NOT NULL,
    species TEXT NOT NULL CHECK (species IN ('Dog', 'Cat', 'Livestock', 'Other')),
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
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in-consultation', 'treatment', 'completed')),
    service_type TEXT NOT NULL DEFAULT 'Free Consultation',
    veterinarian_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. FEFO INVENTORY ITEMS TABLE (Cold-chain Vaccines & Medical Supplies)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Vaccines', 'Medicines', 'Medical Supplies', 'Surgical Supplies', 'Equipment')),
    batch_number TEXT NOT NULL,
    manufacturer TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'doses' CHECK (unit IN ('doses', 'vials', 'tablets', 'boxes', 'units')),
    minimum_stock INTEGER NOT NULL DEFAULT 100,
    expiration_date DATE NOT NULL,
    storage_location TEXT DEFAULT 'Cold Storage Unit 1 (Walk-in)',
    status TEXT NOT NULL DEFAULT 'in-stock' CHECK (status IN ('in-stock', 'low-stock', 'expiring-soon', 'expired')),
    fefo_priority INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ANIMAL CONTROL & IMPOUNDING CASES TABLE (Rabies Observation & Stray Apprehension)
CREATE TABLE IF NOT EXISTS public.animal_control_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id TEXT NOT NULL UNIQUE,
    animal_description TEXT NOT NULL,
    species TEXT NOT NULL DEFAULT 'Dog' CHECK (species IN ('Dog', 'Cat', 'Livestock')),
    breed_estimate TEXT,
    color TEXT,
    estimated_age TEXT,
    gender TEXT DEFAULT 'Unknown' CHECK (gender IN ('Male', 'Female', 'Unknown')),
    date_captured DATE NOT NULL DEFAULT CURRENT_DATE,
    capture_time TEXT,
    barangay TEXT NOT NULL,
    specific_location TEXT,
    reason TEXT NOT NULL CHECK (reason IN ('Stray Roaming', 'Rabies Observation (Bite Incident)', 'Animal Cruelty Rescue', 'Public Safety Complaint')),
    impounding_facility TEXT DEFAULT 'CVO Animal Impounding Facility — Brgy. Agusan',
    intake_officer TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'impounded' CHECK (status IN ('impounded', 'claimed', 'released', 'adopted', 'closed')),
    holding_days_elapsed INTEGER NOT NULL DEFAULT 0,
    max_holding_days INTEGER NOT NULL DEFAULT 5,
    owner_claimant JSONB,
    timeline JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. VACCINATION RECORDS TABLE (City-wide Immunization Ledger)
CREATE TABLE IF NOT EXISTS public.vaccination_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_no TEXT NOT NULL UNIQUE,
    pet_id TEXT,
    pet_name TEXT NOT NULL,
    species TEXT NOT NULL DEFAULT 'Dog',
    breed TEXT,
    owner_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    owner_name TEXT NOT NULL,
    owner_contact TEXT,
    vaccine_name TEXT NOT NULL,
    batch_number TEXT,
    administered_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_due_date DATE,
    veterinarian TEXT NOT NULL,
    barangay TEXT,
    status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('complete', 'overdue', 'scheduled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. FIELD OPERATIONS TABLE (Barangay-level Outreach & Mobile Drives)
CREATE TABLE IF NOT EXISTS public.field_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    op_id TEXT NOT NULL UNIQUE,
    barangay TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('Mass Anti-Rabies Drive', 'Deworming Campaign', 'Stray Dog Assessment', 'Anti-Rabies + Registration', 'Other')),
    lead TEXT NOT NULL,
    scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_pets INTEGER NOT NULL DEFAULT 100,
    vaccinated_pets INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AUDIT LOGS TABLE (Official Municipal Activity Trail)
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
-- PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_consultations_date ON public.consultations(date DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON public.consultations(status);
CREATE INDEX IF NOT EXISTS idx_inventory_fefo ON public.inventory_items(expiration_date ASC);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_animal_control_status ON public.animal_control_cases(status);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_date ON public.vaccination_records(administered_date DESC);
CREATE INDEX IF NOT EXISTS idx_field_operations_date ON public.field_operations(scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_field_operations_status ON public.field_operations(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_control_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on consultations" ON public.consultations;
CREATE POLICY "Allow public read on consultations" ON public.consultations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write on consultations" ON public.consultations;
CREATE POLICY "Allow public write on consultations" ON public.consultations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read on inventory_items" ON public.inventory_items;
CREATE POLICY "Allow public read on inventory_items" ON public.inventory_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write on inventory_items" ON public.inventory_items;
CREATE POLICY "Allow public write on inventory_items" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read on animal_control_cases" ON public.animal_control_cases;
CREATE POLICY "Allow public read on animal_control_cases" ON public.animal_control_cases FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write on animal_control_cases" ON public.animal_control_cases;
CREATE POLICY "Allow public write on animal_control_cases" ON public.animal_control_cases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read on vaccination_records" ON public.vaccination_records;
CREATE POLICY "Allow public read on vaccination_records" ON public.vaccination_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write on vaccination_records" ON public.vaccination_records;
CREATE POLICY "Allow public write on vaccination_records" ON public.vaccination_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read on field_operations" ON public.field_operations;
CREATE POLICY "Allow public read on field_operations" ON public.field_operations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write on field_operations" ON public.field_operations;
CREATE POLICY "Allow public write on field_operations" ON public.field_operations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow public read on audit_logs" ON public.audit_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow public write on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- SUPABASE REALTIME REPLICATION PUBLICATION
-- ------------------------------------------------------------------------------
DO $realtimerep$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'consultations') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_items') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'animal_control_cases') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.animal_control_cases;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'vaccination_records') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vaccination_records;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'field_operations') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.field_operations;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
    END IF;
END;
$realtimerep$;
