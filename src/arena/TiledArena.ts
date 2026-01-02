import Phaser from 'phaser';
import { TILE_SIZE } from '@config/constants';
import type { GameScene } from '@scenes/GameScene';
import { Door, type DoorConfig } from './Door';
import { Cover, CoverType, type CoverConfig } from './Cover';
import { TerrainZone, TerrainType } from './TerrainZone';
import { PuddleZone } from './PuddleZone';
import { DebrisZone } from './DebrisZone';
import { ElectricZone } from './ElectricZone';
import { FireZone } from './FireZone';
import { AcidZone } from './AcidZone';
import { Interactive } from './Interactive';
import { BarrelExplosive } from './BarrelExplosive';
import { BarrelFire } from './BarrelFire';
import { Switch } from './Switch';
import { Generator } from './Generator';
import { FlameTrap } from './FlameTrap';
import { BladeTrap } from './BladeTrap';
import { Checkpoint } from './Checkpoint';
import { Saferoom } from './Saferoom';
import { Teleporter } from './Teleporter';
import { ObjectiveMarker } from './ObjectiveMarker';
import { DefendZone } from './DefendZone';
import { AutoDoor } from './AutoDoor';
import {
  TiledLevelLoader,
  type TiledLevelData,
  type PlayerSpawnConfig,
} from './TiledLevelLoader';

/**
 * Représente un obstacle pour le pathfinding
 */
export interface ObstacleData {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Arène basée sur les fichiers Tiled
 * Remplace Arena.ts pour charger les niveaux depuis des tilemaps
 */
export class TiledArena {
  private scene: GameScene;
  private mapKey: string;
  private tilesetKey: string;

  // Tilemap Phaser
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private groundLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private wallsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private decorationLayer: Phaser.Tilemaps.TilemapLayer | null = null;

  // Groupes Phaser
  private walls: Phaser.Physics.Arcade.StaticGroup;
  private coverGroup: Phaser.GameObjects.Group;
  private terrainZoneGroup: Phaser.GameObjects.Group;
  private interactiveGroup: Phaser.GameObjects.Group;

  // Éléments de jeu
  private doors: Door[] = [];
  private obstacles: ObstacleData[] = [];
  private covers: Cover[] = [];
  private terrainZones: TerrainZone[] = [];
  private interactiveElements: Interactive[] = [];

  // Nouveaux éléments de gameplay
  private checkpoints: Checkpoint[] = [];
  private saferooms: Saferoom[] = [];
  private teleporters: Teleporter[] = [];
  private objectiveMarkers: ObjectiveMarker[] = [];
  private defendZones: DefendZone[] = [];
  private autoDoors: AutoDoor[] = [];

  // Données Tiled
  private levelData: TiledLevelData;
  private playerSpawn: PlayerSpawnConfig;

  constructor(scene: GameScene, mapKey: string, tilesetKey: string = 'zombie_tileset') {
    this.scene = scene;
    this.mapKey = mapKey;
    this.tilesetKey = tilesetKey;

    // Charger les données Tiled
    const loader = new TiledLevelLoader(scene);
    this.levelData = loader.load(mapKey);
    this.playerSpawn = this.levelData.playerSpawn;

    // Créer les groupes
    this.walls = scene.physics.add.staticGroup();
    this.coverGroup = scene.add.group();
    this.terrainZoneGroup = scene.add.group();
    this.interactiveGroup = scene.add.group();

    // Créer le tilemap et les layers
    this.createTilemap();

    // Créer les éléments de jeu
    this.createDoors();
    this.createCovers();
    this.createTerrainZones();
    this.createInteractiveElements();

    // Créer les nouveaux éléments de gameplay
    this.createCheckpoints();
    this.createSaferooms();
    this.createTeleporters();
    this.createObjectiveMarkers();
    this.createDefendZones();
    this.createAutoDoors();

    // Écouter les événements
    this.scene.events.on('cover:destroy', this.onCoverDestroyed, this);
    this.scene.events.on('terrain:destroy', this.onTerrainZoneDestroyed, this);
    this.scene.events.on('interactive:destroy', this.onInteractiveDestroyed, this);
  }

  /**
   * Crée le tilemap Phaser depuis les données Tiled
   */
  private createTilemap(): void {
    // Créer le tilemap depuis le JSON
    this.tilemap = this.scene.make.tilemap({ key: this.mapKey });

    // Ajouter le tileset
    const tileset = this.tilemap.addTilesetImage('zombie_tileset', this.tilesetKey);
    if (!tileset) {
      console.error('Failed to load tileset');
      return;
    }

    // Créer les layers
    this.groundLayer = this.tilemap.createLayer('ground', tileset);
    if (this.groundLayer) {
      this.groundLayer.setDepth(-1);
    }

    this.wallsLayer = this.tilemap.createLayer('walls', tileset);
    if (this.wallsLayer) {
      this.wallsLayer.setDepth(0);
      // Configurer les collisions pour les tiles non-vides
      this.wallsLayer.setCollisionByExclusion([-1, 0]);
      // Ajouter les obstacles pour le pathfinding
      this.extractWallObstacles();
    }

    // Layer de décoration (optionnel)
    this.decorationLayer = this.tilemap.createLayer('decoration', tileset);
    if (this.decorationLayer) {
      this.decorationLayer.setDepth(10);
    }
  }

  /**
   * Extrait les obstacles des murs pour le pathfinding
   */
  private extractWallObstacles(): void {
    for (const tile of this.levelData.wallCollisionTiles) {
      this.obstacles.push({
        x: tile.x,
        y: tile.y,
        width: TILE_SIZE,
        height: TILE_SIZE,
      });
    }
  }

  /**
   * Crée les portes depuis les données Tiled
   */
  private createDoors(): void {
    for (const doorConfig of this.levelData.zombieDoors) {
      const config: DoorConfig = {
        x: doorConfig.x,
        y: doorConfig.y,
        width: doorConfig.width,
        height: doorConfig.height,
        side: doorConfig.side,
      };
      const door = new Door(this.scene, config);
      this.doors.push(door);
    }
  }

  /**
   * Crée les couvertures depuis les données Tiled
   */
  private createCovers(): void {
    for (const coverConfig of this.levelData.covers) {
      const config: CoverConfig = {
        type: coverConfig.type,
        x: coverConfig.x,
        y: coverConfig.y,
        width: coverConfig.width,
        height: coverConfig.height,
      };

      const cover = new Cover(this.scene, config);
      this.covers.push(cover);
      this.coverGroup.add(cover);

      // Enregistrer comme obstacle pour le pathfinding
      const data = cover.getCoverData();
      this.obstacles.push({
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
      });
    }
  }

  /**
   * Crée les zones de terrain depuis les données Tiled
   */
  private createTerrainZones(): void {
    // Flaques
    for (const config of this.levelData.puddles) {
      const puddle = new PuddleZone(this.scene, {
        x: config.x,
        y: config.y,
        radius: config.radius,
        isBlood: config.isBlood,
      });
      this.terrainZones.push(puddle);
      this.terrainZoneGroup.add(puddle);
    }

    // Gravats (slowFactor est géré par BALANCE)
    for (const config of this.levelData.debris) {
      const debris = new DebrisZone(this.scene, {
        x: config.x,
        y: config.y,
        radius: config.radius,
      });
      this.terrainZones.push(debris);
      this.terrainZoneGroup.add(debris);
    }

    // Zones électriques (damagePerSecond est géré par BALANCE)
    for (const config of this.levelData.electricZones) {
      const electric = new ElectricZone(this.scene, {
        x: config.x,
        y: config.y,
        radius: config.radius,
        active: config.active,
        linkedGeneratorId: config.linkedGeneratorId,
      });
      this.terrainZones.push(electric);
      this.terrainZoneGroup.add(electric);
    }

    // Zones de feu (permanentes, placées dans le level)
    for (const config of this.levelData.fireZones) {
      const fire = new FireZone(this.scene, {
        x: config.x,
        y: config.y,
        radius: config.radius,
        duration: config.duration,
        damage: config.damagePerSecond,
      });
      this.terrainZones.push(fire);
      this.terrainZoneGroup.add(fire);
    }

    // Zones d'acide (slowFactor est géré par BALANCE)
    for (const config of this.levelData.acidZones) {
      const acid = new AcidZone(this.scene, {
        x: config.x,
        y: config.y,
        radius: config.radius,
        duration: config.duration,
        damage: config.damagePerSecond,
      });
      this.terrainZones.push(acid);
      this.terrainZoneGroup.add(acid);
    }
  }

  /**
   * Crée les éléments interactifs depuis les données Tiled
   */
  private createInteractiveElements(): void {
    // Barils explosifs
    for (const config of this.levelData.barrelExplosives) {
      const barrel = new BarrelExplosive(this.scene, {
        x: config.x,
        y: config.y,
        explosionDamage: config.damage,
        explosionRadius: config.radius,
      });
      this.interactiveElements.push(barrel);
      this.interactiveGroup.add(barrel);
    }

    // Barils incendiaires
    for (const config of this.levelData.barrelFires) {
      const barrel = new BarrelFire(this.scene, {
        x: config.x,
        y: config.y,
        fireDuration: config.fireDuration,
        fireRadius: config.fireRadius,
      });
      this.interactiveElements.push(barrel);
      this.interactiveGroup.add(barrel);
    }

    // Générateurs (créés avant les switches pour le linking)
    const generatorMap = new Map<string, Generator>();
    for (const config of this.levelData.generators) {
      const generator = new Generator(this.scene, {
        x: config.x,
        y: config.y,
        linkedZoneIds: config.linkedZoneIds,
        defaultActive: config.defaultActive,
      });
      // Utiliser l'ID Tiled comme ID du générateur
      (generator as { id: string }).id = config.id;
      generatorMap.set(config.id, generator);
      this.interactiveElements.push(generator);
      this.interactiveGroup.add(generator);
    }

    // Switches
    for (const config of this.levelData.switches) {
      const switchObj = new Switch(this.scene, {
        x: config.x,
        y: config.y,
        linkedTargetIds: config.linkedTargetIds,
        defaultState: config.defaultState,
      });
      // Utiliser l'ID Tiled
      (switchObj as { id: string }).id = config.id;
      this.interactiveElements.push(switchObj);
      this.interactiveGroup.add(switchObj);
    }

    // Pièges à flammes
    for (const config of this.levelData.flameTraps) {
      const trap = new FlameTrap(this.scene, {
        x: config.x,
        y: config.y,
        direction: config.direction,
        linkedSwitchId: config.linkedSwitchId,
        flameLength: config.flameLength,
        flameDuration: config.flameDuration,
        damagePerSecond: config.damagePerSecond,
      });
      // Utiliser l'ID Tiled
      (trap as { id: string }).id = config.id;
      this.interactiveElements.push(trap);
      this.interactiveGroup.add(trap);
    }

    // Pièges à lames
    for (const config of this.levelData.bladeTraps) {
      const trap = new BladeTrap(this.scene, {
        x: config.x,
        y: config.y,
        alwaysActive: config.alwaysActive,
        damagePerHit: config.damage,
      });
      this.interactiveElements.push(trap);
      this.interactiveGroup.add(trap);
    }
  }

  // ===========================================================================
  // NOUVEAUX ÉLÉMENTS DE GAMEPLAY
  // ===========================================================================

  /**
   * Crée les checkpoints depuis les données Tiled
   */
  private createCheckpoints(): void {
    for (const config of this.levelData.checkpoints) {
      const checkpoint = new Checkpoint(this.scene, {
        x: config.x,
        y: config.y,
        id: config.id,
        radius: config.radius,
        isRespawnPoint: config.isRespawnPoint,
      });
      this.checkpoints.push(checkpoint);
    }
  }

  /**
   * Crée les saferooms depuis les données Tiled
   */
  private createSaferooms(): void {
    for (const config of this.levelData.saferooms) {
      const saferoom = new Saferoom(this.scene, {
        x: config.x,
        y: config.y,
        width: config.width,
        height: config.height,
        healOnEnter: config.healOnEnter,
        healAmount: config.healAmount,
        clearZombies: config.clearZombies,
        clearRadius: config.clearRadius,
      });
      this.saferooms.push(saferoom);
    }
  }

  /**
   * Crée les téléporteurs depuis les données Tiled
   */
  private createTeleporters(): void {
    // Première passe: créer tous les téléporteurs
    const teleporterMap = new Map<string, Teleporter>();

    for (const config of this.levelData.teleporters) {
      const teleporter = new Teleporter(this.scene, {
        x: config.x,
        y: config.y,
        id: config.id,
        linkedTeleporterId: config.linkedTeleporterId,
        radius: config.radius,
        cooldown: config.cooldown,
        bidirectional: config.bidirectional,
      });
      this.teleporters.push(teleporter);
      teleporterMap.set(config.id, teleporter);
    }

    // Deuxième passe: lier les téléporteurs entre eux
    for (const config of this.levelData.teleporters) {
      if (config.linkedTeleporterId) {
        const source = teleporterMap.get(config.id);
        const target = teleporterMap.get(config.linkedTeleporterId);
        if (source && target) {
          source.linkTo(target);
        }
      }
    }
  }

  /**
   * Crée les marqueurs d'objectifs depuis les données Tiled
   */
  private createObjectiveMarkers(): void {
    for (const config of this.levelData.objectiveMarkers) {
      const marker = new ObjectiveMarker(this.scene, {
        x: config.x,
        y: config.y,
        objectiveId: config.id,
        type: config.type,
        label: config.label,
        radius: config.radius,
        color: config.color,
        showOnMinimap: config.showOnMinimap,
        pulseEffect: config.pulseEffect,
        arrowIndicator: config.arrowIndicator,
      });
      this.objectiveMarkers.push(marker);
    }
  }

  /**
   * Crée les zones à défendre depuis les données Tiled
   */
  private createDefendZones(): void {
    for (const config of this.levelData.defendZones) {
      const zone = new DefendZone(this.scene, {
        x: config.x,
        y: config.y,
        id: config.id,
        radius: config.radius,
        duration: config.duration,
        zombieWaves: config.zombieWaves,
        zombiesPerWave: config.zombiesPerWave,
        waveInterval: config.waveInterval,
        activateOnEnter: config.activateOnEnter,
        requiredStayTime: config.requiredStayTime,
      });
      this.defendZones.push(zone);
    }
  }

  /**
   * Crée les portes automatiques depuis les données Tiled
   */
  private createAutoDoors(): void {
    for (const config of this.levelData.autoDoors) {
      const door = new AutoDoor(this.scene, {
        x: config.x,
        y: config.y,
        id: config.id,
        width: config.width,
        height: config.height,
        openDirection: config.openDirection,
        openDistance: config.openDistance,
        triggerRadius: config.triggerRadius,
        openSpeed: config.openSpeed,
        closeDelay: config.closeDelay,
        stayOpen: config.stayOpen,
        requiresKey: config.requiresKey,
        keyId: config.keyId,
        blocksZombies: config.blocksZombies,
        blocksProjectiles: config.blocksProjectiles,
      });
      this.autoDoors.push(door);
    }
  }

  // ===========================================================================
  // GETTERS
  // ===========================================================================

  /**
   * Retourne la position de spawn du joueur
   */
  public getPlayerSpawn(): PlayerSpawnConfig {
    return this.playerSpawn;
  }

  /**
   * Retourne les données du niveau Tiled
   */
  public getLevelData(): TiledLevelData {
    return this.levelData;
  }

  /**
   * Retourne le tilemap layer des murs (pour collisions Phaser)
   */
  public getWallsLayer(): Phaser.Tilemaps.TilemapLayer | null {
    return this.wallsLayer;
  }

  /**
   * Retourne le groupe de murs (statiques)
   */
  public getWalls(): Phaser.Physics.Arcade.StaticGroup {
    return this.walls;
  }

  /**
   * Retourne le groupe de covers pour les collisions
   */
  public getCoverGroup(): Phaser.GameObjects.Group {
    return this.coverGroup;
  }

  /**
   * Retourne toutes les portes
   */
  public getDoors(): Door[] {
    return this.doors;
  }

  /**
   * Retourne les portes actives (non barricadées)
   */
  public getActiveDoors(): Door[] {
    return this.doors.filter((door) => door.isActive() && !door.hasBarricade());
  }

  /**
   * Retourne les portes pouvant spawner (actives ou détruites, non barricadées)
   */
  public getSpawnableDoors(): Door[] {
    return this.doors.filter((door) => door.canSpawn());
  }

  /**
   * Active un nombre spécifique de portes aléatoirement
   */
  public activateRandomDoors(count: number): void {
    const inactiveDoors = this.doors.filter((door) => !door.isActive());
    const toActivate = Math.min(count, inactiveDoors.length);

    const shuffled = Phaser.Utils.Array.Shuffle([...inactiveDoors]);
    for (let i = 0; i < toActivate; i++) {
      shuffled[i].activate();
    }
  }

  /**
   * Désactive toutes les portes
   */
  public deactivateAllDoors(): void {
    for (const door of this.doors) {
      door.deactivate();
    }
  }

  /**
   * Retourne les données d'obstacles pour le pathfinding
   */
  public getObstacles(): ObstacleData[] {
    return this.obstacles;
  }

  /**
   * Retourne toutes les couvertures
   */
  public getCovers(): Cover[] {
    return this.covers;
  }

  /**
   * Retourne les couvertures actives (non détruites)
   */
  public getActiveCovers(): Cover[] {
    return this.covers.filter((cover) => !cover.isDestroyed());
  }

  /**
   * Retourne la couverture à une position donnée
   */
  public getCoverAt(x: number, y: number, radius: number = 0): Cover | null {
    for (const cover of this.covers) {
      if (cover.isDestroyed()) continue;

      const data = cover.getCoverData();
      const halfWidth = data.width / 2 + radius;
      const halfHeight = data.height / 2 + radius;

      if (
        x >= data.x - halfWidth &&
        x <= data.x + halfWidth &&
        y >= data.y - halfHeight &&
        y <= data.y + halfHeight
      ) {
        return cover;
      }
    }
    return null;
  }

  /**
   * Retourne toutes les couvertures destructibles
   */
  public getDestructibleCovers(): Cover[] {
    return this.covers.filter((cover) => cover.destructible && !cover.isDestroyed());
  }

  // ===========================================================================
  // TERRAIN ZONES
  // ===========================================================================

  /**
   * Retourne le groupe de zones de terrain pour les collisions
   */
  public getTerrainZoneGroup(): Phaser.GameObjects.Group {
    return this.terrainZoneGroup;
  }

  /**
   * Retourne toutes les zones de terrain
   */
  public getTerrainZones(): TerrainZone[] {
    return this.terrainZones;
  }

  /**
   * Retourne les zones de terrain actives
   */
  public getActiveTerrainZones(): TerrainZone[] {
    return this.terrainZones.filter((zone) => zone.isActive());
  }

  /**
   * Retourne les zones de terrain à une position donnée
   */
  public getTerrainZonesAt(x: number, y: number): TerrainZone[] {
    const zonesAtPosition: TerrainZone[] = [];

    for (const zone of this.terrainZones) {
      if (!zone.isActive()) continue;

      const distance = Phaser.Math.Distance.Between(x, y, zone.x, zone.y);
      if (distance <= zone.getRadius()) {
        zonesAtPosition.push(zone);
      }
    }

    return zonesAtPosition;
  }

  /**
   * Retourne les zones qui conduisent l'électricité (pour TeslaCannon)
   */
  public getConductiveZones(): TerrainZone[] {
    return this.terrainZones.filter((zone) => zone.isActive() && zone.conductElectricity);
  }

  /**
   * Retourne les zones de terrain d'un type spécifique
   */
  public getTerrainZonesByType(type: TerrainType): TerrainZone[] {
    return this.terrainZones.filter((zone) => zone.isActive() && zone.terrainType === type);
  }

  /**
   * Ajoute une zone de terrain existante (créée ailleurs, ex: FireZone, AcidZone)
   */
  public addTerrainZone(zone: TerrainZone): void {
    this.terrainZones.push(zone);
    this.terrainZoneGroup.add(zone);
  }

  /**
   * Crée une zone de feu (utilisé par les pièges, lance-flammes, etc.)
   */
  public createFireZone(x: number, y: number, duration?: number, radius?: number): FireZone {
    const fire = new FireZone(this.scene, { x, y, duration, radius });
    this.terrainZones.push(fire);
    this.terrainZoneGroup.add(fire);
    return fire;
  }

  // ===========================================================================
  // INTERACTIVE ELEMENTS
  // ===========================================================================

  /**
   * Retourne le groupe d'éléments interactifs
   */
  public getInteractiveGroup(): Phaser.GameObjects.Group {
    return this.interactiveGroup;
  }

  /**
   * Retourne tous les éléments interactifs
   */
  public getInteractiveElements(): Interactive[] {
    return this.interactiveElements;
  }

  /**
   * Retourne les éléments interactifs actifs (non détruits)
   */
  public getActiveInteractiveElements(): Interactive[] {
    return this.interactiveElements.filter((elem) => !elem.isDestroyed());
  }

  /**
   * Retourne l'élément interactif à une position donnée
   */
  public getInteractiveAt(x: number, y: number, radius: number = 50): Interactive | null {
    for (const elem of this.interactiveElements) {
      if (elem.isDestroyed()) continue;

      const distance = Phaser.Math.Distance.Between(x, y, elem.x, elem.y);
      if (distance <= radius) {
        return elem;
      }
    }
    return null;
  }

  /**
   * Retourne les éléments interactifs interactables par le joueur
   */
  public getInteractableElements(): Interactive[] {
    return this.interactiveElements.filter((elem) => elem.isInteractable());
  }

  // ===========================================================================
  // GETTERS - NOUVEAUX ÉLÉMENTS
  // ===========================================================================

  /**
   * Retourne tous les checkpoints
   */
  public getCheckpoints(): Checkpoint[] {
    return this.checkpoints;
  }

  /**
   * Retourne les checkpoints activés
   */
  public getActivatedCheckpoints(): Checkpoint[] {
    return this.checkpoints.filter((cp) => cp.isActivated());
  }

  /**
   * Retourne le dernier checkpoint activé (pour respawn)
   */
  public getLastRespawnPoint(): Checkpoint | null {
    const respawnPoints = this.checkpoints.filter((cp) => cp.canRespawn());
    return respawnPoints.length > 0 ? respawnPoints[respawnPoints.length - 1] : null;
  }

  /**
   * Retourne toutes les saferooms
   */
  public getSaferooms(): Saferoom[] {
    return this.saferooms;
  }

  /**
   * Vérifie si le joueur est dans une saferoom
   */
  public isPlayerInSaferoom(): boolean {
    return this.saferooms.some((sr) => sr.isPlayerInside());
  }

  /**
   * Retourne tous les téléporteurs
   */
  public getTeleporters(): Teleporter[] {
    return this.teleporters;
  }

  /**
   * Retourne un téléporteur par son ID
   */
  public getTeleporterById(id: string): Teleporter | null {
    return this.teleporters.find((t) => t.id === id) ?? null;
  }

  /**
   * Retourne tous les marqueurs d'objectifs
   */
  public getObjectiveMarkers(): ObjectiveMarker[] {
    return this.objectiveMarkers;
  }

  /**
   * Retourne les marqueurs d'objectifs actifs
   */
  public getActiveObjectiveMarkers(): ObjectiveMarker[] {
    return this.objectiveMarkers.filter((m) => m.isObjectiveActive() && !m.isObjectiveCompleted());
  }

  /**
   * Retourne un marqueur d'objectif par son ID
   */
  public getObjectiveMarkerById(id: string): ObjectiveMarker | null {
    return this.objectiveMarkers.find((m) => m.objectiveId === id) ?? null;
  }

  /**
   * Retourne toutes les zones à défendre
   */
  public getDefendZones(): DefendZone[] {
    return this.defendZones;
  }

  /**
   * Retourne les zones à défendre actives
   */
  public getActiveDefendZones(): DefendZone[] {
    return this.defendZones.filter((z) => z.isZoneActive());
  }

  /**
   * Retourne toutes les portes automatiques
   */
  public getAutoDoors(): AutoDoor[] {
    return this.autoDoors;
  }

  /**
   * Retourne une porte automatique par son ID
   */
  public getAutoDoorById(id: string): AutoDoor | null {
    return this.autoDoors.find((d) => d.id === id) ?? null;
  }

  /**
   * Retourne les colliders des portes automatiques fermées (pour collisions)
   */
  public getClosedAutoDoorColliders(): Phaser.GameObjects.Rectangle[] {
    return this.autoDoors.filter((d) => !d.isDoorOpen()).map((d) => d.getCollider());
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  /**
   * Gère la destruction d'une couverture
   */
  private onCoverDestroyed(event: {
    cover: Cover;
    type: CoverType;
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    // Retirer de la liste des covers
    const index = this.covers.indexOf(event.cover);
    if (index !== -1) {
      this.covers.splice(index, 1);
    }

    // Retirer de la liste des obstacles
    const obstacleIndex = this.obstacles.findIndex(
      (obs) =>
        obs.x === event.x &&
        obs.y === event.y &&
        obs.width === event.width &&
        obs.height === event.height
    );
    if (obstacleIndex !== -1) {
      this.obstacles.splice(obstacleIndex, 1);
    }

    // Émettre un événement pour notifier le pathfinder
    this.scene.events.emit('arena:obstacleRemoved', {
      x: event.x,
      y: event.y,
      width: event.width,
      height: event.height,
    });
  }

  /**
   * Gère la destruction d'une zone de terrain
   */
  private onTerrainZoneDestroyed(event: { zone: TerrainZone }): void {
    const index = this.terrainZones.indexOf(event.zone);
    if (index !== -1) {
      this.terrainZones.splice(index, 1);
    }
  }

  /**
   * Gère la destruction d'un élément interactif
   */
  private onInteractiveDestroyed(event: { elementId: string }): void {
    const index = this.interactiveElements.findIndex((elem) => elem.id === event.elementId);
    if (index !== -1) {
      this.interactiveElements.splice(index, 1);
    }
  }

  // ===========================================================================
  // UPDATE & DESTROY
  // ===========================================================================

  /**
   * Met à jour les zones de terrain, éléments interactifs et nouveaux éléments
   */
  public update(delta: number = 16): void {
    for (const zone of this.terrainZones) {
      if (zone.isActive()) {
        zone.update();
      }
    }

    for (const elem of this.interactiveElements) {
      if (!elem.isDestroyed()) {
        elem.update();
      }
    }

    // Mettre à jour les nouveaux éléments de gameplay
    for (const checkpoint of this.checkpoints) {
      checkpoint.update();
    }

    for (const saferoom of this.saferooms) {
      saferoom.update(delta);
    }

    for (const teleporter of this.teleporters) {
      teleporter.update(delta);
    }

    for (const marker of this.objectiveMarkers) {
      marker.update();
    }

    for (const zone of this.defendZones) {
      zone.update(delta);
    }

    for (const door of this.autoDoors) {
      door.update(delta);
    }
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.scene.events.off('cover:destroy', this.onCoverDestroyed, this);
    this.scene.events.off('terrain:destroy', this.onTerrainZoneDestroyed, this);
    this.scene.events.off('interactive:destroy', this.onInteractiveDestroyed, this);

    for (const cover of this.covers) {
      cover.destroy();
    }
    this.covers = [];

    for (const zone of this.terrainZones) {
      zone.destroy();
    }
    this.terrainZones = [];

    for (const elem of this.interactiveElements) {
      elem.destroy();
    }
    this.interactiveElements = [];

    for (const door of this.doors) {
      door.destroy();
    }
    this.doors = [];

    // Détruire les nouveaux éléments de gameplay
    for (const checkpoint of this.checkpoints) {
      checkpoint.destroy();
    }
    this.checkpoints = [];

    for (const saferoom of this.saferooms) {
      saferoom.destroy();
    }
    this.saferooms = [];

    for (const teleporter of this.teleporters) {
      teleporter.destroy();
    }
    this.teleporters = [];

    for (const marker of this.objectiveMarkers) {
      marker.destroy();
    }
    this.objectiveMarkers = [];

    for (const zone of this.defendZones) {
      zone.destroy();
    }
    this.defendZones = [];

    for (const door of this.autoDoors) {
      door.destroy();
    }
    this.autoDoors = [];

    // Détruire le tilemap
    if (this.tilemap) {
      this.tilemap.destroy();
      this.tilemap = null;
    }
  }
}
