import Phaser from 'phaser';
import { SCENE_KEYS } from '@config/constants';
import type { GameScene } from './GameScene';
import { DebugSpawner } from '@debug/DebugSpawner';
import { DebugControls } from '@debug/DebugControls';
import { DebugPanel } from '@debug/DebugPanel';
import type { ZombieType } from '@/types/entities';
import type { DebugItemType } from '@debug/DebugSpawner';

// Import des armes pour les donner au joueur
import { Pistol } from '@weapons/firearms/Pistol';
import { Shotgun } from '@weapons/firearms/Shotgun';
import { SMG } from '@weapons/firearms/SMG';
import { SniperRifle } from '@weapons/firearms/SniperRifle';
import { Flamethrower } from '@weapons/special/Flamethrower';
import { TeslaCannon } from '@weapons/special/TeslaCannon';
import { NailGun } from '@weapons/special/NailGun';
import { CompositeBow } from '@weapons/special/CompositeBow';

/**
 * Scène de debug overlay
 * Fournit des outils pour tester le jeu sans jouer la partie complète
 *
 * Fonctionnalités:
 * - Mode God (invincibilité + ammo infini)
 * - Spawn de zombies par type
 * - Attribution d'armes
 * - Contrôle des vagues
 * - Spawn d'items
 */
export class DebugScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private spawner!: DebugSpawner;
  private controls!: DebugControls;
  private panel!: DebugPanel;

  private isVisible: boolean = false;
  private godMode: boolean = false;
  private spawnPaused: boolean = false;
  private collisionDebugEnabled: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.DEBUG });
  }

  /**
   * Initialise la scène avec la référence à GameScene
   */
  init(data: { gameScene: GameScene }): void {
    this.gameScene = data.gameScene;
  }

  /**
   * Crée les composants de debug
   */
  create(): void {
    // Créer le spawner
    this.spawner = new DebugSpawner(this.gameScene);

    // Créer le panneau
    this.panel = new DebugPanel(this, this.spawner, {
      onZombieSpawn: (type, x, y) => this.onZombieSpawn(type, x, y),
      onWeaponGive: (weaponId) => this.onWeaponGive(weaponId),
      onItemSpawn: (type, x, y) => this.onItemSpawn(type, x, y),
      onKillAll: () => this.killAllZombies(),
      onNextWave: () => this.skipToNextWave(),
      onHealFull: () => this.healPlayerFull(),
      onToggleGodMode: () => this.toggleGodMode(),
      onTogglePause: () => this.toggleSpawnPause(),
    });

    // Créer les contrôles clavier
    this.controls = new DebugControls(this, this.gameScene, this.spawner, {
      onTogglePanel: () => this.toggle(),
      onToggleGodMode: () => this.toggleGodMode(),
      onToggleCollisionDebug: () => this.toggleCollisionDebug(),
      onKillAllZombies: () => this.killAllZombies(),
      onReloadAllWeapons: () => this.reloadAllWeapons(),
      onHealPlayer: () => this.healPlayerFull(),
      onToggleSpawnPause: () => this.toggleSpawnPause(),
      onNextWave: () => this.skipToNextWave(),
      onSpawnRandomItem: () => this.spawnRandomItemAtPlayer(),
      onAdjustWave: (delta) => this.adjustWave(delta),
      onZombieTypeSelected: (type) => this.onZombieTypeSelected(type),
    });

    // Masquer le panneau au départ
    this.panel.setVisible(false);

    // Écouter les événements de GameScene pour mettre à jour l'affichage
    this.setupEventListeners();

    // Log de démarrage
    console.log('[DebugScene] Initialized - Press F1 to toggle debug panel');
  }

  /**
   * Configure les listeners d'événements
   */
  private setupEventListeners(): void {
    // Événements de vagues
    this.gameScene.events.on('waveStart', this.onWaveStart, this);
    this.gameScene.events.on('waveComplete', this.onWaveComplete, this);
    this.gameScene.events.on('waveProgress', this.onWaveProgress, this);
  }

  /**
   * Handler pour le début de vague
   */
  private onWaveStart(wave: number): void {
    this.panel.updateState({ currentWave: wave });
  }

  /**
   * Handler pour la fin de vague
   */
  private onWaveComplete(wave: number): void {
    this.panel.updateState({ currentWave: wave + 1 });
  }

  /**
   * Handler pour la progression de vague
   */
  private onWaveProgress(data: { remaining: number }): void {
    this.panel.updateState({ zombieCount: data.remaining });
  }

  /**
   * Met à jour la scène
   */
  update(): void {
    // Mettre à jour les contrôles
    this.controls.update();

    // Mettre à jour l'affichage du panneau
    if (this.panel.isVisible()) {
      const waveSystem = this.gameScene.getWaveSystem();
      this.panel.updateState({
        currentWave: waveSystem.getCurrentWave(),
        zombieCount: this.spawner.getActiveZombieCount(),
        godMode: this.godMode,
        spawnPaused: this.spawnPaused,
      });
    }

    // Si god mode actif, maintenir la santé et les munitions
    if (this.godMode) {
      this.applyGodMode();
    }
  }

  /**
   * Toggle la visibilité du panneau debug
   */
  public toggle(): void {
    this.isVisible = !this.isVisible;
    this.panel.setVisible(this.isVisible);
    this.controls.setPlacementMode(this.isVisible);
  }

  /**
   * Toggle le mode God
   */
  public toggleGodMode(): void {
    this.godMode = !this.godMode;
    const player = this.gameScene.getPlayer();

    if (this.godMode) {
      // Soigner complètement
      player.heal(player.getMaxHealth());
      console.log('[Debug] God mode ENABLED');
    } else {
      console.log('[Debug] God mode DISABLED');
    }

    this.panel.updateState({ godMode: this.godMode });
  }

  /**
   * Applique les effets du mode God
   */
  private applyGodMode(): void {
    const player = this.gameScene.getPlayer();

    // Maintenir la santé au maximum
    if (player.getHealth() < player.getMaxHealth()) {
      player.heal(player.getMaxHealth() - player.getHealth());
    }

    // Maintenir les munitions (via les armes)
    const weapons = player.getWeapons();
    for (const weapon of weapons) {
      if (weapon.currentAmmo < weapon.maxAmmo) {
        weapon.currentAmmo = weapon.maxAmmo;
      }
    }
  }

  /**
   * Toggle le debug de collision (Phaser arcade physics debug)
   */
  public toggleCollisionDebug(): void {
    this.collisionDebugEnabled = !this.collisionDebugEnabled;
    // Note: Le debug de collision est configuré au démarrage du jeu
    // On ne peut pas le toggle dynamiquement facilement
    console.log(`[Debug] Collision debug: ${this.collisionDebugEnabled ? 'ON' : 'OFF'} (requires restart)`);
  }

  /**
   * Tue tous les zombies
   */
  public killAllZombies(): void {
    const killed = this.spawner.killAllZombies();
    console.log(`[Debug] Killed ${killed} zombies`);
  }

  /**
   * Recharge toutes les armes du joueur
   */
  public reloadAllWeapons(): void {
    const player = this.gameScene.getPlayer();
    const weapons = player.getWeapons();

    for (const weapon of weapons) {
      weapon.currentAmmo = weapon.maxAmmo;
    }

    console.log(`[Debug] Reloaded ${weapons.length} weapons`);
  }

  /**
   * Soigne le joueur à 100%
   */
  public healPlayerFull(): void {
    const player = this.gameScene.getPlayer();
    const healed = player.getMaxHealth() - player.getHealth();
    player.heal(healed);
    console.log(`[Debug] Healed player for ${healed} HP`);
  }

  /**
   * Toggle la pause des spawns
   */
  public toggleSpawnPause(): void {
    this.spawnPaused = !this.spawnPaused;
    const waveSystem = this.gameScene.getWaveSystem();

    if (this.spawnPaused) {
      waveSystem.pause();
      this.gameScene.getSpawnSystem().stopSpawning();
      console.log('[Debug] Spawn PAUSED');
    } else {
      waveSystem.resume();
      console.log('[Debug] Spawn RESUMED');
    }

    this.panel.updateState({ spawnPaused: this.spawnPaused });
  }

  /**
   * Passe à la vague suivante
   */
  public skipToNextWave(): void {
    // D'abord tuer tous les zombies
    this.spawner.killAllZombies();

    // Puis forcer la vague suivante
    const waveSystem = this.gameScene.getWaveSystem();
    const currentWave = waveSystem.getCurrentWave();
    console.log(`[Debug] Skipping from wave ${currentWave} to ${currentWave + 1}`);

    // Émettre l'événement de fin de vague pour déclencher la suivante
    this.gameScene.events.emit('waveComplete', currentWave);
  }

  /**
   * Ajuste le numéro de vague (+/-)
   */
  public adjustWave(delta: number): void {
    const waveSystem = this.gameScene.getWaveSystem();
    const currentWave = waveSystem.getCurrentWave();
    const newWave = Math.max(1, currentWave + delta);

    console.log(`[Debug] Wave adjustment: ${currentWave} -> ${newWave}`);

    // Pour l'instant, on ne peut qu'avancer (skip)
    if (delta > 0) {
      this.skipToNextWave();
    }
  }

  /**
   * Spawn un item aléatoire à la position du joueur
   */
  public spawnRandomItemAtPlayer(): void {
    const player = this.gameScene.getPlayer();
    const items: DebugItemType[] = ['health', 'ammo', 'speedBoost', 'damageBoost'];
    const randomItem = items[Math.floor(Math.random() * items.length)];
    this.spawner.spawnItem(randomItem, player.x, player.y);
  }

  /**
   * Handler pour spawn de zombie depuis le panneau
   */
  private onZombieSpawn(type: ZombieType, x: number, y: number): void {
    this.spawner.spawnZombie(type, x, y);
    console.log(`[Debug] Spawned ${type} at (${Math.round(x)}, ${Math.round(y)})`);
  }

  /**
   * Handler pour attribution d'arme
   */
  private onWeaponGive(weaponId: string): void {
    const player = this.gameScene.getPlayer();

    // Map des armes
    const weaponMap: Record<string, () => void> = {
      pistol: () => player.addWeapon(new Pistol(this.gameScene, player)),
      shotgun: () => player.addWeapon(new Shotgun(this.gameScene, player)),
      smg: () => player.addWeapon(new SMG(this.gameScene, player)),
      sniper: () => player.addWeapon(new SniperRifle(this.gameScene, player)),
      flamethrower: () => player.addWeapon(new Flamethrower(this.gameScene, player)),
      tesla: () => player.addWeapon(new TeslaCannon(this.gameScene, player)),
      nailgun: () => player.addWeapon(new NailGun(this.gameScene, player)),
      bow: () => player.addWeapon(new CompositeBow(this.gameScene, player)),
      // Note: Chainsaw n'étend pas Weapon, donc non compatible avec l'inventaire standard
    };

    const createWeapon = weaponMap[weaponId];
    if (createWeapon) {
      createWeapon();
      console.log(`[Debug] Gave ${weaponId} to player`);
    } else {
      console.warn(`[Debug] Unknown weapon: ${weaponId}`);
    }
  }

  /**
   * Handler pour spawn d'item
   */
  private onItemSpawn(type: DebugItemType, x: number, y: number): void {
    this.spawner.spawnItem(type, x, y);
    console.log(`[Debug] Spawned ${type} at (${Math.round(x)}, ${Math.round(y)})`);
  }

  /**
   * Handler pour sélection de type de zombie
   */
  private onZombieTypeSelected(type: ZombieType): void {
    this.panel.updateState({ selectedZombieType: type });
    console.log(`[Debug] Selected zombie type: ${type}`);
  }

  /**
   * Nettoie la scène
   */
  shutdown(): void {
    // Nettoyer les listeners
    this.gameScene.events.off('waveStart', this.onWaveStart, this);
    this.gameScene.events.off('waveComplete', this.onWaveComplete, this);
    this.gameScene.events.off('waveProgress', this.onWaveProgress, this);

    // Nettoyer les composants
    this.controls?.destroy();
    this.panel?.destroy();
  }
}
