-- Migration: Insert Finance company themes
-- Issue: #96 - Expand company themes: Finance batch

-- Insert or update theme data for Finance companies
-- Uses ON CONFLICT to update existing themes

INSERT INTO company_themes (company_slug, logo_url, primary_color, secondary_color, industry_category)
VALUES
  -- Goldman Sachs (light blue/navy brand)
  ('goldman-sachs', 'https://upload.wikimedia.org/wikipedia/commons/6/61/Goldman_Sachs.svg', '#7399C6', '#0A1628', 'Finance'),

  -- JPMorgan Chase (blue brand)
  ('jpmorgan', 'https://upload.wikimedia.org/wikipedia/commons/a/af/J_P_Morgan_Logo_2008_1.svg', '#117ACA', '#0D2B3E', 'Finance'),

  -- Morgan Stanley (blue brand)
  ('morgan-stanley', 'https://upload.wikimedia.org/wikipedia/commons/3/34/Morgan_Stanley_Logo_1.svg', '#00A0DF', '#002D72', 'Finance'),

  -- Bank of America (red/blue brand)
  ('bank-of-america', 'https://upload.wikimedia.org/wikipedia/commons/2/20/Bank_of_America_logo.svg', '#E31837', '#012169', 'Finance'),

  -- Citadel (dark blue brand)
  ('citadel', 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Citadel_LLC_Logo.svg', '#003366', '#1A1A1A', 'Finance'),

  -- Two Sigma (blue brand)
  ('two-sigma', 'https://upload.wikimedia.org/wikipedia/commons/5/51/Two_Sigma_Logo.svg', '#00A9E0', '#002855', 'Finance'),

  -- Jane Street (blue brand)
  ('jane-street', 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Jane_Street_Capital_Logo.svg', '#007ACC', '#1A1A1A', 'Finance'),

  -- BlackRock (black brand)
  ('blackrock', 'https://upload.wikimedia.org/wikipedia/commons/1/1e/BlackRock_wordmark.svg', '#000000', '#6D6E71', 'Finance'),

  -- Fidelity (green brand)
  ('fidelity', 'https://upload.wikimedia.org/wikipedia/commons/0/09/Fidelity_Investments_logo.svg', '#4AA564', '#1A1A1A', 'Finance'),

  -- Charles Schwab (blue brand)
  ('charles-schwab', 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Charles_Schwab_Corporation_logo.svg', '#00A0DF', '#1A1A1A', 'Finance'),

  -- Visa (blue/gold brand)
  ('visa', 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg', '#1A1F71', '#F7B600', 'Finance'),

  -- Mastercard (red/orange brand)
  ('mastercard', 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg', '#EB001B', '#F79E1B', 'Finance'),

  -- PayPal (blue brand)
  ('paypal', 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg', '#003087', '#009CDE', 'Finance'),

  -- Block/Square (black brand)
  ('block', 'https://upload.wikimedia.org/wikipedia/commons/5/55/Block%2C_Inc._logo.svg', '#000000', '#1DA1F2', 'Finance')

ON CONFLICT (company_slug)
DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  industry_category = EXCLUDED.industry_category,
  updated_at = NOW();

-- Verify the insertions
-- Expected: 14 companies in Finance category
