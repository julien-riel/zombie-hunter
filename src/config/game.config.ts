import Phaser from 'phaser';
import {
  BootScene,
  PreloadScene,
  MainMenuScene,
  CharacterSelectScene,
  ModeSelectScene,
  OptionsScene,
  GameScene,
  HUDScene,
  PauseScene,
  GameOverScene,
  UpgradeScene,
  TacticalMenuScene,
  LoadoutSelectionScene,
  ProgressionScene,
  DebugScene,
} from '@scenes/index';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

/**
 * Configuration principale du jeu Phaser
 *
 * Stratégie de scaling:
 * - Le jeu a un ratio fixe de 16:9 (1280x720)
 * - Mode FIT: s'adapte à l'écran sans jamais déborder
 * - Sur écrans plus larges (iPhone paysage): hauteur 100%, bandes noires sur les côtés
 * - Sur écrans plus étroits: largeur 100%, bandes noires en haut/bas
 * - Toujours centré
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: import.meta.env.DEV,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3, // Support multi-touch (2 joysticks + 1 bouton)
    touch: {
      capture: true,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    CharacterSelectScene,
    ModeSelectScene,
    OptionsScene,
    GameScene,
    HUDScene,
    PauseScene,
    GameOverScene,
    UpgradeScene,
    TacticalMenuScene,
    LoadoutSelectionScene,
    ProgressionScene,
    DebugScene,
  ],
};
