import type { LocalIntent, IntentRule } from "./types";

const INTENT_RULES: IntentRule[] = [
  // Language request — child asks Bobby to speak another language
  { intent: "DEMANDE_LANGUE", priority: 110, patterns: [
    /speak english|parle anglais|parle en anglais|talk english|in english|en anglais|speak french|parle espagnol|speak spanish|habla español/i,
    /tu parles anglais|tu sais parler anglais|dis.+en anglais|mot.+anglais|apprends.+anglais/i,
  ]},
  // Safety crisis — empathetic redirect (NOT blocked)
  { intent: "CRISE_SECURITE", priority: 105, patterns: [
    /je veux mourir|je veux disparaître|veux plus vivre|veux pas exister|à quoi ça sert de vivre/i,
    /je déteste ma vie|ma vie est nulle|je sers à rien|personne ne m'aime/i,
  ]},
  // Content block — dangerous topics
  { intent: "CONTENU_BLOQUE", priority: 100, patterns: [
    /tuer|suicide|sang|violence|sexe|drogue|arme|fusil|bombe|pistolet/i,
  ]},

  // Emotions — high priority
  { intent: "PEUR", priority: 90, patterns: [
    /j'ai peur|fait peur|effrayé|terrifié|cauchemar|monstre|angoiss|j'ose pas|me fait peur/i,
    /peur du noir|peur de|peur quand|peur que|peur d'être puni|peur de mourir|peur de parler/i,
    /stressé|stress|anxieux|anxiété|inquiet/i,
  ]},
  { intent: "TRISTESSE", priority: 90, patterns: [
    /je suis triste|je pleure|pas bien|malheureux|je me sens mal|j'ai le cafard|personne m'aime/i,
    /triste|pleure|pleurer|chagrin/i,
  ]},
  { intent: "COLERE", priority: 90, patterns: [
    /en colère|énervé|fâché|j'en ai marre|ras le bol|c'est pas juste|déteste|agacé|rage/i,
  ]},
  { intent: "JOIE", priority: 85, patterns: [
    /content|heureux|heureuse|trop bien|génial|super !|youpi|yeah|hourra|je suis content/i,
  ]},
  { intent: "ENNUI", priority: 85, patterns: [
    /je m'ennuie|m'ennuie|rien à faire|c'est nul|bof|chiant|ennuie|sais pas quoi faire/i,
  ]},
  { intent: "HONTE", priority: 85, patterns: [
    /honte|ridicule|la honte|embarrass|j'ai fait une bêtise|tout le monde a ri|j'ai menti|j'ai triché/i,
  ]},
  { intent: "JALOUSIE", priority: 85, patterns: [
    /jaloux|jalouse|pourquoi pas moi|lui il a|elle elle a|c'est injuste/i,
  ]},
  { intent: "SURPRISE", priority: 80, patterns: [
    /vraiment\?|sérieux|c'est fou|impossible|dingue|incroyable|pas possible|wow|waouh/i,
  ]},
  { intent: "FIERTE", priority: 80, patterns: [
    /fier|fière|j'ai réussi|j'ai gagné|champion|regarde ce que|bien joué/i,
  ]},
  { intent: "AMOUR", priority: 80, patterns: [
    /je t'aime|t'adore|câlin|bisou|tu es mon ami|meilleur ami|aime bobby/i,
  ]},
  { intent: "AMOUREUX", priority: 82, patterns: [
    /amoureux|amoureuse|petite copine|petit copain|petite amie|petit ami|crush|je l'aime|lui dire que je l'aime|elle me plaît|il me plaît|je kiffe/i,
  ]},
  { intent: "TIMIDITE", priority: 80, patterns: [
    /timide|j'ose pas|gêné|rouge|devant tout le monde/i,
  ]},
  { intent: "CONFUSION", priority: 75, patterns: [
    /comprends pas|confus|perdu|rien compris|c'est bizarre|chelou/i,
  ]},

  // Social situations
  { intent: "CONFLIT_FAMILLE", priority: 88, patterns: [
    /parents crient|papa crie|maman crie|disputé avec|frère m'énerve|sœur m'énerve|parents séparés|divorce/i,
    /punition|puni|grondé|engueulé|parents se disputent|parents se battent/i,
  ]},
  { intent: "CONFLIT_AMI", priority: 88, patterns: [
    /copain m'a (?!dit)|copine m'a (?!dit)|ami m'a|plus mon ami|disputé avec mon copain|il m'a tapé|elle m'a tapé/i,
    /mon ami ne veut plus|m'a insulté|moqué de moi/i,
  ]},
  { intent: "SOLITUDE", priority: 87, patterns: [
    /tout seul|toute seule|personne joue avec moi|pas d'amis|personne ne m'aime|seul/i,
  ]},
  { intent: "HARCELEMENT", priority: 95, patterns: [
    /on se moque|moquent de moi|embête|embêtent|harcel|méchant avec moi|tape|frappe|insulte/i,
  ]},
  { intent: "BESOIN_AFFECTION", priority: 82, patterns: [
    /câlin|calin|bisou|tu m'aimes|tu es là|reste avec moi|me sens seul/i,
  ]},
  { intent: "BESOIN_AIDE", priority: 82, patterns: [
    /aide-moi|besoin d'aide|je sais pas comment|tu peux m'aider|comment faire/i,
  ]},
  { intent: "MANQUE_CONFIANCE", priority: 85, patterns: [
    /je suis nul|nulle|j'y arrive pas|pas capable|pas bon|trop dur|j'arrive pas/i,
  ]},
  { intent: "GRATITUDE", priority: 75, patterns: [
    /merci|remerci|trop gentil|sympa|c'est gentil/i,
  ]},

  // Daily life
  { intent: "ECOLE", priority: 70, patterns: [
    /école|maîtresse|maître|classe|récréation|récré|cantine|cartable|apprendre/i,
  ]},
  { intent: "DEVOIRS", priority: 72, patterns: [
    /devoirs|exercice|leçon|calcul|dictée|lire un livre|écrire|maths/i,
  ]},
  { intent: "NOURRITURE", priority: 68, patterns: [
    /manger|faim|goûter|gâteau|chocolat|bonbon|pizza|crêpe|cuisine|cuisiner|glace/i,
  ]},
  { intent: "DODO", priority: 75, patterns: [
    /dodo|dormir|fatigué|sommeil|bonne nuit|coucher|nuit|au lit/i,
  ]},
  { intent: "REVEILS", priority: 60, patterns: [
    /réveillé|lever|matin|bonjour|bien dormi/i,
  ]},
  { intent: "ANIMAUX_COMPAGNIE", priority: 70, patterns: [
    /mon chat|mon chien|mon lapin|mon hamster|mon poisson|animal de compagnie|mon animal/i,
  ]},
  { intent: "VACANCES", priority: 65, patterns: [
    /vacances|plage|mer|montagne|voyage|partir en|camping/i,
  ]},
  { intent: "ACTIVITE", priority: 60, patterns: [
    /foot|football|sport|danse|musique|piscine|vélo|dessin|peinture|guitare|piano/i,
  ]},

  // Situational
  { intent: "FATIGUE", priority: 76, patterns: [
    /fatigué|crevé|épuisé|plus d'énergie|trop fatigué|je suis fatigué/i,
  ]},
  { intent: "ECHEC", priority: 82, patterns: [
    /raté|échoué|perdu|loupé|j'ai raté|j'ai perdu|pas réussi|mauvaise note/i,
  ]},
  { intent: "OBJECTIF", priority: 72, patterns: [
    /je veux gagner|je veux réussir|mon objectif|je vais y arriver|je veux être le meilleur/i,
  ]},
  { intent: "SANTE", priority: 83, patterns: [
    /j'ai mal|mal au ventre|mal à la tête|mal aux dents|malade|vomi|fièvre|bobo|ça fait mal/i,
  ]},
  { intent: "PERTE", priority: 80, patterns: [
    /j'ai perdu mon|perdu ma|perdu mes|plus retrouver|disparu|cassé mon|cassé ma/i,
  ]},
  { intent: "REVE_AVENIR", priority: 72, patterns: [
    /je veux devenir|quand je serai grand|mon rêve c'est|plus tard je|j'aimerais être/i,
  ]},
  { intent: "ABANDON", priority: 84, patterns: [
    /je veux abandonner|j'abandonne|à quoi bon|laisser tomber|ça sert à rien|c'est foutu/i,
  ]},
  { intent: "EXCITATION", priority: 78, patterns: [
    /trop excité|j'ai hâte|vivement|impatient|je peux pas attendre|trop pressé/i,
  ]},
  { intent: "MENSONGE", priority: 82, patterns: [
    /j'ai menti|j'ai triché|j'ai pas dit la vérité|j'ai caché/i,
  ]},
  { intent: "STRESS", priority: 80, patterns: [
    /en retard|je suis en retard|pas le temps|dépêcher|vite|pressé.*école/i,
  ]},
  { intent: "RESISTANCE", priority: 71, patterns: [
    /pas envie d'aller|veux pas aller|pas envie.*école|veux pas faire mes devoirs|j'ai pas envie/i,
  ]},
  { intent: "PARTAGE_QUOTIDIEN", priority: 55, patterns: [
    /bonne journée|bien mangé|bien dormi|bien passé|fait un ami|j'ai passé|dessin animé/i,
  ]},
  { intent: "ENVIE", priority: 58, patterns: [
    /je veux regarder|je veux manger|je veux jouer dehors|je veux un|je veux des/i,
  ]},
  { intent: "ANXIETE", priority: 86, patterns: [
    /inquiet|inquiète|tracasse|angoisse|stressé pour demain|peur de demain|anxieux/i,
  ]},
  { intent: "PERFECTIONNISME", priority: 78, patterns: [
    /être parfait|tout bien faire|pas le droit à l'erreur|zéro faute|meilleur en tout/i,
  ]},
  { intent: "COMPARAISON", priority: 76, patterns: [
    /être comme|comme lui|comme elle|lui il est mieux|elle est mieux|pareil que/i,
  ]},
  { intent: "FATIGUE_EMOTIONNELLE", priority: 87, patterns: [
    /fatigué de tout|j'en peux plus|trop pour moi|épuisé mentalement|ça me pèse|trop lourd/i,
  ]},
  { intent: "RETRAIT", priority: 75, patterns: [
    /rester seul|je veux être seul|laissez-moi tranquille|foutez-moi la paix|envie de rien/i,
  ]},
  { intent: "PEUR_ABANDON", priority: 88, patterns: [
    /peur que personne m'aime|peur qu'on m'abandonne|peur que mes amis|abandonner|plus personne/i,
  ]},
  { intent: "PEUR_ECHEC", priority: 85, patterns: [
    /peur d'échouer|peur de rater|peur de recommencer|encore raté|j'ai encore raté/i,
  ]},
  { intent: "AVERSION", priority: 74, patterns: [
    /je déteste l'école|je déteste|j'aime pas l'école|l'école c'est nul|je hais/i,
  ]},
  { intent: "PEOPLE_PLEASING", priority: 77, patterns: [
    /faire plaisir à tout le monde|plaire à tout le monde|que tout le monde soit content/i,
  ]},
  { intent: "CURIOSITE", priority: 72, patterns: [
    /comment ça fonctionne|comment ça marche|je veux savoir|c'est quoi un|pourquoi le|pourquoi la/i,
  ]},
  { intent: "CREATION", priority: 73, patterns: [
    /je veux créer|je veux construire|je veux fabriquer|inventer|bricoler/i,
  ]},
  { intent: "IDENTITE_PEUR", priority: 83, patterns: [
    /peur d'être différent|pas comme les autres|bizarre|pas normal|je suis pas normal/i,
  ]},
  { intent: "MAUVAIS_COMPORTEMENT", priority: 81, patterns: [
    /cassé quelque chose exprès|j'ai tapé|j'ai poussé|j'ai crié sur|j'ai fait exprès/i,
  ]},

  // Requests
  { intent: "HISTOIRE", priority: 78, patterns: [
    /raconte|histoire|conte|il était une fois|raconte-moi/i,
  ]},
  { intent: "JEU", priority: 78, patterns: [
    /on joue|jouons|un jeu|jouer à|jeu|partie/i,
  ]},
  { intent: "BLAGUE", priority: 78, patterns: [
    /blague|rigoler|drôle|marrant|farce|fais-moi rire/i,
  ]},
  { intent: "DEVINETTE", priority: 78, patterns: [
    /devinette|charade|quiz|question piège|tu sais quoi/i,
  ]},
  { intent: "AVENTURE", priority: 75, patterns: [
    /aventure|pirate|trésor|mission|super-héros|chevalier|magie|ninja/i,
  ]},
  { intent: "IMAGINATION", priority: 72, patterns: [
    /imagine|si on|et si|on invente|on crée|monde imaginaire|faire semblant|je peux voler|je peux être|devenir un dinosaure|parler aux animaux|battre le vent|invisible vraiment|créer un monde/i,
  ]},
  { intent: "QUESTION_ABSURDE", priority: 68, patterns: [
    /pourquoi les poules|pourquoi l'eau mouille|nuages.*coton|si je mange beaucoup|lune.*me suit|si je saute.*voler|si je cours.*vent/i,
  ]},
  { intent: "QUESTION_EXISTENTIELLE", priority: 66, patterns: [
    /pourquoi le temps passe|pourquoi j'ai des émotions|pourquoi on existe|c'est quoi la vie|pourquoi on meurt|pourquoi on respire|pourquoi on doit dormir/i,
  ]},
  { intent: "APPRENDRE", priority: 70, patterns: [
    /apprendre|c'est quoi|comment ça marche|explique|sais-tu|tu connais|pourquoi le ciel|pourquoi les poissons|je veux savoir tout/i,
  ]},
  { intent: "CHANSON", priority: 72, patterns: [
    /chanson|chante|chanter|fredonne|musique/i,
  ]},

  // Conversation
  { intent: "SALUT", priority: 95, patterns: [
    /^(salut|bonjour|coucou|hey|hello|yo|re)\b/i,
  ]},
  { intent: "AU_REVOIR", priority: 95, patterns: [
    /^(au revoir|bye|à plus|salut|à bientôt|adieu|bonne nuit)\b/i,
  ]},
  { intent: "OUI", priority: 60, patterns: [
    /^(oui|ouais|ok|d'accord|yep|yes|bien sûr|carrément|ouiiii)\s*!*$/i,
  ]},
  { intent: "NON", priority: 60, patterns: [
    /^(non|nan|nope|pas envie|je veux pas|non merci)\s*!*$/i,
  ]},
  { intent: "IDENTITE_BOBBY", priority: 85, patterns: [
    /qui es-tu|tu es qui|c'est quoi ton nom|comment tu t'appelles|t'es quoi|t'es un robot/i,
    /tu es [ée]ternel|tu vas mourir|tu meurs|t'es immortel|tu vis pour toujours|tu es vivant|t'es vivant|tu es r[ée]el|t'es r[ée]el/i,
    /et toi tu|moi je suis.*et toi/i,
  ]},
  { intent: "COMPLIMENT", priority: 75, patterns: [
    /t'es cool|t'es génial|tu es super|j'adore|t'es drôle|t'es le meilleur|je t'aime bien/i,
  ]},
  { intent: "QUESTION_COMPLEXE", priority: 50, patterns: [
    /pourquoi|comment|c'est quoi|qu'est-ce que|explique-moi/i,
  ]},
  { intent: "QUESTION_SIMPLE", priority: 45, patterns: [
    /\?$/,
  ]},
];

function isGarbledText(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return true;
  
  // Very short with no French vowel patterns → likely garbled STT
  const frenchWords = /[àâäéèêëïîôùûüÿçœæ]|le |la |les |un |une |des |je |tu |il |elle |nous |vous |est |et |ou |de |du |en |au |ce |mon |ton |son |qui |que |pour |pas |avec |sur |dans |mais |comme |très |trop |bien |tout /i;
  const englishWords = /\b(the|is|are|was|were|have|has|had|will|would|could|should|can|do|does|did|not|and|but|or|for|with|this|that|from|what|how|why|when|where|who|your|you|my|his|her|its|our|speak|talk|say|tell|want|need|like|love|go|come|get|make|know|think|see|look|find|give|take|play|run|eat|sleep|help|work|call|try|ask|use|put|keep|let|begin|show|hear|turn|move|live|believe|bring|happen|write|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|open|walk|win|offer|remember|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain)\b/i;

  // Check if it's mostly English
  const engMatch = lower.match(englishWords);
  if (engMatch && engMatch.length >= 2) return false; // It's English, not garbled — let DEMANDE_LANGUE or LLM handle
  
  // Check for garbled: no French structure, too many consonant clusters, or very short nonsense
  if (words.length <= 2 && !frenchWords.test(lower) && !/^(oui|non|ok|ouais|nan|hey|oh|ah|euh|hein|bah|ben|bof|pff)$/i.test(lower)) {
    // Could be garbled — check if it looks like real words
    const consonantHeavy = words.filter(w => {
      const vowels = (w.match(/[aeiouyàâäéèêëïîôùûü]/gi) || []).length;
      return vowels < w.length * 0.25 && w.length > 3;
    });
    if (consonantHeavy.length > 0) return true;
  }
  
  return false;
}

function detectLocalIntent(text: string): LocalIntent {
  const lower = text.toLowerCase().trim();
  
  // Check for garbled/incomprehensible text first
  if (isGarbledText(lower)) {
    return "NOT_UNDERSTOOD";
  }
  
  // Sort by priority (highest first)
  const sorted = [...INTENT_RULES].sort((a, b) => b.priority - a.priority);
  
  for (const rule of sorted) {
    if (rule.patterns.some(p => p.test(lower))) {
      return rule.intent;
    }
  }
  return "GENERAL";
}
