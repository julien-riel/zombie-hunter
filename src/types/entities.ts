/**
 * Types liés aux entités du jeu
 *
 * Note: Les valeurs numériques de configuration sont dans src/config/balance.ts
 * Ces types définissent les structures, balance.ts définit les valeurs.
 */

import { ZombieBalanceType } from '@config/balance';

/**
 * Type des zombies - dérivé de balance.ts pour cohérence
 */
export type ZombieType = ZombieBalanceType;

export type BossType = 'abomination' | 'patient_zero' | 'colossus';

export type CharacterType = 'cop' | 'doctor' | 'mechanic' | 'athlete' | 'pyromaniac' | 'kid';

export interface EntityStats {
  maxHealth: number;
  speed: number;
  damage: number;
}

export interface ZombieConfig extends EntityStats {
  type: ZombieType;
  points: number;
  dropChance: number;
}

export interface BossConfig extends EntityStats {
  type: BossType;
  phases: number;
}
