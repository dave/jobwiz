-- Migration: Insert Consulting company themes
-- Issue: #97 - Expand company themes: Consulting batch

-- Insert or update theme data for Consulting companies
-- Uses ON CONFLICT to update existing themes

INSERT INTO company_themes (company_slug, logo_url, primary_color, secondary_color, industry_category)
VALUES
  -- McKinsey & Company (dark blue brand)
  ('mckinsey', 'https://upload.wikimedia.org/wikipedia/commons/a/a9/McKinsey_and_Company_Logo_1.svg', '#0033A0', '#1A1A1A', 'Consulting'),

  -- Boston Consulting Group (green brand)
  ('bcg', 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Boston_Consulting_Group_2020_logo.svg', '#00A651', '#1A1A1A', 'Consulting'),

  -- Bain & Company (red brand)
  ('bain', 'https://upload.wikimedia.org/wikipedia/commons/9/93/Bain_%26_Company_logo.svg', '#CC0000', '#1A1A1A', 'Consulting'),

  -- Deloitte (green/black brand)
  ('deloitte', 'https://upload.wikimedia.org/wikipedia/commons/5/56/Deloitte.svg', '#86BC25', '#000000', 'Consulting'),

  -- Accenture (purple brand)
  ('accenture', 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Accenture.svg', '#A100FF', '#1A1A1A', 'Consulting'),

  -- PwC (orange brand)
  ('pwc', 'https://upload.wikimedia.org/wikipedia/commons/0/05/PricewaterhouseCoopers_Logo.svg', '#DC6900', '#1A1A1A', 'Consulting'),

  -- EY (yellow/dark brand)
  ('ey', 'https://upload.wikimedia.org/wikipedia/commons/3/34/EY_logo_2019.svg', '#FFE600', '#2E2E38', 'Consulting'),

  -- KPMG (blue brand)
  ('kpmg', 'https://upload.wikimedia.org/wikipedia/commons/9/9d/KPMG_logo.svg', '#00338D', '#1A1A1A', 'Consulting'),

  -- Capgemini (blue brand)
  ('capgemini', 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Capgemini_logo.svg', '#0070AD', '#12ABDB', 'Consulting'),

  -- Booz Allen Hamilton (red brand)
  ('booz-allen', 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Booz_Allen_Hamilton_logo.svg', '#DA291C', '#1A1A1A', 'Consulting')

ON CONFLICT (company_slug)
DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  industry_category = EXCLUDED.industry_category,
  updated_at = NOW();

-- Verify the insertions
-- Expected: 10 companies in Consulting category
