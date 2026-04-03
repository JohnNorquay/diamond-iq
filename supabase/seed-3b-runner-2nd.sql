-- New scenario: Ground ball to 3B, runner on 2nd
-- 3B steps on bag for the force out, then can throw to 1st

DO $$
DECLARE
  s_id UUID;
BEGIN
  INSERT INTO diq_scenarios (name, description, ball_hit_zone, runners_on, outs, difficulty, is_active)
  VALUES ('Ground ball to 3B, runner on 2nd', 'Runner on 2nd. Ground ball to 3B — step on the bag for the force!', '3B', '["2B"]', 0, 2, true)
  RETURNING id INTO s_id;

  INSERT INTO diq_scenario_actions (scenario_id, position_code, action_type, target_x, target_y, target_label, target_zone, throw_to_position, throw_to_label, explanation) VALUES
    (s_id, '3B',  'field_and_throw', 30, 60, 'Field and step on 3rd', '3B',          '3B', 'Step on 3rd!', 'Step on the bag for the force out! The runner from 2nd has to go to 3rd!'),
    (s_id, 'P',   'move_to',         50, 96, 'Back up home',          'backup_home',  NULL, NULL,           'Back up home — runner might try to score on an error!'),
    (s_id, 'C',   'move_to',         50, 90, 'Stay home',             'home',         NULL, NULL,           'Stay home and guard the plate!'),
    (s_id, '1B',  'move_to',         72, 58, 'Cover 1st base',        '1B',           NULL, NULL,           'Cover 1st — there might be a throw after the force!'),
    (s_id, '2B',  'move_to',         50, 38, 'Cover 2nd base',        '2B',           NULL, NULL,           'Cover 2nd base!'),
    (s_id, 'SS',  'move_to',         28, 58, 'Cover 3rd base',        '3B',           NULL, NULL,           'Cover 3rd after the 3rd baseman fields it!'),
    (s_id, 'LF',  'move_to',         18, 50, 'Back up 3rd',           'backup_3B',    NULL, NULL,           'Back up 3rd base!'),
    (s_id, 'LCF', 'move_to',         35, 35, 'Back up SS area',       'backup_SS',    NULL, NULL,           'Back up the infield!'),
    (s_id, 'RCF', 'move_to',         50, 28, 'Back up 2nd',           'backup_2B',    NULL, NULL,           'Back up 2nd base!'),
    (s_id, 'RF',  'move_to',         82, 50, 'Back up 1st',           'backup_1B',    NULL, NULL,           'Back up 1st base!');
END $$;
