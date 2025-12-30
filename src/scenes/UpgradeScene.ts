import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import { UPGRADE_SYSTEM_CONFIG } from '@config/upgrades';
import { UpgradeCard } from '@ui/UpgradeCard';
import type { UpgradeDefinition } from '@config/upgrades';
import type { GameScene } from './GameScene';

/**
 * Données passées à la scène d'upgrade
 */
interface UpgradeSceneData {
  gameScene: GameScene;
  waveNumber: number;
  choices: UpgradeDefinition[];
}

/**
 * Scène de sélection d'upgrade (Phase 6.5)
 *
 * Overlay qui pause le jeu et propose 3 cartes d'upgrade.
 * Le joueur DOIT en choisir une (pas de skip).
 */
export class UpgradeScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private waveNumber: number = 0;
  private choices: UpgradeDefinition[] = [];

  // Éléments visuels
  private overlay!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private cards: UpgradeCard[] = [];

  // État
  private selectionMade: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.UPGRADE });
  }

  /**
   * Initialise les données de la scène
   */
  init(data: UpgradeSceneData): void {
    this.gameScene = data.gameScene;
    this.waveNumber = data.waveNumber;
    this.choices = data.choices;
    this.selectionMade = false;
    this.cards = [];
  }

  /**
   * Crée les éléments de la scène
   */
  create(): void {
    // Pause le jeu en arrière-plan
    this.gameScene.scene.pause();

    this.createOverlay();
    this.createTitle();
    this.createCards();
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

    // Animation du fade in
    this.tweens.add({
      targets: this.overlay,
      fillAlpha: 0.8,
      duration: 300,
    });
  }

  /**
   * Crée le titre et sous-titre
   */
  private createTitle(): void {
    // Titre principal
    this.titleText = this.add.text(GAME_WIDTH / 2, 80, 'CHOISISSEZ UNE AMÉLIORATION', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setAlpha(0);

    // Sous-titre avec numéro de vague
    this.subtitleText = this.add.text(GAME_WIDTH / 2, 120, `Vague ${this.waveNumber} terminée`, {
      fontSize: '18px',
      color: '#aaaaaa',
    });
    this.subtitleText.setOrigin(0.5);
    this.subtitleText.setAlpha(0);

    // Animation d'apparition
    this.tweens.add({
      targets: [this.titleText, this.subtitleText],
      alpha: 1,
      y: '-=20',
      duration: 400,
      delay: 200,
      ease: 'Power2',
    });
  }

  /**
   * Crée les cartes d'upgrade
   */
  private createCards(): void {
    const cardWidth = 220;
    const cardHeight = 300;
    const cardSpacing = 40;
    const totalWidth = this.choices.length * cardWidth + (this.choices.length - 1) * cardSpacing;
    const startX = (GAME_WIDTH - totalWidth) / 2 + cardWidth / 2;
    const cardY = GAME_HEIGHT / 2 + 20;

    for (let i = 0; i < this.choices.length; i++) {
      const x = startX + i * (cardWidth + cardSpacing);

      const card = new UpgradeCard(this, {
        x,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
        upgrade: this.choices[i],
        onSelect: (upgrade) => this.onUpgradeSelected(upgrade, i),
      });

      this.cards.push(card);
    }
  }

  /**
   * Anime l'apparition des cartes
   */
  private animateIn(): void {
    const revealDelay = UPGRADE_SYSTEM_CONFIG.cardRevealDelay;

    this.cards.forEach((card, index) => {
      card.reveal(revealDelay * (index + 1));
    });
  }

  /**
   * Gère la sélection d'un upgrade
   */
  private onUpgradeSelected(upgrade: UpgradeDefinition, selectedIndex: number): void {
    if (this.selectionMade) return;
    this.selectionMade = true;

    // Verrouiller les autres cartes
    this.cards.forEach((card, index) => {
      if (index !== selectedIndex) {
        card.lock();
      }
    });

    // Appliquer l'upgrade via le système
    const upgradeSystem = this.gameScene.getUpgradeSystem();
    if (upgradeSystem) {
      upgradeSystem.applyUpgrade(upgrade);
    }

    // Attendre un moment puis fermer la scène
    this.time.delayedCall(800, () => {
      this.animateOut();
    });
  }

  /**
   * Anime la fermeture de la scène
   */
  private animateOut(): void {
    // Animer les cartes
    const outPromises = this.cards.map((card, index) => {
      return card.animateOut(index * 100);
    });

    // Fade out du titre et overlay
    this.tweens.add({
      targets: [this.titleText, this.subtitleText],
      alpha: 0,
      y: '-=30',
      duration: 300,
    });

    this.tweens.add({
      targets: this.overlay,
      fillAlpha: 0,
      duration: 400,
      delay: 200,
    });

    // Fermer la scène après les animations
    Promise.all(outPromises).then(() => {
      this.time.delayedCall(200, () => {
        this.closeScene();
      });
    });
  }

  /**
   * Ferme la scène et reprend le jeu
   */
  private closeScene(): void {
    // Reprendre le jeu
    this.gameScene.scene.resume();

    // Émettre l'événement de fermeture
    this.gameScene.events.emit('upgradeSceneClosed');

    // Arrêter cette scène
    this.scene.stop();
  }

  /**
   * Force la sélection d'un upgrade aléatoire (timeout)
   */
  public forceRandomSelection(): void {
    if (this.selectionMade) return;

    const randomIndex = Math.floor(Math.random() * this.cards.length);
    const card = this.cards[randomIndex];
    card.select();
  }

  /**
   * Nettoie la scène
   */
  shutdown(): void {
    this.cards.forEach(card => card.destroy());
    this.cards = [];
  }
}
