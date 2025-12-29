import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '@config/constants';
import type { GameScene } from '@scenes/GameScene';

/**
 * Gestionnaire de l'arène de jeu
 * Crée et gère le terrain, les murs et les obstacles
 */
export class Arena {
  private scene: GameScene;
  private walls: Phaser.Physics.Arcade.StaticGroup;
  private floor: Phaser.GameObjects.TileSprite;

  constructor(scene: GameScene) {
    this.scene = scene;

    // Créer le sol
    this.floor = this.createFloor();

    // Créer les murs
    this.walls = scene.physics.add.staticGroup();
    this.createWalls();
    this.createObstacles();
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
   * Crée les murs périphériques
   */
  private createWalls(): void {
    const wallThickness = TILE_SIZE;

    // Mur du haut
    this.createWallSegment(GAME_WIDTH / 2, wallThickness / 2, GAME_WIDTH, wallThickness);

    // Mur du bas
    this.createWallSegment(
      GAME_WIDTH / 2,
      GAME_HEIGHT - wallThickness / 2,
      GAME_WIDTH,
      wallThickness
    );

    // Mur de gauche
    this.createWallSegment(wallThickness / 2, GAME_HEIGHT / 2, wallThickness, GAME_HEIGHT);

    // Mur de droite
    this.createWallSegment(
      GAME_WIDTH - wallThickness / 2,
      GAME_HEIGHT / 2,
      wallThickness,
      GAME_HEIGHT
    );
  }

  /**
   * Crée un segment de mur
   */
  private createWallSegment(
    x: number,
    y: number,
    width: number,
    height: number
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

    return wall;
  }

  /**
   * Crée des obstacles dans l'arène
   */
  private createObstacles(): void {
    // Colonnes/piliers (indestructibles)
    const pillarPositions = [
      { x: 200, y: 200 },
      { x: GAME_WIDTH - 200, y: 200 },
      { x: 200, y: GAME_HEIGHT - 200 },
      { x: GAME_WIDTH - 200, y: GAME_HEIGHT - 200 },
      { x: GAME_WIDTH / 2, y: 200 },
      { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 200 },
    ];

    pillarPositions.forEach((pos) => {
      this.createPillar(pos.x, pos.y);
    });

    // Murets horizontaux
    this.createWallSegment(400, GAME_HEIGHT / 2, TILE_SIZE * 3, TILE_SIZE);
    this.createWallSegment(GAME_WIDTH - 400, GAME_HEIGHT / 2, TILE_SIZE * 3, TILE_SIZE);
  }

  /**
   * Crée un pilier
   */
  private createPillar(x: number, y: number): void {
    const size = TILE_SIZE * 2;

    // Créer la texture du pilier
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x5d6d7e);
    graphics.fillRect(0, 0, size, size);
    graphics.lineStyle(3, 0x34495e);
    graphics.strokeRect(0, 0, size, size);

    const textureKey = `pillar_${x}_${y}`;
    graphics.generateTexture(textureKey, size, size);
    graphics.destroy();

    const pillar = this.walls.create(x, y, textureKey) as Phaser.Physics.Arcade.Sprite;
    pillar.setImmovable(true);
    pillar.refreshBody();
  }

  /**
   * Retourne le groupe de murs pour les collisions
   */
  public getWalls(): Phaser.Physics.Arcade.StaticGroup {
    return this.walls;
  }

  /**
   * Retourne le sol
   */
  public getFloor(): Phaser.GameObjects.TileSprite {
    return this.floor;
  }
}
