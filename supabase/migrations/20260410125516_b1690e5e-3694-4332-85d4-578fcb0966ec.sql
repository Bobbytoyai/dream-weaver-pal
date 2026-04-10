UPDATE child_memories SET last_story_id = NULL WHERE last_story_id IN (SELECT id FROM story_templates WHERE category = 'Aventure');
DELETE FROM story_templates WHERE category = 'Aventure';