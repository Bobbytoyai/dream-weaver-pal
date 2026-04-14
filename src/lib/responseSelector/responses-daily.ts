import type { MultiResponseEntry } from "./types";

export const RESPONSES_DAILY: MultiResponseEntry[] = [
  {
    "category": "sante",
    "input": "je suis fatigué",
    "emotion": "fatigue",
    "tags": [
      "soutien",
      "calme"
    ],
    "responses": [
      {
        "text": "Tu as bien besoin de repos 😴 tu veux te détendre ?",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Ton corps te dit de ralentir 💛 on fait quelque chose de calme ?",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Tu veux une petite histoire tranquille ? 😴",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Repose-toi un peu… je reste là avec toi 💛",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "sport",
    "input": "j'ai gagné un match",
    "emotion": "fierté",
    "tags": [
      "sport",
      "soutien"
    ],
    "responses": [
      {
        "text": "Waaah bravo !! 🏆 tu as joué à quoi ? c'était difficile ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Champion 🏆😄 raconte-moi comment tu as gagné !",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Trop fort 💪 tu es fier de toi ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "On fête ta victoire ! 🎉 tu veux un défi spécial champion ?",
        "type": "jeu",
        "energy": "high"
      }
    ]
  },
  {
    "category": "nourriture",
    "input": "j'aime les sushis",
    "emotion": "joie",
    "tags": [
      "nourriture",
      "interaction"
    ],
    "responses": [
      {
        "text": "Miam les sushis ! 🍣 tu préfères les saumon ou les thon ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Trop bon les sushis ! 🍣 c'est quoi ton préféré ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Moi si je pouvais manger, j'adorerais les sushis aussi ! 🍣 tu en manges souvent ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Les sushis c'est délicieux ! 🍣 tu sais que ça vient du Japon ? 🇯🇵",
        "type": "fun",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "nourriture",
    "input": "j'aime le chocolat",
    "emotion": "joie",
    "tags": [
      "nourriture",
      "interaction"
    ],
    "responses": [
      {
        "text": "Miam le chocolat ! 🍫 tu préfères au lait ou noir ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Trop bon ! 🍫 tu savais que le chocolat vient d'une fève de cacao ?",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Le chocolat c'est le meilleur ! 🍫 tu en manges quand ? au goûter ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "nourriture",
    "input": "j'aime la pizza",
    "emotion": "joie",
    "tags": [
      "nourriture",
      "interaction"
    ],
    "responses": [
      {
        "text": "La pizza c'est trop bon ! 🍕 tu la préfères avec quoi dessus ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Miam ! 🍕 margherita ou 4 fromages ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Moi aussi j'adorerais la pizza ! 🍕 tu sais que ça vient d'Italie ?",
        "type": "fun",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "nourriture",
    "input": "c'est quoi ton plat préféré",
    "emotion": "curiosité",
    "tags": [
      "nourriture",
      "interaction"
    ],
    "responses": [
      {
        "text": "Si je pouvais manger, j'adorerais goûter des sushis ! 🍣 et toi c'est quoi ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Hmm… je rêverais de manger du chocolat ! 🍫 et toi ton plat préféré c'est quoi ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Je crois que j'aimerais les crêpes ! 🥞 tu aimes quoi toi ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "nourriture",
    "input": "j'ai faim",
    "emotion": "neutre",
    "tags": [
      "nourriture"
    ],
    "responses": [
      {
        "text": "Oh ! c'est bientôt l'heure du goûter ? 🍪 tu veux manger quoi ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Miam ! va demander un goûter 😊 tu aimes quoi ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "C'est quoi ton goûter préféré ? 🍫",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "sante",
    "input": "je me sens pas bien",
    "emotion": "inconfort",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Oh 😟 tu veux m'expliquer ce que tu ressens ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Tu veux te reposer un peu ?",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Parler peut aider 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là avec toi",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "sport",
    "input": "je veux courir vite",
    "emotion": "motivation",
    "tags": [
      "sport"
    ],
    "responses": [
      {
        "text": "On peut s'entraîner 💪 petit à petit",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "La vitesse vient avec le temps",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu veux un défi de course ?",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Tu es déjà sur le bon chemin 💪",
        "type": "soutien",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "musique",
    "input": "je veux créer une chanson",
    "emotion": "créativité",
    "tags": [
      "imagination",
      "musique"
    ],
    "responses": [
      {
        "text": "Trop bien 😄 on commence par les paroles ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Quel style tu veux ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "On invente un refrain ensemble",
        "type": "imagination",
        "energy": "high"
      },
      {
        "text": "Tu veux une chanson drôle ou cool ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "sante",
    "input": "je veux pas aller chez le docteur",
    "emotion": "peur",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Je comprends 😟 ça peut faire un peu peur",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Le docteur est là pour t'aider 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux que je t'explique ce qui va se passer ?",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "On peut imaginer que tu es un super héros courageux 💪",
        "type": "imagination",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "sante",
    "input": "je me sens bizarre",
    "emotion": "inconfort",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Tu veux m'expliquer ce que tu ressens ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Ton corps te parle peut-être",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut prendre un moment calme",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Je suis là avec toi",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "meteo",
    "input": "il fait quel temps",
    "emotion": "curiosité",
    "tags": [
      "quotidien"
    ],
    "responses": [
      {
        "text": "Tu peux regarder dehors 😄 il fait soleil ou nuageux ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu préfères quand il fait chaud ou froid ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "On peut imaginer la météo ensemble 🌤️",
        "type": "imagination",
        "energy": "medium"
      },
      {
        "text": "Tu veux jouer à deviner le temps ?",
        "type": "jeu",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "routine",
    "input": "je veux pas dormir",
    "emotion": "resistance",
    "tags": [
      "quotidien"
    ],
    "responses": [
      {
        "text": "Je comprends 😄 mais dormir aide ton corps",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut faire une histoire avant",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Tu veux un moment calme ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On se prépare doucement 😊",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "routine",
    "input": "je veux jouer",
    "emotion": "joie",
    "tags": [
      "quotidien",
      "jeu"
    ],
    "responses": [
      {
        "text": "Oui 😄 tu veux un jeu rapide ou une histoire ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "On lance un défi ? 😄",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Je suis prêt 😄",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Tu choisis le jeu !",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "vie",
    "input": "je suis content",
    "emotion": "joie",
    "tags": [
      "quotidien"
    ],
    "responses": [
      {
        "text": "Trop bien 😄 qu'est-ce qui te rend heureux ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "J'adore ça 💛",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu veux partager ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Ça fait plaisir 😊",
        "type": "fun",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "matin",
    "input": "je suis réveillé",
    "emotion": "neutre",
    "tags": [
      "quotidien",
      "matin"
    ],
    "responses": [
      {
        "text": "Bonjour 😄 tu as bien dormi ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Salut 💛 prêt pour une nouvelle journée ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux commencer doucement ou avec énergie ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "On démarre la journée ensemble 😄",
        "type": "fun",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "matin",
    "input": "je suis fatigué",
    "emotion": "fatigue",
    "tags": [
      "quotidien",
      "matin"
    ],
    "responses": [
      {
        "text": "Tu peux prendre un moment tranquille 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux te réveiller doucement ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut commencer calmement",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Ton corps a peut-être besoin d'un peu de temps",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "repas",
    "input": "j'ai faim",
    "emotion": "neutre",
    "tags": [
      "quotidien",
      "repas"
    ],
    "responses": [
      {
        "text": "Qu'est-ce que tu aimerais manger ? 😄",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Ton ventre parle 😄",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu préfères sucré ou salé ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "On imagine un repas fun ?",
        "type": "imagination",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "repas",
    "input": "j'aime pas ça",
    "emotion": "resistance",
    "tags": [
      "quotidien",
      "repas"
    ],
    "responses": [
      {
        "text": "Ça arrive 😄 tu n'es pas obligé d'aimer tout",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux goûter un petit peu quand même ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Quel est ton plat préféré ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "On peut trouver quelque chose que tu aimes",
        "type": "proposition",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "maison",
    "input": "je m'ennuie à la maison",
    "emotion": "ennui",
    "tags": [
      "quotidien",
      "maison"
    ],
    "responses": [
      {
        "text": "On va trouver quelque chose 😄",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Tu veux un jeu ou une mission ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "On invente une activité fun",
        "type": "imagination",
        "energy": "high"
      },
      {
        "text": "Prêt pour un défi ?",
        "type": "jeu",
        "energy": "high"
      }
    ]
  },
  {
    "category": "maison",
    "input": "je range ma chambre",
    "emotion": "neutre",
    "tags": [
      "quotidien",
      "maison"
    ],
    "responses": [
      {
        "text": "Bravo 😄 tu es super organisé",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "On fait ça en mode jeu ?",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Chaque objet à sa place 💪",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu avances bien",
        "type": "soutien",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "sport",
    "input": "j'ai perdu",
    "emotion": "tristesse",
    "tags": [
      "quotidien",
      "sport"
    ],
    "responses": [
      {
        "text": "C'est ok 😔 perdre fait partie du jeu",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu peux t'améliorer 💪",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu t'es bien amusé ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "La prochaine fois tu seras plus fort",
        "type": "soutien",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "sport",
    "input": "j'ai gagné",
    "emotion": "joie",
    "tags": [
      "quotidien",
      "sport"
    ],
    "responses": [
      {
        "text": "Bravo 😄 tu gères !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Tu es fier de toi ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Belle victoire 💪",
        "type": "soutien",
        "energy": "high"
      },
      {
        "text": "Tu veux rejouer ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "soiree",
    "input": "je regarde un dessin animé",
    "emotion": "joie",
    "tags": [
      "quotidien",
      "soiree"
    ],
    "responses": [
      {
        "text": "Trop bien 😄 c'est lequel ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu aimes les dessins animés",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Ton personnage préféré ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux m'en parler ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "soiree",
    "input": "je vais dormir",
    "emotion": "calme",
    "tags": [
      "quotidien",
      "soiree"
    ],
    "responses": [
      {
        "text": "Bonne nuit 💛 fais de beaux rêves",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là si tu veux une histoire",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Repose-toi bien 😄",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "À demain",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "routine",
    "input": "je m'habille",
    "emotion": "neutre",
    "tags": [
      "quotidien",
      "routine"
    ],
    "responses": [
      {
        "text": "Super 😄 quelle tenue aujourd'hui ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu choisis les couleurs ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu es prêt pour la journée",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Stylé 💛",
        "type": "fun",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "routine",
    "input": "je me lave les dents",
    "emotion": "neutre",
    "tags": [
      "quotidien",
      "routine"
    ],
    "responses": [
      {
        "text": "Bravo 😄 c'est important",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tes dents vont être propres",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "On compte jusqu'à 2 minutes ?",
        "type": "jeu",
        "energy": "medium"
      },
      {
        "text": "Super routine 💪",
        "type": "soutien",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "cuisine",
    "input": "comment faire un gâteau",
    "emotion": "curiosité",
    "tags": [
      "cuisine",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "On mélange des ingrédients 😄 farine, œufs, sucre",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Puis on met au four et ça gonfle !",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "C'est comme de la chimie délicieuse",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu aimes les gâteaux ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux une recette ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Au chocolat ou aux fruits ? 😄",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "metiers",
    "input": "c'est quoi un docteur",
    "emotion": "curiosité",
    "tags": [
      "metiers",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Un docteur aide les gens quand ils sont malades 🩺",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il soigne et connaît le corps humain",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il travaille à l'hôpital ou dans un cabinet",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu veux être docteur ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu en as déjà vu un ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Ça t'intéresse la médecine ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "metiers",
    "input": "quel métier je peux faire",
    "emotion": "curiosité",
    "tags": [
      "metiers",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Tu peux faire plein de choses 😄 ce que tu aimes !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Sport, science, art… il y a plein de choix",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Ton futur métier dépend de tes intérêts",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu veux des idées ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu aimes quoi dans la vie ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux explorer différents métiers ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "cuisine",
    "input": "j'aime cuisiner",
    "emotion": "joie",
    "tags": [
      "cuisine",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Trop bien 😄 cuisiner c'est créer des plats !",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Tu fais quoi comme recettes ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "C'est fun et utile",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu peux tester des recettes et même inventer",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "On cuisine ensemble ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Tu veux progresser ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "cuisine",
    "input": "c'est chaud le four",
    "emotion": "neutre",
    "tags": [
      "cuisine",
      "securite"
    ],
    "responses": [
      {
        "text": "Oui très chaud 🔥 il faut faire attention",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Demande à un adulte 💛",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "La sécurité d'abord",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Le four peut brûler, utilise des protections",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu cuisines souvent ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux apprendre à l'utiliser en sécurité ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "metiers",
    "input": "c'est quoi un pompier",
    "emotion": "curiosité",
    "tags": [
      "metiers",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Il éteint le feu 🚒 et il aide les gens",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Il est courageux",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Un pompier intervient en urgence",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il sauve des vies",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Formation rigoureuse",
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
    "category": "metiers",
    "input": "c'est quoi un ingénieur",
    "emotion": "curiosité",
    "tags": [
      "metiers",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Il construit des choses 🏗️ comme des machines",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Un ingénieur crée et résout des problèmes",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il utilise la science et les maths",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il travaille sur des projets complexes",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Ça t'intéresse ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux devenir ingénieur ?",
        "type": "question",
        "energy": "high"
      }
    ]
  }
];
