DO $$ BEGIN
  CREATE TYPE research_cycle_status AS ENUM ('queued', 'running', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS beats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  query_seeds jsonb NOT NULL DEFAULT '[]'::jsonb,
  cadence_weight integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  last_scheduled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS beats_slug_idx ON beats(slug);

CREATE TABLE IF NOT EXISTS research_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id uuid REFERENCES beats(id) ON DELETE SET NULL,
  status research_cycle_status NOT NULL DEFAULT 'queued',
  current_stage text NOT NULL DEFAULT 'discovery',
  stage_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for timestamp with time zone NOT NULL DEFAULT now(),
  locked_at timestamp with time zone,
  completed_at timestamp with time zone,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE stories ADD COLUMN IF NOT EXISTS beat_id uuid REFERENCES beats(id) ON DELETE SET NULL;
ALTER TABLE research_runs ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES research_cycles(id) ON DELETE SET NULL;
ALTER TABLE research_runs ADD COLUMN IF NOT EXISTS beat_id uuid REFERENCES beats(id) ON DELETE SET NULL;
ALTER TABLE archive_records ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES research_cycles(id) ON DELETE SET NULL;
ALTER TABLE archive_records ADD COLUMN IF NOT EXISTS beat_id uuid REFERENCES beats(id) ON DELETE SET NULL;
ALTER TABLE story_clusters ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES research_cycles(id) ON DELETE SET NULL;
ALTER TABLE story_clusters ADD COLUMN IF NOT EXISTS beat_id uuid REFERENCES beats(id) ON DELETE SET NULL;
ALTER TABLE editorial_recommendations ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES research_cycles(id) ON DELETE SET NULL;
ALTER TABLE editorial_recommendations ADD COLUMN IF NOT EXISTS beat_id uuid REFERENCES beats(id) ON DELETE SET NULL;
ALTER TABLE research_activity ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES research_cycles(id) ON DELETE SET NULL;
ALTER TABLE research_activity ADD COLUMN IF NOT EXISTS beat_id uuid REFERENCES beats(id) ON DELETE SET NULL;

INSERT INTO beats (id, slug, name, description, query_seeds, cadence_weight)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'forgotten-scandals', 'Forgotten Scandals', 'Fraud, imposture, inheritance disputes, religious scandals, and public controversies with strong narrative tension.', '["historical fraud scandal","disputed inheritance court","religious scandal trial","impostor testimony"]'::jsonb, 3),
  ('22222222-2222-4222-8222-222222222222', 'disasters-and-inquests', 'Disasters and Inquests', 'Industrial, maritime, medical, and civic disasters where inquiry records can reveal accountability and human stakes.', '["industrial disaster inquiry","maritime disaster survivors","medical mystery historical case","inquest testimony"]'::jsonb, 3),
  ('33333333-3333-4333-8333-333333333333', 'power-and-institutions', 'Power and Institutions', 'Government blunders, institutional failures, and public decisions with consequences beyond routine minutes.', '["government blunder investigation","public inquiry testimony","institutional failure historical case"]'::jsonb, 2),
  ('44444444-4444-4444-8444-444444444444', 'strange-local-histories', 'Strange Local Histories', 'Little-known local mysteries, abandoned places, unusual trials, and community stories with human interest.', '["abandoned town disaster","strange local trial","little-known historical mystery"]'::jsonb, 2)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  query_seeds = EXCLUDED.query_seeds,
  cadence_weight = EXCLUDED.cadence_weight,
  active = true,
  updated_at = now();

UPDATE stories
SET beat_id = '44444444-4444-4444-8444-444444444444'
WHERE beat_id IS NULL;
