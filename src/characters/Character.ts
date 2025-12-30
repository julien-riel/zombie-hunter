/**
 * Character Base Class - Phase 7.1
 *
 * Classe de base abstraite pour tous les personnages jouables.
 * Chaque personnage définit ses stats, passifs et compétence unique.
 */

import type { CharacterType } from '@/types/entities';
import type { CharacterStats, PassiveEffect, StartingWeaponType } from './CharacterStats';
import type { CharacterAbility } from './CharacterAbility';

/**
 * Classe de base abstraite pour les personnages
 */
export abstract class Character {
  /** Identifiant unique du personnage */
  abstract readonly id: CharacterType;
  /** Nom complet du personnage */
  abstract readonly name: string;
  /** Description courte du personnage */
  abstract readonly description: string;
  /** Description du style de jeu */
  abstract readonly playstyle: string;

  /** Stats du personnage */
  abstract readonly stats: CharacterStats;
  /** Compétence active unique */
  abstract readonly ability: CharacterAbility;
  /** Effets passifs du personnage */
  abstract readonly passives: PassiveEffect[];

  /** Arme de départ */
  abstract readonly startingWeapon: StartingWeaponType;

  /** Sprite/texture du personnage (clé d'asset) */
  abstract readonly spriteKey: string;

  /** Condition de déblocage (pour l'affichage) */
  abstract readonly unlockCondition: string;

  /**
   * Vérifie si le personnage est débloqué
   * @param unlockedCharacters Liste des IDs de personnages débloqués
   */
  isUnlocked(unlockedCharacters: string[]): boolean {
    // Le premier personnage (cop) est toujours débloqué
    if (this.id === 'cop') {
      return true;
    }
    return unlockedCharacters.includes(this.id);
  }
}

/**
 * Interface pour la configuration JSON d'un personnage
 * Utilisée pour la sérialisation/désérialisation
 */
export interface CharacterConfig {
  id: CharacterType;
  name: string;
  description: string;
  playstyle: string;
  stats: CharacterStats;
  passives: PassiveEffect[];
  startingWeapon: StartingWeaponType;
  spriteKey: string;
  unlockCondition: string;
  // La compétence est définie par code, pas par config
}

/**
 * Informations de base sur un personnage (pour le menu de sélection)
 */
export interface CharacterInfo {
  id: CharacterType;
  name: string;
  description: string;
  playstyle: string;
  abilityName: string;
  abilityDescription: string;
  passives: PassiveEffect[];
  isUnlocked: boolean;
  unlockCondition: string;
}

/**
 * Extrait les informations de base d'un personnage
 */
export function getCharacterInfo(character: Character, isUnlocked: boolean): CharacterInfo {
  return {
    id: character.id,
    name: character.name,
    description: character.description,
    playstyle: character.playstyle,
    abilityName: character.ability.name,
    abilityDescription: character.ability.description,
    passives: character.passives,
    isUnlocked,
    unlockCondition: character.unlockCondition,
  };
}
