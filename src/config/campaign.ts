/**
 * Configuration de la campagne (Phase 8.2)
 *
 * Définit les niveaux de la campagne avec leurs objectifs,
 * conditions de déblocage et récompenses.
 */

import type { CampaignLevel } from '@/types/modes';

/**
 * Liste des niveaux de la campagne
 */
export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  // Niveau 1: Réveil - Tutoriel
  {
    id: 'level_1',
    name: 'Réveil',
    arena: 'hospital',
    objectives: [
      {
        type: 'survive',
        target: 3,
        description: 'Survivre 3 vagues',
      },
    ],
    waves: 3,
    starThresholds: [500, 1000, 2000],
    unlockCondition: null, // Toujours débloqué
    narrative:
      'Vous vous réveillez dans un hôpital abandonné. Les couloirs résonnent de gémissements... ' +
      'Il faut trouver une sortie.',
    narrativeEnd:
      "Vous avez survécu à l'horreur de l'hôpital. Mais ce n'était que le début...",
    rewards: {
      xp: 100,
    },
  },

  // Niveau 2: Évacuation
  {
    id: 'level_2',
    name: 'Évacuation',
    arena: 'hall',
    objectives: [
      {
        type: 'survive',
        target: 5,
        description: 'Survivre 5 vagues',
      },
      {
        type: 'kill',
        target: 30,
        description: 'Éliminer 30 zombies',
      },
    ],
    waves: 5,
    starThresholds: [1500, 3000, 5000],
    unlockCondition: 'level_1',
    narrative:
      "Vous êtes arrivé au hall d'entrée. Les sirènes d'évacuation hurlent, " +
      'mais les zombies bloquent toutes les sorties. Il faut se frayer un chemin.',
    narrativeEnd:
      "L'évacuation est un échec. Vous devez trouver un autre moyen de sortir de la ville.",
    rewards: {
      xp: 200,
    },
  },

  // Niveau 3: Ravitaillement
  {
    id: 'level_3',
    name: 'Ravitaillement',
    arena: 'warehouse',
    objectives: [
      {
        type: 'survive',
        target: 6,
        description: 'Survivre 6 vagues',
      },
      {
        type: 'collect',
        target: 5,
        description: 'Collecter 5 caisses de munitions',
      },
    ],
    waves: 6,
    starThresholds: [2000, 4000, 7000],
    unlockCondition: 'level_2',
    narrative:
      "Un entrepôt abandonné regorge de fournitures. Mais l'endroit grouille de morts-vivants. " +
      'Récupérez ce que vous pouvez.',
    narrativeEnd:
      "Bien équipé, vous êtes prêt pour la prochaine étape. Le métro pourrait être une issue...",
    rewards: {
      xp: 300,
      unlocks: ['shotgun'],
    },
  },

  // Niveau 4: Le Métro
  {
    id: 'level_4',
    name: 'Le Métro',
    arena: 'subway',
    objectives: [
      {
        type: 'survive',
        target: 8,
        description: 'Survivre 8 vagues',
      },
      {
        type: 'boss',
        target: 1,
        description: 'Vaincre le Charger Mutant',
      },
    ],
    waves: 8,
    starThresholds: [3000, 6000, 10000],
    unlockCondition: 'level_3',
    narrative:
      'Les tunnels du métro sont votre seul espoir de quitter la ville. ' +
      "Mais quelque chose de plus gros rôde dans l'obscurité...",
    narrativeEnd:
      'Le monstre est vaincu. Les tunnels mènent à un laboratoire souterrain. ' +
      "C'est peut-être là que tout a commencé.",
    rewards: {
      xp: 500,
      unlocks: ['smg'],
    },
  },

  // Niveau 5: Origines - Final
  {
    id: 'level_5',
    name: 'Origines',
    arena: 'laboratory',
    objectives: [
      {
        type: 'survive',
        target: 10,
        description: 'Survivre 10 vagues',
      },
      {
        type: 'boss',
        target: 1,
        description: 'Vaincre Patient Zéro',
      },
      {
        type: 'time',
        target: 600, // 10 minutes max
        description: 'Terminer en moins de 10 minutes',
      },
    ],
    waves: 10,
    starThresholds: [5000, 10000, 15000],
    unlockCondition: 'level_4',
    narrative:
      "Le laboratoire Nexus Corp. C'est ici que le virus a été créé. " +
      "Le Patient Zéro, la source de l'infection, vous attend au coeur du complexe.",
    narrativeEnd:
      "Patient Zéro a été éliminé. L'épidémie peut être contenue... " +
      "Du moins, c'est ce que vous espérez.",
    rewards: {
      xp: 1000,
      unlocks: ['plasma_rifle', 'scientist'],
    },
  },
];

/**
 * Obtient un niveau par son ID
 */
export function getCampaignLevel(levelId: string): CampaignLevel | null {
  return CAMPAIGN_LEVELS.find((level) => level.id === levelId) || null;
}

/**
 * Obtient le niveau suivant
 */
export function getNextLevel(currentLevelId: string): CampaignLevel | null {
  const currentIndex = CAMPAIGN_LEVELS.findIndex((level) => level.id === currentLevelId);
  if (currentIndex === -1 || currentIndex >= CAMPAIGN_LEVELS.length - 1) {
    return null;
  }
  return CAMPAIGN_LEVELS[currentIndex + 1];
}

/**
 * Obtient le nombre d'étoiles basé sur le score
 */
export function calculateStars(levelId: string, score: number): number {
  const level = getCampaignLevel(levelId);
  if (!level) return 0;

  const [one, two, three] = level.starThresholds;
  if (score >= three) return 3;
  if (score >= two) return 2;
  if (score >= one) return 1;
  return 0;
}

/**
 * Vérifie si un niveau est débloqué
 */
export function isLevelUnlocked(
  levelId: string,
  completedLevels: string[]
): boolean {
  const level = getCampaignLevel(levelId);
  if (!level) return false;

  // Pas de condition de déblocage = toujours débloqué
  if (!level.unlockCondition) return true;

  // Vérifier si le niveau requis est complété
  return completedLevels.includes(level.unlockCondition);
}
