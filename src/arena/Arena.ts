import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '@config/constants';
import type { GameScene } from '@scenes/GameScene';
import { Door, type DoorConfig } from './Door';
import { Cover, CoverType, type CoverConfig } from './Cover';
import { TerrainZone, TerrainType } from './TerrainZone';
import { PuddleZone, type PuddleConfig } from './PuddleZone';
import { DebrisZone, type DebrisConfig } from './DebrisZone';
import { ElectricZone, type ElectricZoneConfig } from './ElectricZone';
import { FireZone, type FireZoneConfig } from './FireZone';
import { Interactive } from './Interactive';
import { BarrelExplosive, type BarrelExplosiveConfig } from './BarrelExplosive';
import { BarrelFire, type BarrelFireConfig } from './BarrelFire';
import { Switch, type SwitchConfig } from './Switch';
import { Generator, type GeneratorConfig } from './Generator';
import { FlameTrap, FlameDirection, type FlameTrapConfig } from './FlameTrap';
import { BladeTrap, type BladeTrapConfig } from './BladeTrap';

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
 * Gestionnaire de l'arène de jeu
 * Crée et gère le terrain, les murs, les obstacles et les portes
 */
export class Arena {
  private scene: GameScene;
  private walls: Phaser.Physics.Arcade.StaticGroup;
  private coverGroup: Phaser.GameObjects.Group;
  private terrainZoneGroup: Phaser.GameObjects.Group;
  private interactiveGroup: Phaser.GameObjects.Group;
  private floor: Phaser.GameObjects.TileSprite;
  private doors: Door[] = [];
  private obstacles: ObstacleData[] = [];
  private covers: Cover[] = [];
  private terrainZones: TerrainZone[] = [];
  private interactiveElements: Interactive[] = [];

  constructor(scene: GameScene) {
    this.scene = scene;

    // Créer le sol
    this.floor = this.createFloor();

    // Créer les murs
    this.walls = scene.physics.add.staticGroup();
    this.createWalls();
    this.createDoors();

    // Créer le groupe pour les covers (séparé des murs statiques)
    this.coverGroup = scene.add.group();
    this.createCovers();

    // Créer le groupe pour les terrain zones
    this.terrainZoneGroup = scene.add.group();
    this.createTerrainZones();

    // Créer le groupe pour les éléments interactifs
    this.interactiveGroup = scene.add.group();
    this.createInteractiveElements();

    // Écouter les événements de destruction de covers
    this.scene.events.on('cover:destroy', this.onCoverDestroyed, this);

    // Écouter les événements de destruction de terrain zones
    this.scene.events.on('terrain:destroy', this.onTerrainZoneDestroyed, this);

    // Écouter les événements de destruction d'éléments interactifs
    this.scene.events.on('interactive:destroy', this.onInteractiveDestroyed, this);
  }

  /**
   * Crée le sol de l'arène
   */
  private createFloor(): Phaser.GameObjects.TileSprite {
    const floor = this.scene.add.tileSprite(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      'tile_floor'
    );
    floor.setDepth(-1);
    return floor;
  }

  /**
   * Crée les murs périphériques avec des ouvertures pour les portes
   */
  private createWalls(): void {
    const wallThickness = TILE_SIZE;
    const doorWidth = TILE_SIZE * 2;

    // Positions des portes sur chaque mur
    const topDoorPositions = [GAME_WIDTH * 0.25, GAME_WIDTH * 0.75];
    const bottomDoorPositions = [GAME_WIDTH * 0.25, GAME_WIDTH * 0.75];
    const leftDoorPositions = [GAME_HEIGHT * 0.33, GAME_HEIGHT * 0.67];
    const rightDoorPositions = [GAME_HEIGHT * 0.33, GAME_HEIGHT * 0.67];

    // Mur du haut (avec ouvertures pour les portes)
    this.createWallWithGaps(
      wallThickness / 2,
      GAME_WIDTH,
      wallThickness,
      'horizontal',
      topDoorPositions,
      doorWidth
    );

    // Mur du bas (avec ouvertures pour les portes)
    this.createWallWithGaps(
      GAME_HEIGHT - wallThickness / 2,
      GAME_WIDTH,
      wallThickness,
      'horizontal',
      bottomDoorPositions,
      doorWidth
    );

    // Mur de gauche (avec ouvertures pour les portes)
    this.createWallWithGaps(
      wallThickness / 2,
      GAME_HEIGHT,
      wallThickness,
      'vertical',
      leftDoorPositions,
      doorWidth
    );

    // Mur de droite (avec ouvertures pour les portes)
    this.createWallWithGaps(
      GAME_WIDTH - wallThickness / 2,
      GAME_HEIGHT,
      wallThickness,
      'vertical',
      rightDoorPositions,
      doorWidth
    );
  }

  /**
   * Crée un mur avec des ouvertures pour les portes
   */
  private createWallWithGaps(
    position: number,
    length: number,
    thickness: number,
    orientation: 'horizontal' | 'vertical',
    gapPositions: number[],
    gapSize: number
  ): void {
    // Trier les positions des ouvertures
    const sortedGaps = [...gapPositions].sort((a, b) => a - b);

    let currentPos = 0;

    for (const gapPos of sortedGaps) {
      const gapStart = gapPos - gapSize / 2;
      const segmentLength = gapStart - currentPos;

      if (segmentLength > 0) {
        if (orientation === 'horizontal') {
          const segmentCenter = currentPos + segmentLength / 2;
          this.createWallSegment(segmentCenter, position, segmentLength, thickness);
        } else {
          const segmentCenter = currentPos + segmentLength / 2;
          this.createWallSegment(position, segmentCenter, thickness, segmentLength);
        }
      }

      currentPos = gapPos + gapSize / 2;
    }

    // Segment final après la dernière ouverture
    const finalLength = length - currentPos;
    if (finalLength > 0) {
      if (orientation === 'horizontal') {
        const segmentCenter = currentPos + finalLength / 2;
        this.createWallSegment(segmentCenter, position, finalLength, thickness);
      } else {
        const segmentCenter = currentPos + finalLength / 2;
        this.createWallSegment(position, segmentCenter, thickness, finalLength);
      }
    }
  }

  /**
   * Crée les portes aux emplacements prédéfinis
   */
  private createDoors(): void {
    const wallThickness = TILE_SIZE;

    const doorConfigs: DoorConfig[] = [
      // Portes du haut
      { x: GAME_WIDTH * 0.25, y: wallThickness / 2, side: 'top' },
      { x: GAME_WIDTH * 0.75, y: wallThickness / 2, side: 'top' },
      // Portes du bas
      { x: GAME_WIDTH * 0.25, y: GAME_HEIGHT - wallThickness / 2, side: 'bottom' },
      { x: GAME_WIDTH * 0.75, y: GAME_HEIGHT - wallThickness / 2, side: 'bottom' },
      // Portes de gauche
      { x: wallThickness / 2, y: GAME_HEIGHT * 0.33, side: 'left' },
      { x: wallThickness / 2, y: GAME_HEIGHT * 0.67, side: 'left' },
      // Portes de droite
      { x: GAME_WIDTH - wallThickness / 2, y: GAME_HEIGHT * 0.33, side: 'right' },
      { x: GAME_WIDTH - wallThickness / 2, y: GAME_HEIGHT * 0.67, side: 'right' },
    ];

    for (const config of doorConfigs) {
      const door = new Door(this.scene, config);
      this.doors.push(door);
    }
  }

  /**
   * Crée un segment de mur
   * @param trackAsObstacle - Si true, ajoute l'obstacle à la liste pour le pathfinding
   */
  private createWallSegment(
    x: number,
    y: number,
    width: number,
    height: number,
    trackAsObstacle: boolean = false
  ): Phaser.Physics.Arcade.Sprite {
    // Créer une texture pour ce segment de mur
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x7f8c8d);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(2, 0x5d6d7e);
    graphics.strokeRect(0, 0, width, height);

    const textureKey = `wall_${x}_${y}`;
    graphics.generateTexture(textureKey, width, height);
    graphics.destroy();

    const wall = this.walls.create(x, y, textureKey) as Phaser.Physics.Arcade.Sprite;
    wall.setImmovable(true);
    wall.refreshBody();

    // Enregistrer comme obstacle pour le pathfinding
    if (trackAsObstacle) {
      this.obstacles.push({ x, y, width, height });
    }

    return wall;
  }

  /**
   * Crée les couvertures dans l'arène
   */
  private createCovers(): void {
    // Piliers indestructibles aux coins et au centre
    const pillarPositions = [
      { x: 200, y: 200 },
      { x: GAME_WIDTH - 200, y: 200 },
      { x: 200, y: GAME_HEIGHT - 200 },
      { x: GAME_WIDTH - 200, y: GAME_HEIGHT - 200 },
      { x: GAME_WIDTH / 2, y: 180 },
      { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 180 },
    ];

    for (const pos of pillarPositions) {
      this.createCover({ type: CoverType.PILLAR, x: pos.x, y: pos.y });
    }

    // Murets destructibles (écartés du centre)
    this.createCover({ type: CoverType.HALF_WALL, x: 350, y: GAME_HEIGHT / 2 });
    this.createCover({ type: CoverType.HALF_WALL, x: GAME_WIDTH - 350, y: GAME_HEIGHT / 2 });

    // Tables (écartées pour éviter chevauchement)
    this.createCover({ type: CoverType.TABLE, x: GAME_WIDTH / 2 - 100, y: GAME_HEIGHT / 2 - 80 });
    this.createCover({ type: CoverType.TABLE, x: GAME_WIDTH / 2 + 100, y: GAME_HEIGHT / 2 - 80 });

    // Caisses (positionnées différemment)
    this.createCover({ type: CoverType.CRATE, x: 280, y: GAME_HEIGHT / 2 - 120 });
    this.createCover({ type: CoverType.CRATE, x: GAME_WIDTH - 280, y: GAME_HEIGHT / 2 + 120 });

    // Étagère (en bas du centre)
    this.createCover({ type: CoverType.SHELF, x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 + 120 });
  }

  /**
   * Crée une couverture et l'ajoute à la liste
   */
  public createCover(config: CoverConfig): Cover {
    const cover = new Cover(this.scene, config);
    this.covers.push(cover);

    // Ajouter au groupe des covers (pour collisions séparées)
    this.coverGroup.add(cover);

    // Enregistrer comme obstacle pour le pathfinding
    const data = cover.getCoverData();
    this.obstacles.push({
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
    });

    return cover;
  }

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
   * Retourne le groupe de murs pour les collisions
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
   * Retourne le sol
   */
  public getFloor(): Phaser.GameObjects.TileSprite {
    return this.floor;
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
   * Utilisé par le Pathfinder pour construire sa grille de navigation
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

  /**
   * Crée les zones de terrain dans l'arène
   */
  private createTerrainZones(): void {
    // Quelques flaques d'eau près des portes
    this.createPuddle({ x: GAME_WIDTH * 0.25, y: 100, isBlood: false });
    this.createPuddle({ x: GAME_WIDTH * 0.75, y: GAME_HEIGHT - 100, isBlood: false });

    // Quelques flaques de sang (près des zones de combat)
    this.createPuddle({ x: 150, y: GAME_HEIGHT * 0.33, isBlood: true });
    this.createPuddle({ x: GAME_WIDTH - 150, y: GAME_HEIGHT * 0.67, isBlood: true });

    // Zones de gravats
    this.createDebrisZone({ x: 300, y: 300 });
    this.createDebrisZone({ x: GAME_WIDTH - 300, y: GAME_HEIGHT - 300 });

    // Zone électrique (désactivée par défaut)
    this.createElectricZone({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 + 50, active: false });
  }

  /**
   * Crée une flaque (eau ou sang)
   */
  public createPuddle(config: PuddleConfig): PuddleZone {
    const puddle = new PuddleZone(this.scene, config);
    this.terrainZones.push(puddle);
    this.terrainZoneGroup.add(puddle);
    return puddle;
  }

  /**
   * Crée une zone de gravats
   */
  public createDebrisZone(config: DebrisConfig): DebrisZone {
    const debris = new DebrisZone(this.scene, config);
    this.terrainZones.push(debris);
    this.terrainZoneGroup.add(debris);
    return debris;
  }

  /**
   * Crée une zone électrique
   */
  public createElectricZone(config: ElectricZoneConfig): ElectricZone {
    const electric = new ElectricZone(this.scene, config);
    this.terrainZones.push(electric);
    this.terrainZoneGroup.add(electric);
    return electric;
  }

  /**
   * Crée une zone de feu (utilisé par les pièges de porte, lance-flammes, etc.)
   * @param x Position X
   * @param y Position Y
   * @param duration Durée de la zone en ms (optionnel)
   * @param radius Rayon de la zone (optionnel)
   */
  public createFireZone(x: number, y: number, duration?: number, radius?: number): FireZone {
    const config: FireZoneConfig = { x, y };
    if (duration !== undefined) config.duration = duration;
    if (radius !== undefined) config.radius = radius;

    const fire = new FireZone(this.scene, config);
    this.terrainZones.push(fire);
    this.terrainZoneGroup.add(fire);
    return fire;
  }

  /**
   * Ajoute une zone de terrain existante (créée ailleurs, ex: FireZone, AcidZone)
   */
  public addTerrainZone(zone: TerrainZone): void {
    this.terrainZones.push(zone);
    this.terrainZoneGroup.add(zone);
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
    return this.terrainZones.filter(
      (zone) => zone.isActive() && zone.conductElectricity
    );
  }

  /**
   * Retourne les zones de terrain d'un type spécifique
   */
  public getTerrainZonesByType(type: TerrainType): TerrainZone[] {
    return this.terrainZones.filter(
      (zone) => zone.isActive() && zone.terrainType === type
    );
  }

  // ===========================================================================
  // ÉLÉMENTS INTERACTIFS
  // ===========================================================================

  /**
   * Crée les éléments interactifs dans l'arène
   */
  private createInteractiveElements(): void {
    // Barils explosifs près des portes (risque/récompense)
    this.createBarrelExplosive({ x: GAME_WIDTH * 0.25 + 50, y: 80 });
    this.createBarrelExplosive({ x: GAME_WIDTH - 150, y: GAME_HEIGHT * 0.33 - 30 });

    // Baril incendiaire
    this.createBarrelFire({ x: 150, y: GAME_HEIGHT * 0.67 + 30 });

    // Générateur au centre (contrôle la zone électrique)
    const generator = this.createGenerator({
      x: GAME_WIDTH / 2 + 80,
      y: GAME_HEIGHT / 2 + 50,
      defaultActive: false,
      linkedZoneIds: ['electric_zone_center'],
    });

    // Mettre à jour la zone électrique existante pour la lier au générateur
    const electricZone = this.terrainZones.find(
      (z) => z.terrainType === TerrainType.ELECTRIC
    ) as ElectricZone | undefined;
    if (electricZone) {
      // La zone écoute déjà l'événement generator:toggle
    }

    // Interrupteur pour activer le générateur
    this.createSwitch({
      x: GAME_WIDTH / 2 - 100,
      y: GAME_HEIGHT / 2 - 100,
      linkedTargetIds: [generator.id],
      defaultState: false,
    });

    // Piège à flammes (lié à un switch séparé)
    const flameTrapSwitch = this.createSwitch({
      x: 100,
      y: 100,
      defaultState: false,
    });

    this.createFlameTrap({
      x: 200,
      y: 150,
      direction: FlameDirection.RIGHT,
      linkedSwitchId: flameTrapSwitch.id,
    });

    // Piège à lames (toujours actif)
    this.createBladeTrap({
      x: GAME_WIDTH - 200,
      y: GAME_HEIGHT - 200,
      alwaysActive: true,
    });
  }

  /**
   * Crée un baril explosif
   */
  public createBarrelExplosive(config: BarrelExplosiveConfig): BarrelExplosive {
    const barrel = new BarrelExplosive(this.scene, config);
    this.interactiveElements.push(barrel);
    this.interactiveGroup.add(barrel);
    return barrel;
  }

  /**
   * Crée un baril incendiaire
   */
  public createBarrelFire(config: BarrelFireConfig): BarrelFire {
    const barrel = new BarrelFire(this.scene, config);
    this.interactiveElements.push(barrel);
    this.interactiveGroup.add(barrel);
    return barrel;
  }

  /**
   * Crée un interrupteur
   */
  public createSwitch(config: SwitchConfig): Switch {
    const switchObj = new Switch(this.scene, config);
    this.interactiveElements.push(switchObj);
    this.interactiveGroup.add(switchObj);
    return switchObj;
  }

  /**
   * Crée un générateur
   */
  public createGenerator(config: GeneratorConfig): Generator {
    const generator = new Generator(this.scene, config);
    this.interactiveElements.push(generator);
    this.interactiveGroup.add(generator);
    return generator;
  }

  /**
   * Crée un piège à flammes
   */
  public createFlameTrap(config: FlameTrapConfig): FlameTrap {
    const trap = new FlameTrap(this.scene, config);
    this.interactiveElements.push(trap);
    this.interactiveGroup.add(trap);
    return trap;
  }

  /**
   * Crée un piège à lames
   */
  public createBladeTrap(config: BladeTrapConfig): BladeTrap {
    const trap = new BladeTrap(this.scene, config);
    this.interactiveElements.push(trap);
    this.interactiveGroup.add(trap);
    return trap;
  }

  /**
   * Gère la destruction d'un élément interactif
   */
  private onInteractiveDestroyed(event: { elementId: string }): void {
    const index = this.interactiveElements.findIndex(
      (elem) => elem.id === event.elementId
    );
    if (index !== -1) {
      this.interactiveElements.splice(index, 1);
    }
  }

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

  /**
   * Met à jour les zones de terrain et éléments interactifs
   * Doit être appelé depuis GameScene.update()
   */
  public update(): void {
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
  }
}
