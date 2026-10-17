-- ==============================================================================
-- FIX: Row-Level Security (RLS) Policy for Appointments Table
-- Allows public read & insert for appointments to match consultations & service_transactions.
-- ==============================================================================

ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on appointments" ON public.appointments;
CREATE POLICY "Allow public read on appointments"
    ON public.appointments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow public insert on appointments" ON public.appointments;
CREATE POLICY "Allow public insert on appointments"
    ON public.appointments FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on appointments" ON public.appointments;
CREATE POLICY "Allow public update on appointments"
    ON public.appointments FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on appointments" ON public.appointments;
CREATE POLICY "Allow public delete on appointments"
    ON public.appointments FOR DELETE
    USING (true);
