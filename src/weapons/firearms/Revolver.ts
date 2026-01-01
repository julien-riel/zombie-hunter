import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration du revolver depuis balance.ts
 */
const REVOLVER_CONFIG: WeaponConfig = {
  name: 'Revolver',
  damage: BALANCE.weapons.revolver.damage,
  fireRate: BALANCE.weapons.revolver.fireRate,
  maxAmmo: BALANCE.weapons.revolver.magazineSize,
  reloadTime: BALANCE.weapons.revolver.reloadTime,
  bulletSpeed: BALANCE.weapons.revolver.bulletSpeed,
  spread: BALANCE.weapons.revolver.spread,
};

/**
 * Revolver - Arme de précision à gros calibre
 * - 6 balles seulement
 * - Dégâts élevés (one-shot potentiel)
 * - Rechargement lent mais satisfaisant
 * - Très précis
 */
export class Revolver extends Weapon {
  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, REVOLVER_CONFIG);
  }

  /**
   * Override fire pour ajouter un effet de recul visuel
   */
  public override fire(direction: Phaser.Math.Vector2): boolean {
    const result = super.fire(direction);

    if (result) {
      // Effet de recul visuel - screen shake léger
      this.scene.cameras.main.shake(50, 0.003);

      // Flash de tir plus prononcé
      this.createMuzzleFlash(direction);
    }

    return result;
  }

  /**
   * Crée un flash de bouche prononcé
   */
  private createMuzzleFlash(direction: Phaser.Math.Vector2): void {
    const offset = 25;
    const flashX = this.owner.x + direction.x * offset;
    const flashY = this.owner.y + direction.y * offset;

    // Flash principal
    const flash = this.scene.add.circle(flashX, flashY, 12, 0xffcc00, 1);
    flash.setDepth(100);

    this.scene.tweens.add({
      targets: flash,
      scale: 0.3,
      alpha: 0,
      duration: 80,
      onComplete: () => flash.destroy(),
    });

    // Étincelles
    for (let i = 0; i < 3; i++) {
      const sparkAngle = Math.atan2(direction.y, direction.x) + (Math.random() - 0.5) * 0.5;
      const sparkDist = 15 + Math.random() * 10;
      const spark = this.scene.add.circle(
        flashX + Math.cos(sparkAngle) * sparkDist,
        flashY + Math.sin(sparkAngle) * sparkDist,
        2,
        0xffaa00,
        1
      );
      spark.setDepth(99);

      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        duration: 100,
        delay: i * 20,
        onComplete: () => spark.destroy(),
      });
    }
  }

  /**
   * Crée une balle puissante
   */
  protected createProjectile(direction: Phaser.Math.Vector2): void {
    const bullet = this.scene.bulletPool.get(
      this.owner.x,
      this.owner.y,
      direction,
      this.config.bulletSpeed,
      this.config.damage,
      false, // Non perforant
      'revolver'
    );

    if (bullet) {
      const offset = 20;
      bullet.x += direction.x * offset;
      bullet.y += direction.y * offset;

      // Légère teinte pour différencier visuellement
      bullet.setTint(0xffdd88);
    }
  }

  /**
   * Override reload pour animation spéciale
   */
  public override reload(): void {
    if (this.isReloading || this.currentAmmo === this.maxAmmo) return;

    this.isReloading = true;
    this.canFire = false;

    // Animation de rechargement (rotation du barillet)
    // Émission d'un événement pour le feedback sonore potentiel
    this.scene.events.emit('weaponReloading', { weapon: 'revolver', duration: this.config.reloadTime });

    this.scene.time.delayedCall(this.config.reloadTime, () => {
      this.currentAmmo = this.maxAmmo;
      this.isReloading = false;
      this.canFire = true;
    });
  }
}
