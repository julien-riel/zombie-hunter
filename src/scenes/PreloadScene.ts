import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, TILEMAP_KEYS } from '@config/constants';
import { ASSET_KEYS } from '@config/assets.manifest';

/**
 * Scène de préchargement des assets
 * Affiche une barre de progression et charge tous les assets
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  /**
   * Charge tous les assets du jeu
   */
  preload(): void {
    this.createLoadingBar();
    this.loadTilemaps();
    this.generatePlaceholderAssets();
  }

  /**
   * Transition vers le menu principal
   */
  create(): void {
    // Phase 8.1: Transition vers le menu principal
    this.scene.start(SCENE_KEYS.MENU);
  }

  /**
   * Crée une barre de progression visuelle
   */
  private createLoadingBar(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Fond de la barre
    const progressBg = this.add.rectangle(centerX, centerY, 400, 30, 0x222222);
    progressBg.setStrokeStyle(2, 0x444444);

    // Barre de progression
    const progressBar = this.add.rectangle(centerX - 198, centerY, 0, 26, 0x00ff00);
    progressBar.setOrigin(0, 0.5);

    // Texte de chargement
    const loadingText = this.add.text(centerX, centerY - 50, 'Chargement...', {
      fontSize: '24px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5);

    // Texte de pourcentage
    const percentText = this.add.text(centerX, centerY + 50, '0%', {
      fontSize: '18px',
      color: '#ffffff',
    });
    percentText.setOrigin(0.5);

    // Événements de progression
    this.load.on('progress', (value: number) => {
      progressBar.width = 396 * value;
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      loadingText.setText('Prêt!');
    });
  }

  /**
   * Charge les tilemaps Tiled (tileset et maps JSON)
   */
  private loadTilemaps(): void {
    const basePath = 'assets/tilemaps';

    // Charger l'image du tileset
    this.load.image(TILEMAP_KEYS.TILESET, `${basePath}/zombie_tileset.png`);

    // Charger les maps JSON
    this.load.tilemapTiledJSON(TILEMAP_KEYS.DEFAULT_ARENA, `${basePath}/default_arena.json`);
    this.load.tilemapTiledJSON(TILEMAP_KEYS.HOSPITAL, `${basePath}/hospital.json`);
    this.load.tilemapTiledJSON(TILEMAP_KEYS.HALL, `${basePath}/hall.json`);
    this.load.tilemapTiledJSON(TILEMAP_KEYS.WAREHOUSE, `${basePath}/warehouse.json`);
    this.load.tilemapTiledJSON(TILEMAP_KEYS.SUBWAY, `${basePath}/subway.json`);
    this.load.tilemapTiledJSON(TILEMAP_KEYS.LABORATORY, `${basePath}/laboratory.json`);
  }

  /**
   * Génère les textures placeholder pour le prototypage
   */
  private generatePlaceholderAssets(): void {
    // Joueur - carré bleu
    this.generateRectTexture(ASSET_KEYS.PLAYER, TILE_SIZE, TILE_SIZE, 0x3498db);

    // Zombies - différentes nuances de vert
    this.generateRectTexture(ASSET_KEYS.SHAMBLER, TILE_SIZE, TILE_SIZE, 0x27ae60);
    this.generateRectTexture(ASSET_KEYS.RUNNER, 28, 28, 0x2ecc71);
    this.generateRectTexture(ASSET_KEYS.CRAWLER, 24, 16, 0x1e8449);
    this.generateRectTexture(ASSET_KEYS.TANK, 48, 48, 0x145a32);
    this.generateRectTexture(ASSET_KEYS.SPITTER, TILE_SIZE, TILE_SIZE, 0x82e0aa);
    this.generateRectTexture(ASSET_KEYS.BOMBER, TILE_SIZE, TILE_SIZE, 0xf39c12);
    this.generateRectTexture(ASSET_KEYS.SCREAMER, TILE_SIZE, TILE_SIZE, 0x9b59b6);
    this.generateRectTexture(ASSET_KEYS.SPLITTER, TILE_SIZE, TILE_SIZE, 0x16a085);
    this.generateRectTexture(ASSET_KEYS.INVISIBLE, TILE_SIZE, TILE_SIZE, 0x7f8c8d, 0.3);
    this.generateRectTexture(ASSET_KEYS.NECROMANCER, TILE_SIZE, TILE_SIZE, 0x2c3e50);

    // Boss - plus grands
    this.generateRectTexture(ASSET_KEYS.ABOMINATION, 96, 96, 0x8b0000);
    this.generateRectTexture(ASSET_KEYS.PATIENT_ZERO, 48, 48, 0xc0392b);
    this.generateRectTexture(ASSET_KEYS.COLOSSUS, 128, 128, 0x5d6d7e);

    // Projectiles
    this.generateCircleTexture(ASSET_KEYS.BULLET, 4, 0xf1c40f);
    this.generateCircleTexture(ASSET_KEYS.PELLET, 3, 0xf39c12);
    this.generateCircleTexture(ASSET_KEYS.FLAME, 8, 0xe74c3c);
    this.generateCircleTexture(ASSET_KEYS.ACID, 6, 0x27ae60);

    // Tiles pour l'arène
    this.generateRectTexture('tile_floor', TILE_SIZE, TILE_SIZE, 0x2c3e50);
    this.generateRectTexture('tile_wall', TILE_SIZE, TILE_SIZE, 0x7f8c8d);
    this.generateRectTexture('tile_door', TILE_SIZE, TILE_SIZE, 0xc0392b);
    this.generateRectTexture('tile_door_inactive', TILE_SIZE, TILE_SIZE, 0x641e16);
  }

  /**
   * Génère une texture rectangulaire
   */
  private generateRectTexture(
    key: string,
    width: number,
    height: number,
    color: number,
    alpha: number = 1
  ): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(color, alpha);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(2, 0x000000, alpha);
    graphics.strokeRect(0, 0, width, height);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  /**
   * Génère une texture circulaire
   */
  private generateCircleTexture(key: string, radius: number, color: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillCircle(radius, radius, radius);
    graphics.generateTexture(key, radius * 2, radius * 2);
    graphics.destroy();
  }
}
