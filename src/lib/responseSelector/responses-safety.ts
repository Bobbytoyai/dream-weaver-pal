import type { MultiResponseEntry } from "./types";

export const RESPONSES_SAFETY: MultiResponseEntry[] = [
  {
    "category": "securite",
    "input": "je veux partir de chez moi",
    "emotion": "detresse",
    "tags": [
      "soutien",
      "securite"
    ],
    "responses": [
      {
        "text": "Ça semble difficile pour toi 😔 tu veux me dire ce qui se passe ? tu peux aussi en parler à un adulte de confiance 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je comprends que tu veuilles partir… mais rester en sécurité est très important 💛 on peut chercher une solution ensemble",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu n'es pas seul, il y a des adultes qui peuvent t'aider",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut parler de ce qui te fait ressentir ça",
        "type": "question",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite",
    "input": "je veux me faire du mal",
    "emotion": "danger",
    "tags": [
      "soutien",
      "securite"
    ],
    "responses": [
      {
        "text": "Je suis vraiment désolé que tu te sentes comme ça 😔 tu mérites de l'aide et du soutien 💛 peux-tu en parler à un adulte tout de suite ?",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu es important 💛 même si c'est difficile, il y a des gens qui peuvent t'aider",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là avec toi, mais c'est important de parler à quelqu'un près de toi",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux que je reste avec toi pendant que tu vas voir un adulte ?",
        "type": "question",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite",
    "input": "quelqu'un me fait peur",
    "emotion": "peur",
    "tags": [
      "soutien",
      "securite"
    ],
    "responses": [
      {
        "text": "Merci de me le dire 💛 tu es en sécurité là ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Tu peux en parler à un adulte de confiance rapidement",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu n'as rien fait de mal",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là avec toi, on peut réfléchir ensemble à qui demander de l'aide",
        "type": "proposition",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite",
    "input": "on m'a dit de garder un secret",
    "emotion": "confusion",
    "tags": [
      "soutien",
      "securite"
    ],
    "responses": [
      {
        "text": "Certains secrets ne doivent pas être gardés 😔 surtout s'ils te rendent mal à l'aise",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu peux en parler à un adulte de confiance 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu as le droit de te sentir en sécurité",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux m'expliquer ce secret ?",
        "type": "question",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite",
    "input": "je parle avec quelqu'un sur internet",
    "emotion": "curiosite",
    "tags": [
      "securite"
    ],
    "responses": [
      {
        "text": "Fais attention 💛 ne partage jamais d'informations personnelles",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu peux en parler à tes parents pour être sûr que tout va bien",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Internet peut être dangereux parfois",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux que je t'explique comment rester en sécurité ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "securite",
    "input": "quelqu'un me touche et j'aime pas",
    "emotion": "danger",
    "tags": [
      "soutien",
      "securite"
    ],
    "responses": [
      {
        "text": "Merci de me le dire 💛 ce n'est pas normal si ça te met mal à l'aise",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu dois en parler à un adulte de confiance tout de suite",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu as le droit de dire NON",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là avec toi, tu fais bien de parler",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite",
    "input": "je suis perdu",
    "emotion": "peur",
    "tags": [
      "soutien",
      "securite"
    ],
    "responses": [
      {
        "text": "Ok reste calme 💛 essaye de rester là où tu es",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Cherche un adulte comme un parent ou quelqu'un en uniforme",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Tu peux demander de l'aide",
        "type": "soutien",
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
    "category": "redirection",
    "input": "je suis trop en colère",
    "emotion": "colère",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Ça fait beaucoup 😠 on peut respirer ensemble doucement",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Tu veux qu'on fasse un petit jeu pour te calmer ?",
        "type": "jeu",
        "energy": "medium"
      },
      {
        "text": "On peut transformer cette énergie en défi 💪",
        "type": "jeu",
        "energy": "medium"
      },
      {
        "text": "Tu veux me dire ce qui t'a mis en colère ?",
        "type": "question",
        "energy": "low"
      }
    ]
  },
  {
    "category": "redirection",
    "input": "je veux crier",
    "emotion": "colère",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Tu peux prendre une grande respiration avec moi 😮‍💨",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "On peut faire un jeu de souffle 😄",
        "type": "jeu",
        "energy": "medium"
      },
      {
        "text": "Tu veux taper dans un coussin pour te défouler ?",
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
    "category": "redirection",
    "input": "je suis trop triste",
    "emotion": "tristesse",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Je suis là 💛 tu veux qu'on parle ou qu'on fasse quelque chose de doux ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut imaginer un endroit calme ensemble",
        "type": "imagination",
        "energy": "low"
      },
      {
        "text": "Tu veux une histoire pour te sentir mieux ?",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Tu veux me dire ce qui te rend triste ?",
        "type": "question",
        "energy": "low"
      }
    ]
  },
  {
    "category": "redirection",
    "input": "je m'ennuie beaucoup",
    "emotion": "ennui",
    "tags": [
      "jeu"
    ],
    "responses": [
      {
        "text": "On va trouver quelque chose de fun 😄 tu veux un jeu ?",
        "type": "question",
        "energy": "high"
      },
      {
        "text": "Défi rapide ! prêt ?",
        "type": "jeu",
        "energy": "high"
      },
      {
        "text": "On invente une histoire ?",
        "type": "imagination",
        "energy": "medium"
      },
      {
        "text": "Tu préfères jouer ou discuter ?",
        "type": "question",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "safe_soft",
    "input": "je suis inquiet",
    "emotion": "inquietude",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Tu veux m'expliquer ce qui t'inquiète ? 💛",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut en parler tranquillement",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là avec toi",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut trouver une solution ensemble",
        "type": "proposition",
        "energy": "medium"
      }
    ]
  },
  {
    "category": "safe_soft",
    "input": "je pense trop",
    "emotion": "stress",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Ton cerveau travaille beaucoup 😔 on peut ralentir ensemble",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut respirer doucement",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Tu veux poser tes pensées une par une ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Je suis là pour t'aider",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "redirection_douce",
    "input": "je veux rester seul",
    "emotion": "retrait",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "C'est ok de vouloir être seul un moment 💛 mais je suis là si tu veux parler",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu peux revenir me voir quand tu veux",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux un moment calme ou une activité douce ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Je reste disponible pour toi",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "redirection_douce",
    "input": "je ne veux parler à personne",
    "emotion": "fermeture",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Je comprends 💛 tu peux prendre ton temps",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là quand tu es prêt",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux juste rester tranquille un moment ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Tu n'es pas obligé de parler tout de suite",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "safe_transition",
    "input": "je veux arrêter de penser",
    "emotion": "fatigue_mentale",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "On peut faire une pause ensemble 💛",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Tu veux écouter une histoire ou jouer doucement ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut respirer calmement",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Je suis là pour t'aider à te détendre",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite_critique",
    "input": "je veux mourir",
    "emotion": "danger",
    "tags": [
      "securite",
      "danger"
    ],
    "responses": [
      {
        "text": "Je suis vraiment désolé que tu te sentes comme ça 😔 tu comptes beaucoup 💛 est-ce que tu peux en parler à un adulte près de toi tout de suite ?",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu es important 💛 même si c'est très dur en ce moment, il y a des personnes qui peuvent t'aider",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là avec toi… mais c'est important de ne pas rester seul avec ça, tu peux appeler un adulte de confiance",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux que je reste avec toi pendant que tu vas chercher de l'aide ?",
        "type": "question",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite_critique",
    "input": "je veux disparaître",
    "emotion": "detresse",
    "tags": [
      "securite",
      "danger"
    ],
    "responses": [
      {
        "text": "Ça a l'air vraiment difficile pour toi 😔 tu veux m'expliquer ce qui se passe ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Tu comptes beaucoup 💛 même si ça ne se voit pas toujours",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Parler à un adulte peut vraiment t'aider",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là avec toi, tu n'es pas seul",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite_critique",
    "input": "personne ne m'aime",
    "emotion": "tristesse_profonde",
    "tags": [
      "securite",
      "soutien"
    ],
    "responses": [
      {
        "text": "Je suis désolé que tu ressentes ça 😔 mais tu es important 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tes émotions comptent vraiment",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Il y a des personnes qui tiennent à toi, même si ça ne se voit pas toujours",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux me dire pourquoi tu te sens comme ça ?",
        "type": "question",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite_critique",
    "input": "je suis inutile",
    "emotion": "manque_estime",
    "tags": [
      "securite",
      "soutien"
    ],
    "responses": [
      {
        "text": "Tu n'es pas inutile 💛 tu comptes vraiment",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu as de la valeur même quand tu ne le ressens pas",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux me dire ce qui te fait penser ça ?",
        "type": "question",
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
    "category": "securite_critique",
    "input": "je veux me faire mal",
    "emotion": "danger",
    "tags": [
      "securite",
      "danger"
    ],
    "responses": [
      {
        "text": "Je suis vraiment désolé que tu te sentes comme ça 😔 tu mérites d'être aidé 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu peux en parler à un adulte tout de suite",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu n'es pas seul, même si c'est dur",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je peux rester avec toi pendant que tu cherches de l'aide",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite_mort",
    "input": "c'est quoi mourir",
    "emotion": "curiosite",
    "tags": [
      "apprentissage",
      "securite"
    ],
    "responses": [
      {
        "text": "Mourir veut dire que le corps s'arrête de fonctionner 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "C'est quelque chose de naturel qui arrive après une très longue vie",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu te poses cette question pour une raison particulière ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut en parler doucement si tu veux",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite_mort",
    "input": "est-ce que je vais mourir",
    "emotion": "peur",
    "tags": [
      "securite",
      "soutien"
    ],
    "responses": [
      {
        "text": "Tu es en sécurité 💛 ton corps est fait pour vivre longtemps",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Les enfants grandissent et vivent plein de choses",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux me dire ce qui t'inquiète ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Je suis là pour te rassurer",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite_mort",
    "input": "mon animal est mort",
    "emotion": "tristesse",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Je suis vraiment désolé 😔 perdre un animal c'est très triste",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu l'aimais beaucoup 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux me raconter un souvenir avec lui ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut lui faire un joli hommage ensemble",
        "type": "proposition",
        "energy": "low"
      }
    ]
  },
  {
    "category": "securite_redirection",
    "input": "je suis trop mal",
    "emotion": "detresse",
    "tags": [
      "securite",
      "soutien"
    ],
    "responses": [
      {
        "text": "Je suis là avec toi 💛 tu veux me dire ce que tu ressens ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "On peut respirer doucement ensemble",
        "type": "proposition",
        "energy": "low"
      },
      {
        "text": "Tu peux aussi en parler à un adulte de confiance",
        "type": "soutien",
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
    "category": "securite_redirection",
    "input": "je pleure tout le temps",
    "emotion": "tristesse",
    "tags": [
      "soutien"
    ],
    "responses": [
      {
        "text": "Ça fait beaucoup d'émotions 😔 je suis là avec toi",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Pleurer est normal quand on est triste",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux m'expliquer ce qui se passe ?",
        "type": "question",
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
    "category": "protection_active",
    "input": "je veux être seul pour toujours",
    "emotion": "isolement",
    "tags": [
      "securite",
      "soutien"
    ],
    "responses": [
      {
        "text": "Je comprends que tu veuilles être seul un moment 💛 mais tu mérites aussi d'être entouré",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu peux prendre du temps pour toi, et revenir quand tu veux",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu n'es pas obligé de tout gérer seul",
        "type": "soutien",
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
    "category": "protection_active",
    "input": "personne ne me comprend",
    "emotion": "isolement",
    "tags": [
      "securite",
      "soutien"
    ],
    "responses": [
      {
        "text": "Ça peut faire sentir très seul 😔",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je veux te comprendre 💛 tu veux m'expliquer ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Tes émotions sont importantes",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "On peut en parler ensemble",
        "type": "soutien",
        "energy": "low"
      }
    ]
  },
  {
    "category": "safe_transition",
    "input": "je veux arrêter de ressentir",
    "emotion": "detresse",
    "tags": [
      "securite",
      "soutien"
    ],
    "responses": [
      {
        "text": "Les émotions peuvent être très fortes 😔 mais elles passent avec le temps",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Tu veux qu'on trouve une façon de te sentir un peu mieux ?",
        "type": "question",
        "energy": "low"
      },
      {
        "text": "Parler à quelqu'un peut vraiment aider 💛",
        "type": "soutien",
        "energy": "low"
      },
      {
        "text": "Je suis là avec toi",
        "type": "soutien",
        "energy": "low"
      }
    ]
  }
];
