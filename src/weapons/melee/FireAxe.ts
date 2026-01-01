import Phaser from 'phaser';
import { MeleeWeapon, MeleeConfig } from './MeleeWeapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration de la hache de pompier
 */
const FIRE_AXE_CONFIG: MeleeConfig = {
  name: 'Hache',
  damage: BALANCE.weapons.fireAxe.damage,
  range: BALANCE.weapons.fireAxe.range,
  swingSpeed: BALANCE.weapons.fireAxe.swingSpeed,
  knockback: BALANCE.weapons.fireAxe.knockback,
  arcAngle: BALANCE.weapons.fireAxe.arcAngle,
};

/**
 * Hache de pompier
 * - Dégâts élevés
 * - Vitesse réduite
 * - Knockback moyen
 * - Chance de coup critique
 */
export class FireAxe extends MeleeWeapon {
  private critChance: number;
  private critMultiplier: number;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, FIRE_AXE_CONFIG);
    this.critChance = BALANCE.weapons.fireAxe.critChance;
    this.critMultiplier = BALANCE.weapons.fireAxe.critMultiplier;
  }

  /**
   * Override pour ajouter les coups critiques
   */
  protected override onHit(zombies: Zombie[], direction: Phaser.Math.Vector2): void {
    for (const zombie of zombies) {
      // Vérifier le coup critique
      const isCrit = Math.random() < this.critChance;
      const damage = isCrit ? this.config.damage * this.critMultiplier : this.config.damage;

      // Émettre l'événement de hit pour la télémétrie
      this.scene.events.emit('weaponHit', { weapon: this.config.name, damage, isCrit });

      // Infliger les dégâts
      zombie.takeDamage(damage);

      // Appliquer le knockback
      if (this.config.knockback > 0) {
        this.applyKnockback(zombie, direction);
      }

      // Effet d'impact (différent si critique)
      if (isCrit) {
        this.createCritEffect(zombie.x, zombie.y);
      } else {
        this.createHitEffect(zombie.x, zombie.y);
      }
    }
  }

  /**
   * Override de l'effet visuel de l'arc - puissant et lourd
   */
  protected override drawSwingArc(centerAngle: number): void {
    if (!this.arcGraphics) return;

    this.arcGraphics.clear();
    this.arcGraphics.lineStyle(5, 0xcc4400, 0.9);
    this.arcGraphics.fillStyle(0xff6600, 0.4);

    const halfArc = Phaser.Math.DegToRad(this.config.arcAngle / 2);
    const startAngle = centerAngle - halfArc;
    const endAngle = centerAngle + halfArc;

    // Arc épais
    this.arcGraphics.beginPath();
    this.arcGraphics.moveTo(this.owner.x, this.owner.y);
    this.arcGraphics.arc(
      this.owner.x,
      this.owner.y,
      this.config.range,
      startAngle,
      endAngle,
      false
    );
    this.arcGraphics.closePath();
    this.arcGraphics.fillPath();
    this.arcGraphics.strokePath();

    // Animation de swing lourd
    this.scene.tweens.add({
      targets: this.arcGraphics,
      alpha: 0,
      duration: this.config.swingSpeed * 0.7,
      onComplete: () => {
        if (this.arcGraphics) {
          this.arcGraphics.alpha = 1;
        }
      },
    });
  }

  /**
   * Effet d'impact normal
   */
  protected override createHitEffect(x: number, y: number): void {
    const flash = this.scene.add.circle(x, y, 25, 0xff6600, 0.8);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 250,
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  /**
   * Effet de coup critique
   */
  private createCritEffect(x: number, y: number): void {
    // Grand flash jaune
    const flash = this.scene.add.circle(x, y, 35, 0xffcc00, 1);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 3,
      duration: 300,
      onComplete: () => {
        flash.destroy();
      },
    });

    // Texte "CRIT!"
    const critText = this.scene.add.text(x, y - 20, 'CRIT!', {
      fontSize: '18px',
      color: '#ffcc00',
      fontStyle: 'bold',
    });
    critText.setOrigin(0.5);

    this.scene.tweens.add({
      targets: critText,
      y: critText.y - 30,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        critText.destroy();
      },
    });
  }
}
