import Phaser from 'phaser';
import { MeleeWeapon, MeleeConfig } from './MeleeWeapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration du katana
 */
const KATANA_CONFIG: MeleeConfig = {
  name: 'Katana',
  damage: BALANCE.weapons.katana.damage,
  range: BALANCE.weapons.katana.range,
  swingSpeed: BALANCE.weapons.katana.swingSpeed,
  knockback: BALANCE.weapons.katana.knockback,
  arcAngle: BALANCE.weapons.katana.arcAngle,
};

/**
 * Katana
 * - Très rapide
 * - Bonne portée
 * - Dégâts moyens
 * - Chance de critique élevée
 * - Pas de knockback
 */
export class Katana extends MeleeWeapon {
  private critChance: number;
  private critMultiplier: number;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, KATANA_CONFIG);
    this.critChance = BALANCE.weapons.katana.critChance;
    this.critMultiplier = BALANCE.weapons.katana.critMultiplier;
  }

  /**
   * Override pour ajouter les coups critiques fréquents
   */
  protected override onHit(zombies: Zombie[], _direction: Phaser.Math.Vector2): void {
    for (const zombie of zombies) {
      // Le katana a une chance de crit élevée
      const isCrit = Math.random() < this.critChance;
      const damage = isCrit ? this.config.damage * this.critMultiplier : this.config.damage;

      // Émettre l'événement de hit pour la télémétrie
      this.scene.events.emit('weaponHit', { weapon: this.config.name, damage, isCrit });

      // Infliger les dégâts
      zombie.takeDamage(damage);

      // Pas de knockback pour le katana (style précis)

      // Effet d'impact
      if (isCrit) {
        this.createCritEffect(zombie.x, zombie.y);
      } else {
        this.createHitEffect(zombie.x, zombie.y);
      }
    }
  }

  /**
   * Override de l'effet visuel de l'arc - rapide et élégant
   */
  protected override drawSwingArc(centerAngle: number): void {
    if (!this.arcGraphics) return;

    this.arcGraphics.clear();
    this.arcGraphics.lineStyle(2, 0xffffff, 1);
    this.arcGraphics.fillStyle(0x88ccff, 0.3);

    const halfArc = Phaser.Math.DegToRad(this.config.arcAngle / 2);
    const startAngle = centerAngle - halfArc;
    const endAngle = centerAngle + halfArc;

    // Arc fin et élégant
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

    // Animation de slash très rapide
    this.scene.tweens.add({
      targets: this.arcGraphics,
      alpha: 0,
      duration: this.config.swingSpeed * 0.3,
      onComplete: () => {
        if (this.arcGraphics) {
          this.arcGraphics.alpha = 1;
        }
      },
    });
  }

  /**
   * Override de l'effet d'impact - slash net
   */
  protected override createHitEffect(x: number, y: number): void {
    // Ligne de slash
    const slash = this.scene.add.graphics();
    slash.lineStyle(2, 0x88ccff, 0.9);

    const angle = Math.random() * Math.PI;
    const length = 30;
    slash.beginPath();
    slash.moveTo(x - Math.cos(angle) * length, y - Math.sin(angle) * length);
    slash.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    slash.strokePath();

    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      duration: 80,
      onComplete: () => {
        slash.destroy();
      },
    });
  }

  /**
   * Effet de coup critique - double slash
   */
  private createCritEffect(x: number, y: number): void {
    // Double ligne de slash en X
    const slash = this.scene.add.graphics();
    slash.lineStyle(3, 0xffcc00, 1);

    // Slash 1
    const angle1 = Math.PI / 4;
    const length = 35;
    slash.beginPath();
    slash.moveTo(x - Math.cos(angle1) * length, y - Math.sin(angle1) * length);
    slash.lineTo(x + Math.cos(angle1) * length, y + Math.sin(angle1) * length);
    slash.strokePath();

    // Slash 2
    const angle2 = -Math.PI / 4;
    slash.beginPath();
    slash.moveTo(x - Math.cos(angle2) * length, y - Math.sin(angle2) * length);
    slash.lineTo(x + Math.cos(angle2) * length, y + Math.sin(angle2) * length);
    slash.strokePath();

    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.5,
      duration: 150,
      onComplete: () => {
        slash.destroy();
      },
    });

    // Texte "CRIT!"
    const critText = this.scene.add.text(x, y - 25, 'CRIT!', {
      fontSize: '16px',
      color: '#ffcc00',
      fontStyle: 'bold',
    });
    critText.setOrigin(0.5);

    this.scene.tweens.add({
      targets: critText,
      y: critText.y - 25,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        critText.destroy();
      },
    });
  }
}
