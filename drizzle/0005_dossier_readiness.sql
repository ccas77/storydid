ALTER TABLE research_investigations ADD COLUMN IF NOT EXISTS claim_evidence jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE research_investigations ADD COLUMN IF NOT EXISTS readiness_score integer NOT NULL DEFAULT 0;
