import Phaser from 'phaser';

/**
 * Configuration du bouton tactile
 */
export interface TouchButtonConfig {
  x: number;
  y: number;
  radius?: number;
  icon?: string;
  iconSize?: number;
  color?: number;
  pressedColor?: number;
  alpha?: number;
  pressedAlpha?: number;
  cooldown?: number;
  showCooldown?: boolean;
}

/**
 * Bouton tactile virtuel pour les actions du jeu
 *
 * Caractéristiques:
 * - Icône personnalisable
 * - Effet visuel au toucher
 * - Support du cooldown avec indicateur visuel
 * - Feedback haptique optionnel
 */
export class TouchButton extends Phaser.GameObjects.Container {
  private config: Required<TouchButtonConfig>;

  // Éléments visuels
  private background!: Phaser.GameObjects.Arc;
  private border!: Phaser.GameObjects.Arc;
  private iconText!: Phaser.GameObjects.Text;
  private cooldownOverlay?: Phaser.GameObjects.Arc;
  private cooldownGraphics?: Phaser.GameObjects.Graphics;

  // État
  private isPressed: boolean = false;
  private isOnCooldown: boolean = false;
  private cooldownTimer?: Phaser.Time.TimerEvent;
  private holdTimer?: Phaser.Time.TimerEvent;
  private cooldownProgress: number = 0;

  // Callbacks
  private onPressCallback?: () => void;
  private onReleaseCallback?: () => void;
  private onHoldCallback?: () => void;

  constructor(scene: Phaser.Scene, config: TouchButtonConfig) {
    super(scene, config.x, config.y);

    // Configuration par défaut
    this.config = {
      x: config.x,
      y: config.y,
      radius: config.radius ?? 35,
      icon: config.icon ?? '?',
      iconSize: config.iconSize ?? 24,
      color: config.color ?? 0x444444,
      pressedColor: config.pressedColor ?? 0x666666,
      alpha: config.alpha ?? 0.6,
      pressedAlpha: config.pressedAlpha ?? 1.0,
      cooldown: config.cooldown ?? 0,
      showCooldown: config.showCooldown ?? true,
    };

    this.createButton();
    this.setupInput();

    scene.add.existing(this);
  }

  /**
   * Crée les éléments visuels du bouton
   */
  private createButton(): void {
    const { radius, icon, iconSize, color, alpha } = this.config;

    // Fond du bouton
    this.background = this.scene.add.circle(0, 0, radius, color, alpha);
    this.add(this.background);

    // Bordure
    this.border = this.scene.add.circle(0, 0, radius);
    this.border.setStrokeStyle(2, 0xffffff, 0.5);
    this.border.setFillStyle(0x000000, 0);
    this.add(this.border);

    // Icône
    this.iconText = this.scene.add.text(0, 0, icon, {
      fontSize: `${iconSize}px`,
      color: '#ffffff',
    });
    this.iconText.setOrigin(0.5);
    this.add(this.iconText);

    // Overlay de cooldown
    if (this.config.showCooldown && this.config.cooldown > 0) {
      this.cooldownOverlay = this.scene.add.circle(0, 0, radius, 0x000000, 0.5);
      this.cooldownOverlay.setVisible(false);
      this.add(this.cooldownOverlay);

      this.cooldownGraphics = this.scene.add.graphics();
      this.add(this.cooldownGraphics);
    }
  }

  /**
   * Configure les entrées tactiles
   */
  private setupInput(): void {
    this.background.setInteractive({
      hitArea: new Phaser.Geom.Circle(0, 0, this.config.radius),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
    });

    // Pointer down
    this.background.on('pointerdown', () => {
      if (this.isOnCooldown) return;
      this.press();
    });

    // Pointer up
    this.background.on('pointerup', () => {
      this.release();
    });

    // Pointer out (quand le doigt quitte le bouton)
    this.background.on('pointerout', () => {
      if (this.isPressed) {
        this.release();
      }
    });
  }

  /**
   * Appelé quand le bouton est pressé
   */
  private press(): void {
    if (this.isPressed) return;

    this.isPressed = true;

    // Feedback visuel
    this.background.setFillStyle(this.config.pressedColor, this.config.pressedAlpha);
    this.border.setStrokeStyle(3, 0xffffff, 0.8);

    // Animation de pression
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 50,
      ease: 'Power2',
    });

    // Feedback haptique
    this.triggerHaptic();

    // Callback
    if (this.onPressCallback) {
      this.onPressCallback();
    }

    // Démarrer le timer de maintien
    if (this.onHoldCallback) {
      this.holdTimer = this.scene.time.addEvent({
        delay: 100,
        repeat: -1,
        callback: () => {
          if (this.isPressed && this.onHoldCallback) {
            this.onHoldCallback();
          }
        },
      });
    }
  }

  /**
   * Appelé quand le bouton est relâché
   */
  private release(): void {
    if (!this.isPressed) return;

    this.isPressed = false;

    // Arrêter le timer de maintien
    if (this.holdTimer) {
      this.holdTimer.destroy();
      this.holdTimer = undefined;
    }

    // Restaurer l'apparence
    this.background.setFillStyle(this.config.color, this.config.alpha);
    this.border.setStrokeStyle(2, 0xffffff, 0.5);

    // Animation de relâchement
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Back.easeOut',
    });

    // Démarrer le cooldown si configuré
    if (this.config.cooldown > 0) {
      this.startCooldown();
    }

    // Callback
    if (this.onReleaseCallback) {
      this.onReleaseCallback();
    }
  }

  /**
   * Démarre le cooldown
   */
  private startCooldown(): void {
    this.isOnCooldown = true;
    this.cooldownProgress = 0;

    // Afficher l'overlay
    if (this.cooldownOverlay) {
      this.cooldownOverlay.setVisible(true);
    }

    // Griser le bouton
    this.background.setFillStyle(0x333333, 0.4);
    this.iconText.setAlpha(0.5);

    // Timer pour mettre à jour le cooldown
    const updateInterval = 50;
    const totalSteps = this.config.cooldown / updateInterval;
    let currentStep = 0;

    this.cooldownTimer = this.scene.time.addEvent({
      delay: updateInterval,
      repeat: totalSteps,
      callback: () => {
        currentStep++;
        this.cooldownProgress = currentStep / totalSteps;
        this.updateCooldownVisual();

        if (currentStep >= totalSteps) {
          this.endCooldown();
        }
      },
    });
  }

  /**
   * Met à jour l'affichage du cooldown
   */
  private updateCooldownVisual(): void {
    if (!this.cooldownGraphics) return;

    this.cooldownGraphics.clear();

    // Dessiner un arc de progression
    const angle = this.cooldownProgress * Math.PI * 2 - Math.PI / 2;
    this.cooldownGraphics.lineStyle(4, 0x00ff00, 0.8);
    this.cooldownGraphics.beginPath();
    this.cooldownGraphics.arc(0, 0, this.config.radius - 4, -Math.PI / 2, angle, false);
    this.cooldownGraphics.strokePath();
  }

  /**
   * Termine le cooldown
   */
  private endCooldown(): void {
    this.isOnCooldown = false;
    this.cooldownProgress = 0;

    // Cacher l'overlay
    if (this.cooldownOverlay) {
      this.cooldownOverlay.setVisible(false);
    }

    // Effacer le graphique
    if (this.cooldownGraphics) {
      this.cooldownGraphics.clear();
    }

    // Restaurer l'apparence
    this.background.setFillStyle(this.config.color, this.config.alpha);
    this.iconText.setAlpha(1);

    // Animation de disponibilité
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      yoyo: true,
      ease: 'Power2',
    });
  }

  /**
   * Déclenche le retour haptique
   */
  private triggerHaptic(): void {
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  /**
   * Définit le callback appelé à la pression
   */
  public onPress(callback: () => void): this {
    this.onPressCallback = callback;
    return this;
  }

  /**
   * Définit le callback appelé au relâchement
   */
  public onRelease(callback: () => void): this {
    this.onReleaseCallback = callback;
    return this;
  }

  /**
   * Définit le callback appelé pendant le maintien
   */
  public onHold(callback: () => void): this {
    this.onHoldCallback = callback;
    return this;
  }

  /**
   * Vérifie si le bouton est pressé
   */
  public getIsPressed(): boolean {
    return this.isPressed;
  }

  /**
   * Vérifie si le bouton est en cooldown
   */
  public getIsOnCooldown(): boolean {
    return this.isOnCooldown;
  }

  /**
   * Change l'icône du bouton
   */
  public setIcon(icon: string): void {
    this.iconText.setText(icon);
  }

  /**
   * Change la couleur du bouton
   */
  public setColor(color: number): void {
    this.config.color = color;
    if (!this.isPressed && !this.isOnCooldown) {
      this.background.setFillStyle(color, this.config.alpha);
    }
  }

  /**
   * Définit le cooldown
   */
  public setCooldown(cooldown: number): void {
    this.config.cooldown = cooldown;
  }

  /**
   * Force le démarrage du cooldown (utile pour synchroniser avec le jeu)
   */
  public triggerCooldown(duration?: number): void {
    if (duration !== undefined) {
      this.config.cooldown = duration;
    }
    if (this.config.cooldown > 0) {
      this.startCooldown();
    }
  }

  /**
   * Active ou désactive le bouton
   */
  public setEnabled(enabled: boolean): void {
    if (enabled) {
      this.background.setInteractive();
      this.setAlpha(1);
    } else {
      this.background.disableInteractive();
      this.setAlpha(0.3);
    }
  }

  /**
   * Change la visibilité avec animation
   */
  public setVisibility(visible: boolean, animate: boolean = true): void {
    if (animate) {
      this.scene.tweens.add({
        targets: this,
        alpha: visible ? 1 : 0,
        duration: 200,
        ease: 'Power2',
      });
    } else {
      this.setAlpha(visible ? 1 : 0);
    }
  }

  /**
   * Redimensionne le bouton
   */
  public resize(radius: number): void {
    this.config.radius = radius;

    this.background.setRadius(radius);
    this.border.setRadius(radius);

    if (this.cooldownOverlay) {
      this.cooldownOverlay.setRadius(radius);
    }

    // Recréer la zone interactive
    this.background.setInteractive({
      hitArea: new Phaser.Geom.Circle(0, 0, radius),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
    });
  }

  /**
   * Nettoyage
   */
  public destroy(fromScene?: boolean): void {
    if (this.cooldownTimer) {
      this.cooldownTimer.destroy();
    }
    if (this.holdTimer) {
      this.holdTimer.destroy();
    }
    super.destroy(fromScene);
  }
}
