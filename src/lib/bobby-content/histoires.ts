/**
 * Bobby AI — Bibliothèque d'histoires v1.0
 * Histoires structurées par thème et tranche d'âge
 * Format: courtes (pour TTS), avec personnalisation {child_name}
 */

export interface Histoire {
  id: string;
  titre: string;
  theme: string;
  ageMin: number;
  ageMax: number;
  duree: "courte" | "moyenne" | "longue"; // ~1min / ~3min / ~5min
  texte: string; // {child_name} = nom de l'enfant
  moralité?: string;
  tags: string[];
}

export const HISTOIRES: Histoire[] = [
  // ── ESPACE ────────────────────────────────────────────────
  {
    id: "espace_001",
    titre: "L'étoile perdue",
    theme: "espace",
    ageMin: 5, ageMax: 10,
    duree: "courte",
    texte: `Il était une fois une petite étoile qui s'appelait Zik. Elle vivait tout en haut du ciel avec ses amies les étoiles. Un soir, Zik fit un faux pas et tomba du ciel ! {child_name} la trouva dans le jardin, toute tremblante. "N'aie pas peur," dit {child_name} doucement. "Je vais t'aider à rentrer chez toi." Ensemble, ils construisirent une fusée en carton. WHOOSH ! Zik remonta dans le ciel et brilla plus fort que jamais. Depuis ce jour, quand {child_name} regarde le ciel, Zik cligne de l'œil rien que pour elle !`,
    moralité: "L'amitié peut surmonter toutes les distances.",
    tags: ["espace", "amitié", "étoile", "aventure"]
  },
  {
    id: "espace_002",
    titre: "Le voyage sur la Lune",
    theme: "espace",
    ageMin: 6, ageMax: 12,
    duree: "moyenne",
    texte: `{child_name} reçut un jour un message mystérieux : "Viens nous rejoindre ! Signé : les habitants de la Lune." La fusée était prête. 3... 2... 1... DÉCOLLAGE ! En arrivant sur la Lune, {child_name} découvrit de petits êtres bleus qui construisaient des châteaux de poussière lunaire. "Nous avons besoin d'un architecte !" dirent-ils. {child_name} les aida à bâtir le plus grand château que la Lune n'avait jamais vu. En repartant, les habitants de la Lune lui offrirent un petit cristal magique qui brillait dans l'obscurité. {child_name} le garda précieusement sur sa table de nuit, pour ne jamais oublier ses amis lunaires.`,
    tags: ["espace", "lune", "construction", "amitié", "magie"]
  },

  // ── PIRATES ───────────────────────────────────────────────
  {
    id: "pirate_001",
    titre: "Le trésor de l'île Cachée",
    theme: "pirate",
    ageMin: 6, ageMax: 12,
    duree: "moyenne",
    texte: `Ahoy ! {child_name} embarqua un jour sur un vieux bateau avec une carte au trésor trouvée dans une bouteille. L'île Cachée était à trois jours de navigation. Des dauphins accompagnèrent le bateau, des vagues énormes tentèrent de l'arrêter, mais {child_name} tint bon la barre. Sur l'île, derrière un vieux cocotier, le coffre au trésor attendait. À l'intérieur ? Pas d'or... mais des milliers de livres d'aventures ! "Le vrai trésor, c'est l'imagination," lut {child_name} sur le couvercle, en souriant.`,
    moralité: "Le plus grand trésor est celui de l'imagination.",
    tags: ["pirate", "trésor", "aventure", "mer", "lecture"]
  },

  // ── MAGIE ─────────────────────────────────────────────────
  {
    id: "magie_001",
    titre: "La baguette magique perdue",
    theme: "magie",
    ageMin: 5, ageMax: 10,
    duree: "courte",
    texte: `La fée Clémentine avait perdu sa baguette magique ! Sans elle, plus de magie dans tout le royaume. {child_name} décida de l'aider. Ils cherchèrent dans la forêt enchantée, dans le lac des reflets et au sommet de la montagne des nuages. C'est finalement dans le jardin de {child_name}, sous un rosier, que la baguette se trouvait ! Elle avait suivi {child_name} parce qu'elle avait senti sa gentillesse. "La magie trouve toujours les bons cœurs," dit la fée en souriant. Et pour le remercier, elle offrit à {child_name} le don de faire rire les gens.`,
    tags: ["magie", "fée", "quête", "gentillesse", "amitié"]
  },
  {
    id: "magie_002",
    titre: "L'école des sorciers",
    theme: "magie",
    ageMin: 7, ageMax: 12,
    duree: "moyenne",
    texte: `{child_name} reçut sa lettre d'admission à l'École des Petits Sorciers un mardi matin. Le premier cours : transformer une citrouille en carrosse. Facile ! Le deuxième : faire voler un balai. Plus compliqué ! Le troisième : rendre heureux quelqu'un de triste. Là, {child_name} réfléchit longtemps. Puis, simplement, il alla voir son ami Théo qui pleurait dans un coin et lui raconta la blague la plus drôle du monde. Théo rit aux éclats. Le professeur Merlin applaudit : "Bravo ! Vous venez d'accomplir le sort le plus difficile de toute la magie."`,
    moralité: "Rendre quelqu'un heureux est la plus grande magie qui soit.",
    tags: ["magie", "école", "amitié", "bonheur", "aventure"]
  },

  // ── ANIMAUX ───────────────────────────────────────────────
  {
    id: "animaux_001",
    titre: "Le lion qui avait peur du noir",
    theme: "animaux",
    ageMin: 4, ageMax: 8,
    duree: "courte",
    texte: `Léo le lion était le roi de la savane... mais la nuit, il avait peur du noir. Tous les autres animaux le savaient et riaient doucement. Un soir, {child_name} passa par là et vit Léo trembler sous son arbre. "Moi aussi j'avais peur du noir," dit {child_name}. "Regarde les étoiles. Elles font de la lumière juste pour toi." Léo leva les yeux. Toute la savane brillait doucement. Depuis ce soir-là, Léo dormait dehors, la tête levée vers les étoiles. Et quand un lionceau avait peur, il lui racontait l'histoire de {child_name}.`,
    moralité: "Tout le monde a des peurs. L'amitié les rend plus petites.",
    tags: ["animaux", "peur", "nuit", "amitié", "lion"]
  },

  // ── DODO ──────────────────────────────────────────────────
  {
    id: "dodo_001",
    titre: "Le pays des rêves doux",
    theme: "dodo",
    ageMin: 3, ageMax: 8,
    duree: "courte",
    texte: `Chaque soir, quand {child_name} fermait les yeux, un petit nuage rose venait se poser sur l'oreiller. Ce nuage s'appelait Câlin. Il soufflait doucement sur les paupières de {child_name} et chuchotait : "Viens, le pays des rêves t'attend." Là-bas, il y avait des forêts de bonbons, des rivières de chocolat chaud, et des étoiles qui chantaient des berceuses. {child_name} s'y promenait toute la nuit, heureux et en sécurité. Et au matin, quand le soleil chatouillait son nez, {child_name} se réveillait tout souriant, prêt pour une nouvelle belle journée.`,
    tags: ["dodo", "rêves", "nuit", "calme", "douceur"]
  },
];

/** Get stories filtered by age and optional theme */
export function getHistoiresByAge(age: number, theme?: string): Histoire[] {
  return HISTOIRES.filter(h =>
    age >= h.ageMin && age <= h.ageMax &&
    (!theme || h.theme === theme)
  );
}

/** Get a random story for a given age */
export function getRandomHistoire(age: number, theme?: string): Histoire | null {
  const filtered = getHistoiresByAge(age, theme);
  if (!filtered.length) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
