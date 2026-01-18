-- Migration: Create payment tables for Stripe integration
-- Issue: #38 - Stripe webhook handlers (also needed for #40 - Purchase unlock flow)

-- Table: purchases
-- Stores Stripe payment records
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  company_slug TEXT NOT NULL,
  role_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: access_grants
-- Stores user access to premium content
CREATE TABLE IF NOT EXISTS access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_slug TEXT, -- NULL means access to all companies
  role_slug TEXT, -- NULL means access to all roles for the company
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '100 years'), -- Essentially never expires for one-time purchase
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'purchase' CHECK (source IN ('purchase', 'admin', 'promo', 'refund_revoke')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for purchases
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session_id ON purchases(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_purchases_company_role ON purchases(company_slug, role_slug);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

-- Indexes for access_grants
CREATE INDEX IF NOT EXISTS idx_access_grants_user_id ON access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_company_role ON access_grants(company_slug, role_slug);
CREATE INDEX IF NOT EXISTS idx_access_grants_expires_at ON access_grants(expires_at);
CREATE INDEX IF NOT EXISTS idx_access_grants_user_company_role ON access_grants(user_id, company_slug, role_slug);

-- Unique constraint: one access grant per user per company/role combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_grants_unique ON access_grants(user_id, COALESCE(company_slug, ''), COALESCE(role_slug, ''));

-- Updated_at trigger for purchases
CREATE OR REPLACE FUNCTION update_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_purchases_updated_at();

-- Row Level Security

-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;

-- Purchases policies
-- Users can read their own purchases
CREATE POLICY "Users can read own purchases"
  ON purchases
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role full access to purchases"
  ON purchases
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Access grants policies
-- Users can read their own access grants
CREATE POLICY "Users can read own access grants"
  ON access_grants
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks and admin)
CREATE POLICY "Service role full access to access_grants"
  ON access_grants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE purchases IS 'Stripe payment records for premium content purchases';
COMMENT ON TABLE access_grants IS 'User access grants to premium content, created after successful purchase';
COMMENT ON COLUMN purchases.stripe_session_id IS 'Stripe Checkout session ID for idempotency';
COMMENT ON COLUMN access_grants.expires_at IS 'Access expiration, defaults to 100 years (never) for one-time purchases';
COMMENT ON COLUMN access_grants.source IS 'How the access was granted: purchase, admin grant, promo code, or revoked via refund';
