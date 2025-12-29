import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration du SMG depuis balance.ts
 */
const SMG_CONFIG: WeaponConfig = {
  name: 'SMG',
  damage: BALANCE.weapons.smg.damage,
  fireRate: BALANCE.weapons.smg.fireRate,
  maxAmmo: BALANCE.weapons.smg.magazineSize,
  reloadTime: BALANCE.weapons.smg.reloadTime,
  bulletSpeed: BALANCE.weapons.smg.bulletSpeed,
  spread: BALANCE.weapons.smg.spread,
};

/**
 * SMG - Cadence très rapide, grand chargeur
 * DPS élevé mais faible dégâts par balle
 */
export class SMG extends Weapon {
  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, SMG_CONFIG);
  }

  /**
   * Crée une balle - même pattern que le pistol
   * Le spread léger est géré par la classe de base
   */
  protected createProjectile(direction: Phaser.Math.Vector2): void {
    const bullet = this.scene.bulletPool.get(
      this.owner.x,
      this.owner.y,
      direction,
      this.config.bulletSpeed,
      this.config.damage
    );

    if (bullet) {
      // Offset la position de spawn légèrement devant le joueur
      const offset = 20;
      bullet.x += direction.x * offset;
      bullet.y += direction.y * offset;
    }
  }
}
