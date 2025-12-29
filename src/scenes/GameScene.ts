import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import { Player } from '@entities/Player';
import { Arena } from '@arena/Arena';
import { BulletPool } from '@entities/projectiles/BulletPool';
import { PoolManager } from '@managers/PoolManager';
import { TelemetryManager } from '@managers/TelemetryManager';
import { ZombieFactory } from '@entities/zombies/ZombieFactory';
import { CombatSystem } from '@systems/CombatSystem';
import { SpawnSystem } from '@systems/SpawnSystem';
import { WaveSystem } from '@systems/WaveSystem';
import { DDASystem } from '@systems/DDASystem';
import { Pathfinder } from '@utils/pathfinding';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Scène principale du jeu
 * Gère le gameplay, les entités et les systèmes
 */
export class GameScene extends Phaser.Scene {
  public player!: Player;
  public arena!: Arena;
  public bulletPool!: BulletPool;
  public walls!: Phaser.Physics.Arcade.StaticGroup;

  private poolManager!: PoolManager;
  private zombieFactory!: ZombieFactory;
  private combatSystem!: CombatSystem;
  private spawnSystem!: SpawnSystem;
  private waveSystem!: WaveSystem;
  private pathfinder!: Pathfinder;
  private telemetryManager!: TelemetryManager;
  private ddaSystem!: DDASystem;

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

    // Créer le pool de projectiles
    this.bulletPool = new BulletPool(this);

    // Créer le joueur au centre
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    this.player = new Player(this, centerX, centerY);

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

    // Connecter les événements de télémétrie
    this.setupTelemetryEvents();
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

    // Mettre à jour le pool de projectiles
    this.bulletPool.update();

    // Mettre à jour tous les zombies actifs
    const activeZombies = this.poolManager.getActiveZombies();
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
    // Collision joueur avec les murs
    this.physics.add.collider(this.player, this.walls);

    // Collision projectiles avec les murs
    this.physics.add.collider(
      this.bulletPool.getGroup(),
      this.walls,
      (bullet) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        this.bulletPool.release(b);
      },
      undefined,
      this
    );

    // Collision zombies avec les murs
    for (const group of this.poolManager.getAllZombieGroups()) {
      this.physics.add.collider(group, this.walls);

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
   * Nettoie la scène
   */
  shutdown(): void {
    this.waveSystem?.destroy();
    this.spawnSystem?.destroy();
    this.combatSystem?.destroy();
    this.poolManager?.destroy();
    this.ddaSystem?.reset();
  }
}
