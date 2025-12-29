import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '@config/constants';
import type { GameScene } from '@scenes/GameScene';
import { Door, type DoorConfig } from './Door';
import { Cover, CoverType, type CoverConfig } from './Cover';

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
  private floor: Phaser.GameObjects.TileSprite;
  private doors: Door[] = [];
  private obstacles: ObstacleData[] = [];
  private covers: Cover[] = [];

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

    // Écouter les événements de destruction de covers
    this.scene.events.on('cover:destroy', this.onCoverDestroyed, this);
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
   * Retourne les portes actives
   */
  public getActiveDoors(): Door[] {
    return this.doors.filter((door) => door.isActive());
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
   * Nettoie les ressources
   */
  public destroy(): void {
    this.scene.events.off('cover:destroy', this.onCoverDestroyed, this);

    for (const cover of this.covers) {
      cover.destroy();
    }
    this.covers = [];

    for (const door of this.doors) {
      door.destroy();
    }
    this.doors = [];
  }
}
