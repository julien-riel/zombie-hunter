import { PowerUp, PowerUpType, PowerUpRarity } from './PowerUp';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Power-up Magnet
 *
 * Effet: Augmente considérablement le rayon de collecte des drops
 * et les attire activement vers le joueur pendant 12 secondes.
 * Rareté: Commun
 *
 * Effets visuels:
 * - Lignes d'attraction vers les drops
 * - Aura orange autour du joueur
 */
export class MagnetPowerUp extends PowerUp {
  public readonly type: PowerUpType = 'magnet';
  public readonly duration: number;
  public readonly rarity: PowerUpRarity;
  public readonly color: number;
  public readonly name: string = 'Magnet';
  public readonly description: string = 'Attire les drops';

  private readonly magnetRadius: number;
  private readonly magnetSpeed: number;
  private auraGraphics: Phaser.GameObjects.Graphics | null = null;
  private auraTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super();
    const config = BALANCE.powerUps.magnet;
    this.duration = config.duration;
    this.rarity = config.rarity;
    this.color = config.color;
    this.magnetRadius = config.magnetRadius;
    this.magnetSpeed = config.magnetSpeed;
  }

  protected onActivate(player: Player, scene: GameScene): void {
    // Activer le mode magnet via le PowerUpSystem
    const powerUpSystem = scene.getPowerUpSystem?.();
    if (powerUpSystem) {
      powerUpSystem.setMagnetMode(true, this.magnetRadius, this.magnetSpeed);
    }

    // Effet visuel: aura magnétique
    this.createMagnetAura(player, scene);
  }

  protected onDeactivate(_player: Player, scene: GameScene): void {
    // Désactiver le mode magnet
    const powerUpSystem = scene.getPowerUpSystem?.();
    if (powerUpSystem) {
      powerUpSystem.setMagnetMode(false, 0, 0);
    }

    // Détruire l'aura
    this.destroyMagnetAura();
  }

  protected onUpdate(_delta: number, player: Player, _scene: GameScene): void {
    // Mettre à jour la position de l'aura
    if (this.auraGraphics) {
      this.auraGraphics.setPosition(player.x, player.y);
    }
  }

  /**
   * Crée l'aura magnétique autour du joueur
   */
  private createMagnetAura(player: Player, scene: GameScene): void {
    this.auraGraphics = scene.add.graphics();
    this.auraGraphics.setDepth(player.depth - 1);
    this.auraGraphics.setPosition(player.x, player.y);

    // Dessiner l'aura initiale
    this.drawMagnetAura(1);

    // Animation de pulsation avec rotation
    let rotation = 0;
    const animTarget = { scale: 1, rotation: 0 };
    this.auraTween = scene.tweens.add({
      targets: animTarget,
      scale: { from: 0.8, to: 1.2 },
      rotation: Math.PI * 2,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const scale = tween.getValue() ?? 1;
        rotation = animTarget.rotation;
        this.drawMagnetAura(scale, rotation);
      },
    });
  }

  /**
   * Dessine l'aura magnétique
   */
  private drawMagnetAura(scale: number, rotation: number = 0): void {
    if (!this.auraGraphics) return;

    this.auraGraphics.clear();

    // Cercle de rayon d'attraction
    this.auraGraphics.lineStyle(2, this.color, 0.3);
    this.auraGraphics.strokeCircle(0, 0, this.magnetRadius * scale);

    // Lignes de champ magnétique
    this.auraGraphics.lineStyle(1, this.color, 0.4);
    const numLines = 8;
    const innerRadius = 30 * scale;
    const outerRadius = 80 * scale;

    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2 + rotation;
      const startX = Math.cos(angle) * outerRadius;
      const startY = Math.sin(angle) * outerRadius;
      const endX = Math.cos(angle) * innerRadius;
      const endY = Math.sin(angle) * innerRadius;

      this.auraGraphics.beginPath();
      this.auraGraphics.moveTo(startX, startY);
      this.auraGraphics.lineTo(endX, endY);
      this.auraGraphics.strokePath();

      // Flèche vers l'intérieur
      const arrowSize = 5 * scale;
      const arrowAngle = angle + Math.PI;
      const arrowX = endX;
      const arrowY = endY;

      this.auraGraphics.beginPath();
      this.auraGraphics.moveTo(arrowX, arrowY);
      this.auraGraphics.lineTo(
        arrowX + Math.cos(arrowAngle - 0.5) * arrowSize,
        arrowY + Math.sin(arrowAngle - 0.5) * arrowSize
      );
      this.auraGraphics.moveTo(arrowX, arrowY);
      this.auraGraphics.lineTo(
        arrowX + Math.cos(arrowAngle + 0.5) * arrowSize,
        arrowY + Math.sin(arrowAngle + 0.5) * arrowSize
      );
      this.auraGraphics.strokePath();
    }

    // Cercle central brillant
    this.auraGraphics.lineStyle(3, this.color, 0.6 * scale);
    this.auraGraphics.strokeCircle(0, 0, 25 * scale);
  }

  /**
   * Détruit l'aura magnétique
   */
  private destroyMagnetAura(): void {
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
