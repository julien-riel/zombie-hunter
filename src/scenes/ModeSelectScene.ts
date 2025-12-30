import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';

/**
 * Configuration d'un mode de jeu
 */
interface GameMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
  comingSoon?: boolean;
}

/**
 * Scène de sélection du mode de jeu (Phase 8.1)
 *
 * Permet au joueur de choisir le mode de jeu.
 * Pour l'instant, seul le mode Survie est disponible.
 */
export class ModeSelectScene extends Phaser.Scene {
  private modes: GameMode[] = [];
  private selectedIndex: number = 0;

  // Éléments visuels
  private titleText!: Phaser.GameObjects.Text;
  private modeCards: Phaser.GameObjects.Container[] = [];
  private descriptionPanel!: Phaser.GameObjects.Container;
  private buttons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: SCENE_KEYS.MODE_SELECT });
  }

  /**
   * Crée les éléments de la scène
   */
  create(): void {
    this.initModes();
    this.createBackground();
    this.createTitle();
    this.createModeCards();
    this.createDescriptionPanel();
    this.createButtons();
    this.setupKeyboardControls();
    this.animateIn();

    // Sélectionner le premier mode
    this.selectMode(0);
  }

  /**
   * Initialise les modes de jeu
   */
  private initModes(): void {
    this.modes = [
      {
        id: 'survival',
        name: 'SURVIE',
        description:
          'Survivez le plus longtemps possible face à des vagues infinies de zombies. ' +
          'La difficulté augmente progressivement. Essayez de battre votre record!',
        icon: '♾️',
        available: true,
      },
      {
        id: 'campaign',
        name: 'CAMPAGNE',
        description:
          'Parcourez une série de niveaux avec des objectifs variés. ' +
          'Découvrez l\'histoire de l\'épidémie et affrontez des boss redoutables.',
        icon: '📖',
        available: false,
        comingSoon: true,
      },
      {
        id: 'daily',
        name: 'DÉFI QUOTIDIEN',
        description:
          'Un défi unique chaque jour avec les mêmes conditions pour tous. ' +
          'Comparez vos scores avec d\'autres joueurs!',
        icon: '📅',
        available: false,
        comingSoon: true,
      },
    ];
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

    // Lignes décoratives
    const graphics = this.add.graphics();
    graphics.setDepth(-9);
    graphics.lineStyle(1, 0x2a2a4e, 0.2);

    for (let y = 0; y <= GAME_HEIGHT; y += 32) {
      graphics.lineBetween(0, y, GAME_WIDTH, y);
    }
    for (let x = 0; x <= GAME_WIDTH; x += 32) {
      graphics.lineBetween(x, 0, x, GAME_HEIGHT);
    }
  }

  /**
   * Crée le titre
   */
  private createTitle(): void {
    this.titleText = this.add.text(GAME_WIDTH / 2, 50, 'CHOISISSEZ UN MODE', {
      fontSize: '40px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setAlpha(0);

    // Personnage sélectionné
    const selectedChar = this.registry.get('selectedCharacter') || 'cop';
    const charText = this.add.text(GAME_WIDTH / 2, 90, `Personnage: ${selectedChar.toUpperCase()}`, {
      fontSize: '16px',
      color: '#f39c12',
    });
    charText.setOrigin(0.5);
    charText.setAlpha(0);

    this.tweens.add({
      targets: charText,
      alpha: 1,
      duration: 400,
      delay: 300,
    });
  }

  /**
   * Crée les cartes de mode
   */
  private createModeCards(): void {
    const startY = 200;
    const cardWidth = 350;
    const cardHeight = 120;
    const spacing = 30;

    this.modes.forEach((mode, index) => {
      const y = startY + index * (cardHeight + spacing);
      const card = this.createModeCard(GAME_WIDTH / 2, y, cardWidth, cardHeight, mode, index);
      this.modeCards.push(card);
    });
  }

  /**
   * Crée une carte de mode
   */
  private createModeCard(
    x: number,
    y: number,
    width: number,
    height: number,
    mode: GameMode,
    index: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const isAvailable = mode.available;
    const bgColor = isAvailable ? 0x2c3e50 : 0x1a1a2e;
    const borderColor = isAvailable ? 0x3498db : 0x555555;

    // Fond de la carte
    const bg = this.add.rectangle(0, 0, width, height, bgColor, 1);
    bg.setStrokeStyle(3, borderColor);

    // Icône
    const icon = this.add.text(-width / 2 + 40, 0, mode.icon, {
      fontSize: '40px',
    });
    icon.setOrigin(0.5);
    if (!isAvailable) {
      icon.setAlpha(0.5);
    }

    // Nom du mode
    const nameText = this.add.text(-width / 2 + 100, -20, mode.name, {
      fontSize: '24px',
      color: isAvailable ? '#ffffff' : '#666666',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0, 0.5);

    // Sous-texte (disponible ou bientôt)
    let subText: Phaser.GameObjects.Text;
    if (mode.comingSoon) {
      subText = this.add.text(-width / 2 + 100, 15, 'Bientôt disponible', {
        fontSize: '14px',
        color: '#f39c12',
        fontStyle: 'italic',
      });
    } else if (isAvailable) {
      subText = this.add.text(-width / 2 + 100, 15, 'Disponible', {
        fontSize: '14px',
        color: '#2ecc71',
      });
    } else {
      subText = this.add.text(-width / 2 + 100, 15, 'Verrouillé', {
        fontSize: '14px',
        color: '#e74c3c',
      });
    }
    subText.setOrigin(0, 0.5);

    container.add([bg, icon, nameText, subText]);
    container.setAlpha(0);

    // Interactivité
    if (isAvailable) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        this.selectMode(index);
      });
      bg.on('pointerdown', () => {
        this.confirmSelection();
      });
    }

    return container;
  }

  /**
   * Crée le panneau de description
   */
  private createDescriptionPanel(): void {
    this.descriptionPanel = this.add.container(GAME_WIDTH / 2, 580);

    // Fond
    const bg = this.add.rectangle(0, 0, 700, 80, 0x222236, 0.9);
    bg.setStrokeStyle(2, 0x34495e);
    this.descriptionPanel.add(bg);

    this.descriptionPanel.setAlpha(0);
  }

  /**
   * Met à jour la description
   */
  private updateDescription(mode: GameMode): void {
    // Supprimer tous les enfants sauf le fond (index 0)
    while (this.descriptionPanel.length > 1) {
      const child = this.descriptionPanel.getAt(1);
      if (child) {
        this.descriptionPanel.remove(child, true);
      }
    }

    // Texte de description
    const descText = this.add.text(0, 0, mode.description, {
      fontSize: '14px',
      color: '#bdc3c7',
      wordWrap: { width: 650 },
      align: 'center',
    });
    descText.setOrigin(0.5);
    this.descriptionPanel.add(descText);
  }

  /**
   * Crée les boutons
   */
  private createButtons(): void {
    // Bouton Retour
    const backBtn = this.createButton(150, GAME_HEIGHT - 50, 'RETOUR', () => this.goBack(), true);
    this.buttons.push(backBtn);

    // Bouton Lancer
    const launchBtn = this.createButton(GAME_WIDTH - 150, GAME_HEIGHT - 50, 'LANCER', () =>
      this.confirmSelection()
    );
    this.buttons.push(launchBtn);
  }

  /**
   * Crée un bouton
   */
  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    isBack: boolean = false
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const buttonWidth = 180;
    const buttonHeight = 50;

    const bgColor = isBack ? 0x8b0000 : 0x27ae60;
    const borderColor = isBack ? 0xff4444 : 0x2ecc71;
    const hoverColor = isBack ? 0xa52a2a : 0x2ecc71;

    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, bgColor, 1);
    bg.setStrokeStyle(3, borderColor);

    const buttonText = this.add.text(0, 0, text, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    buttonText.setOrigin(0.5);

    container.add([bg, buttonText]);
    container.setAlpha(0);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setFillStyle(hoverColor);
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor);
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });
    bg.on('pointerdown', onClick);

    return container;
  }

  /**
   * Configure les contrôles clavier
   */
  private setupKeyboardControls(): void {
    if (!this.input.keyboard) return;

    // Navigation
    this.input.keyboard.on('keydown-UP', () => this.navigateModes(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.navigateModes(1));
    this.input.keyboard.on('keydown-W', () => this.navigateModes(-1));
    this.input.keyboard.on('keydown-S', () => this.navigateModes(1));

    // Confirmation
    this.input.keyboard.on('keydown-ENTER', () => this.confirmSelection());
    this.input.keyboard.on('keydown-SPACE', () => this.confirmSelection());

    // Retour
    this.input.keyboard.on('keydown-ESC', () => this.goBack());
  }

  /**
   * Navigue entre les modes
   */
  private navigateModes(direction: number): void {
    let newIndex = this.selectedIndex + direction;

    // Trouver le prochain mode disponible
    while (newIndex >= 0 && newIndex < this.modes.length) {
      if (this.modes[newIndex].available) {
        this.selectMode(newIndex);
        return;
      }
      newIndex += direction;
    }

    // Wrap around
    if (direction > 0) {
      for (let i = 0; i < this.modes.length; i++) {
        if (this.modes[i].available) {
          this.selectMode(i);
          return;
        }
      }
    } else {
      for (let i = this.modes.length - 1; i >= 0; i--) {
        if (this.modes[i].available) {
          this.selectMode(i);
          return;
        }
      }
    }
  }

  /**
   * Sélectionne un mode
   */
  private selectMode(index: number): void {
    // Désélectionner l'ancien
    if (this.modeCards[this.selectedIndex]) {
      const oldCard = this.modeCards[this.selectedIndex];
      const oldBg = oldCard.getAt(0) as Phaser.GameObjects.Rectangle;
      const oldMode = this.modes[this.selectedIndex];
      if (oldMode.available) {
        oldBg.setStrokeStyle(3, 0x3498db);
      }
      this.tweens.add({
        targets: oldCard,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    }

    this.selectedIndex = index;

    // Sélectionner le nouveau
    const newCard = this.modeCards[index];
    if (newCard) {
      const newBg = newCard.getAt(0) as Phaser.GameObjects.Rectangle;
      const newMode = this.modes[index];
      if (newMode.available) {
        newBg.setStrokeStyle(3, 0xf39c12);
      }
      this.tweens.add({
        targets: newCard,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    }

    // Mettre à jour la description
    this.updateDescription(this.modes[index]);
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

    // Cartes
    this.modeCards.forEach((card, index) => {
      this.tweens.add({
        targets: card,
        alpha: 1,
        duration: 300,
        delay: 200 + index * 100,
      });
    });

    // Description
    this.tweens.add({
      targets: this.descriptionPanel,
      alpha: 1,
      duration: 400,
      delay: 500,
    });

    // Boutons
    this.buttons.forEach((button, index) => {
      this.tweens.add({
        targets: button,
        alpha: 1,
        duration: 300,
        delay: 600 + index * 100,
      });
    });
  }

  /**
   * Confirme la sélection et lance le jeu
   */
  private confirmSelection(): void {
    const mode = this.modes[this.selectedIndex];

    if (!mode.available) {
      // Animation de refus
      const card = this.modeCards[this.selectedIndex];
      if (card) {
        this.tweens.add({
          targets: card,
          x: card.x - 10,
          duration: 50,
          yoyo: true,
          repeat: 3,
        });
      }
      return;
    }

    // Stocker le mode sélectionné
    this.registry.set('selectedMode', mode.id);

    // Lancer le jeu
    this.animateOut(() => {
      this.scene.start(SCENE_KEYS.GAME);
    });
  }

  /**
   * Retourne à la sélection de personnage
   */
  private goBack(): void {
    this.animateOut(() => {
      this.scene.start(SCENE_KEYS.CHARACTER_SELECT);
    });
  }

  /**
   * Animation de sortie
   */
  private animateOut(callback: () => void): void {
    this.tweens.add({
      targets: [this.titleText, ...this.modeCards, this.descriptionPanel, ...this.buttons],
      alpha: 0,
      duration: 300,
      onComplete: callback,
    });
  }

  /**
   * Nettoie la scène
   */
  shutdown(): void {
    this.modeCards = [];
    this.buttons = [];
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners();
    }
  }
}
