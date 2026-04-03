-- Diamond IQ - Baseball Positioning Game for 7U
-- Complete migration: tables, RLS, seed data, 18 scenarios with 180 actions

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE diq_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age_group TEXT DEFAULT '7U',
  color_primary TEXT DEFAULT '#1e40af',
  color_secondary TEXT DEFAULT '#ffffff',
  coach_name TEXT,
  coach_pin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE diq_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES diq_teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  primary_position TEXT,
  avatar_emoji TEXT DEFAULT '⚾',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_diq_players_team_id ON diq_players(team_id);

CREATE TABLE diq_positions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  default_x FLOAT,
  default_y FLOAT,
  sort_order INTEGER
);

CREATE TABLE diq_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES diq_teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  ball_hit_zone TEXT NOT NULL,
  runners_on JSONB NOT NULL DEFAULT '[]',
  outs INTEGER DEFAULT 0,
  difficulty INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE diq_scenario_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES diq_scenarios(id) ON DELETE CASCADE,
  position_code TEXT REFERENCES diq_positions(code),
  action_type TEXT NOT NULL,
  target_x FLOAT,
  target_y FLOAT,
  target_label TEXT,
  target_zone TEXT,
  throw_to_position TEXT,
  throw_to_label TEXT,
  explanation TEXT,
  position_tolerance FLOAT DEFAULT 8.0,
  UNIQUE(scenario_id, position_code)
);

CREATE TABLE diq_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES diq_players(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES diq_scenarios(id) ON DELETE SET NULL,
  position_played TEXT NOT NULL,
  action_type TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER DEFAULT 0,
  time_ms INTEGER,
  streak_at_time INTEGER DEFAULT 0,
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_diq_scores_player_created ON diq_scores(player_id, created_at DESC);
CREATE INDEX idx_diq_scores_session ON diq_scores(session_id);

CREATE TABLE diq_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_emoji TEXT DEFAULT '⭐'
);

CREATE TABLE diq_player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES diq_players(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES diq_achievements(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, achievement_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE diq_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE diq_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE diq_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diq_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE diq_scenario_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diq_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE diq_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE diq_player_achievements ENABLE ROW LEVEL SECURITY;

-- SELECT for anon on all tables
CREATE POLICY "anon_select_teams" ON diq_teams FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_players" ON diq_players FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_positions" ON diq_positions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_scenarios" ON diq_scenarios FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_actions" ON diq_scenario_actions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_scores" ON diq_scores FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_achievements" ON diq_achievements FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_player_achievements" ON diq_player_achievements FOR SELECT TO anon USING (true);

-- INSERT for anon on score/achievement tables
CREATE POLICY "anon_insert_scores" ON diq_scores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_player_achievements" ON diq_player_achievements FOR INSERT TO anon WITH CHECK (true);

-- INSERT for anon on teams and players (so coaches can create teams)
CREATE POLICY "anon_insert_teams" ON diq_teams FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_players" ON diq_players FOR INSERT TO anon WITH CHECK (true);

-- UPDATE for anon on teams and players
CREATE POLICY "anon_update_teams" ON diq_teams FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_update_players" ON diq_players FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- SEED: POSITIONS
-- ============================================================

INSERT INTO diq_positions (code, name, default_x, default_y, sort_order) VALUES
  ('P',   'Pitcher',       50, 62,  1),
  ('C',   'Catcher',       50, 93,  2),
  ('1B',  '1st Base',      70, 60,  3),
  ('2B',  '2nd Base',      60, 45,  4),
  ('3B',  '3rd Base',      30, 60,  5),
  ('SS',  'Shortstop',     40, 45,  6),
  ('LF',  'Left Field',    20, 25,  7),
  ('LCF', 'Left-Center',   38, 18,  8),
  ('RCF', 'Right-Center',  62, 18,  9),
  ('RF',  'Right Field',   80, 25, 10);

-- ============================================================
-- SEED: ACHIEVEMENTS
-- ============================================================

INSERT INTO diq_achievements (code, name, description, icon_emoji) VALUES
  ('first_correct',  'Rookie Star',     'Got your first answer right!',           '⭐'),
  ('streak_3',       'Hot Streak',      '3 correct in a row!',                    '🔥'),
  ('streak_5',       'On Fire',         '5 correct in a row!',                    '💥'),
  ('streak_10',      'Unstoppable',     '10 correct in a row!',                   '⚡'),
  ('perfect_round',  'Perfect Round',   'Got all 5 right in one round!',          '🏆'),
  ('all_positions',  'Utility Player',  'Practiced every position!',              '🌟'),
  ('century',        'Century Club',    'Scored 100 total correct answers!',      '💯'),
  ('speed_demon',    'Speed Demon',     'Answered correctly in under 2 seconds!', '⏱️');

-- ============================================================
-- SEED: 18 SCENARIOS + 180 ACTIONS
-- ============================================================

DO $$
DECLARE
  s1  UUID; s2  UUID; s3  UUID; s4  UUID; s5  UUID; s6  UUID;
  s7  UUID; s8  UUID; s9  UUID; s10 UUID; s11 UUID; s12 UUID;
  s13 UUID; s14 UUID; s15 UUID; s16 UUID; s17 UUID; s18 UUID;
BEGIN

  -- SCENARIO 1: Ground ball to SS, NOBODY ON
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to SS', 'Nobody on base. Routine ground ball to shortstop.', 'SS', '[]', 0, 1, NULL)
  RETURNING id INTO s1;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s1, 'SS',  'field_and_throw', 40, 45, 'Field the ball',        'SS',         '1B', 'Throw to 1st',    'Field it clean and throw to 1st for the out!'),
    (s1, 'P',   'move_to',         78, 52, 'Back up 1st base',      'backup_1B',  NULL, NULL,              'The throw is going to 1st — back it up!'),
    (s1, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home and watch the field'),
    (s1, '1B',  'move_to',         72, 58, 'Cover 1st base',        '1B',         NULL, NULL,              'Get on the bag — the throw is coming to you!'),
    (s1, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd base in case of an overthrow'),
    (s1, '3B',  'move_to',         28, 58, 'Stay on 3rd',           '3B',         NULL, NULL,              'Stay on 3rd and watch the play'),
    (s1, 'LF',  'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Move toward 3rd in case a ball gets loose'),
    (s1, 'LCF', 'move_to',         38, 38, 'Back up SS area',       'backup_SS',  NULL, NULL,              'Come in behind where the play is happening'),
    (s1, 'RCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Move toward 2nd in case the throw goes there'),
    (s1, 'RF',  'move_to',         78, 52, 'Back up 1st',           'backup_1B',  NULL, NULL,              'Back up 1st in case the throw gets past!');

  -- SCENARIO 2: Ground ball to 2B, NOBODY ON
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to 2B', 'Nobody on base. Ground ball to second baseman.', '2B', '[]', 0, 1, NULL)
  RETURNING id INTO s2;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s2, '2B',  'field_and_throw', 60, 45, 'Field the ball',        '2B',         '1B', 'Throw to 1st',    'Field it and throw to 1st for the out!'),
    (s2, 'P',   'move_to',         78, 52, 'Back up 1st base',      'backup_1B',  NULL, NULL,              'Back up 1st — that''s where the throw is going!'),
    (s2, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home and watch the field'),
    (s2, '1B',  'move_to',         72, 58, 'Cover 1st base',        '1B',         NULL, NULL,              'Get on the bag — here comes the throw!'),
    (s2, '3B',  'move_to',         28, 58, 'Stay on 3rd',           '3B',         NULL, NULL,              'Stay on 3rd and watch the play'),
    (s2, 'SS',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd since the 2nd baseman is fielding'),
    (s2, 'LF',  'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Move toward 3rd in case a ball gets loose'),
    (s2, 'LCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd base area'),
    (s2, 'RCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd base area'),
    (s2, 'RF',  'move_to',         78, 52, 'Back up 1st',           'backup_1B',  NULL, NULL,              'Back up 1st in case the throw gets past!');

  -- SCENARIO 3: Ground ball to 3B, NOBODY ON
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to 3B', 'Nobody on base. Ground ball to third baseman.', '3B', '[]', 0, 1, NULL)
  RETURNING id INTO s3;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s3, '3B',  'field_and_throw', 30, 60, 'Field the ball',        '3B',         '1B', 'Throw to 1st',    'Field it and fire to 1st for the out!'),
    (s3, 'P',   'move_to',         78, 52, 'Back up 1st base',      'backup_1B',  NULL, NULL,              'Back up 1st — long throw coming!'),
    (s3, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home and watch the field'),
    (s3, '1B',  'move_to',         72, 58, 'Cover 1st base',        '1B',         NULL, NULL,              'Get on the bag — here comes a long throw!'),
    (s3, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd base'),
    (s3, 'SS',  'move_to',         28, 58, 'Cover 3rd base',        '3B',         NULL, NULL,              'Cover 3rd since the 3rd baseman is fielding'),
    (s3, 'LF',  'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Back up the 3rd base area'),
    (s3, 'LCF', 'move_to',         38, 38, 'Back up SS area',       'backup_SS',  NULL, NULL,              'Come in behind the infield'),
    (s3, 'RCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd base'),
    (s3, 'RF',  'move_to',         78, 52, 'Back up 1st',           'backup_1B',  NULL, NULL,              'Back up 1st — it''s a long throw, it could get past!');

  -- SCENARIO 4: Ground ball to 1B, NOBODY ON
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to 1B', 'Nobody on base. Ground ball to first baseman.', '1B', '[]', 0, 1, NULL)
  RETURNING id INTO s4;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s4, '1B',  'field_and_throw', 70, 60, 'Field and step on bag', '1B',         '1B', 'Step on 1st',     'Field it and step on the bag yourself for the out!'),
    (s4, 'P',   'move_to',         72, 58, 'Cover 1st base',        '1B',         NULL, NULL,              'Run to 1st — if 1B fields it away from the bag, he throws to you!'),
    (s4, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home and watch the field'),
    (s4, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd base'),
    (s4, '3B',  'move_to',         28, 58, 'Stay on 3rd',           '3B',         NULL, NULL,              'Stay on 3rd and watch the play'),
    (s4, 'SS',  'move_to',         50, 38, 'Cover middle',          '2B',         NULL, NULL,              'Help cover the middle of the field'),
    (s4, 'LF',  'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Move toward 3rd in case a ball gets loose'),
    (s4, 'LCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd base area'),
    (s4, 'RCF', 'move_to',         50, 32, 'Back up middle',        'backup_2B',  NULL, NULL,              'Back up the middle'),
    (s4, 'RF',  'move_to',         78, 52, 'Back up 1st',           'backup_1B',  NULL, NULL,              'Back up behind 1st base!');

  -- SCENARIO 5: Fly ball to LF, NOBODY ON
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Fly ball to LF', 'Nobody on base. Fly ball to left field.', 'LF', '[]', 0, 1, NULL)
  RETURNING id INTO s5;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s5, 'LF',  'field_and_throw', 20, 25, 'Catch the fly ball',    'LF',         'SS', 'Throw to cutoff', 'Catch it for the out! Throw to your cutoff man.'),
    (s5, 'P',   'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Back up 3rd in case a runner tries to advance'),
    (s5, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home and guard the plate'),
    (s5, '1B',  'move_to',         70, 60, 'Stay on 1st',           'stay_1B',    NULL, NULL,              'Stay on 1st'),
    (s5, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd base'),
    (s5, '3B',  'move_to',         28, 58, 'Cover 3rd base',        '3B',         NULL, NULL,              'Cover 3rd base'),
    (s5, 'SS',  'move_to',         32, 45, 'Be the cutoff',         'cutoff_LF',  NULL, NULL,              'Line up between the left fielder and 3rd — you''re the cutoff!'),
    (s5, 'LCF', 'move_to',         25, 25, 'Back up LF',            'backup_LF',  NULL, NULL,              'Back up the left fielder in case he drops it!'),
    (s5, 'RCF', 'move_to',         50, 32, 'Back up 2nd area',      'backup_2B',  NULL, NULL,              'Move toward 2nd base area'),
    (s5, 'RF',  'move_to',         65, 22, 'Shift toward center',   'shift_center', NULL, NULL,            'Shift toward center to cover the field');

  -- SCENARIO 6: Fly ball to LCF, NOBODY ON
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Fly ball to LCF', 'Nobody on base. Fly ball to left-center field.', 'LCF', '[]', 0, 1, NULL)
  RETURNING id INTO s6;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s6, 'LCF', 'field_and_throw', 38, 18, 'Catch the fly ball',    'LCF',        'SS', 'Throw to cutoff', 'Catch it! Throw to your cutoff man.'),
    (s6, 'P',   'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd in case of an overthrow'),
    (s6, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home and guard the plate'),
    (s6, '1B',  'move_to',         70, 60, 'Stay on 1st',           'stay_1B',    NULL, NULL,              'Stay on 1st'),
    (s6, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd base'),
    (s6, '3B',  'move_to',         28, 58, 'Stay on 3rd',           '3B',         NULL, NULL,              'Stay on 3rd'),
    (s6, 'SS',  'move_to',         42, 38, 'Be the cutoff',         'cutoff_LCF', NULL, NULL,              'Line up as the cutoff between the outfielder and 2nd base!'),
    (s6, 'LF',  'move_to',         25, 22, 'Back up LCF',           'backup_LCF', NULL, NULL,              'Back up your teammate!'),
    (s6, 'RCF', 'move_to',         55, 18, 'Back up LCF',           'backup_LCF', NULL, NULL,              'Help back up the play!'),
    (s6, 'RF',  'move_to',         65, 22, 'Shift toward center',   'shift_center', NULL, NULL,            'Shift toward center to cover');

  -- SCENARIO 7: Fly ball to RCF, NOBODY ON
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Fly ball to RCF', 'Nobody on base. Fly ball to right-center field.', 'RCF', '[]', 0, 1, NULL)
  RETURNING id INTO s7;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s7, 'RCF', 'field_and_throw', 62, 18, 'Catch the fly ball',    'RCF',        '2B', 'Throw to cutoff', 'Catch it! Throw to your cutoff man.'),
    (s7, 'P',   'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd base'),
    (s7, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home and guard the plate'),
    (s7, '1B',  'move_to',         70, 60, 'Stay on 1st',           'stay_1B',    NULL, NULL,              'Stay on 1st'),
    (s7, '2B',  'move_to',         58, 38, 'Be the cutoff',         'cutoff_RCF', NULL, NULL,              'Line up as the cutoff between the outfielder and 2nd!'),
    (s7, '3B',  'move_to',         28, 58, 'Stay on 3rd',           '3B',         NULL, NULL,              'Stay on 3rd'),
    (s7, 'SS',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd base'),
    (s7, 'LF',  'move_to',         35, 22, 'Shift toward center',   'shift_center', NULL, NULL,            'Shift toward center to cover'),
    (s7, 'LCF', 'move_to',         55, 18, 'Back up RCF',           'backup_RCF', NULL, NULL,              'Help back up the play!'),
    (s7, 'RF',  'move_to',         75, 22, 'Back up RCF',           'backup_RCF', NULL, NULL,              'Back up your teammate!');

  -- SCENARIO 8: Fly ball to RF, NOBODY ON
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Fly ball to RF', 'Nobody on base. Fly ball to right field.', 'RF', '[]', 0, 1, NULL)
  RETURNING id INTO s8;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s8, 'RF',  'field_and_throw', 80, 25, 'Catch the fly ball',    'RF',         '2B', 'Throw to cutoff', 'Catch it for the out! Throw to your cutoff man.'),
    (s8, 'P',   'move_to',         78, 52, 'Back up 1st',           'backup_1B',  NULL, NULL,              'Back up 1st base'),
    (s8, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home and guard the plate'),
    (s8, '1B',  'move_to',         70, 60, 'Stay on 1st',           'stay_1B',    NULL, NULL,              'Stay on 1st'),
    (s8, '2B',  'move_to',         68, 45, 'Be the cutoff',         'cutoff_RF',  NULL, NULL,              'Line up between the right fielder and 2nd — you''re the cutoff!'),
    (s8, '3B',  'move_to',         28, 58, 'Stay on 3rd',           '3B',         NULL, NULL,              'Stay on 3rd'),
    (s8, 'SS',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd base'),
    (s8, 'LF',  'move_to',         35, 22, 'Shift toward center',   'shift_center', NULL, NULL,            'Shift toward center to cover the field'),
    (s8, 'LCF', 'move_to',         45, 22, 'Shift toward center',   'shift_center', NULL, NULL,            'Shift toward center'),
    (s8, 'RCF', 'move_to',         75, 22, 'Back up RF',            'backup_RF',  NULL, NULL,              'Back up the right fielder in case he drops it!');

  -- SCENARIO 9: Ground ball to SS, RUNNER ON 1ST
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to SS, runner on 1st', 'Runner on 1st base. Ground ball to shortstop — force play at 2nd!', 'SS', '["1B"]', 0, 2, NULL)
  RETURNING id INTO s9;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s9, 'SS',  'field_and_throw', 40, 45, 'Field the ball',        'SS',         '2B', 'Throw to 2nd',    'Field it and throw to 2nd for the force out!'),
    (s9, 'P',   'move_to',         65, 52, 'Back up relay',         'backup_relay', NULL, NULL,             'Back up the throw — could go to 1st or 2nd!'),
    (s9, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home — nobody heading there'),
    (s9, '1B',  'move_to',         72, 58, 'Cover 1st base',        '1B',         NULL, NULL,              'Cover 1st — 2B might throw here for the double play!'),
    (s9, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Get on the bag at 2nd — force out coming!'),
    (s9, '3B',  'move_to',         28, 58, 'Cover 3rd base',        '3B',         NULL, NULL,              'Cover 3rd in case the runner advances'),
    (s9, 'LF',  'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Back up 3rd — a runner might end up there'),
    (s9, 'LCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd — that''s where the throw is going!'),
    (s9, 'RCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up the play at 2nd!'),
    (s9, 'RF',  'move_to',         78, 52, 'Back up 1st',           'backup_1B',  NULL, NULL,              'Back up 1st in case of a relay throw!');

  -- SCENARIO 10: Ground ball to 2B, RUNNER ON 1ST
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to 2B, runner on 1st', 'Runner on 1st base. Ground ball to second baseman — force play at 2nd!', '2B', '["1B"]', 0, 2, NULL)
  RETURNING id INTO s10;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s10, '2B',  'field_and_throw', 60, 45, 'Field the ball',        '2B',         'SS', 'Throw to SS at 2nd', 'Field it and throw to 2nd for the force out!'),
    (s10, 'P',   'move_to',         65, 52, 'Back up the play',      'backup_relay', NULL, NULL,             'Back up the play!'),
    (s10, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home and watch'),
    (s10, '1B',  'move_to',         72, 58, 'Cover 1st base',        '1B',         NULL, NULL,              'Cover 1st for a possible double play throw!'),
    (s10, '3B',  'move_to',         28, 58, 'Cover 3rd base',        '3B',         NULL, NULL,              'Cover 3rd in case the runner advances'),
    (s10, 'SS',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Get on the bag at 2nd — force out coming your way!'),
    (s10, 'LF',  'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Back up 3rd base'),
    (s10, 'LCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up the play at 2nd!'),
    (s10, 'RCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd base!'),
    (s10, 'RF',  'move_to',         78, 52, 'Back up 1st',           'backup_1B',  NULL, NULL,              'Back up 1st base!');

  -- SCENARIO 11: Fly ball to RF, RUNNER ON 1ST
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Fly ball to RF, runner on 1st', 'Runner on 1st base. Fly ball to right field — keep the runner!', 'RF', '["1B"]', 0, 2, NULL)
  RETURNING id INTO s11;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s11, 'RF',  'field_and_throw', 80, 25, 'Catch the fly ball',    'RF',         '2B', 'Throw to cutoff', 'Catch it! Throw to your cutoff to keep the runner at 1st!'),
    (s11, 'P',   'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd — the runner might try to advance!'),
    (s11, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home and guard the plate'),
    (s11, '1B',  'move_to',         72, 58, 'Cover 1st base',        '1B',         NULL, NULL,              'Cover 1st — the runner might not tag up'),
    (s11, '2B',  'move_to',         68, 45, 'Be the cutoff',         'cutoff_RF',  NULL, NULL,              'You''re the cutoff! Line up between the right fielder and 2nd base!'),
    (s11, '3B',  'move_to',         28, 58, 'Cover 3rd base',        '3B',         NULL, NULL,              'Cover 3rd in case the runner gets greedy'),
    (s11, 'SS',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd — the runner might try to advance on the catch!'),
    (s11, 'LF',  'move_to',         35, 22, 'Shift to cover',        'shift_center', NULL, NULL,            'Shift to cover the field'),
    (s11, 'LCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd base!'),
    (s11, 'RCF', 'move_to',         75, 22, 'Back up RF',            'backup_RF',  NULL, NULL,              'Back up the right fielder!');

  -- SCENARIO 12: Fly ball to LF, RUNNER ON 1ST
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Fly ball to LF, runner on 1st', 'Runner on 1st base. Fly ball to left field — keep the runner!', 'LF', '["1B"]', 0, 2, NULL)
  RETURNING id INTO s12;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s12, 'LF',  'field_and_throw', 20, 25, 'Catch the fly ball',    'LF',         'SS', 'Throw to cutoff', 'Catch it! Throw to your cutoff to keep the runner at 1st!'),
    (s12, 'P',   'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd — the runner might try to tag up!'),
    (s12, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home and guard the plate'),
    (s12, '1B',  'move_to',         72, 58, 'Cover 1st base',        '1B',         NULL, NULL,              'Cover 1st — runner might not tag'),
    (s12, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd base — runner might try to advance!'),
    (s12, '3B',  'move_to',         28, 58, 'Cover 3rd base',        '3B',         NULL, NULL,              'Cover 3rd'),
    (s12, 'SS',  'move_to',         32, 45, 'Be the cutoff',         'cutoff_LF',  NULL, NULL,              'You''re the cutoff! Line up between the left fielder and 2nd!'),
    (s12, 'LCF', 'move_to',         25, 22, 'Back up LF',            'backup_LF',  NULL, NULL,              'Back up the left fielder!'),
    (s12, 'RCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd base!'),
    (s12, 'RF',  'move_to',         65, 22, 'Shift to cover',        'shift_center', NULL, NULL,            'Shift to cover the field');

  -- SCENARIO 13: Ground ball to SS, RUNNER ON 2ND
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to SS, runner on 2nd', 'Runner on 2nd base. Ground ball to shortstop — watch the runner!', 'SS', '["2B"]', 0, 2, NULL)
  RETURNING id INTO s13;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s13, 'SS',  'field_and_throw', 40, 45, 'Field the ball',        'SS',         '1B', 'Throw to 1st',    'Check the runner! If he''s staying, throw to 1st for the out!'),
    (s13, 'P',   'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Back up 3rd — the runner might try to go there!'),
    (s13, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home — the runner could try to score!'),
    (s13, '1B',  'move_to',         72, 58, 'Cover 1st base',        '1B',         NULL, NULL,              'Get on the bag for the throw!'),
    (s13, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd in case the runner goes back'),
    (s13, '3B',  'move_to',         28, 58, 'Cover 3rd base',        '3B',         NULL, NULL,              'Cover 3rd — the runner might be heading your way!'),
    (s13, 'LF',  'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Back up 3rd base!'),
    (s13, 'LCF', 'move_to',         38, 38, 'Back up SS area',       'backup_SS',  NULL, NULL,              'Back up the play!'),
    (s13, 'RCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd base'),
    (s13, 'RF',  'move_to',         78, 52, 'Back up 1st',           'backup_1B',  NULL, NULL,              'Back up 1st base!');

  -- SCENARIO 14: Fly ball to LCF, RUNNER ON 2ND (tag up play)
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Fly ball to LCF, runner on 2nd (tag up)', 'Runner on 2nd base. Fly ball to left-center — tag up play! Runner is going home!', 'LCF', '["2B"]', 0, 2, NULL)
  RETURNING id INTO s14;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s14, 'LCF', 'field_and_throw', 38, 18, 'Catch the fly ball',    'LCF',        'SS', 'Throw to cutoff', 'Catch it! The runner is tagging — throw to the cutoff fast!'),
    (s14, 'P',   'move_to',         50, 96, 'Back up home',          'backup_home', NULL, NULL,             'Back up home — the runner is going to try to score!'),
    (s14, 'C',   'move_to',         50, 90, 'Guard home plate',      'home',       NULL, NULL,              'Stay on the plate — tag the runner!'),
    (s14, '1B',  'move_to',         70, 60, 'Stay on 1st',           'stay_1B',    NULL, NULL,              'Stay on 1st'),
    (s14, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd'),
    (s14, '3B',  'move_to',         28, 58, 'Cover 3rd base',        '3B',         NULL, NULL,              'Cover 3rd'),
    (s14, 'SS',  'move_to',         42, 55, 'Be the cutoff to home', 'cutoff_home_LCF', NULL, NULL,         'You''re the cutoff! Line up between the outfielder and home plate!'),
    (s14, 'LF',  'move_to',         25, 22, 'Back up LCF',           'backup_LCF', NULL, NULL,              'Back up the fielder!'),
    (s14, 'RCF', 'move_to',         55, 18, 'Back up LCF',           'backup_LCF', NULL, NULL,              'Help back up the play!'),
    (s14, 'RF',  'move_to',         65, 22, 'Shift to cover',        'shift_center', NULL, NULL,            'Shift to cover');

  -- SCENARIO 15: Fly ball to RF, RUNNER ON 2ND (tag up play)
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Fly ball to RF, runner on 2nd (tag up)', 'Runner on 2nd base. Fly ball to right field — tag up play! Runner heading to 3rd!', 'RF', '["2B"]', 0, 2, NULL)
  RETURNING id INTO s15;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s15, 'RF',  'field_and_throw', 80, 25, 'Catch the fly ball',    'RF',         '2B', 'Throw to cutoff', 'Catch it! Throw to the cutoff — the runner is tagging!'),
    (s15, 'P',   'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Back up 3rd — the runner might go there!'),
    (s15, 'C',   'move_to',         50, 90, 'Stay home',             'home',       NULL, NULL,              'Stay home in case the runner tries to score!'),
    (s15, '1B',  'move_to',         70, 60, 'Stay on 1st',           'stay_1B',    NULL, NULL,              'Stay on 1st'),
    (s15, '2B',  'move_to',         60, 45, 'Be the cutoff to 3rd',  'cutoff_RF_to_3B', NULL, NULL,         'You''re the cutoff! Line up between the right fielder and 3rd!'),
    (s15, '3B',  'move_to',         28, 58, 'Cover 3rd base',        '3B',         NULL, NULL,              'Get on the bag — the runner is coming!'),
    (s15, 'SS',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd base'),
    (s15, 'LF',  'move_to',         35, 22, 'Shift to cover',        'shift_center', NULL, NULL,            'Shift to cover'),
    (s15, 'LCF', 'move_to',         50, 32, 'Back up middle',        'backup_2B',  NULL, NULL,              'Back up the middle'),
    (s15, 'RCF', 'move_to',         75, 22, 'Back up RF',            'backup_RF',  NULL, NULL,              'Back up the right fielder!');

  -- SCENARIO 16: Ground ball to SS, RUNNERS ON 1ST AND 2ND
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to SS, runners on 1st & 2nd', 'Runners on 1st and 2nd. Ground ball to shortstop — get the lead runner!', 'SS', '["1B","2B"]', 0, 3, NULL)
  RETURNING id INTO s16;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s16, 'SS',  'field_and_throw', 40, 45, 'Field the ball',        'SS',         '3B', 'Throw to 3rd',    'Get the lead runner! Throw to 3rd for the force!'),
    (s16, 'P',   'move_to',         50, 96, 'Back up home',          'backup_home', NULL, NULL,             'Back up home — runners are moving!'),
    (s16, 'C',   'move_to',         50, 90, 'Protect home',          'home',       NULL, NULL,              'Stay home — protect the plate!'),
    (s16, '1B',  'move_to',         72, 58, 'Cover 1st base',        '1B',         NULL, NULL,              'Cover 1st for a possible relay!'),
    (s16, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd for a possible force there!'),
    (s16, '3B',  'move_to',         28, 58, 'Cover 3rd base',        '3B',         NULL, NULL,              'Get on the bag — force play coming!'),
    (s16, 'LF',  'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Back up 3rd!'),
    (s16, 'LCF', 'move_to',         38, 38, 'Back up SS area',       'backup_SS',  NULL, NULL,              'Back up the play!'),
    (s16, 'RCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd!'),
    (s16, 'RF',  'move_to',         78, 52, 'Back up 1st',           'backup_1B',  NULL, NULL,              'Back up 1st!');

  -- SCENARIO 17: Ground ball to 3B, RUNNERS ON 1ST AND 2ND
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to 3B, runners on 1st & 2nd', 'Runners on 1st and 2nd. Ground ball to third baseman — step on the bag!', '3B', '["1B","2B"]', 0, 3, NULL)
  RETURNING id INTO s17;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s17, '3B',  'field_and_throw', 30, 60, 'Field and step on 3rd', '3B',         '3B', 'Step on 3rd then throw to 1st', 'Step on 3rd for the force! Then throw to 1st!'),
    (s17, 'P',   'move_to',         50, 96, 'Back up home',          'backup_home', NULL, NULL,             'Back up home — runners everywhere!'),
    (s17, 'C',   'move_to',         50, 90, 'Protect home',          'home',       NULL, NULL,              'Stay home and protect the plate!'),
    (s17, '1B',  'move_to',         72, 58, 'Cover 1st base',        '1B',         NULL, NULL,              'Get on the bag — throw coming after the force at 3rd!'),
    (s17, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd base'),
    (s17, 'SS',  'move_to',         28, 58, 'Cover 3rd base',        '3B',         NULL, NULL,              'Cover 3rd after the 3rd baseman fields it'),
    (s17, 'LF',  'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Back up 3rd base!'),
    (s17, 'LCF', 'move_to',         38, 38, 'Back up infield',       'backup_SS',  NULL, NULL,              'Back up the infield!'),
    (s17, 'RCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd!'),
    (s17, 'RF',  'move_to',         78, 52, 'Back up 1st',           'backup_1B',  NULL, NULL,              'Back up 1st!');

  -- SCENARIO 18: Ground ball to P/1B area, RUNNER ON 3RD, LESS THAN 2 OUTS
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to pitcher, runner on 3rd', 'Runner on 3rd, less than 2 outs. Ground ball to the pitcher — watch that runner!', 'P', '["3B"]', 0, 3, NULL)
  RETURNING id INTO s18;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s18, 'P',   'field_and_throw', 50, 62, 'Field the ball',        'P',          '1B', 'Throw to 1st',    'Look the runner back to 3rd! Then throw to 1st!'),
    (s18, 'C',   'move_to',         50, 90, 'Guard home plate',      'home',       NULL, NULL,              'Guard home plate — the runner might try to score!'),
    (s18, '1B',  'move_to',         72, 58, 'Cover 1st base',        '1B',         NULL, NULL,              'Get on the bag for the throw!'),
    (s18, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',         NULL, NULL,              'Cover 2nd'),
    (s18, '3B',  'move_to',         28, 58, 'Stay on 3rd',           '3B',         NULL, NULL,              'STAY on 3rd! Keep the runner there!'),
    (s18, 'SS',  'move_to',         40, 50, 'Stay ready',            'shifted_in', NULL, NULL,              'Stay ready — play is at the plate or 1st!'),
    (s18, 'LF',  'move_to',         22, 52, 'Back up 3rd',           'backup_3B',  NULL, NULL,              'Back up 3rd — don''t let that runner advance!'),
    (s18, 'LCF', 'move_to',         38, 38, 'Back up infield',       'backup_SS',  NULL, NULL,              'Back up the infield'),
    (s18, 'RCF', 'move_to',         50, 32, 'Back up 2nd',           'backup_2B',  NULL, NULL,              'Back up 2nd'),
    (s18, 'RF',  'move_to',         78, 52, 'Back up 1st',           'backup_1B',  NULL, NULL,              'Back up 1st!');

END $$;
