import { PowerUp, PowerUpType, PowerUpRarity } from './PowerUp';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Power-up Rage
 *
 * Effet: Multiplie les dégâts du joueur par 2 pendant 10 secondes.
 * Rareté: Commun
 *
 * Effets visuels:
 * - Aura rouge autour du joueur
 * - Teinte rouge sur le joueur
 */
export class RagePowerUp extends PowerUp {
  public readonly type: PowerUpType = 'rage';
  public readonly duration: number;
  public readonly rarity: PowerUpRarity;
  public readonly color: number;
  public readonly name: string = 'Rage';
  public readonly description: string = 'Dégâts x2';

  private readonly damageMultiplier: number;
  private auraGraphics: Phaser.GameObjects.Graphics | null = null;
  private auraTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super();
    const config = BALANCE.powerUps.rage;
    this.duration = config.duration;
    this.rarity = config.rarity;
    this.color = config.color;
    this.damageMultiplier = config.damageMultiplier;
  }

  protected onActivate(player: Player, scene: GameScene): void {
    // Appliquer le multiplicateur de dégâts via le PowerUpSystem
    const powerUpSystem = scene.getPowerUpSystem?.();
    if (powerUpSystem) {
      powerUpSystem.setDamageMultiplier(this.damageMultiplier);
    }

    // Effet visuel: teinte rouge sur le joueur
    player.setTint(this.color);

    // Créer l'aura de rage
    this.createAura(player, scene);
  }

  protected onDeactivate(player: Player, scene: GameScene): void {
    // Retirer le multiplicateur de dégâts
    const powerUpSystem = scene.getPowerUpSystem?.();
    if (powerUpSystem) {
      powerUpSystem.setDamageMultiplier(1);
    }

    // Retirer la teinte
    player.clearTint();

    // Détruire l'aura
    this.destroyAura();
  }

  protected onUpdate(_delta: number, player: Player, _scene: GameScene): void {
    // Mettre à jour la position de l'aura pour suivre le joueur
    if (this.auraGraphics) {
      this.auraGraphics.setPosition(player.x, player.y);
    }
  }

  /**
   * Crée l'effet d'aura autour du joueur
   */
  private createAura(player: Player, scene: GameScene): void {
    this.auraGraphics = scene.add.graphics();
    this.auraGraphics.setDepth(player.depth - 1);

    // Dessiner l'aura
    this.drawAura(1);

    // Animation de pulsation
    const auraTarget = { scale: 1 };
    this.auraTween = scene.tweens.add({
      targets: auraTarget,
      scale: 1.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.drawAura(auraTarget.scale);
      },
    });
  }

  /**
   * Dessine l'aura avec un scale donné
   */
  private drawAura(scale: number): void {
    if (!this.auraGraphics) return;

    this.auraGraphics.clear();
    this.auraGraphics.lineStyle(3, this.color, 0.5 * scale);
    this.auraGraphics.strokeCircle(0, 0, 30 * scale);
    this.auraGraphics.lineStyle(2, this.color, 0.3 * scale);
    this.auraGraphics.strokeCircle(0, 0, 40 * scale);
  }

  /**
   * Détruit l'effet d'aura
   */
  private destroyAura(): void {
    if (this.auraTween) {
      this.auraTween.stop();
      this.auraTween = null;
    }

    if (this.auraGraphics) {
      this.auraGraphics.destroy();
      this.auraGraphics = null;
    }
  }
}
