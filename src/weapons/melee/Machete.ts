import { MeleeWeapon, MeleeConfig } from './MeleeWeapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration de la machette
 */
const MACHETE_CONFIG: MeleeConfig = {
  name: 'Machette',
  damage: BALANCE.weapons.machete.damage,
  range: BALANCE.weapons.machete.range,
  swingSpeed: BALANCE.weapons.machete.swingSpeed,
  knockback: BALANCE.weapons.machete.knockback,
  arcAngle: BALANCE.weapons.machete.arcAngle,
};

/**
 * Machette
 * - Très rapide
 * - Portée réduite
 * - Dégâts supérieurs
 * - Pas de knockback
 */
export class Machete extends MeleeWeapon {
  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, MACHETE_CONFIG);
  }

  /**
   * Override de l'effet visuel de l'arc - plus tranchant
   */
  protected override drawSwingArc(centerAngle: number): void {
    if (!this.arcGraphics) return;

    this.arcGraphics.clear();
    this.arcGraphics.lineStyle(4, 0xcccccc, 0.9);
    this.arcGraphics.fillStyle(0xff3333, 0.4);

    const halfArc = Phaser.Math.DegToRad(this.config.arcAngle / 2);
    const startAngle = centerAngle - halfArc;
    const endAngle = centerAngle + halfArc;

    // Dessiner un arc plus fin et tranchant
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

    // Animation de slash rapide
    this.scene.tweens.add({
      targets: this.arcGraphics,
      alpha: 0,
      duration: this.config.swingSpeed * 0.4,
      onComplete: () => {
        if (this.arcGraphics) {
          this.arcGraphics.alpha = 1;
        }
      },
    });
  }

  /**
   * Override de l'effet d'impact - plus sanglant
   */
  protected override createHitEffect(x: number, y: number): void {
    // Effet de tranche
    const slash = this.scene.add.graphics();
    slash.lineStyle(3, 0xff0000, 0.9);

    // Ligne de slash
    const angle = Math.random() * Math.PI;
    const length = 25;
    slash.beginPath();
    slash.moveTo(x - Math.cos(angle) * length, y - Math.sin(angle) * length);
    slash.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    slash.strokePath();

    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        slash.destroy();
      },
    });

    // Particules de sang
    for (let i = 0; i < 3; i++) {
      const blood = this.scene.add.circle(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 20,
        4,
        0xff0000,
        0.8
      );

      this.scene.tweens.add({
        targets: blood,
        y: blood.y + 30,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        onComplete: () => {
          blood.destroy();
        },
      });
    }
  }
}
