import type { GameScene } from '@scenes/GameScene';
import { Zombie, ZombieConfig } from './Zombie';
import { ASSET_KEYS } from '@config/assets.manifest';
import { BALANCE } from '@config/balance';

/**
 * Configuration du Bomber depuis balance.ts
 */
const BOMBER_CONFIG: ZombieConfig = {
  type: 'bomber',
  texture: ASSET_KEYS.BOMBER,
  maxHealth: BALANCE.zombies.bomber.health,
  speed: BALANCE.zombies.bomber.speed,
  damage: BALANCE.zombies.bomber.damage,
  detectionRange: BALANCE.zombies.bomber.detectionRange,
  attackRange: BALANCE.zombies.bomber.attackRange,
  attackCooldown: BALANCE.zombies.bomber.attackCooldown,
  scoreValue: BALANCE.zombies.bomber.scoreValue,
};

/**
 * Bomber - Zombie explosif
 *
 * Caractéristiques selon le GDD:
 * - HP moyen (40), vitesse élevée (90)
 * - Explose à la mort, infligeant des dégâts de zone
 * - Chain reaction avec les autres Bombers
 */
export class Bomber extends Zombie {
  /** Dégâts de l'explosion */
  private readonly explosionDamage: number = BALANCE.zombies.bomber.explosionDamage;
  /** Rayon de l'explosion */
  private readonly explosionRadius: number = BALANCE.zombies.bomber.explosionRadius;
  /** Indique si le Bomber est en train d'exploser (évite double explosion) */
  private isExploding: boolean = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, BOMBER_CONFIG);
    this.onSpawn();
  }

  /**
   * Comportement lors du spawn
   */
  protected onSpawn(): void {
    // Le Bomber a une teinte rouge/orange pour indiquer son danger
    this.setTint(0xff6600);
  }

  /**
   * Override de la mort pour déclencher l'explosion
   */
  protected die(): void {
    if (this.isExploding) return;

    this.isExploding = true;
    this.stateMachine.setDead();

    // Déclencher l'explosion
    this.explode();

    // Émettre un événement de mort
    this.scene.events.emit('zombieDeath', this);
  }

  /**
   * Fait exploser le Bomber
   */
  private explode(): void {
    const x = this.x;
    const y = this.y;

    // Effet visuel d'explosion
    this.createExplosionEffect(x, y);

    // Infliger des dégâts au joueur si à portée
    this.damagePlayer(x, y);

    // Déclencher les chain reactions avec les autres Bombers
    this.triggerChainReaction(x, y);

    // Émettre un événement d'explosion
    this.scene.events.emit('zombie:exploded', { x, y, radius: this.explosionRadius });

    // Animation de mort
    this.playDeathAnimation();
  }

  /**
   * Crée l'effet visuel d'explosion
   */
  private createExplosionEffect(x: number, y: number): void {
    // Cercle d'explosion principal
    const explosion = this.scene.add.circle(x, y, 10, 0xff4400, 1);

    this.scene.tweens.add({
      targets: explosion,
      radius: this.explosionRadius,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        explosion.destroy();
      },
    });

    // Onde de choc
    const shockwave = this.scene.add.circle(x, y, 10, 0xffffff, 0.5);
    shockwave.setStrokeStyle(3, 0xff6600);

    this.scene.tweens.add({
      targets: shockwave,
      radius: this.explosionRadius * 1.2,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        shockwave.destroy();
      },
    });

    // Screen shake léger
    this.scene.cameras.main.shake(100, 0.01);
  }

  /**
   * Inflige des dégâts au joueur s'il est dans le rayon d'explosion
   */
  private damagePlayer(x: number, y: number): void {
    const player = this.scene.getPlayer();
    if (!player || !player.active) return;

    const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);

    if (distance <= this.explosionRadius) {
      // Dégâts décroissants avec la distance
      const damageMultiplier = 1 - (distance / this.explosionRadius) * 0.5;
      const finalDamage = Math.round(this.explosionDamage * damageMultiplier);

      player.takeDamage(finalDamage);

      // Appliquer aussi un knockback
      if (typeof player.applyKnockback === 'function') {
        player.applyKnockback(x, y, 200);
      }
    }
  }

  /**
   * Déclenche les chain reactions avec les autres Bombers
   */
  private triggerChainReaction(x: number, y: number): void {
    const activeZombies = this.scene.getActiveZombies();

    for (const zombie of activeZombies) {
      if (zombie === this) continue;
      if (!zombie.active) continue;
      if (zombie.getType() !== 'bomber') continue;

      const distance = Phaser.Math.Distance.Between(x, y, zombie.x, zombie.y);

      if (distance <= this.explosionRadius) {
        // Infliger des dégâts au Bomber voisin
        // Cela déclenchera son explosion s'il meurt
        zombie.takeDamage(this.explosionDamage);
      }
    }
  }

  /**
   * Override de l'animation de mort
   */
  protected playDeathAnimation(): void {
    // Désactiver le corps physique immédiatement
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    // Animation plus rapide pour le Bomber (déjà explosé)
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.5,
      duration: 150,
      onComplete: () => {
        this.deactivate();
      },
    });
  }

  /**
   * Réinitialise le Bomber pour réutilisation (pooling)
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);
    this.isExploding = false;
    this.setTint(0xff6600);
    this.setScale(1);
  }
}
