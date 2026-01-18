-- Migration: Create company_themes table
-- Issue: #36 - Company theming system

-- Create company_themes table for storing company branding information
CREATE TABLE IF NOT EXISTS company_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2563eb',      -- Default blue-600
  secondary_color TEXT NOT NULL DEFAULT '#64748b',    -- Default slate-500
  industry_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for company_slug lookups
CREATE INDEX IF NOT EXISTS idx_company_themes_company_slug ON company_themes(company_slug);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_themes_updated_at
  BEFORE UPDATE ON company_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_company_themes_updated_at();

-- Row Level Security
ALTER TABLE company_themes ENABLE ROW LEVEL SECURITY;

-- Everyone can read company themes (public data)
CREATE POLICY "Public can read company themes"
  ON company_themes
  FOR SELECT
  USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage company themes"
  ON company_themes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Insert sample themes for existing companies
INSERT INTO company_themes (company_slug, logo_url, primary_color, secondary_color, industry_category)
VALUES
  ('google', 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png', '#4285f4', '#34a853', 'Big Tech'),
  ('apple', 'https://www.apple.com/ac/globalnav/7/en_US/images/be15095f-5a20-57d0-ad14-cf4c638e223a/globalnav_apple_image__b5er5ngrzxqq_large.svg', '#000000', '#86868b', 'Big Tech'),
  ('microsoft', 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b', '#00a4ef', '#737373', 'Big Tech')
ON CONFLICT (company_slug) DO NOTHING;

-- Comment on table
COMMENT ON TABLE company_themes IS 'Stores company branding information for dynamic theming';
COMMENT ON COLUMN company_themes.company_slug IS 'Unique identifier matching search_volume.json slugs';
COMMENT ON COLUMN company_themes.logo_url IS 'URL to company logo (optional)';
COMMENT ON COLUMN company_themes.primary_color IS 'Primary brand color (hex format)';
COMMENT ON COLUMN company_themes.secondary_color IS 'Secondary/accent color (hex format)';
COMMENT ON COLUMN company_themes.industry_category IS 'Industry category for fallback imagery';
