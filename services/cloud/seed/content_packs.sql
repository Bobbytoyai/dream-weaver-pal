-- Bobby Store — pack catalog seed (extrait MVP)
-- Inserts idempotents via ON CONFLICT.

insert into public.content_packs (slug, name, description, age_min, age_max, price_cents, theme, is_free)
values
  ('discovery_animals', 'Découverte des animaux', 'Bobby raconte les animaux du monde', 4, 8, 0, 'discovery', true),
  ('bedtime_stories', 'Histoires du soir', '20 mini-histoires pour s endormir', 3, 9, 499, 'bedtime', false),
  ('riddles_pack', 'Devinettes', 'Devinettes adaptées par âge', 5, 12, 299, 'play', false),
  ('breathing_calm', 'Respiration & calme', 'Co-régulation guidée par Bobby', 4, 12, 0, 'wellbeing', true),
  ('science_kids', 'Mini-sciences', 'La science expliquée simplement', 7, 12, 499, 'learn', false),
  ('emotions_lab', 'Labo des émotions', 'Apprendre à nommer ses émotions', 4, 10, 399, 'wellbeing', false),
  ('multilang_starter', 'Découverte des langues', 'Mots et phrases en EN/ES/IT', 5, 12, 299, 'learn', false),
  ('history_kids', 'L histoire pour les petits', 'Périodes historiques racontées simplement', 7, 12, 499, 'learn', false),
  ('jokes_pack', 'Blagues', 'Le coin des blagues', 5, 12, 199, 'play', false),
  ('imagination_workshop', 'Atelier imagination', 'Inventer des histoires ensemble', 5, 12, 399, 'create', false)
on conflict (slug) do nothing;
