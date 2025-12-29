import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import { Player } from '@entities/Player';
import { Arena } from '@arena/Arena';
import { Cover } from '@arena/Cover';
import { BulletPool } from '@entities/projectiles/BulletPool';
import { AcidSpitPool } from '@entities/projectiles/AcidSpitPool';
import { FlamePool } from '@entities/projectiles/FlamePool';
import { PoolManager } from '@managers/PoolManager';
import { TelemetryManager } from '@managers/TelemetryManager';
import { CorpseManager } from '@managers/CorpseManager';
import { ZombieFactory } from '@entities/zombies/ZombieFactory';
import { CombatSystem } from '@systems/CombatSystem';
import { SpawnSystem } from '@systems/SpawnSystem';
import { WaveSystem } from '@systems/WaveSystem';
import { DDASystem } from '@systems/DDASystem';
import { Pathfinder } from '@utils/pathfinding';
import { HordeManager } from '@ai/HordeManager';
import { TacticalBehaviors } from '@ai/TacticalBehaviors';
import type { Zombie } from '@entities/zombies/Zombie';
import type { MiniZombie } from '@entities/zombies/MiniZombie';

/**
 * Scène principale du jeu
 * Gère le gameplay, les entités et les systèmes
 */
export class GameScene extends Phaser.Scene {
  public player!: Player;
  public arena!: Arena;
  public bulletPool!: BulletPool;
  public acidSpitPool!: AcidSpitPool;
  public flamePool!: FlamePool;
  public walls!: Phaser.Physics.Arcade.StaticGroup;
  public corpseManager!: CorpseManager;

  private poolManager!: PoolManager;
  private zombieFactory!: ZombieFactory;
  private combatSystem!: CombatSystem;
  private spawnSystem!: SpawnSystem;
  private waveSystem!: WaveSystem;
  private pathfinder!: Pathfinder;
  private telemetryManager!: TelemetryManager;
  private ddaSystem!: DDASystem;
  private hordeManager!: HordeManager;
  private tacticalBehaviors!: TacticalBehaviors;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  /**
   * Initialise la scène de jeu
   */
  create(): void {
    // Créer l'arène
    this.arena = new Arena(this);
    this.walls = this.arena.getWalls();

    // Initialiser le pathfinder avec les obstacles de l'arène
    this.pathfinder = new Pathfinder();
    this.pathfinder.buildGrid(this.arena.getObstacles());

    // Écouter les changements d'obstacles pour mettre à jour le pathfinder
    this.events.on('arena:obstacleRemoved', this.onObstacleRemoved, this);

    // Créer le pool de projectiles
    this.bulletPool = new BulletPool(this);

    // Créer le joueur au centre
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    this.player = new Player(this, centerX, centerY);

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

    // Configuration de la caméra
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Démarrer le système de vagues après un court délai
    this.time.delayedCall(1000, () => {
      this.waveSystem.start();
    });
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

    // Système de vagues (avec intégration ThreatSystem et DDA)
    this.waveSystem = new WaveSystem(this);
    this.waveSystem.setDDASystem(this.ddaSystem);

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
   * Met à jour la logique de jeu
   */
  update(time: number, delta: number): void {
    // Mettre à jour le joueur
    this.player.update(time, delta);

    // Mettre à jour les pools de projectiles
    this.bulletPool.update();
    this.acidSpitPool.update();
    this.flamePool.update(delta);

    // Mettre à jour tous les zombies actifs
    const activeZombies = this.poolManager.getActiveZombies();

    // Mettre à jour le gestionnaire de horde (Phase 4.4)
    this.hordeManager.update(activeZombies, time);

    // Mettre à jour les comportements tactiques
    this.tacticalBehaviors.update(this.player.x, this.player.y, activeZombies);

    for (const zombie of activeZombies) {
      zombie.update(time, delta);
    }

    // Mettre à jour le système de combat
    this.combatSystem.update(time, delta);

    // Mettre à jour le système DDA (Phase 3.6)
    this.ddaSystem.update(delta);

    // Mettre à jour la télémétrie avec la santé actuelle du joueur
    this.telemetryManager.updateHealth(
      this.player.getHealth(),
      this.player.getMaxHealth()
    );
  }

  /**
   * Configure les collisions entre entités
   */
  private setupCollisions(): void {
    const coverGroup = this.arena.getCoverGroup();

    // Collision joueur avec les murs
    this.physics.add.collider(this.player, this.walls);

    // Collision joueur avec les covers
    this.physics.add.collider(this.player, coverGroup);

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

    // Collision zombies avec les murs
    for (const group of this.poolManager.getAllZombieGroups()) {
      this.physics.add.collider(group, this.walls);

      // Collision zombies avec les covers
      this.physics.add.collider(group, coverGroup);

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
   * Récupère l'arène
   */
  public getArena(): Arena {
    return this.arena;
  }

  /**
   * Gère la suppression d'un obstacle (cover détruit)
   * Met à jour le pathfinder pour que les zombies puissent passer
   */
  private onObstacleRemoved(event: { x: number; y: number; width: number; height: number }): void {
    this.pathfinder.invalidateArea(event.x, event.y, event.width, event.height);
  }

  /**
   * Nettoie la scène
   */
  shutdown(): void {
    this.waveSystem?.destroy();
    this.spawnSystem?.destroy();
    this.combatSystem?.destroy();
    this.poolManager?.destroy();
    this.ddaSystem?.reset();
    this.acidSpitPool?.destroy();
    this.flamePool?.destroy();
    this.corpseManager?.destroy();
    this.hordeManager?.destroy();
    this.tacticalBehaviors?.reset();
    this.arena?.destroy();
    this.events.off('miniZombieSpawned', this.onMiniZombieSpawned, this);
    this.events.off('arena:obstacleRemoved', this.onObstacleRemoved, this);
  }
}
