import Phaser from 'phaser';
import { MeleeWeapon, MeleeConfig } from './MeleeWeapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration du marteau de forgeron
 */
const SLEDGEHAMMER_CONFIG: MeleeConfig = {
  name: 'Marteau',
  damage: BALANCE.weapons.sledgehammer.damage,
  range: BALANCE.weapons.sledgehammer.range,
  swingSpeed: BALANCE.weapons.sledgehammer.swingSpeed,
  knockback: BALANCE.weapons.sledgehammer.knockback,
  arcAngle: BALANCE.weapons.sledgehammer.arcAngle,
};

/**
 * Marteau de forgeron (Sledgehammer)
 * - Très lent
 * - Dégâts massifs
 * - Knockback énorme
 * - Stun garanti
 * - Large arc
 */
export class Sledgehammer extends MeleeWeapon {
  private stunDuration: number;
  private groundShakeIntensity: number;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, SLEDGEHAMMER_CONFIG);
    this.stunDuration = BALANCE.weapons.sledgehammer.stunDuration;
    this.groundShakeIntensity = BALANCE.weapons.sledgehammer.groundShakeIntensity;
  }

  /**
   * Override pour ajouter le stun garanti et le shake
   */
  protected override onHit(zombies: Zombie[], direction: Phaser.Math.Vector2): void {
    // Shake de la caméra si au moins un zombie est touché
    if (zombies.length > 0) {
      this.scene.cameras.main.shake(100, this.groundShakeIntensity);
    }

    for (const zombie of zombies) {
      // Émettre l'événement de hit pour la télémétrie
      this.scene.events.emit('weaponHit', { weapon: this.config.name, damage: this.config.damage });

      // Infliger les dégâts
      zombie.takeDamage(this.config.damage);

      // Appliquer le knockback massif
      this.applyMassiveKnockback(zombie, direction);

      // Appliquer le stun garanti
      this.applyStun(zombie);

      // Effet d'impact
      this.createHitEffect(zombie.x, zombie.y);
    }
  }

  /**
   * Knockback massif spécifique au marteau
   */
  private applyMassiveKnockback(zombie: Zombie, direction: Phaser.Math.Vector2): void {
    const body = zombie.body as Phaser.Physics.Arcade.Body;
    if (body) {
      // Knockback beaucoup plus fort que la normale
      body.setVelocity(
        direction.x * this.config.knockback,
        direction.y * this.config.knockback
      );
    }
  }

  /**
   * Applique un effet de stun au zombie
   */
  private applyStun(zombie: Zombie): void {
    const body = zombie.body as Phaser.Physics.Arcade.Body;
    if (body) {
      // Après le knockback initial, stopper le mouvement
      this.scene.time.delayedCall(150, () => {
        if (zombie.active) {
          body.setVelocity(0, 0);
        }
      });
    }

    // Marquer comme étourdi
    zombie.setData('stunned', true);

    // Effet visuel de stun
    zombie.setTint(0xff9900);
    const stars = this.scene.add.text(zombie.x, zombie.y - 35, '★★★★', {
      fontSize: '20px',
      color: '#ff9900',
    });
    stars.setOrigin(0.5);

    // Animation des étoiles
    this.scene.tweens.add({
      targets: stars,
      y: stars.y - 15,
      alpha: 0,
      duration: this.stunDuration,
      onComplete: () => {
        stars.destroy();
      },
    });

    // Fin du stun
    this.scene.time.delayedCall(this.stunDuration, () => {
      if (zombie.active) {
        zombie.setData('stunned', false);
        zombie.clearTint();
      }
    });
  }

  /**
   * Override de l'effet visuel de l'arc - impact massif
   */
  protected override drawSwingArc(centerAngle: number): void {
    if (!this.arcGraphics) return;

    this.arcGraphics.clear();
    this.arcGraphics.lineStyle(8, 0x666666, 0.9);
    this.arcGraphics.fillStyle(0x888888, 0.5);

    const halfArc = Phaser.Math.DegToRad(this.config.arcAngle / 2);
    const startAngle = centerAngle - halfArc;
    const endAngle = centerAngle + halfArc;

    // Arc large et épais
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

    // Animation de swing très lourd
    this.scene.tweens.add({
      targets: this.arcGraphics,
      alpha: 0,
      duration: this.config.swingSpeed * 0.8,
      onComplete: () => {
        if (this.arcGraphics) {
          this.arcGraphics.alpha = 1;
        }
      },
    });
  }

  /**
   * Override de l'effet d'impact - onde de choc
   */
  protected override createHitEffect(x: number, y: number): void {
    // Cercle d'onde de choc
    const shockwave = this.scene.add.circle(x, y, 10, 0xaaaaaa, 0.8);

    this.scene.tweens.add({
      targets: shockwave,
      radius: 50,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        shockwave.destroy();
      },
    });

    // Impact central
    const impact = this.scene.add.circle(x, y, 20, 0xff6600, 0.9);

    this.scene.tweens.add({
      targets: impact,
      alpha: 0,
      scale: 2.5,
      duration: 250,
      onComplete: () => {
        impact.destroy();
      },
    });

    // Débris volants
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.5;
      const debris = this.scene.add.circle(
        x,
        y,
        3 + Math.random() * 3,
        0x888888,
        0.9
      );

      this.scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40,
        alpha: 0,
        scale: 0.3,
        duration: 300,
        onComplete: () => {
          debris.destroy();
        },
      });
    }
  }
}
