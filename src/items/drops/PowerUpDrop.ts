import { Drop } from './Drop';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { PowerUpType } from '@items/powerups';
import { PowerUpSystem } from '@systems/PowerUpSystem';
import { BALANCE } from '@config/balance';

/**
 * Drop de power-up
 *
 * Quand le joueur collecte ce drop, il active un power-up aléatoire.
 * La couleur du drop correspond au type de power-up qu'il contient.
 *
 * Power-ups:
 * - Rage (10s): Dégâts x2 (rouge)
 * - Freeze (8s): Ennemis ralentis 70% (bleu)
 * - Ghost (5s): Intangibilité (violet clair)
 * - Magnet (12s): Attire tous les drops (orange)
 * - Nuke (instant): Tue tous les ennemis à l'écran (jaune)
 */
export class PowerUpDrop extends Drop {
  private powerUpType: PowerUpType;
  private pulseAnim: Phaser.Tweens.Tween | null = null;

  constructor(scene: GameScene, x: number, y: number, powerUpType?: PowerUpType) {
    // Obtenir la vague actuelle pour la sélection de power-up
    const currentWave = scene.getWaveSystem?.()?.getCurrentWave() ?? 1;

    // Sélectionner le type de power-up
    const selectedType = powerUpType || PowerUpSystem.selectRandomPowerUpType(currentWave);

    // Obtenir la couleur associée au type
    const color = BALANCE.powerUps[selectedType].color;

    super(scene, x, y, 'powerUp', color);

    this.powerUpType = selectedType;

    // Les drops de power-up sont légèrement plus grands et brillants
    this.setDisplaySize(20, 20);

    // Effet de pulsation pour indiquer que c'est un power-up
    this.pulseAnim = this.scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.2 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Applique l'effet du power-up au joueur
   */
  protected applyEffect(_player: Player): void {
    // Activer le power-up via le PowerUpSystem
    const powerUpSystem = this.gameScene.getPowerUpSystem?.();

    if (powerUpSystem) {
      // Émettre l'événement de collecte pour que le PowerUpSystem l'active
      this.gameScene.events.emit('powerup:collect', {
        powerupType: this.powerUpType,
      });
    } else {
      console.warn(`[PowerUpDrop] PowerUpSystem not available, power-up ${this.powerUpType} not activated`);
    }
  }

  /**
   * Retourne la durée du power-up en ms
   */
  private getPowerUpDuration(): number {
    return BALANCE.powerUps[this.powerUpType].duration;
  }

  /**
   * Retourne la valeur du drop (durée du power-up)
   */
  protected getValue(): number {
    return this.getPowerUpDuration();
  }

  /**
   * Retourne le type de power-up
   */
  public getPowerUpType(): PowerUpType {
    return this.powerUpType;
  }

  /**
   * Nettoie les ressources
   */
  public deactivate(): void {
    if (this.pulseAnim) {
      this.pulseAnim.stop();
      this.pulseAnim = null;
    }
    super.deactivate();
  }
}

// Re-export PowerUpType for backward compatibility
export type { PowerUpType } from '@items/powerups';
