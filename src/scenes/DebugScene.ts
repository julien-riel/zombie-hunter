import Phaser from 'phaser';
import { SCENE_KEYS } from '@config/constants';
import type { GameScene } from './GameScene';
import { DebugSpawner } from '@debug/DebugSpawner';
import { DebugControls } from '@debug/DebugControls';
import { DebugPanel } from '@debug/DebugPanel';
import { StatsPanel } from '@debug/StatsPanel';
import type { ZombieType, BossType } from '@/types/entities';
import type { DebugItemType } from '@debug/DebugSpawner';
import type { DropType } from '@items/drops';
import type { Door } from '@arena/Door';
import { BarricadeType, DoorTrapType } from '@arena/Door';
import { BALANCE } from '@config/balance';
import { SpecialEventType } from '@systems/events';

// Import des armes pour les donner au joueur
import { Pistol } from '@weapons/firearms/Pistol';
import { Shotgun } from '@weapons/firearms/Shotgun';
import { SMG } from '@weapons/firearms/SMG';
import { SniperRifle } from '@weapons/firearms/SniperRifle';
import { Revolver } from '@weapons/firearms/Revolver';
import { AssaultRifle } from '@weapons/firearms/AssaultRifle';
import { DoubleBarrel } from '@weapons/firearms/DoubleBarrel';
import { Flamethrower } from '@weapons/special/Flamethrower';
import { TeslaCannon } from '@weapons/special/TeslaCannon';
import { NailGun } from '@weapons/special/NailGun';
import { CompositeBow } from '@weapons/special/CompositeBow';
import { MicrowaveCannon } from '@weapons/special/MicrowaveCannon';
import { GrenadeLauncher } from '@weapons/explosive/GrenadeLauncher';
// Armes expérimentales (Phase 4)
import { FreezeRay } from '@weapons/experimental/FreezeRay';
import { GravityGun } from '@weapons/experimental/GravityGun';
import { BlackHoleGenerator } from '@weapons/experimental/BlackHoleGenerator';
import { LaserMinigun } from '@weapons/experimental/LaserMinigun';
import { ZombieConverter } from '@weapons/experimental/ZombieConverter';

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
  private statsPanel!: StatsPanel;

  private isVisible: boolean = false;
  private godMode: boolean = false;
  private spawnPaused: boolean = false;
  private collisionDebugEnabled: boolean = false;
  private gameWasPausedBeforePanel: boolean = false;
  private spawnPointPlacementMode: boolean = false;
  private gameSpeed: number = 1;
  private gamePaused: boolean = false;

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
      onDropSpawn: (type, x, y) => this.onDropSpawn(type, x, y),
      onKillAll: () => this.killAllZombies(),
      onNextWave: () => this.skipToNextWave(),
      onHealFull: () => this.healPlayerFull(),
      onToggleGodMode: () => this.toggleGodMode(),
      onTogglePause: () => this.toggleSpawnPause(),
      // Door callbacks
      getDoors: () => this.getDoors(),
      onDoorBarricade: (door, type) => this.onDoorBarricade(door, type),
      onDoorTrap: (door, type) => this.onDoorTrap(door, type),
      onDoorDestroy: (door) => this.onDoorDestroy(door),
      onDoorDamageBarricade: (door, damage) => this.onDoorDamageBarricade(door, damage),
      getDropCount: () => this.gameScene.getDropSystem().getActiveDropCount(),
      // Boss callbacks (Phase 7.3)
      onBossSpawn: (type) => this.onBossSpawn(type),
      onBossKill: () => this.onBossKill(),
      onBossDamage: (amount) => this.onBossDamage(amount),
      getActiveBoss: () => this.getActiveBoss(),
      // Event callbacks (Phase 7.4)
      onEventTrigger: (type) => this.onEventTrigger(type),
      onEventStop: (type) => this.onEventStop(type),
      onEventStopAll: () => this.onEventStopAll(),
      getActiveEvents: () => this.getActiveEvents(),
      // Wave control callbacks
      onGoToWave: (wave) => this.goToWave(wave),
      getCurrentWave: () => this.gameScene.getWaveSystem().getCurrentWave(),
      // Spawn point placement
      onEnterSpawnPointPlacement: () => this.enterSpawnPointPlacementMode(),
      // Game speed control
      onSetGameSpeed: (speed) => this.setGameSpeed(speed),
      getGameSpeed: () => this.gameSpeed,
      // Reload all weapons
      onReloadWeapons: () => this.reloadAllWeapons(),
      // Inventory
      onUnlockAllWeapons: () => this.unlockAllWeapons(),
    });

    // Créer le panneau de stats (F4)
    this.statsPanel = new StatsPanel(this, () => ({
      ddaSystem: this.gameScene.getDDASystem(),
      threatSystem: this.gameScene.getWaveSystem().getThreatSystem(),
      waveSystem: this.gameScene.getWaveSystem(),
      telemetryManager: this.gameScene.getTelemetryManager(),
    }));

    // Créer les contrôles clavier (minimal - F1, F2, F3, F4, ESC)
    this.controls = new DebugControls(this, this.gameScene, this.spawner, {
      onTogglePanel: () => this.toggle(),
      onTogglePause: () => this.toggleGamePause(),
      onExitPlacementMode: () => this.panel.exitPlacementMode(),
      onToggleFlowFieldDebug: () => this.toggleFlowFieldDebug(),
      onToggleStatsPanel: () => this.toggleStatsPanel(),
    });

    // Masquer le panneau au départ
    this.panel.setVisible(false);

    // Écouter les événements de GameScene pour mettre à jour l'affichage
    this.setupEventListeners();

    // Log de démarrage
    console.log('[DebugScene] Initialized - F1: debug panel, F4: stats panel');
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

    // Mettre à jour le panneau de stats
    if (this.statsPanel.isVisible()) {
      this.statsPanel.update();
    }

    // Si god mode actif, maintenir la santé et les munitions
    if (this.godMode) {
      this.applyGodMode();
    }

    // Dessiner le flowfield debug (fonctionne même si le jeu est en pause)
    if (this.gameScene.showFlowFieldDebug) {
      this.gameScene.drawFlowFieldDebug();
    }
  }

  /**
   * Toggle la visibilité du panneau debug
   * Quand le panneau s'ouvre, le jeu est mis sur pause
   * Quand il se ferme, le jeu reprend (sauf si F2 pause est actif)
   */
  public toggle(): void {
    this.isVisible = !this.isVisible;
    this.panel.setVisible(this.isVisible);
    this.controls.setPlacementMode(this.isVisible);

    if (this.isVisible) {
      // Mémoriser si le jeu était déjà en pause (via F2 ou autre)
      this.gameWasPausedBeforePanel = this.gameScene.scene.isPaused();
      // Mettre le jeu sur pause
      if (!this.gameWasPausedBeforePanel) {
        this.gameScene.scene.pause();
      }
      console.log('[Debug] Panel opened - game paused');
    } else {
      // Reprendre le jeu seulement s'il n'était pas en pause avant ET si F2 pause n'est pas actif
      if (!this.gameWasPausedBeforePanel && !this.gamePaused) {
        this.gameScene.scene.resume();
      }
      console.log('[Debug] Panel closed - game resumed');
    }
  }

  /**
   * Active le mode de placement de spawn point
   * Cache le panneau mais garde le jeu en pause
   */
  public enterSpawnPointPlacementMode(): void {
    this.spawnPointPlacementMode = true;
    this.panel.setVisible(false);
    console.log('[Debug] Spawn point placement mode - click to place, ESC to cancel');
  }

  /**
   * Quitte le mode de placement de spawn point
   */
  public exitSpawnPointPlacementMode(): void {
    this.spawnPointPlacementMode = false;
    this.panel.setVisible(true);
    console.log('[Debug] Spawn point placement mode ended');
  }

  /**
   * Vérifie si le mode placement de spawn point est actif
   */
  public isSpawnPointPlacementModeActive(): boolean {
    return this.spawnPointPlacementMode;
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
   * Débloque toutes les armes dans l'inventaire
   */
  public unlockAllWeapons(): void {
    const inventoryManager = this.gameScene.getInventoryManager();
    inventoryManager.unlockAllWeapons();
    console.log(`[Debug] Unlocked all weapons in inventory (${inventoryManager.getUnlockedCount()} weapons)`);
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
   * Toggle la pause du jeu (F2)
   * Met le jeu entièrement en pause/reprend
   */
  public toggleGamePause(): void {
    this.gamePaused = !this.gamePaused;

    if (this.gamePaused) {
      this.gameScene.scene.pause();
      console.log('[Debug] Game PAUSED (F2)');
    } else {
      this.gameScene.scene.resume();
      console.log('[Debug] Game RESUMED (F2)');
    }
  }

  /**
   * Vérifie si le jeu est en pause
   */
  public isGamePaused(): boolean {
    return this.gamePaused;
  }

  /**
   * Toggle l'affichage de debug du flow field (F3)
   */
  public toggleFlowFieldDebug(): void {
    this.gameScene.toggleFlowFieldDebug();
    console.log(`[Debug] Flow field debug: ${this.gameScene.showFlowFieldDebug ? 'ON' : 'OFF'}`);
  }

  /**
   * Toggle le panneau de stats (F4)
   */
  public toggleStatsPanel(): void {
    this.statsPanel.toggle();
    console.log(`[Debug] Stats panel: ${this.statsPanel.isVisible() ? 'ON' : 'OFF'}`);
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
   * Aller directement à une vague spécifique
   */
  public goToWave(targetWave: number): void {
    const waveSystem = this.gameScene.getWaveSystem();
    const currentWave = waveSystem.getCurrentWave();

    if (targetWave < 1) {
      console.log('[Debug] Invalid wave number');
      return;
    }

    console.log(`[Debug] Going to wave ${targetWave} from wave ${currentWave}`);

    // Tuer tous les zombies
    this.spawner.killAllZombies();

    // Utiliser la méthode du WaveSystem pour aller à la vague
    waveSystem.setWave(targetWave);
  }

  /**
   * Définit la vitesse du jeu (time scale)
   */
  public setGameSpeed(speed: number): void {
    this.gameSpeed = Math.max(0.25, Math.min(4, speed));
    this.gameScene.time.timeScale = this.gameSpeed;
    this.gameScene.physics.world.timeScale = 1 / this.gameSpeed;
    console.log(`[Debug] Game speed set to ${this.gameSpeed}x`);
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
   * Débloque l'arme dans l'inventaire et l'équipe dans le slot distance actif du joueur
   */
  private onWeaponGive(weaponId: string): void {
    const player = this.gameScene.getPlayer();
    const inventoryManager = this.gameScene.getInventoryManager();

    // Mapping entre les IDs du debug panel et les IDs du WeaponRegistry
    const weaponIdMap: Record<string, string> = {
      sniper: 'sniperRifle',
      tesla: 'teslaCannon',
      bow: 'compositeBow',
      microwave: 'microwaveCannon',
      blackHole: 'blackHoleGenerator',
    };

    const registryWeaponId = weaponIdMap[weaponId] || weaponId;

    // Débloquer l'arme dans l'inventaire si pas déjà débloquée
    if (!inventoryManager.isUnlocked(registryWeaponId)) {
      inventoryManager.unlockWeapon(registryWeaponId);
      console.log(`[Debug] Unlocked ${registryWeaponId} in inventory`);
    }

    // Map des armes (toutes sont des armes à distance)
    const weaponMap: Record<string, () => void> = {
      // Armes de base
      pistol: () => player.equipRangedInSlot(new Pistol(this.gameScene, player)),
      shotgun: () => player.equipRangedInSlot(new Shotgun(this.gameScene, player)),
      smg: () => player.equipRangedInSlot(new SMG(this.gameScene, player)),
      sniper: () => player.equipRangedInSlot(new SniperRifle(this.gameScene, player)),
      // Armes Phase 3
      revolver: () => player.equipRangedInSlot(new Revolver(this.gameScene, player)),
      assaultRifle: () => player.equipRangedInSlot(new AssaultRifle(this.gameScene, player)),
      doubleBarrel: () => player.equipRangedInSlot(new DoubleBarrel(this.gameScene, player)),
      grenadeLauncher: () => player.equipRangedInSlot(new GrenadeLauncher(this.gameScene, player)),
      // Armes spéciales
      flamethrower: () => player.equipRangedInSlot(new Flamethrower(this.gameScene, player)),
      tesla: () => player.equipRangedInSlot(new TeslaCannon(this.gameScene, player)),
      nailgun: () => player.equipRangedInSlot(new NailGun(this.gameScene, player)),
      bow: () => player.equipRangedInSlot(new CompositeBow(this.gameScene, player)),
      microwave: () => player.equipRangedInSlot(new MicrowaveCannon(this.gameScene, player)),
      // Armes expérimentales (Phase 4)
      freezeRay: () => player.equipRangedInSlot(new FreezeRay(this.gameScene, player)),
      gravityGun: () => player.equipRangedInSlot(new GravityGun(this.gameScene, player)),
      blackHole: () => player.equipRangedInSlot(new BlackHoleGenerator(this.gameScene, player)),
      laserMinigun: () => player.equipRangedInSlot(new LaserMinigun(this.gameScene, player)),
      zombieConverter: () => player.equipRangedInSlot(new ZombieConverter(this.gameScene, player)),
    };

    const createWeapon = weaponMap[weaponId];
    if (createWeapon) {
      createWeapon();
      console.log(`[Debug] Gave ${weaponId} to player (replaced slot ${player.getCurrentRangedIndex() + 3})`);
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
   * Handler pour spawn de drop (Phase 6.2)
   */
  private onDropSpawn(type: DropType, x: number, y: number): void {
    this.spawner.spawnDrop(type, x, y);
    console.log(`[Debug] Spawned drop ${type} at (${Math.round(x)}, ${Math.round(y)})`);
  }

  // =========================================================================
  // DOOR HANDLERS
  // =========================================================================

  /**
   * Récupère toutes les portes de l'arène
   */
  private getDoors(): Door[] {
    return this.gameScene.arena?.getDoors() || [];
  }

  /**
   * Handler pour barricader une porte
   */
  private onDoorBarricade(door: Door, type: BarricadeType): void {
    if (door.barricade(type)) {
      console.log(`[Debug] Barricaded door ${door.id} with ${type}`);
    } else {
      console.log(`[Debug] Cannot barricade door ${door.id} (already barricaded or destroyed)`);
    }
  }

  /**
   * Handler pour piéger une porte
   */
  private onDoorTrap(door: Door, type: DoorTrapType): void {
    const trapConfigs = {
      [DoorTrapType.SPIKE]: {
        type: DoorTrapType.SPIKE,
        damage: BALANCE.doors.traps.spike.damage,
        charges: BALANCE.doors.traps.spike.charges,
      },
      [DoorTrapType.SLOW]: {
        type: DoorTrapType.SLOW,
        slowFactor: BALANCE.doors.traps.slow.slowFactor,
        charges: BALANCE.doors.traps.slow.charges,
      },
      [DoorTrapType.FIRE]: {
        type: DoorTrapType.FIRE,
        fireDuration: BALANCE.doors.traps.fire.fireDuration,
        charges: BALANCE.doors.traps.fire.charges,
      },
    };

    if (door.setTrap(trapConfigs[type])) {
      console.log(`[Debug] Set ${type} trap on door ${door.id}`);
    } else {
      console.log(`[Debug] Cannot trap door ${door.id} (already trapped or destroyed)`);
    }
  }

  /**
   * Handler pour détruire une porte (simulation boss)
   */
  private onDoorDestroy(door: Door): void {
    door.destroyDoor('debug_boss');
    console.log(`[Debug] Destroyed door ${door.id}`);
  }

  /**
   * Handler pour infliger des dégâts à la barricade
   */
  private onDoorDamageBarricade(door: Door, damage: number): void {
    if (door.hasBarricade()) {
      const destroyed = door.damageBarricade(damage, 'debug');
      const info = door.getBarricadeInfo();
      console.log(`[Debug] Damaged barricade on door ${door.id}: ${info.health}/${info.maxHealth} HP${destroyed ? ' (DESTROYED)' : ''}`);
    } else {
      console.log(`[Debug] Door ${door.id} has no barricade`);
    }
  }

  // =========================================================================
  // BOSS HANDLERS (Phase 7.3)
  // =========================================================================

  /**
   * Spawn un boss
   */
  private onBossSpawn(type: BossType): void {
    const bossFactory = this.gameScene.getBossFactory();

    // Si un boss est déjà actif, on ne peut pas en spawner un autre
    if (bossFactory.hasBoss()) {
      console.log('[Debug] A boss is already active');
      return;
    }

    // Position au centre de l'arène
    const centerX = this.gameScene.cameras.main.centerX;
    const centerY = this.gameScene.cameras.main.centerY;

    const boss = bossFactory.create(type, centerX, centerY);
    if (boss) {
      console.log(`[Debug] Spawned boss: ${type}`);
      // Démarrer l'animation d'entrée
      bossFactory.startBossEntrance();
    }
  }

  /**
   * Tue le boss actif
   */
  private onBossKill(): void {
    const bossFactory = this.gameScene.getBossFactory();
    if (bossFactory.hasBoss()) {
      bossFactory.killActiveBoss();
      console.log('[Debug] Killed active boss');
    } else {
      console.log('[Debug] No active boss');
    }
  }

  /**
   * Inflige des dégâts au boss actif
   */
  private onBossDamage(amount: number): void {
    const bossFactory = this.gameScene.getBossFactory();
    if (bossFactory.hasBoss()) {
      bossFactory.damageActiveBoss(amount);
      console.log(`[Debug] Damaged boss for ${amount} HP`);
    } else {
      console.log('[Debug] No active boss');
    }
  }

  /**
   * Récupère les infos du boss actif
   */
  private getActiveBoss(): { type: BossType; healthPercent: number } | null {
    const bossFactory = this.gameScene.getBossFactory();
    const boss = bossFactory.getActiveBoss();
    if (!boss) return null;

    return {
      type: boss.bossType,
      healthPercent: boss.getHealthPercent(),
    };
  }

  // =========================================================================
  // EVENT HANDLERS (Phase 7.4)
  // =========================================================================

  /**
   * Déclenche un événement spécial
   */
  private onEventTrigger(type: SpecialEventType): void {
    const eventSystem = this.gameScene.getEventSystem();
    eventSystem.triggerEvent(type);
    console.log(`[Debug] Triggered event: ${type}`);
  }

  /**
   * Arrête un événement spécial
   */
  private onEventStop(type: SpecialEventType): void {
    const eventSystem = this.gameScene.getEventSystem();
    eventSystem.stopEvent(type);
    console.log(`[Debug] Stopped event: ${type}`);
  }

  /**
   * Arrête tous les événements actifs
   */
  private onEventStopAll(): void {
    const eventSystem = this.gameScene.getEventSystem();
    eventSystem.stopAllEvents();
    console.log('[Debug] Stopped all events');
  }

  /**
   * Récupère les événements actifs
   */
  private getActiveEvents(): SpecialEventType[] {
    const eventSystem = this.gameScene.getEventSystem();
    return eventSystem.getActiveEvents().map((e) => e.type);
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
    this.statsPanel?.destroy();
  }
}
