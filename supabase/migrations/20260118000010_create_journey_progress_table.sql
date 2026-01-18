-- Create journey_progress table for storing user journey state
-- Used by src/lib/journey/supabase-sync.ts

CREATE TABLE journey_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id TEXT NOT NULL,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  answers JSONB NOT NULL DEFAULT '[]',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, journey_id)
);

-- Index for fast lookups by user_id and journey_id
CREATE INDEX idx_journey_progress_user_journey
  ON journey_progress(user_id, journey_id);

-- Enable RLS
ALTER TABLE journey_progress ENABLE ROW LEVEL SECURITY;

-- Users can only access their own journey progress
CREATE POLICY "Users can view own journey progress"
  ON journey_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journey progress"
  ON journey_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journey progress"
  ON journey_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journey progress"
  ON journey_progress FOR DELETE
  USING (auth.uid() = user_id);
