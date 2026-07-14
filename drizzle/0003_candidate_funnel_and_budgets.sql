DO $$ BEGIN
  CREATE TYPE candidate_status AS ENUM ('active', 'duplicate', 'rejected', 'researching', 'recommended', 'dossier_ready');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS research_stage_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES research_cycles(id) ON DELETE CASCADE,
  beat_id uuid REFERENCES beats(id) ON DELETE SET NULL,
  stage text NOT NULL,
  max_records integer NOT NULL DEFAULT 0,
  max_searches integer NOT NULL DEFAULT 0,
  max_model_calls integer NOT NULL DEFAULT 0,
  used_records integer NOT NULL DEFAULT 0,
  used_searches integer NOT NULL DEFAULT 0,
  used_model_calls integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_funnel_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES research_cycles(id) ON DELETE CASCADE,
  beat_id uuid REFERENCES beats(id) ON DELETE SET NULL,
  archive_record_id uuid REFERENCES archive_records(id) ON DELETE SET NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  hypothesis text NOT NULL,
  normalized_key text NOT NULL,
  status candidate_status NOT NULL DEFAULT 'active',
  rejection_code text,
  rejection_reason text,
  duplicate_of text,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_source_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS candidate_funnel_cycle_idx ON candidate_funnel_items(cycle_id);
CREATE INDEX IF NOT EXISTS candidate_funnel_key_idx ON candidate_funnel_items(normalized_key);
CREATE UNIQUE INDEX IF NOT EXISTS candidate_funnel_cycle_external_idx ON candidate_funnel_items(cycle_id, external_id);
CREATE UNIQUE INDEX IF NOT EXISTS research_stage_budgets_cycle_stage_idx ON research_stage_budgets(cycle_id, stage);
