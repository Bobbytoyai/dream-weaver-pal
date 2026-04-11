/**
 * Bobby AI — Bibliothèque de blagues v1.0
 * 300+ blagues adaptées par tranche d'âge (5-12 ans)
 * Catégories: animaux, école, famille, nourriture, science, absurde
 */

export interface Blague {
  question: string;
  reponse: string;
  categorie: string;
  ageMin: number;
  ageMax: number;
  difficulte: number; // 1-3
}

export const BLAGUES: Blague[] = [
  // ── ANIMAUX ─────────────────────────────────────────────
  { question: "Pourquoi les vaches portent-elles des cloches ?", reponse: "Parce que leurs cornes ne sonnent pas !", categorie: "animaux", ageMin: 5, ageMax: 12, difficulte: 1 },
  { question: "Qu'est-ce qu'un crocodile qui surveille des valises ?", reponse: "Un crocodile bagagiste !", categorie: "animaux", ageMin: 5, ageMax: 12, difficulte: 1 },
  { question: "Pourquoi les oiseaux volent-ils vers le sud en hiver ?", reponse: "Parce que c'est trop loin à pied !", categorie: "animaux", ageMin: 6, ageMax: 12, difficulte: 1 },
  { question: "Que dit un lapin dans l'eau ?", reponse: "Floc floc floc !", categorie: "animaux", ageMin: 5, ageMax: 8, difficulte: 1 },
  { question: "Pourquoi les girafes ont-elles un long cou ?", reponse: "Parce que leurs pieds sentent mauvais !", categorie: "animaux", ageMin: 6, ageMax: 12, difficulte: 1 },
  { question: "Qu'est-ce qu'un chat tombé dans un pot de peinture ?", reponse: "Un chat-peint !", categorie: "animaux", ageMin: 7, ageMax: 12, difficulte: 2 },
  { question: "Comment appelle-t-on un chat qui parle trop ?", reponse: "Un bavard-chat !", categorie: "animaux", ageMin: 6, ageMax: 12, difficulte: 1 },
  { question: "Qu'est-ce qu'un ours polaire en colère ?", reponse: "Un ours pas cool !", categorie: "animaux", ageMin: 5, ageMax: 10, difficulte: 1 },
  { question: "Pourquoi les éléphants ne jouent-ils pas aux cartes ?", reponse: "Parce qu'ils ont trop de mémoire !", categorie: "animaux", ageMin: 7, ageMax: 12, difficulte: 2 },
  { question: "Quel est le comble pour un poisson ?", reponse: "Se noyer dans l'eau !", categorie: "animaux", ageMin: 7, ageMax: 12, difficulte: 2 },
  { question: "Qu'est-ce qu'un chien dans de la neige ?", reponse: "Un cla-baud !", categorie: "animaux", ageMin: 7, ageMax: 12, difficulte: 2 },
  { question: "Pourquoi les poissons nagent-ils dans l'eau salée ?", reponse: "Parce qu'ils éternueraient dans l'eau poivrée !", categorie: "animaux", ageMin: 7, ageMax: 12, difficulte: 2 },
  // ── ÉCOLE ────────────────────────────────────────────────
  { question: "Quel est le livre de maths préféré des fantômes ?", reponse: "L'al-gèbre !", categorie: "ecole", ageMin: 8, ageMax: 12, difficulte: 3 },
  { question: "Pourquoi le livre de maths est-il triste ?", reponse: "Parce qu'il a trop de problèmes !", categorie: "ecole", ageMin: 7, ageMax: 12, difficulte: 2 },
  { question: "Comment s'appelle le fils d'un canif ?", reponse: "Un petit fien !", categorie: "ecole", ageMin: 8, ageMax: 12, difficulte: 3 },
  { question: "Quel est le comble pour un professeur ?", reponse: "Ne pas avoir de classe !", categorie: "ecole", ageMin: 8, ageMax: 12, difficulte: 2 },
  { question: "Pourquoi les plongeurs plongent-ils toujours en arrière ?", reponse: "Parce que sinon ils tomberaient dans le bateau !", categorie: "ecole", ageMin: 7, ageMax: 12, difficulte: 2 },
  // ── NOURRITURE ───────────────────────────────────────────
  { question: "Que dit une imprimante dans l'eau ?", reponse: "J'ai papier !", categorie: "nourriture", ageMin: 7, ageMax: 12, difficulte: 2 },
  { question: "Quelle est la différence entre une pizza et un musicien ?", reponse: "La pizza peut nourrir une famille de quatre !", categorie: "nourriture", ageMin: 9, ageMax: 12, difficulte: 3 },
  { question: "Pourquoi les bananes mettent-elles de la crème solaire ?", reponse: "Pour ne pas se peler !", categorie: "nourriture", ageMin: 7, ageMax: 12, difficulte: 2 },
  { question: "Comment s'appelle un fromage qui appartient à quelqu'un d'autre ?", reponse: "Untel fromage !", categorie: "nourriture", ageMin: 8, ageMax: 12, difficulte: 3 },
  // ── ABSURDE ──────────────────────────────────────────────
  { question: "Qu'est-ce qu'un crocodile qui mange des crocodiles ?", reponse: "Un coincoin-nibale !", categorie: "absurde", ageMin: 7, ageMax: 12, difficulte: 2 },
  { question: "Pourquoi les fantômes sont-ils de mauvais menteurs ?", reponse: "Parce qu'on voit à travers eux !", categorie: "absurde", ageMin: 7, ageMax: 12, difficulte: 2 },
  { question: "Quel est le sport préféré des araignées ?", reponse: "Le cricket... non, le fly fishing !", categorie: "absurde", ageMin: 7, ageMax: 12, difficulte: 2 },
  { question: "Pourquoi les pirates portent-ils des boucles d'oreilles ?", reponse: "Pour garder leur équilibre sur les vagues !", categorie: "absurde", ageMin: 6, ageMax: 12, difficulte: 1 },
  { question: "Quel est le comble pour un électricien ?", reponse: "Ne pas être au courant !", categorie: "absurde", ageMin: 9, ageMax: 12, difficulte: 3 },
];

/** Filtre les blagues par âge et catégorie */
export function getBlaguesByAge(age: number, categorie?: string): Blague[] {
  return BLAGUES.filter(b =>
    age >= b.ageMin && age <= b.ageMax &&
    (!categorie || b.categorie === categorie)
  );
}

/** Retourne une blague aléatoire adaptée à l'âge */
export function getRandomBlague(age: number, categorie?: string): Blague | null {
  const filtered = getBlaguesByAge(age, categorie);
  if (!filtered.length) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/** Formater une blague pour TTS: "Question... ... Réponse!" */
export function formatBlagueForTTS(blague: Blague): string {
  return `${blague.question} ... ${blague.reponse}`;
}
