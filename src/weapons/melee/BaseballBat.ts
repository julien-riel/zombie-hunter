import Phaser from 'phaser';
import { MeleeWeapon, MeleeConfig } from './MeleeWeapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration de la batte de baseball
 */
const BAT_CONFIG: MeleeConfig = {
  name: 'Batte',
  damage: BALANCE.weapons.baseballBat.damage,
  range: BALANCE.weapons.baseballBat.range,
  swingSpeed: BALANCE.weapons.baseballBat.swingSpeed,
  knockback: BALANCE.weapons.baseballBat.knockback,
  arcAngle: BALANCE.weapons.baseballBat.arcAngle,
};

/**
 * Batte de baseball
 * - Bon équilibre portée/vitesse
 * - Knockback moyen
 * - Chance de stun
 */
export class BaseballBat extends MeleeWeapon {
  private stunChance: number;
  private stunDuration: number;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, BAT_CONFIG);
    this.stunChance = BALANCE.weapons.baseballBat.stunChance;
    this.stunDuration = BALANCE.weapons.baseballBat.stunDuration;
  }

  /**
   * Override pour ajouter la chance de stun
   */
  protected override onHit(zombies: Zombie[], direction: Phaser.Math.Vector2): void {
    for (const zombie of zombies) {
      // Infliger les dégâts
      zombie.takeDamage(this.config.damage);

      // Appliquer le knockback
      if (this.config.knockback > 0) {
        this.applyKnockback(zombie, direction);
      }

      // Chance de stun
      if (Math.random() < this.stunChance) {
        this.applyStun(zombie);
      }

      // Effet d'impact
      this.createHitEffect(zombie.x, zombie.y);
    }
  }

  /**
   * Applique un effet de stun au zombie
   */
  private applyStun(zombie: Zombie): void {
    // Stopper le mouvement
    const body = zombie.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
    }

    // Marquer comme étourdi via les données
    zombie.setData('stunned', true);

    // Effet visuel de stun (étoiles)
    zombie.setTint(0xffff00);
    const stars = this.scene.add.text(zombie.x, zombie.y - 30, '★★★', {
      fontSize: '16px',
      color: '#ffff00',
    });
    stars.setOrigin(0.5);

    // Animation des étoiles
    this.scene.tweens.add({
      targets: stars,
      y: stars.y - 10,
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
   * Override de l'effet visuel d'impact
   */
  protected override createHitEffect(x: number, y: number): void {
    // Effet de "WHACK!"
    const flash = this.scene.add.circle(x, y, 20, 0xffcc00, 0.9);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.5,
      duration: 200,
      onComplete: () => {
        flash.destroy();
      },
    });
  }
}
