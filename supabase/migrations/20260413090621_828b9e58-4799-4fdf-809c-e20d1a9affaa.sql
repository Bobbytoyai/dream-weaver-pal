
INSERT INTO public.store_content (slug, name, emoji, description, detailed_description, category, age_min, age_max, tags, size_label, is_new, is_popular, is_featured, is_premium, install_count, content_count, content_items, creator_name, creator_role, version_label, changelog, rating, rating_count, learning_objectives, skills_developed, duration_estimate, difficulty_level, languages, is_active)
VALUES
(
  'bobby-english', 'Bobby Bilingue 🇬🇧', '🇬🇧', 
  'Bobby parle anglais ! Vocabulaire, phrases et comptines en anglais.',
  'Ce pack permet à Bobby de converser en anglais avec votre enfant. Il inclut du vocabulaire de base, des phrases du quotidien, des comptines anglaises et des quiz bilingues pour apprendre en s''amusant.',
  'langues', 3, 12,
  ARRAY['anglais', 'english', 'bilingue', 'langue'],
  '2 Mo', true, true, true, false, 342, 25,
  '[{"title":"Vocabulaire de base","emoji":"📖","description":"200+ mots du quotidien traduits et prononcés"},{"title":"Phrases courantes","emoji":"💬","description":"Salutations, politesse, questions en anglais"},{"title":"Comptines anglaises","emoji":"🎵","description":"Nursery rhymes classiques chantées par Bobby"},{"title":"Quiz bilingue","emoji":"🧠","description":"Jeux de traduction français ↔ anglais"}]'::jsonb,
  'Équipe Bobby', 'Éducation & Langues', '1.0', 'Première version du pack anglais',
  4.7, 89,
  ARRAY['Apprendre le vocabulaire anglais de base', 'Comprendre et utiliser des phrases simples', 'Développer l''oreille musicale anglaise'],
  ARRAY['Bilinguisme', 'Vocabulaire', 'Prononciation', 'Écoute'],
  '15-20 min', 'adaptatif', ARRAY['fr', 'en'], true
),
(
  'bobby-espanol', 'Bobby Español 🇪🇸', '🇪🇸',
  'Bobby habla español ! Vocabulaire, phrases et chansons en espagnol.',
  'Ce pack permet à Bobby de converser en espagnol. Vocabulaire thématique (animaux, couleurs, famille), phrases de la vie courante, chansons traditionnelles et quiz interactifs.',
  'langues', 3, 12,
  ARRAY['espagnol', 'español', 'spanish', 'bilingue', 'langue'],
  '2 Mo', true, false, false, false, 0, 22,
  '[{"title":"Vocabulaire thématique","emoji":"📖","description":"Couleurs, animaux, famille, nourriture en espagnol"},{"title":"Phrases du quotidien","emoji":"💬","description":"Hola, gracias, ¿cómo estás? et plus"},{"title":"Chansons espagnoles","emoji":"🎶","description":"Comptines et chansons traditionnelles"},{"title":"Quiz español","emoji":"🎯","description":"Jeux de traduction français ↔ espagnol"}]'::jsonb,
  'Équipe Bobby', 'Éducation & Langues', '1.0', 'Première version du pack espagnol',
  4.5, 12,
  ARRAY['Découvrir le vocabulaire espagnol', 'Apprendre les phrases de politesse', 'Explorer la culture hispanophone'],
  ARRAY['Bilinguisme', 'Vocabulaire', 'Culture', 'Prononciation'],
  '15-20 min', 'adaptatif', ARRAY['fr', 'es'], true
),
(
  'bobby-arabic', 'Bobby عربي 🇸🇦', '🇸🇦',
  'Bobby يتكلم عربي ! Découvre l''alphabet arabe, le vocabulaire et les chansons.',
  'Ce pack initie votre enfant à la langue arabe. Il couvre l''alphabet, les chiffres, le vocabulaire de base, des phrases simples et des comptines arabes traditionnelles.',
  'langues', 3, 12,
  ARRAY['arabe', 'arabic', 'عربي', 'bilingue', 'langue'],
  '2 Mo', true, false, false, false, 0, 20,
  '[{"title":"Alphabet arabe","emoji":"🔤","description":"Les 28 lettres avec prononciation et écriture"},{"title":"Chiffres et couleurs","emoji":"🔢","description":"Compter et nommer les couleurs en arabe"},{"title":"Phrases simples","emoji":"💬","description":"Bonjour, merci, s''il te plaît en arabe"},{"title":"Comptines arabes","emoji":"🎵","description":"Chansons traditionnelles pour enfants"}]'::jsonb,
  'Équipe Bobby', 'Éducation & Langues', '1.0', 'Première version du pack arabe',
  4.6, 8,
  ARRAY['Découvrir l''alphabet arabe', 'Apprendre à compter en arabe', 'S''initier à la prononciation arabe'],
  ARRAY['Bilinguisme', 'Alphabet', 'Culture', 'Écoute'],
  '15-20 min', 'adaptatif', ARRAY['fr', 'ar'], true
),
(
  'bobby-deutsch', 'Bobby Deutsch 🇩🇪', '🇩🇪',
  'Bobby spricht Deutsch ! Vocabulaire, phrases et chansons en allemand.',
  'Ce pack permet à Bobby de converser en allemand. Vocabulaire thématique, phrases courantes, comptines allemandes et quiz interactifs pour une première immersion.',
  'langues', 3, 12,
  ARRAY['allemand', 'deutsch', 'german', 'bilingue', 'langue'],
  '2 Mo', true, false, false, false, 0, 21,
  '[{"title":"Vocabulaire de base","emoji":"📖","description":"Animaux, couleurs, famille, nourriture en allemand"},{"title":"Phrases courantes","emoji":"💬","description":"Hallo, danke, wie geht''s? et expressions utiles"},{"title":"Comptines allemandes","emoji":"🎵","description":"Kinderlieder — chansons pour enfants"},{"title":"Quiz Deutsch","emoji":"🧠","description":"Jeux de traduction français ↔ allemand"}]'::jsonb,
  'Équipe Bobby', 'Éducation & Langues', '1.0', 'Première version du pack allemand',
  4.4, 5,
  ARRAY['Découvrir le vocabulaire allemand', 'Apprendre les salutations en allemand', 'Explorer la culture germanophone'],
  ARRAY['Bilinguisme', 'Vocabulaire', 'Culture', 'Prononciation'],
  '15-20 min', 'adaptatif', ARRAY['fr', 'de'], true
);
