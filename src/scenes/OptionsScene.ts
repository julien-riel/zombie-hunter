import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import { SaveManager, type SettingsData } from '@managers/SaveManager';
import { DeviceDetector } from '@utils/DeviceDetector';

/**
 * Configuration d'un slider
 */
interface SliderConfig {
  x: number;
  y: number;
  width: number;
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

/**
 * Configuration d'un toggle
 */
interface ToggleConfig {
  x: number;
  y: number;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/**
 * Scène des options (Phase 8.1)
 *
 * Permet de configurer les paramètres audio, affichage et gameplay.
 * Les modifications sont sauvegardées automatiquement.
 */
export class OptionsScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private settings!: SettingsData;
  private isMobile: boolean = false;

  // Éléments visuels
  private titleText!: Phaser.GameObjects.Text;
  private categoryTabs: Phaser.GameObjects.Container[] = [];
  private contentContainer!: Phaser.GameObjects.Container;
  private backButton!: Phaser.GameObjects.Container;

  // État
  private currentCategory: 'audio' | 'display' | 'gameplay' = 'audio';
  private sliders: Map<string, { bar: Phaser.GameObjects.Rectangle; handle: Phaser.GameObjects.Rectangle; value: number }> = new Map();

  constructor() {
    super({ key: SCENE_KEYS.OPTIONS });
  }

  /**
   * Crée les éléments de la scène
   */
  create(): void {
    this.saveManager = SaveManager.getInstance();
    this.settings = { ...this.saveManager.getSettings() };
    this.isMobile = !DeviceDetector.isDesktop();

    this.createBackground();
    this.createTitle();
    this.createCategoryTabs();
    this.createContentContainer();
    this.createBackButton();
    this.showCategory('audio');
    this.animateIn();
  }

  /**
   * Crée le fond
   */
  private createBackground(): void {
    const bg = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x1a1a2e
    );
    bg.setDepth(-10);

    // Bordure décorative
    const border = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH - 60,
      GAME_HEIGHT - 60,
      0x000000,
      0
    );
    border.setStrokeStyle(2, 0x2c3e50);
  }

  /**
   * Crée le titre
   */
  private createTitle(): void {
    // Taille adaptée pour mobile
    const fontSize = this.isMobile ? '40px' : '48px';
    const titleY = this.isMobile ? 40 : 50;

    this.titleText = this.add.text(GAME_WIDTH / 2, titleY, 'OPTIONS', {
      fontSize,
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setAlpha(0);
  }

  /**
   * Crée les onglets de catégorie
   */
  private createCategoryTabs(): void {
    const categories: { id: 'audio' | 'display' | 'gameplay'; label: string }[] = [
      { id: 'audio', label: 'AUDIO' },
      { id: 'display', label: 'AFFICHAGE' },
      { id: 'gameplay', label: 'GAMEPLAY' },
    ];

    // Tailles adaptées pour mobile
    const tabWidth = this.isMobile ? 140 : 180;
    const tabHeight = this.isMobile ? 40 : 45;
    const tabSpacing = this.isMobile ? 10 : 20;
    const startX = GAME_WIDTH / 2 - (categories.length - 1) * (tabWidth / 2 + tabSpacing / 2);
    const tabY = this.isMobile ? 100 : 120;

    categories.forEach((cat, index) => {
      const x = startX + index * (tabWidth + tabSpacing);
      const tab = this.createCategoryTab(x, tabY, tabWidth, tabHeight, cat.label, cat.id);
      this.categoryTabs.push(tab);
    });
  }

  /**
   * Crée un onglet de catégorie
   */
  private createCategoryTab(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    id: 'audio' | 'display' | 'gameplay'
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const isActive = id === this.currentCategory;
    const bgColor = isActive ? 0x3498db : 0x2c3e50;
    const borderColor = isActive ? 0x5dade2 : 0x34495e;

    const bg = this.add.rectangle(0, 0, width, height, bgColor, 1);
    bg.setStrokeStyle(2, borderColor);

    // Taille de texte adaptée pour mobile
    const fontSize = this.isMobile ? '14px' : '16px';
    const text = this.add.text(0, 0, label, {
      fontSize,
      color: isActive ? '#ffffff' : '#95a5a6',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    container.add([bg, text]);
    container.setAlpha(0);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      if (this.currentCategory !== id) {
        bg.setFillStyle(0x3d566e);
      }
    });
    bg.on('pointerout', () => {
      if (this.currentCategory !== id) {
        bg.setFillStyle(0x2c3e50);
      }
    });
    bg.on('pointerdown', () => {
      this.showCategory(id);
    });

    return container;
  }

  /**
   * Crée le conteneur de contenu
   */
  private createContentContainer(): void {
    // Position adaptée pour mobile
    const containerY = this.isMobile ? 350 : 380;
    this.contentContainer = this.add.container(GAME_WIDTH / 2, containerY);

    // Fond du contenu (taille adaptée pour mobile)
    const bgWidth = this.isMobile ? 550 : 600;
    const bgHeight = this.isMobile ? 320 : 360;
    const contentBg = this.add.rectangle(0, 0, bgWidth, bgHeight, 0x222236, 0.9);
    contentBg.setStrokeStyle(2, 0x34495e);
    this.contentContainer.add(contentBg);

    this.contentContainer.setAlpha(0);
  }

  /**
   * Affiche une catégorie
   */
  private showCategory(category: 'audio' | 'display' | 'gameplay'): void {
    this.currentCategory = category;

    // Mettre à jour les onglets
    this.updateCategoryTabs();

    // Nettoyer le contenu actuel (sauf le fond à l'index 0)
    while (this.contentContainer.length > 1) {
      const child = this.contentContainer.getAt(1);
      if (child) {
        this.contentContainer.remove(child, true);
      }
    }

    // Afficher le contenu de la catégorie
    switch (category) {
      case 'audio':
        this.createAudioContent();
        break;
      case 'display':
        this.createDisplayContent();
        break;
      case 'gameplay':
        this.createGameplayContent();
        break;
    }
  }

  /**
   * Met à jour l'apparence des onglets
   */
  private updateCategoryTabs(): void {
    const categories: ('audio' | 'display' | 'gameplay')[] = ['audio', 'display', 'gameplay'];

    this.categoryTabs.forEach((tab, index) => {
      const bg = tab.getAt(0) as Phaser.GameObjects.Rectangle;
      const text = tab.getAt(1) as Phaser.GameObjects.Text;
      const isActive = categories[index] === this.currentCategory;

      bg.setFillStyle(isActive ? 0x3498db : 0x2c3e50);
      bg.setStrokeStyle(2, isActive ? 0x5dade2 : 0x34495e);
      text.setColor(isActive ? '#ffffff' : '#95a5a6');
    });
  }

  /**
   * Crée le contenu audio
   */
  private createAudioContent(): void {
    const startY = -120;
    const spacing = 80;

    // Volume musique
    this.createSlider({
      x: 0,
      y: startY,
      width: 400,
      label: 'Volume Musique',
      value: this.settings.musicVolume,
      onChange: (value) => {
        this.settings.musicVolume = value;
        this.saveSettings();
      },
    });

    // Volume effets
    this.createSlider({
      x: 0,
      y: startY + spacing,
      width: 400,
      label: 'Volume Effets',
      value: this.settings.sfxVolume,
      onChange: (value) => {
        this.settings.sfxVolume = value;
        this.saveSettings();
      },
    });

    // Muet global (toggle simple via le volume)
    const muteInfo = this.add.text(0, startY + spacing * 2, 'Mettez les volumes à 0 pour couper le son', {
      fontSize: '14px',
      color: '#7f8c8d',
    });
    muteInfo.setOrigin(0.5);
    this.contentContainer.add(muteInfo);
  }

  /**
   * Crée le contenu affichage
   */
  private createDisplayContent(): void {
    const startY = -100;
    const spacing = 70;

    // Vérifier si on est sur iOS Safari (ne supporte pas l'API Fullscreen)
    const isIOSSafari = DeviceDetector.isIOSSafari();
    const isStandalone = DeviceDetector.isStandalone();

    if (isIOSSafari && !isStandalone) {
      // iOS Safari - Afficher les instructions pour "Ajouter à l'écran d'accueil"
      this.createIOSFullscreenInstructions(startY);
    } else if (isStandalone) {
      // Mode standalone (ajouté à l'écran d'accueil)
      const standaloneInfo = this.add.text(
        0,
        startY,
        '✓ Mode plein écran actif\nVous jouez depuis l\'écran d\'accueil.',
        {
          fontSize: '16px',
          color: '#27ae60',
          align: 'center',
        }
      );
      standaloneInfo.setOrigin(0.5);
      this.contentContainer.add(standaloneInfo);
    } else {
      // Desktop et autres navigateurs - Mode normal
      const fullscreenInfo = this.add.text(
        0,
        startY,
        'Plein écran: F11 ou touche dédiée du navigateur',
        {
          fontSize: '14px',
          color: '#7f8c8d',
        }
      );
      fullscreenInfo.setOrigin(0.5);
      this.contentContainer.add(fullscreenInfo);

      // Bouton plein écran
      const fullscreenBtn = this.createActionButton(
        0,
        startY + 40,
        'Basculer Plein Écran',
        () => this.toggleFullscreen()
      );
      this.contentContainer.add(fullscreenBtn);
    }

    // Qualité graphique (info pour futur)
    const qualityInfo = this.add.text(
      0,
      startY + spacing + 60,
      'Qualité graphique: Haute (par défaut)\nLes options de qualité seront disponibles dans une future mise à jour.',
      {
        fontSize: '14px',
        color: '#7f8c8d',
        align: 'center',
      }
    );
    qualityInfo.setOrigin(0.5);
    this.contentContainer.add(qualityInfo);
  }

  /**
   * Crée les instructions pour iOS Safari (ajouter à l'écran d'accueil)
   */
  private createIOSFullscreenInstructions(startY: number): void {
    // Titre
    const title = this.add.text(0, startY, 'Plein écran sur Safari iOS', {
      fontSize: '18px',
      color: '#e74c3c',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    this.contentContainer.add(title);

    // Explication
    const explanation = this.add.text(
      0,
      startY + 30,
      'Safari iOS ne supporte pas le mode plein écran standard.\nPour une expérience immersive, ajoutez le jeu à votre écran d\'accueil:',
      {
        fontSize: '13px',
        color: '#bdc3c7',
        align: 'center',
        wordWrap: { width: 400 },
      }
    );
    explanation.setOrigin(0.5);
    this.contentContainer.add(explanation);

    // Instructions étape par étape
    const steps = [
      '1. Appuyez sur le bouton Partager (⬆️)',
      '2. Faites défiler et appuyez sur',
      '   "Sur l\'écran d\'accueil"',
      '3. Appuyez sur "Ajouter"',
      '4. Lancez le jeu depuis l\'icône créée',
    ];

    const stepsText = this.add.text(0, startY + 90, steps.join('\n'), {
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 5,
    });
    stepsText.setOrigin(0.5);
    this.contentContainer.add(stepsText);

    // Note finale
    const note = this.add.text(
      0,
      startY + 190,
      'Le jeu sera alors en plein écran sans barres de navigation.',
      {
        fontSize: '12px',
        color: '#27ae60',
      }
    );
    note.setOrigin(0.5);
    this.contentContainer.add(note);
  }

  /**
   * Crée le contenu gameplay
   */
  private createGameplayContent(): void {
    const startY = this.isMobile ? -120 : -100;
    const spacing = this.isMobile ? 65 : 80;
    const descFontSize = this.isMobile ? '11px' : '12px';

    // Mode de contrôle
    this.createInputModeSelector(0, startY);

    // Difficulté adaptative (DDA)
    this.createToggle({
      x: 0,
      y: startY + spacing,
      label: 'Difficulté Adaptative',
      value: this.settings.ddaEnabled,
      onChange: (value) => {
        this.settings.ddaEnabled = value;
        this.saveSettings();
      },
    });

    // Description DDA
    const ddaDesc = this.add.text(
      0,
      startY + spacing + 35,
      'Ajuste automatiquement la difficulté en fonction de vos performances.',
      {
        fontSize: descFontSize,
        color: '#7f8c8d',
      }
    );
    ddaDesc.setOrigin(0.5);
    this.contentContainer.add(ddaDesc);

    // Afficher tutoriels
    this.createToggle({
      x: 0,
      y: startY + spacing * 2,
      label: 'Afficher Tutoriels',
      value: this.settings.showTutorials,
      onChange: (value) => {
        this.settings.showTutorials = value;
        this.saveSettings();
      },
    });

    // Description tutoriels
    const tutorialDesc = this.add.text(
      0,
      startY + spacing * 2 + 35,
      'Affiche des conseils pour les nouveaux joueurs.',
      {
        fontSize: descFontSize,
        color: '#7f8c8d',
      }
    );
    tutorialDesc.setOrigin(0.5);
    this.contentContainer.add(tutorialDesc);

    // Contrôles (info) - seulement sur desktop
    if (!this.isMobile) {
      const controlsInfo = this.add.text(
        0,
        startY + spacing * 3,
        'Contrôles: WASD/Flèches pour se déplacer, Souris pour viser/tirer\nESPACE pour esquiver, R pour recharger, E pour interagir',
        {
          fontSize: descFontSize,
          color: '#95a5a6',
          align: 'center',
        }
      );
      controlsInfo.setOrigin(0.5);
      this.contentContainer.add(controlsInfo);
    }
  }

  /**
   * Crée le sélecteur de mode de contrôle
   */
  private createInputModeSelector(x: number, y: number): void {
    const modes: { id: 'auto' | 'keyboard' | 'touch'; label: string }[] = [
      { id: 'auto', label: 'Auto' },
      { id: 'keyboard', label: 'Clavier' },
      { id: 'touch', label: 'Tactile' },
    ];

    // Label
    const labelFontSize = this.isMobile ? '14px' : '16px';
    const labelText = this.add.text(x - 150, y, 'Mode de contrôle', {
      fontSize: labelFontSize,
      color: '#ffffff',
    });
    labelText.setOrigin(0, 0.5);
    this.contentContainer.add(labelText);

    // Boutons de sélection
    const buttonWidth = this.isMobile ? 70 : 80;
    const buttonHeight = this.isMobile ? 30 : 35;
    const buttonSpacing = this.isMobile ? 8 : 10;
    const startX = x + 40;

    const buttons: Phaser.GameObjects.Container[] = [];

    modes.forEach((mode, index) => {
      const buttonX = startX + index * (buttonWidth + buttonSpacing);
      const isActive = this.settings.inputMode === mode.id;

      const container = this.add.container(buttonX, y);

      const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, isActive ? 0x27ae60 : 0x2c3e50);
      bg.setStrokeStyle(2, isActive ? 0x2ecc71 : 0x34495e);

      const btnFontSize = this.isMobile ? '12px' : '14px';
      const text = this.add.text(0, 0, mode.label, {
        fontSize: btnFontSize,
        color: isActive ? '#ffffff' : '#95a5a6',
        fontStyle: isActive ? 'bold' : 'normal',
      });
      text.setOrigin(0.5);

      container.add([bg, text]);
      container.setData('mode', mode.id);
      container.setData('bg', bg);
      container.setData('text', text);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        if (this.settings.inputMode !== mode.id) {
          bg.setFillStyle(0x3d566e);
        }
      });
      bg.on('pointerout', () => {
        if (this.settings.inputMode !== mode.id) {
          bg.setFillStyle(0x2c3e50);
        }
      });
      bg.on('pointerdown', () => {
        this.selectInputMode(mode.id, buttons);
      });

      buttons.push(container);
      this.contentContainer.add(container);
    });
  }

  /**
   * Sélectionne un mode de contrôle
   */
  private selectInputMode(mode: 'auto' | 'keyboard' | 'touch', buttons: Phaser.GameObjects.Container[]): void {
    this.settings.inputMode = mode;
    this.saveSettings();

    // Mettre à jour l'apparence des boutons
    buttons.forEach((btn) => {
      const btnMode = btn.getData('mode') as string;
      const bg = btn.getData('bg') as Phaser.GameObjects.Rectangle;
      const text = btn.getData('text') as Phaser.GameObjects.Text;
      const isActive = btnMode === mode;

      bg.setFillStyle(isActive ? 0x27ae60 : 0x2c3e50);
      bg.setStrokeStyle(2, isActive ? 0x2ecc71 : 0x34495e);
      text.setColor(isActive ? '#ffffff' : '#95a5a6');
      text.setFontStyle(isActive ? 'bold' : 'normal');
    });
  }

  /**
   * Crée un slider
   */
  private createSlider(config: SliderConfig): void {
    const { x, y, width, label, value, onChange } = config;

    // Label
    const labelText = this.add.text(x - width / 2, y - 25, label, {
      fontSize: '16px',
      color: '#ffffff',
    });
    this.contentContainer.add(labelText);

    // Barre de fond
    const trackBg = this.add.rectangle(x, y, width, 8, 0x34495e);
    trackBg.setInteractive({ useHandCursor: true });
    this.contentContainer.add(trackBg);

    // Barre de valeur
    const valueBar = this.add.rectangle(
      x - width / 2 + (width * value) / 2,
      y,
      width * value,
      8,
      0x3498db
    );
    valueBar.setOrigin(0.5, 0.5);
    this.contentContainer.add(valueBar);

    // Handle
    const handle = this.add.rectangle(x - width / 2 + width * value, y, 16, 24, 0x5dade2);
    handle.setInteractive({ useHandCursor: true, draggable: true });
    this.contentContainer.add(handle);

    // Pourcentage
    const percentText = this.add.text(x + width / 2 + 20, y, `${Math.round(value * 100)}%`, {
      fontSize: '14px',
      color: '#ffffff',
    });
    percentText.setOrigin(0, 0.5);
    this.contentContainer.add(percentText);

    // Stocker pour mise à jour
    const sliderId = label;
    this.sliders.set(sliderId, { bar: valueBar, handle, value });

    // Drag handler
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Rectangle, dragX: number) => {
      if (gameObject === handle) {
        const minX = x - width / 2;
        const maxX = x + width / 2;
        const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);

        handle.x = clampedX;

        const newValue = (clampedX - minX) / width;
        valueBar.width = width * newValue;
        valueBar.x = minX + (width * newValue) / 2;
        percentText.setText(`${Math.round(newValue * 100)}%`);

        onChange(newValue);
      }
    });

    // Click sur la barre pour positionner
    trackBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - this.contentContainer.x;
      const minX = x - width / 2;
      const maxX = x + width / 2;
      const clampedX = Phaser.Math.Clamp(localX, minX, maxX);

      handle.x = clampedX;

      const newValue = (clampedX - minX) / width;
      valueBar.width = width * newValue;
      valueBar.x = minX + (width * newValue) / 2;
      percentText.setText(`${Math.round(newValue * 100)}%`);

      onChange(newValue);
    });
  }

  /**
   * Crée un toggle
   */
  private createToggle(config: ToggleConfig): void {
    const { x, y, label, value, onChange } = config;
    let currentValue = value;

    // Label
    const labelText = this.add.text(x - 150, y, label, {
      fontSize: '16px',
      color: '#ffffff',
    });
    labelText.setOrigin(0, 0.5);
    this.contentContainer.add(labelText);

    // Toggle background
    const toggleWidth = 60;
    const toggleHeight = 30;
    const toggleX = x + 120;

    const toggleBg = this.add.rectangle(
      toggleX,
      y,
      toggleWidth,
      toggleHeight,
      currentValue ? 0x27ae60 : 0x7f8c8d,
      1
    );
    toggleBg.setStrokeStyle(2, currentValue ? 0x2ecc71 : 0x95a5a6);
    toggleBg.setInteractive({ useHandCursor: true });
    this.contentContainer.add(toggleBg);

    // Toggle handle
    const handleX = currentValue ? toggleX + toggleWidth / 2 - 12 : toggleX - toggleWidth / 2 + 12;
    const toggleHandle = this.add.rectangle(handleX, y, 20, 24, 0xffffff);
    this.contentContainer.add(toggleHandle);

    // Status text
    const statusText = this.add.text(toggleX, y + 25, currentValue ? 'ON' : 'OFF', {
      fontSize: '12px',
      color: currentValue ? '#2ecc71' : '#95a5a6',
    });
    statusText.setOrigin(0.5);
    this.contentContainer.add(statusText);

    // Click handler
    toggleBg.on('pointerdown', () => {
      currentValue = !currentValue;

      // Animer le toggle
      this.tweens.add({
        targets: toggleHandle,
        x: currentValue ? toggleX + toggleWidth / 2 - 12 : toggleX - toggleWidth / 2 + 12,
        duration: 150,
        ease: 'Power2',
      });

      toggleBg.setFillStyle(currentValue ? 0x27ae60 : 0x7f8c8d);
      toggleBg.setStrokeStyle(2, currentValue ? 0x2ecc71 : 0x95a5a6);
      statusText.setText(currentValue ? 'ON' : 'OFF');
      statusText.setColor(currentValue ? '#2ecc71' : '#95a5a6');

      onChange(currentValue);
    });
  }

  /**
   * Crée un bouton d'action
   */
  private createActionButton(x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const buttonWidth = 200;
    const buttonHeight = 40;

    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x2c3e50, 1);
    bg.setStrokeStyle(2, 0x3498db);

    const buttonText = this.add.text(0, 0, text, {
      fontSize: '14px',
      color: '#ffffff',
    });
    buttonText.setOrigin(0.5);

    container.add([bg, buttonText]);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setFillStyle(0x3d566e);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x2c3e50);
    });
    bg.on('pointerdown', onClick);

    return container;
  }

  /**
   * Bascule le plein écran
   */
  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
    }
  }

  /**
   * Crée le bouton retour
   */
  private createBackButton(): void {
    this.backButton = this.add.container(100, GAME_HEIGHT - 50);

    const buttonWidth = 140;
    const buttonHeight = 45;

    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x2c3e50, 1);
    bg.setStrokeStyle(2, 0xe74c3c);

    const text = this.add.text(0, 0, 'RETOUR', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    this.backButton.add([bg, text]);
    this.backButton.setAlpha(0);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setFillStyle(0x8b0000);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x2c3e50);
    });
    bg.on('pointerdown', () => this.goBack());

    // Raccourci Échap
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ESC', () => this.goBack());
    }
  }

  /**
   * Sauvegarde les paramètres
   */
  private saveSettings(): void {
    for (const [key, value] of Object.entries(this.settings)) {
      this.saveManager.updateSetting(key as keyof SettingsData, value);
    }
    this.saveManager.save();
  }

  /**
   * Animation d'entrée
   */
  private animateIn(): void {
    // Titre
    this.tweens.add({
      targets: this.titleText,
      alpha: 1,
      duration: 400,
    });

    // Onglets
    this.categoryTabs.forEach((tab, index) => {
      this.tweens.add({
        targets: tab,
        alpha: 1,
        duration: 300,
        delay: 200 + index * 100,
      });
    });

    // Contenu
    this.tweens.add({
      targets: this.contentContainer,
      alpha: 1,
      duration: 400,
      delay: 400,
    });

    // Bouton retour
    this.tweens.add({
      targets: this.backButton,
      alpha: 1,
      duration: 300,
      delay: 500,
    });
  }

  /**
   * Retourne au menu
   */
  private goBack(): void {
    // Sauvegarder avant de quitter
    this.saveSettings();

    this.tweens.add({
      targets: [this.titleText, ...this.categoryTabs, this.contentContainer, this.backButton],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.scene.start(SCENE_KEYS.MENU);
      },
    });
  }

  /**
   * Nettoie la scène
   */
  shutdown(): void {
    this.categoryTabs = [];
    this.sliders.clear();
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners();
    }
  }
}
