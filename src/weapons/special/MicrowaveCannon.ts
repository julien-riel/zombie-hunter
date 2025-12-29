import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration du canon à micro-ondes
 */
const MICROWAVE_CONFIG: WeaponConfig = {
  name: 'Canon Micro-ondes',
  damage: BALANCE.weapons.microwaveCannon.damage,
  fireRate: BALANCE.weapons.microwaveCannon.fireRate,
  maxAmmo: BALANCE.weapons.microwaveCannon.magazineSize,
  reloadTime: BALANCE.weapons.microwaveCannon.reloadTime,
  bulletSpeed: 0, // Pas de projectile
};

/**
 * Canon à Micro-ondes
 * - Temps de charge avant tir
 * - Dégâts en cône
 * - Effet visuel : zombies "explosent" (gore)
 * - Consomme beaucoup de munitions
 */
export class MicrowaveCannon extends Weapon {
  private range: number;
  private chargeTime: number;
  private coneAngle: number;

  private isCharging: boolean = false;
  private chargeStartTime: number = 0;
  private chargeGraphics: Phaser.GameObjects.Graphics;
  private effectGraphics: Phaser.GameObjects.Graphics;

  /** Direction actuelle de visée */
  private currentDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, MICROWAVE_CONFIG);

    this.range = BALANCE.weapons.microwaveCannon.range;
    this.chargeTime = BALANCE.weapons.microwaveCannon.chargeTime;
    this.coneAngle = BALANCE.weapons.microwaveCannon.coneAngle;

    // Graphiques
    this.chargeGraphics = scene.add.graphics();
    this.chargeGraphics.setDepth(20);
    this.effectGraphics = scene.add.graphics();
    this.effectGraphics.setDepth(15);
  }

  /**
   * Override de fire pour gérer la charge
   */
  public override fire(direction: Phaser.Math.Vector2): boolean {
    const now = this.scene.time.now;

    if (this.isReloading) return false;
    if (this.currentAmmo <= 0) {
      this.reload();
      return false;
    }
    if (now - this.lastFireTime < this.config.fireRate) return false;

    this.currentDirection = direction.clone();

    // Si pas déjà en charge, commencer
    if (!this.isCharging) {
      this.startCharge();
      return true;
    }

    // Vérifier si la charge est complète
    const chargeDuration = now - this.chargeStartTime;
    if (chargeDuration >= this.chargeTime) {
      this.releaseBeam();
      return true;
    }

    return false;
  }

  /**
   * Démarre la charge
   */
  private startCharge(): void {
    this.isCharging = true;
    this.chargeStartTime = this.scene.time.now;
    this.canFire = false;
  }

  /**
   * Relâche le rayon
   */
  private releaseBeam(): void {
    this.isCharging = false;
    this.lastFireTime = this.scene.time.now;
    this.currentAmmo--;
    this.canFire = true;

    // Effacer les graphiques de charge
    this.chargeGraphics.clear();

    // Trouver tous les zombies dans le cône
    const hitZombies = this.findZombiesInCone();

    // Infliger les dégâts avec effet
    for (const zombie of hitZombies) {
      zombie.takeDamage(this.config.damage);
      this.createExplosionEffect(zombie);
    }

    // Effet visuel du rayon
    this.drawBeamEffect();
  }

  /**
   * Trouve les zombies dans le cône d'attaque
   */
  private findZombiesInCone(): Zombie[] {
    const hitZombies: Zombie[] = [];
    const centerAngle = Math.atan2(this.currentDirection.y, this.currentDirection.x);
    const halfCone = Phaser.Math.DegToRad(this.coneAngle / 2);
    const activeZombies = this.scene.getActiveZombies();

    for (const zombie of activeZombies) {
      if (!zombie.active) continue;

      const dx = zombie.x - this.owner.x;
      const dy = zombie.y - this.owner.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.range) continue;

      const angleToZombie = Math.atan2(dy, dx);
      let angleDiff = angleToZombie - centerAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= halfCone) {
        hitZombies.push(zombie);
      }
    }

    return hitZombies;
  }

  /**
   * Crée l'effet d'explosion gore sur un zombie
   */
  private createExplosionEffect(zombie: Zombie): void {
    const x = zombie.x;
    const y = zombie.y;

    // Effet de "bulle" qui éclate
    const bubble = this.scene.add.circle(x, y, 20, 0xff0000, 0.6);
    this.scene.tweens.add({
      targets: bubble,
      scale: 3,
      alpha: 0,
      duration: 200,
      onComplete: () => bubble.destroy(),
    });

    // Particules de gore
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 100 + Math.random() * 100;
      const size = 3 + Math.random() * 5;

      const particle = this.scene.add.circle(
        x,
        y,
        size,
        0x990000,
        0.9
      );

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.3,
        duration: 300 + Math.random() * 200,
        onComplete: () => particle.destroy(),
      });
    }

    // Flash blanc d'impact
    const flash = this.scene.add.circle(x, y, 30, 0xffffff, 0.8);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 100,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Dessine l'effet du rayon
   */
  private drawBeamEffect(): void {
    this.effectGraphics.clear();

    const centerAngle = Math.atan2(this.currentDirection.y, this.currentDirection.x);
    const halfCone = Phaser.Math.DegToRad(this.coneAngle / 2);

    // Cône de micro-ondes
    this.effectGraphics.fillStyle(0xffff00, 0.3);
    this.effectGraphics.lineStyle(3, 0xff8800, 0.8);

    this.effectGraphics.beginPath();
    this.effectGraphics.moveTo(this.owner.x, this.owner.y);
    this.effectGraphics.arc(
      this.owner.x,
      this.owner.y,
      this.range,
      centerAngle - halfCone,
      centerAngle + halfCone,
      false
    );
    this.effectGraphics.closePath();
    this.effectGraphics.fillPath();
    this.effectGraphics.strokePath();

    // Lignes d'énergie
    this.effectGraphics.lineStyle(2, 0xffff00, 0.6);
    for (let i = 0; i < 5; i++) {
      const angle = centerAngle - halfCone + (i / 4) * halfCone * 2;
      this.effectGraphics.beginPath();
      this.effectGraphics.moveTo(this.owner.x, this.owner.y);

      // Ligne ondulée
      const segments = 8;
      for (let j = 1; j <= segments; j++) {
        const r = (j / segments) * this.range;
        const wobble = Math.sin(j * 2) * 10;
        const px = this.owner.x + Math.cos(angle) * r + Math.cos(angle + Math.PI / 2) * wobble;
        const py = this.owner.y + Math.sin(angle) * r + Math.sin(angle + Math.PI / 2) * wobble;
        this.effectGraphics.lineTo(px, py);
      }

      this.effectGraphics.strokePath();
    }

    // Effacer après un délai
    this.scene.time.delayedCall(200, () => {
      this.effectGraphics.clear();
    });
  }

  /**
   * Override de update pour dessiner l'indicateur de charge
   */
  public override update(): void {
    if (this.isCharging) {
      this.updateCharging();
    }
  }

  /**
   * Met à jour l'affichage de charge
   */
  private updateCharging(): void {
    const now = this.scene.time.now;
    const chargeDuration = now - this.chargeStartTime;
    const chargePercent = Math.min(1, chargeDuration / this.chargeTime);

    // Mettre à jour la direction avec la souris
    const pointer = this.scene.input.activePointer;
    this.currentDirection = new Phaser.Math.Vector2(
      pointer.worldX - this.owner.x,
      pointer.worldY - this.owner.y
    ).normalize();

    this.chargeGraphics.clear();

    // Dessiner le cône de prévisualisation
    const centerAngle = Math.atan2(this.currentDirection.y, this.currentDirection.x);
    const halfCone = Phaser.Math.DegToRad(this.coneAngle / 2);
    const currentRange = this.range * chargePercent;

    // Cône croissant
    this.chargeGraphics.fillStyle(0xffff00, 0.1 + chargePercent * 0.2);
    this.chargeGraphics.lineStyle(2, 0xff8800, 0.5 + chargePercent * 0.5);

    this.chargeGraphics.beginPath();
    this.chargeGraphics.moveTo(this.owner.x, this.owner.y);
    this.chargeGraphics.arc(
      this.owner.x,
      this.owner.y,
      currentRange,
      centerAngle - halfCone,
      centerAngle + halfCone,
      false
    );
    this.chargeGraphics.closePath();
    this.chargeGraphics.fillPath();
    this.chargeGraphics.strokePath();

    // Barre de charge au-dessus du joueur
    const barWidth = 40;
    const barHeight = 6;
    const barX = this.owner.x - barWidth / 2;
    const barY = this.owner.y - 45;

    this.chargeGraphics.fillStyle(0x333333, 0.8);
    this.chargeGraphics.fillRect(barX, barY, barWidth, barHeight);

    this.chargeGraphics.fillStyle(chargePercent >= 1 ? 0x00ff00 : 0xff8800, 1);
    this.chargeGraphics.fillRect(barX, barY, barWidth * chargePercent, barHeight);

    this.chargeGraphics.lineStyle(1, 0xffffff, 0.8);
    this.chargeGraphics.strokeRect(barX, barY, barWidth, barHeight);

    // Si charge complète, indiquer que c'est prêt
    if (chargePercent >= 1) {
      const readyText = this.scene.add.text(
        this.owner.x,
        barY - 10,
        'READY!',
        { fontSize: '10px', color: '#00ff00' }
      );
      readyText.setOrigin(0.5);

      this.scene.time.delayedCall(100, () => {
        readyText.destroy();
      });

      // Tirer automatiquement quand charge complète si bouton maintenu
      const pointer = this.scene.input.activePointer;
      if (pointer.isDown) {
        this.releaseBeam();
      }
    }
  }

  /**
   * Override de createProjectile (pas utilisé)
   */
  protected override createProjectile(_direction: Phaser.Math.Vector2): void {
    // Non utilisé - le canon n'utilise pas de projectiles
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.chargeGraphics?.destroy();
    this.effectGraphics?.destroy();
  }
}
