-- More scenarios for variety: runners on 1st & 2nd hitting to different positions
-- Also: outfield scenarios with runners for variety
DO $$
DECLARE
  s_12_2b UUID;
  s_12_lf UUID;
  s_12_rf UUID;
  s_none_p UUID;
BEGIN

  -- ============================================================
  -- Ground ball to 2B, RUNNERS ON 1ST AND 2ND
  -- ============================================================
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to 2B, runners 1st & 2nd', 'Runners on 1st and 2nd. Get the force!', '2B', '["1B","2B"]', 0, 3, NULL)
  RETURNING id INTO s_12_2b;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s_12_2b, '2B',  'field_and_throw', 60, 45, 'Field the ball',    '2B',         '3B', 'Throw to 3rd', 'Get the lead runner! Throw to 3rd for the force!'),
    (s_12_2b, 'P',   'move_to',         50, 96, 'Back up home',      'backup_home', NULL, NULL,           'Back up home — runners are moving!'),
    (s_12_2b, 'C',   'move_to',         50, 90, 'Stay home',         'home',        NULL, NULL,           'Stay home and protect the plate!'),
    (s_12_2b, '1B',  'move_to',         72, 58, 'Cover 1st base',    '1B',          NULL, NULL,           'Cover 1st for a possible double play!'),
    (s_12_2b, '3B',  'move_to',         28, 58, 'Cover 3rd base',    '3B',          NULL, NULL,           'Get on the bag — force play coming!'),
    (s_12_2b, 'SS',  'move_to',         50, 38, 'Cover 2nd base',    '2B',          NULL, NULL,           'Cover 2nd for a possible force!'),
    (s_12_2b, 'LF',  'move_to',         22, 52, 'Back up 3rd',       'backup_3B',   NULL, NULL,           'Back up 3rd base!'),
    (s_12_2b, 'LCF', 'move_to',         38, 38, 'Back up SS area',   'backup_SS',   NULL, NULL,           'Back up the infield!'),
    (s_12_2b, 'RCF', 'move_to',         50, 32, 'Back up 2nd',       'backup_2B',   NULL, NULL,           'Back up 2nd base!'),
    (s_12_2b, 'RF',  'move_to',         78, 52, 'Back up 1st',       'backup_1B',   NULL, NULL,           'Back up 1st base!');

  -- ============================================================
  -- Fly ball to LF, RUNNERS ON 1ST AND 2ND
  -- ============================================================
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Fly ball to LF, runners 1st & 2nd', 'Runners on 1st and 2nd. Ball to left field!', 'LF', '["1B","2B"]', 0, 3, NULL)
  RETURNING id INTO s_12_lf;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s_12_lf, 'LF',  'field_and_throw', 20, 25, 'Field the ball',    'LF',          'SS', 'Throw to cutoff', 'Get the ball in fast! Throw to the cutoff!'),
    (s_12_lf, 'P',   'move_to',         50, 96, 'Back up home',      'backup_home',  NULL, NULL,              'Back up home — runners might try to score!'),
    (s_12_lf, 'C',   'move_to',         50, 90, 'Stay home',         'home',         NULL, NULL,              'Stay home — runner from 2nd might score!'),
    (s_12_lf, '1B',  'move_to',         72, 58, 'Cover 1st base',    '1B',           NULL, NULL,              'Cover 1st base!'),
    (s_12_lf, '2B',  'move_to',         50, 38, 'Cover 2nd base',    '2B',           NULL, NULL,              'Cover 2nd base!'),
    (s_12_lf, '3B',  'move_to',         28, 58, 'Cover 3rd base',    '3B',           NULL, NULL,              'Cover 3rd — runner heading your way!'),
    (s_12_lf, 'SS',  'move_to',         32, 45, 'Cutoff position',   'cutoff_LF',    NULL, NULL,              'You are the cutoff! Line up between LF and 3rd!'),
    (s_12_lf, 'LCF', 'move_to',         25, 22, 'Back up LF',        'backup_LF',    NULL, NULL,              'Back up the left fielder!'),
    (s_12_lf, 'RCF', 'move_to',         50, 32, 'Back up 2nd',       'backup_2B',    NULL, NULL,              'Back up 2nd base!'),
    (s_12_lf, 'RF',  'move_to',         65, 22, 'Shift to center',   'shift_center', NULL, NULL,              'Shift toward center to cover!');

  -- ============================================================
  -- Fly ball to RF, RUNNERS ON 1ST AND 2ND
  -- ============================================================
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Fly ball to RF, runners 1st & 2nd', 'Runners on 1st and 2nd. Ball to right field!', 'RF', '["1B","2B"]', 0, 3, NULL)
  RETURNING id INTO s_12_rf;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s_12_rf, 'RF',  'field_and_throw', 80, 25, 'Field the ball',    'RF',           '2B', 'Throw to cutoff', 'Get the ball in fast! Throw to the cutoff!'),
    (s_12_rf, 'P',   'move_to',         50, 96, 'Back up home',      'backup_home',   NULL, NULL,              'Back up home — runners everywhere!'),
    (s_12_rf, 'C',   'move_to',         50, 90, 'Stay home',         'home',          NULL, NULL,              'Stay home — runner might try to score!'),
    (s_12_rf, '1B',  'move_to',         72, 58, 'Cover 1st base',    '1B',            NULL, NULL,              'Cover 1st base!'),
    (s_12_rf, '2B',  'move_to',         68, 45, 'Cutoff position',   'cutoff_RF',     NULL, NULL,              'You are the cutoff! Line up between RF and 3rd!'),
    (s_12_rf, '3B',  'move_to',         28, 58, 'Cover 3rd base',    '3B',            NULL, NULL,              'Cover 3rd — runner heading your way!'),
    (s_12_rf, 'SS',  'move_to',         50, 38, 'Cover 2nd base',    '2B',            NULL, NULL,              'Cover 2nd base!'),
    (s_12_rf, 'LF',  'move_to',         35, 22, 'Shift to center',   'shift_center',  NULL, NULL,              'Shift toward center to cover!'),
    (s_12_rf, 'LCF', 'move_to',         50, 32, 'Back up 2nd',       'backup_2B',     NULL, NULL,              'Back up 2nd base!'),
    (s_12_rf, 'RCF', 'move_to',         75, 22, 'Back up RF',        'backup_RF',     NULL, NULL,              'Back up the right fielder!');

  -- ============================================================
  -- Ground ball to P, NOBODY ON (so pitcher gets field action)
  -- ============================================================
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, team_id)
  VALUES ('Ground ball to P', 'Nobody on base. Comebacker to the pitcher.', 'P', '[]', 0, 1, NULL)
  RETURNING id INTO s_none_p;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s_none_p, 'P',   'field_and_throw', 50, 62, 'Field the ball',    'P',           '1B', 'Throw to 1st', 'Field the comebacker and throw to 1st for the out!'),
    (s_none_p, 'C',   'move_to',         50, 90, 'Stay home',         'home',         NULL, NULL,           'Stay home and watch the play'),
    (s_none_p, '1B',  'move_to',         72, 58, 'Cover 1st base',    '1B',           NULL, NULL,           'Get on the bag — throw is coming!'),
    (s_none_p, '2B',  'move_to',         50, 38, 'Cover 2nd base',    '2B',           NULL, NULL,           'Cover 2nd base'),
    (s_none_p, '3B',  'move_to',         28, 58, 'Stay on 3rd',       '3B',           NULL, NULL,           'Stay on 3rd and watch the play'),
    (s_none_p, 'SS',  'move_to',         40, 45, 'Cover SS area',     'stay_SS',      NULL, NULL,           'Stay ready in the middle'),
    (s_none_p, 'LF',  'move_to',         22, 52, 'Back up 3rd',       'backup_3B',    NULL, NULL,           'Back up 3rd base area'),
    (s_none_p, 'LCF', 'move_to',         38, 38, 'Back up SS area',   'backup_SS',    NULL, NULL,           'Back up the infield'),
    (s_none_p, 'RCF', 'move_to',         50, 32, 'Back up 2nd',       'backup_2B',    NULL, NULL,           'Back up 2nd base'),
    (s_none_p, 'RF',  'move_to',         78, 52, 'Back up 1st',       'backup_1B',    NULL, NULL,           'Back up 1st base!');

END $$;
