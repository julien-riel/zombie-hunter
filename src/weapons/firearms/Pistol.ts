import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration du pistolet depuis balance.ts
 */
const PISTOL_CONFIG: WeaponConfig = {
  name: 'Pistolet',
  damage: BALANCE.weapons.pistol.damage,
  fireRate: BALANCE.weapons.pistol.fireRate,
  maxAmmo: BALANCE.weapons.pistol.magazineSize,
  reloadTime: BALANCE.weapons.pistol.reloadTime,
  bulletSpeed: BALANCE.weapons.pistol.bulletSpeed,
  spread: BALANCE.weapons.pistol.spread,
};

/**
 * Arme de départ - Pistolet
 * Fiable, précis, munitions abondantes
 */
export class Pistol extends Weapon {
  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, PISTOL_CONFIG);
  }

  /**
   * Crée une balle
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
