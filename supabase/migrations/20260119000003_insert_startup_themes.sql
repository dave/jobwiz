-- Migration: Insert High-growth Startups company themes
-- Issue: #95 - Expand company themes: High-growth startups batch

-- Insert or update theme data for high-growth startup companies
-- Uses ON CONFLICT to update existing themes

INSERT INTO company_themes (company_slug, logo_url, primary_color, secondary_color, industry_category)
VALUES
  -- Stripe
  ('stripe', 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg', '#635BFF', '#32325D', 'High-growth Startups'),

  -- Figma
  ('figma', 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg', '#F24E1E', '#A259FF', 'High-growth Startups'),

  -- Notion
  ('notion', 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png', '#000000', '#FFFFFF', 'High-growth Startups'),

  -- Vercel
  ('vercel', 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Vercel_logo_black.svg', '#000000', '#FFFFFF', 'High-growth Startups'),

  -- Databricks
  ('databricks', 'https://upload.wikimedia.org/wikipedia/commons/6/63/Databricks_Logo.png', '#FF3621', '#1B3139', 'High-growth Startups'),

  -- Snowflake
  ('snowflake', 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Snowflake_Logo.svg', '#29B5E8', '#0052CC', 'High-growth Startups'),

  -- Airbnb
  ('airbnb', 'https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg', '#FF5A5F', '#484848', 'High-growth Startups'),

  -- Uber
  ('uber', 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png', '#000000', '#FFFFFF', 'High-growth Startups'),

  -- Lyft
  ('lyft', 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Lyft_logo.svg', '#FF00BF', '#11111F', 'High-growth Startups'),

  -- DoorDash
  ('doordash', 'https://upload.wikimedia.org/wikipedia/commons/c/c6/DoorDash_logo.png', '#FF3008', '#191919', 'High-growth Startups'),

  -- Instacart
  ('instacart', 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Instacart_logo_and_wordmark.svg', '#0AAD05', '#003D29', 'High-growth Startups'),

  -- Coinbase
  ('coinbase', 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Coinbase.svg', '#0052FF', '#0A0B0D', 'High-growth Startups'),

  -- Robinhood
  ('robinhood', 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Robinhood_wordmark.png', '#00C805', '#000000', 'High-growth Startups'),

  -- Plaid
  ('plaid', 'https://upload.wikimedia.org/wikipedia/commons/1/19/Plaid_logo.svg', '#000000', '#109DD7', 'High-growth Startups')

ON CONFLICT (company_slug)
DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  industry_category = EXCLUDED.industry_category,
  updated_at = NOW();

-- Verify the insertions
-- Expected: 14 companies in High-growth Startups category
