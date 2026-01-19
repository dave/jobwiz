-- Migration: Insert Healthcare/Biotech company themes
-- Issue: #99 - Expand company themes: Healthcare/Biotech batch

-- Insert or update theme data for Healthcare/Biotech companies
-- Uses ON CONFLICT to update existing themes

INSERT INTO company_themes (company_slug, logo_url, primary_color, secondary_color, industry_category)
VALUES
  -- Epic Systems (orange/red brand)
  ('epic', 'https://upload.wikimedia.org/wikipedia/commons/2/24/Epic_Systems.svg', '#E35205', '#1A1A1A', 'Healthcare/Biotech'),

  -- Cerner (blue brand - now Oracle Health)
  ('cerner', 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Cerner_logo.svg', '#005DAA', '#1A1A1A', 'Healthcare/Biotech'),

  -- Optum (orange brand)
  ('optum', 'https://upload.wikimedia.org/wikipedia/commons/2/23/Optum_logo_2021.svg', '#FF6200', '#002677', 'Healthcare/Biotech'),

  -- UnitedHealth Group (blue brand)
  ('unitedhealth', 'https://upload.wikimedia.org/wikipedia/commons/6/63/UnitedHealth_Group_logo.svg', '#002677', '#FF6200', 'Healthcare/Biotech'),

  -- CVS Health (red brand)
  ('cvs', 'https://upload.wikimedia.org/wikipedia/commons/6/69/CVS_Health_Logo.svg', '#CC0000', '#1A1A1A', 'Healthcare/Biotech'),

  -- Johnson & Johnson (red brand)
  ('johnson-johnson', 'https://upload.wikimedia.org/wikipedia/commons/2/22/Johnson_and_Johnson_logo.svg', '#D51900', '#1A1A1A', 'Healthcare/Biotech'),

  -- Pfizer (blue brand)
  ('pfizer', 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Pfizer_%282021%29.svg', '#0093D0', '#003B6F', 'Healthcare/Biotech'),

  -- Moderna (blue/cyan brand)
  ('moderna', 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Moderna_logo.svg', '#007DC5', '#00B5E2', 'Healthcare/Biotech'),

  -- Illumina (green brand)
  ('illumina', 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Illumina_logo.svg', '#6CB33F', '#1A1A1A', 'Healthcare/Biotech'),

  -- Genentech (blue brand - Roche subsidiary)
  ('genentech', 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Genentech_Logo.svg', '#0066B3', '#00A9E0', 'Healthcare/Biotech')

ON CONFLICT (company_slug)
DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  industry_category = EXCLUDED.industry_category,
  updated_at = NOW();

-- Verify the insertions
-- Expected: 10 companies in Healthcare/Biotech category
