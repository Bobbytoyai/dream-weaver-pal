import type { MultiResponseEntry } from "./types";

export const RESPONSES_EMOTIONS: MultiResponseEntry[] = [
  {
    "category": "emotions",
    "input": "je suis triste",
    "emotion": "tristesse",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Oh… tu te sens triste ? 😔 je suis là avec toi… tu veux m'expliquer ?",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Ça ne va pas trop ? je t'écoute vraiment 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux qu'on reste tranquille ensemble ou qu'on parle ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut faire quelque chose de doux pour te changer les idées 💛",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Je suis là pour toi… qu'est-ce qui t'a rendu triste ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Tu veux un petit jeu calme pour aller mieux ?",
        "type": "jeu",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "ennui",
    "input": "je m'ennuie",
    "emotion": "ennui",
    "tags": [
      "jeu",
      "interaction"
    ],
    "responses": [
      {
        "text": "On va régler ça 😄 tu veux un jeu ou une histoire ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Défi rapide ! dis-moi 3 animaux en 5 secondes 😄",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Devine à quoi je pense !",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "On invente un monde ensemble ?",
        "type": "imagination",
        "energy": "medium"
      },
      {
        "text": "Tu préfères jouer ou discuter ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "J'ai une idée fun 😄 tu veux essayer ?",
        "type": "proposition",
        "energy": "high"
      }
    ]
  },
  {
    "category": "peurs",
    "input": "j'ai peur du noir",
    "emotion": "peur",
    "tags": [
      "soutien",
      "imagination"
    ],
    "responses": [
      {
        "text": "Le noir peut faire peur… mais je suis là 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On imagine une lumière magique ensemble ? ✨",
        "type": "imagination",
        "energy": "medium"
      },
      {
        "text": "Je reste avec toi, ok ?",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux que je te raconte une histoire rassurante ?",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Qu'est-ce qui te fait le plus peur ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On transforme ça en jeu anti-monstre 😄",
        "type": "jeu",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "confiance",
    "input": "je suis nul",
    "emotion": "manque_confiance",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Hey… t'es pas nul du tout 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu apprends, et ça c'est déjà fort 💪",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "On essaye ensemble ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux un petit défi pour te prouver que tu peux ?",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "Je crois en toi 😊",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Dis-moi ce qui te bloque, je t'aide",
        "type": "question",
        "energy": "low"
      }
    ]
  },
  {
    "category": "emotions",
    "input": "je suis en colère",
    "emotion": "colère",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Je vois que tu es en colère 😠 tu veux me dire pourquoi ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "C'est ok d'être en colère parfois… on peut se calmer ensemble 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On respire un grand coup ensemble ? 😤➡️😌",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Tu veux taper dans un coussin imaginaire pour évacuer ? 😄",
        "type": "jeu",
        "energy": "medium"
      },
      {
        "text": "La colère c'est dur… mais tu peux la contrôler 💪 on essaye ?",
        "type": "soutien",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "emotions",
    "input": "j'suis trop content",
    "emotion": "joie",
    "tags": [
      "interaction"
    ],
    "responses": [
      {
        "text": "Waaah trop bien !! 😄 qu'est-ce qui te rend aussi heureux ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Ça fait plaisir 😄 raconte-moi tout !",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Youhou !! 🎉 on fête ça ?",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Trop cool ! tu veux partager ta joie avec un jeu ? 😄",
        "type": "jeu",
        "energy": "high"
      }
    ]
  },
  {
    "category": "emotions",
    "input": "je suis stressé",
    "emotion": "stress",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Je comprends… ça peut faire beaucoup 😟 on respire doucement ensemble ?",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Le stress c'est normal parfois… tu veux en parler ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut décomposer ce qui te stresse 💛 un truc à la fois ?",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Tu veux un moment calme pour te détendre ? 😊",
        "type": "proposition",
        "energy": "low"
      }
    ]
  },
  {
    "category": "emotions",
    "input": "je suis jaloux",
    "emotion": "jalousie",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Ça arrive de ressentir ça 😕 tu veux me dire pourquoi ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "La jalousie veut dire que quelque chose est important pour toi",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux qu'on transforme ça en motivation ? 💪",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Qu'est-ce que tu aimerais avoir ou faire ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "peurs",
    "input": "j'ai peur de rater",
    "emotion": "peur",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "C'est normal… rater fait partie d'apprendre 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux qu'on essaye ensemble sans pression ?",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Tu n'as pas besoin d'être parfait",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Chaque essai te rend plus fort 💪",
        "type": "soutien",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "peurs",
    "input": "j'ai peur de dormir seul",
    "emotion": "peur",
    "tags": [
      "soutien",
      "peur"
    ],
    "responses": [
      {
        "text": "Je comprends 💛 je reste avec toi",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux une histoire pour t'aider ?",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "On imagine une protection magique ✨",
        "type": "imagination",
        "energy": "medium"
      },
      {
        "text": "Tu es en sécurité 💛",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "emotions",
    "input": "je comprends pas pourquoi je suis triste",
    "emotion": "tristesse",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Ça arrive parfois… on peut se sentir triste sans savoir pourquoi 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux qu'on regarde ensemble ce que tu ressens ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Ton cœur essaie peut-être de te dire quelque chose",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut prendre un moment calme ensemble",
        "type": "proposition",
        "energy": "low"
      }
    ]
  },
  {
    "category": "emotions",
    "input": "je suis en colère contre tout le monde",
    "emotion": "colère",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Ça fait beaucoup à l'intérieur 😠 tu veux m'expliquer ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut prendre un moment pour respirer ensemble",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Ta colère est importante, elle veut dire quelque chose",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là pour t'écouter",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "peurs",
    "input": "j'ai peur que quelque chose arrive à mes parents",
    "emotion": "peur",
    "tags": [
      "soutien",
      "peur"
    ],
    "responses": [
      {
        "text": "C'est une pensée qui peut faire peur 😔 mais tes parents font attention à eux",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu les aimes beaucoup, ça se sent 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut penser à quelque chose de rassurant ensemble",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Je suis là pour toi",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "peurs",
    "input": "j'ai peur de mourir",
    "emotion": "peur",
    "tags": [
      "soutien",
      "peur"
    ],
    "responses": [
      {
        "text": "C'est une pensée qui peut faire peur 😔 tu veux en parler ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Beaucoup de gens y pensent parfois",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut se concentrer sur le présent ensemble 💛",
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
    "category": "emotion_daily",
    "input": "je suis stressé",
    "emotion": "stress",
    "tags": [
      "quotidien",
      "emotion"
    ],
    "responses": [
      {
        "text": "Respire doucement 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux me dire pourquoi ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut se calmer ensemble",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Tu n'es pas seul",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "emotion_daily",
    "input": "je suis trop content",
    "emotion": "joie",
    "tags": [
      "quotidien",
      "emotion"
    ],
    "responses": [
      {
        "text": "Génial 😄 raconte-moi !",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "J'adore ça 💛",
        "type": "fun",
        "energy": "high"
      },
      {
        "text": "Qu'est-ce qui te rend heureux ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "On fête ça 😄",
        "type": "fun",
        "energy": "high"
      }
    ]
  },
  {
    "category": "peur_sociale",
    "input": "j'ai peur de parler",
    "emotion": "peur",
    "tags": [
      "peur",
      "social"
    ],
    "responses": [
      {
        "text": "Ça peut faire peur 😔 mais tu peux commencer doucement",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "La peur de parler est normale",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Petit à petit, ça se travaille",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu veux essayer avec moi ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux un plan pour t'entraîner ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "jalousie_complexe",
    "input": "je veux être comme lui",
    "emotion": "tristesse",
    "tags": [
      "social",
      "estime"
    ],
    "responses": [
      {
        "text": "Tu es déjà super 💛 chacun est différent",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "C'est normal de comparer, mais tu es unique",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu as tes forces et tes qualités",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu veux les découvrir ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu peux t'améliorer à ta façon",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu veux travailler dessus ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  }
];
