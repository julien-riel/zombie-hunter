import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { DebugSpawner } from './DebugSpawner';
import { ZOMBIE_TYPES } from './DebugSpawner';
import type { ZombieType } from '@/types/entities';

/**
 * Callbacks pour les actions de debug
 */
export interface DebugControlCallbacks {
  onTogglePanel?: () => void;
  onToggleGodMode?: () => void;
  onToggleCollisionDebug?: () => void;
  onKillAllZombies?: () => void;
  onReloadAllWeapons?: () => void;
  onHealPlayer?: () => void;
  onToggleSpawnPause?: () => void;
  onNextWave?: () => void;
  onSpawnRandomItem?: () => void;
  onAdjustWave?: (delta: number) => void;
  onZombieTypeSelected?: (type: ZombieType) => void;
}

/**
 * Gestion des contrôles clavier pour le mode debug
 *
 * Raccourcis:
 * - F1: Toggle panneau debug
 * - F2: Toggle mode God
 * - F3: Toggle flow field (géré par GameScene)
 * - F4: Toggle visualisation collisions
 * - F5: Tuer tous les zombies
 * - F6: Recharger toutes les armes
 * - F7: Soigner joueur 100%
 * - F8: Pause/Resume spawns
 * - F9: Vague suivante
 * - F10: Spawn item aléatoire
 * - +/-: Ajuster numéro de vague
 * - 1-0: Sélectionner type de zombie
 * - Z: Spawn 10 shamblers
 * - X: Spawn horde mixte
 * - C: Spawn un de chaque type
 * - H: Spawn HealthDrop
 * - Q: Spawn AmmoDrop
 * - P: Activer le power-up sélectionné
 * - O: Cycler entre les power-ups
 * - L: Spawn PowerUpDrop
 * - I: Ajouter l'objet actif sélectionné à l'inventaire
 * - U: Cycler entre les objets actifs
 * - K: Déployer l'objet actif sélectionné (debug)
 * - J: Utiliser l'objet actif équipé
 * - Y: Appliquer l'upgrade sélectionné
 * - T: Cycler entre les upgrades
 * - G: Ouvrir la scène de sélection d'upgrade
 */
export class DebugControls {
  private scene: Phaser.Scene;
  private gameScene: GameScene;
  private spawner: DebugSpawner;
  private callbacks: DebugControlCallbacks;

  private keys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];

  /** Mode de placement actif (click pour spawner) */
  private placementMode: boolean = false;

  constructor(
    scene: Phaser.Scene,
    gameScene: GameScene,
    spawner: DebugSpawner,
    callbacks: DebugControlCallbacks = {}
  ) {
    this.scene = scene;
    this.gameScene = gameScene;
    this.spawner = spawner;
    this.callbacks = callbacks;

    this.setupKeys();
    this.setupMouseInput();
  }

  /**
   * Configure les raccourcis clavier
   */
  private setupKeys(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    // Touches de fonction F1-F10
    this.keys = {
      F1: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1),
      F2: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F2),
      F4: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F4),
      F5: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F5),
      F6: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F6),
      F7: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F7),
      F8: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F8),
      F9: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F9),
      F10: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F10),
      PLUS: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS),
      MINUS: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS),
      NUMPAD_ADD: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ADD),
      NUMPAD_SUBTRACT: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_SUBTRACT),
      Z: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      X: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      C: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      H: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H),
      // A est utilisé pour le mouvement, utiliser Q à la place
      Q: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      // Power-up controls
      P: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P),
      O: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O),
      L: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      // Active item controls
      I: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      U: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U),
      K: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      J: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      // Upgrade controls (Phase 6.5)
      Y: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y),
      T: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T),
      G: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G),
    };

    // Touches numériques 1-0 pour sélectionner le type de zombie
    this.numberKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.EIGHT),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NINE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ZERO),
    ];
  }

  /**
   * Configure les entrées souris pour le placement
   */
  private setupMouseInput(): void {
    // Click droit pour spawner le zombie sélectionné
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.placementMode) return;

      if (pointer.rightButtonDown()) {
        this.spawner.spawnSelectedZombie(pointer.worldX, pointer.worldY);
      }
    });
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
   */
  public update(): void {
    // F1: Toggle panneau
    if (Phaser.Input.Keyboard.JustDown(this.keys.F1)) {
      this.callbacks.onTogglePanel?.();
    }

    // F2: Toggle god mode
    if (Phaser.Input.Keyboard.JustDown(this.keys.F2)) {
      this.callbacks.onToggleGodMode?.();
    }

    // F4: Toggle collision debug
    if (Phaser.Input.Keyboard.JustDown(this.keys.F4)) {
      this.callbacks.onToggleCollisionDebug?.();
    }

    // F5: Kill all zombies
    if (Phaser.Input.Keyboard.JustDown(this.keys.F5)) {
      this.callbacks.onKillAllZombies?.();
    }

    // F6: Reload all weapons
    if (Phaser.Input.Keyboard.JustDown(this.keys.F6)) {
      this.callbacks.onReloadAllWeapons?.();
    }

    // F7: Heal player
    if (Phaser.Input.Keyboard.JustDown(this.keys.F7)) {
      this.callbacks.onHealPlayer?.();
    }

    // F8: Toggle spawn pause
    if (Phaser.Input.Keyboard.JustDown(this.keys.F8)) {
      this.callbacks.onToggleSpawnPause?.();
    }

    // F9: Next wave
    if (Phaser.Input.Keyboard.JustDown(this.keys.F9)) {
      this.callbacks.onNextWave?.();
    }

    // F10: Spawn random item
    if (Phaser.Input.Keyboard.JustDown(this.keys.F10)) {
      this.callbacks.onSpawnRandomItem?.();
    }

    // +/-: Adjust wave
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.PLUS) ||
      Phaser.Input.Keyboard.JustDown(this.keys.NUMPAD_ADD)
    ) {
      this.callbacks.onAdjustWave?.(1);
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.MINUS) ||
      Phaser.Input.Keyboard.JustDown(this.keys.NUMPAD_SUBTRACT)
    ) {
      this.callbacks.onAdjustWave?.(-1);
    }

    // Z: Spawn 10 shamblers
    if (Phaser.Input.Keyboard.JustDown(this.keys.Z)) {
      this.spawner.spawnRandomShamblers(10);
    }

    // X: Spawn mixed horde
    if (Phaser.Input.Keyboard.JustDown(this.keys.X)) {
      this.spawner.spawnMixedHorde(20);
    }

    // C: Spawn one of each
    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
      this.spawner.spawnOneOfEach();
    }

    // H: Spawn health at player position
    if (Phaser.Input.Keyboard.JustDown(this.keys.H)) {
      const player = this.gameScene.getPlayer();
      this.spawner.spawnItem('health', player.x, player.y);
    }

    // Q: Spawn ammo at player position (Q instead of A which is used for movement)
    if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) {
      const player = this.gameScene.getPlayer();
      this.spawner.spawnItem('ammo', player.x, player.y);
    }

    // P: Activate selected power-up directly
    if (Phaser.Input.Keyboard.JustDown(this.keys.P)) {
      this.spawner.activateSelectedPowerUp();
      console.log(`[Debug] Activated power-up: ${this.spawner.getSelectedPowerUpType()}`);
    }

    // O: Cycle through power-ups
    if (Phaser.Input.Keyboard.JustDown(this.keys.O)) {
      const newType = this.spawner.cyclePowerUp(1);
      console.log(`[Debug] Selected power-up: ${newType}`);
    }

    // L: Spawn power-up drop at player position
    if (Phaser.Input.Keyboard.JustDown(this.keys.L)) {
      this.spawner.spawnPowerUpDrop();
      console.log(`[Debug] Spawned power-up drop`);
    }

    // I: Add selected active item to inventory
    if (Phaser.Input.Keyboard.JustDown(this.keys.I)) {
      this.spawner.addSelectedActiveItemToInventory(1);
      console.log(`[Debug] Added active item to inventory: ${this.spawner.getSelectedActiveItemType()}`);
    }

    // U: Cycle through active items
    if (Phaser.Input.Keyboard.JustDown(this.keys.U)) {
      const newType = this.spawner.cycleActiveItem(1);
      console.log(`[Debug] Selected active item: ${newType}`);
    }

    // K: Spawn selected active item (debug, without using charges)
    if (Phaser.Input.Keyboard.JustDown(this.keys.K)) {
      this.spawner.spawnSelectedActiveItem();
      console.log(`[Debug] Spawned active item: ${this.spawner.getSelectedActiveItemType()}`);
    }

    // J: Use equipped active item (uses a charge from inventory)
    if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
      this.spawner.useEquippedActiveItem();
      console.log(`[Debug] Used equipped active item`);
    }

    // Y: Apply selected upgrade
    if (Phaser.Input.Keyboard.JustDown(this.keys.Y)) {
      const upgrade = this.spawner.getSelectedUpgrade();
      const applied = this.spawner.applySelectedUpgrade();
      console.log(`[Debug] Applied upgrade: ${upgrade.name} (${applied ? 'success' : 'failed'})`);
    }

    // T: Cycle through upgrades
    if (Phaser.Input.Keyboard.JustDown(this.keys.T)) {
      const newUpgrade = this.spawner.cycleUpgrade(1);
      console.log(`[Debug] Selected upgrade: ${newUpgrade.name} (${newUpgrade.rarity})`);
    }

    // G: Open upgrade selection scene
    if (Phaser.Input.Keyboard.JustDown(this.keys.G)) {
      this.spawner.openUpgradeScene();
      console.log(`[Debug] Opening upgrade selection scene`);
    }

    // Number keys 1-0: Select zombie type
    for (let i = 0; i < this.numberKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) {
        const type = ZOMBIE_TYPES[i];
        if (type) {
          this.spawner.setSelectedZombieType(type);
          this.callbacks.onZombieTypeSelected?.(type);
        }
        break;
      }
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
