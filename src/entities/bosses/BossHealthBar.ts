/**
 * BossHealthBar - Phase 7.3
 *
 * Barre de vie spéciale pour les boss.
 * Affichée en haut de l'écran avec le nom du boss et les indicateurs de phase.
 */

import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Boss } from './Boss';

/**
 * Configuration de la barre de vie
 */
export interface BossHealthBarConfig {
  /** Largeur de la barre */
  width: number;
  /** Hauteur de la barre */
  height: number;
  /** Marge depuis le haut de l'écran */
  marginTop: number;
  /** Couleur de la barre de vie */
  healthColor: number;
  /** Couleur de fond */
  backgroundColor: number;
  /** Couleur de la bordure */
  borderColor: number;
  /** Couleur quand en rage */
  rageColor: number;
  /** Afficher les marqueurs de phase */
  showPhaseMarkers: boolean;
}

const DEFAULT_CONFIG: BossHealthBarConfig = {
  width: 400,
  height: 24,
  marginTop: 40,
  healthColor: 0xff0000,
  backgroundColor: 0x333333,
  borderColor: 0xffffff,
  rageColor: 0xff6600,
  showPhaseMarkers: true,
};

/**
 * Barre de vie UI pour les boss
 */
export class BossHealthBar {
  private scene: GameScene;
  private boss: Boss;
  private config: BossHealthBarConfig;

  /** Container principal */
  private container!: Phaser.GameObjects.Container;

  /** Fond de la barre */
  private background!: Phaser.GameObjects.Rectangle;

  /** Barre de vie actuelle */
  private healthBar!: Phaser.GameObjects.Rectangle;

  /** Bordure */
  private border!: Phaser.GameObjects.Rectangle;

  /** Nom du boss */
  private nameText!: Phaser.GameObjects.Text;

  /** Indicateurs de phase */
  private phaseMarkers: Phaser.GameObjects.Line[] = [];

  /** Texte de phase */
  private phaseText!: Phaser.GameObjects.Text;

  /** Animation de shake */
  private isShaking: boolean = false;

  /** HP affiché (pour animation fluide) */
  private displayedHealth: number;

  constructor(
    scene: GameScene,
    boss: Boss,
    config: Partial<BossHealthBarConfig> = {}
  ) {
    this.scene = scene;
    this.boss = boss;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.displayedHealth = boss.getHealth();

    this.createUI();
    this.setupEventListeners();
  }

  /**
   * Crée l'interface de la barre de vie
   */
  private createUI(): void {
    const screenWidth = this.scene.cameras.main.width;
    const x = screenWidth / 2;
    const y = this.config.marginTop;

    // Container principal (fixé à la caméra)
    this.container = this.scene.add.container(x, y);
    this.container.setScrollFactor(0);
    this.container.setDepth(100);

    // Fond de la barre
    this.background = this.scene.add.rectangle(
      0,
      0,
      this.config.width,
      this.config.height,
      this.config.backgroundColor,
      0.8
    );
    this.container.add(this.background);

    // Barre de vie
    this.healthBar = this.scene.add.rectangle(
      -this.config.width / 2,
      0,
      this.config.width,
      this.config.height - 4,
      this.config.healthColor
    );
    this.healthBar.setOrigin(0, 0.5);
    this.container.add(this.healthBar);

    // Bordure
    this.border = this.scene.add.rectangle(
      0,
      0,
      this.config.width,
      this.config.height
    );
    this.border.setStrokeStyle(2, this.config.borderColor);
    this.border.setFillStyle(0x000000, 0);
    this.container.add(this.border);

    // Nom du boss
    this.nameText = this.scene.add.text(
      0,
      -this.config.height - 8,
      this.boss.bossName.toUpperCase(),
      {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }
    );
    this.nameText.setOrigin(0.5, 0.5);
    this.container.add(this.nameText);

    // Texte de phase
    this.phaseText = this.scene.add.text(
      this.config.width / 2 + 10,
      0,
      'Phase 1',
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffff00',
      }
    );
    this.phaseText.setOrigin(0, 0.5);
    this.container.add(this.phaseText);

    // Créer les marqueurs de phase
    if (this.config.showPhaseMarkers) {
      this.createPhaseMarkers();
    }

    // Animation d'apparition
    this.playEntranceAnimation();
  }

  /**
   * Crée les marqueurs de phase sur la barre
   */
  private createPhaseMarkers(): void {
    const phases = (this.boss as any).config?.phases || [];

    for (const phase of phases) {
      if (phase.healthThreshold < 1 && phase.healthThreshold > 0) {
        const xPos = -this.config.width / 2 + this.config.width * phase.healthThreshold;

        const marker = this.scene.add.line(
          0,
          0,
          xPos,
          -this.config.height / 2,
          xPos,
          this.config.height / 2,
          0xffffff,
          0.8
        );
        marker.setLineWidth(2);
        this.container.add(marker);
        this.phaseMarkers.push(marker);
      }
    }
  }

  /**
   * Animation d'apparition de la barre
   */
  private playEntranceAnimation(): void {
    this.container.setAlpha(0);
    this.container.setScale(0.8, 0.8);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Configure les listeners d'événements
   */
  private setupEventListeners(): void {
    // Écouter les dégâts au boss
    this.scene.events.on('bossDamaged', this.onBossDamaged, this);

    // Écouter les changements de phase
    this.scene.events.on('bossPhaseChanged', this.onPhaseChanged, this);

    // Écouter la rage
    this.scene.events.on('bossEnraged', this.onBossEnraged, this);

    // Écouter la mort du boss
    this.scene.events.on('bossDeath', this.onBossDeath, this);
  }

  /**
   * Callback quand le boss prend des dégâts
   */
  private onBossDamaged = (data: { boss: Boss; damage: number }): void => {
    if (data.boss !== this.boss) return;

    // Effet de shake
    this.shake();

    // Flash de la barre
    this.flash();
  };

  /**
   * Callback quand la phase change
   */
  private onPhaseChanged = (data: { boss: Boss; phase: number }): void => {
    if (data.boss !== this.boss) return;

    // Mettre à jour le texte de phase
    this.phaseText.setText(`Phase ${data.phase + 1}`);

    // Animation de pulsation
    this.scene.tweens.add({
      targets: this.phaseText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 200,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    // Flash spécial
    this.flashPhaseChange();
  };

  /**
   * Callback quand le boss entre en rage
   */
  private onBossEnraged = (boss: Boss): void => {
    if (boss !== this.boss) return;

    // Changer la couleur de la barre
    this.healthBar.setFillStyle(this.config.rageColor);

    // Animation de pulsation continue
    this.scene.tweens.add({
      targets: this.healthBar,
      alpha: 0.7,
      duration: 200,
      yoyo: true,
      repeat: -1,
    });
  };

  /**
   * Callback quand le boss meurt
   */
  private onBossDeath = (data: { boss: Boss }): void => {
    if (data.boss !== this.boss) return;

    // Animation de disparition
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleY: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => this.destroy(),
    });
  };

  /**
   * Effet de shake de la barre
   */
  private shake(): void {
    if (this.isShaking) return;

    this.isShaking = true;
    const originalX = this.container.x;

    this.scene.tweens.add({
      targets: this.container,
      x: originalX + 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.container.x = originalX;
        this.isShaking = false;
      },
    });
  }

  /**
   * Effet de flash de la barre
   */
  private flash(): void {
    const flashRect = this.scene.add.rectangle(
      0,
      0,
      this.config.width,
      this.config.height,
      0xffffff,
      0.5
    );
    this.container.add(flashRect);

    this.scene.tweens.add({
      targets: flashRect,
      alpha: 0,
      duration: 200,
      onComplete: () => flashRect.destroy(),
    });
  }

  /**
   * Flash spécial pour le changement de phase
   */
  private flashPhaseChange(): void {
    const flashRect = this.scene.add.rectangle(
      0,
      0,
      this.config.width + 20,
      this.config.height + 20,
      0xffff00,
      0.6
    );
    this.container.add(flashRect);
    this.container.sendToBack(flashRect);

    this.scene.tweens.add({
      targets: flashRect,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 400,
      onComplete: () => flashRect.destroy(),
    });
  }

  /**
   * Mise à jour de la barre
   */
  public update(_delta: number): void {
    if (!this.container.active) return;

    const currentHealth = this.boss.getHealth();
    const maxHealth = this.boss.getMaxHealth();

    // Animation fluide de la barre de vie
    const targetHealth = currentHealth;
    this.displayedHealth = Phaser.Math.Linear(
      this.displayedHealth,
      targetHealth,
      0.1
    );

    // Mettre à jour la largeur de la barre
    const healthPercent = this.displayedHealth / maxHealth;
    const newWidth = Math.max(0, this.config.width * healthPercent);
    this.healthBar.width = newWidth;

    // Changer la couleur selon le HP
    if (healthPercent <= 0.3 && !(this.boss as any).isEnraged) {
      this.healthBar.setFillStyle(0xff4400);
    } else if (healthPercent <= 0.6 && !(this.boss as any).isEnraged) {
      this.healthBar.setFillStyle(0xffaa00);
    }
  }

  /**
   * Affiche ou masque la barre
   */
  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /**
   * Détruit la barre de vie
   */
  public destroy(): void {
    // Retirer les listeners
    this.scene.events.off('bossDamaged', this.onBossDamaged, this);
    this.scene.events.off('bossPhaseChanged', this.onPhaseChanged, this);
    this.scene.events.off('bossEnraged', this.onBossEnraged, this);
    this.scene.events.off('bossDeath', this.onBossDeath, this);

    // Détruire le container
    this.container.destroy();
  }
}
