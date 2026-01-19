-- Migration: Drop unused modules and content_blocks tables
-- Issue: #147 - C5: Remove unused modules database tables and code
--
-- These tables were created for database-backed content storage but
-- the project now uses JSON files for module content (carousel UX).

-- =============================================================================
-- DROP TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Drop modules triggers
DROP TRIGGER IF EXISTS modules_search_vector_trigger ON modules;
DROP TRIGGER IF EXISTS modules_updated_at_trigger ON modules;

-- Drop modules functions
DROP FUNCTION IF EXISTS modules_search_vector_update();
-- Note: update_updated_at_column may be used by other tables, so don't drop it

-- =============================================================================
-- DROP POLICIES
-- =============================================================================

-- Drop modules policies
DROP POLICY IF EXISTS modules_read_free ON modules;
DROP POLICY IF EXISTS modules_read_premium ON modules;
DROP POLICY IF EXISTS modules_admin ON modules;

-- Drop content_blocks policies
DROP POLICY IF EXISTS content_blocks_read_free ON content_blocks;
DROP POLICY IF EXISTS content_blocks_read_premium ON content_blocks;
DROP POLICY IF EXISTS content_blocks_admin ON content_blocks;

-- Drop generation_runs policies
DROP POLICY IF EXISTS generation_runs_admin ON generation_runs;

-- =============================================================================
-- DROP TABLES
-- =============================================================================

-- Drop tables in correct order (content_blocks depends on modules)
DROP TABLE IF EXISTS content_blocks;
DROP TABLE IF EXISTS generation_runs;
DROP TABLE IF EXISTS modules;

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN journey_progress.current_item_index IS 'Carousel item position';
COMMENT ON COLUMN journey_progress.module_slug IS 'Current module being viewed';
COMMENT ON COLUMN journey_progress.completed_items IS 'Array of completed carousel item IDs';
