import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import type { GameScene } from './GameScene';
import { DeviceDetector } from '@utils/DeviceDetector';

/**
 * Données passées à la scène de pause
 */
interface PauseSceneData {
  gameScene: GameScene;
}

/**
 * Scène de pause (Phase 8.1)
 *
 * Menu overlay qui pause le jeu et permet de reprendre,
 * d'accéder aux options ou de quitter la partie.
 */
export class PauseScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private isMobile: boolean = false;

  // Éléments visuels
  private overlay!: Phaser.GameObjects.Rectangle;
  private pauseText!: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Container[] = [];
  private statsContainer!: Phaser.GameObjects.Container;
  private selectedButtonIndex: number = 0;

  constructor() {
    super({ key: SCENE_KEYS.PAUSE });
  }

  /**
   * Initialise les données de la scène
   */
  init(data: PauseSceneData): void {
    this.gameScene = data.gameScene;
    this.buttons = [];
    this.selectedButtonIndex = 0;
    this.isMobile = !DeviceDetector.isDesktop();
  }

  /**
   * Crée les éléments de la scène
   */
  create(): void {
    // Pause le jeu en arrière-plan
    this.gameScene.scene.pause();

    this.createOverlay();
    this.createTitle();
    this.createStats();
    this.createButtons();
    // Contrôles clavier uniquement sur desktop
    if (!this.isMobile) {
      this.setupKeyboardControls();
    }
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
      fillAlpha: 0.85,
      duration: 200,
    });
  }

  /**
   * Crée le titre PAUSE
   */
  private createTitle(): void {
    // Taille adaptée pour mobile
    const fontSize = this.isMobile ? '56px' : '72px';
    const titleY = this.isMobile ? 80 : 100;

    this.pauseText = this.add.text(GAME_WIDTH / 2, titleY, 'PAUSE', {
      fontSize,
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: this.isMobile ? 3 : 4,
    });
    this.pauseText.setOrigin(0.5);
    this.pauseText.setAlpha(0);
  }

  /**
   * Crée l'affichage des stats de la run en cours
   */
  private createStats(): void {
    // Position adaptée pour mobile
    const containerY = this.isMobile ? 170 : 200;
    this.statsContainer = this.add.container(GAME_WIDTH / 2, containerY);

    const waveSystem = this.gameScene.getWaveSystem();
    const telemetry = this.gameScene.getTelemetryManager();
    const metrics = telemetry ? telemetry.getMetrics() : null;

    const currentWave = waveSystem ? waveSystem.getCurrentWave() : 0;
    const totalKills = metrics ? metrics.kills : 0;
    const gameTime = metrics ? metrics.gameTime : 0;
    const bestCombo = metrics ? metrics.maxCombo : 0;

    const timeMinutes = Math.floor(gameTime / 60000);
    const timeSeconds = Math.floor((gameTime % 60000) / 1000);
    const timeStr = `${timeMinutes}:${timeSeconds.toString().padStart(2, '0')}`;

    // Fond des stats (plus compact sur mobile)
    const bgWidth = this.isMobile ? 350 : 400;
    const bgHeight = this.isMobile ? 100 : 120;
    const statsBg = this.add.rectangle(0, 0, bgWidth, bgHeight, 0x2c3e50, 0.8);
    statsBg.setStrokeStyle(2, 0x34495e);
    this.statsContainer.add(statsBg);

    // Stats en grille
    const stats = [
      { label: 'Vague', value: currentWave.toString() },
      { label: 'Kills', value: totalKills.toString() },
      { label: 'Temps', value: timeStr },
      { label: 'Meilleur combo', value: `x${bestCombo}` },
    ];

    const colWidth = this.isMobile ? 80 : 100;
    const startX = this.isMobile ? -130 : -150;
    const colSpacing = this.isMobile ? 170 : 200;
    const labelFontSize = this.isMobile ? '12px' : '14px';
    const valueFontSize = this.isMobile ? '16px' : '18px';

    stats.forEach((stat, index) => {
      const x = startX + (index % 2) * colSpacing;
      const y = Math.floor(index / 2) * (this.isMobile ? 35 : 45) - (this.isMobile ? 20 : 30);

      const labelText = this.add.text(x, y, stat.label, {
        fontSize: labelFontSize,
        color: '#95a5a6',
      });
      labelText.setOrigin(0, 0.5);

      const valueText = this.add.text(x + colWidth, y, stat.value, {
        fontSize: valueFontSize,
        color: '#ffffff',
        fontStyle: 'bold',
      });
      valueText.setOrigin(0, 0.5);

      this.statsContainer.add([labelText, valueText]);
    });

    this.statsContainer.setAlpha(0);
  }

  /**
   * Crée les boutons du menu
   */
  private createButtons(): void {
    const buttonConfigs = [
      { text: 'REPRENDRE', onClick: () => this.resumeGame() },
      { text: 'OPTIONS', onClick: () => this.openOptions() },
      { text: 'QUITTER', onClick: () => this.quitToMenu() },
    ];

    // Positions adaptées pour mobile
    const startY = this.isMobile ? 290 : 350;
    const buttonSpacing = this.isMobile ? 70 : 60;

    buttonConfigs.forEach((config, index) => {
      const button = this.createButton(
        GAME_WIDTH / 2,
        startY + index * buttonSpacing,
        config.text,
        config.onClick,
        index === 2 // Quitter en rouge
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
    onClick: () => void,
    isDanger: boolean = false
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Boutons plus grands sur mobile pour meilleur toucher tactile
    const buttonWidth = this.isMobile ? 280 : 240;
    const buttonHeight = this.isMobile ? 55 : 45;
    const fontSize = this.isMobile ? '24px' : '20px';

    const bgColor = isDanger ? 0x8b0000 : 0x2c3e50;
    const borderColor = isDanger ? 0xff4444 : 0x3498db;
    const hoverBgColor = isDanger ? 0xa52a2a : 0x3d566e;
    const hoverBorderColor = isDanger ? 0xff6666 : 0x5dade2;

    // Fond du bouton
    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, bgColor, 1);
    bg.setStrokeStyle(2, borderColor);

    // Texte du bouton
    const buttonText = this.add.text(0, 0, text, {
      fontSize,
      color: '#ffffff',
      fontStyle: 'bold',
    });
    buttonText.setOrigin(0.5);

    container.add([bg, buttonText]);
    container.setAlpha(0);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      this.selectButton(this.buttons.indexOf(container));
      bg.setFillStyle(hoverBgColor);
      bg.setStrokeStyle(2, hoverBorderColor);
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor);
      bg.setStrokeStyle(2, borderColor);
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

    // Échap ou P pour reprendre
    this.input.keyboard.on('keydown-ESC', () => {
      this.resumeGame();
    });

    this.input.keyboard.on('keydown-P', () => {
      this.resumeGame();
    });

    // Entrée pour activer le bouton sélectionné
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
      const isDanger = this.selectedButtonIndex === 2;
      oldBg.setFillStyle(isDanger ? 0x8b0000 : 0x2c3e50);
      oldBg.setStrokeStyle(2, isDanger ? 0xff4444 : 0x3498db);
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
      const isDanger = index === 2;
      newBg.setFillStyle(isDanger ? 0xa52a2a : 0x3d566e);
      newBg.setStrokeStyle(2, isDanger ? 0xff6666 : 0x5dade2);
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
        this.resumeGame();
        break;
      case 1:
        this.openOptions();
        break;
      case 2:
        this.quitToMenu();
        break;
    }
  }

  /**
   * Animation d'entrée
   */
  private animateIn(): void {
    // Titre
    this.tweens.add({
      targets: this.pauseText,
      alpha: 1,
      y: this.pauseText.y - 10,
      duration: 300,
      ease: 'Power2',
    });

    // Stats
    this.tweens.add({
      targets: this.statsContainer,
      alpha: 1,
      duration: 400,
      delay: 150,
    });

    // Boutons
    this.buttons.forEach((button, index) => {
      this.tweens.add({
        targets: button,
        alpha: 1,
        duration: 300,
        delay: 200 + index * 80,
      });
    });
  }

  /**
   * Reprend le jeu
   */
  private resumeGame(): void {
    this.animateOut(() => {
      this.gameScene.scene.resume();
      this.scene.stop();
    });
  }

  /**
   * Ouvre les options (sous-menu)
   */
  private openOptions(): void {
    // Pour l'instant, juste un message
    // TODO: Implémenter un sous-menu d'options
    console.log('Options in pause menu - coming soon!');
  }

  /**
   * Quitte vers le menu principal
   */
  private quitToMenu(): void {
    this.animateOut(() => {
      // Arrêter toutes les scènes liées au jeu
      this.scene.stop(SCENE_KEYS.HUD);
      this.scene.stop(SCENE_KEYS.DEBUG);
      this.gameScene.scene.stop();
      this.scene.stop();

      // Retourner au menu
      this.scene.start(SCENE_KEYS.MENU);
    });
  }

  /**
   * Animation de sortie
   */
  private animateOut(callback: () => void): void {
    this.tweens.add({
      targets: [this.overlay, this.pauseText, this.statsContainer, ...this.buttons],
      alpha: 0,
      duration: 200,
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
