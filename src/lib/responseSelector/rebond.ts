/**
 * Bobby AI — Conversational Rebond (Memory-Based)
 */

import { memory } from "./memory";
import { isRecentlyUsed } from "./scoring";

const topicRebonds: Record<string, string[]> = {
  jeux: [
    `Tu voulais rejouer tout à l'heure 😄 on y va ?`,
    `On avait bien rigolé avec le jeu, tu veux recommencer ?`,
  ],
  peurs: [
    `Tu te sens mieux par rapport à ce qui te faisait peur ? 💛`,
  ],
  ecole: [
    `Comment ça se passe à l'école en ce moment ?`,
  ],
  famille: [
    `Tu veux me reparler de ta famille ?`,
  ],
  curiosite: [
    `Tu avais une question super intéressante tout à l'heure 😄`,
  ],
  emotions: [
    `Comment tu te sens maintenant ? 💛`,
  ],
  imagination: [
    `Tu veux qu'on continue notre histoire imaginaire ? 🚀`,
  ],
  animaux: [
    `Tu m'avais dit que tu aimais les animaux 🐾 tu veux en parler ?`,
  ],
};

export function getConversationalRebond(childName?: string): string | null {
  if (memory.topicsHistory.length === 0) return null;

  const recentTopics = memory.topicsHistory.slice(-5);
  for (const topic of recentTopics.reverse()) {
    const rebonds = topicRebonds[topic];
    if (rebonds) {
      const fresh = rebonds.filter(r => !isRecentlyUsed(r));
      if (fresh.length > 0) {
        let text = fresh[Math.floor(Math.random() * fresh.length)];
        return text;
      }
    }
  }
  return null;
}
