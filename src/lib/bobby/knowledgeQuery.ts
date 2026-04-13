/**
 * Knowledge Base Query v2 — Semantic-aware scoring engine
 * 
 * Improvements over v1:
 * - French stemming for morphological tolerance (nuages→nuage, oiseaux→oiseau)
 * - Semantic field expansion (nuage→ciel,météo,pluie / oiseau→animal,voler,nid)
 * - N-gram substring matching for compound words
 * - Conversational context: recent topics boost related KB entries
 * - Weighted scoring: keyword overlap + question similarity + semantic bonus
 */

import { supabase } from "@/integrations/supabase/client";
import { getCachedPack } from "./contentInstaller";
import type { BobbyBrainReply } from "./types";
import type { FaceState } from "@/components/hologram/useFaceAnimation";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FRENCH STOP WORDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STOP_WORDS = new Set([
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

const SEMANTIC_FIELDS: Record<string, string[]> = {
  // Nature & Météo
  nuage:   ["ciel", "pluie", "meteo", "soleil", "vent", "orage", "eau", "arc-en-ciel"],
  pluie:   ["nuage", "eau", "meteo", "parapluie", "orage", "goutte"],
  soleil:  ["ciel", "chaud", "ete", "lumiere", "etoile", "jour", "meteo"],
  vent:    ["air", "meteo", "tempete", "souffler", "nuage"],
  orage:   ["tonnerre", "eclair", "pluie", "peur", "nuage"],
  neige:   ["froid", "hiver", "blanc", "glace", "bonhomme"],
  // Animaux
  oiseau:  ["voler", "nid", "plume", "ciel", "chanter", "bec", "aile", "animal"],
  chat:    ["miaou", "ronronner", "griffe", "animal", "mignon", "poil", "chaton"],
  chien:   ["aboyer", "animal", "queue", "patte", "chiot", "fidele"],
  poisson: ["eau", "mer", "nager", "ocean", "aquarium", "animal"],
  papillon:["fleur", "voler", "aile", "jardin", "couleur", "insecte"],
  dinosaure:["prehistoire", "fossile", "grand", "disparu", "jurassique"],
  lion:    ["roi", "savane", "afrique", "rugir", "animal", "felin"],
  // Espace
  etoile:  ["ciel", "nuit", "briller", "espace", "constellation", "lumiere"],
  lune:    ["nuit", "ciel", "espace", "cratere", "astronaute"],
  planete: ["espace", "terre", "mars", "jupiter", "soleil", "systeme solaire"],
  fusee:   ["espace", "astronaute", "voler", "ciel", "lune"],
  // Corps & Santé
  coeur:   ["amour", "battre", "sang", "organe", "corps"],
  cerveau: ["penser", "intelligent", "tete", "memoire", "corps"],
  os:      ["squelette", "corps", "dur", "calcium"],
  // Alimentation
  pomme:   ["fruit", "manger", "arbre", "rouge", "vert", "jus"],
  eau:     ["boire", "soif", "riviere", "mer", "ocean", "pluie", "liquide"],
  chocolat:["cacao", "sucre", "bonbon", "gourmand", "dessert"],
  // École & Apprentissage
  ecole:   ["classe", "maitresse", "apprendre", "copain", "recreation", "lecon"],
  livre:   ["lire", "histoire", "page", "bibliotheque", "mot"],
  chiffre: ["nombre", "compter", "mathematique", "calcul"],
  lettre:  ["alphabet", "ecrire", "mot", "lire"],
  // Famille
  maman:   ["famille", "amour", "maison", "parent", "calin"],
  papa:    ["famille", "amour", "maison", "parent"],
  frere:   ["famille", "soeur", "jouer", "partager"],
  bebe:    ["petit", "famille", "naitre", "pleurer", "biberon"],
  // Émotions
  peur:    ["effraye", "monstre", "noir", "cauchemar", "nuit", "angoisse"],
  triste:  ["pleurer", "chagrin", "larme", "malheureux"],
  content: ["heureux", "joie", "sourire", "rire"],
  colere:  ["enerve", "fache", "crier", "rage"],
  // Transport
  voiture: ["rouler", "route", "volant", "voyage", "transport"],
  avion:   ["voler", "ciel", "voyage", "aeroport", "pilote"],
  train:   ["rail", "gare", "voyage", "rapide", "wagon"],
  bateau:  ["mer", "eau", "naviguer", "pirate", "ile"],
  // Couleurs
  rouge:   ["couleur", "sang", "tomate", "fraise", "feu"],
  bleu:    ["couleur", "ciel", "mer", "ocean"],
  vert:    ["couleur", "herbe", "nature", "arbre", "feuille"],
  // Langues
  anglais: ["langue", "hello", "english", "mot", "apprendre", "traduction", "bilingue"],
  espagnol:["langue", "hola", "spanish", "mot", "apprendre", "traduction", "bilingue"],
  italien: ["langue", "ciao", "italian", "mot", "apprendre", "traduction", "bilingue"],
  chinois: ["langue", "nihao", "mandarin", "mot", "apprendre", "traduction", "caractere", "pinyin"],
  arabe:   ["langue", "marhaba", "mot", "apprendre", "traduction", "calligraphie"],
  allemand:["langue", "hallo", "german", "mot", "apprendre", "traduction", "bilingue"],
  portugais:["langue", "ola", "bresil", "mot", "apprendre", "traduction", "bilingue"],
  japonais:["langue", "konnichiwa", "mot", "apprendre", "traduction", "manga", "anime"],
  // 🎵 Musique
  musique: ["chanson", "chanter", "melodie", "note", "instrument", "rythme", "son", "orchestre", "concert", "artiste", "clip"],
  chanson: ["musique", "chanter", "parole", "refrain", "melodie", "comptine", "berceuse"],
  chanter: ["musique", "chanson", "voix", "melodie", "chorale", "micro"],
  piano:   ["musique", "instrument", "touche", "melodie", "jouer", "clavier", "classique"],
  guitare: ["musique", "instrument", "corde", "jouer", "rock", "acoustique"],
  batterie:["musique", "instrument", "rythme", "frapper", "percussion", "tambour"],
  violon:  ["musique", "instrument", "corde", "archet", "classique", "orchestre"],
  flute:   ["musique", "instrument", "souffler", "vent", "melodie"],
  tambour: ["musique", "instrument", "rythme", "frapper", "batterie", "percussion"],
  orchestre:["musique", "instrument", "concert", "chef", "symphonie", "classique"],
  rap:     ["musique", "rythme", "parole", "chanter", "artiste", "hip-hop"],
  rock:    ["musique", "guitare", "batterie", "concert", "groupe", "energie"],
  comptine:["musique", "chanson", "enfant", "chanter", "berceuse", "ronde"],
  note:    ["musique", "melodie", "do", "re", "mi", "gamme", "partition"],
  micro:   ["chanter", "voix", "son", "enregistrer", "musique", "parler"],
  danse:   ["musique", "bouger", "rythme", "ballet", "danser", "mouvement", "chorégraphie"],
  danser:  ["danse", "musique", "bouger", "rythme", "fete"],
  // ⚽ Sport
  sport:   ["jouer", "equipe", "match", "gagner", "entrainement", "champion", "competition", "athlete", "effort", "bouger"],
  football:["sport", "ballon", "but", "equipe", "match", "gardien", "tirer", "pied", "stade", "coupe"],
  basket:  ["sport", "ballon", "panier", "equipe", "dribbler", "lancer", "terrain", "nba"],
  tennis:  ["sport", "raquette", "balle", "filet", "match", "servir", "court"],
  natation:["sport", "nager", "eau", "piscine", "crawl", "plonger", "brasse"],
  nager:   ["natation", "eau", "piscine", "mer", "sport", "plonger"],
  rugby:   ["sport", "ballon", "ovale", "equipe", "essai", "plaquage", "match"],
  velo:    ["sport", "pedaler", "roue", "course", "cyclisme", "tour", "casque"],
  courir:  ["sport", "course", "vitesse", "marathon", "athlete", "jambe", "endurance"],
  judo:    ["sport", "combat", "ceinture", "tatami", "martial", "kimono"],
  karate:  ["sport", "combat", "ceinture", "martial", "coup", "kata"],
  gym:     ["sport", "gymnastique", "souplesse", "poutre", "salto", "acrobatie"],
  skier:   ["sport", "neige", "montagne", "piste", "hiver", "ski"],
  escalade:["sport", "grimper", "mur", "montagne", "corde", "hauteur"],
  equitation:["sport", "cheval", "galop", "cavalier", "selle", "poney"],
  match:   ["sport", "equipe", "gagner", "perdre", "jouer", "competition", "score"],
  champion:["sport", "gagner", "medaille", "premier", "victoire", "record", "trophee"],
  olympique:["sport", "jeux", "medaille", "champion", "monde", "athlete", "competition"],
  ballon:  ["sport", "football", "basket", "jouer", "rond", "lancer", "tirer"],
  // 💻 Technologie
  technologie:["ordinateur", "internet", "robot", "invention", "science", "numerique", "ecran", "innovation"],
  ordinateur: ["technologie", "ecran", "clavier", "souris", "programme", "internet", "jeu video", "code"],
  robot:      ["technologie", "machine", "intelligence", "construire", "programmer", "automatique", "futur"],
  internet:   ["technologie", "ordinateur", "site", "rechercher", "wifi", "reseau", "naviguer", "web"],
  telephone:  ["technologie", "appeler", "ecran", "tactile", "message", "application", "portable"],
  tablette:   ["technologie", "ecran", "tactile", "application", "jouer", "dessiner", "video"],
  "jeu video":  ["technologie", "jouer", "manette", "ecran", "personnage", "niveau", "console"],
  console:    ["jeu video", "jouer", "manette", "ecran", "mario", "minecraft"],
  code:       ["technologie", "programmer", "ordinateur", "logique", "algorithme", "informatique"],
  programmer: ["code", "technologie", "ordinateur", "logique", "robot", "application", "creer"],
  application:["technologie", "telephone", "tablette", "telecharger", "utiliser", "ecran"],
  intelligence:["cerveau", "robot", "penser", "apprendre", "artificielle", "technologie", "futur"],
  wifi:       ["internet", "reseau", "technologie", "connecter", "ondes", "sans fil"],
  imprimante: ["technologie", "papier", "imprimer", "encre", "3d", "machine"],
  camera:     ["technologie", "photo", "filmer", "video", "image", "objectif"],
  ecran:      ["technologie", "regarder", "ordinateur", "telephone", "tablette", "television"],
  "invention tech":["technologie", "creer", "inventer", "nouveau", "science", "decouverte", "genie"],
  // 🚀 Espace (enrichi)
  espace:     ["galaxie", "univers", "etoile", "planete", "fusee", "astronaute", "cosmos", "infini", "satellite", "station spatiale"],
  astronaute: ["espace", "fusee", "lune", "mars", "combinaison", "flotter", "station spatiale", "thomas pesquet"],
  galaxie:    ["espace", "etoile", "voie lactee", "univers", "milliard", "lumiere", "nebuleuse"],
  univers:    ["espace", "galaxie", "infini", "big bang", "creation", "immense", "tout"],
  mars:       ["planete", "espace", "rouge", "robot", "vie", "exploration", "curiosity"],
  jupiter:    ["planete", "espace", "geante", "gazeuse", "tache rouge", "lune", "enorme"],
  saturne:    ["planete", "espace", "anneau", "gazeuse", "magnifique", "titan"],
  venus:      ["planete", "espace", "chaud", "brillante", "etoile du berger", "voisine"],
  mercure:    ["planete", "espace", "petit", "soleil", "proche", "rapide"],
  neptune:    ["planete", "espace", "bleu", "froid", "lointain", "glace"],
  uranus:     ["planete", "espace", "penche", "froid", "glace", "anneau"],
  terre:      ["planete", "maison", "bleu", "vie", "ocean", "continent", "atmosphere"],
  satellite:  ["espace", "orbite", "tourner", "communication", "terre", "lune"],
  comete:     ["espace", "glace", "queue", "etoile filante", "orbite", "brillante"],
  "trou noir":  ["espace", "gravite", "lumiere", "mystere", "puissant", "galaxie"],
  nebuleuse:  ["espace", "gaz", "etoile", "couleur", "galaxie", "naissance"],
  constellation:["etoile", "ciel", "nuit", "dessin", "zodiaque", "grande ourse"],
  telescope:  ["espace", "observer", "etoile", "lentille", "astronomie", "voir loin"],
  meteorite:  ["espace", "roche", "tomber", "cratere", "dinosaure", "terre"],
  apesanteur: ["espace", "flotter", "astronaute", "gravite", "station spatiale"],
  cosmonaute: ["astronaute", "espace", "russie", "fusee", "voyage"],
  // 📜 Histoire
  histoire:   ["passe", "ancien", "epoque", "roi", "reine", "guerre", "decouverte", "civilisation", "chronologie"],
  prehistoire:["dinosaure", "homme", "grotte", "feu", "outil", "mammouth", "peinture rupestre", "caverne"],
  egypte:     ["pharaon", "pyramide", "momie", "nil", "hieroglyphe", "sphinx", "antique", "histoire"],
  pharaon:    ["egypte", "roi", "pyramide", "or", "sarcophage", "puissant", "histoire"],
  pyramide:   ["egypte", "pharaon", "construction", "pierre", "ancien", "merveille", "triangle"],
  momie:      ["egypte", "bandelette", "sarcophage", "mort", "conservation", "pharaon"],
  chevalier:  ["moyen age", "armure", "epee", "chateau", "bouclier", "combat", "noble", "histoire"],
  chateau:    ["moyen age", "roi", "reine", "tour", "muraille", "fort", "histoire", "prince"],
  roi:        ["reine", "couronne", "royaume", "trone", "pouvoir", "chateau", "histoire"],
  reine:      ["roi", "couronne", "royaume", "trone", "pouvoir", "chateau", "histoire"],
  pirate:     ["bateau", "tresor", "mer", "ile", "drapeau", "aventure", "histoire"],
  viking:     ["bateau", "guerrier", "scandinavie", "exploration", "casque", "histoire"],
  romain:     ["rome", "gladiateur", "empire", "colisee", "centurion", "antique", "histoire"],
  gladiateur: ["romain", "combat", "arene", "colisee", "epee", "guerrier"],
  grece:      ["athenes", "zeus", "olympe", "philosophie", "democratie", "antique", "histoire"],
  revolution: ["france", "liberte", "peuple", "changement", "bastille", "republique", "histoire"],
  napoleon:   ["france", "empereur", "guerre", "bataille", "strategie", "histoire"],
  "moyen age":  ["chevalier", "chateau", "roi", "cathedrale", "feodal", "dragon", "histoire"],
  renaissance:["art", "leonard", "vinci", "invention", "culture", "italie", "histoire"],
  guerre:     ["bataille", "soldat", "paix", "armee", "conflit", "victoire", "histoire"],
  invention:  ["decouverte", "creer", "nouveau", "genie", "science", "technologie", "histoire"],
  decouverte: ["explorer", "nouveau", "science", "terre", "amerique", "christophe colomb", "histoire"],
  civilisation:["peuple", "culture", "societe", "construire", "evoluer", "ville", "histoire"],
  // 🌍 Géographie (enrichi)
  montagne:   ["sommet", "escalader", "neige", "altitude", "everest", "alpes", "nature"],
  volcan:     ["lave", "eruption", "feu", "montagne", "cratere", "magma", "danger"],
  ocean:      ["mer", "eau", "profond", "baleine", "vague", "bleu", "sel", "immense"],
  desert:     ["sable", "chaud", "sec", "dune", "oasis", "chameau", "sahara"],
  foret:      ["arbre", "nature", "animal", "vert", "bois", "jungle", "amazonie"],
  ile:        ["mer", "eau", "plage", "palmier", "tresor", "pirate", "isolee"],
  riviere:    ["eau", "couler", "poisson", "pont", "fleuve", "nature"],
  // 🎨 Art (enrichi)
  art:        ["dessiner", "peindre", "sculpture", "musee", "artiste", "creer", "couleur", "tableau"],
  dessiner:   ["crayon", "papier", "art", "couleur", "forme", "creatif", "image"],
  peindre:    ["pinceau", "couleur", "art", "tableau", "toile", "aquarelle", "artiste"],
  sculpture:  ["art", "forme", "pierre", "argile", "statue", "creer", "3d"],
  musee:      ["art", "tableau", "sculpture", "visite", "culture", "exposition", "histoire"],
  // 🎬 Cinéma & Média
  film:       ["cinema", "regarder", "acteur", "histoire", "ecran", "dessin anime"],
  "dessin anime":["regarder", "personnage", "aventure", "television", "manga", "animation"],
  cinema:     ["film", "ecran", "popcorn", "salle", "regarder", "acteur"],
  // 🍳 Cuisine (enrichi)
  cuisine:    ["manger", "recette", "preparer", "ingredient", "plat", "chef", "gourmand"],
  gateau:     ["cuisine", "sucre", "four", "anniversaire", "chocolat", "dessert", "patisserie"],
  soupe:      ["cuisine", "legume", "chaud", "manger", "cuillere", "bol"],
  pizza:      ["cuisine", "italie", "fromage", "tomate", "four", "manger"],
  crepe:      ["cuisine", "france", "sucre", "chandeleur", "poele", "dessert"],
  // 🌱 Nature (enrichi)
  nature:     ["arbre", "fleur", "animal", "foret", "riviere", "montagne", "vert", "ecologie"],
  arbre:      ["nature", "feuille", "racine", "tronc", "foret", "ombre", "bois", "fruit"],
  fleur:      ["nature", "petale", "parfum", "jardin", "abeille", "couleur", "rose", "pollen"],
  jardin:     ["nature", "fleur", "planter", "arroser", "legume", "terre", "herbe"],
  saison:     ["printemps", "ete", "automne", "hiver", "temps", "nature", "annee"],
  printemps:  ["saison", "fleur", "chaud", "oiseau", "nature", "renaitre"],
  ete:        ["saison", "chaud", "soleil", "vacances", "plage", "glace"],
  automne:    ["saison", "feuille", "orange", "pluie", "champignon", "vent"],
  hiver:      ["saison", "froid", "neige", "noel", "ski", "bonhomme"],
  // 🔬 Science (enrichi)
  science:    ["experience", "decouverte", "laboratoire", "chercheur", "observer", "hypothese", "nature"],
  experience: ["science", "tester", "resultat", "laboratoire", "melanger", "observer"],
  atome:      ["science", "petit", "molecule", "matiere", "electron", "proton"],
  electricite:["science", "courant", "ampoule", "energie", "pile", "eclair", "lumiere"],
  aimant:     ["science", "magnetique", "attirer", "metal", "fer", "pole", "force"],
  gravite:    ["science", "tomber", "terre", "poids", "newton", "pomme", "force"],
  lumiere:    ["science", "soleil", "voir", "couleur", "arc-en-ciel", "vitesse", "photon"],
  son:        ["science", "bruit", "onde", "oreille", "vibration", "musique", "entendre"],
  temperature:["science", "chaud", "froid", "thermometre", "degre", "meteo"],
  fossile:    ["science", "prehistoire", "dinosaure", "roche", "ancien", "squelette"],
  microscope: ["science", "petit", "observer", "lentille", "cellule", "laboratoire"],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEXT PROCESSING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalize(text: string): string {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Simple French stemmer — strips common suffixes */
function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("eaux")) return word.slice(0, -4) + "eau";
  if (word.endsWith("aux")) return word.slice(0, -3) + "al";
  if (word.endsWith("ement")) return word.slice(0, -5);
  if (word.endsWith("ment")) return word.slice(0, -4);
  if (word.endsWith("tion")) return word.slice(0, -4);
  if (word.endsWith("sion")) return word.slice(0, -4);
  if (word.endsWith("eur")) return word.slice(0, -3);
  if (word.endsWith("euse")) return word.slice(0, -4);
  if (word.endsWith("eux")) return word.slice(0, -3);
  if (word.endsWith("ais")) return word.slice(0, -3);
  if (word.endsWith("ait")) return word.slice(0, -3);
  if (word.endsWith("ent")) return word.slice(0, -3);
  if (word.endsWith("er")) return word.slice(0, -2);
  if (word.endsWith("ir")) return word.slice(0, -2);
  if (word.endsWith("re")) return word.slice(0, -2);
  if (word.endsWith("es")) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONVERSATIONAL CONTEXT — Remember recent topics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const recentTopics: string[] = [];
const MAX_CONTEXT = 15;

export function pushConversationContext(userText: string) {
  const tokens = tokenize(userText);
  for (const t of tokens) {
    if (!recentTopics.includes(t)) {
      recentTopics.push(t);
      if (recentTopics.length > MAX_CONTEXT) recentTopics.shift();
    }
  }
}

export function clearConversationContext() {
  recentTopics.length = 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCORING ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Expand input tokens with semantic associations */
function expandWithSemantics(tokens: string[]): Set<string> {
  const expanded = new Set(tokens);
  for (const t of tokens) {
    const stemmed = stem(t);
    // Check semantic fields for the token and its stem
    for (const [key, related] of Object.entries(SEMANTIC_FIELDS)) {
      if (key === t || key === stemmed || t.includes(key) || key.includes(t.length >= 4 ? t : "__")) {
        for (const r of related) expanded.add(r);
      }
    }
  }
  return expanded;
}

/** Check if two words are fuzzy-equal (stem match, substring, or edit-close) */
function fuzzyMatch(a: string, b: string): number {
  if (a === b) return 1.0;
  const sa = stem(a), sb = stem(b);
  if (sa === sb) return 0.9;
  // Substring containment (for compound words)
  if (a.length >= 4 && b.includes(a)) return 0.8;
  if (b.length >= 4 && a.includes(b)) return 0.8;
  // Prefix match (at least 4 chars shared)
  const minLen = Math.min(a.length, b.length);
  if (minLen >= 4) {
    let shared = 0;
    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) shared++; else break;
    }
    if (shared >= 4) return 0.6 + (shared / minLen) * 0.2;
  }
  return 0;
}

/** Score input against a KB entry's keywords with semantic + fuzzy tolerance */
function scoreKeywords(inputTokens: string[], expandedInput: Set<string>, keywords: string[]): number {
  const normalizedKw = keywords.map(k => normalize(k)).filter(k => k.length >= 2);
  if (normalizedKw.length === 0) return 0;
  
  let totalWeight = 0;
  let matchWeight = 0;

  for (const kw of normalizedKw) {
    totalWeight += 1;
    let bestFuzzy = 0;

    // Direct/fuzzy match against input tokens
    for (const tok of inputTokens) {
      const f = fuzzyMatch(tok, kw);
      if (f > bestFuzzy) bestFuzzy = f;
    }

    // Check semantic expansion
    if (bestFuzzy < 0.5 && expandedInput.has(kw)) {
      bestFuzzy = Math.max(bestFuzzy, 0.5);
    }

    // Check conversational context
    if (bestFuzzy < 0.3) {
      for (const ctx of recentTopics) {
        const f = fuzzyMatch(ctx, kw);
        if (f > 0.5) { bestFuzzy = Math.max(bestFuzzy, f * 0.4); break; }
      }
    }

    matchWeight += bestFuzzy;
  }

  return matchWeight / totalWeight;
}

/** Score input against the KB entry's question text (shared words with fuzzy) */
function scoreQuestion(inputTokens: string[], question: string): number {
  const qTokens = tokenize(question);
  if (inputTokens.length === 0 || qTokens.length === 0) return 0;

  let shared = 0;
  for (const iw of inputTokens) {
    for (const qw of qTokens) {
      if (fuzzyMatch(iw, qw) >= 0.6) {
        shared++;
        break;
      }
    }
  }

  // Also check reverse: how many question words are in input
  let reverseShared = 0;
  for (const qw of qTokens) {
    for (const iw of inputTokens) {
      if (fuzzyMatch(qw, iw) >= 0.6) {
        reverseShared++;
        break;
      }
    }
  }

  // Bi-directional Jaccard for balanced scoring
  const fwd = shared / Math.max(inputTokens.length, 1);
  const rev = reverseShared / Math.max(qTokens.length, 1);
  return (fwd + rev) / 2;
}

/** Full-text containment: does the raw input contain the full question or vice versa? */
function scoreFullContainment(inputNorm: string, questionNorm: string): number {
  if (inputNorm.includes(questionNorm) && questionNorm.length >= 8) return 0.95;
  if (questionNorm.includes(inputNorm) && inputNorm.length >= 8) return 0.85;
  return 0;
}

/** Contextual bonus: if recent conversation topics overlap with KB keywords */
function contextBonus(keywords: string[]): number {
  if (recentTopics.length === 0) return 0;
  const normalizedKw = keywords.map(k => normalize(k));
  let hits = 0;
  for (const ctx of recentTopics) {
    if (normalizedKw.some(kw => fuzzyMatch(ctx, kw) >= 0.6)) hits++;
  }
  return Math.min(0.15, hits * 0.05);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN QUERY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function queryKnowledgeBase(
  userText: string,
  childAge: number
): Promise<BobbyBrainReply | null> {
  if (!userText || userText.length < 2) return null;

  // Push user message into conversational context
  pushConversationContext(userText);

  try {
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("id, question, answer, keywords, emotion, priority, source_content_id")
      .eq("is_active", true)
      .lte("age_min", childAge)
      .gte("age_max", childAge)
      .order("priority", { ascending: false })
      .limit(300);

    if (error || !data?.length) return null;

    const inputTokens = tokenize(userText);
    if (inputTokens.length === 0) return null;
    
    const expandedInput = expandWithSemantics(inputTokens);
    const inputNorm = normalize(userText);

    let bestMatch: typeof data[0] | null = null;
    let bestScore = 0;

    for (const entry of data) {
      const kwScore = scoreKeywords(inputTokens, expandedInput, entry.keywords || []);
      const qScore = scoreQuestion(inputTokens, entry.question);
      const containment = scoreFullContainment(inputNorm, normalize(entry.question));
      const ctxBonus = contextBonus(entry.keywords || []);
      
      // Composite: best of (keyword, question, containment) + context bonus
      const rawScore = Math.max(kwScore, qScore, containment) + ctxBonus;
      
      // Priority scaling (P5=0.65x, P8=0.85x, P10=1.0x)
      const priorityFactor = 0.5 + ((entry.priority || 5) / 10) * 0.5;
      const finalScore = rawScore * priorityFactor;

      if (finalScore > bestScore && finalScore >= 0.12) {
        bestScore = finalScore;
        bestMatch = entry;
      }
    }

    if (!bestMatch) return null;

    // Increment usage (fire & forget)
    Promise.resolve(supabase.rpc("increment_kb_usage", { entry_id: bestMatch.id })).catch(() => {});

    console.log(`[KnowledgeQuery] ✅ Match (score ${bestScore.toFixed(3)}): "${bestMatch.question.slice(0, 60)}" → "${bestMatch.answer.slice(0, 60)}" ${bestMatch.source_content_id ? "[Store]" : "[learned]"}`);

    return {
      text: bestMatch.answer,
      intent: "EDUCATION",
      source: bestMatch.source_content_id ? "library" : "local_brain",
      emotion: (bestMatch.emotion || "happy") as FaceState,
      confidence: Math.min(0.97, 0.55 + bestScore * 0.45),
      isOffline: false,
    };

  } catch (e) {
    console.warn("[KnowledgeQuery] Query failed:", e);
    return null;
  }
}
