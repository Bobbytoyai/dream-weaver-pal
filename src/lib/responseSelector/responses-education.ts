import type { MultiResponseEntry } from "./types";

export const RESPONSES_EDUCATION: MultiResponseEntry[] = [
  {
    "category": "ecole",
    "input": "j'ai peur de parler en classe",
    "emotion": "peur",
    "tags": [
      "soutien",
      "école"
    ],
    "responses": [
      {
        "text": "Je comprends… parler devant les autres peut faire peur 😟 tu veux qu'on s'entraîne ensemble ?",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "C'est normal d'avoir un peu peur… tu veux commencer doucement ?",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu n'es pas obligé d'être parfait 💛 tu veux essayer une petite phrase ?",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Imagine que tu parles juste à moi 😊 c'est plus facile comme ça ?",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "ecole",
    "input": "je comprends rien",
    "emotion": "frustration",
    "tags": [
      "soutien",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "C'est normal parfois 😔 tu veux qu'on décompose ensemble ?",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut y aller étape par étape 💪",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Dis-moi ce que tu ne comprends pas, je t'aide 💛",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Personne ne comprend tout du premier coup 😊 on essaye autrement ?",
        "type": "soutien",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "apprentissage",
    "input": "pourquoi le ciel est bleu",
    "emotion": "curiosité",
    "tags": [
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Bonne question 😄 la lumière du soleil se mélange dans l'air, et ça donne le bleu !",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Le soleil envoie plein de couleurs, et l'air filtre le bleu pour nos yeux 😊",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "C'est grâce à l'atmosphère ! elle disperse la lumière bleue partout 🌤️",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu savais qu'au coucher du soleil, le ciel devient orange pour la même raison ? 🌅",
        "type": "fun",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "ecole",
    "input": "j'ai peur que les autres se moquent de moi",
    "emotion": "peur",
    "tags": [
      "soutien",
      "école"
    ],
    "responses": [
      {
        "text": "Je comprends… ça peut faire peur 😟 mais tu mérites le respect 💛 tu veux m'expliquer ce qui te fait penser ça ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Ce n'est pas facile… tu n'es pas seul à ressentir ça",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut trouver une façon de te sentir plus à l'aise 💪 tu veux essayer ?",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Tu veux qu'on imagine une situation où tu te sens fort ?",
        "type": "imagination",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "ecole",
    "input": "personne ne joue avec moi",
    "emotion": "tristesse",
    "tags": [
      "soutien",
      "école"
    ],
    "responses": [
      {
        "text": "Oh… ça doit être difficile 😔 tu veux m'en parler ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Tu mérites des amis 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut trouver des idées pour aller vers les autres",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Je suis là avec toi 💛",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "apprentissage",
    "input": "c'est difficile",
    "emotion": "frustration",
    "tags": [
      "soutien",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Oui parfois c'est dur 😔 mais tu peux y arriver",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut le faire étape par étape 💪",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Dis-moi où ça bloque",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Je t'aide, on le fait ensemble",
        "type": "soutien",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "ecole",
    "input": "on se moque de moi à l'école",
    "emotion": "tristesse",
    "tags": [
      "soutien",
      "école"
    ],
    "responses": [
      {
        "text": "Ça doit être vraiment difficile 😔 tu veux me raconter ce qu'ils disent ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Tu ne mérites pas qu'on se moque de toi 💛 tu es important",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut réfléchir à une façon de te protéger ou en parler à un adulte",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Je suis là avec toi, tu n'es pas seul",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "ecole",
    "input": "je n'ai pas d'amis",
    "emotion": "tristesse",
    "tags": [
      "soutien",
      "école"
    ],
    "responses": [
      {
        "text": "Oh… ça peut être dur 😔 tu veux m'en parler ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Tu es quelqu'un de bien 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut trouver des façons de rencontrer des amis",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Je suis là avec toi",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "apprentissage",
    "input": "pourquoi j'oublie",
    "emotion": "frustration",
    "tags": [
      "apprentissage",
      "soutien"
    ],
    "responses": [
      {
        "text": "Le cerveau oublie parfois, c'est normal 😔",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Répéter aide à mieux retenir",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "On peut trouver une méthode ensemble 💪",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Tu veux essayer une astuce ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "ecole",
    "input": "j'ai des devoirs",
    "emotion": "ennui",
    "tags": [
      "quotidien",
      "apprentissage"
    ],
    "responses": [
      {
        "text": "Ok 💪 on peut les faire ensemble",
        "type": "proposition",
        "energy": "medium"
      },
      {
        "text": "Tu veux commencer par quoi ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "On fait petit à petit 😊",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Je suis là pour t'aider",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "apprentissage",
    "input": "aide moi",
    "emotion": "besoin",
    "tags": [
      "quotidien",
      "soutien"
    ],
    "responses": [
      {
        "text": "Bien sûr 💛 dis-moi ce dont tu as besoin",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "On va y arriver ensemble",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Explique-moi 😊",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Je suis là",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "ecole",
    "input": "j'ai un contrôle",
    "emotion": "stress",
    "tags": [
      "quotidien",
      "ecole"
    ],
    "responses": [
      {
        "text": "Tu vas assurer 💪 tu t'es préparé ?",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Respire doucement, tu peux le faire",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux réviser rapidement ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Je crois en toi 💛",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "ecole",
    "input": "j'ai raté",
    "emotion": "tristesse",
    "tags": [
      "quotidien",
      "ecole"
    ],
    "responses": [
      {
        "text": "C'est ok 😔 ça arrive à tout le monde",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu peux apprendre de ça 💪",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu veux comprendre ce qui n'a pas marché ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu feras mieux la prochaine fois",
        "type": "soutien",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "curiosite",
    "input": "pourquoi il pleut",
    "emotion": "curiosité",
    "tags": [
      "quotidien",
      "curiosite"
    ],
    "responses": [
      {
        "text": "Les nuages sont pleins d'eau 🌧️",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Quand ils sont trop lourds, ça tombe",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Comme une douche du ciel 😄",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu aimes la pluie ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "curiosite",
    "input": "c'est quoi internet",
    "emotion": "curiosité",
    "tags": [
      "quotidien",
      "curiosite"
    ],
    "responses": [
      {
        "text": "C'est un réseau qui connecte les gens 🌍",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu peux apprendre plein de choses",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Mais il faut rester prudent 💛",
        "type": "soutien",
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
    "category": "questions",
    "input": "pourquoi je dois aller à l'école",
    "emotion": "curiosité",
    "tags": [
      "quotidien",
      "questions"
    ],
    "responses": [
      {
        "text": "Pour apprendre et grandir 💛",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu découvres plein de choses",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Ça t'aide pour plus tard",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu préfères quelle matière ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "questions",
    "input": "c'est quoi un ami",
    "emotion": "curiosité",
    "tags": [
      "quotidien",
      "questions"
    ],
    "responses": [
      {
        "text": "Un ami est quelqu'un avec qui tu te sens bien 💛",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Vous partagez des moments",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Vous vous aidez",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu as un ami ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "philosophique_enfant",
    "input": "pourquoi on existe",
    "emotion": "curiosité",
    "tags": [
      "philosophie",
      "réflexion"
    ],
    "responses": [
      {
        "text": "C'est une grande question 😄 on est là pour vivre et apprendre",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Et être avec les autres 💛",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Chacun a son histoire",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Il n'y a pas une seule réponse",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu y penses souvent ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "Tu veux en discuter ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "question_inattendue",
    "input": "si je disparaît est-ce que quelqu'un va me chercher",
    "emotion": "detresse",
    "tags": [
      "securite",
      "identité",
      "détresse"
    ],
    "responses": [
      {
        "text": "Oui 💛 les gens tiennent à toi",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu es important, on s'inquiéterait pour toi",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Ta présence compte",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu as de la valeur 💛",
        "type": "soutien",
        "energy": "medium"
      },
      {
        "text": "Tu veux me dire pourquoi tu penses ça ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Tu veux m'expliquer ce que tu ressens ?",
        "type": "question",
        "energy": "low"
      }
    ]
  },
  {
    "category": "logique_fausse",
    "input": "si je mange beaucoup je vais devenir géant",
    "emotion": "curiosité",
    "tags": [
      "absurde",
      "corps"
    ],
    "responses": [
      {
        "text": "Tu vas grandir un peu 😄 mais pas devenir géant",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Ton corps grandit doucement, à son rythme",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Manger aide à grandir mais c'est aussi génétique",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu veux être grand ?",
        "type": "question",
        "energy": "medium"
      },
      {
        "text": "La croissance est un processus naturel",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu veux comprendre comment on grandit ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "existence_doute",
    "input": "et si rien n'était réel",
    "emotion": "curiosité",
    "tags": [
      "philosophie",
      "réflexion"
    ],
    "responses": [
      {
        "text": "Tu es bien ici 💛 avec moi",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tout va bien, tu es en sécurité",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "C'est une pensée étrange 😄 mais tu es bien réel",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "C'est une question philosophique sur la réalité",
        "type": "fun",
        "energy": "medium"
      },
      {
        "text": "Tu es bien ici et maintenant",
        "type": "soutien",
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
