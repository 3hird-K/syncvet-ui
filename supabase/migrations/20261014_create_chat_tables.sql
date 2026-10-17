-- ==============================================================================
-- SYNCVET CAGAYAN DE ORO CITY VETERINARY OFFICE (CVO)
-- REALTIME CITIZEN CHAT & VETERINARY INQUIRY MESSAGING SCHEMA
-- Run this directly in your Supabase SQL Editor.
-- ==============================================================================

-- 1. CHATS / THREADS TABLE
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    pet_id TEXT,
    pet_name TEXT,
    subject TEXT DEFAULT 'General Veterinary Consultation / Inquiry',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending_vet', 'resolved', 'closed')),
    assigned_vet_name TEXT DEFAULT 'Dr. Helen Ann P. Tacandong, DVM',
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('Pet Owner', 'Veterinarian', 'Staff', 'System')),
    sender_name TEXT NOT NULL,
    message_text TEXT NOT NULL,
    attachment_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for authenticated citizen & staff access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Public read and insert on chats'
    ) THEN
        CREATE POLICY "Public read and insert on chats" ON public.chats
            FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Public read and insert on chat_messages'
    ) THEN
        CREATE POLICY "Public read and insert on chat_messages" ON public.chat_messages
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_chats_owner ON public.chats(owner_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at ASC);
