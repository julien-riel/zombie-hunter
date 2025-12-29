import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { DEFAULT_BULLET_SPEED, DEFAULT_BULLET_DAMAGE } from '@config/constants';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration du pistolet
 */
const PISTOL_CONFIG: WeaponConfig = {
  name: 'Pistolet',
  damage: DEFAULT_BULLET_DAMAGE,
  fireRate: 250, // 4 tirs par seconde
  maxAmmo: 12,
  reloadTime: 1000,
  bulletSpeed: DEFAULT_BULLET_SPEED,
  spread: 0.05, // Léger spread
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
