-- Migration: Create tables for content storage
-- Issue: #31 - Supabase content storage schema
-- Parent: #16 - Batch generate modules for top 100 companies x common roles

-- =============================================================================
-- MODULES TABLE
-- =============================================================================
-- Stores generated content modules (company, role, combined, universal, industry)
-- Uses company_slug and role_slug strings (consistent with #4, #19)
-- Source of truth for companies/roles is data/search_volume.json

CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('universal', 'industry', 'role', 'company', 'company-role')),
    title TEXT NOT NULL,
    description TEXT,

    -- Targeting fields (nullable based on type)
    company_slug TEXT,              -- For company and company-role modules
    role_slug TEXT,                 -- For role and company-role modules
    industry TEXT,                  -- For industry modules

    -- Content status and versioning
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published')),
    version INTEGER NOT NULL DEFAULT 1,

    -- Quality control fields
    quality_score DECIMAL(5,2),     -- From automated quality checks (0-100)
    readability_score DECIMAL(5,2), -- Flesch-Kincaid score (0-100)
    reviewer_notes TEXT,            -- Notes from human review
    reviewed_at TIMESTAMPTZ,        -- When human review was done
    reviewed_by TEXT,               -- Who reviewed it

    -- Premium gating
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,

    -- Ordering within type group
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CONTENT BLOCKS TABLE
-- =============================================================================
-- Stores individual content pieces within modules
-- Uses JSONB for flexible content structure per block type

CREATE TABLE IF NOT EXISTS content_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL,       -- Section identifier within module
    section_title TEXT NOT NULL,    -- Section display title
    block_type TEXT NOT NULL CHECK (block_type IN (
        'text', 'header', 'quote', 'tip', 'warning',
        'video', 'audio', 'image', 'quiz', 'checklist',
        'infographic', 'animation'
    )),

    -- Flexible content storage
    content JSONB NOT NULL,         -- Type-specific content (matches ContentBlock types)

    -- Ordering
    section_order INTEGER NOT NULL DEFAULT 0,  -- Order within module sections
    block_order INTEGER NOT NULL DEFAULT 0,    -- Order within section

    -- Premium gating (can override module-level setting)
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- GENERATION RUNS TABLE
-- =============================================================================
-- Tracks history of content generation runs for auditing and debugging

CREATE TABLE IF NOT EXISTS generation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target identification
    module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
    company_slug TEXT,
    role_slug TEXT,
    module_type TEXT,

    -- Run metadata
    generator_version TEXT,         -- Version of generation script
    prompt_version TEXT,            -- Version of prompts used
    model_used TEXT,                -- AI model used (e.g., 'gpt-4', 'claude-3')

    -- Results
    status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed')),
    blocks_generated INTEGER DEFAULT 0,
    quality_score DECIMAL(5,2),
    error_message TEXT,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Cost tracking
    tokens_used INTEGER,
    estimated_cost DECIMAL(10,4)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Modules table indexes
CREATE INDEX IF NOT EXISTS idx_modules_type ON modules(type);
CREATE INDEX IF NOT EXISTS idx_modules_company ON modules(company_slug);
CREATE INDEX IF NOT EXISTS idx_modules_role ON modules(role_slug);
CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status);
CREATE INDEX IF NOT EXISTS idx_modules_industry ON modules(industry);
CREATE INDEX IF NOT EXISTS idx_modules_company_role ON modules(company_slug, role_slug);

-- Content blocks indexes
CREATE INDEX IF NOT EXISTS idx_content_blocks_module ON content_blocks(module_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_type ON content_blocks(block_type);
CREATE INDEX IF NOT EXISTS idx_content_blocks_section ON content_blocks(module_id, section_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_order ON content_blocks(module_id, section_order, block_order);

-- Generation runs indexes
CREATE INDEX IF NOT EXISTS idx_generation_runs_module ON generation_runs(module_id);
CREATE INDEX IF NOT EXISTS idx_generation_runs_company ON generation_runs(company_slug);
CREATE INDEX IF NOT EXISTS idx_generation_runs_status ON generation_runs(status);
CREATE INDEX IF NOT EXISTS idx_generation_runs_started ON generation_runs(started_at);

-- =============================================================================
-- FULL-TEXT SEARCH
-- =============================================================================

-- Add tsvector column for full-text search on modules
ALTER TABLE modules ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_modules_search ON modules USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION modules_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.company_slug, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.role_slug, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search vector on insert/update
DROP TRIGGER IF EXISTS modules_search_vector_trigger ON modules;
CREATE TRIGGER modules_search_vector_trigger
    BEFORE INSERT OR UPDATE ON modules
    FOR EACH ROW
    EXECUTE FUNCTION modules_search_vector_update();

-- =============================================================================
-- AUTO-UPDATE TIMESTAMPS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for modules updated_at
DROP TRIGGER IF EXISTS modules_updated_at_trigger ON modules;
CREATE TRIGGER modules_updated_at_trigger
    BEFORE UPDATE ON modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on tables
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published, non-premium modules
CREATE POLICY modules_read_free ON modules
    FOR SELECT
    USING (
        status = 'published' AND is_premium = FALSE
    );

-- Policy: Authenticated users with purchase can read premium modules
-- Note: This is a placeholder - actual purchase verification requires a purchases table
CREATE POLICY modules_read_premium ON modules
    FOR SELECT
    USING (
        status = 'published' AND is_premium = TRUE
        AND (
            -- Service role can always read
            auth.role() = 'service_role'
            OR
            -- Authenticated users need purchase verification (placeholder)
            -- In production, this would check against a purchases table
            auth.role() = 'authenticated'
        )
    );

-- Policy: Service role can do everything
CREATE POLICY modules_admin ON modules
    FOR ALL
    USING (auth.role() = 'service_role');

-- Content blocks inherit module visibility
CREATE POLICY content_blocks_read_free ON content_blocks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM modules m
            WHERE m.id = content_blocks.module_id
            AND m.status = 'published'
            AND (m.is_premium = FALSE OR content_blocks.is_premium = FALSE)
        )
    );

-- Policy: Authenticated users with purchase can read premium blocks
CREATE POLICY content_blocks_read_premium ON content_blocks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM modules m
            WHERE m.id = content_blocks.module_id
            AND m.status = 'published'
        )
        AND (
            auth.role() = 'service_role'
            OR auth.role() = 'authenticated'
        )
    );

-- Policy: Service role can do everything with content blocks
CREATE POLICY content_blocks_admin ON content_blocks
    FOR ALL
    USING (auth.role() = 'service_role');

-- Generation runs - service role only (internal use)
ALTER TABLE generation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY generation_runs_admin ON generation_runs
    FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE modules IS 'Content modules for interview prep courses';
COMMENT ON TABLE content_blocks IS 'Individual content pieces within modules';
COMMENT ON TABLE generation_runs IS 'Audit log of content generation runs';

COMMENT ON COLUMN modules.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN modules.type IS 'Module type: universal, industry, role, company, company-role';
COMMENT ON COLUMN modules.company_slug IS 'Company identifier matching data/search_volume.json';
COMMENT ON COLUMN modules.role_slug IS 'Role identifier matching data/search_volume.json';
COMMENT ON COLUMN modules.status IS 'Publication status: draft, reviewed, published';
COMMENT ON COLUMN modules.version IS 'Auto-incrementing version number';
COMMENT ON COLUMN modules.quality_score IS 'Automated quality score from content checks (0-100)';
COMMENT ON COLUMN modules.readability_score IS 'Flesch-Kincaid readability score (0-100)';
COMMENT ON COLUMN modules.search_vector IS 'Full-text search vector for title/description';

COMMENT ON COLUMN content_blocks.section_id IS 'Section identifier for grouping blocks';
COMMENT ON COLUMN content_blocks.content IS 'JSONB content matching ContentBlock type definitions';
COMMENT ON COLUMN content_blocks.is_premium IS 'Override module premium setting for this block';

COMMENT ON COLUMN generation_runs.generator_version IS 'Version of generation script used';
COMMENT ON COLUMN generation_runs.tokens_used IS 'Total tokens consumed during generation';
COMMENT ON COLUMN generation_runs.estimated_cost IS 'Estimated API cost in USD';
