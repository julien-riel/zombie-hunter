import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration du cloueur
 */
const NAILGUN_CONFIG: WeaponConfig = {
  name: 'Cloueur',
  damage: BALANCE.weapons.nailGun.damage,
  fireRate: BALANCE.weapons.nailGun.fireRate,
  maxAmmo: BALANCE.weapons.nailGun.magazineSize,
  reloadTime: BALANCE.weapons.nailGun.reloadTime,
  bulletSpeed: BALANCE.weapons.nailGun.bulletSpeed,
  spread: 0.02,
};

/**
 * Cloueur (Nail Gun)
 * - Projectiles qui immobilisent les zombies
 * - Applique l'état "pinned" aux zombies touchés
 * - Cadence moyenne
 */
export class NailGun extends Weapon {
  private pinDuration: number;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, NAILGUN_CONFIG);
    this.pinDuration = BALANCE.weapons.nailGun.pinDuration;
  }

  /**
   * Crée un clou avec effet de pin
   */
  protected override createProjectile(direction: Phaser.Math.Vector2): void {
    const offset = 20;
    const startX = this.owner.x + direction.x * offset;
    const startY = this.owner.y + direction.y * offset;

    const bullet = this.scene.bulletPool.get(
      startX,
      startY,
      direction,
      this.config.bulletSpeed,
      this.config.damage,
      false // Pas perforant
    );

    if (bullet) {
      // Marquer comme clou avec effet de pin
      bullet.setData('isNail', true);
      bullet.setData('pinDuration', this.pinDuration);

      // Effet visuel différent (gris métallique)
      bullet.setTint(0x888888);
    }
  }
}

