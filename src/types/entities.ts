/**
 * Types liés aux entités du jeu
 */

export type ZombieType =
  | 'shambler'
  | 'runner'
  | 'crawler'
  | 'tank'
  | 'spitter'
  | 'bomber'
  | 'screamer'
  | 'splitter'
  | 'invisible'
  | 'necromancer';

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
