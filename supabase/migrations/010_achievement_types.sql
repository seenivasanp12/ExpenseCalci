-- Adds a real `type` category to achievements (today it's just free-text
-- remark from a client-side quick-pick chip — see AchievementTab.jsx). This
-- lets the Achievement tab split into proper segments (Fixed Deposit /
-- Recurring Deposit / Gold / PPF / Other) instead of one flat list.
--
-- Mutual Fund is NOT one of these types — it graduates to its own full
-- subsystem (mf_funds/mf_sips/mf_contributions, see 011_mutual_funds.sql)
-- since it needs a fund identity + recurring schedule, not just a flat
-- amount+remark row. Old "SIP"-labeled rows logged before that subsystem
-- existed are historical free-text notes with no fund to attach to, so they
-- backfill into 'other' rather than being guessed into the new model.

ALTER TABLE achievements ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'other';

ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_type_check;
ALTER TABLE achievements ADD CONSTRAINT achievements_type_check
  CHECK (type IN ('fixed_deposit', 'recurring_deposit', 'gold', 'ppf', 'other'));

UPDATE achievements SET type = CASE
  WHEN remark ILIKE '%fixed deposit%' THEN 'fixed_deposit'
  WHEN remark ILIKE '%recurring deposit%' THEN 'recurring_deposit'
  WHEN remark ILIKE '%gold%' THEN 'gold'
  WHEN remark ILIKE '%ppf%' THEN 'ppf'
  ELSE 'other'
END;

NOTIFY pgrst, 'reload schema';
