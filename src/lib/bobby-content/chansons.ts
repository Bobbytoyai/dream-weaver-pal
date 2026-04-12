/**
 * Bobby AI — Bibliothèque de chansons
 * Catégories: comptines, éducatif, endormir, réveil, activité
 * Structure prête pour upload audio (Suno, etc.)
 */

export interface Chanson {
  id: string;
  titre: string;
  categorie: ChansonCategorie;
  sousCategorie?: string;
  ageMin: number;
  ageMax: number;
  duree: string; // "2:30"
  paroles?: string;
  audioUrl?: string; // sera rempli après upload
  description: string;
  tags: string[];
}

export type ChansonCategorie = "comptine" | "educatif" | "endormir" | "reveil" | "activite";

export const CHANSON_CATEGORIES: {
  id: ChansonCategorie;
  label: string;
  emoji: string;
  desc: string;
  color: string;
}[] = [
  { id: "comptine", label: "Comptines", emoji: "🎒", desc: "Comptines classiques pour enfants", color: "bg-blue-500/20" },
  { id: "educatif", label: "Éducatif", emoji: "📖", desc: "Apprendre en chantant", color: "bg-emerald-500/20" },
  { id: "endormir", label: "Endormir", emoji: "🌙", desc: "Berceuses et musique douce", color: "bg-indigo-500/20" },
  { id: "reveil", label: "Réveil", emoji: "☀️", desc: "Chansons pour bien commencer", color: "bg-amber-500/20" },
  { id: "activite", label: "Activité", emoji: "🏃", desc: "Bouger et s'amuser", color: "bg-red-500/20" },
];

export const CHANSONS: Chanson[] = [
  // ── COMPTINES ────────────────────────────────────────────
  { id: "c01", titre: "Frère Jacques", categorie: "comptine", ageMin: 3, ageMax: 7, duree: "1:30", description: "La comptine classique à chanter en canon", tags: ["classique", "canon"] },
  { id: "c02", titre: "Au Clair de la Lune", categorie: "comptine", ageMin: 3, ageMax: 8, duree: "2:00", description: "Mon ami Pierrot, prête-moi ta plume…", tags: ["classique", "doux"] },
  { id: "c03", titre: "Une Souris Verte", categorie: "comptine", ageMin: 3, ageMax: 6, duree: "1:15", description: "La souris verte qui courait dans l'herbe", tags: ["animaux", "classique"] },
  { id: "c04", titre: "Alouette", categorie: "comptine", ageMin: 4, ageMax: 8, duree: "2:30", description: "Alouette, gentille alouette…", tags: ["classique", "animaux"] },
  { id: "c05", titre: "Pomme de Reinette", categorie: "comptine", ageMin: 3, ageMax: 6, duree: "1:00", description: "Pomme de reinette et pomme d'api", tags: ["classique", "fruits"] },
  { id: "c06", titre: "Savez-Vous Planter les Choux", categorie: "comptine", ageMin: 3, ageMax: 7, duree: "2:00", description: "À la mode de chez nous", tags: ["classique", "nature"] },
  { id: "c07", titre: "Pirouette Cacahuète", categorie: "comptine", ageMin: 4, ageMax: 8, duree: "2:15", description: "Il était un petit homme…", tags: ["classique", "drôle"] },
  { id: "c08", titre: "Petit Escargot", categorie: "comptine", ageMin: 3, ageMax: 5, duree: "0:45", description: "Porte sur son dos sa maisonnette", tags: ["animaux", "pluie"] },

  // ── ÉDUCATIF ─────────────────────────────────────────────
  { id: "e01", titre: "L'Alphabet en Chanson", categorie: "educatif", sousCategorie: "lettres", ageMin: 4, ageMax: 7, duree: "2:00", description: "Apprendre l'alphabet en musique", tags: ["alphabet", "lettres"] },
  { id: "e02", titre: "Les Chiffres Dansent", categorie: "educatif", sousCategorie: "nombres", ageMin: 4, ageMax: 7, duree: "2:30", description: "Compter de 1 à 20 en s'amusant", tags: ["chiffres", "maths"] },
  { id: "e03", titre: "Les Couleurs Arc-en-Ciel", categorie: "educatif", sousCategorie: "couleurs", ageMin: 3, ageMax: 6, duree: "1:45", description: "Rouge, orange, jaune, vert, bleu…", tags: ["couleurs", "nature"] },
  { id: "e04", titre: "Les Jours de la Semaine", categorie: "educatif", sousCategorie: "temps", ageMin: 5, ageMax: 8, duree: "2:00", description: "Lundi, mardi, mercredi…", tags: ["jours", "temps"] },
  { id: "e05", titre: "Le Corps Humain", categorie: "educatif", sousCategorie: "corps", ageMin: 4, ageMax: 8, duree: "2:15", description: "Tête, épaules, genoux et pieds", tags: ["corps", "santé"] },
  { id: "e06", titre: "Les Saisons", categorie: "educatif", sousCategorie: "nature", ageMin: 5, ageMax: 9, duree: "2:30", description: "Printemps, été, automne, hiver", tags: ["saisons", "nature"] },
  { id: "e07", titre: "Les Animaux de la Ferme", categorie: "educatif", sousCategorie: "animaux", ageMin: 3, ageMax: 6, duree: "2:00", description: "La vache fait meuh, le coq fait cocorico", tags: ["animaux", "ferme"] },

  // ── ENDORMIR ─────────────────────────────────────────────
  { id: "d01", titre: "Berceuse de Bobby", categorie: "endormir", ageMin: 3, ageMax: 8, duree: "3:00", description: "Une douce berceuse pour s'endormir avec Bobby", tags: ["berceuse", "doux"] },
  { id: "d02", titre: "Dodo l'Enfant Do", categorie: "endormir", ageMin: 3, ageMax: 6, duree: "2:30", description: "L'enfant dormira bien vite…", tags: ["classique", "berceuse"] },
  { id: "d03", titre: "Étoiles Brillantes", categorie: "endormir", ageMin: 3, ageMax: 8, duree: "3:30", description: "Musique douce avec sons de la nuit", tags: ["nuit", "étoiles"] },
  { id: "d04", titre: "La Lune te Dit Bonsoir", categorie: "endormir", ageMin: 3, ageMax: 7, duree: "2:45", description: "Ferme les yeux, la lune veille sur toi", tags: ["lune", "nuit"] },
  { id: "d05", titre: "Rêves de Nuages", categorie: "endormir", ageMin: 4, ageMax: 9, duree: "4:00", description: "Musique ambiante et sons de nature", tags: ["rêves", "ambiance"] },

  // ── RÉVEIL ───────────────────────────────────────────────
  { id: "r01", titre: "Bonjour Bobby !", categorie: "reveil", ageMin: 3, ageMax: 8, duree: "2:00", description: "Chanson énergique pour bien se réveiller", tags: ["matin", "énergie"] },
  { id: "r02", titre: "Le Soleil Se Lève", categorie: "reveil", ageMin: 4, ageMax: 9, duree: "2:15", description: "C'est le matin, on se prépare !", tags: ["matin", "soleil"] },
  { id: "r03", titre: "Prêt Pour l'Aventure", categorie: "reveil", ageMin: 5, ageMax: 10, duree: "2:30", description: "Une nouvelle journée commence", tags: ["aventure", "énergie"] },

  // ── ACTIVITÉ ─────────────────────────────────────────────
  { id: "a01", titre: "On Bouge Ensemble", categorie: "activite", sousCategorie: "danse", ageMin: 4, ageMax: 9, duree: "2:30", description: "Chanson pour danser et bouger", tags: ["danse", "sport"] },
  { id: "a02", titre: "La Ronde des Animaux", categorie: "activite", sousCategorie: "danse", ageMin: 3, ageMax: 7, duree: "2:00", description: "Imite les animaux en dansant", tags: ["animaux", "danse"] },
  { id: "a03", titre: "Jacques a Dit", categorie: "activite", sousCategorie: "jeu", ageMin: 4, ageMax: 8, duree: "3:00", description: "Chanson interactive : fais ce que Bobby dit !", tags: ["jeu", "interactif"] },
  { id: "a04", titre: "1, 2, 3, Soleil Musical", categorie: "activite", sousCategorie: "jeu", ageMin: 4, ageMax: 9, duree: "2:45", description: "Le jeu 1-2-3-Soleil en musique", tags: ["jeu", "musique"] },
  { id: "a05", titre: "Le Yoga des Petits", categorie: "activite", sousCategorie: "relaxation", ageMin: 5, ageMax: 10, duree: "4:00", description: "Positions de yoga guidées en musique", tags: ["yoga", "calme"] },
];

/** Filtre les chansons par catégorie et âge */
export function getChansonsByAge(age: number, categorie?: ChansonCategorie): Chanson[] {
  return CHANSONS.filter(c =>
    age >= c.ageMin && age <= c.ageMax &&
    (!categorie || c.categorie === categorie)
  );
}

/** Retourne une chanson aléatoire adaptée */
export function getRandomChanson(age: number, categorie?: ChansonCategorie): Chanson | null {
  const filtered = getChansonsByAge(age, categorie);
  if (!filtered.length) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
