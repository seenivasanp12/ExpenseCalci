-- "Skip this month" for a SIP — the user wants to skip one month's
-- installment without stopping the SIP entirely (it resumes automatically
-- the following month). A skip is keyed by (sip_id, year, month), mirroring
-- the UNIQUE(sip_id, year, month) constraint on mf_contributions so the two
-- tables can never disagree about whether a given month is "handled":
-- backend/routes/mutualFunds.js's runBackfill checks both before deciding
-- whether a month still needs an installment posted.

CREATE TABLE IF NOT EXISTS mf_sip_skips (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sip_id     UUID NOT NULL REFERENCES mf_sips(id) ON DELETE CASCADE,
  year       SMALLINT NOT NULL,
  month      SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sip_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_mf_sip_skips_sip ON mf_sip_skips(sip_id);

ALTER TABLE mf_sip_skips DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE mf_sip_skips TO service_role;
NOTIFY pgrst, 'reload schema';
