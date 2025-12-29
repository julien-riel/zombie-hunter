import Phaser from 'phaser';
import { ASSET_KEYS } from '@config/assets.manifest';
import type { GameScene } from '@scenes/GameScene';

/**
 * Pool de projectiles acides pour le Spitter
 * Gère les projectiles ennemis qui peuvent toucher le joueur
 */
export class AcidSpitPool {
  private scene: GameScene;
  private pool: Phaser.Physics.Arcade.Group;

  constructor(scene: GameScene) {
    this.scene = scene;
    this.pool = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 50,
      runChildUpdate: false,
    });

    // Pré-créer les projectiles
    this.prewarm(20);

    // Configurer les collisions avec le joueur
    this.setupPlayerCollision();
  }

  /**
   * Préchauffe le pool avec des projectiles inactifs
   */
  private prewarm(count: number): void {
    for (let i = 0; i < count; i++) {
      const spit = this.pool.create(
        -100,
        -100,
        ASSET_KEYS.ACID
      ) as Phaser.Physics.Arcade.Sprite;
      if (spit) {
        spit.setActive(false);
        spit.setVisible(false);
        spit.setData('damage', 0);
        // Teinte verte pour l'acide
        spit.setTint(0x00ff00);
      }
    }
  }

  /**
   * Configure la collision avec le joueur
   */
  private setupPlayerCollision(): void {
    const player = this.scene.getPlayer();
    if (player) {
      this.scene.physics.add.overlap(
        player,
        this.pool,
        this.handlePlayerCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );
    }
  }

  /**
   * Gère la collision avec le joueur
   */
  private handlePlayerCollision(
    _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    spitObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const spit = spitObj as Phaser.Physics.Arcade.Sprite;
    const player = this.scene.getPlayer();

    if (!spit.active || !player || !player.active) return;

    const damage = spit.getData('damage') || 0;
    player.takeDamage(damage);

    // Effet d'impact acide
    this.createAcidImpact(spit.x, spit.y);

    // Libérer le projectile
    this.release(spit);
  }

  /**
   * Crée un effet d'impact acide
   */
  private createAcidImpact(x: number, y: number): void {
    const splash = this.scene.add.circle(x, y, 12, 0x00ff00, 0.7);

    this.scene.tweens.add({
      targets: splash,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      onComplete: () => {
        splash.destroy();
      },
    });
  }

  /**
   * Tire un projectile acide
   */
  public fire(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    speed: number,
    damage: number
  ): Phaser.Physics.Arcade.Sprite | null {
    const spit = this.pool.getFirstDead(
      true,
      x,
      y,
      ASSET_KEYS.ACID
    ) as Phaser.Physics.Arcade.Sprite;

    if (!spit) return null;

    spit.setActive(true);
    spit.setVisible(true);
    spit.setPosition(x, y);
    spit.setData('damage', damage);
    spit.setTint(0x00ff00);

    // Calculer la direction vers la cible
    const direction = new Phaser.Math.Vector2(
      targetX - x,
      targetY - y
    ).normalize();

    // Appliquer la vélocité
    spit.setVelocity(direction.x * speed, direction.y * speed);

    // Rotation vers la direction
    spit.setRotation(Math.atan2(direction.y, direction.x));

    return spit;
  }

  /**
   * Remet un projectile dans le pool
   */
  public release(spit: Phaser.Physics.Arcade.Sprite): void {
    spit.setActive(false);
    spit.setVisible(false);
    spit.setVelocity(0, 0);
    spit.setPosition(-100, -100);
  }

  /**
   * Met à jour les projectiles (vérifie si hors écran)
   */
  public update(): void {
    this.pool.getChildren().forEach((child) => {
      const spit = child as Phaser.Physics.Arcade.Sprite;
      if (spit.active) {
        if (
          spit.x < -50 ||
          spit.x > this.scene.scale.width + 50 ||
          spit.y < -50 ||
          spit.y > this.scene.scale.height + 50
        ) {
          this.release(spit);
        }
      }
    });
  }

  /**
   * Retourne le groupe pour les collisions
   */
  public getGroup(): Phaser.Physics.Arcade.Group {
    return this.pool;
  }

  /**
   * Nettoie le pool
   */
  public destroy(): void {
    this.pool.destroy(true);
  }
}
