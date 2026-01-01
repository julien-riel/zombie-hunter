/**
 * Armes Expérimentales - Phase 4
 *
 * Ces armes sont les plus puissantes du jeu et ont des conditions
 * de déblocage spéciales.
 */

export { FreezeRay } from './FreezeRay';
export { GravityGun } from './GravityGun';
export { BlackHoleGenerator } from './BlackHoleGenerator';
export { LaserMinigun } from './LaserMinigun';
export { ZombieConverter } from './ZombieConverter';

/**
 * Types d'armes expérimentales
 */
export type ExperimentalWeaponType =
  | 'freezeRay'
  | 'gravityGun'
  | 'blackHoleGenerator'
  | 'laserMinigun'
  | 'zombieConverter';

/**
 * Conditions de déblocage des armes expérimentales
 */
export interface UnlockCondition {
  type: 'wave' | 'bossDrop' | 'purchase' | 'secret';
  value?: number; // Vague requise ou prix
  description: string;
}

/**
 * Configuration des conditions de déblocage
 */
export const EXPERIMENTAL_UNLOCK_CONDITIONS: Record<ExperimentalWeaponType, UnlockCondition> = {
  freezeRay: {
    type: 'wave',
    value: 20,
    description: 'Atteindre la vague 20',
  },
  gravityGun: {
    type: 'wave',
    value: 20,
    description: 'Atteindre la vague 20',
  },
  blackHoleGenerator: {
    type: 'bossDrop',
    description: 'Drop de boss (Abomination, Patient Zéro ou Colosse)',
  },
  laserMinigun: {
    type: 'purchase',
    value: 10000,
    description: 'Achat pour 10 000 points',
  },
  zombieConverter: {
    type: 'secret',
    description: 'Convertir 100 zombies au total (déblocage permanent)',
  },
};

/**
 * Vérifie si une arme expérimentale est débloquée
 */
export function isExperimentalWeaponUnlocked(
  weaponType: ExperimentalWeaponType,
  gameState: {
    currentWave: number;
    totalPoints: number;
    bossesDefeated: string[];
    totalZombiesConverted: number;
    unlockedWeapons: Set<string>;
  }
): boolean {
  const condition = EXPERIMENTAL_UNLOCK_CONDITIONS[weaponType];

  // Vérifier si déjà débloqué de manière permanente
  if (gameState.unlockedWeapons.has(weaponType)) {
    return true;
  }

  switch (condition.type) {
    case 'wave':
      return gameState.currentWave >= (condition.value || 0);

    case 'bossDrop':
      return gameState.bossesDefeated.length > 0;

    case 'purchase':
      return gameState.totalPoints >= (condition.value || 0);

    case 'secret':
      // Le Zombie Converter nécessite d'avoir converti 100 zombies au total
      return gameState.totalZombiesConverted >= 100;

    default:
      return false;
  }
}
