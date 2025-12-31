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
  ProgressionScene,
  DebugScene,
} from '@scenes/index';

/**
 * Configuration principale du jeu Phaser
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: import.meta.env.DEV,
    },
  },
  scale: {
    mode: Phaser.Scale.HEIGHT_CONTROLS_WIDTH,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    min: {
      width: 320,
      height: 480,
    },
    max: {
      width: 1920,
      height: 1080,
    },
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
    ProgressionScene,
    DebugScene,
  ],
};
