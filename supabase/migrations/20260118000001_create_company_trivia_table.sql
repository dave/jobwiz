-- Migration: Create table for company trivia content
-- Issue: #19 - Generate company trivia content

CREATE TABLE IF NOT EXISTS company_trivia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_slug TEXT NOT NULL,           -- matches search_volume.json
    fact_type TEXT NOT NULL,              -- founding, hq, mission, product, news, exec, acquisition
    format TEXT NOT NULL,                 -- quiz, flashcard, factoid
    question TEXT,                        -- for quiz/flashcard
    answer TEXT NOT NULL,                 -- correct answer
    options JSONB,                        -- for quiz: ["wrong1", "wrong2", "wrong3"]
    source_url TEXT,                      -- where fact was sourced
    source_date DATE,                     -- when fact was retrieved
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_trivia_company ON company_trivia(company_slug);
CREATE INDEX IF NOT EXISTS idx_trivia_type ON company_trivia(fact_type);
CREATE INDEX IF NOT EXISTS idx_trivia_format ON company_trivia(format);
CREATE INDEX IF NOT EXISTS idx_trivia_verified ON company_trivia(verified);

-- Unique constraint to prevent duplicate questions for same company
CREATE UNIQUE INDEX IF NOT EXISTS idx_trivia_unique_question
    ON company_trivia(company_slug, question)
    WHERE question IS NOT NULL;

-- Table for tracking trivia generation runs
CREATE TABLE IF NOT EXISTS trivia_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_slug TEXT NOT NULL,
    total_generated INTEGER NOT NULL DEFAULT 0,
    new_items INTEGER NOT NULL DEFAULT 0,
    duplicates_skipped INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trivia_runs_company ON trivia_runs(company_slug);
CREATE INDEX IF NOT EXISTS idx_trivia_runs_created_at ON trivia_runs(created_at);

-- Comments for documentation
COMMENT ON TABLE company_trivia IS 'Company trivia content for phone screen prep';
COMMENT ON TABLE trivia_runs IS 'Log of trivia generation runs with metrics';

COMMENT ON COLUMN company_trivia.company_slug IS 'Company identifier matching data/search_volume.json';
COMMENT ON COLUMN company_trivia.fact_type IS 'Category: founding, hq, mission, product, news, exec, acquisition';
COMMENT ON COLUMN company_trivia.format IS 'Content format: quiz, flashcard, or factoid';
COMMENT ON COLUMN company_trivia.options IS 'JSON array of wrong answers for quiz format';
COMMENT ON COLUMN company_trivia.source_url IS 'URL where the fact was sourced from';
COMMENT ON COLUMN company_trivia.verified IS 'Whether the fact has been manually verified';
