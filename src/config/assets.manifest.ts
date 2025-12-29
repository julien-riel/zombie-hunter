/**
 * Manifeste des assets du jeu
 * Centralise toutes les références aux ressources
 */

export const ASSET_KEYS = {
  // Sprites joueur
  PLAYER: 'player',

  // Sprites zombies
  SHAMBLER: 'shambler',
  RUNNER: 'runner',
  CRAWLER: 'crawler',
  TANK: 'tank',
  SPITTER: 'spitter',
  BOMBER: 'bomber',
  SCREAMER: 'screamer',
  SPLITTER: 'splitter',
  INVISIBLE: 'invisible',
  NECROMANCER: 'necromancer',

  // Boss
  ABOMINATION: 'abomination',
  PATIENT_ZERO: 'patient_zero',
  COLOSSUS: 'colossus',

  // Projectiles
  BULLET: 'bullet',
  PELLET: 'pellet',
  FLAME: 'flame',
  ACID: 'acid',

  // Armes
  PISTOL: 'pistol',
  SHOTGUN: 'shotgun',
  SMG: 'smg',
  SNIPER: 'sniper',

  // Tilemaps
  HOSPITAL: 'hospital',
  MALL: 'mall',
  METRO: 'metro',
  LAB: 'lab',
  PRISON: 'prison',

  // UI
  HEALTH_BAR: 'health_bar',
  AMMO_ICON: 'ammo_icon',
} as const;

export type AssetKey = (typeof ASSET_KEYS)[keyof typeof ASSET_KEYS];
