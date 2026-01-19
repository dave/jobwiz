-- Migration: Insert Media/Entertainment company themes
-- Issue: #101 - Expand company themes: Media/Entertainment batch

-- Insert or update theme data for Media/Entertainment companies
-- Uses ON CONFLICT to update existing themes

INSERT INTO company_themes (company_slug, logo_url, primary_color, secondary_color, industry_category)
VALUES
  -- Disney
  ('disney', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', '#113ccf', '#0063e5', 'Media/Entertainment'),

  -- Warner Bros Discovery
  ('wbd', 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Warner_Bros._Discovery_wordmark.svg', '#0047bb', '#1a1a1a', 'Media/Entertainment'),

  -- Spotify
  ('spotify', 'https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg', '#1db954', '#191414', 'Media/Entertainment'),

  -- TikTok
  ('tiktok', 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg', '#fe2c55', '#25f4ee', 'Media/Entertainment'),

  -- Snap
  ('snap', 'https://upload.wikimedia.org/wikipedia/en/a/ad/Snap_Inc._logo.svg', '#fffc00', '#000000', 'Media/Entertainment'),

  -- Pinterest
  ('pinterest', 'https://upload.wikimedia.org/wikipedia/commons/0/08/Pinterest-logo.png', '#e60023', '#efefef', 'Media/Entertainment'),

  -- Reddit
  ('reddit', 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Reddit_logo.svg', '#ff4500', '#1a1a1b', 'Media/Entertainment'),

  -- LinkedIn
  ('linkedin', 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png', '#0a66c2', '#000000', 'Media/Entertainment'),

  -- X (formerly Twitter)
  ('x', 'https://upload.wikimedia.org/wikipedia/commons/5/5a/X_icon_2.svg', '#000000', '#ffffff', 'Media/Entertainment'),

  -- Electronic Arts
  ('ea', 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Electronic-Arts-Logo.svg', '#ff4747', '#000000', 'Media/Entertainment'),

  -- Activision Blizzard
  ('activision-blizzard', 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Activision_Blizzard_wordmark.svg', '#3c3c3c', '#00aeff', 'Media/Entertainment'),

  -- Roblox
  ('roblox', 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Roblox_player_icon_black.svg', '#e1061b', '#000000', 'Media/Entertainment')

ON CONFLICT (company_slug)
DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  industry_category = EXCLUDED.industry_category,
  updated_at = NOW();

-- Verify the insertions
-- Expected: 12 companies in Media/Entertainment category
