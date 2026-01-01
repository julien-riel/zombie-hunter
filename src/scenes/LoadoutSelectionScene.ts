import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import { InventoryManager } from '@managers/InventoryManager';
import { WeaponRegistry } from '@systems/WeaponRegistry';
import type { WeaponDefinition, WeaponCategory, LoadoutConfig } from '@/types/inventory';
import type { GameScene } from './GameScene';
import { DeviceDetector } from '@utils/DeviceDetector';
import { getRarityColorHex } from '@/weapons/WeaponRarity';

/**
 * Données passées à la scène de sélection de loadout
 */
interface LoadoutSelectionSceneData {
  gameScene: GameScene;
  waveNumber: number;
}

/**
 * Représentation visuelle d'un slot d'arme
 */
interface WeaponSlotDisplay {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  descText: Phaser.GameObjects.Text;
  emptyText: Phaser.GameObjects.Text;
  category: WeaponCategory;
  slotIndex: 0 | 1;
  weaponId: string | null;
}

/**
 * Scène de sélection du loadout (Phase 5)
 *
 * Affichée entre les vagues, permet au joueur de modifier ses 4 armes:
 * - 2 slots de mêlée (touches 1-2)
 * - 2 slots à distance (touches 3-4)
 */
export class LoadoutSelectionScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private waveNumber: number = 0;
  private inventoryManager!: InventoryManager;
  private isMobile: boolean = false;

  // Éléments visuels
  private overlay!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private continueButton!: Phaser.GameObjects.Container;

  // Slots d'armes
  private weaponSlots: WeaponSlotDisplay[] = [];
  private selectedSlot: WeaponSlotDisplay | null = null;

  // Panneau de sélection d'arme
  private selectionPanel: Phaser.GameObjects.Container | null = null;

  // État
  private isClosing: boolean = false;
  private pendingLoadout!: LoadoutConfig;

  constructor() {
    super({ key: SCENE_KEYS.LOADOUT_SELECT });
  }

  /**
   * Initialise les données de la scène
   */
  init(data: LoadoutSelectionSceneData): void {
    this.gameScene = data.gameScene;
    this.waveNumber = data.waveNumber;
    this.isClosing = false;
    this.selectedSlot = null;
    this.weaponSlots = [];
    this.isMobile = !DeviceDetector.isDesktop();

    // Récupérer ou créer l'InventoryManager
    this.inventoryManager = this.gameScene.getInventoryManager();

    // Copier le loadout actuel pour modification
    this.pendingLoadout = this.inventoryManager.getLoadout();
  }

  /**
   * Crée les éléments de la scène
   */
  create(): void {
    // Pause le jeu en arrière-plan
    this.gameScene.scene.pause();

    this.createOverlay();
    this.createHeader();
    this.createWeaponSlots();
    this.createContinueButton();
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

    this.tweens.add({
      targets: this.overlay,
      fillAlpha: 0.85,
      duration: 300,
    });
  }

  /**
   * Crée l'en-tête (titre + sous-titre)
   */
  private createHeader(): void {
    const titleFontSize = this.isMobile ? '24px' : '32px';
    const subtitleFontSize = this.isMobile ? '14px' : '16px';
    const titleY = this.isMobile ? 35 : 50;
    const subtitleY = this.isMobile ? 65 : 85;

    // Titre principal
    this.titleText = this.add.text(GAME_WIDTH / 2, titleY, 'SÉLECTION DU LOADOUT', {
      fontSize: titleFontSize,
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setAlpha(0);

    // Sous-titre
    this.subtitleText = this.add.text(
      GAME_WIDTH / 2,
      subtitleY,
      `Préparez vos armes pour la vague ${this.waveNumber + 1}`,
      {
        fontSize: subtitleFontSize,
        color: '#aaaaaa',
      }
    );
    this.subtitleText.setOrigin(0.5);
    this.subtitleText.setAlpha(0);

    // Animation d'apparition
    this.tweens.add({
      targets: [this.titleText, this.subtitleText],
      alpha: 1,
      y: '-=10',
      duration: 400,
      delay: 200,
      ease: 'Power2',
    });
  }

  /**
   * Crée les 4 slots d'armes (2 mêlée + 2 distance)
   */
  private createWeaponSlots(): void {
    const slotWidth = this.isMobile ? 240 : 280;
    const slotHeight = this.isMobile ? 100 : 120;
    const slotSpacing = this.isMobile ? 15 : 20;
    const columnSpacing = this.isMobile ? 40 : 60;

    const centerX = GAME_WIDTH / 2;
    const startY = this.isMobile ? 120 : 150;

    // Colonnes: Mêlée à gauche, Distance à droite
    const meleeX = centerX - columnSpacing / 2 - slotWidth / 2;
    const rangedX = centerX + columnSpacing / 2 + slotWidth / 2;

    // Titres des colonnes
    const columnTitleFontSize = this.isMobile ? '16px' : '18px';

    const meleeTitle = this.add.text(meleeX, startY - 30, 'MÊLÉE (1-2)', {
      fontSize: columnTitleFontSize,
      color: '#ff6600',
      fontStyle: 'bold',
    });
    meleeTitle.setOrigin(0.5);
    meleeTitle.setAlpha(0);

    const rangedTitle = this.add.text(rangedX, startY - 30, 'DISTANCE (3-4)', {
      fontSize: columnTitleFontSize,
      color: '#00aaff',
      fontStyle: 'bold',
    });
    rangedTitle.setOrigin(0.5);
    rangedTitle.setAlpha(0);

    // Animation des titres
    this.tweens.add({
      targets: [meleeTitle, rangedTitle],
      alpha: 1,
      duration: 400,
      delay: 300,
    });

    // Créer les slots de mêlée
    for (let i = 0; i < 2; i++) {
      const y = startY + i * (slotHeight + slotSpacing);
      const weaponId = this.pendingLoadout.meleeSlots[i as 0 | 1];
      const slot = this.createWeaponSlot(
        meleeX,
        y,
        slotWidth,
        slotHeight,
        'melee',
        i as 0 | 1,
        weaponId,
        i + 1
      );
      this.weaponSlots.push(slot);
    }

    // Créer les slots à distance
    for (let i = 0; i < 2; i++) {
      const y = startY + i * (slotHeight + slotSpacing);
      const weaponId = this.pendingLoadout.rangedSlots[i as 0 | 1];
      const slot = this.createWeaponSlot(
        rangedX,
        y,
        slotWidth,
        slotHeight,
        'ranged',
        i as 0 | 1,
        weaponId,
        i + 3
      );
      this.weaponSlots.push(slot);
    }
  }

  /**
   * Crée un slot d'arme
   */
  private createWeaponSlot(
    x: number,
    y: number,
    width: number,
    height: number,
    category: WeaponCategory,
    slotIndex: 0 | 1,
    weaponId: string | null,
    keyNumber: number
  ): WeaponSlotDisplay {
    const container = this.add.container(x, y);

    // Couleur de fond selon la catégorie
    const bgColor = category === 'melee' ? 0x442200 : 0x002244;
    const borderColor = category === 'melee' ? 0xff6600 : 0x00aaff;

    // Fond du slot
    const bg = this.add.rectangle(0, 0, width, height, bgColor, 1);
    bg.setStrokeStyle(2, borderColor);
    bg.setInteractive({ useHandCursor: true });

    // Numéro de touche
    const keyFontSize = this.isMobile ? '14px' : '16px';
    const keyText = this.add.text(-width / 2 + 10, -height / 2 + 8, `[${keyNumber}]`, {
      fontSize: keyFontSize,
      color: '#666666',
    });

    // Texte "VIDE" pour slot vide
    const emptyText = this.add.text(0, 0, 'VIDE\n(Cliquer pour ajouter)', {
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#555555',
      align: 'center',
    });
    emptyText.setOrigin(0.5);
    emptyText.setVisible(!weaponId);

    // Nom de l'arme
    const nameText = this.add.text(0, -15, '', {
      fontSize: this.isMobile ? '14px' : '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5);

    // Description
    const descText = this.add.text(0, 12, '', {
      fontSize: this.isMobile ? '10px' : '12px',
      color: '#aaaaaa',
    });
    descText.setOrigin(0.5);

    container.add([bg, keyText, emptyText, nameText, descText]);
    container.setAlpha(0);

    // Remplir les infos si arme présente
    if (weaponId) {
      const definition = WeaponRegistry.get(weaponId);
      if (definition) {
        nameText.setText(definition.name);
        nameText.setColor(getRarityColorHex(definition.rarity));
        descText.setText(definition.description || '');
      }
    }

    const slotDisplay: WeaponSlotDisplay = {
      container,
      bg,
      nameText,
      descText,
      emptyText,
      category,
      slotIndex,
      weaponId,
    };

    // Interactivité
    bg.on('pointerover', () => {
      bg.setFillStyle(category === 'melee' ? 0x553311 : 0x113355);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor);
    });

    bg.on('pointerdown', () => {
      this.onSlotClick(slotDisplay);
    });

    // Animation d'apparition
    const delay = 400 + this.weaponSlots.length * 80;
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 300,
      delay,
    });

    return slotDisplay;
  }

  /**
   * Gère le clic sur un slot
   */
  private onSlotClick(slot: WeaponSlotDisplay): void {
    // Fermer le panneau précédent s'il existe
    if (this.selectionPanel) {
      this.selectionPanel.destroy();
      this.selectionPanel = null;
    }

    this.selectedSlot = slot;
    this.createSelectionPanel(slot);
  }

  /**
   * Crée le panneau de sélection d'arme
   */
  private createSelectionPanel(slot: WeaponSlotDisplay): void {
    const panelWidth = this.isMobile ? 300 : 350;
    const panelX = GAME_WIDTH / 2;
    const panelY = this.isMobile ? GAME_HEIGHT / 2 + 80 : GAME_HEIGHT / 2 + 100;

    const container = this.add.container(panelX, panelY);

    // Récupérer les armes disponibles pour cette catégorie
    const availableWeapons =
      slot.category === 'melee'
        ? this.inventoryManager.getUnlockedMeleeWeapons()
        : this.inventoryManager.getUnlockedRangedWeapons();

    const itemHeight = this.isMobile ? 50 : 60;
    const panelHeight = Math.min((availableWeapons.length + 1) * itemHeight + 60, GAME_HEIGHT - 200);

    // Fond du panneau
    const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x222222, 0.98);
    bg.setStrokeStyle(2, slot.category === 'melee' ? 0xff6600 : 0x00aaff);
    container.add(bg);

    // Titre
    const titleText = slot.category === 'melee' ? 'Armes de mêlée' : 'Armes à distance';
    const title = this.add.text(0, -panelHeight / 2 + 20, titleText, {
      fontSize: this.isMobile ? '14px' : '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    container.add(title);

    // Bouton fermer
    const closeBtn = this.add.text(panelWidth / 2 - 15, -panelHeight / 2 + 10, 'X', {
      fontSize: '16px',
      color: '#ff4444',
      fontStyle: 'bold',
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      container.destroy();
      this.selectionPanel = null;
      this.selectedSlot = null;
    });
    container.add(closeBtn);

    // Option "Vider le slot"
    let itemY = -panelHeight / 2 + 55;
    const clearOption = this.createWeaponOption(
      container,
      0,
      itemY,
      panelWidth - 40,
      itemHeight - 10,
      null,
      slot
    );
    container.add(clearOption);
    itemY += itemHeight;

    // Liste des armes disponibles (scrollable si nécessaire)
    for (const weapon of availableWeapons) {
      if (itemY + itemHeight > panelHeight / 2 - 10) break; // Limite de hauteur

      const option = this.createWeaponOption(
        container,
        0,
        itemY,
        panelWidth - 40,
        itemHeight - 10,
        weapon,
        slot
      );
      container.add(option);
      itemY += itemHeight;
    }

    this.selectionPanel = container;

    // Animation d'apparition
    container.setScale(0.9);
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Power2',
    });
  }

  /**
   * Crée une option d'arme dans le panneau de sélection
   */
  private createWeaponOption(
    _parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    weapon: WeaponDefinition | null,
    slot: WeaponSlotDisplay
  ): Phaser.GameObjects.Container {
    const option = this.add.container(x, y);

    const isSelected = slot.weaponId === (weapon?.id || null);
    const bgColor = isSelected ? 0x444400 : 0x333333;
    const borderColor = isSelected ? 0xffff00 : 0x555555;

    const bg = this.add.rectangle(0, 0, width, height, bgColor, 1);
    bg.setStrokeStyle(1, borderColor);
    bg.setInteractive({ useHandCursor: true });
    option.add(bg);

    if (weapon) {
      // Nom de l'arme
      const nameText = this.add.text(-width / 2 + 10, -8, weapon.name, {
        fontSize: this.isMobile ? '12px' : '14px',
        color: getRarityColorHex(weapon.rarity),
        fontStyle: 'bold',
      });
      option.add(nameText);

      // Description
      const descText = this.add.text(-width / 2 + 10, 8, weapon.description || '', {
        fontSize: this.isMobile ? '9px' : '10px',
        color: '#888888',
      });
      option.add(descText);
    } else {
      // Option "Vider"
      const emptyText = this.add.text(0, 0, '(Vider ce slot)', {
        fontSize: this.isMobile ? '12px' : '14px',
        color: '#666666',
      });
      emptyText.setOrigin(0.5);
      option.add(emptyText);
    }

    // Interactivité
    bg.on('pointerover', () => {
      if (!isSelected) {
        bg.setFillStyle(0x444444);
      }
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor);
    });

    bg.on('pointerdown', () => {
      this.selectWeaponForSlot(slot, weapon?.id || null);
    });

    return option;
  }

  /**
   * Sélectionne une arme pour un slot
   */
  private selectWeaponForSlot(slot: WeaponSlotDisplay, weaponId: string | null): void {
    // Mettre à jour le loadout en attente
    if (slot.category === 'melee') {
      this.pendingLoadout.meleeSlots[slot.slotIndex] = weaponId;
    } else {
      this.pendingLoadout.rangedSlots[slot.slotIndex] = weaponId;
    }

    // Mettre à jour l'affichage du slot
    slot.weaponId = weaponId;

    if (weaponId) {
      const definition = WeaponRegistry.get(weaponId);
      if (definition) {
        slot.nameText.setText(definition.name);
        slot.nameText.setColor(getRarityColorHex(definition.rarity));
        slot.descText.setText(definition.description || '');
        slot.emptyText.setVisible(false);
        slot.nameText.setVisible(true);
        slot.descText.setVisible(true);
      }
    } else {
      slot.nameText.setText('');
      slot.descText.setText('');
      slot.emptyText.setVisible(true);
    }

    // Fermer le panneau de sélection
    if (this.selectionPanel) {
      this.selectionPanel.destroy();
      this.selectionPanel = null;
    }
    this.selectedSlot = null;

    // Effet de feedback
    this.flashEffect(0x00ff00);
  }

  /**
   * Crée le bouton "Continuer"
   */
  private createContinueButton(): void {
    const buttonWidth = this.isMobile ? 180 : 200;
    const buttonHeight = this.isMobile ? 45 : 50;
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - (this.isMobile ? 60 : 80);

    this.continueButton = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x00aa00, 1);
    bg.setStrokeStyle(3, 0x00ff00);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, 'CONTINUER', {
      fontSize: this.isMobile ? '16px' : '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    this.continueButton.add([bg, text]);
    this.continueButton.setAlpha(0);

    bg.on('pointerover', () => bg.setFillStyle(0x00cc00));
    bg.on('pointerout', () => bg.setFillStyle(0x00aa00));
    bg.on('pointerdown', () => this.confirmLoadout());

    // Animation
    this.tweens.add({
      targets: this.continueButton,
      alpha: 1,
      duration: 400,
      delay: 700,
    });
  }

  /**
   * Confirme le loadout et ferme la scène
   */
  private confirmLoadout(): void {
    // Valider que le loadout a au moins une arme
    if (!this.inventoryManager.isLoadoutValid(this.pendingLoadout)) {
      this.flashEffect(0xff0000);

      // Afficher un message d'erreur
      const errorText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 130, 'Au moins une arme requise!', {
        fontSize: '14px',
        color: '#ff4444',
        fontStyle: 'bold',
      });
      errorText.setOrigin(0.5);

      this.tweens.add({
        targets: errorText,
        alpha: 0,
        y: '-=20',
        duration: 1500,
        onComplete: () => errorText.destroy(),
      });

      return;
    }

    // Appliquer le loadout
    this.inventoryManager.setLoadout(this.pendingLoadout);

    // Équiper le loadout sur le joueur
    const player = this.gameScene.getPlayer();
    if (player) {
      player.equipLoadout(this.pendingLoadout);
    }

    this.closeScene();
  }

  /**
   * Animation d'apparition
   */
  private animateIn(): void {
    // Les animations sont gérées individuellement
  }

  /**
   * Effet de flash (feedback visuel)
   */
  private flashEffect(color: number): void {
    const flash = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      color,
      0.2
    );
    flash.setDepth(1000);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Ferme la scène
   */
  private closeScene(): void {
    if (this.isClosing) return;
    this.isClosing = true;

    // Fermer le panneau de sélection s'il est ouvert
    if (this.selectionPanel) {
      this.selectionPanel.destroy();
      this.selectionPanel = null;
    }

    // Animer la fermeture
    const targets = [
      this.overlay,
      this.titleText,
      this.subtitleText,
      this.continueButton,
      ...this.weaponSlots.map((s) => s.container),
    ];

    this.tweens.add({
      targets,
      alpha: 0,
      duration: 300,
    });

    this.time.delayedCall(350, () => {
      // Reprendre le jeu
      this.gameScene.scene.resume();

      // Émettre l'événement de fermeture
      this.gameScene.events.emit('loadoutSelectionClosed');

      // Arrêter cette scène
      this.scene.stop();
    });
  }

  /**
   * Nettoie la scène
   */
  shutdown(): void {
    this.weaponSlots = [];
    this.selectedSlot = null;
    if (this.selectionPanel) {
      this.selectionPanel.destroy();
      this.selectionPanel = null;
    }
  }
}
