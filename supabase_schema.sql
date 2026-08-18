-- ============================================================================
-- KATL OPERATIONS: COMPLETE SUPABASE POSTGRESQL SCHEMA
-- Compatible with PostgreSQL 15+ / Supabase
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Drop existing tables if re-running (Clean slate)
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users: Staff profiles, roles, PIN hashes, passwords, mobile
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT UNIQUE,
    email TEXT UNIQUE,
    pin_hash TEXT,
    password_hash TEXT,
    role TEXT NOT NULL CHECK(role IN ('OWNER', 'MANDATE_HOLDER', 'USER')),
    selfie_url TEXT,
    temp_pin TEXT,
    temp_pin_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Designations: Job titles & departments
CREATE TABLE IF NOT EXISTS public.designations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL
);

-- User Designations (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.user_designations (
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    designation_id TEXT NOT NULL REFERENCES public.designations(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, designation_id)
);

-- Designation Capabilities
CREATE TABLE IF NOT EXISTS public.designation_capabilities (
    designation_id TEXT NOT NULL REFERENCES public.designations(id) ON DELETE CASCADE,
    capability TEXT NOT NULL,
    PRIMARY KEY (designation_id, capability)
);

-- Checklist Definitions (Master list of recurring task templates)
CREATE TABLE IF NOT EXISTS public.checklist_definitions (
    id TEXT PRIMARY KEY,
    title_en TEXT NOT NULL,
    title_hi TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK(target_type IN ('DESIGNATION', 'USER')),
    target_id TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK(frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
    start_date TEXT NOT NULL,
    due_time TEXT NOT NULL DEFAULT '19:00',
    is_important BOOLEAN DEFAULT FALSE,
    is_compliance BOOLEAN DEFAULT FALSE,
    video_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Designation Task Templates (For task management per designation)
CREATE TABLE IF NOT EXISTS public.designation_task_templates (
    id TEXT PRIMARY KEY,
    title_en TEXT NOT NULL,
    title_hi TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH')),
    task_type TEXT NOT NULL DEFAULT 'REPETITIVE' CHECK(task_type IN ('REPETITIVE', 'COMPLIANCE')),
    frequency TEXT NOT NULL CHECK(frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
    designation_id TEXT NOT NULL REFERENCES public.designations(id) ON DELETE CASCADE,
    is_important BOOLEAN DEFAULT FALSE,
    is_compliance BOOLEAN DEFAULT FALSE,
    due_time TEXT DEFAULT '19:00',
    video_url TEXT,
    created_by TEXT NOT NULL REFERENCES public.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master Lists (Dropdown values, fabrics, etc.)
CREATE TABLE IF NOT EXISTS public.master_lists (
    id TEXT PRIMARY KEY,
    list_key TEXT NOT NULL,
    item_value TEXT NOT NULL,
    extra_json JSONB DEFAULT '{}'::jsonb
);

-- Holidays Calendar
CREATE TABLE IF NOT EXISTS public.holidays (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    title TEXT NOT NULL
);

-- FMS Flow Instances (O2D, PUR, JS workflows)
CREATE TABLE IF NOT EXISTS public.fms_flow_instances (
    id TEXT PRIMARY KEY,
    fms_code TEXT NOT NULL,
    display_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED', 'DELETED')),
    current_step INTEGER NOT NULL DEFAULT 1,
    started_by TEXT NOT NULL REFERENCES public.users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    settled_by TEXT,
    settled_at TIMESTAMPTZ,
    all_form_data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Work Items (Live tasks assigned to staff)
CREATE TABLE IF NOT EXISTS public.work_items (
    id TEXT PRIMARY KEY,
    source_module TEXT NOT NULL,
    source_ref_id TEXT NOT NULL,
    fms_code TEXT,
    step_no INTEGER,
    assignee_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title_en TEXT NOT NULL,
    title_hi TEXT NOT NULL,
    is_important BOOLEAN DEFAULT FALSE,
    available_from TIMESTAMPTZ NOT NULL,
    planned_at TIMESTAMPTZ NOT NULL,
    first_opened_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completed_by TEXT,
    queue_wait_hours DOUBLE PRECISION,
    delay_hours DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'DONE', 'MISSED', 'FLAGGED_FALSE')),
    flagged_false_by TEXT,
    flagged_false_reason TEXT,
    locked_at TIMESTAMPTZ,
    task_type TEXT DEFAULT 'REPETITIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FMS Step Instances (Steps in a flow)
CREATE TABLE IF NOT EXISTS public.fms_step_instances (
    id TEXT PRIMARY KEY,
    flow_id TEXT NOT NULL REFERENCES public.fms_flow_instances(id) ON DELETE CASCADE,
    step_no INTEGER NOT NULL,
    repeat_index INTEGER NOT NULL DEFAULT 0,
    assignee_user_id TEXT NOT NULL REFERENCES public.users(id),
    work_item_id TEXT REFERENCES public.work_items(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    available_from TIMESTAMPTZ NOT NULL,
    planned_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    completed_by TEXT
);

-- FMS Deleted Repository (Soft-deleted flow archive)
CREATE TABLE IF NOT EXISTS public.fms_deleted_repository (
    id TEXT PRIMARY KEY,
    flow_id TEXT NOT NULL,
    display_number TEXT NOT NULL,
    fms_code TEXT NOT NULL,
    deleted_by TEXT NOT NULL,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    full_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Score Events (Scoring ledger for performance & on-time metrics)
CREATE TABLE IF NOT EXISTS public.score_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    work_item_id TEXT NOT NULL UNIQUE REFERENCES public.work_items(id) ON DELETE CASCADE,
    week_start_date TEXT NOT NULL,
    weight INTEGER NOT NULL,
    is_done BOOLEAN NOT NULL,
    is_on_time BOOLEAN NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delegations (Ad-hoc manager delegations)
CREATE TABLE IF NOT EXISTS public.delegations (
    id TEXT PRIMARY KEY,
    created_by TEXT NOT NULL REFERENCES public.users(id),
    assignee_user_id TEXT NOT NULL REFERENCES public.users(id),
    title_en TEXT NOT NULL,
    title_hi TEXT NOT NULL,
    tat_hours DOUBLE PRECISION NOT NULL,
    is_important BOOLEAN DEFAULT FALSE,
    questions_json JSONB,
    status TEXT NOT NULL DEFAULT 'OPEN',
    work_item_id TEXT REFERENCES public.work_items(id) ON DELETE SET NULL,
    change_request_text TEXT,
    change_request_status TEXT DEFAULT 'NONE' CHECK(change_request_status IN ('NONE', 'PENDING', 'APPROVED', 'DENIED')),
    deadline_at TIMESTAMPTZ,
    deadline_no INTEGER DEFAULT 1,
    auto_replaced BOOLEAN DEFAULT FALSE,
    replaced_by TEXT,
    is_delegation_task BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Help Slips (Staff questions to management with audio/text)
CREATE TABLE IF NOT EXISTS public.help_slips (
    id TEXT PRIMARY KEY,
    raised_by TEXT NOT NULL REFERENCES public.users(id),
    text_content TEXT,
    audio_url TEXT,
    status TEXT NOT NULL DEFAULT 'ASKED' CHECK(status IN ('ASKED', 'ANSWERED', 'UNDERSTOOD')),
    answer_text TEXT,
    answered_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    understood_at TIMESTAMPTZ
);

-- Audit Logs (Owner/Mandate audit inspection records)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    work_item_id TEXT NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
    audited_by TEXT NOT NULL REFERENCES public.users(id),
    audit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result TEXT NOT NULL CHECK(result IN ('VERIFIED', 'FALSE')),
    notes TEXT
);

-- Queue Snapshots (Bottleneck analytics)
CREATE TABLE IF NOT EXISTS public.queue_snapshots (
    id TEXT PRIMARY KEY,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_module TEXT NOT NULL,
    fms_code TEXT,
    step_no INTEGER,
    designation_id TEXT REFERENCES public.designations(id) ON DELETE SET NULL,
    items_waiting INTEGER NOT NULL,
    oldest_item_wait_hours DOUBLE PRECISION NOT NULL,
    avg_wait_hours DOUBLE PRECISION NOT NULL
);

-- ============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_work_items_assignee ON public.work_items(assignee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_work_items_planned ON public.work_items(planned_at);
CREATE INDEX IF NOT EXISTS idx_work_items_source ON public.work_items(source_module);
CREATE INDEX IF NOT EXISTS idx_score_events_user_week ON public.score_events(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_master_lists_key ON public.master_lists(list_key);
CREATE INDEX IF NOT EXISTS idx_desig_task_templates ON public.designation_task_templates(designation_id);
CREATE INDEX IF NOT EXISTS idx_delegations_assignee ON public.delegations(assignee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_fms_step_assignee ON public.fms_step_instances(assignee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_help_slips_status ON public.help_slips(status);

-- ============================================================================
-- REALTIME REPLICATION CONFIGURATION (ENABLE FOR ALL TABLES)
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.help_slips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delegations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fms_flow_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fms_step_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.score_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_definitions;

-- ============================================================================
-- SUPABASE STORAGE BUCKETS SETUP
-- ============================================================================

-- Insert storage buckets if not already present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('selfies', 'selfies', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('help-slip-audio', 'help-slip-audio', true, 10485760, ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage public read access policies
CREATE POLICY "Public Read Access on Selfies"
ON storage.objects FOR SELECT
USING (bucket_id = 'selfies');

CREATE POLICY "Public Read Access on Help Slip Audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'help-slip-audio');

CREATE POLICY "Allow Uploads on Selfies"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'selfies');

CREATE POLICY "Allow Uploads on Help Slip Audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'help-slip-audio');

-- ============================================================================
-- 45-DAY STORAGE AUTO-CLEANUP FUNCTION & CRON
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_storage_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete files older than 45 days in selfies and help-slip-audio buckets
    DELETE FROM storage.objects
    WHERE bucket_id IN ('selfies', 'help-slip-audio')
      AND created_at < NOW() - INTERVAL '45 days';
END;
$$;

-- Note: In Supabase Dashboard, you can schedule this function using pg_cron:
-- SELECT cron.schedule('cleanup-old-media-daily', '0 3 * * *', 'SELECT public.cleanup_old_storage_files()');
