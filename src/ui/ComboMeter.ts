import Phaser from 'phaser';
import type { GameEventPayloads } from '@/types/events';

/**
 * Configuration du ComboMeter
 */
interface ComboMeterConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Composant UI pour afficher le combo
 *
 * Affiche:
 * - Le multiplicateur actuel (ex: "x2.3")
 * - Une barre de timeout qui se vide
 * - Animation de pulse à chaque kill
 * - Effet visuel spécial aux milestones (x5, x10)
 */
export class ComboMeter extends Phaser.GameObjects.Container {
  private config: ComboMeterConfig;

  // Éléments visuels
  private background!: Phaser.GameObjects.Rectangle;
  private timeoutBar!: Phaser.GameObjects.Rectangle;
  private timeoutBarBg!: Phaser.GameObjects.Rectangle;
  private multiplierText!: Phaser.GameObjects.Text;
  private streakText!: Phaser.GameObjects.Text;
  private glowEffect!: Phaser.GameObjects.Rectangle;

  // État
  private currentMultiplier: number = 1;
  private isActive: boolean = false;

  // Couleurs par niveau de combo
  private readonly comboColors: { threshold: number; color: number }[] = [
    { threshold: 1, color: 0xffffff },
    { threshold: 2, color: 0x00ff00 },
    { threshold: 3, color: 0x00ffff },
    { threshold: 5, color: 0xffff00 },
    { threshold: 7, color: 0xff8800 },
    { threshold: 9, color: 0xff0000 },
    { threshold: 10, color: 0xff00ff },
  ];

  constructor(scene: Phaser.Scene, config: ComboMeterConfig) {
    super(scene, config.x, config.y);

    this.config = config;

    this.createBackground();
    this.createTimeoutBar();
    this.createMultiplierText();
    this.createGlowEffect();

    // Ajouter au scene
    scene.add.existing(this);

    // Masquer par défaut (apparaît quand le combo commence)
    this.setAlpha(0);
  }

  /**
   * Crée le fond du compteur
   */
  private createBackground(): void {
    this.background = this.scene.add.rectangle(
      0,
      0,
      this.config.width,
      this.config.height,
      0x000000,
      0.7
    );
    this.background.setStrokeStyle(2, 0x444444);
    this.add(this.background);
  }

  /**
   * Crée la barre de timeout
   */
  private createTimeoutBar(): void {
    const barHeight = 6;
    const barY = this.config.height / 2 - barHeight / 2 + 15;

    // Fond de la barre
    this.timeoutBarBg = this.scene.add.rectangle(
      0,
      barY,
      this.config.width - 20,
      barHeight,
      0x333333
    );
    this.add(this.timeoutBarBg);

    // Barre de progression
    this.timeoutBar = this.scene.add.rectangle(
      0,
      barY,
      this.config.width - 20,
      barHeight,
      0x00ff00
    );
    this.add(this.timeoutBar);
  }

  /**
   * Crée le texte du multiplicateur
   */
  private createMultiplierText(): void {
    // Texte principal du multiplicateur
    this.multiplierText = this.scene.add.text(0, -8, 'x1.0', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.multiplierText.setOrigin(0.5);
    this.add(this.multiplierText);

    // Texte du streak (kills en série)
    this.streakText = this.scene.add.text(0, 20, '', {
      fontSize: '12px',
      color: '#aaaaaa',
    });
    this.streakText.setOrigin(0.5);
    this.add(this.streakText);
  }

  /**
   * Crée l'effet de glow pour les milestones
   */
  private createGlowEffect(): void {
    this.glowEffect = this.scene.add.rectangle(
      0,
      0,
      this.config.width + 10,
      this.config.height + 10,
      0xffffff,
      0
    );
    this.glowEffect.setStrokeStyle(4, 0xffffff, 0);
    this.add(this.glowEffect);

    // Mettre le glow derrière le background
    this.sendToBack(this.glowEffect);
  }

  /**
   * Met à jour l'affichage du combo
   */
  public updateCombo(multiplier: number, streak: number, timeoutProgress: number): void {
    this.currentMultiplier = multiplier;

    // Afficher/masquer selon l'état
    if (streak > 0 && !this.isActive) {
      this.show();
    } else if (streak === 0 && this.isActive) {
      this.hide();
    }

    // Mettre à jour le texte du multiplicateur
    this.multiplierText.setText(`x${multiplier.toFixed(1)}`);

    // Mettre à jour le texte du streak
    if (streak > 0) {
      this.streakText.setText(`${streak} kills`);
    }

    // Mettre à jour la barre de timeout
    const barWidth = (this.config.width - 20) * timeoutProgress;
    this.timeoutBar.width = barWidth;

    // Mettre à jour les couleurs selon le niveau
    this.updateColors();
  }

  /**
   * Met à jour les couleurs selon le niveau de combo
   */
  private updateColors(): void {
    const color = this.getColorForMultiplier(this.currentMultiplier);

    this.multiplierText.setColor(`#${color.toString(16).padStart(6, '0')}`);
    this.timeoutBar.setFillStyle(color);
    this.background.setStrokeStyle(2, color);
  }

  /**
   * Retourne la couleur correspondant au multiplicateur
   */
  private getColorForMultiplier(multiplier: number): number {
    let color = this.comboColors[0].color;

    for (const entry of this.comboColors) {
      if (multiplier >= entry.threshold) {
        color = entry.color;
      }
    }

    return color;
  }

  /**
   * Joue l'animation de kill (pulse)
   */
  public playKillPulse(): void {
    // Animation de scale
    this.scene.tweens.add({
      targets: this.multiplierText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      ease: 'Power2',
    });

    // Flash sur le background
    this.scene.tweens.add({
      targets: this.background,
      alpha: 0.9,
      duration: 50,
      yoyo: true,
    });
  }

  /**
   * Joue l'animation de milestone
   */
  public playMilestoneEffect(level: number): void {
    const color = this.getColorForMultiplier(level);

    // Flash de glow
    this.glowEffect.setStrokeStyle(4, color, 1);

    this.scene.tweens.add({
      targets: this.glowEffect,
      alpha: 1,
      duration: 200,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.glowEffect.setAlpha(0);
      },
    });

    // Animation de scale plus prononcée
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // Texte d'annonce du milestone
    const milestoneText = this.scene.add.text(
      this.x,
      this.y - 50,
      `x${level} COMBO!`,
      {
        fontSize: '24px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
      }
    );
    milestoneText.setOrigin(0.5);
    milestoneText.setDepth(1000);

    this.scene.tweens.add({
      targets: milestoneText,
      y: milestoneText.y - 30,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        milestoneText.destroy();
      },
    });
  }

  /**
   * Joue l'animation de combo break
   */
  public playBreakEffect(): void {
    // Shake effect
    this.scene.tweens.add({
      targets: this,
      x: this.x - 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
    });

    // Fade out rouge
    this.background.setFillStyle(0xff0000, 0.8);
    this.scene.tweens.add({
      targets: this.background,
      alpha: 0.7,
      duration: 200,
      onComplete: () => {
        this.background.setFillStyle(0x000000, 0.7);
      },
    });
  }

  /**
   * Affiche le compteur de combo
   */
  private show(): void {
    this.isActive = true;

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Cache le compteur de combo
   */
  private hide(): void {
    this.isActive = false;

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 300,
      ease: 'Power2',
    });
  }

  /**
   * Gère l'événement d'augmentation du combo
   */
  public onComboIncrease(payload: GameEventPayloads['combo:increase']): void {
    this.updateCombo(payload.multiplier, payload.killStreak, 1);
    this.playKillPulse();
  }

  /**
   * Gère l'événement de combo break
   */
  public onComboBreak(_payload: GameEventPayloads['combo:break']): void {
    this.playBreakEffect();

    // Réinitialiser après l'animation
    this.scene.time.delayedCall(300, () => {
      this.updateCombo(1, 0, 0);
    });
  }

  /**
   * Gère l'événement de milestone
   */
  public onComboMilestone(payload: GameEventPayloads['combo:milestone']): void {
    this.playMilestoneEffect(payload.level);
  }
}
