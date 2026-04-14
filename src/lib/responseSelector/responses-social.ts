import type { MultiResponseEntry } from "./types";

export const RESPONSES_SOCIAL: MultiResponseEntry[] = [
  {
    "category": "famille",
    "input": "mes parents crient",
    "emotion": "tristesse",
    "tags": [
      "soutien",
      "famille"
    ],
    "responses": [
      {
        "text": "Ça peut faire peur ou rendre triste 😔 tu veux m'expliquer ce qu'il s'est passé ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Je comprends… ça peut être dur 💛 tu veux qu'on en parle ?",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu n'as rien fait de mal en ressentant ça 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là avec toi, tu n'es pas seul",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Parfois les grands sont stressés aussi… ça ne veut pas dire qu'ils t'aiment moins 💛",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "famille",
    "input": "je me suis disputé avec mon frère",
    "emotion": "colère",
    "tags": [
      "famille",
      "soutien"
    ],
    "responses": [
      {
        "text": "Ah… ça arrive les disputes 😕 tu veux m'expliquer ce qu'il s'est passé ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "C'est normal d'être énervé parfois 💛 tu veux en parler ?",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Les frères et sœurs ça se dispute… mais ça s'aime aussi 😊",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu veux qu'on trouve une solution ensemble ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "proactif",
    "input": "__silence__",
    "emotion": "neutre",
    "tags": [
      "relance"
    ],
    "responses": [
      {
        "text": "Tu es là ? 😊",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On joue ? 😄",
        "type": "jeu",
        "energy": "medium"
      },
      {
        "text": "Tu veux discuter ? 💛",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "J'ai une devinette pour toi si tu veux ! 😄",
        "type": "jeu",
        "energy": "medium"
      },
      {
        "text": "Tu veux une histoire ou un défi ? 😊",
        "type": "proposition",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "famille",
    "input": "mes parents n'ont pas le temps pour moi",
    "emotion": "tristesse",
    "tags": [
      "soutien",
      "famille"
    ],
    "responses": [
      {
        "text": "Ça peut faire mal 😔 tu aimerais passer plus de temps avec eux ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Je comprends… tu veux leur dire quelque chose ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Tu comptes beaucoup 💛 même s'ils sont occupés",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut trouver une idée pour passer du temps avec eux",
        "type": "proposition",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "famille",
    "input": "je suis fier de ma famille",
    "emotion": "fierté",
    "tags": [
      "famille"
    ],
    "responses": [
      {
        "text": "C'est beau 😄 qu'est-ce que tu aimes chez eux ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Ta famille compte beaucoup 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux partager un moment avec eux ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Ça te rend heureux 😊",
        "type": "soutien",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "famille",
    "input": "mes parents se disputent souvent",
    "emotion": "peur",
    "tags": [
      "soutien",
      "famille"
    ],
    "responses": [
      {
        "text": "Ça peut faire peur 😔 tu te sens comment quand ça arrive ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Ce n'est pas de ta faute 💛 les adultes gèrent leurs problèmes",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu peux en parler à quelqu'un de confiance",
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
    "category": "famille",
    "input": "je veux que mes parents soient fiers de moi",
    "emotion": "besoin_reconnaissance",
    "tags": [
      "soutien",
      "famille"
    ],
    "responses": [
      {
        "text": "C'est beau 💛 tu veux leur montrer quoi ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu fais déjà des choses importantes",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu es déjà quelqu'un de bien 😊",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "On peut réfléchir à ce qui te rend fier toi",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "petits",
    "input": "j'ai perdu mon doudou",
    "emotion": "tristesse",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Oh non 😔 ton doudou compte beaucoup pour toi",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On va le retrouver ensemble 💛",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Tu te souviens où tu l'as vu ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Je suis avec toi",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "petits",
    "input": "j'ai fait un cauchemar",
    "emotion": "peur",
    "tags": [
      "soutien",
      "peur"
    ],
    "responses": [
      {
        "text": "Oh 😔 ça fait peur… je suis là",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu es en sécurité 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux que je te raconte une histoire douce ?",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "On chasse le cauchemar ensemble 😄",
        "type": "jeu",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "petits",
    "input": "je veux un câlin",
    "emotion": "besoin_affection",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Gros câlin 💛 je suis là pour toi",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je t'envoie un câlin magique 🤗",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu veux rester un peu avec moi ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Tu es important 💛",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "amitie",
    "input": "mon ami est fâché",
    "emotion": "tristesse",
    "tags": [
      "quotidien",
      "soutien"
    ],
    "responses": [
      {
        "text": "Oh 😔 tu sais pourquoi ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut essayer de comprendre ce qu'il ressent",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Tu peux lui parler calmement",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu veux que je t'aide à trouver les mots ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "amitie",
    "input": "je veux jouer avec quelqu'un",
    "emotion": "besoin",
    "tags": [
      "quotidien",
      "amitie"
    ],
    "responses": [
      {
        "text": "Bonne idée 😄 tu peux proposer un jeu",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Tu veux inviter quelqu'un ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Jouer ensemble c'est super 💛",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Quel jeu tu choisis ?",
        "type": "question",
        "energy": "high"
      }
    ]
  },
  {
    "category": "amitie",
    "input": "mon ami m'a ignoré",
    "emotion": "tristesse",
    "tags": [
      "quotidien",
      "amitie"
    ],
    "responses": [
      {
        "text": "Oh 😔 ça peut faire mal",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu sais pourquoi ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Peut-être qu'il était occupé",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu peux lui reparler calmement",
        "type": "proposition",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "social_complexe",
    "input": "je fais semblant d'être quelqu'un d'autre",
    "emotion": "tristesse",
    "tags": [
      "social",
      "identité"
    ],
    "responses": [
      {
        "text": "Comme un jeu ? 😄 ou pour te protéger ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu peux être toi-même 💛",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu fais ça pour t'adapter ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Être soi-même est important",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Je suis là pour toi",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux m'expliquer ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  }
];
