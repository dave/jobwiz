-- Migration: Create generation queue table for priority-based content generation
-- Issue: #32 - Generation priority queue system
-- Parent: #16 - Batch generate modules for top 100 companies x common roles

-- =============================================================================
-- GENERATION QUEUE TABLE
-- =============================================================================
-- Manages the queue of company/role combinations awaiting content generation
-- Priority is calculated from search volume data (data/search_volume.json)
-- Uses company_slug/role_slug strings (consistent with #4, #19, #31)

CREATE TABLE IF NOT EXISTS generation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target identification (matching search_volume.json format)
    company_slug TEXT NOT NULL,
    role_slug TEXT,                  -- Nullable for company-only modules

    -- Priority (higher = process first)
    priority_score INTEGER NOT NULL DEFAULT 0,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),

    -- Processing metadata
    claimed_at TIMESTAMPTZ,          -- When an orchestrator claimed this item
    claimed_by TEXT,                 -- Identifier of the orchestrator process
    completed_at TIMESTAMPTZ,        -- When processing completed

    -- Error tracking
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,

    -- Reference to generated module (if completed)
    module_id UUID REFERENCES modules(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate entries for same company/role combo
    CONSTRAINT unique_company_role UNIQUE (company_slug, role_slug)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for fetching next item by priority
CREATE INDEX IF NOT EXISTS idx_generation_queue_priority
    ON generation_queue(priority_score DESC)
    WHERE status = 'pending';

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_generation_queue_status
    ON generation_queue(status);

-- Index for company lookup
CREATE INDEX IF NOT EXISTS idx_generation_queue_company
    ON generation_queue(company_slug);

-- Index for finding stale in_progress items (for cleanup)
CREATE INDEX IF NOT EXISTS idx_generation_queue_claimed
    ON generation_queue(claimed_at)
    WHERE status = 'in_progress';

-- =============================================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- =============================================================================

-- Reuse the update_updated_at_column function from content storage migration
-- (already created in 20260118000002_create_content_storage_tables.sql)

DROP TRIGGER IF EXISTS generation_queue_updated_at_trigger ON generation_queue;
CREATE TRIGGER generation_queue_updated_at_trigger
    BEFORE UPDATE ON generation_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE generation_queue ENABLE ROW LEVEL SECURITY;

-- Service role has full access (queue management is internal)
CREATE POLICY generation_queue_admin ON generation_queue
    FOR ALL
    USING (auth.role() = 'service_role');

-- Read-only access for authenticated users (for dashboard viewing)
CREATE POLICY generation_queue_read ON generation_queue
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE generation_queue IS 'Priority queue for content generation tasks';
COMMENT ON COLUMN generation_queue.company_slug IS 'Company identifier matching data/search_volume.json';
COMMENT ON COLUMN generation_queue.role_slug IS 'Role identifier (null for company-only modules)';
COMMENT ON COLUMN generation_queue.priority_score IS 'Priority score from search volume (higher = process first)';
COMMENT ON COLUMN generation_queue.status IS 'Processing status: pending, in_progress, completed, failed';
COMMENT ON COLUMN generation_queue.claimed_at IS 'Timestamp when orchestrator claimed this item';
COMMENT ON COLUMN generation_queue.claimed_by IS 'Identifier of the claiming orchestrator process';
COMMENT ON COLUMN generation_queue.retry_count IS 'Number of failed processing attempts';
COMMENT ON COLUMN generation_queue.module_id IS 'Reference to generated module when completed';
