import Phaser from 'phaser';
import { SCENE_KEYS, TILEMAP_KEYS } from '@config/constants';
import { Player } from '@entities/Player';
import { TiledArena } from '@arena/TiledArena';
import { Cover } from '@arena/Cover';
import type { TerrainZone } from '@arena/TerrainZone';
import { Interactive } from '@arena/Interactive';
import { BladeTrap } from '@arena/BladeTrap';
import type { Entity } from '@entities/Entity';
import { BulletPool } from '@entities/projectiles/BulletPool';
import { AcidSpitPool } from '@entities/projectiles/AcidSpitPool';
import { FlamePool } from '@entities/projectiles/FlamePool';
import { PoolManager } from '@managers/PoolManager';
import { TelemetryManager } from '@managers/TelemetryManager';
import { CorpseManager } from '@managers/CorpseManager';
import { SaveManager } from '@managers/SaveManager';
import { InputManager } from '@managers/InputManager';
import { InventoryManager } from '@managers/InventoryManager';
import { ZombieFactory } from '@entities/zombies/ZombieFactory';
import { CombatSystem } from '@systems/CombatSystem';
import { ComboSystem } from '@systems/ComboSystem';
import { DropSystem } from '@systems/DropSystem';
import { PowerUpSystem } from '@systems/PowerUpSystem';
import { ActiveItemSystem } from '@systems/ActiveItemSystem';
import { UpgradeSystem } from '@systems/UpgradeSystem';
import { EconomySystem } from '@systems/EconomySystem';
import { ProgressionSystem } from '@systems/ProgressionSystem';
import { SpawnSystem } from '@systems/SpawnSystem';
import { WaveSystem } from '@systems/WaveSystem';
import { DDASystem } from '@systems/DDASystem';
import { Pathfinder } from '@utils/pathfinding';
import { HordeManager } from '@ai/HordeManager';
import { TacticalBehaviors } from '@ai/TacticalBehaviors';
import { FlowFieldManager } from '@ai/FlowFieldManager';
import type { Zombie } from '@entities/zombies/Zombie';
import type { MiniZombie } from '@entities/zombies/MiniZombie';
import { BossFactory } from '@entities/bosses/BossFactory';
import { EventSystem } from '@systems/events/EventSystem';
import { CampaignManager } from '@modes/CampaignManager';
import { DailyChallengeManager } from '@modes/DailyChallengeManager';
import { MobileControls } from '@ui/MobileControls';
import { OrientationOverlay } from '@ui/OrientationOverlay';
import { DeviceDetector } from '@utils/DeviceDetector';
import type {
  ModeConfig,
  CampaignModeConfig,
  DailyChallengeConfig,
  GameSceneData,
  GameModeType,
} from '@/types/modes';

/**
 * Scène principale du jeu
 * Gère le gameplay, les entités et les systèmes
 */
export class GameScene extends Phaser.Scene {
  public player!: Player;
  public arena!: TiledArena;
  public bulletPool!: BulletPool;
  public acidSpitPool!: AcidSpitPool;
  public flamePool!: FlamePool;
  public walls!: Phaser.Physics.Arcade.StaticGroup;
  public corpseManager!: CorpseManager;

  private poolManager!: PoolManager;
  private zombieFactory!: ZombieFactory;
  private combatSystem!: CombatSystem;
  private comboSystem!: ComboSystem;
  private dropSystem!: DropSystem;
  private powerUpSystem!: PowerUpSystem;
  private activeItemSystem!: ActiveItemSystem;
  private upgradeSystem!: UpgradeSystem;
  private economySystem!: EconomySystem;
  private progressionSystem!: ProgressionSystem;
  private spawnSystem!: SpawnSystem;
  private waveSystem!: WaveSystem;
  private pathfinder!: Pathfinder;
  private telemetryManager!: TelemetryManager;
  private ddaSystem!: DDASystem;
  private hordeManager!: HordeManager;
  private tacticalBehaviors!: TacticalBehaviors;
  private flowFieldManager!: FlowFieldManager;
  private bossFactory!: BossFactory;
  private eventSystem!: EventSystem;
  private inventoryManager!: InventoryManager;

  // Mode de jeu (Phase 8.2)
  private modeConfig: ModeConfig | null = null;
  private gameMode: GameModeType = 'survival';
  private campaignManager: CampaignManager | null = null;
  private dailyChallengeManager: DailyChallengeManager | null = null;

  // Gestionnaire d'entrées et contrôles mobiles (Phase 3 Mobile)
  private inputManager!: InputManager;
  private mobileControls: MobileControls | null = null;
  private orientationOverlay: OrientationOverlay | null = null;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  /**
   * Initialise la scène avec les données du mode de jeu
   */
  init(data?: GameSceneData): void {
    // Configuration par défaut (mode survie)
    this.modeConfig = data?.mode || {
      type: 'survival',
      infiniteWaves: true,
      trackHighScore: true,
    };

    this.gameMode = this.modeConfig.type;

    console.log(`[GameScene] Initialized with mode: ${this.gameMode}`, this.modeConfig);
  }

  /**
   * Détermine la clé de la map Tiled à charger selon le mode de jeu
   */
  private getMapKeyForMode(): string {
    if (this.gameMode === 'campaign' && this.modeConfig) {
      const config = this.modeConfig as CampaignModeConfig;
      // Mapper le levelId vers la clé de map Tiled
      switch (config.levelId) {
        case 'hospital':
          return TILEMAP_KEYS.HOSPITAL;
        case 'hall':
          return TILEMAP_KEYS.HALL;
        case 'warehouse':
          return TILEMAP_KEYS.WAREHOUSE;
        case 'subway':
          return TILEMAP_KEYS.SUBWAY;
        case 'laboratory':
          return TILEMAP_KEYS.LABORATORY;
        default:
          console.warn(`Unknown campaign level: ${config.levelId}, using default arena`);
          return TILEMAP_KEYS.DEFAULT_ARENA;
      }
    }
    // Mode survival ou daily: utiliser l'arène par défaut
    return TILEMAP_KEYS.DEFAULT_ARENA;
  }

  /**
   * Initialise la scène de jeu
   */
  create(): void {
    // Déterminer quelle map charger selon le mode de jeu
    const mapKey = this.getMapKeyForMode();

    // Créer l'arène depuis Tiled
    this.arena = new TiledArena(this, mapKey, TILEMAP_KEYS.TILESET);
    this.walls = this.arena.getWalls();

    // Initialiser le pathfinder avec les obstacles de l'arène
    this.pathfinder = new Pathfinder();
    this.pathfinder.buildGrid(this.arena.getObstacles());

    // Initialiser le flow field manager pour le pathfinding de masse
    this.flowFieldManager = new FlowFieldManager({
      targetMoveThreshold: 32,
      minUpdateInterval: 200,
      maxIterationsPerFrame: 150,
      minZombiesForFlowField: 5, // Seuil bas pour activer le flow field rapidement
    });
    this.flowFieldManager.initialize(this.pathfinder.getGrid());

    // Écouter les changements d'obstacles pour mettre à jour le pathfinder
    this.events.on('arena:obstacleRemoved', this.onObstacleRemoved, this);

    // Créer le pool de projectiles
    this.bulletPool = new BulletPool(this);

    // Créer le gestionnaire d'entrées (Phase 3 Mobile)
    this.inputManager = new InputManager(this);

    // Créer le joueur au point de spawn défini dans Tiled
    const spawn = this.arena.getPlayerSpawn();
    this.player = new Player(this, spawn.x, spawn.y, undefined, this.inputManager);

    // Créer le pool de projectiles acides (pour les Spitters)
    this.acidSpitPool = new AcidSpitPool(this);

    // Créer le pool de flammes (pour le Flamethrower)
    this.flamePool = new FlamePool(this);

    // Créer le gestionnaire de cadavres (pour les Necromancers)
    this.corpseManager = new CorpseManager(this);

    // Initialiser les systèmes
    this.initializeSystems();

    // Configurer les collisions
    this.setupCollisions();

    // Lancer la scène HUD en parallèle
    this.scene.launch(SCENE_KEYS.HUD, { gameScene: this });

    // Lancer la scène Debug en mode développement
    if (import.meta.env.DEV) {
      this.scene.launch(SCENE_KEYS.DEBUG, { gameScene: this });
    }

    // Configuration de la caméra
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Initialiser les managers de mode (Phase 8.2)
    this.setupModeManagers();

    // Démarrer le système de vagues après un court délai
    this.time.delayedCall(1000, () => {
      this.waveSystem.start();
    });

    // Configurer les contrôles de pause
    this.setupPauseControls();

    // Créer les contrôles mobiles si nécessaire (Phase 3 Mobile)
    this.setupMobileControls();

    // Écouter l'événement de mort du joueur
    this.events.on('playerDeath', this.onPlayerDeath, this);

    // Réinitialiser le flag de game over
    this.isGameOver = false;

    // Debug: créer les graphics et texte pour le flow field (F3 géré par DebugScene)
    this.debugFlowFieldGraphics = this.add.graphics();
    this.debugFlowFieldGraphics.setDepth(1000);
    this.debugFlowFieldText = this.add.text(15, 55, '', {
      fontSize: '14px',
      color: '#ffffff',
    });
    this.debugFlowFieldText.setDepth(1001);
    this.debugFlowFieldText.setVisible(false);
  }

  /**
   * Initialise les systèmes de jeu
   */
  private initializeSystems(): void {
    // Pool Manager pour les zombies
    this.poolManager = new PoolManager(this);

    // Factory pour créer les zombies
    this.zombieFactory = new ZombieFactory(this, this.poolManager);

    // Système de combat
    this.combatSystem = new CombatSystem(this, this.player, this.bulletPool);

    // Système de combo (Phase 6.1)
    this.comboSystem = new ComboSystem(this);

    // Système de drops (Phase 6.2)
    this.dropSystem = new DropSystem(this, this.player, this.comboSystem);

    // Système de power-ups (Phase 6.3)
    this.powerUpSystem = new PowerUpSystem(this, this.player);

    // Système d'objets actifs (Phase 6.4)
    this.activeItemSystem = new ActiveItemSystem(this, this.player);

    // Système d'upgrades roguelite (Phase 6.5)
    this.upgradeSystem = new UpgradeSystem(this, this.player);

    // Système économique (Phase 6.6)
    this.economySystem = new EconomySystem(this);
    this.economySystem.setComboSystem(this.comboSystem);

    // Système de progression permanente (Phase 6.7)
    this.progressionSystem = new ProgressionSystem(this, this.player);

    // Enregistrer les groupes de zombies dans le système de combat
    for (const group of this.poolManager.getAllZombieGroups()) {
      this.combatSystem.registerZombieGroup(group);
    }

    // Système de spawn
    this.spawnSystem = new SpawnSystem(this, this.zombieFactory);

    // Gestionnaire de télémétrie (Phase 3.6)
    this.telemetryManager = new TelemetryManager();
    this.telemetryManager.start();

    // Système de difficulté adaptative (Phase 3.6)
    this.ddaSystem = new DDASystem();
    this.ddaSystem.setTelemetryManager(this.telemetryManager);

    // Factory pour créer les boss (Phase 7.3)
    this.bossFactory = new BossFactory(this);

    // Système d'événements spéciaux (Phase 7.4)
    this.eventSystem = new EventSystem(this);

    // Gestionnaire d'inventaire (Phase 5)
    this.inventoryManager = new InventoryManager();
    this.inventoryManager.load();

    // Système de vagues (avec intégration ThreatSystem, DDA, et EventSystem)
    this.waveSystem = new WaveSystem(this);
    this.waveSystem.setDDASystem(this.ddaSystem);
    this.waveSystem.setBossFactory(this.bossFactory);
    this.waveSystem.setEventSystem(this.eventSystem);

    // Gestionnaire de horde pour les comportements de groupe (Phase 4.4)
    this.hordeManager = new HordeManager(this, {
      cellSize: 64,
      neighborRadius: 120,
      spatialUpdateInterval: 100,
      maxUpdatesPerFrame: 25,
    });

    // Comportements tactiques pour l'encerclement et le flanking
    this.tacticalBehaviors = new TacticalBehaviors({
      encircleRadius: 100,
      encircleSpacing: 45,
      flankingOffset: 150,
      flankingRatio: 0.3,
    });
    this.tacticalBehaviors.setHordeManager(this.hordeManager);

    // Connecter les événements de télémétrie
    this.setupTelemetryEvents();

    // Gérer les mini-zombies spawnés par les Splitters
    this.events.on('miniZombieSpawned', this.onMiniZombieSpawned, this);
  }

  /**
   * Gère un mini-zombie spawné par un Splitter
   */
  private onMiniZombieSpawned(miniZombie: MiniZombie): void {
    // Enregistrer les collisions pour le mini-zombie
    this.combatSystem.registerZombieGroup(
      this.add.group([miniZombie])
    );

    // Collision avec les murs et covers
    this.physics.add.collider(miniZombie, this.walls);
    this.physics.add.collider(miniZombie, this.arena.getCoverGroup());
  }

  /**
   * Configure les événements de télémétrie
   */
  private setupTelemetryEvents(): void {
    // Événements de combat
    this.events.on('zombieDeath', (zombie: Zombie) => {
      this.telemetryManager.log('zombie:killed', {
        type: zombie.zombieType,
        zombieId: zombie.name || `zombie_${Date.now()}`,
        damage: zombie.getScoreValue(),
      });
    });

    this.events.on('playerHit', (data: { damage: number; source: string; distance: number }) => {
      this.telemetryManager.log('player:hit', data);
    });

    this.events.on('playerHeal', (data: { amount: number }) => {
      this.telemetryManager.log('player:heal', data);
    });

    this.events.on('playerDash', () => {
      this.telemetryManager.log('player:dash', {});
    });

    // Événements d'armes
    this.events.on('weaponFired', (data: { weapon: string }) => {
      this.telemetryManager.log('weapon:fired', data);
    });

    this.events.on('weaponHit', (data: { weapon: string; damage: number }) => {
      this.telemetryManager.log('weapon:hit', data);
    });

    // Événements de vagues
    this.events.on('waveStart', (wave: number) => {
      this.telemetryManager.log('wave:start', { wave });
    });

    this.events.on('waveComplete', (wave: number) => {
      this.telemetryManager.log('wave:clear', { wave });
    });

    // Événements de combo/score
    this.events.on('scoreUpdate', (score: number, _kills: number) => {
      this.telemetryManager.updateScore(score);
      this.telemetryManager.log('combo:updated', { combo: 0, score });
    });
  }

  /**
   * Initialise les managers de mode de jeu (Phase 8.2)
   */
  private setupModeManagers(): void {
    switch (this.gameMode) {
      case 'campaign': {
        const config = this.modeConfig as CampaignModeConfig;
        this.campaignManager = new CampaignManager(this);
        this.campaignManager.initialize({ levelId: config.levelId });

        // Configurer le WaveSystem pour le mode campagne (nombre limité de vagues)
        this.waveSystem.setMaxWaves(config.level.waves);

        // Écouter les événements de campagne
        this.events.on('campaignVictory', this.onCampaignVictory, this);
        this.events.on('campaignDefeat', this.onCampaignDefeat, this);

        console.log(`[GameScene] Campaign mode initialized: ${config.level.name}`);
        break;
      }

      case 'daily': {
        const config = this.modeConfig as DailyChallengeConfig;
        this.dailyChallengeManager = new DailyChallengeManager(this);
        this.dailyChallengeManager.initialize();

        // Appliquer les modificateurs du challenge quotidien
        // Le WaveSystem utilisera les multiplicateurs via getDailyModifiers()

        console.log(`[GameScene] Daily challenge initialized:`, {
          date: config.date,
          modifiers: config.modifiers.map((m) => m.name),
        });
        break;
      }

      case 'survival':
      default:
        // Mode survie par défaut - vagues infinies
        console.log('[GameScene] Survival mode initialized');
        break;
    }
  }

  /**
   * Obtient le mode de jeu actuel
   */
  public getGameMode(): GameModeType {
    return this.gameMode;
  }

  /**
   * Obtient la configuration du mode
   */
  public getModeConfig(): ModeConfig | null {
    return this.modeConfig;
  }

  /**
   * Obtient le manager de campagne (si en mode campagne)
   */
  public getCampaignManager(): CampaignManager | null {
    return this.campaignManager;
  }

  /**
   * Obtient le manager de challenge quotidien (si en mode daily)
   */
  public getDailyChallengeManager(): DailyChallengeManager | null {
    return this.dailyChallengeManager;
  }

  /**
   * Obtient les modificateurs du challenge quotidien (pour le WaveSystem)
   */
  public getDailyModifiers(): {
    damageMultiplier: number;
    healthMultiplier: number;
    speedMultiplier: number;
    spawnRateMultiplier: number;
  } | null {
    if (this.gameMode !== 'daily' || !this.dailyChallengeManager) {
      return null;
    }

    return {
      damageMultiplier: this.dailyChallengeManager.getDamageMultiplier(),
      healthMultiplier: this.dailyChallengeManager.getHealthMultiplier(),
      speedMultiplier: this.dailyChallengeManager.getSpeedMultiplier(),
      spawnRateMultiplier: this.dailyChallengeManager.getSpawnRateMultiplier(),
    };
  }

  /**
   * Gestion de la victoire en mode campagne
   */
  private onCampaignVictory = (data: {
    levelId: string;
    score: number;
    stars: number;
    time: number;
    kills: number;
    xpEarned: number;
  }): void => {
    this.isGameOver = true;

    // Récupérer le résumé de la run
    const summary = this.telemetryManager.generateRunSummary();

    // Arrêter les scènes parallèles
    this.scene.stop(SCENE_KEYS.HUD);
    if (this.scene.isActive(SCENE_KEYS.DEBUG)) {
      this.scene.stop(SCENE_KEYS.DEBUG);
    }

    // Arrêter cette scène et lancer le game over (victoire)
    this.scene.stop();
    this.scene.start(SCENE_KEYS.GAME_OVER, {
      summary: {
        ...summary,
        finalScore: data.score,
      },
      isVictory: true,
      xpEarned: data.xpEarned,
      campaignData: {
        levelId: data.levelId,
        stars: data.stars,
      },
    });
  };

  /**
   * Gestion de la défaite en mode campagne
   */
  private onCampaignDefeat = (): void => {
    // La défaite en campagne passe par onPlayerDeath comme d'habitude
  };

  /**
   * Met à jour la logique de jeu
   */
  update(time: number, delta: number): void {
    // Vérifier l'input de pause
    this.checkPauseInput();

    // Mettre à jour le joueur
    this.player.update(time, delta);

    // Mettre à jour l'arène (terrain zones + interactive elements)
    this.arena.update();

    // Vérifier les effets de terrain sur les entités
    this.checkTerrainZoneEffects();

    // Vérifier les dégâts des pièges à lames
    this.checkBladeTrapDamage();

    // Vérifier les interactions joueur (touche E)
    this.checkPlayerInteraction();

    // Vérifier les inputs pour les objets actifs (touche F/Tab)
    this.checkItemInput();

    // Mettre à jour les pools de projectiles
    this.bulletPool.update();
    this.acidSpitPool.update();
    this.flamePool.update(delta);

    // Mettre à jour tous les zombies actifs
    const activeZombies = this.poolManager.getActiveZombies();

    // Mettre à jour le flow field manager (pour le pathfinding de masse)
    this.flowFieldManager.setActiveZombieCount(activeZombies.length);
    this.flowFieldManager.update(this.player.x, this.player.y);

    // Mettre à jour le gestionnaire de horde (Phase 4.4)
    this.hordeManager.update(activeZombies, time);

    // Mettre à jour les comportements tactiques
    this.tacticalBehaviors.update(this.player.x, this.player.y, activeZombies);

    for (const zombie of activeZombies) {
      zombie.update(time, delta);
    }

    // Mettre à jour le système de combat
    this.combatSystem.update(time, delta);

    // Mettre à jour le système de drops (Phase 6.2)
    this.dropSystem.update();

    // Mettre à jour le système de power-ups (Phase 6.3)
    this.powerUpSystem.update(delta);

    // Mettre à jour le système d'objets actifs (Phase 6.4)
    this.activeItemSystem.update(delta);

    // Mettre à jour le système DDA (Phase 3.6)
    this.ddaSystem.update(delta);

    // Mettre à jour le boss actif (Phase 7.3)
    this.bossFactory.update(time, delta);

    // Mettre à jour le système d'événements (Phase 7.4)
    this.eventSystem.update(delta);

    // Mettre à jour la télémétrie
    this.telemetryManager.addGameTime(delta);
    this.telemetryManager.updateHealth(
      this.player.getHealth(),
      this.player.getMaxHealth()
    );

    // Note: Le flow field debug (F3) est géré par DebugScene qui dessine via drawFlowFieldDebug()
  }

  /**
   * Configure les collisions entre entités
   */
  private setupCollisions(): void {
    const coverGroup = this.arena.getCoverGroup();
    const interactiveGroup = this.arena.getInteractiveGroup();
    const wallsLayer = this.arena.getWallsLayer();

    // Collision joueur avec les murs (groupe statique)
    this.physics.add.collider(this.player, this.walls);

    // Collision joueur avec le tilemap walls layer
    if (wallsLayer) {
      this.physics.add.collider(this.player, wallsLayer);
    }

    // Collision joueur avec les covers
    this.physics.add.collider(this.player, coverGroup);

    // Collision joueur avec les éléments interactifs
    this.physics.add.collider(this.player, interactiveGroup);

    // Collision projectiles avec les murs (simple release)
    this.physics.add.collider(
      this.bulletPool.getGroup(),
      this.walls,
      (bullet) => {
        this.bulletPool.release(bullet as Phaser.Physics.Arcade.Sprite);
      },
      undefined,
      this
    );

    // Collision projectiles avec le tilemap walls layer
    if (wallsLayer) {
      this.physics.add.collider(
        this.bulletPool.getGroup(),
        wallsLayer,
        (bullet) => {
          this.bulletPool.release(bullet as Phaser.Physics.Arcade.Sprite);
        },
        undefined,
        this
      );
    }

    // Collision projectiles avec les covers (avec dégâts)
    this.physics.add.collider(
      this.bulletPool.getGroup(),
      coverGroup,
      (obj1, obj2) => {
        // Identifier le projectile et le cover
        let bullet: Phaser.Physics.Arcade.Sprite;
        let cover: Cover;

        if (obj1 instanceof Cover) {
          cover = obj1;
          bullet = obj2 as Phaser.Physics.Arcade.Sprite;
        } else {
          bullet = obj1 as Phaser.Physics.Arcade.Sprite;
          cover = obj2 as Cover;
        }

        // Infliger des dégâts si destructible
        if (cover.destructible) {
          const damage = this.bulletPool.getDamage(bullet);
          cover.takeDamage(damage, 'bullet');
        }

        this.bulletPool.release(bullet);
      },
      undefined,
      this
    );

    // Collision projectiles avec les éléments interactifs (avec dégâts)
    this.physics.add.collider(
      this.bulletPool.getGroup(),
      interactiveGroup,
      (obj1, obj2) => {
        let bullet: Phaser.Physics.Arcade.Sprite;
        let interactive: Interactive;

        if (obj1 instanceof Interactive) {
          interactive = obj1;
          bullet = obj2 as Phaser.Physics.Arcade.Sprite;
        } else {
          bullet = obj1 as Phaser.Physics.Arcade.Sprite;
          interactive = obj2 as Interactive;
        }

        // Infliger des dégâts
        const damage = this.bulletPool.getDamage(bullet);
        interactive.takeDamage(damage, 'bullet');

        this.bulletPool.release(bullet);
      },
      undefined,
      this
    );

    // Collision zombies avec les murs
    for (const group of this.poolManager.getAllZombieGroups()) {
      this.physics.add.collider(group, this.walls);

      // Collision zombies avec le tilemap walls layer
      if (wallsLayer) {
        this.physics.add.collider(group, wallsLayer);
      }

      // Collision zombies avec les covers
      this.physics.add.collider(group, coverGroup);

      // Collision zombies avec les éléments interactifs
      this.physics.add.collider(group, interactiveGroup);

      // Collision zombies entre eux
      this.physics.add.collider(group, group);
    }
  }

  /**
   * Récupère le joueur
   */
  public getPlayer(): Player {
    return this.player;
  }

  /**
   * Récupère la factory de zombies
   */
  public getZombieFactory(): ZombieFactory {
    return this.zombieFactory;
  }

  /**
   * Récupère le système de combat
   */
  public getCombatSystem(): CombatSystem {
    return this.combatSystem;
  }

  /**
   * Récupère le système de combo (Phase 6.1)
   */
  public getComboSystem(): ComboSystem {
    return this.comboSystem;
  }

  /**
   * Récupère le système de drops (Phase 6.2)
   */
  public getDropSystem(): DropSystem {
    return this.dropSystem;
  }

  /**
   * Récupère le système de power-ups (Phase 6.3)
   */
  public getPowerUpSystem(): PowerUpSystem {
    return this.powerUpSystem;
  }

  /**
   * Récupère le système d'objets actifs (Phase 6.4)
   */
  public getActiveItemSystem(): ActiveItemSystem {
    return this.activeItemSystem;
  }

  /**
   * Récupère le système d'upgrades roguelite (Phase 6.5)
   */
  public getUpgradeSystem(): UpgradeSystem {
    return this.upgradeSystem;
  }

  /**
   * Récupère le système économique (Phase 6.6)
   */
  public getEconomySystem(): EconomySystem {
    return this.economySystem;
  }

  /**
   * Récupère le système de progression permanente (Phase 6.7)
   */
  public getProgressionSystem(): ProgressionSystem {
    return this.progressionSystem;
  }

  /**
   * Récupère le système de spawn
   */
  public getSpawnSystem(): SpawnSystem {
    return this.spawnSystem;
  }

  /**
   * Récupère le système de vagues
   */
  public getWaveSystem(): WaveSystem {
    return this.waveSystem;
  }

  /**
   * Récupère la factory de boss (Phase 7.3)
   */
  public getBossFactory(): BossFactory {
    return this.bossFactory;
  }

  /**
   * Récupère le système d'événements (Phase 7.4)
   */
  public getEventSystem(): EventSystem {
    return this.eventSystem;
  }

  /**
   * Récupère le gestionnaire d'inventaire (Phase 5)
   */
  public getInventoryManager(): InventoryManager {
    return this.inventoryManager;
  }

  /**
   * Récupère le pathfinder pour la navigation des zombies
   */
  public getPathfinder(): Pathfinder {
    return this.pathfinder;
  }

  /**
   * Récupère tous les zombies actifs
   */
  public getActiveZombies(): Zombie[] {
    return this.poolManager.getActiveZombies();
  }

  /**
   * Récupère le gestionnaire de télémétrie (Phase 3.6)
   */
  public getTelemetryManager(): TelemetryManager {
    return this.telemetryManager;
  }

  /**
   * Récupère le système DDA (Phase 3.6)
   */
  public getDDASystem(): DDASystem {
    return this.ddaSystem;
  }

  /**
   * Récupère le gestionnaire de horde (Phase 4.4)
   */
  public getHordeManager(): HordeManager {
    return this.hordeManager;
  }

  /**
   * Récupère les comportements tactiques (Phase 4.4)
   */
  public getTacticalBehaviors(): TacticalBehaviors {
    return this.tacticalBehaviors;
  }

  /**
   * Récupère le gestionnaire de flow field (pour le pathfinding de masse)
   */
  public getFlowFieldManager(): FlowFieldManager {
    return this.flowFieldManager;
  }

  /**
   * Récupère l'arène
   */
  public getArena(): TiledArena {
    return this.arena;
  }

  /**
   * Récupère le gestionnaire d'entrées (Phase 3 Mobile)
   */
  public getInputManager(): InputManager {
    return this.inputManager;
  }

  /**
   * Récupère les contrôles mobiles (Phase 3 Mobile)
   * Retourne null si on n'est pas en mode tactile
   */
  public getMobileControls(): MobileControls | null {
    return this.mobileControls;
  }

  /**
   * Toggle l'affichage de debug du flow field
   * Appelé depuis DebugScene via F3
   */
  public toggleFlowFieldDebug(): void {
    this.showFlowFieldDebug = !this.showFlowFieldDebug;
    if (!this.showFlowFieldDebug) {
      if (this.debugFlowFieldGraphics) {
        this.debugFlowFieldGraphics.clear();
      }
      if (this.debugFlowFieldText) {
        this.debugFlowFieldText.setVisible(false);
      }
    }
  }

  /**
   * Dessine le flow field debug (peut être appelé depuis DebugScene)
   */
  public drawFlowFieldDebug(): void {
    if (!this.showFlowFieldDebug || !this.debugFlowFieldGraphics) return;

    this.debugFlowFieldGraphics.clear();

    const flowField = this.flowFieldManager.getFlowField();
    if (!flowField || !flowField.isFieldValid()) {
      // Afficher un indicateur rouge si le flow field n'est pas prêt
      // (besoin de plus de zombies pour l'activer)
      this.debugFlowFieldGraphics.fillStyle(0xff0000, 0.8);
      this.debugFlowFieldGraphics.fillRect(10, 50, 250, 30);
      this.debugFlowFieldGraphics.lineStyle(2, 0xff0000);
      this.debugFlowFieldGraphics.strokeRect(10, 50, 250, 30);

      // Texte d'indication
      const activeZombies = this.poolManager.getActiveZombies().length;
      if (this.debugFlowFieldText) {
        this.debugFlowFieldText.setText(`FlowField: ${activeZombies} zombies (min 5)`);
        this.debugFlowFieldText.setVisible(true);
      }
      return;
    }

    // Cacher le texte si le flow field est valide
    if (this.debugFlowFieldText) {
      this.debugFlowFieldText.setVisible(false);
    }

    const flowMap = flowField.getFlowMap();
    const gridSize = flowField.getGridSize();
    const tileSize = 32;

    // Dessiner les directions
    for (let y = 0; y < gridSize.height; y++) {
      for (let x = 0; x < gridSize.width; x++) {
        const dir = flowMap[y][x];
        if (dir.x === 0 && dir.y === 0) continue;

        const worldX = x * tileSize + tileSize / 2;
        const worldY = y * tileSize + tileSize / 2;

        // Ligne de direction
        const lineLength = 12;
        const endX = worldX + dir.x * lineLength;
        const endY = worldY + dir.y * lineLength;

        // Couleur basée sur la direction (vert = vers joueur)
        this.debugFlowFieldGraphics.lineStyle(1, 0x00ff00, 0.6);
        this.debugFlowFieldGraphics.beginPath();
        this.debugFlowFieldGraphics.moveTo(worldX, worldY);
        this.debugFlowFieldGraphics.lineTo(endX, endY);
        this.debugFlowFieldGraphics.strokePath();

        // Petit point au centre
        this.debugFlowFieldGraphics.fillStyle(0x00ff00, 0.4);
        this.debugFlowFieldGraphics.fillCircle(worldX, worldY, 2);
      }
    }

    // Indicateur que le flow field est actif (rectangle vert en haut à gauche)
    this.debugFlowFieldGraphics.lineStyle(2, 0x00ff00);
    this.debugFlowFieldGraphics.strokeRect(10, 50, 20, 20);
    this.debugFlowFieldGraphics.fillStyle(0x00ff00, 0.5);
    this.debugFlowFieldGraphics.fillRect(10, 50, 20, 20);
  }

  /**
   * Vérifie les effets de terrain sur le joueur et les zombies
   */
  private checkTerrainZoneEffects(): void {
    const terrainZones = this.arena.getActiveTerrainZones();

    for (const zone of terrainZones) {
      // Vérifier le joueur
      this.checkEntityInZone(this.player, zone);

      // Vérifier les zombies
      const activeZombies = this.poolManager.getActiveZombies();
      for (const zombie of activeZombies) {
        if (zombie.active) {
          this.checkEntityInZone(zombie, zone);
        }
      }
    }
  }

  /**
   * Vérifie si une entité est dans une zone de terrain
   */
  private checkEntityInZone(
    entity: { x: number; y: number; active: boolean },
    zone: TerrainZone
  ): void {
    const distance = Phaser.Math.Distance.Between(entity.x, entity.y, zone.x, zone.y);
    const inZone = distance <= zone.getRadius();

    const entitiesInZone = zone.getEntitiesInZone();
    const wasInZone = entitiesInZone.includes(entity as Entity);

    if (inZone && !wasInZone) {
      zone.onEntityEnter(entity as Entity);
    }
  }

  /**
   * Vérifie les dégâts des pièges à lames sur les entités
   */
  private checkBladeTrapDamage(): void {
    const interactives = this.arena.getActiveInteractiveElements();

    for (const elem of interactives) {
      if (elem instanceof BladeTrap && elem.isTrapActive()) {
        // Vérifier le joueur
        elem.checkDamage(this.player);

        // Vérifier les zombies
        const activeZombies = this.poolManager.getActiveZombies();
        for (const zombie of activeZombies) {
          if (zombie.active) {
            elem.checkDamage(zombie);
          }
        }
      }
    }
  }

  /** Touche E pressée pour interaction */
  private interactKeyE: Phaser.Input.Keyboard.Key | null = null;
  private lastInteractTime: number = 0;
  private interactCooldown: number = 300; // ms

  /** Touches pour pause */
  private pauseKeyEsc: Phaser.Input.Keyboard.Key | null = null;
  private pauseKeyP: Phaser.Input.Keyboard.Key | null = null;

  /** Debug flow field */
  private debugFlowFieldGraphics: Phaser.GameObjects.Graphics | null = null;
  private debugFlowFieldText: Phaser.GameObjects.Text | null = null;
  public showFlowFieldDebug: boolean = false;

  /** Flag pour éviter le double déclenchement du game over */
  private isGameOver: boolean = false;

  /**
   * Vérifie si le joueur interagit avec un élément (touche E)
   */
  private checkPlayerInteraction(): void {
    // Initialiser la touche E si pas encore fait
    if (!this.interactKeyE && this.input.keyboard) {
      this.interactKeyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    if (!this.interactKeyE) return;

    // Vérifier si la touche E est pressée
    if (Phaser.Input.Keyboard.JustDown(this.interactKeyE)) {
      const now = this.time.now;
      if (now - this.lastInteractTime < this.interactCooldown) return;

      this.lastInteractTime = now;

      // Chercher l'élément interactable le plus proche
      const interactionRadius = 60;
      const nearestInteractable = this.arena.getInteractiveAt(
        this.player.x,
        this.player.y,
        interactionRadius
      );

      if (nearestInteractable && nearestInteractable.isInteractable()) {
        nearestInteractable.onPlayerInteract();

        // Effet visuel d'interaction
        this.createInteractionFeedback(nearestInteractable.x, nearestInteractable.y);
      }
    }
  }

  /**
   * Crée un feedback visuel pour l'interaction
   */
  private createInteractionFeedback(x: number, y: number): void {
    const feedback = this.add.circle(x, y, 20, 0x00ff00, 0.5);
    feedback.setDepth(100);

    this.tweens.add({
      targets: feedback,
      scale: 1.5,
      alpha: 0,
      duration: 200,
      onComplete: () => feedback.destroy(),
    });
  }

  /**
   * Vérifie les inputs pour les objets actifs (touche F pour utiliser, Tab pour cycler)
   */
  private checkItemInput(): void {
    // Utiliser l'item équipé (touche F)
    if (this.inputManager.isActionJustPressed('useItem')) {
      const success = this.activeItemSystem.useEquippedItem();
      if (success) {
        // Feedback visuel
        this.createItemUseFeedback();
      }
    }

    // Cycler vers l'item suivant (touche Tab)
    if (this.inputManager.isActionJustPressed('itemNext')) {
      this.activeItemSystem.cycleEquipped(1);
    }
  }

  /**
   * Crée un feedback visuel pour l'utilisation d'un item
   */
  private createItemUseFeedback(): void {
    const feedback = this.add.circle(this.player.x, this.player.y, 30, 0x8844aa, 0.4);
    feedback.setDepth(100);

    this.tweens.add({
      targets: feedback,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => feedback.destroy(),
    });
  }

  /**
   * Gère la suppression d'un obstacle (cover détruit)
   * Met à jour le pathfinder et le flow field pour que les zombies puissent passer
   */
  private onObstacleRemoved(event: { x: number; y: number; width: number; height: number }): void {
    this.pathfinder.invalidateArea(event.x, event.y, event.width, event.height);
    this.flowFieldManager.updateGridArea(event.x, event.y, event.width, event.height, true);
  }

  /**
   * Configure les contrôles de pause
   */
  private setupPauseControls(): void {
    if (!this.input.keyboard) return;

    this.pauseKeyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.pauseKeyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    // Vérifier la pause dans l'update
  }

  /**
   * Configure les contrôles mobiles (Phase 3 Mobile)
   * Crée les joysticks et boutons tactiles si on est sur mobile
   */
  private setupMobileControls(): void {
    // Créer l'overlay d'orientation pour mobile (Phase 5)
    if (!DeviceDetector.isDesktop()) {
      this.orientationOverlay = new OrientationOverlay(this);

      // Essayer de verrouiller l'orientation en mode paysage
      this.orientationOverlay.tryLockLandscape().then((locked) => {
        if (locked) {
          console.log('[GameScene] Orientation locked to landscape');
        }
      });
    }

    // Vérifier si on est en mode tactile
    if (DeviceDetector.getRecommendedInputMode() !== 'touch') {
      console.log('[GameScene] Desktop mode - skipping mobile controls');
      return;
    }

    console.log('[GameScene] Mobile mode - creating touch controls');

    // Créer les contrôles mobiles
    this.mobileControls = new MobileControls(this, {
      inputManager: this.inputManager,
    });

    // Mettre à jour l'affichage de l'arme à distance quand elle change
    this.events.on('weaponChanged', (_index: number, weapon: { getName: () => string }) => {
      if (this.mobileControls && weapon) {
        this.mobileControls.setCurrentWeapon(weapon.getName());
      }
    });

    // Mettre à jour l'affichage de l'arme de mêlée quand elle change
    this.events.on('rangedSlotChanged', (_index: number, weapon: { getName: () => string }) => {
      if (this.mobileControls && weapon) {
        this.mobileControls.setCurrentWeapon(weapon.getName());
      }
    });

    this.events.on('meleeSlotChanged', (_index: number, weapon: { getName: () => string }) => {
      if (this.mobileControls && weapon) {
        this.mobileControls.setCurrentMeleeWeapon(weapon.getName());
      }
    });

    // Initialiser avec l'arme à distance actuelle
    if (this.player?.currentWeapon) {
      this.mobileControls.setCurrentWeapon(this.player.currentWeapon.getName());
    }

    // Initialiser avec l'arme de mêlée actuelle
    const currentMelee = this.player?.getMeleeWeapon?.();
    if (currentMelee) {
      this.mobileControls.setCurrentMeleeWeapon(currentMelee.getName());
    }

    // Enregistrer le callback pour la pause via InputManager
    this.inputManager.onActionTriggered('pause', () => {
      this.openPauseMenu();
    });

    // Enregistrer les callbacks pour les objets actifs
    this.inputManager.onActionTriggered('useItem', () => {
      const success = this.activeItemSystem.useEquippedItem();
      if (success) {
        this.createItemUseFeedback();
      }
    });

    this.inputManager.onActionTriggered('itemNext', () => {
      this.activeItemSystem.cycleEquipped(1);
    });
  }

  /**
   * Vérifie si la touche pause est pressée (appelé dans update)
   */
  private checkPauseInput(): void {
    if (!this.pauseKeyEsc || !this.pauseKeyP) return;

    if (
      Phaser.Input.Keyboard.JustDown(this.pauseKeyEsc) ||
      Phaser.Input.Keyboard.JustDown(this.pauseKeyP)
    ) {
      this.openPauseMenu();
    }
  }

  /**
   * Ouvre le menu pause
   */
  private openPauseMenu(): void {
    // Ne pas ouvrir si déjà en pause ou game over
    if (this.isGameOver) return;

    // Lancer la scène de pause
    this.scene.launch(SCENE_KEYS.PAUSE, { gameScene: this });
  }

  /**
   * Gère la mort du joueur
   */
  private onPlayerDeath(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Notifier les managers de mode
    if (this.campaignManager) {
      this.campaignManager.onDefeat();
    }
    if (this.dailyChallengeManager) {
      this.dailyChallengeManager.onGameOver();
    }

    // Petit délai avant d'afficher le game over
    this.time.delayedCall(500, () => {
      this.showGameOver();
    });
  }

  /**
   * Affiche l'écran de game over
   */
  private showGameOver(): void {
    // Récupérer le résumé de la run
    const summary = this.telemetryManager.generateRunSummary();

    // Calculer l'XP gagnée (basé sur vagues, kills, etc.)
    const xpEarned = this.calculateXPEarned(summary);

    // Sauvegarder les high scores selon le mode (Phase 8.2)
    const saveManager = SaveManager.getInstance();
    let isNewHighScore = false;

    switch (this.gameMode) {
      case 'survival':
        isNewHighScore = saveManager.updateSurvivalHighScore({
          wave: summary.maxWave,
          score: summary.finalScore,
          kills: summary.totalKills,
          time: Math.floor(summary.duration),
        });
        break;

      case 'daily':
        if (this.dailyChallengeManager) {
          const date = DailyChallengeManager.getTodayDate();
          isNewHighScore = saveManager.updateDailyChallengeScore(date, {
            score: summary.finalScore,
            wave: summary.maxWave,
          });
        }
        break;

      case 'campaign':
        // La sauvegarde de campagne est gérée par le CampaignManager
        break;
    }

    saveManager.save();

    // Arrêter les scènes parallèles
    this.scene.stop(SCENE_KEYS.HUD);
    if (this.scene.isActive(SCENE_KEYS.DEBUG)) {
      this.scene.stop(SCENE_KEYS.DEBUG);
    }

    // Arrêter cette scène et lancer le game over
    this.scene.stop();
    this.scene.start(SCENE_KEYS.GAME_OVER, {
      summary,
      isVictory: false,
      xpEarned,
      gameMode: this.gameMode,
      isNewHighScore,
    });
  }

  /**
   * Calcule l'XP gagnée pour cette run
   */
  private calculateXPEarned(summary: { maxWave: number; totalKills: number; duration: number }): number {
    // XP basée sur les vagues, kills et temps de survie
    const waveXP = summary.maxWave * 50;
    const killXP = summary.totalKills * 2;
    const timeXP = Math.floor(summary.duration / 10); // 1 XP par 10 secondes

    return waveXP + killXP + timeXP;
  }

  /**
   * Nettoie la scène
   */
  shutdown(): void {
    // Nettoyer les managers de mode (Phase 8.2)
    this.campaignManager?.destroy();
    this.campaignManager = null;
    this.dailyChallengeManager?.destroy();
    this.dailyChallengeManager = null;

    // Nettoyer les événements de mode
    this.events.off('campaignVictory', this.onCampaignVictory, this);
    this.events.off('campaignDefeat', this.onCampaignDefeat, this);

    this.waveSystem?.destroy();
    this.spawnSystem?.destroy();
    this.combatSystem?.destroy();
    this.comboSystem?.destroy();
    this.dropSystem?.destroy();
    this.powerUpSystem?.destroy();
    this.activeItemSystem?.destroy();
    this.upgradeSystem?.destroy();
    this.economySystem?.destroy();
    this.progressionSystem?.destroy();
    this.poolManager?.destroy();
    this.ddaSystem?.reset();
    this.acidSpitPool?.destroy();
    this.flamePool?.destroy();
    this.corpseManager?.destroy();
    this.hordeManager?.destroy();
    this.tacticalBehaviors?.reset();
    this.flowFieldManager?.destroy();
    this.eventSystem?.destroy();
    this.arena?.destroy();

    // Nettoyer les contrôles mobiles et l'InputManager (Phase 3 Mobile)
    this.mobileControls?.destroy();
    this.mobileControls = null;
    this.orientationOverlay?.destroy();
    this.orientationOverlay = null;
    this.inputManager?.destroy();

    this.events.off('miniZombieSpawned', this.onMiniZombieSpawned, this);
    this.events.off('arena:obstacleRemoved', this.onObstacleRemoved, this);
    this.events.off('playerDeath', this.onPlayerDeath, this);
  }
}
