import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration du sniper depuis balance.ts
 */
const SNIPER_CONFIG: WeaponConfig = {
  name: 'Sniper',
  damage: BALANCE.weapons.sniper.damage,
  fireRate: BALANCE.weapons.sniper.fireRate,
  maxAmmo: BALANCE.weapons.sniper.magazineSize,
  reloadTime: BALANCE.weapons.sniper.reloadTime,
  bulletSpeed: BALANCE.weapons.sniper.bulletSpeed,
  spread: BALANCE.weapons.sniper.spread,
};

/**
 * SniperRifle - Dégâts massifs, projectiles perforants
 * Traverse les ennemis, cadence lente
 */
export class SniperRifle extends Weapon {
  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, SNIPER_CONFIG);
  }

  /**
   * Crée une balle perforante
   */
  protected createProjectile(direction: Phaser.Math.Vector2): void {
    // Le sniper tire des balles perforantes (piercing = true)
    const bullet = this.scene.bulletPool.get(
      this.owner.x,
      this.owner.y,
      direction,
      this.config.bulletSpeed,
      this.config.damage,
      true // piercing
    );

    if (bullet) {
      // Offset la position de spawn légèrement devant le joueur
      const offset = 20;
      bullet.x += direction.x * offset;
      bullet.y += direction.y * offset;

      // Augmente légèrement la taille pour un effet visuel plus imposant
      bullet.setScale(1.5);
    }
  }
}
