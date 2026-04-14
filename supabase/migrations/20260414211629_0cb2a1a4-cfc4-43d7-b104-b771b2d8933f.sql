
-- Désactiver l'ancien pack groupé
UPDATE store_content SET is_active = false WHERE id = '4c800d17-cecf-4fff-9028-fc203461ee6a';

-- Nettoyer installed_content lié à l'ancien pack
DELETE FROM installed_content WHERE content_id = '4c800d17-cecf-4fff-9028-fc203461ee6a';

-- Créer les entrées individuelles
INSERT INTO store_content (name, slug, emoji, description, detailed_description, category, age_min, age_max, tags, size_label, is_new, is_popular, is_featured, is_premium, content_count, rating, rating_count, install_count, languages, version_label, creator_name, creator_role, difficulty_level, duration_estimate, learning_objectives, skills_developed)
VALUES
(
  'Bobby tu es là', 'bobby-tu-es-la', '🧸',
  'La chanson signature de Bobby ! Une berceuse douce et réconfortante pour s''endormir.',
  'Bobby tu es là est LA chanson de Bobby. Douce, apaisante et réconfortante, elle accompagne les enfants au moment du coucher. Pré-installée gratuitement dans le cerveau de Bobby, elle se lance automatiquement quand l''enfant demande une musique pour dormir.',
  'musique', 3, 10,
  ARRAY['berceuse', 'dodo', 'dormir', 'chanson', 'bobby', 'gratuit'],
  '2.5 MB', true, true, true, false, 1, 5.0, 12, 50,
  ARRAY['fr'], '1.0', 'Bobby Studio', 'Musique & Bien-être', 'facile', '3 min',
  ARRAY['Apaisement avant le coucher', 'Routine du dodo', 'Sentiment de sécurité'],
  ARRAY['Relaxation', 'Écoute', 'Gestion des émotions']
),
(
  'La Marseillaise', 'la-marseillaise', '🇫🇷',
  'L''hymne national français ! Pour apprendre la fierté et l''histoire de France.',
  'Découvre l''hymne national de la France. Bobby te raconte l''histoire de La Marseillaise et pourquoi elle est si importante pour les Français. Un moment d''éducation civique adapté aux enfants.',
  'musique', 5, 12,
  ARRAY['hymne', 'france', 'patriotique', 'histoire', 'éducation'],
  '< 1 MB', false, false, false, false, 1, 4.5, 3, 10,
  ARRAY['fr'], '1.0', 'Bobby Studio', 'Éducation Civique', 'moyen', '4 min',
  ARRAY['Connaissance de l''hymne national', 'Culture générale', 'Éducation civique'],
  ARRAY['Culture', 'Mémoire', 'Chant']
),
(
  'Frère Bobby', 'frere-bobby', '🔔',
  'La célèbre comptine revisitée version Bobby ! Frère Bobby, dormez-vous ?',
  'La comptine classique "Frère Jacques" revisitée spécialement pour Bobby ! Chante avec Bobby cette comptine que tous les enfants adorent, dans une version amusante et personnalisée.',
  'musique', 3, 8,
  ARRAY['comptine', 'classique', 'chanson', 'canon', 'traditionnel'],
  '< 1 MB', true, true, false, false, 1, 4.8, 8, 30,
  ARRAY['fr'], '1.0', 'Bobby Studio', 'Comptines & Chansons', 'facile', '2 min',
  ARRAY['Apprentissage d''une comptine classique', 'Chanter en rythme', 'Coordination'],
  ARRAY['Chant', 'Rythme', 'Mémoire']
),
(
  'Au Clair de la Lune', 'au-clair-de-la-lune', '🌙',
  'Berceuse traditionnelle française pour un moment calme et doux.',
  'Au clair de la lune, mon ami Pierrot... La plus célèbre des berceuses françaises, chantée par Bobby pour accompagner les enfants dans un moment de calme et de douceur avant le coucher.',
  'musique', 3, 8,
  ARRAY['berceuse', 'traditionnel', 'dodo', 'calme', 'nuit'],
  '< 1 MB', false, true, false, false, 1, 4.7, 6, 25,
  ARRAY['fr'], '1.0', 'Bobby Studio', 'Berceuses & Douceur', 'facile', '3 min',
  ARRAY['Routine du coucher', 'Apaisement', 'Patrimoine culturel'],
  ARRAY['Relaxation', 'Écoute', 'Culture']
),
(
  'Alouette', 'alouette', '🐦',
  'Comptine entraînante et amusante ! Alouette, gentille alouette...',
  'Alouette, gentille alouette ! Cette comptine populaire est parfaite pour apprendre les parties du corps tout en s''amusant. Bobby la chante avec enthousiasme et invite l''enfant à participer.',
  'musique', 3, 8,
  ARRAY['comptine', 'animaux', 'corps', 'entraînant', 'participatif'],
  '< 1 MB', false, false, false, false, 1, 4.6, 5, 20,
  ARRAY['fr'], '1.0', 'Bobby Studio', 'Comptines & Chansons', 'facile', '2 min',
  ARRAY['Apprentissage des parties du corps', 'Chant participatif', 'Vocabulaire'],
  ARRAY['Vocabulaire', 'Chant', 'Coordination']
),
(
  'Il était un petit navire', 'petit-navire', '⛵',
  'Aventure en mer pour les petits marins ! Une comptine pleine d''imagination.',
  'Embarque avec Bobby pour une aventure en mer ! Cette comptine classique raconte l''histoire d''un petit marin qui n''avait jamais navigué. Parfaite pour stimuler l''imagination et le goût de l''aventure.',
  'musique', 3, 9,
  ARRAY['comptine', 'aventure', 'mer', 'bateau', 'imagination'],
  '< 1 MB', false, false, false, false, 1, 4.5, 4, 15,
  ARRAY['fr'], '1.0', 'Bobby Studio', 'Comptines & Chansons', 'facile', '3 min',
  ARRAY['Imagination', 'Vocabulaire maritime', 'Narration'],
  ARRAY['Imagination', 'Vocabulaire', 'Chant']
),
(
  'À l''école c''est amusant', 'ecole-amusant', '🏫',
  'Comptine joyeuse sur l''école ! Pour aimer apprendre en s''amusant.',
  'Une comptine originale de Bobby qui célèbre l''école et le plaisir d''apprendre ! Parfaite pour motiver les enfants avant la rentrée ou le matin avant d''aller à l''école. Audio MP3 inclus.',
  'musique', 4, 9,
  ARRAY['comptine', 'école', 'apprentissage', 'joyeux', 'audio'],
  '1.5 MB', true, false, false, false, 1, 4.9, 7, 35,
  ARRAY['fr'], '1.0', 'Bobby Studio', 'Comptines & Chansons', 'facile', '2 min',
  ARRAY['Motivation scolaire', 'Plaisir d''apprendre', 'Positivité'],
  ARRAY['Motivation', 'Chant', 'Écoute']
),
(
  'Dort Doucement Ami de Bobby', 'dort-doucement', '💤',
  'Berceuse originale de Bobby pour un dodo tout en douceur.',
  'Dort doucement, ami de Bobby... Une berceuse originale composée spécialement pour Bobby. Douce et apaisante, elle aide les enfants à s''endormir paisiblement. Audio MP3 inclus pour une écoute immédiate.',
  'musique', 3, 8,
  ARRAY['berceuse', 'dodo', 'dormir', 'calme', 'audio', 'nuit'],
  '2 MB', true, true, false, false, 1, 4.8, 9, 40,
  ARRAY['fr'], '1.0', 'Bobby Studio', 'Berceuses & Douceur', 'facile', '3 min',
  ARRAY['Routine du coucher', 'Apaisement', 'Sommeil paisible'],
  ARRAY['Relaxation', 'Écoute', 'Gestion des émotions']
);
