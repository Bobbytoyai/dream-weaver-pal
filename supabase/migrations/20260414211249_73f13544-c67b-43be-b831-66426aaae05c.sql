
UPDATE music_tracks 
SET trigger_phrases = ARRAY[
  'bobby tu es là', 'bobby tu est la', 'bobby tu es la',
  'chanson bobby', 'comptine bobby', 'berceuse bobby',
  'chanson pour dormir', 'musique pour dormir', 'berceuse pour dormir',
  'je veux dormir', 'je veux faire dodo', 'dodo', 'faire dodo',
  'chanson dodo', 'musique dodo', 'berceuse dodo',
  'chante moi une chanson', 'chante une chanson',
  'joue une comptine', 'mets une comptine', 'une comptine',
  'joue une berceuse', 'mets une berceuse', 'une berceuse',
  'joue une musique', 'mets une musique', 'une musique',
  'chante pour moi', 'bobby chante', 'tu peux chanter',
  'musique pour enfant', 'chanson pour enfant',
  'je veux écouter une chanson', 'je veux écouter de la musique',
  'joue de la musique', 'mets de la musique',
  'musique s il te plait', 'une chanson s il te plait',
  'bobby tu est là', 'bobby es tu la', 'bobby est la'
],
sort_order = 0
WHERE id = '389c5718-a5fc-4052-8138-35181de5b88e';
