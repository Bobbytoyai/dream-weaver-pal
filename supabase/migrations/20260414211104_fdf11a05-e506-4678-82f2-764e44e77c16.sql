
-- Rename "Frère Jacques" to "Frère Bobby"
UPDATE music_tracks SET title = 'Frère Bobby', artist = 'Bobby Comptines' WHERE id = '711e1121-a905-4c2d-a45e-5206d7debc7d';

-- Add "Bobby tu es là" as a berceuse/comptine for sleeping
INSERT INTO music_tracks (title, artist, category, file_path, sort_order, trigger_phrases, age_min, age_max)
VALUES (
  'Bobby tu es là',
  'Bobby Comptines',
  'berceuse',
  'bobby_tu_est_la.mp3',
  6,
  ARRAY['bobby tu es là', 'bobby tu est la', 'chanson bobby', 'comptine bobby', 'chanson pour dormir', 'berceuse bobby'],
  3, 10
);
