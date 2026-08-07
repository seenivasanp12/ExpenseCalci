-- Mutual Fund tracking (Phase 1 — invested amount only, no live NAV/gain-loss).
-- Mirrors the emi_plans/emi_installments shape (005_emi.sql): a plan-defining
-- table (mf_funds) and a per-period transaction table (mf_contributions),
-- linked back into expenses so SIP/lumpsum money shows up as real spend.
--
-- Key difference from EMI: EMI has a fixed tenure and pre-generates every
-- installment up front. A SIP is open-ended, so mf_sips just stores the
-- schedule (amount + day-of-month + start date); mf_contributions rows are
-- generated lazily, one catch-up pass at a time, by the backfill routine in
-- backend/routes/mutualFunds.js. The UNIQUE(sip_id, year, month) constraint
-- below is what makes repeated backfill passes safe to re-run.

CREATE TABLE IF NOT EXISTS mf_funds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  fund_name     TEXT NOT NULL,
  fund_category TEXT NOT NULL DEFAULT '',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mf_sips (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id        UUID NOT NULL REFERENCES mf_funds(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  sip_day        SMALLINT NOT NULL CHECK (sip_day BETWEEN 1 AND 31),
  payment_method TEXT NOT NULL DEFAULT 'debit_card',
  start_day      SMALLINT NOT NULL CHECK (start_day BETWEEN 1 AND 31),
  start_month    SMALLINT NOT NULL CHECK (start_month BETWEEN 1 AND 12),
  start_year     SMALLINT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- installment_no-style sentinel isn't needed here (no processing fee/GST
-- rows like EMI) — every row is either a SIP installment (sip_id set) or a
-- one-off lumpsum (sip_id NULL).
CREATE TABLE IF NOT EXISTS mf_contributions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id           UUID NOT NULL REFERENCES mf_funds(id) ON DELETE CASCADE,
  sip_id            UUID REFERENCES mf_sips(id) ON DELETE CASCADE,
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('sip', 'lumpsum')),
  day               SMALLINT NOT NULL CHECK (day BETWEEN 1 AND 31),
  month             SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year              SMALLINT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sip_id, year, month)
);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS mf_contribution_id UUID REFERENCES mf_contributions(id);

CREATE INDEX IF NOT EXISTS idx_mf_funds_user ON mf_funds(user_id);
CREATE INDEX IF NOT EXISTS idx_mf_sips_fund ON mf_sips(fund_id);
CREATE INDEX IF NOT EXISTS idx_mf_sips_user_status ON mf_sips(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mf_contributions_fund ON mf_contributions(fund_id);
CREATE INDEX IF NOT EXISTS idx_expenses_mf_contribution ON expenses(mf_contribution_id) WHERE mf_contribution_id IS NOT NULL;

-- RLS is disabled project-wide — the Express layer scopes every query by
-- user_id instead (see credit_cards/emi_plans for the same pattern).
ALTER TABLE mf_funds DISABLE ROW LEVEL SECURITY;
ALTER TABLE mf_sips DISABLE ROW LEVEL SECURITY;
ALTER TABLE mf_contributions DISABLE ROW LEVEL SECURITY;

-- Tables created via the SQL Editor don't inherit default grants — bake the
-- fix in from the start instead of needing a follow-up "b" migration.
GRANT ALL ON TABLE mf_funds TO service_role;
GRANT ALL ON TABLE mf_sips TO service_role;
GRANT ALL ON TABLE mf_contributions TO service_role;

NOTIFY pgrst, 'reload schema';
