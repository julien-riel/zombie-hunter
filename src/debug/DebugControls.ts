import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { DebugSpawner } from './DebugSpawner';

/**
 * Callbacks pour les actions de debug
 */
export interface DebugControlCallbacks {
  onTogglePanel?: () => void;
  onTogglePause?: () => void;
  onExitPlacementMode?: () => void;
  onToggleFlowFieldDebug?: () => void;
}

/**
 * Gestion des contrôles clavier pour le mode debug
 *
 * Raccourcis minimaux (pour ne pas interférer avec le jeu):
 * - F1: Toggle panneau debug
 * - F2: Toggle pause (game pause)
 * - F3: Toggle flowfield debug visualization
 * - ESC: Annuler le mode placement
 *
 * Toutes les autres actions sont disponibles via le panneau debug (F1)
 */
export class DebugControls {
  private scene: Phaser.Scene;
  private callbacks: DebugControlCallbacks;

  private keys: { [key: string]: Phaser.Input.Keyboard.Key } = {};

  /** Mode de placement actif (click pour spawner) */
  private placementMode: boolean = false;

  constructor(
    scene: Phaser.Scene,
    _gameScene: GameScene,
    _spawner: DebugSpawner,
    callbacks: DebugControlCallbacks = {}
  ) {
    this.scene = scene;
    this.callbacks = callbacks;

    this.setupKeys();
  }

  /**
   * Configure les raccourcis clavier (minimal - F1, F2, F3, ESC)
   */
  private setupKeys(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    // F1 toggle panel, F2 toggle pause, F3 flowfield debug, ESC annuler modes
    this.keys = {
      F1: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1),
      F2: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F2),
      F3: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3),
      ESC: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };
  }

  /**
   * Active/désactive le mode de placement
   */
  public setPlacementMode(enabled: boolean): void {
    this.placementMode = enabled;
  }

  /**
   * Vérifie si le mode placement est actif
   */
  public isPlacementModeActive(): boolean {
    return this.placementMode;
  }

  /**
   * Met à jour les contrôles (appelé chaque frame)
   * Gère F1 (toggle panel), F2 (pause), F3 (flowfield debug), ESC (annuler modes)
   */
  public update(): void {
    // F1: Toggle panneau
    if (Phaser.Input.Keyboard.JustDown(this.keys.F1)) {
      this.callbacks.onTogglePanel?.();
    }

    // F2: Toggle pause
    if (Phaser.Input.Keyboard.JustDown(this.keys.F2)) {
      this.callbacks.onTogglePause?.();
    }

    // F3: Toggle flowfield debug
    if (Phaser.Input.Keyboard.JustDown(this.keys.F3)) {
      this.callbacks.onToggleFlowFieldDebug?.();
    }

    // ESC: Annuler le mode placement
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.callbacks.onExitPlacementMode?.();
    }
  }

  /**
   * Met à jour les callbacks
   */
  public setCallbacks(callbacks: DebugControlCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    // Les touches sont automatiquement nettoyées par Phaser
  }
}
