-- Create questions table for interview Q&A bank
-- Issue #18: Build question bank per position

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Position targeting (string slugs matching search_volume.json)
  company_slug TEXT NOT NULL,
  role_slug TEXT NOT NULL,

  -- Question content
  question_text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('behavioral', 'technical', 'culture', 'curveball')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),

  -- Psychology explanations from #13
  interviewer_intent TEXT NOT NULL,
  good_answer_traits TEXT[] NOT NULL DEFAULT '{}',
  common_mistakes TEXT[] NOT NULL DEFAULT '{}',

  -- Answer framework (JSONB for flexibility)
  answer_framework JSONB NOT NULL DEFAULT '{}',

  -- Categorization
  tags TEXT[] NOT NULL DEFAULT '{}',

  -- For curveball questions
  question_type TEXT CHECK (question_type IS NULL OR question_type IN ('estimation', 'hypothetical', 'self-reflection', 'creative', 'pressure')),

  -- For culture questions
  target_value TEXT,

  -- Premium gating
  is_premium BOOLEAN NOT NULL DEFAULT false,

  -- Source attribution
  source TEXT,
  source_url TEXT,

  -- Original question ID from generate-qa output
  original_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_questions_company_slug ON questions(company_slug);
CREATE INDEX idx_questions_role_slug ON questions(role_slug);
CREATE INDEX idx_questions_company_role ON questions(company_slug, role_slug);
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);

-- Create full-text search
ALTER TABLE questions ADD COLUMN search_vector tsvector;

CREATE INDEX idx_questions_search ON questions USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION questions_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.question_text, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.interviewer_intent, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.company_slug, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.role_slug, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search vector
CREATE TRIGGER questions_search_vector_trigger
  BEFORE INSERT OR UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION questions_search_vector_update();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION questions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_updated_at_trigger
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION questions_updated_at();

-- Row-level security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policy: Free users can read non-premium questions
CREATE POLICY "Anyone can read non-premium questions"
  ON questions FOR SELECT
  USING (is_premium = false);

-- Policy: Authenticated users can read premium questions
CREATE POLICY "Authenticated users can read premium questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to questions"
  ON questions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Unique constraint to prevent duplicate questions for same company/role
CREATE UNIQUE INDEX idx_questions_unique_original_id
  ON questions(company_slug, role_slug, original_id)
  WHERE original_id IS NOT NULL;

-- Create question_runs table to track generation batches
CREATE TABLE IF NOT EXISTS question_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_slug TEXT NOT NULL,
  role_slug TEXT NOT NULL,
  questions_generated INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE INDEX idx_question_runs_company_role ON question_runs(company_slug, role_slug);
CREATE INDEX idx_question_runs_status ON question_runs(status);

-- RLS for question_runs
ALTER TABLE question_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to question_runs"
  ON question_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE questions IS 'Interview questions with psychology explanations per company/role';
COMMENT ON COLUMN questions.company_slug IS 'Company slug matching search_volume.json (e.g., google)';
COMMENT ON COLUMN questions.role_slug IS 'Role slug matching search_volume.json (e.g., software-engineer)';
COMMENT ON COLUMN questions.interviewer_intent IS 'Psychology explanation of what the interviewer is really testing';
COMMENT ON COLUMN questions.good_answer_traits IS 'Array of traits a good answer demonstrates';
COMMENT ON COLUMN questions.common_mistakes IS 'Array of common mistakes candidates make';
COMMENT ON COLUMN questions.answer_framework IS 'JSONB structure with approach, key elements, etc.';
COMMENT ON COLUMN questions.original_id IS 'Original question ID from generate-qa output (e.g., beh-leadership-001)';
