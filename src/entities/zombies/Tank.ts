import type { GameScene } from '@scenes/GameScene';
import { Zombie, ZombieConfig } from './Zombie';
import { ASSET_KEYS } from '@config/assets.manifest';
import { BALANCE } from '@config/balance';

/**
 * Configuration du Tank depuis balance.ts
 */
const TANK_CONFIG: ZombieConfig = {
  type: 'tank',
  texture: ASSET_KEYS.TANK,
  maxHealth: BALANCE.zombies.tank.health,
  speed: BALANCE.zombies.tank.speed,
  damage: BALANCE.zombies.tank.damage,
  detectionRange: BALANCE.zombies.tank.detectionRange,
  attackRange: BALANCE.zombies.tank.attackRange,
  attackCooldown: BALANCE.zombies.tank.attackCooldown,
  scoreValue: BALANCE.zombies.tank.scoreValue,
};

/**
 * Tank - Zombie massif et résistant
 *
 * Caractéristiques selon le GDD:
 * - HP très élevé (200), vitesse lente (40)
 * - Dégâts importants (25)
 * - Repousse le joueur au contact (knockback)
 * - Détruit les couvertures destructibles
 */
export class Tank extends Zombie {
  /** Force du knockback appliqué au joueur */
  private readonly knockbackForce: number = BALANCE.zombies.tank.knockbackForce;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, TANK_CONFIG);
    this.onSpawn();
  }

  /**
   * Comportement lors du spawn
   */
  protected onSpawn(): void {
    // Le Tank a une hitbox plus grande
    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setSize(40, 40);
    }

    // Appliquer une échelle légèrement plus grande
    this.setScale(1.3);
  }

  /**
   * Override de getDamage pour appliquer le knockback
   */
  public getDamage(): number {
    this.applyKnockbackToPlayer();
    return this.damage;
  }

  /**
   * Applique le knockback au joueur lors de l'attaque
   */
  private applyKnockbackToPlayer(): void {
    const player = this.scene.getPlayer();
    if (!player || !player.active) return;

    if (typeof player.applyKnockback === 'function') {
      player.applyKnockback(this.x, this.y, this.knockbackForce);
    }
  }

  /**
   * Réinitialise le Tank pour réutilisation (pooling)
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);

    // Réappliquer la hitbox et l'échelle
    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setSize(40, 40);
    }
    this.setScale(1.3);
  }
}
