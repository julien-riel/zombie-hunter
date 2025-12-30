/**
 * Constantes globales du jeu
 *
 * Note: Les constantes de gameplay (joueur, zombies, armes, vagues, combat)
 * sont centralisées dans src/config/balance.ts
 */

// Dimensions
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE_SIZE = 32;

// Catégories de collision (bitmask)
export const COLLISION_CATEGORIES = {
  PLAYER: 0x0001,
  ZOMBIE: 0x0002,
  PLAYER_PROJECTILE: 0x0004,
  ZOMBIE_PROJECTILE: 0x0008,
  WALL: 0x0010,
  COVER: 0x0020,
  ITEM: 0x0040,
  TERRAIN_ZONE: 0x0080,
} as const;

// Clés des scènes
export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MENU: 'MenuScene',
  GAME: 'GameScene',
  HUD: 'HUDScene',
  PAUSE: 'PauseScene',
  UPGRADE: 'UpgradeScene',
  TACTICAL: 'TacticalMenuScene',
  PROGRESSION: 'ProgressionScene',
  GAME_OVER: 'GameOverScene',
  DEBUG: 'DebugScene',
} as const;
