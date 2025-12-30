/**
 * Character Factory - Phase 7.1
 *
 * Factory pour créer et gérer les instances de personnages.
 * Point d'entrée central pour accéder aux personnages.
 */

import type { CharacterType } from '@/types/entities';
import { Character, getCharacterInfo, type CharacterInfo } from './Character';
import { Cop } from './Cop';
import { Doctor } from './Doctor';
import { Mechanic } from './Mechanic';
import { Athlete } from './Athlete';
import { Pyromaniac } from './Pyromaniac';
import { Kid } from './Kid';

/**
 * Map des constructeurs de personnages
 */
const CHARACTER_CONSTRUCTORS: Record<CharacterType, new () => Character> = {
  cop: Cop,
  doctor: Doctor,
  mechanic: Mechanic,
  athlete: Athlete,
  pyromaniac: Pyromaniac,
  kid: Kid,
};

/**
 * Cache des instances de personnages (singleton par type)
 */
const characterCache: Map<CharacterType, Character> = new Map();

/**
 * Factory pour créer des personnages
 */
export class CharacterFactory {
  /**
   * Récupère une instance de personnage par son type
   * @param type Type de personnage
   * @returns Instance du personnage
   */
  static getCharacter(type: CharacterType): Character {
    // Vérifier le cache
    if (characterCache.has(type)) {
      return characterCache.get(type)!;
    }

    // Créer une nouvelle instance
    const Constructor = CHARACTER_CONSTRUCTORS[type];
    if (!Constructor) {
      console.warn(`Unknown character type: ${type}, falling back to cop`);
      return CharacterFactory.getCharacter('cop');
    }

    const character = new Constructor();
    characterCache.set(type, character);
    return character;
  }

  /**
   * Récupère le personnage par défaut (Cop)
   */
  static getDefaultCharacter(): Character {
    return CharacterFactory.getCharacter('cop');
  }

  /**
   * Récupère tous les types de personnages disponibles
   */
  static getAllCharacterTypes(): CharacterType[] {
    return Object.keys(CHARACTER_CONSTRUCTORS) as CharacterType[];
  }

  /**
   * Récupère les informations de tous les personnages
   * @param unlockedCharacters Liste des IDs de personnages débloqués
   */
  static getAllCharacterInfo(unlockedCharacters: string[]): CharacterInfo[] {
    return CharacterFactory.getAllCharacterTypes().map((type) => {
      const character = CharacterFactory.getCharacter(type);
      const isUnlocked = character.isUnlocked(unlockedCharacters);
      return getCharacterInfo(character, isUnlocked);
    });
  }

  /**
   * Récupère les personnages débloqués uniquement
   * @param unlockedCharacters Liste des IDs de personnages débloqués
   */
  static getUnlockedCharacters(unlockedCharacters: string[]): Character[] {
    return CharacterFactory.getAllCharacterTypes()
      .map((type) => CharacterFactory.getCharacter(type))
      .filter((character) => character.isUnlocked(unlockedCharacters));
  }

  /**
   * Vérifie si un type de personnage existe
   */
  static isValidCharacterType(type: string): type is CharacterType {
    return type in CHARACTER_CONSTRUCTORS;
  }

  /**
   * Efface le cache des personnages (utile pour les tests)
   */
  static clearCache(): void {
    characterCache.clear();
  }
}

/**
 * Liste ordonnée des personnages pour l'affichage
 */
export const CHARACTER_DISPLAY_ORDER: CharacterType[] = [
  'cop',
  'doctor',
  'mechanic',
  'athlete',
  'pyromaniac',
  'kid',
];

/**
 * Informations de déblocage des personnages
 */
export const CHARACTER_UNLOCK_INFO: Record<CharacterType, { condition: string; hidden: boolean }> = {
  cop: { condition: 'Disponible dès le départ', hidden: false },
  doctor: { condition: 'Jouer 5 parties', hidden: false },
  mechanic: { condition: 'Atteindre la vague 15', hidden: false },
  athlete: { condition: 'Atteindre la vague 10', hidden: false },
  pyromaniac: { condition: 'Tuer 500 zombies au total', hidden: true },
  kid: { condition: 'Atteindre la vague 20', hidden: true },
};
