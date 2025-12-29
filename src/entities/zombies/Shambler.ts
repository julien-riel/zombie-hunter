import type { GameScene } from '@scenes/GameScene';
import { Zombie, ZombieConfig } from './Zombie';
import { ASSET_KEYS } from '@config/assets.manifest';
import { BALANCE } from '@config/balance';

/**
 * Configuration du Shambler depuis balance.ts
 */
const SHAMBLER_CONFIG: ZombieConfig = {
  type: 'shambler',
  texture: ASSET_KEYS.SHAMBLER,
  maxHealth: BALANCE.zombies.shambler.health,
  speed: BALANCE.zombies.shambler.speed,
  damage: BALANCE.zombies.shambler.damage,
  detectionRange: BALANCE.zombies.shambler.detectionRange,
  attackRange: BALANCE.zombies.shambler.attackRange,
  attackCooldown: BALANCE.zombies.shambler.attackCooldown,
  scoreValue: BALANCE.zombies.shambler.scoreValue,
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
