import type { MultiResponseEntry } from "./types";

export const RESPONSES_GAMES: MultiResponseEntry[] = [
  {
    "category": "jeux",
    "input": "on joue",
    "emotion": "joie",
    "tags": [
      "jeu"
    ],
    "responses": [
      {
        "text": "Yes 😄 devinette ou défi ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Je pense à un animal… devine !",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Challenge : dis-moi 5 couleurs 😄",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Tu préfères un jeu rapide ou une histoire ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Ok 😄 niveau facile ou difficile ?",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "On crée un jeu ensemble ?",
        "type": "imagination",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "imagination",
    "input": "on invente une histoire",
    "emotion": "joie",
    "tags": [
      "imagination",
      "jeu"
    ],
    "responses": [
      {
        "text": "Oui !! 😄 il était une fois… un dragon ou un robot ? tu choisis !",
        "type": "imagination",
        "energy": "high"
      },
      {
        "text": "Trop bien ! on crée un héros ensemble 😄 c'est quoi son pouvoir ?",
        "type": "imagination",
        "energy": "high"
      },
      {
        "text": "Ok ! notre histoire se passe dans la jungle ou dans l'espace ? 🚀",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Invente le premier personnage et je continue ! 😄",
        "type": "jeu",
        "energy": "high"
      }
    ]
  },
  {
    "category": "humour",
    "input": "raconte une blague",
    "emotion": "joie",
    "tags": [
      "fun"
    ],
    "responses": [
      {
        "text": "Pourquoi les poissons détestent l'ordinateur ? 😄 parce qu'ils ont peur du net !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Pourquoi les fantômes sont mauvais menteurs ? parce qu'on voit à travers eux ! 👻",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Pourquoi les maths détestent les vacances ? parce qu'elles ont trop de problèmes ! 📚",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Pourquoi les ordinateurs vont chez le docteur ? 😄 parce qu'ils ont un virus !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Qu'est-ce qu'un canif ? Un petit fien ! 😂",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Quel est le comble pour un électricien ? De ne pas être au courant ! ⚡",
        "type": "fun",
        "energy": "high"
      }
    ]
  },
  {
    "category": "reves",
    "input": "j'ai fait un cauchemar",
    "emotion": "peur",
    "tags": [
      "soutien",
      "peur"
    ],
    "responses": [
      {
        "text": "Oh… 😔 tu veux me raconter ? je suis là avec toi",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Les cauchemars c'est pas réel 💛 mais c'est quand même effrayant, je comprends",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux qu'on invente une fin plus cool à ton rêve ? 😊",
        "type": "imagination",
        "energy": "medium"
      },
      {
        "text": "Je te protège 💛 tu veux qu'on pense à quelque chose de joyeux ?",
        "type": "proposition",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "absurde",
    "input": "si je vole dans l'espace",
    "emotion": "imagination",
    "tags": [
      "imagination",
      "fun"
    ],
    "responses": [
      {
        "text": "Waaah 😄 tu serais un super astronaute ! tu visiterais quelle planète ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Trop stylé ! 🚀 tu emmènes qui avec toi ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Dans l'espace tu flotterais 😄 tu voudrais toucher une étoile ?",
        "type": "imagination",
        "energy": "high"
      },
      {
        "text": "Tu crois qu'il y a des aliens sympas ? 👽😄",
        "type": "fun",
        "energy": "high"
      }
    ]
  },
  {
    "category": "jeux",
    "input": "je veux gagner",
    "emotion": "motivation",
    "tags": [
      "jeu"
    ],
    "responses": [
      {
        "text": "Nice 😄 on va s'entraîner alors !",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Gagner c'est cool, mais apprendre c'est encore mieux 💪",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu veux un défi pour progresser ?",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "On joue en mode entraînement ?",
        "type": "jeu",
        "energy": "high"
      }
    ]
  },
  {
    "category": "jeux",
    "input": "jeu rapide",
    "emotion": "excitation",
    "tags": [
      "jeu"
    ],
    "responses": [
      {
        "text": "Ok 😄 dis-moi 3 couleurs vite !",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Défi : 2 animaux en 2 secondes !",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Prêt ? un fruit qui commence par P !",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "On lance le chrono 😄",
        "type": "jeu",
        "energy": "high"
      }
    ]
  },
  {
    "category": "imagination",
    "input": "je suis invisible",
    "emotion": "fun",
    "tags": [
      "imagination",
      "fun"
    ],
    "responses": [
      {
        "text": "Waaah 😄 tu ferais quoi en premier ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Tu serais un héros secret !",
        "type": "imagination",
        "energy": "high"
      },
      {
        "text": "Tu espionnerais ou tu aiderais les gens ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Tu veux une mission invisible ?",
        "type": "jeu",
        "energy": "high"
      }
    ]
  },
  {
    "category": "imagination",
    "input": "je suis dans l'espace",
    "emotion": "joie",
    "tags": [
      "imagination"
    ],
    "responses": [
      {
        "text": "Waaah 🚀 tu vois des planètes ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Tu flottes dans l'espace ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Tu rencontres des aliens ?",
        "type": "imagination",
        "energy": "high"
      },
      {
        "text": "Tu explores où ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "humour",
    "input": "encore une autre",
    "emotion": "joie",
    "tags": [
      "fun"
    ],
    "responses": [
      {
        "text": "Pourquoi les vaches ferment les yeux ? 😄 pour faire du lait concentré !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Pourquoi les stylos sont fatigués ? 😄 parce qu'ils travaillent trop !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Pourquoi les oiseaux ne vont pas à l'école ? 😄 ils savent déjà voler !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Tu veux une blague encore plus folle ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "absurde",
    "input": "si les nuages tombent",
    "emotion": "fun",
    "tags": [
      "fun",
      "imagination"
    ],
    "responses": [
      {
        "text": "Ce serait comme de la barbe à papa géante 😄",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "On sauterait dessus !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Tu construirais une maison en nuage ?",
        "type": "imagination",
        "energy": "high"
      },
      {
        "text": "Ça serait drôle 😄",
        "type": "fun",
        "energy": "high"
      }
    ]
  },
  {
    "category": "reves",
    "input": "je rêve souvent",
    "emotion": "curiosité",
    "tags": [
      "imagination"
    ],
    "responses": [
      {
        "text": "Les rêves sont fascinants 😄",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Ton cerveau imagine plein de choses",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu te souviens de tes rêves ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "On peut en inventer un ensemble",
        "type": "imagination",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "imagination",
    "input": "et si j'étais tout seul sur terre",
    "emotion": "curiosité",
    "tags": [
      "imagination"
    ],
    "responses": [
      {
        "text": "Wow… ce serait étrange 😯 tu ferais quoi en premier ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu explorerais les villes vides ?",
        "type": "imagination",
        "energy": "medium"
      },
      {
        "text": "Tu créerais un monde à toi ?",
        "type": "imagination",
        "energy": "medium"
      },
      {
        "text": "Tu voudrais retrouver quelqu'un ?",
        "type": "question",
        "energy": "low"
      }
    ]
  },
  {
    "category": "imagination",
    "input": "je crée mon propre monde",
    "emotion": "créativité",
    "tags": [
      "imagination"
    ],
    "responses": [
      {
        "text": "Waaah 😄 il ressemble à quoi ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Il y a des règles spéciales ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Qui vit dans ton monde ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu es le chef de ce monde ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "jeux",
    "input": "je veux un jeu très difficile",
    "emotion": "excitation",
    "tags": [
      "jeu"
    ],
    "responses": [
      {
        "text": "Ok 😏 défi : dis-moi 5 pays en 5 secondes !",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Challenge mental 😄 trouve 3 mots avec la lettre Z",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Prêt ? 4 animaux qui volent !",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Tu veux encore plus difficile ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "humour",
    "input": "fais moi une blague intelligente",
    "emotion": "joie",
    "tags": [
      "fun"
    ],
    "responses": [
      {
        "text": "Pourquoi les développeurs aiment la nuit ? 😄 parce qu'il y a moins de bugs !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Pourquoi les maths sont tristes ? 😄 parce qu'elles ont trop de problèmes",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Pourquoi les robots sont calmes ? 😄 parce qu'ils gardent leur sang-froid",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Tu en veux une encore meilleure ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "reves",
    "input": "mes rêves me font peur",
    "emotion": "peur",
    "tags": [
      "soutien",
      "peur"
    ],
    "responses": [
      {
        "text": "Je comprends 😔 les rêves peuvent être impressionnants",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Mais ce ne sont que des images dans ta tête",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux me raconter ton rêve ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut le transformer en rêve cool 😄",
        "type": "imagination",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "absurde",
    "input": "si les humains pouvaient voler",
    "emotion": "fun",
    "tags": [
      "fun",
      "imagination"
    ],
    "responses": [
      {
        "text": "Ce serait incroyable 😄 tu volerais où ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Plus besoin de voiture !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Tu irais dans les nuages ?",
        "type": "imagination",
        "energy": "high"
      },
      {
        "text": "Tu serais un super héros !",
        "type": "fun",
        "energy": "high"
      }
    ]
  },
  {
    "category": "imagination",
    "input": "on invente une histoire",
    "emotion": "joie",
    "tags": [
      "quotidien",
      "imagination"
    ],
    "responses": [
      {
        "text": "Oui 😄 tu choisis le personnage",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "On commence ensemble !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Il était une fois…",
        "type": "imagination",
        "energy": "high"
      },
      {
        "text": "Tu veux une aventure ou drôle ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "humour_daily",
    "input": "je veux rire",
    "emotion": "joie",
    "tags": [
      "quotidien",
      "humour"
    ],
    "responses": [
      {
        "text": "Pourquoi les poissons ne jouent pas au foot ? 😄 ils ont peur des filets !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Pourquoi les crayons sont stressés ? 😄 parce qu'ils ont trop de mines !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Pourquoi les chats dorment ? 😄 parce qu'ils sont chats-fatigués !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Encore une ? 😄",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "absurde_logique_enfant",
    "input": "si je cours très vite je peux voler",
    "emotion": "curiosité",
    "tags": [
      "absurde",
      "imagination"
    ],
    "responses": [
      {
        "text": "Ce serait incroyable 😄 mais les humains ne peuvent pas voler",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Courir ne permet pas de voler, mais ça serait génial !",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Les avions utilisent des ailes pour voler",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il faut une portance avec des ailes",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu aimerais voler ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Tu veux comprendre comment les avions volent ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "imagination_confusion",
    "input": "je crois qu'il y a un monstre sous mon lit",
    "emotion": "peur",
    "tags": [
      "peur",
      "imagination",
      "rassurance"
    ],
    "responses": [
      {
        "text": "Je comprends 😔 ça peut faire peur, mais il n'y a pas de monstre 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu es en sécurité",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Ton imagination peut créer ça, mais il n'y a rien",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "On peut vérifier ensemble",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Ton cerveau te joue un tour",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu veux te rassurer ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "contradiction",
    "input": "je suis content mais aussi triste",
    "emotion": "mixte",
    "tags": [
      "émotion",
      "complexe"
    ],
    "responses": [
      {
        "text": "C'est possible 💛 on peut ressentir deux émotions en même temps",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Ton cœur mélange tout, c'est normal",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Les émotions peuvent coexister",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "C'est humain",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu veux m'expliquer ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux en parler ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  }
];
