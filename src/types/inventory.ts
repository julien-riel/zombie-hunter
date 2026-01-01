import type Phaser from 'phaser';
import type { GameScene } from '@/scenes/GameScene';
import type { Player } from '@/entities/Player';
import type { WeaponRarityType } from '@/weapons/WeaponRarity';

/**
 * Catégorie d'arme
 */
export type WeaponCategory = 'melee' | 'ranged';

/**
 * Type de condition de déblocage
 */
export type UnlockConditionType =
  | 'default'    // Disponible dès le début
  | 'wave'       // Débloqué à une wave spécifique
  | 'purchase'   // Achat en boutique
  | 'boss'       // Récompense de boss
  | 'secret';    // Condition secrète

/**
 * Condition de déblocage d'une arme
 */
export interface UnlockCondition {
  type: UnlockConditionType;
  value?: number;  // Wave number ou prix
  description?: string;
}

/**
 * Interface minimale pour une arme (ranged ou melee)
 * Permet la compatibilité avec Chainsaw qui n'étend pas MeleeWeapon
 */
export interface BaseWeaponInterface {
  fire(direction: Phaser.Math.Vector2): boolean;
  getDamage(): number;
  getName(): string;
  destroy(): void;
}

/**
 * Factory pour créer une arme
 * Utilise un type générique pour supporter toutes les implémentations d'armes
 * eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
export type WeaponFactory = (scene: GameScene, player: Player) => any;

/**
 * Définition complète d'une arme pour le registre
 */
export interface WeaponDefinition {
  /** Identifiant unique (ex: 'pistol', 'baseballBat') */
  id: string;
  /** Nom d'affichage */
  name: string;
  /** Catégorie (mêlée ou distance) */
  category: WeaponCategory;
  /** Factory function pour créer l'arme */
  factory: WeaponFactory;
  /** Rareté de base */
  rarity: WeaponRarityType;
  /** Condition de déblocage (défaut = disponible) */
  unlockCondition?: UnlockCondition;
  /** Description courte */
  description?: string;
  /** Tier de l'arme (1-4, pour progression) */
  tier?: number;
}

/**
 * Configuration du loadout actif (4 armes par wave)
 */
export interface LoadoutConfig {
  /** IDs des 2 armes de mêlée [slot1, slot2] */
  meleeSlots: [string | null, string | null];
  /** IDs des 2 armes à distance [slot3, slot4] */
  rangedSlots: [string | null, string | null];
}

/**
 * État complet de l'inventaire du joueur
 */
export interface InventoryState {
  /** IDs de toutes les armes débloquées */
  unlockedWeapons: string[];
  /** Loadout actuel pour la wave en cours */
  currentLoadout: LoadoutConfig;
  /** Loadout par défaut (fallback) */
  defaultLoadout: LoadoutConfig;
}

/**
 * Données sérialisées pour la sauvegarde
 */
export interface InventorySaveData {
  unlockedWeapons: string[];
  lastLoadout: LoadoutConfig;
}

/**
 * Événements du système d'inventaire
 */
export interface InventoryEvents {
  'weapon:unlocked': { weaponId: string; definition: WeaponDefinition };
  'loadout:changed': { loadout: LoadoutConfig };
  'slot:changed': { category: WeaponCategory; slotIndex: number; weaponId: string | null };
}

/**
 * Loadout par défaut pour la wave 1
 */
export const DEFAULT_LOADOUT: LoadoutConfig = {
  meleeSlots: ['baseballBat', null],
  rangedSlots: ['pistol', null],
};

/**
 * Armes débloquées par défaut au début du jeu
 */
export const DEFAULT_UNLOCKED_WEAPONS: string[] = [
  'baseballBat',
  'pistol',
];
