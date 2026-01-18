-- Issue #42: Variant assignment + storage
-- Creates tables for AB testing experiment configuration and variant assignments

-- =====================================================
-- Experiments Table
-- =====================================================
-- Stores experiment configurations with variants and traffic splits

CREATE TABLE IF NOT EXISTS experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  traffic_split jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'concluded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Comment on columns
COMMENT ON TABLE experiments IS 'AB test experiment configurations';
COMMENT ON COLUMN experiments.name IS 'Unique experiment identifier (e.g., paywall_test)';
COMMENT ON COLUMN experiments.variants IS 'Array of variant names: ["direct", "freemium", "teaser"]';
COMMENT ON COLUMN experiments.traffic_split IS 'Traffic allocation: {"direct": 25, "freemium": 25, ...}';
COMMENT ON COLUMN experiments.status IS 'draft=inactive, running=active, concluded=no new assignments';

-- Index for quick status lookups
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_name ON experiments(name);

-- =====================================================
-- Variant Assignments Table
-- =====================================================
-- Records which variant each user was assigned for each experiment

CREATE TABLE IF NOT EXISTS variant_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  experiment_id uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  experiment_name text NOT NULL,
  variant text NOT NULL,
  bucket integer NOT NULL CHECK (bucket >= -1 AND bucket < 100),
  source text NOT NULL DEFAULT 'calculated' CHECK (source IN ('calculated', 'forced', 'localStorage')),
  assigned_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one assignment per user per experiment
CREATE UNIQUE INDEX idx_variant_assignments_unique
  ON variant_assignments(user_id, experiment_id);

-- Indexes for queries
CREATE INDEX idx_variant_assignments_user ON variant_assignments(user_id);
CREATE INDEX idx_variant_assignments_experiment ON variant_assignments(experiment_id);
CREATE INDEX idx_variant_assignments_variant ON variant_assignments(variant);

-- Comment on columns
COMMENT ON TABLE variant_assignments IS 'User variant assignments for AB tests';
COMMENT ON COLUMN variant_assignments.user_id IS 'User ID (anonymous UUID or auth user ID)';
COMMENT ON COLUMN variant_assignments.experiment_name IS 'Denormalized for faster lookups';
COMMENT ON COLUMN variant_assignments.bucket IS 'Bucket number (0-99), -1 for forced assignments';
COMMENT ON COLUMN variant_assignments.source IS 'How assignment was made';

-- =====================================================
-- Updated At Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_experiments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER experiments_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_experiments_updated_at();

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_assignments ENABLE ROW LEVEL SECURITY;

-- Experiments: read-only for all, admin for mutations
CREATE POLICY "experiments_select_all" ON experiments
  FOR SELECT
  USING (true);

CREATE POLICY "experiments_admin_all" ON experiments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Variant assignments: users can read/write own, admin full access
CREATE POLICY "variant_assignments_select_own" ON variant_assignments
  FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR user_id = current_setting('request.cookies', true)::json->>'jw_uid'
  );

CREATE POLICY "variant_assignments_insert_own" ON variant_assignments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
    OR user_id = current_setting('request.cookies', true)::json->>'jw_uid'
    OR user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

CREATE POLICY "variant_assignments_admin_all" ON variant_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Seed Data: Default Paywall Experiment
-- =====================================================

INSERT INTO experiments (name, description, variants, traffic_split, status)
VALUES (
  'paywall_test',
  'Test different monetization strategies for the paywall',
  '["direct_paywall", "freemium", "teaser", "question_limit"]'::jsonb,
  '{"direct_paywall": 25, "freemium": 25, "teaser": 25, "question_limit": 25}'::jsonb,
  'running'
);
