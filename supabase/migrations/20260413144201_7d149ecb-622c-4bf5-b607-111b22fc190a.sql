-- 1. Supprimer les doublons (garder l'entrée la plus ancienne par question)
DELETE FROM knowledge_base
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY question ORDER BY created_at ASC, id::text ASC) as rn
    FROM knowledge_base
    WHERE is_active = true
  ) sub
  WHERE rn > 1
);

-- 2. Fusionner les catégories en doublon
UPDATE knowledge_base SET category = 'émotions' WHERE category = 'emotions';
UPDATE knowledge_base SET category = 'sécurité' WHERE category = 'securite';
UPDATE knowledge_base SET category = 'comprehension_enfantine' WHERE category = 'compréhension_enfantine';
UPDATE knowledge_base SET category = 'sciences' WHERE category = 'science';
UPDATE knowledge_base SET category = 'art' WHERE category = 'arts';

-- 3. Désactiver les entrées sans keywords
UPDATE knowledge_base SET is_active = false WHERE keywords IS NULL OR array_length(keywords, 1) IS NULL OR array_length(keywords, 1) = 0;