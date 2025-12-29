import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import { Player } from '@entities/Player';
import { Arena } from '@arena/Arena';
import { BulletPool } from '@entities/projectiles/BulletPool';

/**
 * Scène principale du jeu
 * Gère le gameplay, les entités et les systèmes
 */
export class GameScene extends Phaser.Scene {
  public player!: Player;
  public arena!: Arena;
  public bulletPool!: BulletPool;
  public walls!: Phaser.Physics.Arcade.StaticGroup;

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

    // Créer le pool de projectiles
    this.bulletPool = new BulletPool(this);

    // Créer le joueur au centre
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    this.player = new Player(this, centerX, centerY);

    // Configurer les collisions
    this.setupCollisions();

    // Lancer la scène HUD en parallèle
    this.scene.launch(SCENE_KEYS.HUD, { gameScene: this });

    // Configuration de la caméra
    this.cameras.main.setBackgroundColor('#1a1a2e');
  }

  /**
   * Met à jour la logique de jeu
   */
  update(time: number, delta: number): void {
    this.player.update(time, delta);
    this.bulletPool.update();
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
  }
}
