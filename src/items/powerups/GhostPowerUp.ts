import { PowerUp, PowerUpType, PowerUpRarity } from './PowerUp';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Power-up Ghost
 *
 * Effet: Le joueur devient intangible pendant 5 secondes.
 * - Peut traverser les zombies
 * - Peut toujours tirer et toucher les ennemis
 * - Peut toujours être touché par les projectiles ennemis
 * Rareté: Rare
 *
 * Effets visuels:
 * - Joueur semi-transparent
 * - Effet de distorsion/ondulation
 */
export class GhostPowerUp extends PowerUp {
  public readonly type: PowerUpType = 'ghost';
  public readonly duration: number;
  public readonly rarity: PowerUpRarity;
  public readonly color: number;
  public readonly name: string = 'Ghost';
  public readonly description: string = 'Intangibilité';

  private originalAlpha: number = 1;
  private ghostTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super();
    const config = BALANCE.powerUps.ghost;
    this.duration = config.duration;
    this.rarity = config.rarity;
    this.color = config.color;
  }

  protected onActivate(player: Player, scene: GameScene): void {
    // Stocker l'alpha original
    this.originalAlpha = player.alpha;

    // Activer le mode ghost via le PowerUpSystem
    const powerUpSystem = scene.getPowerUpSystem?.();
    if (powerUpSystem) {
      powerUpSystem.setGhostMode(true);
    }

    // Effet visuel: semi-transparent
    player.setAlpha(0.4);
    player.setTint(this.color);

    // Animation d'ondulation
    this.createGhostEffect(player, scene);
  }

  protected onDeactivate(player: Player, scene: GameScene): void {
    // Désactiver le mode ghost
    const powerUpSystem = scene.getPowerUpSystem?.();
    if (powerUpSystem) {
      powerUpSystem.setGhostMode(false);
    }

    // Restaurer l'apparence
    player.setAlpha(this.originalAlpha);
    player.clearTint();

    // Arrêter l'animation
    this.stopGhostEffect();
  }

  /**
   * Crée l'effet visuel de fantôme
   */
  private createGhostEffect(player: Player, scene: GameScene): void {
    // Animation d'ondulation de l'alpha
    this.ghostTween = scene.tweens.add({
      targets: player,
      alpha: { from: 0.3, to: 0.5 },
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Arrête l'effet visuel de fantôme
   */
  private stopGhostEffect(): void {
    if (this.ghostTween) {
      this.ghostTween.stop();
      this.ghostTween = null;
    }
  }
}
