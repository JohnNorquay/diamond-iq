-- Multi-team support migration
-- Adds team codes, player secret words, and unique name constraint

-- 1. Add team_code to diq_teams (unique, short, uppercase)
ALTER TABLE diq_teams ADD COLUMN IF NOT EXISTS team_code TEXT UNIQUE;

-- 2. Add secret_word to diq_players (set by kid on first login)
ALTER TABLE diq_players ADD COLUMN IF NOT EXISTS secret_word TEXT;

-- 3. Unique constraint: no duplicate names within a team
ALTER TABLE diq_players ADD CONSTRAINT uq_player_name_per_team UNIQUE (team_id, name);

-- 4. Generate team code for existing Jays team
UPDATE diq_teams SET team_code = 'JAYS7U' WHERE name = 'Janesville Jays' AND team_code IS NULL;

-- 5. Function to generate a random team code (6 chars, uppercase letters + digits)
CREATE OR REPLACE FUNCTION generate_team_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM diq_teams WHERE team_code = code) THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
