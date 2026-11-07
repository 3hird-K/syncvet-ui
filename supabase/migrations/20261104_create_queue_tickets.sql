-- ==============================================================================
-- CVO — SHARED CLINIC QUEUE (queue_tickets)
-- Stores the live daily clinic queue so every device (pet owner phone,
-- staff dashboard) sees the same tickets, instead of per-browser localStorage.
-- Run this in the Supabase SQL Editor for the SyncVet project.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.queue_tickets (
    id                  TEXT PRIMARY KEY,                 -- app-generated id (e.g. ticket_1730000000_ab12)
    date                DATE NOT NULL,                    -- clinic day (YYYY-MM-DD)
    ticket_number       TEXT NOT NULL,                    -- e.g. Q-001
    queue_sequence      INTEGER NOT NULL,                 -- e.g. 1
    appointment_id      TEXT,                             -- appointments.id (if booked online) or encounter ref
    encounter_no        TEXT,                             -- consultations.encounter_no (if consultation)
    owner_id            TEXT,
    owner_name          TEXT,
    owner_contact       TEXT,
    owner_barangay      TEXT,
    pet_id              TEXT,
    pet_name            TEXT NOT NULL,
    pet_photo_url       TEXT,
    species             TEXT,
    breed               TEXT,
    service_id          TEXT,                             -- vaccination | spay-neuter | consultation | ...
    service_title       TEXT,
    status              TEXT NOT NULL DEFAULT 'waiting'
                        CHECK (status IN ('waiting', 'in-consultation', 'completed', 'skipped', 'overdue')),
    serving_vet         TEXT,
    consultation_room   TEXT,
    check_in_time       TEXT,                             -- e.g. "08:05 AM" (display string)
    checked_in_at       TIMESTAMPTZ,
    called_at           TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    notes               TEXT,
    checked_in_via      TEXT,                             -- qr | manual
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_queue_tickets_date_status
    ON public.queue_tickets (date, status);

CREATE INDEX IF NOT EXISTS idx_queue_tickets_date_sequence
    ON public.queue_tickets (date, queue_sequence);

CREATE OR REPLACE FUNCTION public.set_queue_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS queue_tickets_touch_updated_at ON public.queue_tickets;
CREATE TRIGGER queue_tickets_touch_updated_at
    BEFORE UPDATE ON public.queue_tickets
    FOR EACH ROW EXECUTE FUNCTION public.set_queue_tickets_updated_at();

-- RLS (open read/write to match the rest of the public CVO app tables)
ALTER TABLE public.queue_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on queue_tickets" ON public.queue_tickets;
CREATE POLICY "Allow public read on queue_tickets"
    ON public.queue_tickets FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow public insert on queue_tickets" ON public.queue_tickets;
CREATE POLICY "Allow public insert on queue_tickets"
    ON public.queue_tickets FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on queue_tickets" ON public.queue_tickets;
CREATE POLICY "Allow public update on queue_tickets"
    ON public.queue_tickets FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on queue_tickets" ON public.queue_tickets;
CREATE POLICY "Allow public delete on queue_tickets"
    ON public.queue_tickets FOR DELETE
    USING (true);

-- Enable Realtime so the clinic dashboard and owner trackers update live
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'queue_tickets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tickets;
    END IF;
END $$;
