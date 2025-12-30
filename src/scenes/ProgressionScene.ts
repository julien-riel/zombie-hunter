/**
 * Scène de progression permanente (Phase 6.7)
 *
 * Overlay qui affiche l'arbre de compétences permanentes.
 * Accessible depuis le menu principal ou après une partie.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import {
  PROGRESSION,
  PERMANENT_UPGRADES,
  getUpgradesByCategory,
  getUpgradeCost,
  type PermanentUpgradeCategory,
  type PermanentUpgradeDefinition,
} from '@config/progression';
import { SaveManager } from '@managers/SaveManager';

/**
 * Clé de la scène
 */
export const PROGRESSION_SCENE_KEY = 'ProgressionScene';

/**
 * Données passées à la scène
 */
interface ProgressionSceneData {
  /** Scène parente (GameScene ou MenuScene) */
  parentScene?: Phaser.Scene;
  /** Callback à appeler à la fermeture */
  onClose?: () => void;
}

/**
 * Node d'upgrade dans l'arbre
 */
interface UpgradeNode {
  upgrade: PermanentUpgradeDefinition;
  container: Phaser.GameObjects.Container;
  levelText: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Graphics;
  currentLevel: number;
}

/**
 * Scène d'arbre de compétences permanentes
 */
export class ProgressionScene extends Phaser.Scene {
  private parentScene?: Phaser.Scene;
  private onCloseCallback?: () => void;
  private saveManager!: SaveManager;

  // Éléments visuels
  private overlay!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private closeButton!: Phaser.GameObjects.Container;
  private categoryTabs: Map<PermanentUpgradeCategory, Phaser.GameObjects.Container> = new Map();
  private upgradeNodes: UpgradeNode[] = [];
  private selectedCategory: PermanentUpgradeCategory = 'combat';
  private connectingLines!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: PROGRESSION_SCENE_KEY });
  }

  /**
   * Initialise les données de la scène
   */
  init(data: ProgressionSceneData): void {
    this.parentScene = data.parentScene;
    this.onCloseCallback = data.onClose;
    this.saveManager = SaveManager.getInstance();
    this.upgradeNodes = [];
    this.categoryTabs.clear();
    this.selectedCategory = 'combat';
  }

  /**
   * Crée les éléments de la scène
   */
  create(): void {
    // Pause la scène parente si elle existe
    if (this.parentScene) {
      this.parentScene.scene.pause();
    }

    this.createOverlay();
    this.createHeader();
    this.createCategoryTabs();
    this.createUpgradeTree();
    this.createCloseButton();
    this.animateIn();
  }

  /**
   * Crée l'overlay semi-transparent
   */
  private createOverlay(): void {
    this.overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0
    );
    this.overlay.setDepth(0);

    this.tweens.add({
      targets: this.overlay,
      fillAlpha: 0.9,
      duration: 300,
    });
  }

  /**
   * Crée le titre et l'affichage d'XP
   */
  private createHeader(): void {
    // Titre
    this.titleText = this.add.text(GAME_WIDTH / 2, 40, 'PROGRESSION PERMANENTE', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setAlpha(0);
    this.titleText.setDepth(10);

    // XP disponible
    const availableXP = this.saveManager.getAvailableXP();
    this.xpText = this.add.text(GAME_WIDTH / 2, 75, `XP disponible: ${availableXP}`, {
      fontSize: '20px',
      color: '#ffff00',
    });
    this.xpText.setOrigin(0.5);
    this.xpText.setAlpha(0);
    this.xpText.setDepth(10);

    this.tweens.add({
      targets: [this.titleText, this.xpText],
      alpha: 1,
      duration: 400,
      delay: 200,
    });
  }

  /**
   * Crée les onglets de catégories
   */
  private createCategoryTabs(): void {
    const categories: PermanentUpgradeCategory[] = ['combat', 'survival', 'utility'];
    const tabWidth = 150;
    const tabHeight = 40;
    const startX = (GAME_WIDTH - categories.length * tabWidth - (categories.length - 1) * 10) / 2;
    const tabY = 120;

    categories.forEach((category, index) => {
      const x = startX + index * (tabWidth + 10) + tabWidth / 2;
      const container = this.add.container(x, tabY);
      container.setDepth(10);

      // Fond de l'onglet
      const bg = this.add.rectangle(0, 0, tabWidth, tabHeight, PROGRESSION.categoryColors[category], 0.3);
      bg.setStrokeStyle(2, PROGRESSION.categoryColors[category]);

      // Texte
      const text = this.add.text(0, 0, PROGRESSION.categoryNames[category].toUpperCase(), {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      text.setOrigin(0.5);

      container.add([bg, text]);
      container.setAlpha(0);

      // Interactivité
      container.setSize(tabWidth, tabHeight);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerover', () => {
        bg.setFillStyle(PROGRESSION.categoryColors[category], 0.5);
      });

      container.on('pointerout', () => {
        if (this.selectedCategory !== category) {
          bg.setFillStyle(PROGRESSION.categoryColors[category], 0.3);
        }
      });

      container.on('pointerdown', () => {
        this.selectCategory(category);
      });

      this.categoryTabs.set(category, container);

      // Animation d'apparition
      this.tweens.add({
        targets: container,
        alpha: 1,
        duration: 300,
        delay: 300 + index * 100,
      });
    });

    // Sélectionner la première catégorie
    this.updateTabStyles();
  }

  /**
   * Sélectionne une catégorie
   */
  private selectCategory(category: PermanentUpgradeCategory): void {
    if (this.selectedCategory === category) return;

    this.selectedCategory = category;
    this.updateTabStyles();
    this.refreshUpgradeTree();
  }

  /**
   * Met à jour les styles des onglets
   */
  private updateTabStyles(): void {
    this.categoryTabs.forEach((container, category) => {
      const bg = container.list[0] as Phaser.GameObjects.Rectangle;
      if (category === this.selectedCategory) {
        bg.setFillStyle(PROGRESSION.categoryColors[category], 0.7);
        bg.setStrokeStyle(3, 0xffffff);
      } else {
        bg.setFillStyle(PROGRESSION.categoryColors[category], 0.3);
        bg.setStrokeStyle(2, PROGRESSION.categoryColors[category]);
      }
    });
  }

  /**
   * Crée l'arbre d'upgrades
   */
  private createUpgradeTree(): void {
    // Graphiques pour les lignes de connexion
    this.connectingLines = this.add.graphics();
    this.connectingLines.setDepth(5);

    this.refreshUpgradeTree();
  }

  /**
   * Rafraîchit l'affichage de l'arbre d'upgrades
   */
  private refreshUpgradeTree(): void {
    // Nettoyer les anciens nodes
    this.upgradeNodes.forEach((node) => node.container.destroy());
    this.upgradeNodes = [];
    this.connectingLines.clear();

    const upgrades = getUpgradesByCategory(this.selectedCategory);
    const nodeWidth = 180;
    const nodeHeight = 100;
    const verticalSpacing = 130;
    const startY = 200;
    const centerX = GAME_WIDTH / 2;

    const categoryColor = PROGRESSION.categoryColors[this.selectedCategory];

    // Dessiner les lignes de connexion
    this.connectingLines.lineStyle(2, categoryColor, 0.5);

    upgrades.forEach((upgrade, index) => {
      const y = startY + index * verticalSpacing;
      const node = this.createUpgradeNode(upgrade, centerX, y, nodeWidth, nodeHeight, categoryColor);
      this.upgradeNodes.push(node);

      // Ligne de connexion au node suivant
      if (index < upgrades.length - 1) {
        this.connectingLines.beginPath();
        this.connectingLines.moveTo(centerX, y + nodeHeight / 2);
        this.connectingLines.lineTo(centerX, y + verticalSpacing - nodeHeight / 2);
        this.connectingLines.strokePath();
      }
    });
  }

  /**
   * Crée un node d'upgrade
   */
  private createUpgradeNode(
    upgrade: PermanentUpgradeDefinition,
    x: number,
    y: number,
    width: number,
    height: number,
    categoryColor: number
  ): UpgradeNode {
    const container = this.add.container(x, y);
    container.setDepth(10);

    const currentLevel = this.saveManager.getUpgradeLevel(upgrade.id);
    const isMaxed = currentLevel >= upgrade.maxLevel;
    const cost = getUpgradeCost(upgrade, currentLevel);
    const canAfford = !isMaxed && this.saveManager.getAvailableXP() >= cost;
    const prereqMet = this.isPrerequisiteMet(upgrade);

    // Fond
    const bgColor = isMaxed ? 0x444444 : (prereqMet ? categoryColor : 0x222222);
    const bgAlpha = isMaxed ? 0.8 : (canAfford && prereqMet ? 0.6 : 0.3);
    const bg = this.add.rectangle(0, 0, width, height, bgColor, bgAlpha);
    bg.setStrokeStyle(2, isMaxed ? 0x888888 : (prereqMet ? categoryColor : 0x444444));

    // Icône (cercle simple pour l'instant)
    const icon = this.add.graphics();
    icon.fillStyle(categoryColor, isMaxed ? 0.5 : 1);
    icon.fillCircle(-width / 2 + 30, 0, 15);
    if (isMaxed) {
      icon.lineStyle(2, 0xffffff);
      icon.strokeCircle(-width / 2 + 30, 0, 15);
    }

    // Nom de l'upgrade
    const nameText = this.add.text(-width / 2 + 55, -25, upgrade.name, {
      fontSize: '14px',
      color: prereqMet ? '#ffffff' : '#666666',
      fontStyle: 'bold',
    });

    // Description
    const descText = this.add.text(-width / 2 + 55, -5, upgrade.description, {
      fontSize: '11px',
      color: prereqMet ? '#cccccc' : '#555555',
      wordWrap: { width: width - 70 },
    });

    // Niveau et coût
    const levelStr = `${currentLevel}/${upgrade.maxLevel}`;
    const costStr = isMaxed ? 'MAX' : `${cost} XP`;
    const levelText = this.add.text(width / 2 - 10, -height / 2 + 10, levelStr, {
      fontSize: '12px',
      color: isMaxed ? '#ffff00' : '#ffffff',
      fontStyle: 'bold',
    });
    levelText.setOrigin(1, 0);

    const costText = this.add.text(width / 2 - 10, height / 2 - 20, costStr, {
      fontSize: '12px',
      color: canAfford ? '#00ff00' : (isMaxed ? '#888888' : '#ff4444'),
    });
    costText.setOrigin(1, 0);

    container.add([bg, icon, nameText, descText, levelText, costText]);

    // Interactivité
    if (!isMaxed && prereqMet) {
      container.setSize(width, height);
      container.setInteractive({ useHandCursor: canAfford });

      container.on('pointerover', () => {
        bg.setFillStyle(bgColor, Math.min(bgAlpha + 0.2, 1));
        this.tweens.add({
          targets: container,
          scaleX: 1.02,
          scaleY: 1.02,
          duration: 100,
        });
      });

      container.on('pointerout', () => {
        bg.setFillStyle(bgColor, bgAlpha);
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
        });
      });

      container.on('pointerdown', () => {
        if (canAfford) {
          this.purchaseUpgrade(upgrade.id);
        } else {
          // Feedback: pas assez d'XP
          this.tweens.add({
            targets: container,
            x: x + 5,
            duration: 50,
            yoyo: true,
            repeat: 3,
          });
        }
      });
    }

    // Animation d'apparition
    container.setAlpha(0);
    container.setScale(0.9);
    this.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      delay: 400,
    });

    return {
      upgrade,
      container,
      levelText,
      icon,
      currentLevel,
    };
  }

  /**
   * Vérifie si un prérequis d'upgrade est rempli
   */
  private isPrerequisiteMet(upgrade: PermanentUpgradeDefinition): boolean {
    if (!upgrade.prerequisite) return true;

    const prereq = PERMANENT_UPGRADES.find((u) => u.id === upgrade.prerequisite);
    if (!prereq) return true;

    const prereqLevel = this.saveManager.getUpgradeLevel(prereq.id);
    return prereqLevel >= prereq.maxLevel;
  }

  /**
   * Achète un upgrade
   */
  private purchaseUpgrade(upgradeId: string): void {
    const upgrade = PERMANENT_UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return;

    const currentLevel = this.saveManager.getUpgradeLevel(upgradeId);
    const cost = getUpgradeCost(upgrade, currentLevel);

    if (this.saveManager.getAvailableXP() < cost) return;
    if (currentLevel >= upgrade.maxLevel) return;

    // Dépenser l'XP et mettre à jour le niveau
    this.saveManager.spendXP(cost);
    this.saveManager.setUpgradeLevel(upgradeId, currentLevel + 1);
    this.saveManager.save();

    // Effet visuel d'achat
    this.createPurchaseEffect();

    // Rafraîchir l'affichage
    this.updateXPDisplay();
    this.refreshUpgradeTree();
  }

  /**
   * Crée un effet visuel d'achat
   */
  private createPurchaseEffect(): void {
    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.2);
    flash.setDepth(100);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Met à jour l'affichage d'XP
   */
  private updateXPDisplay(): void {
    const availableXP = this.saveManager.getAvailableXP();
    this.xpText.setText(`XP disponible: ${availableXP}`);

    // Animation de mise à jour
    this.tweens.add({
      targets: this.xpText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
    });
  }

  /**
   * Crée le bouton de fermeture
   */
  private createCloseButton(): void {
    this.closeButton = this.add.container(GAME_WIDTH - 50, 50);
    this.closeButton.setDepth(100);

    const bg = this.add.circle(0, 0, 25, 0x444444);
    bg.setStrokeStyle(2, 0xffffff);

    const xLine1 = this.add.line(0, 0, -8, -8, 8, 8, 0xffffff);
    xLine1.setLineWidth(3);
    const xLine2 = this.add.line(0, 0, 8, -8, -8, 8, 0xffffff);
    xLine2.setLineWidth(3);

    this.closeButton.add([bg, xLine1, xLine2]);

    this.closeButton.setSize(50, 50);
    this.closeButton.setInteractive({ useHandCursor: true });

    this.closeButton.on('pointerover', () => {
      bg.setFillStyle(0x666666);
    });

    this.closeButton.on('pointerout', () => {
      bg.setFillStyle(0x444444);
    });

    this.closeButton.on('pointerdown', () => {
      this.close();
    });

    // Animation d'apparition
    this.closeButton.setAlpha(0);
    this.tweens.add({
      targets: this.closeButton,
      alpha: 1,
      duration: 300,
      delay: 500,
    });

    // Touche Échap pour fermer
    this.input.keyboard?.on('keydown-ESC', () => {
      this.close();
    });
  }

  /**
   * Anime l'entrée de la scène
   */
  private animateIn(): void {
    // Les animations sont déjà gérées dans les méthodes de création
  }

  /**
   * Ferme la scène
   */
  private close(): void {
    // Animation de fermeture
    this.tweens.add({
      targets: [this.titleText, this.xpText, ...Array.from(this.categoryTabs.values())],
      alpha: 0,
      duration: 200,
    });

    this.upgradeNodes.forEach((node) => {
      this.tweens.add({
        targets: node.container,
        alpha: 0,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 200,
      });
    });

    this.tweens.add({
      targets: this.overlay,
      fillAlpha: 0,
      duration: 300,
    });

    this.tweens.add({
      targets: this.closeButton,
      alpha: 0,
      duration: 200,
    });

    this.time.delayedCall(350, () => {
      // Reprendre la scène parente
      if (this.parentScene) {
        this.parentScene.scene.resume();
      }

      // Callback
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }

      this.scene.stop();
    });
  }

  /**
   * Nettoie la scène
   */
  shutdown(): void {
    this.upgradeNodes.forEach((node) => node.container.destroy());
    this.upgradeNodes = [];
    this.categoryTabs.clear();
  }
}
