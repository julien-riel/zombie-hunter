import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import { SaveManager } from '@managers/SaveManager';
import type { RunSummary } from '@managers/TelemetryManager';

/**
 * Données passées à la scène de Game Over
 */
interface GameOverSceneData {
  summary: RunSummary;
  isVictory?: boolean;
  xpEarned?: number;
}

/**
 * Scène de Game Over (Phase 8.1)
 *
 * Affiche les statistiques de la run, compare avec le high score,
 * et propose de rejouer ou retourner au menu.
 */
export class GameOverScene extends Phaser.Scene {
  private summary!: RunSummary;
  private isVictory: boolean = false;
  private xpEarned: number = 0;

  // Éléments visuels
  private overlay!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private statsContainer!: Phaser.GameObjects.Container;
  private buttons: Phaser.GameObjects.Container[] = [];
  private selectedButtonIndex: number = 0;
  private newHighScore: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  /**
   * Initialise les données de la scène
   */
  init(data: GameOverSceneData): void {
    this.summary = data.summary;
    this.isVictory = data.isVictory || false;
    this.xpEarned = data.xpEarned || 0;
    this.buttons = [];
    this.selectedButtonIndex = 0;

    // Mettre à jour les stats dans SaveManager
    this.updateSaveData();
  }

  /**
   * Met à jour les données de sauvegarde
   */
  private updateSaveData(): void {
    const saveManager = SaveManager.getInstance();

    // Ajouter les kills
    saveManager.addKills(this.summary.totalKills);

    // Vérifier si c'est un nouveau record
    this.newHighScore = saveManager.updateHighestWave(this.summary.maxWave);

    // Ajouter le temps de jeu
    saveManager.addPlayTime(this.summary.duration);

    // Incrémenter le nombre de parties
    saveManager.incrementGamesPlayed();

    // Ajouter la mort si pas de victoire
    if (!this.isVictory) {
      saveManager.addDeath();
    }

    // Ajouter l'XP
    if (this.xpEarned > 0) {
      saveManager.addXP(this.xpEarned);
    }

    // Sauvegarder
    saveManager.save();
  }

  /**
   * Crée les éléments de la scène
   */
  create(): void {
    this.createOverlay();
    this.createTitle();
    this.createStats();
    this.createButtons();
    this.setupKeyboardControls();
    this.animateIn();
  }

  /**
   * Crée l'overlay
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

    this.tweens.add({
      targets: this.overlay,
      fillAlpha: 0.9,
      duration: 500,
    });
  }

  /**
   * Crée le titre
   */
  private createTitle(): void {
    const titleColor = this.isVictory ? '#2ecc71' : '#e74c3c';
    const titleStr = this.isVictory ? 'VICTOIRE' : 'GAME OVER';

    this.titleText = this.add.text(GAME_WIDTH / 2, 60, titleStr, {
      fontSize: '64px',
      color: titleColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setAlpha(0);

    // Nouveau record?
    if (this.newHighScore) {
      const highScoreText = this.add.text(GAME_WIDTH / 2, 120, 'NOUVEAU RECORD!', {
        fontSize: '28px',
        color: '#f39c12',
        fontStyle: 'bold',
      });
      highScoreText.setOrigin(0.5);
      highScoreText.setAlpha(0);

      // Animation de pulsation
      this.tweens.add({
        targets: highScoreText,
        alpha: 1,
        duration: 500,
        delay: 800,
        onComplete: () => {
          this.tweens.add({
            targets: highScoreText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
          });
        },
      });
    }
  }

  /**
   * Crée l'affichage des stats
   */
  private createStats(): void {
    this.statsContainer = this.add.container(GAME_WIDTH / 2, 280);

    // Fond des stats
    const statsBg = this.add.rectangle(0, 0, 700, 280, 0x1a1a2e, 0.95);
    statsBg.setStrokeStyle(3, 0x34495e);
    this.statsContainer.add(statsBg);

    // Titre de section
    const statsTitle = this.add.text(0, -120, 'STATISTIQUES DE LA RUN', {
      fontSize: '22px',
      color: '#3498db',
      fontStyle: 'bold',
    });
    statsTitle.setOrigin(0.5);
    this.statsContainer.add(statsTitle);

    // Formater le temps
    const minutes = Math.floor(this.summary.duration / 60);
    const seconds = Math.floor(this.summary.duration % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Formater la précision
    const accuracyStr = `${Math.round(this.summary.accuracy * 100)}%`;

    // Stats principales (grille 3x3)
    const mainStats = [
      { label: 'Vague atteinte', value: this.summary.maxWave.toString(), color: '#ffffff' },
      { label: 'Score final', value: this.summary.finalScore.toLocaleString(), color: '#f39c12' },
      { label: 'Temps de survie', value: timeStr, color: '#ffffff' },
      { label: 'Zombies eliminés', value: this.summary.totalKills.toString(), color: '#2ecc71' },
      { label: 'Meilleur combo', value: `x${this.summary.maxCombo}`, color: '#9b59b6' },
      { label: 'Précision', value: accuracyStr, color: '#3498db' },
    ];

    const colWidth = 220;
    const rowHeight = 50;
    const startX = -220;
    const startY = -60;

    mainStats.forEach((stat, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = startX + col * colWidth;
      const y = startY + row * rowHeight;

      const labelText = this.add.text(x, y, stat.label, {
        fontSize: '14px',
        color: '#95a5a6',
      });
      labelText.setOrigin(0, 0.5);

      const valueText = this.add.text(x, y + 20, stat.value, {
        fontSize: '24px',
        color: stat.color,
        fontStyle: 'bold',
      });
      valueText.setOrigin(0, 0.5);

      this.statsContainer.add([labelText, valueText]);
    });

    // Dégâts et tirs
    const detailStats = [
      { label: 'Dégâts infligés', value: Math.round(this.summary.damageDealt).toLocaleString() },
      { label: 'Dégâts subis', value: Math.round(this.summary.damageTaken).toLocaleString() },
      { label: 'Tirs', value: `${this.summary.shotsHit}/${this.summary.shotsFired}` },
    ];

    const detailY = startY + rowHeight * 2 + 30;
    const detailColWidth = 180;

    detailStats.forEach((stat, index) => {
      const x = startX + index * detailColWidth;

      const labelText = this.add.text(x, detailY, stat.label, {
        fontSize: '12px',
        color: '#7f8c8d',
      });
      labelText.setOrigin(0, 0.5);

      const valueText = this.add.text(x, detailY + 18, stat.value, {
        fontSize: '16px',
        color: '#bdc3c7',
      });
      valueText.setOrigin(0, 0.5);

      this.statsContainer.add([labelText, valueText]);
    });

    // Cause de la mort (si applicable)
    if (!this.isVictory && this.summary.causeOfDeath) {
      const deathText = this.add.text(
        0,
        110,
        `Cause de mort: ${this.formatZombieType(this.summary.causeOfDeath.type)}`,
        {
          fontSize: '14px',
          color: '#e74c3c',
        }
      );
      deathText.setOrigin(0.5);
      this.statsContainer.add(deathText);
    }

    // XP gagnée
    if (this.xpEarned > 0) {
      const xpText = this.add.text(260, -80, `+${this.xpEarned} XP`, {
        fontSize: '24px',
        color: '#f39c12',
        fontStyle: 'bold',
      });
      xpText.setOrigin(0.5);
      this.statsContainer.add(xpText);

      // Animation d'apparition
      xpText.setAlpha(0);
      xpText.setScale(0.5);
      this.tweens.add({
        targets: xpText,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 500,
        delay: 1000,
        ease: 'Back.easeOut',
      });
    }

    this.statsContainer.setAlpha(0);
  }

  /**
   * Formate le type de zombie pour l'affichage
   */
  private formatZombieType(type: string): string {
    const names: Record<string, string> = {
      shambler: 'Shambler',
      runner: 'Runner',
      crawler: 'Crawler',
      tank: 'Tank',
      spitter: 'Spitter',
      bomber: 'Bomber',
      screamer: 'Screamer',
      splitter: 'Splitter',
      invisible: 'Invisible',
      necromancer: 'Necromancer',
      abomination: 'Abomination',
      patient_zero: 'Patient Zéro',
      colossus: 'Colosse',
    };
    return names[type] || type;
  }

  /**
   * Crée les boutons
   */
  private createButtons(): void {
    const buttonConfigs = [
      { text: 'REJOUER', onClick: () => this.restartGame() },
      { text: 'MENU PRINCIPAL', onClick: () => this.goToMenu() },
    ];

    const startY = 500;
    const buttonSpacing = 70;

    buttonConfigs.forEach((config, index) => {
      const button = this.createButton(
        GAME_WIDTH / 2,
        startY + index * buttonSpacing,
        config.text,
        config.onClick
      );
      this.buttons.push(button);
    });
  }

  /**
   * Crée un bouton
   */
  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const buttonWidth = 260;
    const buttonHeight = 50;

    // Fond du bouton
    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x2c3e50, 1);
    bg.setStrokeStyle(3, 0x3498db);

    // Texte du bouton
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    buttonText.setOrigin(0.5);

    container.add([bg, buttonText]);
    container.setAlpha(0);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      this.selectButton(this.buttons.indexOf(container));
      bg.setFillStyle(0x3d566e);
      bg.setStrokeStyle(3, 0x5dade2);
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x2c3e50);
      bg.setStrokeStyle(3, 0x3498db);
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    bg.on('pointerdown', () => {
      this.playClickEffect(container);
      onClick();
    });

    return container;
  }

  /**
   * Effet visuel au clic
   */
  private playClickEffect(button: Phaser.GameObjects.Container): void {
    this.tweens.add({
      targets: button,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 50,
      yoyo: true,
    });
  }

  /**
   * Configure les contrôles clavier
   */
  private setupKeyboardControls(): void {
    if (!this.input.keyboard) return;

    // Entrée pour activer
    this.input.keyboard.on('keydown-ENTER', () => {
      this.activateSelectedButton();
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      this.activateSelectedButton();
    });

    // Navigation
    this.input.keyboard.on('keydown-UP', () => {
      this.navigateButtons(-1);
    });

    this.input.keyboard.on('keydown-DOWN', () => {
      this.navigateButtons(1);
    });

    this.input.keyboard.on('keydown-W', () => {
      this.navigateButtons(-1);
    });

    this.input.keyboard.on('keydown-S', () => {
      this.navigateButtons(1);
    });

    // Raccourci pour rejouer
    this.input.keyboard.on('keydown-R', () => {
      this.restartGame();
    });
  }

  /**
   * Navigue entre les boutons
   */
  private navigateButtons(direction: number): void {
    let newIndex = this.selectedButtonIndex + direction;
    if (newIndex < 0) newIndex = this.buttons.length - 1;
    if (newIndex >= this.buttons.length) newIndex = 0;
    this.selectButton(newIndex);
  }

  /**
   * Sélectionne un bouton
   */
  private selectButton(index: number): void {
    // Désélectionner l'ancien
    const oldButton = this.buttons[this.selectedButtonIndex];
    if (oldButton) {
      const oldBg = oldButton.getAt(0) as Phaser.GameObjects.Rectangle;
      oldBg.setFillStyle(0x2c3e50);
      oldBg.setStrokeStyle(3, 0x3498db);
      this.tweens.add({
        targets: oldButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    }

    this.selectedButtonIndex = index;

    // Sélectionner le nouveau
    const newButton = this.buttons[index];
    if (newButton) {
      const newBg = newButton.getAt(0) as Phaser.GameObjects.Rectangle;
      newBg.setFillStyle(0x3d566e);
      newBg.setStrokeStyle(3, 0x5dade2);
      this.tweens.add({
        targets: newButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    }
  }

  /**
   * Active le bouton sélectionné
   */
  private activateSelectedButton(): void {
    switch (this.selectedButtonIndex) {
      case 0:
        this.restartGame();
        break;
      case 1:
        this.goToMenu();
        break;
    }
  }

  /**
   * Animation d'entrée
   */
  private animateIn(): void {
    // Titre
    this.tweens.add({
      targets: this.titleText,
      alpha: 1,
      y: this.titleText.y - 10,
      duration: 500,
      ease: 'Power2',
    });

    // Stats
    this.tweens.add({
      targets: this.statsContainer,
      alpha: 1,
      duration: 600,
      delay: 300,
    });

    // Boutons
    this.buttons.forEach((button, index) => {
      this.tweens.add({
        targets: button,
        alpha: 1,
        duration: 400,
        delay: 600 + index * 150,
      });
    });
  }

  /**
   * Relance le jeu
   */
  private restartGame(): void {
    this.animateOut(() => {
      this.scene.start(SCENE_KEYS.GAME);
    });
  }

  /**
   * Retourne au menu principal
   */
  private goToMenu(): void {
    this.animateOut(() => {
      this.scene.start(SCENE_KEYS.MENU);
    });
  }

  /**
   * Animation de sortie
   */
  private animateOut(callback: () => void): void {
    this.tweens.add({
      targets: [this.overlay, this.titleText, this.statsContainer, ...this.buttons],
      alpha: 0,
      duration: 300,
      onComplete: callback,
    });
  }

  /**
   * Nettoie la scène
   */
  shutdown(): void {
    this.buttons = [];
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners();
    }
  }
}
