import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration de l'assault rifle depuis balance.ts
 */
const ASSAULT_RIFLE_CONFIG: WeaponConfig = {
  name: 'Fusil Assaut',
  damage: BALANCE.weapons.assaultRifle.damage,
  fireRate: BALANCE.weapons.assaultRifle.burstDelay, // Délai entre bursts
  maxAmmo: BALANCE.weapons.assaultRifle.magazineSize,
  reloadTime: BALANCE.weapons.assaultRifle.reloadTime,
  bulletSpeed: BALANCE.weapons.assaultRifle.bulletSpeed,
  spread: BALANCE.weapons.assaultRifle.spread,
};

/**
 * Assault Rifle - Fusil d'assaut en mode burst
 * - 3 balles par appui (burst)
 * - Précis et contrôlable
 * - Bon équilibre dégâts/cadence
 * - Chargeur de 24 balles (8 bursts)
 */
export class AssaultRifle extends Weapon {
  private burstCount: number;
  private burstFireRate: number;
  private isBursting: boolean = false;
  private burstShotsRemaining: number = 0;
  private lastBurstDirection: Phaser.Math.Vector2 | null = null;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, ASSAULT_RIFLE_CONFIG);
    this.burstCount = BALANCE.weapons.assaultRifle.burstCount;
    this.burstFireRate = BALANCE.weapons.assaultRifle.fireRate;
  }

  /**
   * Override fire pour gérer le mode burst
   */
  public override fire(direction: Phaser.Math.Vector2): boolean {
    const now = this.scene.time.now;

    // Si déjà en train de burst, ignorer
    if (this.isBursting) return false;
    if (!this.canFire || this.isReloading) return false;
    if (this.currentAmmo <= 0) {
      this.reload();
      return false;
    }
    if (now - this.lastFireTime < this.config.fireRate) return false;

    // Démarrer le burst
    this.startBurst(direction);
    return true;
  }

  /**
   * Démarre un burst de tirs
   */
  private startBurst(direction: Phaser.Math.Vector2): void {
    this.isBursting = true;
    this.lastFireTime = this.scene.time.now;
    this.lastBurstDirection = direction.clone();

    // Calculer combien de tirs on peut faire
    this.burstShotsRemaining = Math.min(this.burstCount, this.currentAmmo);

    // Tirer le premier projectile immédiatement
    this.fireBurstShot();

    // Programmer les tirs suivants
    if (this.burstShotsRemaining > 0) {
      this.scene.time.addEvent({
        delay: this.burstFireRate,
        callback: this.fireBurstShot,
        callbackScope: this,
        repeat: this.burstShotsRemaining - 1,
      });
    }
  }

  /**
   * Tire un projectile du burst
   */
  private fireBurstShot(): void {
    if (this.burstShotsRemaining <= 0 || !this.lastBurstDirection) {
      this.endBurst();
      return;
    }

    this.burstShotsRemaining--;
    this.currentAmmo--;

    // Émettre l'événement de tir
    this.scene.events.emit('weaponFired', { weapon: this.config.name });

    // Appliquer le spread (léger, augmente avec chaque tir du burst)
    const burstSpreadMultiplier = 1 + (this.burstCount - this.burstShotsRemaining - 1) * 0.3;
    const spreadAngle = (Math.random() - 0.5) * (this.config.spread ?? 0) * burstSpreadMultiplier;
    const finalDirection = this.lastBurstDirection.clone().rotate(spreadAngle);

    // Créer le projectile
    this.createProjectile(finalDirection);

    // Petit effet de recul
    this.createBurstEffect(finalDirection);

    // Fin du burst si plus de munitions
    if (this.burstShotsRemaining <= 0) {
      this.endBurst();
    }
  }

  /**
   * Termine le burst
   */
  private endBurst(): void {
    this.isBursting = false;
    this.lastBurstDirection = null;

    // Recharger automatiquement si vide
    if (this.currentAmmo <= 0) {
      this.reload();
    }
  }

  /**
   * Effet visuel du burst
   */
  private createBurstEffect(direction: Phaser.Math.Vector2): void {
    const offset = 22;
    const flashX = this.owner.x + direction.x * offset;
    const flashY = this.owner.y + direction.y * offset;

    // Flash de tir
    const flash = this.scene.add.circle(flashX, flashY, 6, 0xffaa00, 0.8);
    flash.setDepth(100);

    this.scene.tweens.add({
      targets: flash,
      scale: 0.2,
      alpha: 0,
      duration: 50,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Crée un projectile
   */
  protected createProjectile(direction: Phaser.Math.Vector2): void {
    const bullet = this.scene.bulletPool.get(
      this.owner.x,
      this.owner.y,
      direction,
      this.config.bulletSpeed,
      this.config.damage,
      false,
      'assaultRifle'
    );

    if (bullet) {
      const offset = 20;
      bullet.x += direction.x * offset;
      bullet.y += direction.y * offset;
    }
  }

  /**
   * Update pour gérer l'état du burst
   */
  public override update(): void {
    // Rien de spécial, le burst est géré par les timers
  }
}
