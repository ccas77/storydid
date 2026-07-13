DO $$ BEGIN
  CREATE TYPE recommendation_status AS ENUM ('recommended', 'developing', 'angle_requested', 'investigate_further', 'dismissed', 'dossier_ready');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cluster_status AS ENUM ('candidate', 'merged', 'rejected', 'researching', 'recommended', 'dossier_ready');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE stories ADD COLUMN IF NOT EXISTS premise text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS narrative_hook text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS why_overlooked text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS originality_assessment text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS unresolved_risks jsonb DEFAULT '[]'::jsonb;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS research_completeness integer NOT NULL DEFAULT 0;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS recommended_next_action text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS claim_citations jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS archive_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES research_runs(id) ON DELETE SET NULL,
  external_id text NOT NULL,
  source text NOT NULL,
  url text NOT NULL,
  title text NOT NULL,
  record_date text,
  location text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS story_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES research_runs(id) ON DELETE SET NULL,
  status cluster_status NOT NULL DEFAULT 'candidate',
  label text NOT NULL,
  hypothesis text NOT NULL,
  merge_key text NOT NULL,
  record_ids jsonb DEFAULT '[]'::jsonb,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS editorial_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES research_runs(id) ON DELETE SET NULL,
  cluster_id uuid REFERENCES story_clusters(id) ON DELETE SET NULL,
  story_id uuid REFERENCES stories(id) ON DELETE SET NULL,
  status recommendation_status NOT NULL DEFAULT 'recommended',
  working_title text NOT NULL,
  premise text NOT NULL,
  narrative_hook text NOT NULL,
  why_overlooked text NOT NULL,
  strongest_evidence jsonb DEFAULT '[]'::jsonb,
  originality_assessment text NOT NULL,
  unresolved_risks jsonb DEFAULT '[]'::jsonb,
  confidence integer NOT NULL DEFAULT 0,
  research_completeness integer NOT NULL DEFAULT 0,
  recommended_next_action text NOT NULL,
  scores jsonb DEFAULT '{"narrativeTension":0,"sourceStrength":0,"originality":0,"humanInterest":0,"historicalConsequence":0,"researchability":0}'::jsonb,
  source_ids jsonb DEFAULT '[]'::jsonb,
  follow_up_queries jsonb DEFAULT '[]'::jsonb,
  downgrade_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES research_runs(id) ON DELETE SET NULL,
  recommendation_id uuid REFERENCES editorial_recommendations(id) ON DELETE SET NULL,
  kind text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
