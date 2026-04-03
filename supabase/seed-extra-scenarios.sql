-- Extra scenarios for inning mode: bases loaded, 1st & 3rd
DO $$
DECLARE
  s_loaded_ss UUID;
  s_loaded_3b UUID;
  s_13_ss UUID;
  s_13_rf UUID;
BEGIN

  -- ============================================================
  -- SCENARIO: Ground ball to SS, BASES LOADED
  -- ============================================================
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to SS, bases loaded', 'Bases loaded! Force at every base.', 'SS', '["1B","2B","3B"]', 0, 3, NULL)
  RETURNING id INTO s_loaded_ss;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s_loaded_ss, 'SS',  'field_and_throw', 40, 45, 'Field the ball',     'SS',         'home', 'Throw home',  'Bases loaded — throw home to get the lead runner!'),
    (s_loaded_ss, 'P',   'move_to',         50, 96, 'Back up home',       'backup_home', NULL, NULL,           'Back up home plate — the throw is going there!'),
    (s_loaded_ss, 'C',   'move_to',         50, 90, 'Cover home plate',   'home',        NULL, NULL,           'Get ready at the plate — force play coming!'),
    (s_loaded_ss, '1B',  'move_to',         72, 58, 'Cover 1st base',     '1B',          NULL, NULL,           'Cover 1st — we might turn two!'),
    (s_loaded_ss, '2B',  'move_to',         50, 38, 'Cover 2nd base',     '2B',          NULL, NULL,           'Cover 2nd for a possible relay!'),
    (s_loaded_ss, '3B',  'move_to',         28, 58, 'Cover 3rd base',     '3B',          NULL, NULL,           'Cover 3rd — force play there too!'),
    (s_loaded_ss, 'LF',  'move_to',         22, 52, 'Back up 3rd',        'backup_3B',   NULL, NULL,           'Back up 3rd base!'),
    (s_loaded_ss, 'LCF', 'move_to',         38, 38, 'Back up SS area',    'backup_SS',   NULL, NULL,           'Back up the shortstop!'),
    (s_loaded_ss, 'RCF', 'move_to',         50, 32, 'Back up 2nd',        'backup_2B',   NULL, NULL,           'Back up 2nd base!'),
    (s_loaded_ss, 'RF',  'move_to',         78, 52, 'Back up 1st',        'backup_1B',   NULL, NULL,           'Back up 1st base!');

  -- ============================================================
  -- SCENARIO: Ground ball to 3B, BASES LOADED
  -- ============================================================
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to 3B, bases loaded', 'Bases loaded! Easy force at home.', '3B', '["1B","2B","3B"]', 0, 3, NULL)
  RETURNING id INTO s_loaded_3b;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s_loaded_3b, '3B',  'field_and_throw', 30, 60, 'Field the ball',     '3B',          'home', 'Throw home', 'Step on 3rd for the force, or throw home!'),
    (s_loaded_3b, 'P',   'move_to',         50, 96, 'Back up home',       'backup_home',  NULL, NULL,          'Back up home plate — the throw is going there!'),
    (s_loaded_3b, 'C',   'move_to',         50, 90, 'Cover home plate',   'home',         NULL, NULL,          'Get ready at the plate — force play coming!'),
    (s_loaded_3b, '1B',  'move_to',         72, 58, 'Cover 1st base',     '1B',           NULL, NULL,          'Cover 1st — we might get a double play!'),
    (s_loaded_3b, '2B',  'move_to',         50, 38, 'Cover 2nd base',     '2B',           NULL, NULL,          'Cover 2nd base!'),
    (s_loaded_3b, 'SS',  'move_to',         28, 58, 'Cover 3rd base',     '3B',           NULL, NULL,          'Cover 3rd since the 3rd baseman is fielding!'),
    (s_loaded_3b, 'LF',  'move_to',         22, 52, 'Back up 3rd',        'backup_3B',    NULL, NULL,          'Back up 3rd base area!'),
    (s_loaded_3b, 'LCF', 'move_to',         38, 38, 'Back up SS area',    'backup_SS',    NULL, NULL,          'Back up the infield!'),
    (s_loaded_3b, 'RCF', 'move_to',         50, 32, 'Back up 2nd',        'backup_2B',    NULL, NULL,          'Back up 2nd base!'),
    (s_loaded_3b, 'RF',  'move_to',         78, 52, 'Back up 1st',        'backup_1B',    NULL, NULL,          'Back up 1st base!');

  -- ============================================================
  -- SCENARIO: Ground ball to SS, RUNNERS ON 1ST AND 3RD
  -- ============================================================
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to SS, runners 1st & 3rd', 'Runners on 1st and 3rd — watch the runner at 3rd!', 'SS', '["1B","3B"]', 0, 3, NULL)
  RETURNING id INTO s_13_ss;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s_13_ss, 'SS',  'field_and_throw', 40, 45, 'Field the ball',      'SS',          '2B', 'Throw to 2nd', 'Get the force at 2nd — but check the runner at 3rd!'),
    (s_13_ss, 'P',   'move_to',         50, 96, 'Back up home',        'backup_home',  NULL, NULL,           'Back up home — runner on 3rd might try to score!'),
    (s_13_ss, 'C',   'move_to',         50, 90, 'Cover home plate',    'home',         NULL, NULL,           'Stay home — watch the runner on 3rd!'),
    (s_13_ss, '1B',  'move_to',         72, 58, 'Cover 1st base',      '1B',           NULL, NULL,           'Cover 1st for a possible double play!'),
    (s_13_ss, '2B',  'move_to',         50, 38, 'Cover 2nd base',      '2B',           NULL, NULL,           'Get on the bag — force out coming!'),
    (s_13_ss, '3B',  'move_to',         28, 58, 'Cover 3rd base',      '3B',           NULL, NULL,           'Stay on 3rd — keep that runner honest!'),
    (s_13_ss, 'LF',  'move_to',         22, 52, 'Back up 3rd',         'backup_3B',    NULL, NULL,           'Back up 3rd base!'),
    (s_13_ss, 'LCF', 'move_to',         50, 32, 'Back up 2nd',         'backup_2B',    NULL, NULL,           'Back up 2nd — throw is going there!'),
    (s_13_ss, 'RCF', 'move_to',         50, 32, 'Back up 2nd',         'backup_2B',    NULL, NULL,           'Back up 2nd base!'),
    (s_13_ss, 'RF',  'move_to',         78, 52, 'Back up 1st',         'backup_1B',    NULL, NULL,           'Back up 1st base!');

  -- ============================================================
  -- SCENARIO: Fly ball to RF, RUNNERS ON 1ST AND 3RD
  -- ============================================================
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Fly ball to RF, runners 1st & 3rd', 'Runners on 1st and 3rd — runner on 3rd will tag up!', 'RF', '["1B","3B"]', 0, 3, NULL)
  RETURNING id INTO s_13_rf;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s_13_rf, 'RF',  'field_and_throw', 80, 25, 'Catch the ball',      'RF',          '2B', 'Throw to cutoff', 'Catch it! Throw to the cutoff — runner on 3rd is tagging!'),
    (s_13_rf, 'P',   'move_to',         50, 96, 'Back up home',        'backup_home',  NULL, NULL,              'Back up home — runner on 3rd will try to score!'),
    (s_13_rf, 'C',   'move_to',         50, 90, 'Cover home plate',    'home',         NULL, NULL,              'Stay home — the runner is coming!'),
    (s_13_rf, '1B',  'move_to',         72, 58, 'Cover 1st base',      '1B',           NULL, NULL,              'Cover 1st — runner might not tag up'),
    (s_13_rf, '2B',  'move_to',         68, 45, 'Cutoff position',     'cutoff_RF',    NULL, NULL,              'You are the cutoff! Line up between RF and home!'),
    (s_13_rf, '3B',  'move_to',         28, 58, 'Cover 3rd base',      '3B',           NULL, NULL,              'Cover 3rd base!'),
    (s_13_rf, 'SS',  'move_to',         50, 38, 'Cover 2nd base',      '2B',           NULL, NULL,              'Cover 2nd base!'),
    (s_13_rf, 'LF',  'move_to',         35, 22, 'Shift to center',     'shift_center', NULL, NULL,              'Shift toward center to cover!'),
    (s_13_rf, 'LCF', 'move_to',         50, 32, 'Back up 2nd',         'backup_2B',    NULL, NULL,              'Back up the middle!'),
    (s_13_rf, 'RCF', 'move_to',         75, 22, 'Back up RF',          'backup_RF',    NULL, NULL,              'Back up the right fielder!');

END $$;
