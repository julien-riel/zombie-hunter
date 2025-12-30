/**
 * Characters Module - Phase 7.1
 *
 * Barrel exports pour le système de personnages.
 */

// Stats et types
export {
  type CharacterStats,
  type PassiveEffect,
  type StartingWeaponType,
  DEFAULT_CHARACTER_STATS,
  createCharacterStats,
} from './CharacterStats';

// Système de compétences
export { type CharacterAbility, AbilityManager } from './CharacterAbility';

// Classe de base
export {
  Character,
  type CharacterConfig,
  type CharacterInfo,
  getCharacterInfo,
} from './Character';

// Factory
export {
  CharacterFactory,
  CHARACTER_DISPLAY_ORDER,
  CHARACTER_UNLOCK_INFO,
} from './CharacterFactory';

// Personnages individuels
export { Cop } from './Cop';
