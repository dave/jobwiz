-- Migration: Create guest purchases table for linking purchases to new accounts
-- Issue: #40 - Purchase unlock flow

-- Table: guest_purchases
-- Stores purchases made without an account, to be linked when user signs up
CREATE TABLE IF NOT EXISTS guest_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,
  company_slug TEXT NOT NULL,
  role_slug TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_purchases_email ON guest_purchases(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_guest_purchases_linked_user_id ON guest_purchases(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_guest_purchases_stripe_session_id ON guest_purchases(stripe_session_id);

-- Row Level Security
ALTER TABLE guest_purchases ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role full access to guest_purchases"
  ON guest_purchases
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read their own linked purchases
CREATE POLICY "Users can read own linked guest purchases"
  ON guest_purchases
  FOR SELECT
  USING (auth.uid() = linked_user_id);

-- Comments for documentation
COMMENT ON TABLE guest_purchases IS 'Purchases made without an account, linked when user signs up';
COMMENT ON COLUMN guest_purchases.email IS 'Email used during checkout, used to match with new account';
COMMENT ON COLUMN guest_purchases.linked_user_id IS 'User ID after account creation and linking';
COMMENT ON COLUMN guest_purchases.linked_at IS 'When the purchase was linked to an account';
