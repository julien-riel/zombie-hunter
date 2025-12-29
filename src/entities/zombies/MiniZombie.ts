import type { GameScene } from '@scenes/GameScene';
import { Zombie, ZombieConfig } from './Zombie';
import { ASSET_KEYS } from '@config/assets.manifest';
import { BALANCE } from '@config/balance';

/**
 * Configuration du MiniZombie (spawn par Splitter)
 * Utilise les stats mini du Splitter
 */
const MINI_CONFIG: ZombieConfig = {
  type: 'splitter', // Utilise le type splitter pour le tracking
  texture: ASSET_KEYS.SHAMBLER, // Réutilise la texture du Shambler en plus petit
  maxHealth: BALANCE.zombies.splitter.miniHealth,
  speed: BALANCE.zombies.splitter.miniSpeed,
  damage: BALANCE.zombies.splitter.damage / 2, // Dégâts réduits
  detectionRange: 250,
  attackRange: 30,
  attackCooldown: 800,
  scoreValue: 5, // Peu de points
};

/**
 * MiniZombie - Petit zombie rapide spawné par le Splitter
 *
 * Caractéristiques:
 * - HP faible (10), vitesse élevée (120)
 * - Version réduite du zombie de base
 * - Spawné quand un Splitter meurt
 */
export class MiniZombie extends Zombie {
  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, MINI_CONFIG);
    this.onSpawn();
  }

  /**
   * Comportement lors du spawn
   */
  protected onSpawn(): void {
    // Le MiniZombie est plus petit
    this.setScale(0.5);

    // Hitbox réduite
    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setSize(16, 16);
    }

    // Teinte légèrement différente
    this.setTint(0xddffdd);
  }

  /**
   * Réinitialise le MiniZombie pour réutilisation (pooling)
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);
    this.setScale(0.5);
    this.setTint(0xddffdd);

    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setSize(16, 16);
    }
  }
}
