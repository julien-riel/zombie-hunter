import { Drop } from './Drop';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Couleur du drop de power-up (violet)
 */
const POWERUP_COLOR = 0x9932cc;

/**
 * Types de power-ups disponibles
 * Sera étendu dans la Phase 6.3
 */
export type PowerUpType = 'rage' | 'freeze' | 'ghost' | 'magnet' | 'nuke';

/**
 * Drop de power-up (placeholder pour Phase 6.3)
 *
 * Ce drop contiendra un power-up aléatoire qui sera activé
 * quand le joueur le collecte.
 *
 * Power-ups prévus:
 * - Rage (10s): Dégâts x2
 * - Freeze (8s): Ennemis ralentis 70%
 * - Ghost (5s): Intangibilité
 * - Magnet (12s): Attire tous les drops
 * - Nuke (instant): Tue tous les ennemis à l'écran
 */
export class PowerUpDrop extends Drop {
  private powerUpType: PowerUpType;

  constructor(scene: GameScene, x: number, y: number, powerUpType?: PowerUpType) {
    super(scene, x, y, 'powerUp', POWERUP_COLOR);

    // Pour l'instant, type aléatoire si non spécifié
    this.powerUpType = powerUpType || this.selectRandomPowerUp();

    // Les drops de power-up sont légèrement plus grands et brillants
    this.setDisplaySize(20, 20);

    // Effet de pulsation pour indiquer que c'est un power-up
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.2 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Sélectionne un power-up aléatoire
   * TODO: Implémenter les probabilités par rareté dans Phase 6.3
   */
  private selectRandomPowerUp(): PowerUpType {
    const types: PowerUpType[] = ['rage', 'freeze', 'ghost', 'magnet', 'nuke'];
    // Pour l'instant, distribution uniforme (sauf nuke qui est rare)
    const weights = [0.25, 0.25, 0.2, 0.25, 0.05];

    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return types[i];
      }
    }

    return 'rage';
  }

  /**
   * Applique l'effet du power-up au joueur
   * TODO: Implémenter le PowerUpSystem dans Phase 6.3
   */
  protected applyEffect(player: Player): void {
    // Placeholder: émettre l'événement de power-up
    // Le PowerUpSystem (Phase 6.3) écoutera cet événement

    this.gameScene.events.emit('powerup:activate', {
      powerupType: this.powerUpType,
      duration: this.getPowerUpDuration(),
    });

    // Log pour debug
    console.log(`[PowerUpDrop] Power-up ${this.powerUpType} collected! (Implementation pending Phase 6.3)`);

    // Placeholder: Pour l'instant, juste un effet visuel sur le joueur
    this.showPlaceholderEffect(player);
  }

  /**
   * Affiche un effet visuel placeholder
   */
  private showPlaceholderEffect(player: Player): void {
    // Flash de couleur sur le joueur
    player.setTint(POWERUP_COLOR);
    this.scene.time.delayedCall(500, () => {
      player.clearTint();
    });
  }

  /**
   * Retourne la durée du power-up en ms
   */
  private getPowerUpDuration(): number {
    const durations: Record<PowerUpType, number> = {
      rage: 10000,
      freeze: 8000,
      ghost: 5000,
      magnet: 12000,
      nuke: 0, // Instant
    };
    return durations[this.powerUpType];
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
}
