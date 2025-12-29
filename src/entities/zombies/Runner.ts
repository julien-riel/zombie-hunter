import type { GameScene } from '@scenes/GameScene';
import { Zombie, ZombieConfig } from './Zombie';
import { ASSET_KEYS } from '@config/assets.manifest';

/**
 * Configuration du Runner
 */
const RUNNER_CONFIG: ZombieConfig = {
  type: 'runner',
  texture: ASSET_KEYS.RUNNER,
  maxHealth: 15,
  speed: 150,
  damage: 8,
  detectionRange: 500,
  attackRange: 30,
  attackCooldown: 800,
  scoreValue: 15,
};

/**
 * Runner - Zombie rapide
 * Rapide mais fragile, charge le joueur
 */
export class Runner extends Zombie {
  private isCharging: boolean = false;
  private chargeSpeedMultiplier: number = 1.5;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, RUNNER_CONFIG);
    this.onSpawn();
  }

  /**
   * Comportement lors du spawn
   */
  protected onSpawn(): void {
    // Le Runner démarre avec une détection étendue
  }

  /**
   * Met à jour le Runner
   */
  update(time: number, delta: number): void {
    if (!this.active) return;

    super.update(time, delta);

    // Vérifier si on doit charger
    this.updateCharge();
  }

  /**
   * Gère la mécanique de charge
   */
  private updateCharge(): void {
    const player = this.scene.getPlayer();
    if (!player || !player.active) return;

    const distance = this.movementComponent.distanceTo(player.x, player.y);

    // Activer la charge quand proche
    if (distance < 200 && !this.isCharging) {
      this.startCharge();
    } else if (distance >= 200 && this.isCharging) {
      this.stopCharge();
    }
  }

  /**
   * Démarre la charge
   */
  private startCharge(): void {
    this.isCharging = true;
    this.movementComponent.applySpeedBoost(this.chargeSpeedMultiplier, 2000);

    // Effet visuel de charge
    this.setTint(0xff6666);
  }

  /**
   * Arrête la charge
   */
  private stopCharge(): void {
    this.isCharging = false;
    this.clearTint();
  }

  /**
   * Réinitialise le Runner
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);
    this.isCharging = false;
  }
}
