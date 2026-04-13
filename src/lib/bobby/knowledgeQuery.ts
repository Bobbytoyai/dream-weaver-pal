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
  colere:  ["enerve", "fache", "crier", "rage", "injustice", "respirer", "calmer", "emotion"],
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
  "dessin anime":["regarder", "personnage", "aventure", "television", "manga", "animation", "disney", "pixar", "film", "art"],
  cinema:     ["film", "ecran", "popcorn", "salle", "regarder", "acteur"],
  // 🍳 Cuisine (enrichi)
  cuisine:    ["manger", "recette", "preparer", "ingredient", "plat", "chef", "gourmand"],
  gateau:     ["cuisine", "sucre", "four", "anniversaire", "chocolat", "dessert", "patisserie"],
  soupe:      ["cuisine", "legume", "chaud", "manger", "cuillere", "bol"],
  pizza:      ["cuisine", "italie", "fromage", "tomate", "four", "manger", "part", "mozzarella"],
  crepe:      ["cuisine", "france", "sucre", "chandeleur", "poele", "dessert", "farine"],
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
  // 🌍 Géographie (concepts)
  continent:  ["terre", "ocean", "afrique", "europe", "asie", "amerique", "oceanie", "antarctique", "geographie"],
  geographie: ["continent", "pays", "capitale", "carte", "monde", "terre", "frontiere", "climat"],
  pays:       ["continent", "frontiere", "capitale", "drapeau", "langue", "culture", "gouvernement", "geographie"],
  capitale:   ["pays", "ville", "paris", "gouvernement", "politique", "geographie"],
  carte:      ["geographie", "pays", "continent", "reperer", "boussole", "plan", "monde"],
  fleuve:     ["riviere", "eau", "mer", "seine", "nil", "amazone", "couler", "geographie"],
  glacier:    ["glace", "montagne", "pole", "fonte", "froid", "banquise", "geographie"],
  banquise:   ["glace", "pole", "ours", "fonte", "arctique", "antarctique", "froid"],
  equateur:   ["terre", "tropique", "chaud", "climat", "ligne", "geographie"],
  tropique:   ["equateur", "chaud", "climat", "soleil", "jungle", "geographie"],
  climat:     ["meteo", "temperature", "chaud", "froid", "pluie", "saison", "geographie"],
  savane:     ["afrique", "herbe", "lion", "girafe", "elephant", "zebre", "geographie"],
  archipel:   ["ile", "ocean", "japon", "indonesie", "groupe", "geographie"],
  tsunami:    ["vague", "seisme", "ocean", "catastrophe", "eau", "geographie"],
  seisme:     ["tremblement", "terre", "plaque", "vibration", "danger", "geographie"],
  sahara:     ["desert", "sable", "afrique", "chaud", "dune", "oasis"],
  amazonie:   ["foret", "tropicale", "bresil", "biodiversite", "fleuve", "poumon"],
  mediterranee:["mer", "europe", "afrique", "bleu", "chaud", "geographie"],
  arctique:   ["pole", "froid", "glace", "ours", "banquise", "nord"],
  antarctique:["pole", "froid", "glace", "pingouin", "continent", "sud"],
  afrique:    ["continent", "savane", "sahara", "lion", "elephant", "nil", "geographie"],
  europe:     ["continent", "france", "allemagne", "culture", "union", "geographie"],
  asie:       ["continent", "chine", "japon", "grand", "inde", "geographie"],
  amerique:   ["continent", "nord", "sud", "bresil", "etats-unis", "geographie"],
  // 🧬 Sciences de la vie
  cellule:    ["biologie", "corps", "vivant", "microscopique", "noyau", "adn", "organisme"],
  adn:        ["gene", "genetique", "cellule", "hereditaire", "chromosome", "vivant", "unique"],
  gene:       ["adn", "hereditaire", "cellule", "parent", "trait", "biologie"],
  biologie:   ["vivant", "cellule", "animal", "plante", "corps", "science", "nature"],
  photosynthese:["plante", "soleil", "oxygene", "chlorophylle", "lumiere", "co2", "feuille"],
  chlorophylle:["vert", "plante", "feuille", "photosynthese", "couleur", "biologie"],
  ecosysteme: ["nature", "animal", "plante", "equilibre", "chaine alimentaire", "biodiversite"],
  biodiversite:["espece", "nature", "protection", "animal", "plante", "ecosysteme", "diversite"],
  "chaine alimentaire":["predateur", "proie", "herbivore", "carnivore", "ecosysteme", "manger"],
  predateur:  ["chasse", "carnivore", "proie", "animal", "chaine alimentaire"],
  herbivore:  ["plante", "manger", "animal", "vache", "lapin", "chaine alimentaire"],
  carnivore:  ["viande", "manger", "predateur", "lion", "loup", "chaine alimentaire"],
  mammifere:  ["animal", "lait", "sang chaud", "poil", "vivipare", "biologie"],
  insecte:    ["pattes", "ailes", "fourmi", "papillon", "coccinelle", "abeille", "biologie"],
  reptile:    ["ecaille", "serpent", "lezard", "crocodile", "sang froid", "biologie"],
  amphibien:  ["grenouille", "crapaud", "eau", "terre", "metamorphose", "biologie"],
  microbe:    ["bacterie", "virus", "microscopique", "maladie", "hygiene", "biologie"],
  bacterie:   ["microbe", "microscopique", "maladie", "hygiene", "infection", "biologie"],
  virus:      ["microbe", "maladie", "contagieux", "vaccin", "grippe", "biologie"],
  vaccin:     ["maladie", "protection", "medecin", "piqure", "immunite", "sante"],
  poumon:     ["respirer", "oxygene", "air", "corps", "organe", "biologie"],
  estomac:    ["digerer", "manger", "organe", "corps", "acide", "biologie"],
  muscle:     ["corps", "force", "mouvement", "os", "exercice", "biologie"],
  squelette:  ["os", "corps", "structure", "calcium", "articulation", "biologie"],
  neurone:    ["cerveau", "signal", "penser", "nerf", "synapse", "biologie"],
  organe:     ["corps", "coeur", "poumon", "cerveau", "foie", "rein", "biologie"],
  respirer:   ["oxygene", "poumon", "air", "inspire", "expire", "vivre", "calmer", "stress", "detendre", "technique", "zen"],
  digerer:    ["manger", "estomac", "intestin", "nutriment", "nourriture", "corps"],
  sang:       ["rouge", "globule", "coeur", "veine", "artere", "oxygene", "corps"],
  evolution:  ["darwin", "adaptation", "espece", "selection", "mutation", "biologie"],
  germination:["graine", "plante", "pousser", "eau", "terre", "racine"],
  racine:     ["plante", "terre", "eau", "arbre", "puiser", "ancrage"],
  graine:     ["plante", "germination", "pousser", "fleur", "fruit", "nature"],
  // 🔢 Mathématiques
  mathematique:["nombre", "calcul", "chiffre", "geometrie", "logique", "probleme", "compter"],
  nombre:     ["chiffre", "compter", "mathematique", "calcul", "pair", "impair", "infini"],
  addition:   ["plus", "ajouter", "somme", "calcul", "mathematique", "nombre"],
  soustraction:["moins", "enlever", "difference", "calcul", "mathematique", "nombre"],
  multiplication:["fois", "multiplier", "table", "produit", "calcul", "mathematique"],
  division:   ["partager", "diviser", "quotient", "reste", "calcul", "mathematique"],
  fraction:   ["partie", "numerateur", "denominateur", "moitie", "quart", "mathematique"],
  pourcentage:["cent", "proportion", "moitie", "calcul", "mathematique", "statistique"],
  geometrie:  ["forme", "carre", "triangle", "cercle", "angle", "mesurer", "mathematique"],
  triangle:   ["geometrie", "trois", "cote", "angle", "pyramide", "forme", "mathematique"],
  cercle:     ["geometrie", "rond", "rayon", "diametre", "pi", "forme", "mathematique"],
  carre:      ["geometrie", "quatre", "cote", "angle droit", "forme", "rectangle", "mathematique"],
  rectangle:  ["geometrie", "carre", "longueur", "largeur", "forme", "mathematique"],
  cube:       ["geometrie", "3d", "face", "arete", "volume", "forme", "de"],
  sphere:     ["geometrie", "3d", "rond", "boule", "volume", "terre", "ballon"],
  angle:      ["geometrie", "degre", "droit", "aigu", "obtus", "rapporteur", "mathematique"],
  symetrie:   ["geometrie", "miroir", "identique", "papillon", "moitie", "mathematique"],
  perimetre:  ["geometrie", "tour", "mesure", "cote", "longueur", "mathematique"],
  aire:       ["geometrie", "surface", "metre carre", "mesure", "longueur", "largeur"],
  volume:     ["geometrie", "3d", "cube", "litre", "contenir", "espace", "mathematique"],
  pair:       ["nombre", "deux", "divisible", "impair", "mathematique"],
  impair:     ["nombre", "pair", "un", "trois", "cinq", "mathematique"],
  infini:     ["nombre", "jamais", "illimite", "symbole", "mathematique", "espace"],
  zero:       ["nombre", "rien", "vide", "invention", "inde", "mathematique"],
  negatif:    ["nombre", "zero", "moins", "temperature", "mathematique"],
  equation:   ["mathematique", "egal", "inconnue", "resoudre", "calcul", "algebre"],
  calcul:     ["mathematique", "nombre", "operation", "resultat", "mental", "calculatrice"],
  mesurer:    ["metre", "centimetre", "regle", "taille", "longueur", "mathematique"],
  compter:    ["nombre", "chiffre", "un", "deux", "trois", "mathematique", "doigt"],
  logique:    ["penser", "raisonner", "mathematique", "probleme", "deduction", "cerveau"],
  statistique:["mathematique", "nombre", "moyenne", "graphique", "donnee", "pourcentage"],
  probleme:   ["mathematique", "enigme", "resoudre", "logique", "question", "reponse"],
  "table de multiplication":["multiplication", "apprendre", "calcul mental", "nombre", "mathematique"],
  pi:         ["cercle", "nombre", "3.14", "infini", "mathematique", "geometrie"],
  // 🎨 Arts (enrichi)
  peinture:   ["art", "couleur", "pinceau", "tableau", "toile", "artiste", "musee", "aquarelle"],
  tableau:    ["peinture", "art", "musee", "cadre", "toile", "exposition", "artiste"],
  artiste:    ["art", "creer", "oeuvre", "talent", "imagination", "peintre", "musicien"],
  portrait:   ["visage", "peinture", "art", "joconde", "vinci", "dessin", "photo"],
  joconde:    ["portrait", "vinci", "louvre", "musee", "celebre", "peinture", "sourire"],
  picasso:    ["art", "peintre", "cubisme", "espagnol", "moderne", "tableau", "geometrie"],
  origami:    ["papier", "plier", "japon", "art", "forme", "grue", "creatif"],
  mosaique:   ["art", "morceau", "couleur", "assembler", "romain", "decoratif"],
  mandala:    ["rond", "symetrie", "colorier", "relaxation", "motif", "art", "meditation"],
  graffiti:   ["art", "mur", "peinture", "ville", "banksy", "street art", "bombe"],
  calligraphie:["ecrire", "pinceau", "encre", "art", "beau", "japon", "chine", "lettre"],
  aquarelle:  ["peinture", "eau", "transparente", "couleur", "art", "leger", "papier"],
  "pop art":  ["art", "warhol", "couleur", "moderne", "image", "culture", "celebre"],
  theatre:    ["acteur", "scene", "spectacle", "piece", "jouer", "emotion", "public", "art"],
  acteur:     ["theatre", "cinema", "film", "jouer", "role", "spectacle", "scene"],
  poesie:     ["poeme", "rime", "mot", "vers", "hugo", "art", "ecrire", "beaute"],
  conte:      ["histoire", "fee", "prince", "magie", "perrault", "grimm", "imaginaire"],
  
  photographie:["photo", "appareil", "image", "capturer", "lumiere", "art", "souvenir"],
  "chef d''oeuvre":["art", "extraordinaire", "celebre", "musee", "joconde", "beethoven"],
  // 🍳 Cuisine (enrichi)
  recette:    ["cuisine", "ingredient", "etape", "preparer", "plat", "mesurer", "suivre"],
  ingredient: ["cuisine", "recette", "aliment", "melanger", "preparer", "quantite"],
  patisserie: ["dessert", "gateau", "sucre", "macaron", "croissant", "four", "cuisine"],
  boulangerie:["pain", "baguette", "four", "farine", "levure", "croissant", "cuisine"],
  epice:      ["gout", "poivre", "cannelle", "curcuma", "paprika", "cuisine", "saveur"],
  fromage:    ["lait", "france", "camembert", "gruyere", "affinage", "cuisine"],
  beurre:     ["lait", "creme", "cuisine", "tartine", "gras", "patisserie"],
  confiture:  ["fruit", "sucre", "pot", "tartine", "cuisson", "cuisine", "conserve"],
  miel:       ["abeille", "nectar", "fleur", "sucre", "ruche", "doux", "nature"],
  smoothie:   ["fruit", "mixer", "boisson", "vitamine", "frais", "sante", "cuisine"],
  fermentation:["levure", "yaourt", "pain", "transformation", "bacterie", "chimie"],
  "allergie alimentaire":["aliment", "reaction", "arachide", "gluten", "sante", "attention"],
  nutriment:  ["vitamine", "proteine", "glucide", "mineral", "sante", "aliment", "corps"],
  proteine:   ["muscle", "viande", "oeuf", "lentille", "corps", "force", "nutrition"],
  vitamine:   ["sante", "orange", "fruit", "legume", "corps", "nutriment", "defense"],
  cuisson:    ["chaleur", "four", "feu", "bouillir", "griller", "cuisine", "transformer"],
  legume:     ["plante", "vitamine", "sante", "carotte", "epinard", "manger", "jardin"],
  "fruit cuisine":["plante", "graine", "sucre", "vitamine", "manger", "pomme", "banane", "jus"],
  riz:        ["cereale", "asie", "aliment", "eau", "riziere", "cuisine", "grain"],
  sushi:      ["japon", "riz", "poisson", "cuisine", "algue", "baguette"],
  // 💗 Émotions (enrichi)
  emotion:    ["ressenti", "joie", "tristesse", "peur", "colere", "surprise", "corps", "cerveau"],
  joie:       ["bonheur", "sourire", "rire", "content", "heureux", "fete", "emotion"],
  tristesse:  ["pleurer", "chagrin", "larme", "malheureux", "triste", "emotion", "consoler"],
  
  surprise:   ["inattendu", "yeux", "soudain", "cadeau", "emotion", "reaction", "oh"],
  jalousie:   ["envie", "emotion", "partager", "vouloir", "sentiment", "comparer"],
  honte:      ["gene", "erreur", "embarras", "rougir", "emotion", "apprendre", "pardonner"],
  fierte:     ["reussir", "satisfaction", "bravo", "accomplissement", "emotion", "confiance"],
  courage:    ["peur", "brave", "oser", "force", "hero", "affronter", "emotion"],
  patience:   ["attendre", "calme", "temps", "effort", "qualite", "perseverance"],
  gratitude:  ["merci", "reconnaissant", "bonheur", "positif", "apprecier", "emotion"],
  empathie:   ["comprendre", "ressenti", "ami", "partager", "emotion", "ecouter", "bienveillance"],
  timidite:   ["gene", "reserve", "confiance", "social", "rougir", "emotion", "introverti"],
  stress:     ["anxiete", "nerveux", "pression", "respirer", "calmer", "detendre", "emotion"],
  ennui:      ["temps", "imagination", "creativite", "idee", "rien", "attendre", "emotion"],
  cauchemar:  ["reve", "peur", "nuit", "dormir", "imaginaire", "monstre", "emotion"],
  trac:       ["peur", "spectacle", "stress", "nerveux", "scene", "public", "emotion"],
  "confiance en soi":["croire", "capacite", "oser", "estime", "force", "reussir", "emotion"],
  amitie:     ["ami", "partager", "jouer", "confiance", "lien", "ensemble", "emotion"],
  rire:       ["joie", "amusement", "humour", "bonheur", "contagieux", "blague"],
  "pleurer emotion":["larme", "tristesse", "emotion", "soulager", "exprimer", "douleur", "consoler"],
  "respiration calme":["calmer", "stress", "detendre", "technique", "zen", "meditation", "souffle"],
  consoler:   ["tristesse", "calin", "ecouter", "ami", "soutenir", "empathie", "reconforter"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚽 Corps & Besoins quotidiens (pipi, caca, hygiène, etc.)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  pipi:       ["toilette", "wc", "envie", "vessie", "propre", "corps", "urine", "pot", "couche", "nuit"],
  caca:       ["toilette", "wc", "corps", "ventre", "propre", "pot", "couche", "constipe", "digestion"],
  toilette:   ["pipi", "caca", "wc", "propre", "hygiene", "laver", "papier", "tirer chasse", "pot"],
  pot:        ["bebe", "propre", "pipi", "caca", "apprentissage", "couche", "toilette"],
  couche:     ["bebe", "pipi", "caca", "changer", "propre", "nuit", "pot"],
  propre:     ["toilette", "hygiene", "laver", "douche", "bain", "savon", "mains"],
  prout:      ["pet", "gaz", "ventre", "drole", "corps", "bruit", "rigolo", "digestion"],
  pet:        ["prout", "gaz", "ventre", "drole", "corps", "bruit", "digestion"],
  rot:        ["boire", "manger", "estomac", "gaz", "corps", "bruit", "bebe"],
  crotte:     ["nez", "morve", "caca", "animal", "degueu", "hygiene", "corps"],
  morve:      ["nez", "rhume", "mouchoir", "moucher", "malade", "crotte de nez"],
  mouchoir:   ["nez", "morve", "moucher", "rhume", "propre", "hygiene"],
  eternuer:   ["nez", "rhume", "microbe", "bruit", "atchoum", "corps"],
  tousser:    ["gorge", "malade", "rhume", "microbe", "corps", "sirop"],
  vomir:      ["malade", "ventre", "nausee", "degouter", "medecin", "corps"],
  bobo:       ["douleur", "pleurer", "bisou", "pansement", "sang", "tomber", "corps"],
  pansement:  ["bobo", "sang", "blessure", "soigner", "coller", "medecin"],
  "sang corps":["rouge", "blessure", "bobo", "corps", "coeur", "veine", "peur"],
  dent:       ["mordre", "lait", "tomber", "souris", "brosser", "dentiste", "carie"],
  dentiste:   ["dent", "carie", "brosser", "docteur", "bouche", "peur"],
  docteur:    ["medecin", "malade", "soigner", "stethoscope", "hopital", "ordonnance"],
  medecin:    ["docteur", "malade", "soigner", "hopital", "medicament", "consultation"],
  hopital:    ["medecin", "docteur", "malade", "ambulance", "soigner", "urgence"],
  medicament: ["medecin", "malade", "sirop", "comprime", "soigner", "pharmacie"],
  piqure:     ["vaccin", "medecin", "aiguille", "peur", "sang", "moustique", "douleur"],
  fievre:     ["chaud", "malade", "temperature", "thermometre", "medecin", "repos"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏠 Vie quotidienne & Maison
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  maison:     ["chambre", "cuisine", "salon", "jardin", "famille", "habiter", "toit", "porte", "fenetre"],
  chambre:    ["lit", "dormir", "jouer", "rangement", "maison", "doudou", "reveil"],
  lit:        ["dormir", "drap", "oreiller", "couverture", "chambre", "nuit", "reve"],
  doudou:     ["calin", "dormir", "peluche", "ami", "bebe", "chambre", "securite"],
  peluche:    ["doudou", "jouet", "ours", "lapin", "calin", "doux", "mignon"],
  jouet:      ["jouer", "peluche", "lego", "poupee", "voiture", "ballon", "cadeau"],
  lego:       ["construire", "jouet", "brique", "creatif", "jouer", "assembler"],
  poupee:     ["jouet", "jouer", "habiller", "maison", "barbie", "imaginer"],
  bain:       ["eau", "savon", "laver", "propre", "mousse", "canard", "chaud", "douche"],
  douche:     ["eau", "laver", "propre", "savon", "shampoing", "bain", "hygiene"],
  savon:      ["laver", "propre", "main", "bulle", "mousse", "hygiene", "bain"],
  shampoing:  ["cheveux", "laver", "douche", "mousse", "propre", "tete"],
  brosser:    ["dent", "cheveux", "propre", "matin", "soir", "hygiene", "routine"],
  dormir:     ["lit", "nuit", "reve", "fatigue", "dodo", "sommeil", "reveil", "histoire"],
  dodo:       ["dormir", "nuit", "bebe", "lit", "bonne nuit", "fatigue", "calme"],
  reveil:     ["matin", "dormir", "horloge", "sonnerie", "lever", "heure"],
  matin:      ["lever", "reveil", "petit dejeuner", "ecole", "soleil", "jour"],
  soir:       ["nuit", "dormir", "repas", "bain", "histoire", "coucher", "etoile"],
  "nuit routine":["dormir", "etoile", "lune", "noir", "reve", "cauchemar", "peur"],
  "reveil matin":["matin", "dormir", "sonnerie", "lever", "heure", "ecole"],
  manger:     ["nourriture", "repas", "faim", "table", "cuillere", "fourchette", "assiette"],
  faim:       ["manger", "ventre", "gouter", "repas", "nourriture", "estomac"],
  soif:       ["boire", "eau", "jus", "verre", "chaud", "deshydrater"],
  boire:      ["eau", "jus", "verre", "soif", "lait", "biberon", "paille"],
  gouter:     ["manger", "apres-midi", "biscuit", "fruit", "ecole", "faim"],
  "petit dejeuner": ["matin", "cereale", "tartine", "lait", "jus", "croissant", "manger"],
  repas:      ["manger", "midi", "soir", "table", "famille", "cuisine", "assiette"],
  assiette:   ["manger", "repas", "table", "rond", "verre", "couverts"],
  cuillere:   ["manger", "soupe", "dessert", "couverts", "table"],
  fourchette: ["manger", "couverts", "table", "piquer", "repas"],
  couteau:    ["couper", "couverts", "table", "attention", "danger"],
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎒 École & Vie scolaire
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  maitresse:  ["ecole", "apprendre", "classe", "prof", "lecon", "gentille"],
  maitre:     ["ecole", "apprendre", "classe", "prof", "lecon", "enseignant"],
  recreation: ["ecole", "jouer", "cour", "copain", "pause", "courir", "crier"],
  cour:       ["ecole", "recreation", "jouer", "courir", "copain", "dehors"],
  copain:     ["ami", "ecole", "jouer", "recreation", "partager", "rigoler"],
  copine:     ["amie", "ecole", "jouer", "recreation", "partager", "secret"],
  cantine:    ["ecole", "manger", "midi", "repas", "plateau", "dessert"],
  devoirs:    ["ecole", "maison", "apprendre", "cahier", "exercice", "soir"],
  cahier:     ["ecole", "ecrire", "devoirs", "ligne", "page", "stylo"],
  crayon:     ["dessiner", "ecrire", "ecole", "couleur", "gomme", "papier"],
  gomme:      ["effacer", "crayon", "ecole", "erreur", "caoutchouc"],
  cartable:   ["ecole", "sac", "cahier", "livre", "lourd", "dos"],
  trousse:    ["ecole", "crayon", "stylo", "gomme", "regle", "feutre"],
  dictee:     ["ecole", "ecrire", "mot", "orthographe", "maitresse", "note"],
  "note ecole":["ecole", "resultat", "bonne", "mauvaise", "controle", "bulletin"],
  controle:   ["ecole", "note", "apprendre", "reviser", "stress", "reussir"],
  bulletin:   ["ecole", "note", "trimestre", "parent", "resultat", "commentaire"],
  punition:   ["ecole", "betise", "coin", "injuste", "triste", "regle"],
  harcelement:["ecole", "mechant", "moquer", "triste", "adulte", "parler", "securite"],
  moquer:     ["mechant", "triste", "rire", "harcelement", "blesser", "parole"],
  bagarre:    ["frapper", "dispute", "mechant", "colere", "ecole", "punition"],
  dispute:    ["copain", "colere", "pardonner", "facher", "reconcilier", "ami"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 👨‍👩‍👧‍👦 Famille & Relations
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  soeur:      ["famille", "frere", "jouer", "partager", "aimer", "dispute"],
  grandpere:  ["famille", "papy", "ancien", "histoire", "sage", "amour"],
  grandmere:  ["famille", "mamie", "gateau", "calin", "histoire", "amour"],
  papy:       ["grandpere", "famille", "sage", "histoire", "jardin", "peche"],
  mamie:      ["grandmere", "famille", "gateau", "calin", "tricoter", "amour"],
  tonton:     ["oncle", "famille", "jouer", "cadeau", "fete", "rigolo"],
  tata:       ["tante", "famille", "calin", "cadeau", "fete", "gentille"],
  cousin:     ["famille", "jouer", "vacances", "fete", "copain", "noel"],
  cousine:    ["famille", "jouer", "vacances", "fete", "copine", "noel"],
  calin:      ["amour", "bras", "doux", "reconfort", "parent", "doudou", "bisou"],
  bisou:      ["amour", "calin", "joue", "bonne nuit", "parent", "doux"],
  separation: ["parent", "triste", "deux maisons", "divorce", "aimer", "famille"],
  divorce:    ["parent", "separation", "deux maisons", "triste", "aimer", "normal"],
  "nouveau bebe": ["famille", "frere", "soeur", "jaloux", "partager", "grandir"],
  adoption:   ["famille", "amour", "parent", "coeur", "choisir", "aimer"],
  demenagement:["maison", "nouvelle", "ami", "ecole", "triste", "aventure", "carton"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎉 Fêtes & Occasions
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  noel:       ["cadeau", "sapin", "pere noel", "hiver", "fete", "famille", "neige", "guirlande"],
  "pere noel":["noel", "cadeau", "traineau", "renne", "cheminee", "barbe", "rouge"],
  anniversaire:["gateau", "cadeau", "bougie", "fete", "age", "ami", "ballon", "surprise"],
  halloween:  ["citrouille", "deguisement", "fantome", "sorciere", "bonbon", "peur", "fete"],
  paques:     ["oeuf", "chocolat", "lapin", "cloche", "fete", "chasse", "printemps"],
  carnaval:   ["deguisement", "masque", "fete", "confetti", "musique", "danse", "costume"],
  fete:       ["joie", "ami", "musique", "danse", "cadeau", "famille", "gateau", "ballon"],
  cadeau:     ["noel", "anniversaire", "surprise", "papier", "ouvrir", "joie", "offrir"],
  vacances:   ["repos", "plage", "montagne", "voyage", "famille", "jouer", "ete", "camping"],
  camping:    ["vacances", "tente", "nature", "feu de camp", "dormir", "aventure", "etoile"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎮 Jeux & Activités
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  jouer:      ["jeu", "amusement", "copain", "jouet", "recreation", "rire", "imaginer"],
  "cache cache":["jouer", "cacher", "trouver", "chercher", "compter", "recreation"],
  "chat jeu": ["jouer", "courir", "attraper", "touche", "recreation", "cour"],
  marelle:    ["jouer", "sauter", "case", "recreation", "cour", "caillou"],
  toboggan:   ["glisser", "parc", "jouer", "hauteur", "enfant", "recreation"],
  balancoire: ["parc", "jouer", "balancer", "haut", "air", "enfant"],
  "bac a sable":["jouer", "sable", "construire", "chateau", "pelle", "seau", "parc"],
  parc:       ["jouer", "balancoire", "toboggan", "herbe", "arbre", "promenade"],
  piscine:    ["eau", "nager", "plonger", "bouee", "maillot", "ete", "eclabousser"],
  plage:      ["mer", "sable", "vague", "coquillage", "soleil", "chateau", "vacances"],
  coloriage:  ["couleur", "dessin", "crayon", "feutre", "creatif", "calme", "mandala"],
  puzzle:     ["assembler", "piece", "image", "patience", "logique", "jeu"],
  "jeu de societe":["jouer", "famille", "des", "pion", "regle", "gagner", "plateau"],
  minecraft:  ["jeu video", "construire", "bloc", "creatif", "aventure", "survie"],
  pokemon:    ["attraper", "combat", "evolution", "creature", "jeu", "dessin anime"],
  mario:      ["jeu video", "sauter", "champignon", "nintendo", "princesse", "plombier"],
  fortnite:   ["jeu video", "construire", "danser", "emote", "victoire"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 👔 Vêtements & Apparence
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  vetement:   ["habiller", "pantalon", "tshirt", "robe", "chaussure", "manteau", "pull"],
  pantalon:   ["vetement", "jambe", "jean", "habiller", "ceinture", "poche"],
  robe:       ["vetement", "fille", "princesse", "joli", "habiller", "fete"],
  chaussure:  ["pied", "lacet", "basket", "botte", "marcher", "vetement"],
  manteau:    ["vetement", "froid", "hiver", "fermeture", "chaud", "dehors"],
  bonnet:     ["tete", "froid", "hiver", "laine", "chaud", "vetement"],
  echarpe:    ["cou", "froid", "hiver", "laine", "chaud", "vetement"],
  pyjama:     ["dormir", "nuit", "vetement", "chambre", "doux", "confortable"],
  maillot:    ["bain", "piscine", "plage", "nager", "sport", "vetement"],
  deguisement:["costume", "jouer", "carnaval", "halloween", "imaginer", "personnage"],
  lunettes:   ["voir", "yeux", "soleil", "monture", "ophtalmo", "lire"],
  chapeau:    ["tete", "soleil", "cowboy", "magicien", "mode", "proteger"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🌿 Écologie & Environnement
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ecologie:   ["nature", "recycler", "proteger", "planete", "pollution", "vert", "environnement"],
  recycler:   ["poubelle", "tri", "plastique", "papier", "verre", "ecologie", "dechets"],
  pollution:  ["sale", "air", "eau", "plastique", "voiture", "usine", "ecologie", "malade"],
  plastique:  ["pollution", "recycler", "bouteille", "ocean", "dechets", "ecologie"],
  dechets:    ["poubelle", "recycler", "pollution", "plastique", "tri", "propre"],
  poubelle:   ["dechets", "jeter", "recycler", "tri", "propre", "nettoyer"],
  compost:    ["dechet", "jardin", "terre", "plante", "ecologie", "ver", "naturel"],
  "rechauffement climatique":["temperature", "glace", "polar", "co2", "planete", "ecologie"],
  "energie solaire":["soleil", "panneau", "electricite", "renouvelable", "ecologie", "propre"],
  eolienne:   ["vent", "electricite", "energie", "renouvelable", "helice", "ecologie"],
  deforestation:["arbre", "foret", "couper", "animaux", "ecologie", "danger", "amazonie"],
  extinction: ["animal", "disparaitre", "espece", "proteger", "ecologie", "danger"],
  "espece menacee":["animal", "disparaitre", "proteger", "panda", "baleine", "ecologie"],
  "parc national":["nature", "proteger", "animal", "foret", "reserve", "ecologie"],
  eau_potable:["boire", "propre", "robinet", "ressource", "ecologie", "gaspiller"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🐾 Animaux (enrichi — vie quotidienne)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  hamster:    ["animal", "roue", "cage", "petit", "poil", "mignon", "compagnie"],
  lapin:      ["animal", "carotte", "oreille", "doux", "terrier", "sauter", "mignon"],
  tortue:     ["animal", "carapace", "lent", "sage", "longtemps", "salade"],
  serpent:    ["animal", "reptile", "ramper", "ecaille", "peur", "siffler", "muer"],
  araignee:   ["toile", "pattes", "insecte", "peur", "attraper", "tisser"],
  fourmi:     ["insecte", "colonie", "travailleur", "petit", "fort", "fourmiliere"],
  abeille:    ["miel", "fleur", "pollen", "ruche", "piquer", "insecte", "reine", "ecologie"],
  coccinelle: ["insecte", "rouge", "point", "chance", "jardin", "puceron"],
  escargot:   ["coquille", "lent", "bave", "pluie", "jardin", "antenne"],
  grenouille: ["mare", "sauter", "coasser", "tetard", "eau", "verte", "mouche"],
  requin:     ["mer", "ocean", "dent", "predateur", "nager", "peur", "poisson"],
  baleine:    ["ocean", "grand", "mammifere", "chanter", "bleu", "proteger"],
  dauphin:    ["ocean", "intelligent", "nager", "saut", "ami", "jouer", "mammifere"],
  hippopotame:["afrique", "eau", "gros", "dangereux", "riviere", "herbivore"],
  girafe:     ["afrique", "cou", "grand", "tache", "savane", "feuille"],
  elephant:   ["afrique", "trompe", "grand", "defense", "memoire", "intelligent"],
  singe:      ["arbre", "grimper", "banane", "malin", "gorille", "chimpanze"],
  koala:      ["australie", "eucalyptus", "dormir", "mignon", "arbre", "marsupial"],
  kangourou:  ["australie", "sauter", "poche", "bebe", "marsupial"],
  panda:      ["bambou", "chine", "noir", "blanc", "mignon", "proteger", "espece menacee"],
  pingouin:   ["froid", "glace", "antarctique", "nager", "marcher", "drole"],
  perroquet:  ["parler", "couleur", "oiseau", "tropical", "repeter", "plume"],
  aigle:      ["oiseau", "rapace", "voler", "montagne", "puissant", "vue"],
  hibou:      ["nuit", "oiseau", "hululer", "yeux", "sage", "plume"],
  chauve_souris:["nuit", "voler", "ultrason", "grotte", "mammifere", "vampire"],
  loup:       ["hurler", "meute", "foret", "lune", "predateur", "conte"],
  renard:     ["ruse", "foret", "queue", "orange", "malin", "petit prince"],
  ours:       ["foret", "hiberner", "griffe", "gros", "polaire", "brun", "peluche"],
  cerf:       ["foret", "bois", "automne", "bambi", "herbivore", "majestueux"],
  ecureuil:   ["arbre", "noisette", "queue", "foret", "grimper", "automne"],
  herisson:   ["piquant", "jardin", "nocturne", "boule", "insecte", "mignon"],
  vache:      ["lait", "ferme", "meuh", "herbe", "fromage", "campagne"],
  cochon:     ["ferme", "boue", "rose", "groin", "truffe", "cochonnet"],
  mouton:     ["ferme", "laine", "beler", "berger", "doux", "compter"],
  poule:      ["ferme", "oeuf", "poussin", "cot", "grain", "poulailler"],
  canard:     ["eau", "mare", "coin coin", "nager", "bec", "plume"],
  cheval:     ["galop", "criniere", "equitation", "poney", "ferme", "sabot"],
  poney:      ["cheval", "petit", "equitation", "monter", "criniere", "gentil"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🍬 Nourriture & Goûts d'enfants
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  bonbon:     ["sucre", "gourmand", "halloween", "gout", "couleur", "macher"],
  glace:      ["froid", "vanille", "chocolat", "ete", "cornet", "boule", "dessert"],
  biscuit:    ["gouter", "croquant", "chocolat", "cuisine", "sucre", "cereale"],
  frite:      ["pomme de terre", "sel", "ketchup", "manger", "fast food", "croustillant"],
  hamburger:  ["pain", "viande", "salade", "fromage", "fast food", "manger"],
  pate:       ["manger", "bolognaise", "fromage", "cuire", "italien", "carbonara"],
  cereale:    ["petit dejeuner", "lait", "bol", "matin", "croquant", "manger"],
  tartine:    ["pain", "beurre", "confiture", "petit dejeuner", "manger", "matin"],
  jus:        ["fruit", "orange", "boire", "vitamine", "verre", "frais"],
  lait:       ["vache", "boire", "blanc", "cereale", "calcium", "biberon", "chocolat"],
  yaourt:     ["lait", "fruit", "cuillere", "dessert", "calcium", "manger"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 💫 Imaginaire & Créatures
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  dragon:     ["feu", "voler", "aile", "legende", "chevalier", "ecaille", "grotte"],
  licorne:    ["magie", "arc-en-ciel", "corne", "cheval", "feerie", "paillette"],
  fee:        ["magie", "baguette", "aile", "clochette", "voeu", "paillette", "conte"],
  sorciere:   ["magie", "balai", "potion", "halloween", "chapeau", "chat noir"],
  fantome:    ["peur", "halloween", "invisible", "nuit", "boo", "chateau"],
  monstre:    ["peur", "nuit", "cauchemar", "imaginaire", "placard", "lit"],
  vampire:    ["nuit", "dent", "halloween", "sang", "chauve-souris", "conte"],
  zombie:     ["halloween", "peur", "mort-vivant", "cerveau", "lent"],
  "super heros":["pouvoir", "sauver", "cape", "masque", "force", "voler", "mechant"],
  ninja:      ["combat", "rapide", "silencieux", "japon", "epee", "noir"],
  princesse:  ["chateau", "robe", "couronne", "roi", "conte", "prince"],
  prince:     ["chateau", "epee", "princesse", "roi", "conte", "cheval"],
  "pirate imaginaire":["bateau", "tresor", "mer", "ile", "drapeau", "aventure", "carte"],
  extraterrestre:["espace", "ovni", "planete", "vert", "antenne", "alien"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⏰ Temps & Routine
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  heure:      ["temps", "horloge", "minute", "seconde", "montre", "reveil"],
  minute:     ["temps", "heure", "seconde", "court", "attendre", "vite"],
  seconde:    ["temps", "minute", "rapide", "instant", "court"],
  hier:       ["temps", "passe", "jour", "avant", "souvenir"],
  demain:     ["temps", "futur", "jour", "apres", "attendre"],
  "aujourd hui":["temps", "jour", "present", "maintenant", "programme"],
  semaine:    ["jour", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "weekend"],
  weekend:    ["samedi", "dimanche", "repos", "jouer", "famille", "sortir"],
  anniversaire_temps:["age", "grandir", "gateau", "bougie", "fete", "an"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚗 Déplacements & Moyens de transport (enrichi)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  bus:        ["transport", "ecole", "ville", "arret", "conduire", "passager"],
  metro:      ["transport", "souterrain", "ville", "station", "rapide", "tunnel"],
  trottinette:["rouler", "roue", "jouer", "electrique", "rue", "transport"],
  skateboard: ["rouler", "planche", "figure", "parc", "sport", "equilibre"],
  roller:     ["rouler", "roue", "pied", "glisser", "sport", "patin"],
  moto:       ["rouler", "rapide", "casque", "roue", "bruit", "transport"],
  helicoptere:["voler", "helice", "sauvetage", "ciel", "transport", "bruit"],
  sous_marin: ["eau", "profond", "ocean", "explorer", "hublot", "capitaine"],
  ambulance:  ["urgence", "hopital", "sirene", "medecin", "sauver", "rapide"],
  pompier:    ["feu", "sauver", "camion", "casque", "echelle", "hero", "eau"],
  policier:   ["securite", "loi", "voiture", "uniforme", "aider", "proteger"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 💩 Humour enfantin & Expressions rigolotes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  rigolo:     ["drole", "rire", "amusant", "blague", "marrant", "humour"],
  blague:     ["drole", "rire", "humour", "devinette", "toc toc", "marrant"],
  devinette:  ["question", "reponse", "reflechir", "drole", "jeu", "blague"],
  chatouille: ["rire", "doigt", "pieds", "ventre", "arreter", "rigoler"],
  grimace:    ["visage", "drole", "bouche", "yeux", "rigoler", "miroir"],
  betise:     ["erreur", "pardon", "drole", "interdit", "oups", "accident"],
  mensonge:   ["verite", "mentir", "confiance", "pinocchio", "secret", "culpabilite"],
  secret:     ["cacher", "chuchoter", "ami", "confiance", "surprise", "oreille"],
  "gros mot":   ["interdit", "mechant", "parole", "colere", "pardon", "regle"],
  baver:      ["bebe", "bouche", "dormir", "drole", "manger", "corps"],
  ronfler:    ["dormir", "bruit", "nuit", "nez", "drole", "fatigue"],
  hoquet:     ["bruit", "corps", "boire", "diaphragme", "arreter", "drole"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🧒 Grandir & Corps qui change
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  grandir:    ["age", "taille", "adulte", "changer", "corps", "apprendre", "responsable"],
  taille:     ["grandir", "mesurer", "centimetre", "petit", "grand", "corps"],
  cheveux:    ["tete", "coiffer", "couper", "long", "court", "couleur", "shampoing"],
  yeux:       ["voir", "couleur", "regard", "cligner", "larme", "lunettes"],
  main:       ["doigt", "toucher", "droite", "gauche", "ecrire", "attraper"],
  pied:       ["marcher", "chaussure", "orteil", "courir", "sauter", "chatouille"],
  ventre:     ["manger", "faim", "mal", "nombril", "digerer", "gargouiller"],
  dos:        ["colonne", "cartable", "droit", "mal", "vertebre", "posture"],
  nombril:    ["ventre", "cordon", "bebe", "corps", "drole", "milieu"],
  cicatrice:  ["blessure", "peau", "guerir", "bobo", "souvenir", "corps"],
  tache_rousseur:["peau", "visage", "soleil", "mignon", "genetique", "unique"],
  grain_beaute:["peau", "marron", "petit", "corps", "unique", "soleil"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🌿 Écologie & Environnement
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ecologie_env:   ["nature", "planete", "recycler", "pollution", "proteger", "environnement", "climat", "vert", "durable"],
  environnement:  ["ecologie", "nature", "planete", "proteger", "pollution", "foret", "ocean", "biodiversite"],
  recycler_tri:   ["dechet", "poubelle", "tri", "plastique", "verre", "papier", "ecologie", "planete"],
  pollution_air:  ["air", "eau", "plastique", "dechet", "usine", "voiture", "ecologie", "danger", "sante"],
  "rechauffement climat":["terre", "temperature", "glace", "co2", "gaz", "effet de serre", "ecologie", "urgence"],
  "effet de serre":["atmosphere", "co2", "chaleur", "rechauffement", "climat", "ecologie", "terre"],
  co2:            ["gaz", "carbone", "atmosphere", "pollution", "respirer", "plante", "ecologie"],
  deforestation_eco:["foret", "arbre", "couper", "animaux", "biodiversite", "amazonie", "ecologie", "danger"],
  compost_eco:    ["dechet", "terre", "jardin", "organique", "ver", "recycler", "ecologie", "engrais"],
  "energie renouvelable":["soleil", "vent", "eau", "eolienne", "panneau solaire", "ecologie", "propre", "futur"],
  eolienne_eco:   ["vent", "electricite", "energie", "tourner", "pale", "ecologie", "renouvelable"],
  "panneau solaire":["soleil", "electricite", "energie", "toit", "photovoltaique", "ecologie", "renouvelable"],
  plastique_eco:  ["pollution", "dechet", "ocean", "recycler", "bouteille", "sac", "ecologie", "danger"],
  poubelle_tri:   ["dechet", "recycler", "tri", "jeter", "propre", "ecologie", "couleur"],
  "espece menacee_eco":["animal", "disparaitre", "proteger", "panda", "baleine", "tigre", "ecologie", "biodiversite"],
  "parc national_eco":["nature", "proteger", "animal", "foret", "reserve", "ranger", "ecologie", "visite"],
  secheresse:     ["eau", "chaud", "climat", "pluie", "desert", "agriculture", "ecologie", "soif"],
  inondation:     ["eau", "pluie", "riviere", "deborder", "catastrophe", "climat", "ecologie"],
  empreinte_carbone:["co2", "pollution", "transport", "consommer", "reduire", "ecologie", "planete"],
  zero_dechet:    ["recycler", "compost", "reduire", "reutiliser", "ecologie", "mode de vie", "planete"],
  ocean_pollution:["plastique", "mer", "poisson", "dechet", "maree noire", "ecologie", "animal marin"],
  fonte_glaces:   ["banquise", "arctique", "ours", "rechauffement", "niveau mer", "ecologie", "climat"],
  developpement_durable:["ecologie", "futur", "planete", "economie", "social", "equilibre", "responsable"],
  maree_noire:    ["petrole", "ocean", "pollution", "oiseau", "poisson", "catastrophe", "ecologie"],
  ozone:          ["atmosphere", "couche", "proteger", "soleil", "uv", "ecologie", "trou"],
  pesticide:      ["agriculture", "insecte", "chimique", "danger", "abeille", "ecologie", "aliment"],
  biologique:     ["agriculture", "naturel", "sante", "ecologie", "pesticide", "label", "bio"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🐾 Animaux supplémentaires (non déjà définis)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  animal_general: ["vivant", "sauvage", "domestique", "foret", "ferme", "zoo", "nature", "espece", "biologie"],
  ane:            ["ferme", "bruit", "oreille", "tetu", "animal", "porter", "shrek"],
  chevre:         ["ferme", "montagne", "fromage", "corne", "animal", "chevreau", "lait"],
  gorille:        ["afrique", "singe", "fort", "intelligent", "foret", "animal", "famille"],
  flamant:        ["rose", "patte", "lac", "afrique", "animal", "equilibre", "oiseau"],
  pieuvre:        ["tentacule", "intelligent", "ocean", "encre", "camouflage", "animal", "mer"],
  hippocampe:     ["mer", "cheval", "petit", "male", "bebe", "corail", "animal", "unique"],
  meduse:         ["mer", "transparent", "piquer", "tentacule", "ocean", "animal", "danger"],
  crabe:          ["pince", "plage", "carapace", "mer", "marcher", "animal", "lateral"],
  etoile_mer:     ["mer", "cinq", "bras", "fond", "plage", "animal", "regenerer"],
  corail:         ["mer", "recif", "couleur", "poisson", "ocean", "animal", "biodiversite", "ecologie"],
  orque:          ["ocean", "noir", "blanc", "predateur", "intelligent", "dauphin", "animal", "mer"],
  raie:           ["mer", "plate", "nager", "fond", "electrique", "manta", "animal"],
  morse:          ["arctique", "defense", "moustache", "gros", "glace", "animal", "mer"],
  phoque:         ["mer", "glace", "nager", "mignon", "arctique", "animal", "fourrure"],
  narval:         ["licorne mer", "corne", "arctique", "ocean", "animal", "unique", "dent"],
  scarabee:       ["insecte", "egypte", "carapace", "rouler", "bouse", "coleoptere"],
  moustique:      ["piquer", "bruit", "ete", "sang", "nuit", "insecte", "maladie"],
  luciole:        ["lumiere", "nuit", "insecte", "briller", "magie", "ete", "jardin"],
  ver_terre:      ["terre", "compost", "sol", "long", "pluie", "jardin", "insecte"],
  libellule:      ["eau", "aile", "voler", "rapide", "insecte", "mare", "ete"],
  cigale:         ["chanter", "ete", "chaleur", "insecte", "fable", "fourmi"],
  chenille:       ["papillon", "feuille", "manger", "metamorphose", "insecte", "cocon"],
  migration:      ["oiseau", "voyage", "saison", "animal", "sud", "nord", "instinct", "nature"],
  hibernation:    ["dormir", "hiver", "ours", "marmotte", "froid", "reserve", "animal", "nature"],
  metamorphose:   ["chenille", "papillon", "tetard", "grenouille", "changer", "animal", "nature"],
  camouflage:     ["cacher", "couleur", "animal", "predateur", "cameleon", "pieuvre", "nature"],
  symbiose:       ["animal", "plante", "aider", "ensemble", "nature", "poisson clown", "anemone"],
  nid_oiseau:     ["oiseau", "construire", "oeuf", "bebe", "branche", "arbre", "animal"],
  terrier:        ["lapin", "renard", "sous terre", "abri", "animal", "creuser", "nature"],
  meute:          ["loup", "groupe", "chef", "chasse", "ensemble", "animal", "social"],
  troupeau:       ["mouton", "vache", "ensemble", "berger", "pre", "animal", "groupe"],
  zoo:            ["animal", "visite", "cage", "soigneur", "enfant", "decouvrir", "proteger"],
  veterinaire:    ["animal", "soigner", "docteur", "sante", "clinique", "chat", "chien"],
  cameleon:       ["couleur", "changer", "reptile", "camouflage", "yeux", "langue", "animal"],
  castor:         ["barrage", "bois", "riviere", "construire", "queue", "animal", "nature"],
  autruche:       ["oiseau", "grand", "courir", "oeuf", "afrique", "plume", "animal"],
  paon:           ["plume", "roue", "couleur", "oiseau", "fier", "animal", "beaute"],
  toucan:         ["bec", "couleur", "tropical", "oiseau", "amazonie", "animal", "fruit"],
  "poisson clown":["nemo", "anemone", "corail", "mer", "orange", "symbiose", "animal"],
  murene:         ["mer", "dent", "trou", "poisson", "danger", "recif", "animal"],
  oursin:         ["mer", "piquant", "fond", "rond", "plage", "animal", "danger"],
  crevette:       ["mer", "crustace", "rose", "nager", "cuisine", "animal", "petit"],
  homard:         ["mer", "pince", "crustace", "bleu", "fond", "animal", "cuisine"],
  marmotte:       ["montagne", "hibernation", "siffler", "terrier", "animal", "alpes"],
  chamois:        ["montagne", "agile", "corne", "alpes", "sauter", "animal", "sauvage"],
  lynx:           ["foret", "felin", "oreille", "discret", "chasse", "animal", "sauvage"],
  blaireau:       ["foret", "terrier", "nocturne", "rayure", "animal", "sauvage"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 👗 Mode & Vêtements (enrichi)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  mode:           ["vetement", "tendance", "styliste", "defile", "tissu", "couleur", "accessoire", "fashion"],
  styliste:       ["mode", "creer", "vetement", "defile", "dessin", "collection", "tissu"],
  defile:         ["mode", "mannequin", "podium", "vetement", "styliste", "spectacle"],
  tissu:          ["mode", "vetement", "coton", "soie", "laine", "polyester", "coudre", "fil"],
  coton:          ["tissu", "plante", "doux", "vetement", "naturel", "blanc", "mode"],
  soie:           ["tissu", "doux", "brillant", "ver", "chine", "luxe", "mode"],
  laine:          ["tissu", "mouton", "chaud", "tricoter", "pull", "echarpe", "mode"],
  jean:           ["pantalon", "mode", "bleu", "denim", "levi", "decontracte", "vetement"],
  basket_chaussure:["chaussure", "sport", "mode", "lacet", "confortable", "marcher", "courir"],
  uniforme:       ["vetement", "ecole", "travail", "identique", "equipe", "regle", "mode"],
  coudre:         ["fil", "aiguille", "tissu", "machine", "reparer", "creer", "mode"],
  accessoire:     ["mode", "bijou", "sac", "ceinture", "montre", "lunettes", "vetement"],
  tendance:       ["mode", "nouveau", "populaire", "style", "saison", "couleur"],
  recyclage_textile:["mode", "vetement", "recycler", "ecologie", "donner", "seconde main", "planete"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📺 Médias & Information
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  media:          ["information", "journal", "television", "radio", "internet", "actualite", "image"],
  journal:        ["media", "actualite", "lire", "article", "journaliste", "papier", "information"],
  journaliste:    ["media", "journal", "ecrire", "enqueter", "reportage", "verite", "information"],
  television:     ["media", "ecran", "emission", "regarder", "chaine", "telecommande", "programme"],
  radio:          ["media", "ecouter", "musique", "emission", "voix", "ondes", "antenne"],
  actualite:      ["media", "monde", "evenement", "jour", "information", "journal", "nouveau"],
  "fake news":    ["faux", "mentir", "internet", "verifier", "media", "attention", "esprit critique"],
  "esprit critique":["reflechir", "verifier", "fake news", "media", "question", "analyser", "intelligent"],
  publicite:      ["media", "vendre", "produit", "image", "television", "internet", "affiche"],
  reportage:      ["journaliste", "media", "enquete", "filmer", "terrain", "information", "documentaire"],
  documentaire:   ["film", "apprendre", "nature", "animal", "science", "media", "vrai", "reportage"],
  "reseaux sociaux":["internet", "media", "partager", "photo", "ami", "attention", "ecran", "securite"],
  "droit image":  ["photo", "vie privee", "respect", "permission", "media", "securite", "loi"],
  interview:      ["journaliste", "question", "reponse", "media", "personne", "micro", "parler"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔭 Astronomie avancée
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "big bang":     ["univers", "debut", "explosion", "espace", "galaxie", "temps", "creation"],
  "matiere noire":["univers", "invisible", "mystere", "espace", "gravite", "galaxie", "masse"],
  exoplanete:     ["planete", "etoile", "espace", "vie", "habitable", "decouverte", "kepler"],
  "trou de ver":  ["espace", "temps", "voyage", "raccourci", "univers", "relativite", "fiction"],
  supernova:      ["etoile", "explosion", "lumiere", "espace", "fin", "nebuleuse", "puissant"],
  "naine blanche":["etoile", "petit", "chaud", "vieux", "espace", "soleil", "fin"],
  pulsar:         ["etoile", "tourner", "signal", "neutron", "espace", "rapide", "magnétique"],
  quasar:         ["galaxie", "lumiere", "loin", "puissant", "espace", "trou noir", "energie"],
  "voie lactee":  ["galaxie", "terre", "etoile", "espace", "spirale", "soleil", "nuit"],
  "station spatiale":["espace", "astronaute", "orbite", "terre", "experience", "iss", "flotter"],
  "james webb":   ["telescope", "espace", "infrarouge", "decouverte", "etoile", "univers", "galaxie"],
  eclipse:        ["soleil", "lune", "ombre", "terre", "nuit", "rare", "spectacle", "espace"],
  aurore_boreale: ["lumiere", "pole", "nord", "ciel", "nuit", "couleur", "magnetique", "espace"],
  asteroide:      ["roche", "espace", "ceinture", "collision", "terre", "dinosaure", "danger"],
  sonde_spatiale: ["espace", "explorer", "planete", "robot", "voyager", "mars", "loin", "envoyer"],
  gravite_espace: ["force", "attraction", "masse", "newton", "einstein", "orbite", "espace", "tomber"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏛️ Mythologie & Légendes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  mythologie:     ["dieu", "legende", "heros", "grece", "rome", "egypte", "nordique", "histoire", "creature"],
  zeus:           ["mythologie", "grece", "dieu", "tonnerre", "olympe", "eclair", "puissant", "ciel"],
  poseidon:       ["mythologie", "grece", "dieu", "mer", "trident", "ocean", "tempete"],
  athena:         ["mythologie", "grece", "deesse", "sagesse", "guerre", "chouette", "intelligence"],
  hercule:        ["mythologie", "grece", "heros", "force", "travaux", "demi-dieu", "courage"],
  ulysse:         ["mythologie", "grece", "voyage", "odyssee", "ruse", "troie", "heros"],
  thor:           ["mythologie", "nordique", "marteau", "tonnerre", "dieu", "asgard", "viking"],
  odin:           ["mythologie", "nordique", "dieu", "sagesse", "corbeaux", "asgard", "viking"],
  minotaure:      ["mythologie", "grece", "labyrinthe", "monstre", "taureau", "crete", "thesee"],
  meduse_myth:    ["mythologie", "grece", "serpent", "cheveux", "pierre", "regard", "monstre"],
  phoenix:        ["mythologie", "oiseau", "feu", "renaitre", "cendre", "immortel", "legende"],
  kraken:         ["mythologie", "mer", "monstre", "pieuvre", "geant", "legende", "marin"],
  pegase:         ["mythologie", "cheval", "aile", "voler", "grece", "heros", "blanc"],
  sphinx:         ["mythologie", "egypte", "enigme", "lion", "humain", "statue", "mystere"],
  anubis:         ["mythologie", "egypte", "dieu", "mort", "chacal", "momie", "jugement"],
  isis:           ["mythologie", "egypte", "deesse", "magie", "mere", "protection", "amour"],
  ra:             ["mythologie", "egypte", "dieu", "soleil", "pharaon", "lumiere", "puissant"],
  legende:        ["mythologie", "histoire", "ancien", "heros", "creature", "magie", "oral"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🦕 Dinosaures (enrichi)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "t-rex":        ["dinosaure", "carnivore", "grand", "dent", "predateur", "jurassique", "fossile"],
  triceratops:    ["dinosaure", "corne", "herbivore", "bouclier", "cretace", "fossile"],
  velociraptor:   ["dinosaure", "rapide", "griffe", "intelligent", "meute", "carnivore", "fossile"],
  diplodocus:     ["dinosaure", "long", "cou", "herbivore", "geant", "queue", "fossile"],
  stegosaure:     ["dinosaure", "plaque", "dos", "herbivore", "queue", "pointe", "fossile"],
  pterodactyle:   ["dinosaure", "voler", "aile", "reptile", "ciel", "bec", "prehistoire"],
  brontosaure:    ["dinosaure", "geant", "herbivore", "long", "cou", "sauropode", "fossile"],
  ankylosaure:    ["dinosaure", "armure", "massue", "queue", "herbivore", "defense", "fossile"],
  spinosaure:     ["dinosaure", "voile", "dos", "carnivore", "poisson", "grand", "fossile"],
  megalodone:     ["requin", "geant", "prehistoire", "dent", "ocean", "predateur", "disparu"],
  paleontologue:  ["dinosaure", "fossile", "fouille", "os", "science", "decouverte", "chercheur"],
  extinction_dino:["dinosaure", "meteorite", "disparu", "asteroide", "cretace", "fin", "catastrophe"],
  jurassique:     ["dinosaure", "ere", "epoque", "prehistoire", "reptile", "mesozoique"],
  cretace:        ["dinosaure", "ere", "epoque", "fin", "extinction", "prehistoire", "mesozoique"],
  fossile_dino:   ["dinosaure", "os", "roche", "ancien", "empreinte", "paleontologue", "musee"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏛️ Monuments & Merveilles du monde
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  monument:       ["construction", "ancien", "celebre", "visite", "histoire", "architecture", "patrimoine"],
  "tour eiffel":  ["paris", "france", "fer", "monument", "haut", "gustave eiffel", "celebre"],
  colisee:        ["rome", "gladiateur", "romain", "monument", "arene", "antique", "combat"],
  "grande muraille":["chine", "mur", "long", "monument", "protection", "empereur", "histoire"],
  "machu picchu": ["perou", "inca", "montagne", "monument", "ancien", "mystere", "ruine"],
  "taj mahal":    ["inde", "marbre", "blanc", "monument", "amour", "mogol", "mausolee"],
  parthenon:      ["grece", "athenes", "temple", "monument", "colonne", "antique", "athena"],
  "statue liberte":["new york", "amerique", "france", "cadeau", "monument", "liberte", "torche"],
  "christ redempteur":["bresil", "rio", "statue", "monument", "montagne", "bras", "celebre"],
  stonehenge:     ["angleterre", "pierre", "cercle", "ancien", "mystere", "monument", "solstice"],
  "mont rushmore":["amerique", "president", "sculpture", "montagne", "monument", "visage"],
  alhambra:       ["espagne", "palais", "arabe", "monument", "jardin", "architecture", "grenade"],
  versailles:     ["france", "chateau", "roi", "jardin", "monument", "soleil", "louis"],
  "notre dame":   ["paris", "cathedrale", "monument", "gothique", "quasimodo", "histoire", "france"],
  acropole:       ["grece", "athenes", "temple", "monument", "antique", "colline", "parthenon"],
  petra:          ["jordanie", "roche", "rose", "monument", "ancien", "tresor", "desert"],
  "angkor wat":   ["cambodge", "temple", "monument", "jungle", "hindou", "bouddhiste", "ancien"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🤔 Philosophie enfantine
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  philosophie:    ["reflechir", "question", "sens", "vie", "penser", "sagesse", "idee", "pourquoi"],
  bonheur:        ["philosophie", "joie", "content", "vie", "sourire", "gratitude", "sens", "aimer"],
  liberte:        ["philosophie", "choix", "droit", "libre", "decision", "autonomie", "voler"],
  justice:        ["philosophie", "juste", "injuste", "egal", "droit", "partager", "regle", "equite"],
  verite:         ["philosophie", "vrai", "faux", "mentir", "honnetete", "confiance", "savoir"],
  amour_philo:    ["philosophie", "aimer", "coeur", "famille", "ami", "partager", "lien", "sentir"],
  bien_mal:       ["philosophie", "morale", "choix", "conscience", "juste", "regle", "valeur"],
  mort_philo:     ["philosophie", "vie", "cycle", "triste", "souvenir", "nature", "etoile", "memoire"],
  temps_philo:    ["philosophie", "passer", "grandir", "souvenir", "futur", "present", "attendre"],
  reve_philo:     ["philosophie", "imaginer", "dormir", "espoir", "futur", "desir", "possible"],
  difference:     ["philosophie", "unique", "respect", "diversite", "egal", "tolerance", "richesse"],
  partager_philo: ["philosophie", "generosite", "ami", "donner", "ensemble", "bonheur", "solidarite"],
  conscience:     ["philosophie", "penser", "savoir", "moral", "choix", "cerveau", "reflexion"],
  imagination:    ["philosophie", "creer", "reve", "inventer", "histoire", "possible", "art", "jeu"],
  sagesse:        ["philosophie", "reflechir", "calme", "experience", "ancien", "conseil", "patience"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎊 Fêtes du monde
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  diwali:         ["inde", "lumiere", "lampe", "fete", "joie", "hindou", "couleur", "famille"],
  ramadan:        ["islam", "jeuner", "lune", "fete", "partager", "priere", "famille", "solidarite"],
  hanukkah:       ["juif", "lumiere", "bougie", "menorah", "fete", "hiver", "miracle", "huit"],
  "nouvel an chinois":["chine", "dragon", "rouge", "fete", "lanterne", "zodiaque", "famille", "feu artifice"],
  holi:           ["inde", "couleur", "poudre", "fete", "printemps", "joie", "eau", "hindou"],
  "dia de muertos":["mexique", "mort", "fete", "souvenir", "fleur", "squelette", "famille", "tradition"],
  "fete lumiere": ["lyon", "france", "lumiere", "nuit", "spectacle", "decembre", "fete", "ville"],
  thanksgiving:   ["amerique", "repas", "famille", "gratitude", "dinde", "automne", "fete", "partage"],
  "fete nationale":["pays", "celebrer", "drapeau", "feu artifice", "juillet", "fete", "histoire", "liberte"],
  epiphanie:      ["galette", "roi", "feve", "couronne", "janvier", "fete", "partager"],
  chandeleur:     ["crepe", "fevrier", "bougie", "lumiere", "fete", "cuisine", "tradition"],
  mardi_gras:     ["carnaval", "deguisement", "fete", "beignet", "masque", "confetti", "danse"],
  "fete musique":  ["musique", "juin", "concert", "rue", "chanter", "jouer", "fete", "ete"],
  saint_valentin: ["amour", "coeur", "fleur", "fete", "fevrier", "carte", "bisou", "rouge"],
  poisson_avril:  ["blague", "dos", "rire", "avril", "fete", "farce", "humour", "poisson"],
  "nouvel an":    ["janvier", "minuit", "fete", "feu artifice", "voeux", "champagne", "compte a rebours"],
  "fete mere":    ["maman", "cadeau", "amour", "fleur", "fete", "mai", "poeme", "famille"],
  "fete pere":    ["papa", "cadeau", "amour", "fete", "juin", "famille", "bricolage"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 💡 Inventions célèbres
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  inventeur:      ["creer", "decouverte", "genie", "idee", "science", "technologie", "invention", "histoire"],
  ampoule:        ["invention", "edison", "lumiere", "electricite", "filament", "eclairage", "nuit"],
  imprimerie:     ["invention", "gutenberg", "livre", "papier", "lettre", "ecriture", "revolution"],
  roue:           ["invention", "ancien", "transport", "tourner", "voiture", "mouvement", "prehistoire"],
  boussole:       ["invention", "nord", "navigation", "aimant", "direction", "explorer", "chine"],
  parachute:      ["invention", "vinci", "voler", "tomber", "air", "securite", "saut"],
  vaccin_invention:["invention", "pasteur", "maladie", "proteger", "medecine", "sauver", "science"],
  dynamite:       ["invention", "nobel", "explosion", "puissant", "chimie", "construction"],
  "machine vapeur":["invention", "train", "revolution", "industrielle", "eau", "energie", "watt"],
  avion_invention:["invention", "wright", "voler", "moteur", "aile", "transport", "ciel"],
  telephone_invention:["invention", "bell", "parler", "distance", "communication", "son", "fil"],
  "internet invention":["invention", "reseau", "monde", "connecter", "information", "numerique", "revolution"],
  gps:            ["invention", "satellite", "position", "carte", "navigation", "technologie", "direction"],
  penicilline:    ["invention", "fleming", "bacterie", "medecine", "antibiotique", "sauver", "science"],
  lunette_invention:["invention", "galilee", "voir", "telescope", "lentille", "optique", "decouverte"],
  "machine a laver":["invention", "vetement", "propre", "eau", "electricite", "maison", "quotidien"],
  photographie_inv:["invention", "photo", "image", "lumiere", "souvenir", "appareil", "niepce"],
  fusee_invention:["invention", "espace", "propulsion", "astronaute", "explorer", "lune", "science"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚀 Métiers du futur
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "metier futur":     ["travail", "futur", "technologie", "robot", "innovation", "demain", "inventer"],
  "pilote drone":     ["metier futur", "drone", "voler", "technologie", "telecommande", "livraison", "camera"],
  "ingenieur robot":  ["metier futur", "robot", "construire", "programmer", "intelligence artificielle", "technologie", "machine"],
  "architecte spatial":["metier futur", "espace", "construire", "station", "lune", "mars", "habitat", "astronaute"],
  "medecin robot":    ["metier futur", "sante", "robot", "chirurgie", "precision", "technologie", "soigner"],
  "fermier vertical": ["metier futur", "agriculture", "ville", "plante", "etage", "ecologie", "nourriture", "hydroponique"],
  "designer 3d":      ["metier futur", "creer", "imprimante 3d", "objet", "design", "technologie", "art"],
  "explorateur ocean":["metier futur", "ocean", "profond", "sous-marin", "decouverte", "science", "mer"],
  "coach ia":         ["metier futur", "intelligence artificielle", "apprendre", "technologie", "humain", "ethique"],
  "specialiste cyber":["metier futur", "securite", "internet", "proteger", "hacker", "code", "technologie"],
  "bio-ingenieur":    ["metier futur", "biologie", "genetique", "sante", "science", "innovation", "cellule"],
  "urbaniste futur":  ["metier futur", "ville", "ecologie", "transport", "durable", "construire", "planifier"],
  "technicien eolien":["metier futur", "eolienne", "energie", "renouvelable", "reparer", "hauteur", "ecologie"],
  "createur realite virtuelle":["metier futur", "jeu video", "3d", "immersion", "technologie", "creer", "casque"],
  "data scientist":   ["metier futur", "donnee", "analyser", "ordinateur", "mathematique", "intelligence", "prediction"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏆 Records du monde
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  record:             ["monde", "plus", "incroyable", "champion", "exploit", "extreme", "guinness"],
  "record vitesse":   ["record", "rapide", "voiture", "avion", "courir", "usain bolt", "km/h", "sport"],
  "record taille":    ["record", "grand", "petit", "haut", "bas", "geant", "minuscule", "monde"],
  "record distance":  ["record", "loin", "marcher", "nager", "voler", "espace", "voyage", "exploration"],
  "record age":       ["record", "vieux", "ancien", "longtemps", "tortue", "arbre", "vivre", "centenaire"],
  "record animal":    ["record", "animal", "rapide", "grand", "fort", "guepard", "baleine", "elephant"],
  "record construction":["record", "batiment", "haut", "long", "pont", "tour", "gratte-ciel", "monde"],
  "record temperature":["record", "chaud", "froid", "desert", "pole", "extreme", "meteo", "climat"],
  "record profondeur":["record", "ocean", "fosse", "mariana", "profond", "pression", "exploration", "mer"],
  "record altitude":  ["record", "montagne", "everest", "haut", "sommet", "escalade", "alpiniste"],
  "record sport":     ["record", "olympique", "medaille", "champion", "athlete", "exploit", "score"],
  "record espace":    ["record", "astronaute", "loin", "longtemps", "orbite", "sortie", "iss", "espace"],
  "record nourriture":["record", "manger", "gros", "long", "gateau", "pizza", "cuisine", "incroyable"],
  guinness:           ["record", "livre", "monde", "officiel", "exploit", "incroyable", "certification"],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🌋 Phénomènes naturels
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "phenomene naturel":["nature", "terre", "puissant", "spectacle", "science", "catastrophe", "climat"],
  eruption:           ["volcan", "lave", "cendre", "magma", "explosion", "montagne", "phenomene naturel"],
  tornade:            ["vent", "tourbillon", "destructeur", "nuage", "vitesse", "meteo", "phenomene naturel"],
  ouragan:            ["vent", "tempete", "pluie", "ocean", "tropique", "oeil", "catastrophe", "phenomene naturel"],
  cyclone:            ["ouragan", "vent", "tempete", "ocean", "tropique", "phenomene naturel", "danger"],
  avalanche:          ["neige", "montagne", "glisser", "danger", "ski", "froid", "phenomene naturel"],
  "arc en ciel":      ["pluie", "soleil", "couleur", "lumiere", "refraction", "ciel", "phenomene naturel", "beau"],
  geyser:             ["eau", "chaud", "jaillir", "terre", "vapeur", "islande", "yellowstone", "phenomene naturel"],
  maree:              ["mer", "lune", "eau", "monter", "descendre", "plage", "gravite", "phenomene naturel"],
  foudre:             ["eclair", "orage", "electricite", "tonnerre", "danger", "ciel", "phenomene naturel"],
  brouillard:         ["eau", "nuage", "sol", "froid", "visibilite", "matin", "meteo", "phenomene naturel"],
  mirage:             ["desert", "chaud", "illusion", "lumiere", "eau", "optique", "phenomene naturel"],
  raz_de_maree:       ["tsunami", "vague", "ocean", "seisme", "cote", "catastrophe", "phenomene naturel"],
  "aurore polaire":   ["lumiere", "pole", "nuit", "couleur", "magnetique", "ciel", "spectacle", "phenomene naturel"],
  eclipse_naturel:    ["soleil", "lune", "ombre", "alignement", "rare", "ciel", "phenomene naturel", "spectacle"],
  grele:              ["glace", "pluie", "orage", "boule", "froid", "meteo", "phenomene naturel", "degat"],
  canicule:           ["chaleur", "ete", "temperature", "soleil", "eau", "sante", "meteo", "phenomene naturel"],
  mousson:            ["pluie", "asie", "saison", "inondation", "tropical", "vent", "phenomene naturel"],
  sable_mouvant:      ["sable", "piege", "enfoncer", "eau", "danger", "nature", "phenomene naturel"],
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
  // Substring containment (for compound words) — require high overlap to avoid false positives
  // e.g. "continent" should NOT match "content" (only 7/9 = 78% overlap is too low)
  const longer = Math.max(a.length, b.length);
  if (a.length >= 4 && b.includes(a) && a.length / longer >= 0.85) return 0.8;
  if (b.length >= 4 && a.includes(b) && b.length / longer >= 0.85) return 0.8;
  // Prefix match (require 80%+ of shorter word to match)
  const minLen = Math.min(a.length, b.length);
  if (minLen >= 4) {
    let shared = 0;
    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) shared++; else break;
    }
    if (shared >= 4 && shared / minLen >= 0.8) return 0.6 + (shared / minLen) * 0.2;
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
// DEBUG SCORING — exported for admin debug panel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface KBScoreBreakdown {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  emotion: string;
  priority: number;
  kwScore: number;
  qScore: number;
  containment: number;
  ctxBonus: number;
  rawScore: number;
  priorityFactor: number;
  finalScore: number;
  expandedTokens: string[];
  inputTokens: string[];
}

export async function debugScoreQuery(
  userText: string,
  childAge: number,
  limit: number = 20,
): Promise<{ results: KBScoreBreakdown[]; context: string[] }> {
  if (!userText || userText.length < 2) return { results: [], context: [...recentTopics] };

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("id, question, answer, keywords, emotion, priority, category, source_content_id")
    .eq("is_active", true)
    .lte("age_min", childAge)
    .gte("age_max", childAge)
    .order("priority", { ascending: false })
    .limit(300);

  if (error || !data?.length) return { results: [], context: [...recentTopics] };

  const inputTokens = tokenize(userText);
  if (inputTokens.length === 0) return { results: [], context: [...recentTopics] };

  const expandedInput = expandWithSemantics(inputTokens);
  const inputNorm = normalize(userText);

  const scored: KBScoreBreakdown[] = [];

  for (const entry of data) {
    const kwScore = scoreKeywords(inputTokens, expandedInput, entry.keywords || []);
    const qScore = scoreQuestion(inputTokens, entry.question);
    const containment = scoreFullContainment(inputNorm, normalize(entry.question));
    const ctxBonus = contextBonus(entry.keywords || []);
    const rawScore = Math.max(kwScore, qScore, containment) + ctxBonus;
    const priorityFactor = 0.5 + ((entry.priority || 5) / 10) * 0.5;
    const finalScore = rawScore * priorityFactor;

    if (finalScore > 0.01) {
      scored.push({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
        keywords: entry.keywords || [],
        category: entry.category || "",
        emotion: entry.emotion || "happy",
        priority: entry.priority || 5,
        kwScore,
        qScore,
        containment,
        ctxBonus,
        rawScore,
        priorityFactor,
        finalScore,
        expandedTokens: [...expandedInput],
        inputTokens,
      });
    }
  }

  scored.sort((a, b) => b.finalScore - a.finalScore);
  return { results: scored.slice(0, limit), context: [...recentTopics] };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN QUERY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function queryKnowledgeBase(
  userText: string,
  childAge: number
): Promise<BobbyBrainReply | null> {
  if (!userText || userText.length < 2) return null;

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
      
      const rawScore = Math.max(kwScore, qScore, containment) + ctxBonus;
      const priorityFactor = 0.5 + ((entry.priority || 5) / 10) * 0.5;
      const finalScore = rawScore * priorityFactor;

      if (finalScore > bestScore && finalScore >= 0.12) {
        bestScore = finalScore;
        bestMatch = entry;
      }
    }

    if (!bestMatch) return null;

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
