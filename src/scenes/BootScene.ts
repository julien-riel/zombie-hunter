import Phaser from 'phaser';
import { SCENE_KEYS } from '@config/constants';

/**
 * Scène d'initialisation du jeu
 * Charge les assets minimaux et configure le jeu
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  /**
   * Précharge les assets nécessaires pour l'écran de chargement
   */
  preload(): void {
    // Rien à charger pour l'instant - les placeholders seront générés
  }

  /**
   * Initialise les paramètres globaux et passe à PreloadScene
   */
  create(): void {
    // Configuration de l'input
    this.input.setDefaultCursor('crosshair');

    // Transition vers la scène de préchargement
    this.scene.start(SCENE_KEYS.PRELOAD);
  }
}
