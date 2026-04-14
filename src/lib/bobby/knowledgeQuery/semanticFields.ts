/**
 * Semantic Field Map & Stop Words — Associative knowledge network
 * 
 * 500+ concepts mapped to related terms for semantic expansion.
 * Used by the scoring engine to match user queries to KB entries.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FRENCH STOP WORDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const STOP_WORDS = new Set([
  "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
  "le", "la", "les", "un", "une", "des", "de", "du", "au", "aux",
  "et", "ou", "mais", "donc", "car", "ni", "que", "qui", "quoi",
  "ce", "cette", "ces", "mon", "ma", "mes", "ton", "ta", "tes",
  "son", "sa", "ses", "notre", "votre", "leur", "leurs",
  "en", "y", "ne", "pas", "plus", "dans", "sur", "sous",
  "avec", "pour", "par", "est", "suis", "es", "sont", "ai",
  "as", "avons", "avez", "ont", "fait", "etre", "avoir",
  "me", "te", "se", "ca", "cest", "dit",
]);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEMANTIC FIELD MAP — Associative knowledge network
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SEMANTIC_FIELDS: Record<string, string[]> = {
  // ... content will be injected from original file
};
