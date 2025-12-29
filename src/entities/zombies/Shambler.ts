import type { GameScene } from '@scenes/GameScene';
import { Zombie, ZombieConfig } from './Zombie';
import { ASSET_KEYS } from '@config/assets.manifest';

/**
 * Configuration du Shambler
 */
const SHAMBLER_CONFIG: ZombieConfig = {
  type: 'shambler',
  texture: ASSET_KEYS.SHAMBLER,
  maxHealth: 30,
  speed: 60,
  damage: 10,
  detectionRange: 300,
  attackRange: 35,
  attackCooldown: 1200,
  scoreValue: 10,
};

/**
 * Shambler - Zombie de base
 * Lent mais résistant, attaque en mêlée
 */
export class Shambler extends Zombie {
  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, SHAMBLER_CONFIG);
    this.onSpawn();
  }

  /**
   * Comportement lors du spawn
   */
  protected onSpawn(): void {
    // Le Shambler est immédiatement en mode chasse
    // Pas de comportement spécial au spawn
  }

  /**
   * Réinitialise le Shambler
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);
    // Réinitialiser les propriétés spécifiques au Shambler si nécessaire
  }
}
