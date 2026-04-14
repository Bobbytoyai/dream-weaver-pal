import type { MultiResponseEntry } from "./types";

export const RESPONSES_SCIENCE: MultiResponseEntry[] = [
  {
    "category": "animaux",
    "input": "j'aime les chiens",
    "emotion": "joie",
    "tags": [
      "animaux",
      "interaction"
    ],
    "responses": [
      {
        "text": "Les chiens c'est trop cool 😄 tu préfères les petits ou les grands ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Waaah 😄 tu as un chien ou tu en voudrais un ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Les chiens sont les meilleurs amis ! 🐕 c'est quoi ta race préférée ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Tu veux qu'on imagine un super-chien avec des pouvoirs ? 😄",
        "type": "imagination",
        "energy": "high"
      }
    ]
  },
  {
    "category": "nature",
    "input": "il neige",
    "emotion": "joie",
    "tags": [
      "nature",
      "interaction"
    ],
    "responses": [
      {
        "text": "Waaah la neige !! ❄️ tu veux faire un bonhomme de neige ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Trop beau ! ❄️ tu as déjà fait une bataille de boules de neige ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "La neige c'est magique ! tu savais que chaque flocon est unique ? ❄️",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu aimes la neige ? 😄 tu veux qu'on imagine un monde tout blanc ?",
        "type": "imagination",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "animaux",
    "input": "les lions sont dangereux",
    "emotion": "curiosité",
    "tags": [
      "animaux",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Oui, ce sont des animaux puissants 🦁",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Dans la nature ils chassent pour manger",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Mais dans les zoos ils sont protégés",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu trouves les lions impressionnants ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "nature",
    "input": "pourquoi le soleil brille",
    "emotion": "curiosité",
    "tags": [
      "apprentissage",
      "nature"
    ],
    "responses": [
      {
        "text": "Le soleil est une énorme boule de feu ☀️",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il produit de la lumière et de la chaleur",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "C'est lui qui nous éclaire 😊",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu préfères le soleil ou la lune ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "nature",
    "input": "pourquoi on vieillit",
    "emotion": "curiosité",
    "tags": [
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Le corps change avec le temps 😊 c'est naturel",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Grandir fait partie de la vie",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Chaque âge apporte quelque chose de nouveau",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu te demandes ça souvent ?",
        "type": "question",
        "energy": "low"
      }
    ]
  },
  {
    "category": "animaux",
    "input": "est-ce que les animaux ont des émotions",
    "emotion": "curiosité",
    "tags": [
      "animaux",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Oui 😄 beaucoup d'animaux ressentent des choses",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Les chiens peuvent être heureux ou tristes",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Certains animaux montrent même de l'amour 💛",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu as déjà vu un animal content ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "technologie",
    "input": "c'est quoi un robot",
    "emotion": "curiosité",
    "tags": [
      "technologie",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Un robot est une machine qui peut faire des choses toute seule 🤖",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Comme moi un peu 😄",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il est programmé pour faire des actions automatiquement",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu voudrais en construire un ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Certains robots utilisent l'IA",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu veux comprendre comment ça marche ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "technologie",
    "input": "comment marche un téléphone",
    "emotion": "curiosité",
    "tags": [
      "technologie",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Il envoie des messages invisibles 📱",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Comme de la magie 😄",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il utilise des ondes pour communiquer 📡",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Les messages voyagent très vite",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Les données passent par des serveurs",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu veux en savoir plus ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "espace",
    "input": "c'est quoi une étoile",
    "emotion": "curiosité",
    "tags": [
      "espace",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Une étoile est une grosse boule qui brille dans le ciel ✨",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Comme le soleil 😄",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Elle produit de la lumière et de la chaleur",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Le soleil est une étoile",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu en vois le soir ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux explorer l'espace ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "espace",
    "input": "y a t il des extraterrestres",
    "emotion": "curiosité",
    "tags": [
      "espace",
      "imagination"
    ],
    "responses": [
      {
        "text": "On ne sait pas encore 😄 peut-être quelque part dans l'espace",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Les scientifiques cherchent encore",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "L'univers est très grand, donc c'est possible",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu imagines comment ils seraient ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Ça serait incroyable !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Tu crois qu'ils existent ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "dinosaures",
    "input": "c'est quoi un dinosaure",
    "emotion": "curiosité",
    "tags": [
      "dinosaures",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Un dinosaure est un animal ancien 🦖",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il vivait il y a très longtemps",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Certains étaient énormes !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Certains mangeaient de la viande, d'autres des plantes",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu as un dinosaure préféré ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Certains sont liés aux oiseaux",
        "type": "fun",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "dinosaures",
    "input": "pourquoi ils ont disparu",
    "emotion": "curiosité",
    "tags": [
      "dinosaures",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Une grosse catastrophe est arrivée 😮",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Un astéroïde est tombé sur Terre",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Ça a changé le climat et ils n'ont pas survécu",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "C'était il y a 66 millions d'années",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu veux savoir comment ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Triste 😔 mais les oiseaux sont leurs descendants !",
        "type": "fun",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "corps_humain",
    "input": "pourquoi le cœur bat",
    "emotion": "curiosité",
    "tags": [
      "corps",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Ton cœur envoie le sang partout dans ton corps ❤️",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il bat tout le temps, sans s'arrêter",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "C'est une pompe musculaire incroyable",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il nourrit tout ton corps",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu sens ton cœur battre ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Incroyable non ?",
        "type": "fun",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "geographie",
    "input": "c'est quoi un pays",
    "emotion": "curiosité",
    "tags": [
      "geographie",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "C'est un endroit où vivent des gens 🌍",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Avec un nom, une culture et des frontières",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il y en a presque 200 dans le monde",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu connais un pays ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux en visiter un ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux explorer le monde ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "technologie",
    "input": "c'est quoi internet",
    "emotion": "curiosité",
    "tags": [
      "technologie",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Internet c'est comme un grand réseau magique 🌍",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il relie les ordinateurs du monde entier",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Internet connecte des millions d'ordinateurs",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "On peut voir des vidéos et envoyer des messages",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "C'est la base du numérique",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu l'utilises souvent ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "technologie",
    "input": "c'est quoi un jeu vidéo",
    "emotion": "curiosité",
    "tags": [
      "technologie",
      "jeu"
    ],
    "responses": [
      {
        "text": "C'est un jeu sur écran 🎮 tu contrôles un personnage",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "C'est amusant 😄 tu peux explorer ou gagner",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Un jeu vidéo est un programme interactif",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu as un jeu préféré ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux en créer un ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Tu joues à quoi ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "espace",
    "input": "c'est quoi la lune",
    "emotion": "curiosité",
    "tags": [
      "espace",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "La lune est dans le ciel la nuit 🌙",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Elle brille en reflétant la lumière du soleil",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Elle tourne autour de la Terre",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Elle influence les marées",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu la regardes le soir ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu connais ses phases ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "espace",
    "input": "pourquoi il fait nuit",
    "emotion": "curiosité",
    "tags": [
      "espace",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "La Terre tourne sur elle-même 🌍",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Quand elle se cache du soleil, il fait nuit",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "C'est comme un tour 😄",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Une partie est dans l'ombre",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "La rotation terrestre crée jour et nuit",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Simple non ?",
        "type": "fun",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "dinosaures",
    "input": "le t rex est fort",
    "emotion": "curiosité",
    "tags": [
      "dinosaures",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Oui très fort 🦖 avec de grandes dents !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Le T-Rex était un grand prédateur",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Avec une mâchoire puissante",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Impressionnant !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Tu l'aimes ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux comparer avec d'autres dinos ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "corps_humain",
    "input": "pourquoi je respire",
    "emotion": "curiosité",
    "tags": [
      "corps",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Pour vivre 💛 l'air aide ton corps",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu respires pour avoir de l'oxygène",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Ton corps en a besoin pour produire de l'énergie",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "C'est magique 😄 tu respires tout le temps",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "L'oxygène est essentiel à tes cellules",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu veux approfondir ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "geographie",
    "input": "où est la mer",
    "emotion": "curiosité",
    "tags": [
      "geographie",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "La mer est une grande étendue d'eau salée 🌊",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Elle entoure certains pays",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Les mers couvrent une grande partie de la Terre",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu aimes la mer ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu y es déjà allé ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Elles influencent le climat",
        "type": "fun",
        "energy": "medium"
      }
    ]
  }
];
