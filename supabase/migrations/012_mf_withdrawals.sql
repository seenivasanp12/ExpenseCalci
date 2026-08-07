-- Mutual Fund withdrawals — redeeming money OUT of a fund. Symmetric to how
-- a SIP/lumpsum contribution links into `expenses` (money leaving the bank
-- account): a withdrawal links into `earnings` (money coming back in), so it
-- shows up in the Earn tab automatically, tagged with which fund it came
-- from — exactly what backend/routes/mutualFunds.js's withdraw route does.
--
-- `earnings` has no `day` column (month/year only, see 001_initial_schema.sql),
-- so this table keeps its own full day/month/year for the fund's own
-- history view, while the earnings row it creates only carries month/year.

CREATE TABLE IF NOT EXISTS mf_withdrawals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id    UUID NOT NULL REFERENCES mf_funds(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  day        SMALLINT NOT NULL CHECK (day BETWEEN 1 AND 31),
  month      SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year       SMALLINT NOT NULL,
  amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  earning_id UUID REFERENCES earnings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mf_withdrawals_fund ON mf_withdrawals(fund_id);
CREATE INDEX IF NOT EXISTS idx_mf_withdrawals_user ON mf_withdrawals(user_id);

ALTER TABLE mf_withdrawals DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE mf_withdrawals TO service_role;
NOTIFY pgrst, 'reload schema';
