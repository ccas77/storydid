CREATE TABLE IF NOT EXISTS research_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO research_settings (key, value)
VALUES ('autopilot', '{"enabled":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
