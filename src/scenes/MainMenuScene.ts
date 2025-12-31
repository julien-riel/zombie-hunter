import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import { SaveManager } from '@managers/SaveManager';
import { DeviceDetector } from '@utils/DeviceDetector';
import { OrientationOverlay } from '@ui/OrientationOverlay';

/**
 * Configuration d'un bouton de menu
 */
interface MenuButtonConfig {
  text: string;
  onClick: () => void;
  enabled?: boolean;
}

/**
 * Scène du menu principal (Phase 8.1)
 *
 * Point d'entrée du jeu après le chargement.
 * Permet la navigation vers les différentes parties du jeu.
 */
export class MainMenuScene extends Phaser.Scene {
  private buttons: Phaser.GameObjects.Container[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;
  private backgroundZombies: Phaser.GameObjects.Rectangle[] = [];
  private selectedButtonIndex: number = 0;
  private isMobile: boolean = false;
  private orientationOverlay: OrientationOverlay | null = null;

  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  /**
   * Crée les éléments de la scène
   */
  create(): void {
    // Détecter le mode mobile
    this.isMobile = !DeviceDetector.isDesktop();

    // Créer l'overlay d'orientation pour mobile (Phase 5)
    if (this.isMobile) {
      this.orientationOverlay = new OrientationOverlay(this);

      // Essayer de verrouiller l'orientation en mode paysage
      this.orientationOverlay.tryLockLandscape().then((locked) => {
        if (locked) {
          console.log('[MainMenuScene] Orientation locked to landscape');
        }
      });
    }

    // Fond animé
    this.createBackground();

    // Logo et titre
    this.createTitle();

    // Boutons de menu
    this.createMenuButtons();

    // Version du jeu
    this.createVersionText();

    // Configuration des contrôles clavier (uniquement sur desktop)
    if (!this.isMobile) {
      this.setupKeyboardControls();
    }

    // Animation d'entrée
    this.animateIn();
  }

  /**
   * Mise à jour
   */
  update(): void {
    // Animer les zombies en arrière-plan
    this.updateBackgroundZombies();
  }

  /**
   * Crée le fond animé
   */
  private createBackground(): void {
    // Fond dégradé
    const bg = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x1a1a2e
    );
    bg.setDepth(-10);

    // Grille de fond
    const graphics = this.add.graphics();
    graphics.setDepth(-9);
    graphics.lineStyle(1, 0x2a2a4e, 0.3);

    // Lignes horizontales
    for (let y = 0; y <= GAME_HEIGHT; y += 32) {
      graphics.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Lignes verticales
    for (let x = 0; x <= GAME_WIDTH; x += 32) {
      graphics.lineBetween(x, 0, x, GAME_HEIGHT);
    }

    // Créer des "zombies" en arrière-plan (rectangles verts qui passent)
    this.createBackgroundZombies();
  }

  /**
   * Crée les zombies d'arrière-plan
   */
  private createBackgroundZombies(): void {
    const numZombies = 8;

    for (let i = 0; i < numZombies; i++) {
      const zombie = this.add.rectangle(
        -50,
        Phaser.Math.Between(100, GAME_HEIGHT - 100),
        32,
        32,
        0x27ae60,
        0.15
      );
      zombie.setDepth(-5);
      zombie.setData('speed', Phaser.Math.Between(20, 60));
      zombie.setData('direction', Math.random() > 0.5 ? 1 : -1);

      // Position initiale aléatoire
      zombie.x = Phaser.Math.Between(0, GAME_WIDTH);

      this.backgroundZombies.push(zombie);
    }
  }

  /**
   * Met à jour les zombies d'arrière-plan
   */
  private updateBackgroundZombies(): void {
    for (const zombie of this.backgroundZombies) {
      const speed = zombie.getData('speed') as number;
      const direction = zombie.getData('direction') as number;

      zombie.x += speed * direction * 0.016; // deltaTime approximatif

      // Réinitialiser si hors écran
      if (direction > 0 && zombie.x > GAME_WIDTH + 50) {
        zombie.x = -50;
        zombie.y = Phaser.Math.Between(100, GAME_HEIGHT - 100);
        zombie.setData('speed', Phaser.Math.Between(20, 60));
      } else if (direction < 0 && zombie.x < -50) {
        zombie.x = GAME_WIDTH + 50;
        zombie.y = Phaser.Math.Between(100, GAME_HEIGHT - 100);
        zombie.setData('speed', Phaser.Math.Between(20, 60));
      }
    }
  }

  /**
   * Crée le titre du jeu
   */
  private createTitle(): void {
    // Tailles adaptées pour mobile
    const titleFontSize = this.isMobile ? '48px' : '64px';
    const subtitleFontSize = this.isMobile ? '20px' : '24px';
    const titleY = this.isMobile ? 100 : 120;
    const subtitleY = this.isMobile ? 150 : 180;

    // Titre principal
    this.titleText = this.add.text(GAME_WIDTH / 2, titleY, 'ZOMBIE HUNTER', {
      fontSize: titleFontSize,
      color: '#e74c3c',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: this.isMobile ? 4 : 6,
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setAlpha(0);

    // Sous-titre
    this.subtitleText = this.add.text(GAME_WIDTH / 2, subtitleY, 'Survivez aux hordes', {
      fontSize: subtitleFontSize,
      color: '#bdc3c7',
    });
    this.subtitleText.setOrigin(0.5);
    this.subtitleText.setAlpha(0);

    // Animation de pulsation du titre
    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Crée les boutons du menu
   */
  private createMenuButtons(): void {
    const buttonConfigs: MenuButtonConfig[] = [
      { text: 'JOUER', onClick: () => this.startGame() },
      { text: 'PROGRESSION', onClick: () => this.openProgression() },
      { text: 'OPTIONS', onClick: () => this.openOptions() },
      { text: 'CREDITS', onClick: () => this.showCredits(), enabled: false },
    ];

    // Positions adaptées pour mobile (boutons plus grands, plus espacés)
    const startY = this.isMobile ? 220 : 300;
    const buttonSpacing = this.isMobile ? 80 : 70;

    buttonConfigs.forEach((config, index) => {
      const button = this.createMenuButton(
        GAME_WIDTH / 2,
        startY + index * buttonSpacing,
        config.text,
        config.onClick,
        config.enabled !== false
      );
      this.buttons.push(button);
    });
  }

  /**
   * Crée un bouton de menu
   */
  private createMenuButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    enabled: boolean = true
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Boutons plus grands sur mobile pour meilleur toucher tactile
    const buttonWidth = this.isMobile ? 320 : 280;
    const buttonHeight = this.isMobile ? 60 : 50;
    const fontSize = this.isMobile ? '28px' : '24px';

    // Fond du bouton
    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, enabled ? 0x2c3e50 : 0x1a1a2e, 1);
    bg.setStrokeStyle(3, enabled ? 0xe74c3c : 0x555555);

    // Texte du bouton
    const buttonText = this.add.text(0, 0, text, {
      fontSize,
      color: enabled ? '#ffffff' : '#666666',
      fontStyle: 'bold',
    });
    buttonText.setOrigin(0.5);

    container.add([bg, buttonText]);
    container.setAlpha(0);

    if (enabled) {
      bg.setInteractive({ useHandCursor: true });

      bg.on('pointerover', () => {
        this.selectButton(this.buttons.indexOf(container));
        bg.setFillStyle(0x3d566e);
        bg.setStrokeStyle(3, 0xff6b6b);
        this.tweens.add({
          targets: container,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 100,
        });
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(0x2c3e50);
        bg.setStrokeStyle(3, 0xe74c3c);
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
    }

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
   * Crée le texte de version
   */
  private createVersionText(): void {
    this.versionText = this.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 20, 'v0.8.0', {
      fontSize: '14px',
      color: '#666666',
    });
    this.versionText.setOrigin(1, 1);
    this.versionText.setAlpha(0);

    // Stats du joueur
    const saveManager = SaveManager.getInstance();
    const stats = saveManager.getStats();

    if (stats.gamesPlayed > 0) {
      const statsText = this.add.text(
        20,
        GAME_HEIGHT - 20,
        `Parties: ${stats.gamesPlayed} | Record: Vague ${stats.highestWave} | Kills: ${stats.totalKills}`,
        {
          fontSize: '14px',
          color: '#666666',
        }
      );
      statsText.setOrigin(0, 1);
      statsText.setAlpha(0);

      this.tweens.add({
        targets: statsText,
        alpha: 1,
        duration: 500,
        delay: 800,
      });
    }
  }

  /**
   * Configure les contrôles clavier
   */
  private setupKeyboardControls(): void {
    if (!this.input.keyboard) return;

    // Entrée pour jouer
    this.input.keyboard.on('keydown-ENTER', () => {
      const enabledButtons = this.buttons.filter((_, i) => i !== 3); // Tous sauf Crédits
      if (this.selectedButtonIndex < enabledButtons.length) {
        this.activateSelectedButton();
      }
    });

    // Espace pour jouer
    this.input.keyboard.on('keydown-SPACE', () => {
      this.activateSelectedButton();
    });

    // Navigation haut/bas
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
    const enabledIndices = [0, 1, 2]; // Indices des boutons activés (pas Crédits)
    const currentEnabledIndex = enabledIndices.indexOf(this.selectedButtonIndex);

    let newEnabledIndex = currentEnabledIndex + direction;
    if (newEnabledIndex < 0) newEnabledIndex = enabledIndices.length - 1;
    if (newEnabledIndex >= enabledIndices.length) newEnabledIndex = 0;

    this.selectButton(enabledIndices[newEnabledIndex]);
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
      oldBg.setStrokeStyle(3, 0xe74c3c);
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
    if (newButton && index !== 3) {
      // Pas pour Crédits
      const newBg = newButton.getAt(0) as Phaser.GameObjects.Rectangle;
      newBg.setFillStyle(0x3d566e);
      newBg.setStrokeStyle(3, 0xff6b6b);
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
        this.startGame();
        break;
      case 1:
        this.openProgression();
        break;
      case 2:
        this.openOptions();
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
      y: this.titleText.y - 20,
      duration: 600,
      ease: 'Power2',
    });

    // Sous-titre
    this.tweens.add({
      targets: this.subtitleText,
      alpha: 1,
      duration: 500,
      delay: 200,
    });

    // Boutons
    this.buttons.forEach((button, index) => {
      this.tweens.add({
        targets: button,
        alpha: 1,
        x: button.x,
        duration: 400,
        delay: 400 + index * 100,
        ease: 'Power2',
      });
    });

    // Version
    this.tweens.add({
      targets: this.versionText,
      alpha: 1,
      duration: 500,
      delay: 800,
    });
  }

  /**
   * Démarre le jeu
   */
  private startGame(): void {
    this.animateOut(() => {
      // Pour l'instant, aller directement au jeu
      // Plus tard: CharacterSelectScene puis ModeSelectScene
      this.scene.start(SCENE_KEYS.CHARACTER_SELECT);
    });
  }

  /**
   * Ouvre la progression
   */
  private openProgression(): void {
    this.scene.launch(SCENE_KEYS.PROGRESSION);
    this.scene.pause();

    // Écouter la fermeture de la scène de progression
    const progressionScene = this.scene.get(SCENE_KEYS.PROGRESSION);
    progressionScene.events.once('shutdown', () => {
      this.scene.resume();
    });
  }

  /**
   * Ouvre les options
   */
  private openOptions(): void {
    this.animateOut(() => {
      this.scene.start(SCENE_KEYS.OPTIONS);
    });
  }

  /**
   * Affiche les crédits
   */
  private showCredits(): void {
    // TODO: Implémenter l'écran des crédits
    console.log('Credits - Coming soon!');
  }

  /**
   * Animation de sortie
   */
  private animateOut(callback: () => void): void {
    // Fade out des éléments
    this.tweens.add({
      targets: [this.titleText, this.subtitleText, this.versionText, ...this.buttons],
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
    this.backgroundZombies = [];

    // Nettoyer l'overlay d'orientation (Phase 5)
    this.orientationOverlay?.destroy();
    this.orientationOverlay = null;
  }
}
