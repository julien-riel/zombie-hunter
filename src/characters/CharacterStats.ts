/**
 * Character Stats - Phase 7.1
 *
 * Définit l'interface et les valeurs par défaut des stats de personnages.
 * Ces stats modifient les valeurs de base du joueur définies dans BALANCE.
 */

import { BALANCE } from '@config/balance';

/**
 * Stats complètes d'un personnage
 */
export interface CharacterStats {
  // Stats de base
  maxHealth: number;
  moveSpeed: number;
  dashCooldown: number;
  dashDistance: number;

  // Modificateurs de combat
  damageMultiplier: number;
  accuracyBonus: number;
  critChance: number;

  // Utilitaire
  pickupRadius: number;

  // Résistances (0-1, où 1 = immunité)
  fireResistance: number;
  poisonResistance: number;
}

/**
 * Stats par défaut basées sur BALANCE.player
 * Utilisées quand aucun personnage n'est sélectionné
 */
export const DEFAULT_CHARACTER_STATS: CharacterStats = {
  maxHealth: BALANCE.player.maxHealth,
  moveSpeed: BALANCE.player.speed,
  dashCooldown: BALANCE.player.dashCooldown,
  dashDistance: BALANCE.player.dashDuration * (BALANCE.player.dashSpeed / 1000),

  damageMultiplier: 1.0,
  accuracyBonus: 0,
  critChance: 0,

  pickupRadius: 50,

  fireResistance: 0,
  poisonResistance: 0,
};

/**
 * Effet passif d'un personnage
 */
export interface PassiveEffect {
  /** Identifiant unique du passif */
  id: string;
  /** Nom affiché */
  name: string;
  /** Description de l'effet */
  description: string;
  /** Icône du passif (clé d'asset) */
  icon?: string;
}

/**
 * Crée des stats de personnage en fusionnant avec les valeurs par défaut
 * @param overrides Stats à surcharger
 * @returns Stats complètes du personnage
 */
export function createCharacterStats(overrides: Partial<CharacterStats>): CharacterStats {
  return {
    ...DEFAULT_CHARACTER_STATS,
    ...overrides,
  };
}

/**
 * Types d'armes de départ possibles
 */
export type StartingWeaponType =
  | 'pistol'
  | 'revolver'
  | 'shotgun'
  | 'smg'
  | 'nailgun'
  | 'flamethrower';
