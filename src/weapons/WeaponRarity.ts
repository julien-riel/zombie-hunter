/**
 * Types de rareté d'armes
 */
export type WeaponRarityType = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Configuration d'une rareté
 */
export interface RarityConfig {
  name: string;
  color: number;
  glowColor: number;
  borderColor: number;
  dropChance: number;
  damageMultiplier: number;
}

/**
 * Configuration des raretés d'armes
 */
export const WEAPON_RARITY: Record<WeaponRarityType, RarityConfig> = {
  common: {
    name: 'Commun',
    color: 0x888888, // Gris
    glowColor: 0xaaaaaa,
    borderColor: 0x666666,
    dropChance: 0.6, // 60% des drops
    damageMultiplier: 1.0,
  },
  rare: {
    name: 'Rare',
    color: 0x44aa44, // Vert
    glowColor: 0x66cc66,
    borderColor: 0x338833,
    dropChance: 0.25, // 25% des drops
    damageMultiplier: 1.15,
  },
  epic: {
    name: 'Épique',
    color: 0xaa44ff, // Violet
    glowColor: 0xcc66ff,
    borderColor: 0x8833cc,
    dropChance: 0.12, // 12% des drops
    damageMultiplier: 1.3,
  },
  legendary: {
    name: 'Légendaire',
    color: 0xffaa00, // Orange
    glowColor: 0xffcc44,
    borderColor: 0xcc8800,
    dropChance: 0.03, // 3% des drops
    damageMultiplier: 1.5,
  },
};

/**
 * Retourne la config de rareté
 */
export function getRarityConfig(rarity: WeaponRarityType): RarityConfig {
  return WEAPON_RARITY[rarity];
}

/**
 * Retourne la couleur hexadécimale pour CSS
 */
export function getRarityColorHex(rarity: WeaponRarityType): string {
  const color = WEAPON_RARITY[rarity].color;
  return '#' + color.toString(16).padStart(6, '0');
}

/**
 * Sélectionne une rareté aléatoire basée sur les probabilités
 * Peut être modifié par un bonus de chance (combo, vague, etc.)
 */
export function rollRarity(luckBonus: number = 0): WeaponRarityType {
  const roll = Math.random() * (1 - luckBonus);

  // Parcourir les raretés de la plus rare à la plus commune
  const rarities: WeaponRarityType[] = ['legendary', 'epic', 'rare', 'common'];
  let cumulative = 0;

  for (const rarity of rarities) {
    cumulative += WEAPON_RARITY[rarity].dropChance;
    if (roll < cumulative || rarity === 'common') {
      return rarity;
    }
  }

  return 'common';
}

/**
 * Compare deux raretés
 * Retourne > 0 si a est plus rare que b
 * Retourne < 0 si a est moins rare que b
 * Retourne 0 si égal
 */
export function compareRarity(a: WeaponRarityType, b: WeaponRarityType): number {
  const order: Record<WeaponRarityType, number> = {
    common: 0,
    rare: 1,
    epic: 2,
    legendary: 3,
  };
  return order[a] - order[b];
}

/**
 * Retourne le tier d'une rareté (1-4)
 */
export function getRarityTier(rarity: WeaponRarityType): number {
  const tiers: Record<WeaponRarityType, number> = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
  };
  return tiers[rarity];
}

/**
 * Symboles pour l'affichage (étoiles)
 */
export function getRaritySymbol(rarity: WeaponRarityType): string {
  const symbols: Record<WeaponRarityType, string> = {
    common: '★',
    rare: '★★',
    epic: '★★★',
    legendary: '★★★★',
  };
  return symbols[rarity];
}
