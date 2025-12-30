import Phaser from 'phaser';
import {
  RARITY_CONFIG,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type UpgradeDefinition,
} from '@config/upgrades';

/**
 * Configuration de l'UpgradeCard
 */
export interface UpgradeCardConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  upgrade: UpgradeDefinition;
  onSelect?: (upgrade: UpgradeDefinition) => void;
}

/**
 * États de la carte
 */
export type CardState = 'hidden' | 'revealing' | 'normal' | 'hover' | 'selected' | 'locked';

/**
 * Composant UI pour afficher une carte d'upgrade
 *
 * Affiche:
 * - Icône et nom de l'upgrade
 * - Description de l'effet
 * - Rareté (couleur de bordure et brillance)
 * - Catégorie (icône et couleur d'accent)
 */
export class UpgradeCard extends Phaser.GameObjects.Container {
  private config: UpgradeCardConfig;
  private upgrade: UpgradeDefinition;

  // Éléments visuels
  private background!: Phaser.GameObjects.Rectangle;
  private border!: Phaser.GameObjects.Rectangle;
  private glowEffect!: Phaser.GameObjects.Rectangle;
  private iconText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private descriptionText!: Phaser.GameObjects.Text;
  private rarityText!: Phaser.GameObjects.Text;
  private categoryIcon!: Phaser.GameObjects.Text;
  private categoryBar!: Phaser.GameObjects.Rectangle;

  // État
  private cardState: CardState = 'hidden';
  private isInteractive: boolean = true;

  constructor(scene: Phaser.Scene, config: UpgradeCardConfig) {
    super(scene, config.x, config.y);

    this.config = config;
    this.upgrade = config.upgrade;

    this.createCard();
    this.setupInteraction();

    // Ajouter le container à la scène
    scene.add.existing(this);

    // Commencer caché
    this.setAlpha(0);
    this.setScale(0.8);
  }

  /**
   * Crée les éléments visuels de la carte
   */
  private createCard(): void {
    const { width, height, upgrade } = this.config;
    const rarityConfig = RARITY_CONFIG[upgrade.rarity];
    const categoryColor = CATEGORY_COLORS[upgrade.category];

    // Effet de glow (derrière tout)
    this.glowEffect = this.scene.add.rectangle(0, 0, width + 20, height + 20, rarityConfig.color, 0);
    this.add(this.glowEffect);

    // Fond principal
    this.background = this.scene.add.rectangle(0, 0, width, height, 0x1a1a2e, 1);
    this.add(this.background);

    // Bordure avec couleur de rareté
    this.border = this.scene.add.rectangle(0, 0, width, height);
    this.border.setStrokeStyle(3, rarityConfig.color);
    this.border.setFillStyle(0x000000, 0);
    this.add(this.border);

    // Barre de catégorie (en haut)
    this.categoryBar = this.scene.add.rectangle(0, -height / 2 + 5, width - 10, 6, categoryColor);
    this.add(this.categoryBar);

    // Icône de catégorie (coin supérieur gauche)
    this.categoryIcon = this.scene.add.text(-width / 2 + 15, -height / 2 + 15, CATEGORY_ICONS[upgrade.category], {
      fontSize: '16px',
    });
    this.add(this.categoryIcon);

    // Grande icône centrale
    this.iconText = this.scene.add.text(0, -height / 4 + 10, upgrade.icon, {
      fontSize: '48px',
    });
    this.iconText.setOrigin(0.5);
    this.add(this.iconText);

    // Nom de l'upgrade
    this.nameText = this.scene.add.text(0, height / 4 - 30, upgrade.name, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      wordWrap: { width: width - 20 },
      align: 'center',
    });
    this.nameText.setOrigin(0.5);
    this.add(this.nameText);

    // Description
    this.descriptionText = this.scene.add.text(0, height / 4 + 5, upgrade.description, {
      fontSize: '14px',
      color: '#cccccc',
      wordWrap: { width: width - 20 },
      align: 'center',
    });
    this.descriptionText.setOrigin(0.5);
    this.add(this.descriptionText);

    // Texte de rareté (en bas)
    const rarityNames: Record<string, string> = {
      common: 'Commun',
      rare: 'Rare',
      epic: 'Épique',
      legendary: 'Légendaire',
    };
    this.rarityText = this.scene.add.text(0, height / 2 - 20, rarityNames[upgrade.rarity], {
      fontSize: '12px',
      color: rarityConfig.textColor,
      fontStyle: 'bold',
    });
    this.rarityText.setOrigin(0.5);
    this.add(this.rarityText);

    // Appliquer l'effet de glow selon la rareté
    if (rarityConfig.glowIntensity > 0) {
      this.startGlowAnimation(rarityConfig.glowIntensity);
    }
  }

  /**
   * Configure les interactions
   */
  private setupInteraction(): void {
    // Rendre le background interactif
    this.background.setInteractive({ useHandCursor: true });

    // Hover
    this.background.on('pointerover', () => {
      if (!this.isInteractive || this.cardState === 'selected' || this.cardState === 'locked') return;
      this.setCardState('hover');
    });

    this.background.on('pointerout', () => {
      if (!this.isInteractive || this.cardState === 'selected' || this.cardState === 'locked') return;
      this.setCardState('normal');
    });

    // Click
    this.background.on('pointerdown', () => {
      if (!this.isInteractive || this.cardState === 'locked') return;
      this.select();
    });
  }

  /**
   * Lance l'animation de glow pour les cartes rares+
   */
  private startGlowAnimation(intensity: number): void {
    this.scene.tweens.add({
      targets: this.glowEffect,
      alpha: intensity,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Définit l'état de la carte
   */
  public setCardState(newState: CardState): void {
    this.cardState = newState;

    switch (newState) {
      case 'hidden':
        this.setAlpha(0);
        this.setScale(0.8);
        break;

      case 'revealing':
        // Animation de révélation gérée par reveal()
        break;

      case 'normal':
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          scaleY: 1,
          duration: 150,
          ease: 'Back.easeOut',
        });
        this.border.setStrokeStyle(3, RARITY_CONFIG[this.upgrade.rarity].color);
        break;

      case 'hover':
        this.scene.tweens.add({
          targets: this,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 150,
          ease: 'Back.easeOut',
        });
        this.border.setStrokeStyle(4, 0xffffff);
        break;

      case 'selected':
        this.scene.tweens.add({
          targets: this,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 200,
          ease: 'Back.easeOut',
        });
        this.border.setStrokeStyle(5, 0x00ff00);
        this.background.setFillStyle(0x003300, 1);
        break;

      case 'locked':
        this.scene.tweens.add({
          targets: this,
          alpha: 0.5,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 200,
        });
        this.border.setStrokeStyle(2, 0x444444);
        break;
    }
  }

  /**
   * Anime la révélation de la carte
   */
  public reveal(delay: number = 0): Promise<void> {
    return new Promise((resolve) => {
      this.setCardState('revealing');

      this.scene.time.delayedCall(delay, () => {
        // Animation d'apparition
        this.scene.tweens.add({
          targets: this,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 400,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.setCardState('normal');
            resolve();
          },
        });

        // Animation de flip (optionnel)
        this.scene.tweens.add({
          targets: this,
          angle: { from: -5, to: 0 },
          duration: 300,
          ease: 'Sine.easeOut',
        });
      });
    });
  }

  /**
   * Sélectionne cette carte
   */
  public select(): void {
    if (this.cardState === 'selected') return;

    this.setCardState('selected');
    this.isInteractive = false;

    // Animation de sélection
    this.scene.tweens.add({
      targets: this.iconText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 200,
      yoyo: true,
    });

    // Appeler le callback
    if (this.config.onSelect) {
      this.config.onSelect(this.upgrade);
    }
  }

  /**
   * Verrouille la carte (quand une autre est sélectionnée)
   */
  public lock(): void {
    this.setCardState('locked');
    this.isInteractive = false;
  }

  /**
   * Anime la disparition de la carte
   */
  public animateOut(delay: number = 0): Promise<void> {
    return new Promise((resolve) => {
      this.scene.time.delayedCall(delay, () => {
        this.scene.tweens.add({
          targets: this,
          alpha: 0,
          scaleX: 0.5,
          scaleY: 0.5,
          y: this.y - 50,
          duration: 300,
          ease: 'Power2',
          onComplete: () => resolve(),
        });
      });
    });
  }

  /**
   * Récupère l'upgrade associé à cette carte
   */
  public getUpgrade(): UpgradeDefinition {
    return this.upgrade;
  }

  /**
   * Récupère l'état actuel
   */
  public getCardState(): CardState {
    return this.cardState;
  }

  /**
   * Vérifie si la carte est interactive
   */
  public isCardInteractive(): boolean {
    return this.isInteractive;
  }

  /**
   * Réactive l'interactivité de la carte
   */
  public setCardInteractivity(interactive: boolean): void {
    this.isInteractive = interactive;
    if (interactive && this.cardState !== 'selected') {
      this.setCardState('normal');
    }
  }
}
