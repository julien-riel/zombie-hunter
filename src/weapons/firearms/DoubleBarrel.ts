import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration du double barrel depuis balance.ts
 */
const DOUBLE_BARREL_CONFIG: WeaponConfig = {
  name: 'Double Canon',
  damage: BALANCE.weapons.doubleBarrel.damage,
  fireRate: BALANCE.weapons.doubleBarrel.fireRate,
  maxAmmo: BALANCE.weapons.doubleBarrel.magazineSize,
  reloadTime: BALANCE.weapons.doubleBarrel.reloadTime,
  bulletSpeed: BALANCE.weapons.doubleBarrel.bulletSpeed,
  spread: BALANCE.weapons.doubleBarrel.spread,
};

/**
 * Double Barrel Shotgun - Fusil à canon scié
 * - 2 cartouches seulement
 * - 8 pellets par tir (plus que le shotgun normal)
 * - Dégâts massifs à courte portée
 * - Rechargement long mais dévastateur
 * - Option de tirer les 2 canons en même temps
 */
export class DoubleBarrel extends Weapon {
  private pelletCount: number;
  private lastShotWasDouble: boolean = false;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, DOUBLE_BARREL_CONFIG);
    this.pelletCount = BALANCE.weapons.doubleBarrel.pelletCount;
  }

  /**
   * Override fire pour gérer le tir double
   * - Clic simple = 1 canon
   * - Si on tire très vite (< 200ms), tire le 2ème canon aussi
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
    this.lastShotWasDouble = false;

    // Émettre l'événement de tir
    this.scene.events.emit('weaponFired', { weapon: this.config.name });

    // Créer les pellets
    this.createProjectile(direction);

    // Gros recul et shake
    this.createFireEffect(direction);

    // Recharger automatiquement si vide
    if (this.currentAmmo <= 0) {
      this.scene.time.delayedCall(300, () => this.reload());
    }

    return true;
  }

  /**
   * Tir les deux canons en même temps (burst de puissance)
   * Consomme 2 munitions, double les pellets
   */
  public fireDouble(direction: Phaser.Math.Vector2): boolean {
    const now = this.scene.time.now;

    if (!this.canFire || this.isReloading) return false;
    if (this.currentAmmo < 2) {
      // Pas assez de munitions pour un double, tir normal
      return this.fire(direction);
    }
    if (now - this.lastFireTime < this.config.fireRate * 2) return false;

    this.lastFireTime = now;
    this.currentAmmo -= 2;
    this.lastShotWasDouble = true;

    // Émettre l'événement de tir
    this.scene.events.emit('weaponFired', { weapon: this.config.name, type: 'double' });

    // Créer les pellets des deux canons (double pellets)
    this.createDoubleProjectile(direction);

    // Gros recul et shake (plus intense)
    this.createDoubleFireEffect(direction);

    // Recharger automatiquement
    this.scene.time.delayedCall(300, () => this.reload());

    return true;
  }

  /**
   * Crée les pellets d'un canon
   */
  protected createProjectile(direction: Phaser.Math.Vector2): void {
    const spreadAngle = this.config.spread || 0.35;
    const halfSpread = spreadAngle / 2;
    const angleStep = spreadAngle / (this.pelletCount - 1);

    for (let i = 0; i < this.pelletCount; i++) {
      const pelletAngle = -halfSpread + angleStep * i;
      const randomVariation = (Math.random() - 0.5) * 0.08;
      const finalAngle = pelletAngle + randomVariation;

      const pelletDirection = direction.clone().rotate(finalAngle);

      const bullet = this.scene.bulletPool.get(
        this.owner.x,
        this.owner.y,
        pelletDirection,
        this.config.bulletSpeed,
        this.config.damage,
        false,
        'doubleBarrel'
      );

      if (bullet) {
        const offset = 20;
        bullet.x += pelletDirection.x * offset;
        bullet.y += pelletDirection.y * offset;
      }
    }
  }

  /**
   * Crée les pellets des deux canons (double)
   */
  private createDoubleProjectile(direction: Phaser.Math.Vector2): void {
    const spreadAngle = this.config.spread || 0.35;
    const totalPellets = this.pelletCount * 2;

    for (let i = 0; i < totalPellets; i++) {
      // Distribution plus large pour le double tir
      const pelletAngle = (Math.random() - 0.5) * spreadAngle * 1.2;
      const pelletDirection = direction.clone().rotate(pelletAngle);

      const bullet = this.scene.bulletPool.get(
        this.owner.x,
        this.owner.y,
        pelletDirection,
        this.config.bulletSpeed * (0.9 + Math.random() * 0.2),
        this.config.damage,
        false,
        'doubleBarrel'
      );

      if (bullet) {
        const offset = 20;
        bullet.x += pelletDirection.x * offset;
        bullet.y += pelletDirection.y * offset;
      }
    }
  }

  /**
   * Effet de tir simple
   */
  private createFireEffect(direction: Phaser.Math.Vector2): void {
    // Screen shake
    this.scene.cameras.main.shake(80, 0.008);

    // Flash de bouche
    const offset = 25;
    const flashX = this.owner.x + direction.x * offset;
    const flashY = this.owner.y + direction.y * offset;

    const flash = this.scene.add.circle(flashX, flashY, 15, 0xffaa00, 1);
    flash.setDepth(100);

    this.scene.tweens.add({
      targets: flash,
      scale: 0.3,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy(),
    });

    // Fumée
    this.createSmokeEffect(flashX, flashY);
  }

  /**
   * Effet de tir double (plus intense)
   */
  private createDoubleFireEffect(direction: Phaser.Math.Vector2): void {
    // Screen shake puissant
    this.scene.cameras.main.shake(150, 0.015);

    const offset = 25;
    const flashX = this.owner.x + direction.x * offset;
    const flashY = this.owner.y + direction.y * offset;

    // Double flash
    const flash1 = this.scene.add.circle(flashX - 5, flashY - 3, 18, 0xffcc00, 1);
    const flash2 = this.scene.add.circle(flashX + 5, flashY + 3, 18, 0xffaa00, 1);
    flash1.setDepth(100);
    flash2.setDepth(100);

    this.scene.tweens.add({
      targets: [flash1, flash2],
      scale: 0.2,
      alpha: 0,
      duration: 120,
      onComplete: () => {
        flash1.destroy();
        flash2.destroy();
      },
    });

    // Beaucoup de fumée
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 30, () => {
        this.createSmokeEffect(
          flashX + (Math.random() - 0.5) * 20,
          flashY + (Math.random() - 0.5) * 20
        );
      });
    }
  }

  /**
   * Crée un effet de fumée
   */
  private createSmokeEffect(x: number, y: number): void {
    const smoke = this.scene.add.circle(x, y, 8, 0x888888, 0.6);
    smoke.setDepth(99);

    this.scene.tweens.add({
      targets: smoke,
      y: y - 20,
      scale: 2,
      alpha: 0,
      duration: 400,
      onComplete: () => smoke.destroy(),
    });
  }

  /**
   * Vérifie si le dernier tir était un double
   */
  public wasLastShotDouble(): boolean {
    return this.lastShotWasDouble;
  }
}
