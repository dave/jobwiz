-- Migration: Create tables for scraped interview data
-- Issue: #4 - Build scraper for Glassdoor/Reddit interview data

-- Table for scraped Reddit posts
CREATE TABLE IF NOT EXISTS scraped_reddit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_slug TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'reddit',
    source_id TEXT NOT NULL UNIQUE,  -- Reddit post ID, prevents duplicates
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for scraped Glassdoor reviews
CREATE TABLE IF NOT EXISTS scraped_glassdoor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_slug TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'glassdoor',
    source_id TEXT NOT NULL UNIQUE,  -- Glassdoor review ID, prevents duplicates
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tracking scrape runs
CREATE TABLE IF NOT EXISTS scrape_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    company_slug TEXT NOT NULL,
    total_fetched INTEGER NOT NULL DEFAULT 0,
    new_items INTEGER NOT NULL DEFAULT 0,
    duplicates_skipped INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_scraped_reddit_company ON scraped_reddit(company_slug);
CREATE INDEX IF NOT EXISTS idx_scraped_reddit_scraped_at ON scraped_reddit(scraped_at);

CREATE INDEX IF NOT EXISTS idx_scraped_glassdoor_company ON scraped_glassdoor(company_slug);
CREATE INDEX IF NOT EXISTS idx_scraped_glassdoor_scraped_at ON scraped_glassdoor(scraped_at);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_source ON scrape_runs(source);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_company ON scrape_runs(company_slug);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_created_at ON scrape_runs(created_at);

-- Comments for documentation
COMMENT ON TABLE scraped_reddit IS 'Raw interview-related posts scraped from Reddit';
COMMENT ON TABLE scraped_glassdoor IS 'Raw interview reviews scraped from Glassdoor';
COMMENT ON TABLE scrape_runs IS 'Log of scrape runs with success/failure metrics';

COMMENT ON COLUMN scraped_reddit.source_id IS 'Unique ID from Reddit (prevents duplicate inserts)';
COMMENT ON COLUMN scraped_glassdoor.source_id IS 'Unique ID from Glassdoor (prevents duplicate inserts)';
COMMENT ON COLUMN scrape_runs.duplicates_skipped IS 'Count of items not inserted due to existing source_id';
