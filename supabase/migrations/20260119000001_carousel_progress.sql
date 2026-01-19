-- Add carousel-specific fields to journey_progress table
-- Supports new carousel UX while maintaining backward compatibility

-- Add current_item_index for carousel position tracking
ALTER TABLE journey_progress
ADD COLUMN IF NOT EXISTS current_item_index INTEGER;

-- Add module_slug to track current module in carousel
ALTER TABLE journey_progress
ADD COLUMN IF NOT EXISTS module_slug TEXT;

-- Add completed_items array for carousel item tracking (parallel to completed_steps)
ALTER TABLE journey_progress
ADD COLUMN IF NOT EXISTS completed_items TEXT[] NOT NULL DEFAULT '{}';

-- Add comment explaining fields
COMMENT ON COLUMN journey_progress.current_item_index IS 'Current item position in carousel (0-indexed)';
COMMENT ON COLUMN journey_progress.module_slug IS 'Slug of the current module being viewed';
COMMENT ON COLUMN journey_progress.completed_items IS 'Array of completed carousel item IDs';

-- Create index for module_slug queries (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_journey_progress_module_slug
  ON journey_progress(module_slug)
  WHERE module_slug IS NOT NULL;
