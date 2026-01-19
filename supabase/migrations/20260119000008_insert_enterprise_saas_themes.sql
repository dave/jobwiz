-- Migration: Insert Enterprise SaaS company themes
-- Issue: #100 - Expand company themes: Enterprise SaaS batch

-- Insert or update theme data for Enterprise SaaS companies
-- Uses ON CONFLICT to update existing themes

INSERT INTO company_themes (company_slug, logo_url, primary_color, secondary_color, industry_category)
VALUES
  -- Salesforce
  ('salesforce', 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg', '#00a1e0', '#032d60', 'Enterprise SaaS'),

  -- Oracle
  ('oracle', 'https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg', '#f80000', '#312d2a', 'Enterprise SaaS'),

  -- SAP
  ('sap', 'https://upload.wikimedia.org/wikipedia/commons/5/59/SAP_2011_logo.svg', '#0070f2', '#354a5f', 'Enterprise SaaS'),

  -- Workday
  ('workday', 'https://upload.wikimedia.org/wikipedia/commons/8/80/Workday_logo.svg', '#f6851f', '#005cb9', 'Enterprise SaaS'),

  -- ServiceNow
  ('servicenow', 'https://upload.wikimedia.org/wikipedia/commons/5/57/ServiceNow_logo.svg', '#81b5a1', '#293e40', 'Enterprise SaaS'),

  -- Atlassian
  ('atlassian', 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Atlassian_Logo.svg', '#0052cc', '#172b4d', 'Enterprise SaaS'),

  -- Splunk
  ('splunk', 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Splunk-Logo.svg', '#65a637', '#000000', 'Enterprise SaaS'),

  -- Twilio
  ('twilio', 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Twilio-logo-red.svg', '#f22f46', '#0d122b', 'Enterprise SaaS'),

  -- HubSpot
  ('hubspot', 'https://upload.wikimedia.org/wikipedia/commons/3/3f/HubSpot_Logo.svg', '#ff7a59', '#33475b', 'Enterprise SaaS'),

  -- Zendesk
  ('zendesk', 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Zendesk_logo.svg', '#03363d', '#78a300', 'Enterprise SaaS'),

  -- Okta
  ('okta', 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Okta_logo.svg', '#007dc1', '#1a1a1a', 'Enterprise SaaS'),

  -- Cloudflare
  ('cloudflare', 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Cloudflare_Logo.svg', '#f38020', '#404040', 'Enterprise SaaS'),

  -- MongoDB
  ('mongodb', 'https://upload.wikimedia.org/wikipedia/commons/9/93/MongoDB_Logo.svg', '#00ed64', '#001e2b', 'Enterprise SaaS'),

  -- Elastic
  ('elastic', 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Elasticsearch_logo.svg', '#fed10a', '#343741', 'Enterprise SaaS')

ON CONFLICT (company_slug)
DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  industry_category = EXCLUDED.industry_category,
  updated_at = NOW();

-- Verify the insertions
-- Expected: 14 companies in Enterprise SaaS category
