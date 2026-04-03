-- Seed Janesville Jays team and roster
DO $$
DECLARE
  team_uuid UUID;
BEGIN
  INSERT INTO diq_teams (name, age_group, color_primary, color_secondary, coach_name, coach_pin)
  VALUES ('Janesville Jays', '7U', '#1e40af', '#ffffff', 'Coach Norquay', '1234')
  RETURNING id INTO team_uuid;

  INSERT INTO diq_players (team_id, name, avatar_emoji, is_active) VALUES
    (team_uuid, 'Kaiser',  '⚾', TRUE),
    (team_uuid, 'Westin',  '⚾', TRUE),
    (team_uuid, 'Myles',   '⚾', TRUE),
    (team_uuid, 'Landon',  '⚾', TRUE),
    (team_uuid, 'Riley',   '⚾', TRUE),
    (team_uuid, 'Jordan',  '⚾', TRUE),
    (team_uuid, 'Austin',  '⚾', TRUE),
    (team_uuid, 'William', '⚾', TRUE),
    (team_uuid, 'Sawyer',  '⚾', TRUE),
    (team_uuid, 'Stone',   '⚾', TRUE),
    (team_uuid, 'Garrett', '⚾', TRUE);
END $$;
