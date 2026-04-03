-- Games table for completed 9-inning game results
CREATE TABLE diq_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES diq_players(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  speed_level TEXT NOT NULL DEFAULT 'rookie',
  correct_count INTEGER DEFAULT 0,
  total_answered INTEGER DEFAULT 0,
  runs_allowed INTEGER DEFAULT 0,
  innings_played INTEGER DEFAULT 9,
  best_streak INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_diq_games_player ON diq_games(player_id);
CREATE INDEX idx_diq_games_speed ON diq_games(speed_level);
CREATE INDEX idx_diq_games_points ON diq_games(total_points DESC);

ALTER TABLE diq_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_games" ON diq_games FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_games" ON diq_games FOR INSERT TO anon WITH CHECK (true);
