import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration du lance-flammes
 */
const FLAMETHROWER_CONFIG: WeaponConfig = {
  name: 'Lance-flammes',
  damage: BALANCE.weapons.flamethrower.damage,
  fireRate: BALANCE.weapons.flamethrower.fireRate,
  maxAmmo: BALANCE.weapons.flamethrower.magazineSize,
  reloadTime: BALANCE.weapons.flamethrower.reloadTime,
  bulletSpeed: BALANCE.weapons.flamethrower.flameSpeed,
  spread: 0.3, // Grand spread pour effet de flamme
};

/**
 * Lance-flammes
 * - Projectiles à courte portée
 * - Applique DoT (brûlure)
 * - Laisse des zones de feu au sol
 * - Révèle les zombies invisibles
 */
export class Flamethrower extends Weapon {
  private dotDamage: number;
  private dotDuration: number;
  private flameSpeed: number;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, FLAMETHROWER_CONFIG);

    this.dotDamage = BALANCE.weapons.flamethrower.dotDamage;
    this.dotDuration = BALANCE.weapons.flamethrower.dotDuration;
    this.flameSpeed = BALANCE.weapons.flamethrower.flameSpeed;
  }

  /**
   * Override pour tirer des flammes en rafale continue
   */
  public override fire(direction: Phaser.Math.Vector2): boolean {
    const now = this.scene.time.now;

    if (!this.canFire || this.isReloading) return false;
    if (this.currentAmmo <= 0) {
      this.reload();
      return false;
    }
    if (now - this.lastFireTime < this.config.fireRate) return false;

    this.lastFireTime = now;
    this.currentAmmo--;

    // Créer plusieurs flammes avec spread
    const spreadCount = 3;
    for (let i = 0; i < spreadCount; i++) {
      // Appliquer le spread
      const spreadAngle = (Math.random() - 0.5) * this.config.spread!;
      const finalDirection = direction.clone().rotate(spreadAngle);

      // Ajouter une légère variation de vitesse
      const speedVariation = 0.8 + Math.random() * 0.4;

      this.createFlame(finalDirection, speedVariation);
    }

    return true;
  }

  /**
   * Crée une flamme
   */
  protected createFlame(direction: Phaser.Math.Vector2, speedMultiplier: number = 1): void {
    // Vérifier si le flamePool existe
    if (!this.scene.flamePool) {
      console.warn('FlamePool not initialized in GameScene');
      return;
    }

    const offset = 25;
    const startX = this.owner.x + direction.x * offset;
    const startY = this.owner.y + direction.y * offset;

    this.scene.flamePool.get(
      startX,
      startY,
      direction,
      this.flameSpeed * speedMultiplier,
      this.config.damage,
      this.dotDamage,
      this.dotDuration
    );
  }

  /**
   * Override de createProjectile (non utilisé directement)
   */
  protected override createProjectile(direction: Phaser.Math.Vector2): void {
    this.createFlame(direction, 1);
  }
}
