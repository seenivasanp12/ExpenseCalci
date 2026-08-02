-- Migration 005 — EMI tracking
-- Run once in Supabase SQL Editor, after 004_credit_cards.sql and
-- 004b_credit_cards_grants.sql.

CREATE TABLE IF NOT EXISTS emi_plans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  card_id              UUID NOT NULL REFERENCES credit_cards(id) ON DELETE RESTRICT,
  item_name            TEXT NOT NULL,
  purchase_day         SMALLINT NOT NULL CHECK (purchase_day BETWEEN 1 AND 31),
  purchase_month       SMALLINT NOT NULL CHECK (purchase_month BETWEEN 1 AND 12),
  purchase_year        SMALLINT NOT NULL,
  original_amount      NUMERIC(12, 2) NOT NULL,
  upfront_discount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  principal            NUMERIC(12, 2) NOT NULL,
  tenure_months        SMALLINT NOT NULL CHECK (tenure_months > 0),
  emi_type             TEXT NOT NULL CHECK (emi_type IN ('no_cost', 'interest')),
  interest_rate_annual NUMERIC(5, 2) NOT NULL DEFAULT 0,
  processing_fee       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gst_rate             NUMERIC(5, 2) NOT NULL DEFAULT 18,
  deferred_months      SMALLINT NOT NULL DEFAULT 0,
  monthly_emi_amount   NUMERIC(12, 2) NOT NULL,
  total_payable        NUMERIC(12, 2) NOT NULL,
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'foreclosed')),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emi_plans_user ON emi_plans(user_id);

-- installment_no = 0 is a reserved row representing the one-time processing
-- fee + GST charge (due on the purchase date); 1..N are the real installments.
-- Keeping the fee on this same table lets deleting a plan clean up every
-- expense row it ever generated through a single emi_installment_id lookup.
CREATE TABLE IF NOT EXISTS emi_installments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emi_plan_id         UUID NOT NULL REFERENCES emi_plans(id) ON DELETE CASCADE,
  installment_no      SMALLINT NOT NULL,
  due_year            SMALLINT NOT NULL,
  due_month           SMALLINT NOT NULL CHECK (due_month BETWEEN 1 AND 12),
  principal_component NUMERIC(12, 2) NOT NULL DEFAULT 0,
  interest_component  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount              NUMERIC(12, 2) NOT NULL,
  UNIQUE(emi_plan_id, installment_no)
);
CREATE INDEX IF NOT EXISTS idx_emi_installments_plan ON emi_installments(emi_plan_id);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS emi_installment_id UUID REFERENCES emi_installments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_emi ON expenses(emi_installment_id) WHERE emi_installment_id IS NOT NULL;

ALTER TABLE emi_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE emi_installments DISABLE ROW LEVEL SECURITY;

-- Learned the hard way on migration 004: tables created via the SQL Editor
-- do NOT automatically inherit the project's default grants the way
-- dashboard-created tables do — grant service_role access explicitly, and
-- tell PostgREST to pick up the new tables/columns immediately.
GRANT ALL ON TABLE emi_plans TO service_role;
GRANT ALL ON TABLE emi_installments TO service_role;
NOTIFY pgrst, 'reload schema';
