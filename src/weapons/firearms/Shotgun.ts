import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration du shotgun depuis balance.ts
 */
const SHOTGUN_CONFIG: WeaponConfig = {
  name: 'Shotgun',
  damage: BALANCE.weapons.shotgun.damage,
  fireRate: BALANCE.weapons.shotgun.fireRate,
  maxAmmo: BALANCE.weapons.shotgun.magazineSize,
  reloadTime: BALANCE.weapons.shotgun.reloadTime,
  bulletSpeed: BALANCE.weapons.shotgun.bulletSpeed,
  spread: BALANCE.weapons.shotgun.spread,
};

/**
 * Shotgun - 6 pellets en spread
 * Dégâts massifs à courte portée, cadence lente
 */
export class Shotgun extends Weapon {
  private pelletCount: number;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, SHOTGUN_CONFIG);
    this.pelletCount = BALANCE.weapons.shotgun.pelletCount;
  }

  /**
   * Override fire pour créer plusieurs pellets
   * Le spread est appliqué manuellement pour chaque pellet
   */
  public fire(direction: Phaser.Math.Vector2): boolean {
    const now = this.scene.time.now;

    if (!this.canFire || this.isReloading) return false;
    if (this.currentAmmo <= 0) {
      this.reload();
      return false;
    }
    if (now - this.lastFireTime < this.config.fireRate) return false;

    this.lastFireTime = now;
    this.currentAmmo--;

    // Créer les pellets en spread
    this.createProjectile(direction);

    return true;
  }

  /**
   * Crée 6 pellets en spread autour de la direction
   */
  protected createProjectile(direction: Phaser.Math.Vector2): void {
    const spreadAngle = this.config.spread || 0.3;
    const halfSpread = spreadAngle / 2;
    const angleStep = spreadAngle / (this.pelletCount - 1);

    for (let i = 0; i < this.pelletCount; i++) {
      // Calcule l'angle de ce pellet
      // Distribution uniforme sur l'arc de spread
      const pelletAngle = -halfSpread + angleStep * i;

      // Ajoute une petite variation aléatoire pour un effet plus naturel
      const randomVariation = (Math.random() - 0.5) * 0.05;
      const finalAngle = pelletAngle + randomVariation;

      const pelletDirection = direction.clone().rotate(finalAngle);

      const bullet = this.scene.bulletPool.get(
        this.owner.x,
        this.owner.y,
        pelletDirection,
        this.config.bulletSpeed,
        this.config.damage
      );

      if (bullet) {
        // Offset la position de spawn légèrement devant le joueur
        const offset = 20;
        bullet.x += pelletDirection.x * offset;
        bullet.y += pelletDirection.y * offset;
      }
    }
  }

}
