import Phaser from 'phaser';
import type { ActivePowerUpInfo } from '@systems/PowerUpSystem';

/**
 * Configuration du display de power-ups
 */
interface PowerUpDisplayConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  maxDisplayed: number;
}

/**
 * Élément d'affichage pour un power-up actif
 */
interface PowerUpDisplayItem {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  timerBar: Phaser.GameObjects.Rectangle;
  timerBarBg: Phaser.GameObjects.Rectangle;
}

/**
 * Affichage des power-ups actifs dans le HUD
 *
 * Affiche les power-ups actifs avec:
 * - Icône colorée selon le type
 * - Nom du power-up
 * - Barre de timer montrant le temps restant
 */
export class PowerUpDisplay extends Phaser.GameObjects.Container {
  private config: PowerUpDisplayConfig;
  private displayItems: PowerUpDisplayItem[] = [];
  private itemHeight: number = 30;
  private itemSpacing: number = 5;

  constructor(scene: Phaser.Scene, config: Partial<PowerUpDisplayConfig> = {}) {
    super(scene, config.x ?? 20, config.y ?? 200);

    this.config = {
      x: config.x ?? 20,
      y: config.y ?? 200,
      width: config.width ?? 150,
      height: config.height ?? 150,
      maxDisplayed: config.maxDisplayed ?? 4,
    };

    // Ajouter au scene
    scene.add.existing(this);

    // Créer les éléments d'affichage (pool)
    for (let i = 0; i < this.config.maxDisplayed; i++) {
      this.createDisplayItem(i);
    }
  }

  /**
   * Crée un élément d'affichage pour un power-up
   */
  private createDisplayItem(index: number): void {
    const y = index * (this.itemHeight + this.itemSpacing);

    // Container pour l'élément
    const container = this.scene.add.container(0, y);

    // Background
    const background = this.scene.add.rectangle(
      0,
      0,
      this.config.width,
      this.itemHeight,
      0x000000,
      0.6
    );
    background.setOrigin(0, 0);
    background.setStrokeStyle(1, 0x444444);

    // Icône (carré coloré)
    const icon = this.scene.add.rectangle(
      5,
      5,
      20,
      20,
      0xffffff,
      1
    );
    icon.setOrigin(0, 0);

    // Nom du power-up
    const nameText = this.scene.add.text(30, 3, '', {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    // Barre de timer - fond
    const timerBarBg = this.scene.add.rectangle(
      30,
      18,
      this.config.width - 35,
      8,
      0x333333,
      1
    );
    timerBarBg.setOrigin(0, 0);

    // Barre de timer - progression
    const timerBar = this.scene.add.rectangle(
      30,
      18,
      this.config.width - 35,
      8,
      0x00ff00,
      1
    );
    timerBar.setOrigin(0, 0);

    // Ajouter tous les éléments au container
    container.add([background, icon, nameText, timerBarBg, timerBar]);

    // Cacher initialement
    container.setVisible(false);

    // Ajouter au display principal
    this.add(container);

    // Stocker la référence
    this.displayItems.push({
      container,
      background,
      icon,
      nameText,
      timerBar,
      timerBarBg,
    });
  }

  /**
   * Met à jour l'affichage avec les power-ups actifs
   */
  public update(activePowerUps: ActivePowerUpInfo[]): void {
    // Mettre à jour chaque élément d'affichage
    for (let i = 0; i < this.config.maxDisplayed; i++) {
      const item = this.displayItems[i];
      const powerUp = activePowerUps[i];

      if (powerUp) {
        // Afficher et mettre à jour
        item.container.setVisible(true);
        this.updateDisplayItem(item, powerUp);
      } else {
        // Cacher
        item.container.setVisible(false);
      }
    }
  }

  /**
   * Met à jour un élément d'affichage avec les infos d'un power-up
   */
  private updateDisplayItem(item: PowerUpDisplayItem, powerUp: ActivePowerUpInfo): void {
    // Couleur de l'icône
    item.icon.setFillStyle(powerUp.color);

    // Nom
    item.nameText.setText(powerUp.name.toUpperCase());

    // Timer bar
    const maxWidth = this.config.width - 35;
    const currentWidth = maxWidth * powerUp.timeRemainingPercent;

    item.timerBar.setSize(currentWidth, 8);

    // Couleur du timer selon le temps restant
    if (powerUp.timeRemainingPercent > 0.5) {
      item.timerBar.setFillStyle(0x00ff00); // Vert
    } else if (powerUp.timeRemainingPercent > 0.25) {
      item.timerBar.setFillStyle(0xffff00); // Jaune
    } else {
      item.timerBar.setFillStyle(0xff0000); // Rouge
    }

    // Bordure du background avec la couleur du power-up
    item.background.setStrokeStyle(2, powerUp.color);
  }

  /**
   * Animation d'apparition d'un nouveau power-up
   */
  public animateNewPowerUp(type: string): void {
    // Trouver l'élément correspondant
    const index = this.displayItems.findIndex((item) => {
      if (!item.container.visible) return false;
      const nameText = item.nameText.text.toLowerCase();
      return nameText === type.toLowerCase();
    });

    if (index === -1) return;

    const item = this.displayItems[index];

    // Animation de flash
    this.scene.tweens.add({
      targets: item.container,
      scaleX: { from: 1.2, to: 1 },
      scaleY: { from: 1.2, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Nettoie les ressources
   */
  public destroy(fromScene?: boolean): void {
    for (const item of this.displayItems) {
      item.container.destroy();
    }
    this.displayItems = [];
    super.destroy(fromScene);
  }
}
