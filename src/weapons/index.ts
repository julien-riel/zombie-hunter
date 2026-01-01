// Base classes
export { Weapon } from './Weapon';
export type { WeaponConfig } from './Weapon';

// Rarity system
export { WEAPON_RARITY, getRarityConfig, getRarityColorHex, rollRarity, compareRarity, getRarityTier, getRaritySymbol } from './WeaponRarity';
export type { WeaponRarityType, RarityConfig } from './WeaponRarity';

// Firearms
export * from './firearms';

// Explosive
export * from './explosive';

// Melee
export * from './melee';

// Experimental
export * from './experimental';
