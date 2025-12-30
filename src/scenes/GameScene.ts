import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import { Player } from '@entities/Player';
import { Arena } from '@arena/Arena';
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
import { ZombieFactory } from '@entities/zombies/ZombieFactory';
import { CombatSystem } from '@systems/CombatSystem';
import { SpawnSystem } from '@systems/SpawnSystem';
import { WaveSystem } from '@systems/WaveSystem';
import { DDASystem } from '@systems/DDASystem';
import { Pathfinder } from '@utils/pathfinding';
import { HordeManager } from '@ai/HordeManager';
import { TacticalBehaviors } from '@ai/TacticalBehaviors';
import { FlowFieldManager } from '@ai/FlowFieldManager';
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
  private flowFieldManager!: FlowFieldManager;

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

    // Lancer la scène Debug en mode développement
    if (import.meta.env.DEV) {
      this.scene.launch(SCENE_KEYS.DEBUG, { gameScene: this });
    }

    // Configuration de la caméra
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Démarrer le système de vagues après un court délai
    this.time.delayedCall(1000, () => {
      this.waveSystem.start();
    });

    // Debug: touche F3 pour afficher le flow field
    if (this.input.keyboard) {
      this.debugFlowFieldKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3);
      this.debugFlowFieldGraphics = this.add.graphics();
      this.debugFlowFieldGraphics.setDepth(1000);
    }
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

    // Mettre à jour l'arène (terrain zones + interactive elements)
    this.arena.update();

    // Vérifier les effets de terrain sur les entités
    this.checkTerrainZoneEffects();

    // Vérifier les dégâts des pièges à lames
    this.checkBladeTrapDamage();

    // Vérifier les interactions joueur (touche E)
    this.checkPlayerInteraction();

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

    // Mettre à jour le système DDA (Phase 3.6)
    this.ddaSystem.update(delta);

    // Mettre à jour la télémétrie avec la santé actuelle du joueur
    this.telemetryManager.updateHealth(
      this.player.getHealth(),
      this.player.getMaxHealth()
    );

    // Debug flow field (F3)
    this.updateFlowFieldDebug();
  }

  /**
   * Met à jour l'affichage de debug du flow field
   */
  private updateFlowFieldDebug(): void {
    if (!this.debugFlowFieldKey || !this.debugFlowFieldGraphics) return;

    // Toggle avec F3
    if (Phaser.Input.Keyboard.JustDown(this.debugFlowFieldKey)) {
      this.showFlowFieldDebug = !this.showFlowFieldDebug;
      if (!this.showFlowFieldDebug) {
        this.debugFlowFieldGraphics.clear();
      }
    }

    if (!this.showFlowFieldDebug) return;

    this.debugFlowFieldGraphics.clear();

    const flowField = this.flowFieldManager.getFlowField();
    if (!flowField || !flowField.isFieldValid()) {
      // Afficher un message si le flow field n'est pas prêt
      this.debugFlowFieldGraphics.lineStyle(2, 0xff0000);
      this.debugFlowFieldGraphics.strokeRect(10, 10, 200, 30);
      return;
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
    this.debugFlowFieldGraphics.strokeRect(10, 10, 20, 20);
    this.debugFlowFieldGraphics.fillStyle(0x00ff00, 0.5);
    this.debugFlowFieldGraphics.fillRect(10, 10, 20, 20);
  }

  /**
   * Configure les collisions entre entités
   */
  private setupCollisions(): void {
    const coverGroup = this.arena.getCoverGroup();
    const interactiveGroup = this.arena.getInteractiveGroup();

    // Collision joueur avec les murs
    this.physics.add.collider(this.player, this.walls);

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
   * Récupère le gestionnaire de flow field (pour le pathfinding de masse)
   */
  public getFlowFieldManager(): FlowFieldManager {
    return this.flowFieldManager;
  }

  /**
   * Récupère l'arène
   */
  public getArena(): Arena {
    return this.arena;
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

  /** Debug flow field */
  private debugFlowFieldKey: Phaser.Input.Keyboard.Key | null = null;
  private debugFlowFieldGraphics: Phaser.GameObjects.Graphics | null = null;
  private showFlowFieldDebug: boolean = false;

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
   * Gère la suppression d'un obstacle (cover détruit)
   * Met à jour le pathfinder et le flow field pour que les zombies puissent passer
   */
  private onObstacleRemoved(event: { x: number; y: number; width: number; height: number }): void {
    this.pathfinder.invalidateArea(event.x, event.y, event.width, event.height);
    this.flowFieldManager.updateGridArea(event.x, event.y, event.width, event.height, true);
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
    this.flowFieldManager?.destroy();
    this.arena?.destroy();
    this.events.off('miniZombieSpawned', this.onMiniZombieSpawned, this);
    this.events.off('arena:obstacleRemoved', this.onObstacleRemoved, this);
  }
}
