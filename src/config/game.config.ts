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
 * Détermine le meilleur mode de scale en fonction de l'écran
 * - Si l'écran est plus large que le ratio du jeu (16:9) → HEIGHT_CONTROLS_WIDTH
 * - Sinon → FIT pour ne pas déborder
 */
function getOptimalScaleMode(): Phaser.Scale.ScaleModeType {
  const gameRatio = 1280 / 720; // ~1.78 (16:9)
  const screenRatio = window.innerWidth / window.innerHeight;

  // Si l'écran est plus large que le jeu, on peut utiliser HEIGHT_CONTROLS_WIDTH
  // Sinon on utilise FIT pour ne pas déborder horizontalement
  if (screenRatio >= gameRatio) {
    return Phaser.Scale.HEIGHT_CONTROLS_WIDTH;
  }
  return Phaser.Scale.FIT;
}

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
    mode: getOptimalScaleMode(),
    autoCenter: Phaser.Scale.CENTER_BOTH,
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
