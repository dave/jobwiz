-- Migration: Insert E-commerce/Retail company themes
-- Issue: #98 - Expand company themes: E-commerce/Retail batch

-- Insert or update theme data for E-commerce/Retail companies
-- Uses ON CONFLICT to update existing themes

INSERT INTO company_themes (company_slug, logo_url, primary_color, secondary_color, industry_category)
VALUES
  -- Shopify (green brand)
  ('shopify', 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg', '#96BF48', '#5E8E3E', 'E-commerce/Retail'),

  -- Etsy (orange brand)
  ('etsy', 'https://upload.wikimedia.org/wikipedia/commons/8/89/Etsy_logo.svg', '#F56400', '#232347', 'E-commerce/Retail'),

  -- Wayfair (purple brand)
  ('wayfair', 'https://upload.wikimedia.org/wikipedia/commons/7/71/Wayfair_logo.svg', '#7B189F', '#2B1B4E', 'E-commerce/Retail'),

  -- Chewy (blue/orange brand)
  ('chewy', 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Chewy_%28company%29_logo.svg', '#1C49C2', '#FF6D00', 'E-commerce/Retail'),

  -- Target (red brand)
  ('target', 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Target_logo.svg', '#CC0000', '#FFFFFF', 'E-commerce/Retail'),

  -- Walmart (blue/yellow brand)
  ('walmart', 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Walmart_logo.svg', '#0071CE', '#FFC220', 'E-commerce/Retail'),

  -- Costco (red/blue brand)
  ('costco', 'https://upload.wikimedia.org/wikipedia/commons/5/59/Costco_Wholesale_logo_2010-10-26.svg', '#E31837', '#005DAA', 'E-commerce/Retail'),

  -- Home Depot (orange brand)
  ('home-depot', 'https://upload.wikimedia.org/wikipedia/commons/5/5f/TheHomeDepot.svg', '#F96302', '#1A1A1A', 'E-commerce/Retail'),

  -- Best Buy (blue/yellow brand)
  ('best-buy', 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Best_Buy_Logo.svg', '#0046BE', '#FFE000', 'E-commerce/Retail'),

  -- Nike (black brand)
  ('nike', 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg', '#000000', '#FFFFFF', 'E-commerce/Retail'),

  -- Lululemon (red brand)
  ('lululemon', 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Lululemon_Athletica_logo.svg', '#D31334', '#1A1A1A', 'E-commerce/Retail')

ON CONFLICT (company_slug)
DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  industry_category = EXCLUDED.industry_category,
  updated_at = NOW();

-- Verify the insertions
-- Expected: 11 companies in E-commerce/Retail category
