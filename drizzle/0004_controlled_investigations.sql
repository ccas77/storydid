DO $$ BEGIN
  CREATE TYPE investigation_status AS ENUM ('active', 'downgraded', 'ready_for_dossier');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS research_investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES research_cycles(id) ON DELETE CASCADE,
  beat_id uuid REFERENCES beats(id) ON DELETE SET NULL,
  candidate_id uuid NOT NULL REFERENCES candidate_funnel_items(id) ON DELETE CASCADE,
  status investigation_status NOT NULL DEFAULT 'active',
  working_title text NOT NULL,
  premise text NOT NULL,
  research_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up_queries jsonb NOT NULL DEFAULT '[]'::jsonb,
  originality_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_depth integer NOT NULL DEFAULT 0,
  source_independence jsonb NOT NULL DEFAULT '[]'::jsonb,
  downgrade_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS research_investigations_candidate_idx ON research_investigations(candidate_id);
CREATE INDEX IF NOT EXISTS research_investigations_cycle_idx ON research_investigations(cycle_id);
