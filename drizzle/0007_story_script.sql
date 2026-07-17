ALTER TABLE stories ADD COLUMN IF NOT EXISTS script_status text NOT NULL DEFAULT 'none';
ALTER TABLE stories ADD COLUMN IF NOT EXISTS script_hook text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS script_segments jsonb DEFAULT '[]'::jsonb;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS script_closing_line text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS script_disclaimer text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS script_word_count integer NOT NULL DEFAULT 0;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS script_generated_at timestamptz;
