/**
 * Bobby AI — Bibliothèque centrale v1.0
 * Point d'entrée unique pour tout le contenu Bobby
 * Gestion: histoires, blagues, contenu éducatif par âge
 */

import { HISTOIRES, getHistoiresByAge, getRandomHistoire } from "./histoires";
import { BLAGUES, type Blague } from "./blagues";
import { CONTENU_CATEGORIES } from "./contenu";

export { HISTOIRES, getHistoiresByAge, getRandomHistoire };
export { BLAGUES };
export { CONTENU_CATEGORIES };

// ─── BLAGUES PAR ÂGE ────────────────────────────────────────
export function getBlaguesByAge(age: number, categorie?: string): Blague[] {
  return BLAGUES.filter(b =>
    age >= b.ageMin && age <= b.ageMax &&
    (!categorie || b.categorie === categorie)
  );
}

export function getRandomBlague(age: number, categorie?: string): Blague | null {
  const filtered = getBlaguesByAge(age, categorie);
  if (!filtered.length) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ─── STATISTIQUES BIBLIOTHÈQUE ───────────────────────────────
export function getBibliothequeStats() {
  return {
    totalHistoires: HISTOIRES.length,
    totalBlagues: BLAGUES.length,
    totalCategories: CONTENU_CATEGORIES.length,
    themes: [...new Set(HISTOIRES.map(h => h.theme))],
    categoriesBlagues: [...new Set(BLAGUES.map(b => b.categorie))],
  };
}
