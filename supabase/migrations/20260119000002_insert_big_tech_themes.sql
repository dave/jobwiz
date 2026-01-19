-- Migration: Insert Big Tech company themes
-- Issue: #94 - Expand company themes: Big Tech batch

-- Insert or update theme data for Big Tech companies
-- Uses ON CONFLICT to update existing themes (Google, Apple, Microsoft already exist)

INSERT INTO company_themes (company_slug, logo_url, primary_color, secondary_color, industry_category)
VALUES
  -- Google (update existing with verified colors)
  ('google', 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png', '#4285f4', '#34a853', 'Big Tech'),

  -- Meta (Facebook)
  ('meta', 'https://about.meta.com/brand/resources/facebookapp/logo/', '#0866ff', '#1877f2', 'Big Tech'),

  -- Amazon
  ('amazon', 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', '#ff9900', '#232f3e', 'Big Tech'),

  -- Apple (update existing)
  ('apple', 'https://www.apple.com/ac/globalnav/7/en_US/images/be15095f-5a20-57d0-ad14-cf4c638e223a/globalnav_apple_image__b5er5ngrzxqq_large.svg', '#000000', '#86868b', 'Big Tech'),

  -- Microsoft (update existing)
  ('microsoft', 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b', '#00a4ef', '#737373', 'Big Tech'),

  -- Netflix
  ('netflix', 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', '#e50914', '#221f1f', 'Big Tech'),

  -- NVIDIA
  ('nvidia', 'https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg', '#76b900', '#000000', 'Big Tech'),

  -- Intel
  ('intel', 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Intel-logo.svg', '#0071c5', '#00c7fd', 'Big Tech'),

  -- AMD
  ('amd', 'https://upload.wikimedia.org/wikipedia/commons/7/7c/AMD_Logo.svg', '#ed1c24', '#1a1a1d', 'Big Tech'),

  -- Cisco
  ('cisco', 'https://upload.wikimedia.org/wikipedia/commons/6/64/Cisco_logo.svg', '#049fd9', '#005073', 'Big Tech'),

  -- Tesla
  ('tesla', 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Tesla_T_symbol.svg', '#e82127', '#000000', 'Big Tech'),

  -- Adobe
  ('adobe', 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Adobe_Corporate_Logo.svg', '#ff0000', '#fa0f00', 'Big Tech')

ON CONFLICT (company_slug)
DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  industry_category = EXCLUDED.industry_category,
  updated_at = NOW();

-- Verify the insertions
-- Expected: 12 companies in Big Tech category
