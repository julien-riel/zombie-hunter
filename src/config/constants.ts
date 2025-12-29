/**
 * Constantes globales du jeu
 */

// Dimensions
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE_SIZE = 32;

// Joueur
export const PLAYER_SPEED = 200;
export const PLAYER_DASH_SPEED = 400;
export const PLAYER_DASH_DURATION = 200;
export const PLAYER_DASH_COOLDOWN = 1000;
export const PLAYER_MAX_HEALTH = 100;

// Combat
export const DEFAULT_BULLET_SPEED = 600;
export const DEFAULT_BULLET_DAMAGE = 10;

// Combo
export const COMBO_TIMEOUT = 3000;
export const COMBO_MAX_MULTIPLIER = 10;

// Vagues
export const WAVE_TRANSITION_DELAY = 3000;
export const BASE_SPAWN_DELAY = 1000;

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
  GAME_OVER: 'GameOverScene',
} as const;
