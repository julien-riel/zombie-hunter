import Phaser from 'phaser';
import { ASSET_KEYS } from '@config/assets.manifest';
import type { GameScene } from '@scenes/GameScene';
import { getPerformanceConfig } from '@config/MobilePerformanceConfig';

/**
 * Pool de projectiles pour optimiser les performances
 * Réutilise les sprites au lieu de les créer/détruire
 */
export class BulletPool {
  private scene: GameScene;
  private pool: Phaser.Physics.Arcade.Group;

  constructor(scene: GameScene) {
    this.scene = scene;

    // Récupérer les paramètres de performance optimisés pour l'appareil
    const perfConfig = getPerformanceConfig();
    const poolSize = perfConfig.getBulletPoolSize();
    const prewarmSize = perfConfig.getPerformanceSettings().bulletPoolPrewarm;

    this.pool = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: poolSize,
      runChildUpdate: false,
    });

    // Pré-créer les bullets
    this.prewarm(prewarmSize);
  }

  /**
   * Préchauffe le pool avec des bullets inactives
   */
  private prewarm(count: number): void {
    for (let i = 0; i < count; i++) {
      const bullet = this.pool.create(
        -100,
        -100,
        ASSET_KEYS.BULLET
      ) as Phaser.Physics.Arcade.Sprite;
      if (bullet) {
        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.setData('damage', 0);
        bullet.setData('speed', 0);
      }
    }
  }

  /**
   * Récupère une balle du pool et la configure
   * @param piercing - Si true, la balle traverse les ennemis
   * @param weaponType - Type d'arme pour la télémétrie
   */
  public get(
    x: number,
    y: number,
    direction: Phaser.Math.Vector2,
    speed: number,
    damage: number,
    piercing: boolean = false,
    weaponType: string = 'bullet'
  ): Phaser.Physics.Arcade.Sprite | null {
    const bullet = this.pool.getFirstDead(
      true,
      x,
      y,
      ASSET_KEYS.BULLET
    ) as Phaser.Physics.Arcade.Sprite;

    if (!bullet) return null;

    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setPosition(x, y);
    bullet.setData('damage', damage);
    bullet.setData('speed', speed);
    bullet.setData('piercing', piercing);
    bullet.setData('weaponType', weaponType);
    bullet.setData('hitTargets', []); // Track already-hit targets for piercing

    // Appliquer la vélocité
    const velocityX = direction.x * speed;
    const velocityY = direction.y * speed;
    bullet.setVelocity(velocityX, velocityY);

    // Rotation de la balle vers la direction
    bullet.setRotation(Math.atan2(direction.y, direction.x));

    return bullet;
  }

  /**
   * Remet une balle dans le pool
   */
  public release(bullet: Phaser.Physics.Arcade.Sprite): void {
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.setVelocity(0, 0);
    bullet.setPosition(-100, -100);
  }

  /**
   * Met à jour les bullets (vérifie si hors écran)
   */
  public update(): void {
    this.pool.getChildren().forEach((child) => {
      const bullet = child as Phaser.Physics.Arcade.Sprite;
      if (bullet.active) {
        // Désactiver si hors du monde
        if (
          bullet.x < -50 ||
          bullet.x > this.scene.scale.width + 50 ||
          bullet.y < -50 ||
          bullet.y > this.scene.scale.height + 50
        ) {
          this.release(bullet);
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
   * Retourne les dégâts d'une balle
   */
  public getDamage(bullet: Phaser.Physics.Arcade.Sprite): number {
    return bullet.getData('damage') || 0;
  }

  /**
   * Vérifie si une balle est perforante
   */
  public isPiercing(bullet: Phaser.Physics.Arcade.Sprite): boolean {
    return bullet.getData('piercing') === true;
  }

  /**
   * Retourne le type d'arme d'une balle
   */
  public getWeaponType(bullet: Phaser.Physics.Arcade.Sprite): string {
    return bullet.getData('weaponType') || 'bullet';
  }

  /**
   * Vérifie si une cible a déjà été touchée par cette balle perforante
   */
  public hasHitTarget(bullet: Phaser.Physics.Arcade.Sprite, targetId: number): boolean {
    const hitTargets: number[] = bullet.getData('hitTargets') || [];
    return hitTargets.includes(targetId);
  }

  /**
   * Enregistre qu'une cible a été touchée par cette balle perforante
   */
  public markTargetHit(bullet: Phaser.Physics.Arcade.Sprite, targetId: number): void {
    const hitTargets: number[] = bullet.getData('hitTargets') || [];
    hitTargets.push(targetId);
    bullet.setData('hitTargets', hitTargets);
  }
}
