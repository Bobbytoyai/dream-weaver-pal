import type { LocalIntent, IntentRule } from "./types";
import { INTENT_RULES_SAFETY } from "./intentRules-safety";
import { INTENT_RULES_EMOTIONS } from "./intentRules-emotions";
import { INTENT_RULES_SOCIAL } from "./intentRules-social";
import { INTENT_RULES_DAILY } from "./intentRules-daily";
import { INTENT_RULES_SITUATIONAL } from "./intentRules-situational";
import { INTENT_RULES_REQUESTS } from "./intentRules-requests";
import { INTENT_RULES_CONVERSATION } from "./intentRules-conversation";

const INTENT_RULES: IntentRule[] = [
  ...INTENT_RULES_SAFETY,
  ...INTENT_RULES_EMOTIONS,
  ...INTENT_RULES_SOCIAL,
  ...INTENT_RULES_DAILY,
  ...INTENT_RULES_SITUATIONAL,
  ...INTENT_RULES_REQUESTS,
  ...INTENT_RULES_CONVERSATION,
];

export function isGarbledText(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return true;
  
  const frenchWords = /[àâäéèêëïîôùûüÿçœæ]|le |la |les |un |une |des |je |tu |il |elle |nous |vous |est |et |ou |de |du |en |au |ce |mon |ton |son |qui |que |pour |pas |avec |sur |dans |mais |comme |très |trop |bien |tout /i;
  const englishWords = /\b(the|is|are|was|were|have|has|had|will|would|could|should|can|do|does|did|not|and|but|or|for|with|this|that|from|what|how|why|when|where|who|your|you|my|his|her|its|our|speak|talk|say|tell|want|need|like|love|go|come|get|make|know|think|see|look|find|give|take|play|run|eat|sleep|help|work|call|try|ask|use|put|keep|let|begin|show|hear|turn|move|live|believe|bring|happen|write|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|open|walk|win|offer|remember|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain)\b/i;

  const engMatch = lower.match(englishWords);
  if (engMatch && engMatch.length >= 2) return false;
  
  if (words.length <= 2 && !frenchWords.test(lower) && !/^(oui|non|ok|ouais|nan|hey|oh|ah|euh|hein|bah|ben|bof|pff)$/i.test(lower)) {
    const consonantHeavy = words.filter(w => {
      const vowels = (w.match(/[aeiouyàâäéèêëïîôùûü]/gi) || []).length;
      return vowels < w.length * 0.25 && w.length > 3;
    });
    if (consonantHeavy.length > 0) return true;
  }
  
  return false;
}

export function detectLocalIntent(text: string): LocalIntent {
  const lower = text.toLowerCase().trim();
  
  if (isGarbledText(lower)) {
    return "NOT_UNDERSTOOD";
  }
  
  const sorted = [...INTENT_RULES].sort((a, b) => b.priority - a.priority);
  
  for (const rule of sorted) {
    if (rule.patterns.some(p => p.test(lower))) {
      return rule.intent;
    }
  }
  return "GENERAL";
}
