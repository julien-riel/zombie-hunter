import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import { SaveManager } from '@managers/SaveManager';
import { CharacterFactory, CHARACTER_DISPLAY_ORDER, CHARACTER_UNLOCK_INFO } from '@characters/CharacterFactory';
import type { CharacterType } from '@/types/entities';
import type { CharacterInfo } from '@characters/Character';

/**
 * Scène de sélection de personnage (Phase 8.1)
 *
 * Permet au joueur de choisir son personnage avant de lancer une partie.
 * Affiche les personnages débloqués et leurs capacités.
 */
export class CharacterSelectScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private characterInfos: CharacterInfo[] = [];
  private selectedIndex: number = 0;

  // Éléments visuels
  private titleText!: Phaser.GameObjects.Text;
  private characterCards: Phaser.GameObjects.Container[] = [];
  private detailPanel!: Phaser.GameObjects.Container;
  private buttons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: SCENE_KEYS.CHARACTER_SELECT });
  }

  /**
   * Crée les éléments de la scène
   */
  create(): void {
    this.saveManager = SaveManager.getInstance();
    this.loadCharacterData();

    this.createBackground();
    this.createTitle();
    this.createCharacterGrid();
    this.createDetailPanel();
    this.createButtons();
    this.setupKeyboardControls();
    this.animateIn();

    // Sélectionner le premier personnage débloqué
    this.selectCharacter(0);
  }

  /**
   * Charge les données des personnages
   */
  private loadCharacterData(): void {
    const unlocks = this.saveManager.getUnlocks();
    this.characterInfos = CharacterFactory.getAllCharacterInfo(unlocks.characters);
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

    // Grille décorative
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
    this.titleText = this.add.text(GAME_WIDTH / 2, 40, 'CHOISISSEZ VOTRE PERSONNAGE', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setAlpha(0);
  }

  /**
   * Crée la grille de personnages
   */
  private createCharacterGrid(): void {
    const startX = 80;
    const startY = 120;
    const cardWidth = 150;
    const cardHeight = 180;
    const spacing = 20;
    const cols = 3;

    CHARACTER_DISPLAY_ORDER.forEach((charType, index) => {
      const charInfo = this.characterInfos.find((c) => c.id === charType);
      if (!charInfo) return;

      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardWidth + spacing) + cardWidth / 2;
      const y = startY + row * (cardHeight + spacing) + cardHeight / 2;

      const card = this.createCharacterCard(x, y, cardWidth, cardHeight, charInfo, index);
      this.characterCards.push(card);
    });
  }

  /**
   * Crée une carte de personnage
   */
  private createCharacterCard(
    x: number,
    y: number,
    width: number,
    height: number,
    charInfo: CharacterInfo,
    index: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const isUnlocked = charInfo.isUnlocked;
    const bgColor = isUnlocked ? 0x2c3e50 : 0x1a1a2e;
    const borderColor = isUnlocked ? 0x3498db : 0x555555;

    // Fond de la carte
    const bg = this.add.rectangle(0, 0, width, height, bgColor, 1);
    bg.setStrokeStyle(3, borderColor);

    // Portrait (placeholder coloré)
    const portraitColors: Record<CharacterType, number> = {
      cop: 0x3498db,
      doctor: 0x2ecc71,
      mechanic: 0xf39c12,
      athlete: 0x9b59b6,
      pyromaniac: 0xe74c3c,
      kid: 0x1abc9c,
    };
    const portraitColor = isUnlocked ? portraitColors[charInfo.id] : 0x555555;
    const portrait = this.add.rectangle(0, -30, 80, 80, portraitColor);
    portrait.setStrokeStyle(2, 0x000000);

    // Icône du personnage (première lettre)
    const initial = this.add.text(0, -30, charInfo.name.charAt(0).toUpperCase(), {
      fontSize: '36px',
      color: isUnlocked ? '#ffffff' : '#888888',
      fontStyle: 'bold',
    });
    initial.setOrigin(0.5);

    // Nom du personnage
    const nameText = this.add.text(0, 35, charInfo.name, {
      fontSize: '14px',
      color: isUnlocked ? '#ffffff' : '#666666',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5);

    // Description courte ou "Verrouillé"
    let descText: Phaser.GameObjects.Text;
    if (isUnlocked) {
      descText = this.add.text(0, 55, charInfo.playstyle.substring(0, 20) + '...', {
        fontSize: '10px',
        color: '#95a5a6',
      });
    } else {
      const unlockInfo = CHARACTER_UNLOCK_INFO[charInfo.id];
      const conditionText = unlockInfo.hidden ? '???' : unlockInfo.condition;
      descText = this.add.text(0, 55, conditionText, {
        fontSize: '10px',
        color: '#666666',
      });
    }
    descText.setOrigin(0.5);

    // Cadenas si verrouillé
    if (!isUnlocked) {
      const lock = this.add.text(width / 2 - 15, -height / 2 + 15, '🔒', {
        fontSize: '16px',
      });
      lock.setOrigin(0.5);
      container.add(lock);
    }

    container.add([bg, portrait, initial, nameText, descText]);
    container.setAlpha(0);

    // Interactivité
    if (isUnlocked) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        this.selectCharacter(index);
      });
      bg.on('pointerdown', () => {
        this.confirmSelection();
      });
    }

    return container;
  }

  /**
   * Crée le panneau de détails
   */
  private createDetailPanel(): void {
    this.detailPanel = this.add.container(830, 340);

    // Fond du panneau
    const bg = this.add.rectangle(0, 0, 380, 450, 0x222236, 0.95);
    bg.setStrokeStyle(3, 0x34495e);
    this.detailPanel.add(bg);

    this.detailPanel.setAlpha(0);
  }

  /**
   * Met à jour le panneau de détails
   */
  private updateDetailPanel(charInfo: CharacterInfo): void {
    // Supprimer tous les enfants sauf le fond (index 0)
    while (this.detailPanel.length > 1) {
      const child = this.detailPanel.getAt(1);
      if (child) {
        this.detailPanel.remove(child, true);
      }
    }

    const startY = -200;

    // Nom du personnage
    const nameText = this.add.text(0, startY, charInfo.name.toUpperCase(), {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5);
    this.detailPanel.add(nameText);

    // Style de jeu
    const playstyleText = this.add.text(0, startY + 35, charInfo.playstyle, {
      fontSize: '14px',
      color: '#f39c12',
      fontStyle: 'italic',
    });
    playstyleText.setOrigin(0.5);
    this.detailPanel.add(playstyleText);

    // Séparateur
    const sep1 = this.add.rectangle(0, startY + 60, 300, 2, 0x34495e);
    this.detailPanel.add(sep1);

    // Description
    const descText = this.add.text(0, startY + 90, charInfo.description, {
      fontSize: '12px',
      color: '#bdc3c7',
      wordWrap: { width: 340 },
      align: 'center',
    });
    descText.setOrigin(0.5, 0);
    this.detailPanel.add(descText);

    // Compétence active
    const abilityTitleText = this.add.text(-160, startY + 160, 'COMPÉTENCE:', {
      fontSize: '12px',
      color: '#3498db',
      fontStyle: 'bold',
    });
    this.detailPanel.add(abilityTitleText);

    const abilityNameText = this.add.text(-160, startY + 180, charInfo.abilityName, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.detailPanel.add(abilityNameText);

    const abilityDescText = this.add.text(-160, startY + 200, charInfo.abilityDescription, {
      fontSize: '11px',
      color: '#95a5a6',
      wordWrap: { width: 320 },
    });
    this.detailPanel.add(abilityDescText);

    // Passifs
    if (charInfo.passives.length > 0) {
      const passivesTitleText = this.add.text(-160, startY + 260, 'PASSIFS:', {
        fontSize: '12px',
        color: '#2ecc71',
        fontStyle: 'bold',
      });
      this.detailPanel.add(passivesTitleText);

      charInfo.passives.forEach((passive, index) => {
        const passiveText = this.add.text(-160, startY + 280 + index * 20, `• ${passive.description}`, {
          fontSize: '11px',
          color: '#95a5a6',
          wordWrap: { width: 320 },
        });
        this.detailPanel.add(passiveText);
      });
    }

    // Si verrouillé
    if (!charInfo.isUnlocked) {
      const lockOverlay = this.add.rectangle(0, 0, 380, 450, 0x000000, 0.7);
      this.detailPanel.add(lockOverlay);

      const lockText = this.add.text(0, -20, 'VERROUILLÉ', {
        fontSize: '32px',
        color: '#e74c3c',
        fontStyle: 'bold',
      });
      lockText.setOrigin(0.5);
      this.detailPanel.add(lockText);

      const conditionText = this.add.text(0, 30, charInfo.unlockCondition, {
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 300 },
      });
      conditionText.setOrigin(0.5);
      this.detailPanel.add(conditionText);
    }
  }

  /**
   * Crée les boutons
   */
  private createButtons(): void {
    // Bouton Retour
    const backBtn = this.createButton(150, GAME_HEIGHT - 50, 'RETOUR', () => this.goBack(), true);
    this.buttons.push(backBtn);

    // Bouton Confirmer
    const confirmBtn = this.createButton(GAME_WIDTH - 150, GAME_HEIGHT - 50, 'CONFIRMER', () =>
      this.confirmSelection()
    );
    this.buttons.push(confirmBtn);
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
    this.input.keyboard.on('keydown-LEFT', () => this.navigate(-1, 0));
    this.input.keyboard.on('keydown-RIGHT', () => this.navigate(1, 0));
    this.input.keyboard.on('keydown-UP', () => this.navigate(0, -1));
    this.input.keyboard.on('keydown-DOWN', () => this.navigate(0, 1));
    this.input.keyboard.on('keydown-A', () => this.navigate(-1, 0));
    this.input.keyboard.on('keydown-D', () => this.navigate(1, 0));
    this.input.keyboard.on('keydown-W', () => this.navigate(0, -1));
    this.input.keyboard.on('keydown-S', () => this.navigate(0, 1));

    // Confirmation
    this.input.keyboard.on('keydown-ENTER', () => this.confirmSelection());
    this.input.keyboard.on('keydown-SPACE', () => this.confirmSelection());

    // Retour
    this.input.keyboard.on('keydown-ESC', () => this.goBack());
  }

  /**
   * Navigue dans la grille
   */
  private navigate(dx: number, dy: number): void {
    const cols = 3;
    const currentCol = this.selectedIndex % cols;
    const currentRow = Math.floor(this.selectedIndex / cols);

    let newCol = currentCol + dx;
    let newRow = currentRow + dy;

    // Wrap around
    if (newCol < 0) newCol = cols - 1;
    if (newCol >= cols) newCol = 0;
    if (newRow < 0) newRow = Math.floor((this.characterCards.length - 1) / cols);
    if (newRow > Math.floor((this.characterCards.length - 1) / cols)) newRow = 0;

    let newIndex = newRow * cols + newCol;
    if (newIndex >= this.characterCards.length) {
      newIndex = this.characterCards.length - 1;
    }

    // Vérifier si le personnage est débloqué
    const charType = CHARACTER_DISPLAY_ORDER[newIndex];
    const charInfo = this.characterInfos.find((c) => c.id === charType);
    if (charInfo && charInfo.isUnlocked) {
      this.selectCharacter(newIndex);
    }
  }

  /**
   * Sélectionne un personnage
   */
  private selectCharacter(index: number): void {
    // Désélectionner l'ancien
    if (this.characterCards[this.selectedIndex]) {
      const oldCard = this.characterCards[this.selectedIndex];
      const oldBg = oldCard.getAt(0) as Phaser.GameObjects.Rectangle;
      const charType = CHARACTER_DISPLAY_ORDER[this.selectedIndex];
      const charInfo = this.characterInfos.find((c) => c.id === charType);
      if (charInfo?.isUnlocked) {
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
    const newCard = this.characterCards[index];
    if (newCard) {
      const newBg = newCard.getAt(0) as Phaser.GameObjects.Rectangle;
      newBg.setStrokeStyle(3, 0xf39c12);
      this.tweens.add({
        targets: newCard,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
      });
    }

    // Mettre à jour le panneau de détails
    const charType = CHARACTER_DISPLAY_ORDER[index];
    const charInfo = this.characterInfos.find((c) => c.id === charType);
    if (charInfo) {
      this.updateDetailPanel(charInfo);
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
      duration: 400,
    });

    // Cartes
    this.characterCards.forEach((card, index) => {
      this.tweens.add({
        targets: card,
        alpha: 1,
        duration: 300,
        delay: 200 + index * 80,
      });
    });

    // Panneau de détails
    this.tweens.add({
      targets: this.detailPanel,
      alpha: 1,
      duration: 400,
      delay: 400,
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
   * Confirme la sélection et passe à la suite
   */
  private confirmSelection(): void {
    const charType = CHARACTER_DISPLAY_ORDER[this.selectedIndex];
    const charInfo = this.characterInfos.find((c) => c.id === charType);

    if (!charInfo || !charInfo.isUnlocked) {
      // Animation de refus
      const card = this.characterCards[this.selectedIndex];
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

    // Stocker le personnage sélectionné (dans une variable globale ou registry)
    this.registry.set('selectedCharacter', charType);

    // Passer à la sélection de mode
    this.animateOut(() => {
      this.scene.start(SCENE_KEYS.MODE_SELECT);
    });
  }

  /**
   * Retourne au menu principal
   */
  private goBack(): void {
    this.animateOut(() => {
      this.scene.start(SCENE_KEYS.MENU);
    });
  }

  /**
   * Animation de sortie
   */
  private animateOut(callback: () => void): void {
    this.tweens.add({
      targets: [this.titleText, ...this.characterCards, this.detailPanel, ...this.buttons],
      alpha: 0,
      duration: 300,
      onComplete: callback,
    });
  }

  /**
   * Nettoie la scène
   */
  shutdown(): void {
    this.characterCards = [];
    this.buttons = [];
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners();
    }
  }
}
