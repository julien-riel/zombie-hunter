import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import { BALANCE } from '@config/balance';
import type { GameScene } from './GameScene';
import type { Door } from '@arena/Door';
import { BarricadeType, DoorTrapType, type DoorState } from '@arena/Door';
import type { PurchaseType } from '@systems/EconomySystem';

/**
 * Données passées à la scène du menu tactique
 */
interface TacticalMenuSceneData {
  gameScene: GameScene;
  waveNumber: number;
  timeLimit?: number; // Temps limite en ms (optionnel)
}

/**
 * Information sur une porte pour l'affichage
 */
interface DoorDisplayInfo {
  door: Door;
  id: string;
  state: DoorState;
  side: string;
  barricadeHealth: number;
  barricadeMaxHealth: number;
  barricadeType: BarricadeType | null;
  trapType: DoorTrapType | null;
  trapCharges: number;
  canBarricade: boolean;
  canTrap: boolean;
  canRepair: boolean;
}

/**
 * Bouton d'achat UI
 */
interface PurchaseButton {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  type: PurchaseType;
  cost: number;
}

/**
 * Bouton d'achat d'arme UI
 */
interface WeaponPurchaseButton {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  weaponId: string;
  cost: number;
}

/**
 * Scène du menu tactique (Phase 6.6)
 *
 * Overlay entre les vagues permettant au joueur de:
 * - Acheter des munitions, soins, mines, tourelles
 * - Barricader les portes
 * - Placer des pièges sur les portes
 * - Réparer les barricades endommagées
 */
export class TacticalMenuScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private waveNumber: number = 0;
  private timeLimit: number = 0;
  private startTime: number = 0;

  // Éléments visuels
  private overlay!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private pointsText!: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text | null = null;
  private continueButton!: Phaser.GameObjects.Container;

  // Sections
  private purchaseButtons: PurchaseButton[] = [];
  private weaponPurchaseButtons: WeaponPurchaseButton[] = [];
  private doorInfoDisplays: Phaser.GameObjects.Container[] = [];
  private selectedDoor: Door | null = null;
  private doorActionPanel: Phaser.GameObjects.Container | null = null;

  // État
  private isClosing: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.TACTICAL });
  }

  /**
   * Initialise les données de la scène
   */
  init(data: TacticalMenuSceneData): void {
    this.gameScene = data.gameScene;
    this.waveNumber = data.waveNumber;
    this.timeLimit = data.timeLimit || 0;
    this.isClosing = false;
    this.selectedDoor = null;
    this.purchaseButtons = [];
    this.weaponPurchaseButtons = [];
    this.doorInfoDisplays = [];
  }

  /**
   * Crée les éléments de la scène
   */
  create(): void {
    this.startTime = this.time.now;

    // Pause le jeu en arrière-plan
    this.gameScene.scene.pause();

    this.createOverlay();
    this.createHeader();
    this.createPurchaseSection();
    this.createWeaponShopSection();
    this.createDoorSection();
    this.createContinueButton();

    if (this.timeLimit > 0) {
      this.createTimer();
    }

    this.animateIn();
  }

  /**
   * Mise à jour
   */
  update(): void {
    this.updatePointsDisplay();
    this.updatePurchaseButtons();
    this.updateWeaponPurchaseButtons();

    if (this.timeLimit > 0 && this.timerText) {
      const elapsed = this.time.now - this.startTime;
      const remaining = Math.max(0, this.timeLimit - elapsed);

      if (remaining <= 0 && !this.isClosing) {
        this.closeScene();
      } else {
        const seconds = Math.ceil(remaining / 1000);
        this.timerText.setText(`Temps: ${seconds}s`);

        // Changer la couleur si peu de temps
        if (seconds <= 5) {
          this.timerText.setColor('#ff4444');
        } else if (seconds <= 10) {
          this.timerText.setColor('#ffaa00');
        }
      }
    }
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
   * Crée l'en-tête (titre + points)
   */
  private createHeader(): void {
    // Titre
    this.titleText = this.add.text(GAME_WIDTH / 2, 40, 'MENU TACTIQUE', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setAlpha(0);

    // Sous-titre
    const subtitleText = this.add.text(GAME_WIDTH / 2, 75, `Préparation avant la vague ${this.waveNumber + 1}`, {
      fontSize: '16px',
      color: '#aaaaaa',
    });
    subtitleText.setOrigin(0.5);
    subtitleText.setAlpha(0);

    // Points
    const economySystem = this.gameScene.getEconomySystem();
    const points = economySystem ? economySystem.getPoints() : 0;

    this.pointsText = this.add.text(GAME_WIDTH - 30, 30, `Points: ${points}`, {
      fontSize: '24px',
      color: '#ffdd00',
      fontStyle: 'bold',
    });
    this.pointsText.setOrigin(1, 0);
    this.pointsText.setAlpha(0);

    // Animation
    this.tweens.add({
      targets: [this.titleText, subtitleText, this.pointsText],
      alpha: 1,
      duration: 400,
      delay: 200,
    });
  }

  /**
   * Met à jour l'affichage des points
   */
  private updatePointsDisplay(): void {
    const economySystem = this.gameScene.getEconomySystem();
    if (economySystem && this.pointsText) {
      const points = economySystem.getPoints();
      this.pointsText.setText(`Points: ${points}`);
    }
  }

  /**
   * Crée la section des achats
   */
  private createPurchaseSection(): void {
    const sectionX = 80;
    const sectionY = 130;

    // Titre de section
    const sectionTitle = this.add.text(sectionX, sectionY, 'ACHATS', {
      fontSize: '20px',
      color: '#00aaff',
      fontStyle: 'bold',
    });
    sectionTitle.setAlpha(0);

    // Créer les boutons d'achat
    const purchases: { type: PurchaseType; label: string; description: string }[] = [
      { type: 'ammo', label: 'Munitions', description: 'Recharge arme' },
      { type: 'healthSmall', label: 'Soins (+25)', description: '+25 HP' },
      { type: 'healthLarge', label: 'Soins (+50)', description: '+50 HP' },
      { type: 'mine', label: 'Mine', description: '+1 Mine' },
      { type: 'turret', label: 'Tourelle', description: '+1 Tourelle' },
    ];

    const buttonWidth = 160;
    const buttonHeight = 60;
    const buttonSpacing = 15;

    purchases.forEach((purchase, index) => {
      const y = sectionY + 40 + index * (buttonHeight + buttonSpacing);
      const button = this.createPurchaseButton(
        sectionX,
        y,
        buttonWidth,
        buttonHeight,
        purchase.type,
        purchase.label,
        purchase.description
      );
      this.purchaseButtons.push(button);
    });

    // Animation
    this.tweens.add({
      targets: sectionTitle,
      alpha: 1,
      duration: 400,
      delay: 300,
    });
  }

  /**
   * Crée un bouton d'achat
   */
  private createPurchaseButton(
    x: number,
    y: number,
    width: number,
    height: number,
    type: PurchaseType,
    label: string,
    _description: string
  ): PurchaseButton {
    const container = this.add.container(x, y);

    const economySystem = this.gameScene.getEconomySystem();
    const purchaseInfo = BALANCE.economy.purchases[type];
    const cost = purchaseInfo?.cost || 0;
    const canAfford = economySystem ? economySystem.canAfford(cost) : false;

    // Fond du bouton
    const bg = this.add.rectangle(0, 0, width, height, canAfford ? 0x333333 : 0x222222, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, canAfford ? 0x00aaff : 0x555555);
    bg.setInteractive({ useHandCursor: true });

    // Texte principal
    const text = this.add.text(10, 10, label, {
      fontSize: '14px',
      color: canAfford ? '#ffffff' : '#666666',
      fontStyle: 'bold',
    });

    // Coût
    const costText = this.add.text(width - 10, height / 2, `${cost}`, {
      fontSize: '18px',
      color: canAfford ? '#ffdd00' : '#666666',
      fontStyle: 'bold',
    });
    costText.setOrigin(1, 0.5);

    container.add([bg, text, costText]);
    container.setAlpha(0);

    // Interactivité
    bg.on('pointerover', () => {
      if (this.canPurchase(type)) {
        bg.setFillStyle(0x444444);
      }
    });

    bg.on('pointerout', () => {
      if (this.canPurchase(type)) {
        bg.setFillStyle(0x333333);
      } else {
        bg.setFillStyle(0x222222);
      }
    });

    bg.on('pointerdown', () => {
      this.handlePurchase(type);
    });

    // Animation d'apparition
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 300,
      delay: 400 + this.purchaseButtons.length * 50,
    });

    return { container, bg, text, costText, type, cost };
  }

  /**
   * Vérifie si un achat est possible
   */
  private canPurchase(type: PurchaseType): boolean {
    const economySystem = this.gameScene.getEconomySystem();
    if (!economySystem) return false;

    const purchases = economySystem.getAvailablePurchases();
    const purchase = purchases.find((p) => p.type === type);
    return purchase ? purchase.canAfford && purchase.canUse : false;
  }

  /**
   * Gère un achat
   */
  private handlePurchase(type: PurchaseType): void {
    const economySystem = this.gameScene.getEconomySystem();
    if (!economySystem) return;

    const success = economySystem.purchase(type);

    if (success) {
      // Effet visuel de succès
      this.flashEffect(0x00ff00);

      // Mettre à jour les boutons immédiatement
      this.updatePurchaseButtons();
    } else {
      // Effet visuel d'échec
      this.flashEffect(0xff0000);
    }
  }

  /**
   * Met à jour l'état des boutons d'achat
   */
  private updatePurchaseButtons(): void {
    const economySystem = this.gameScene.getEconomySystem();
    if (!economySystem) return;

    const purchases = economySystem.getAvailablePurchases();

    for (const button of this.purchaseButtons) {
      const purchaseInfo = purchases.find((p) => p.type === button.type);
      const canUse = purchaseInfo ? purchaseInfo.canAfford && purchaseInfo.canUse : false;

      button.bg.setFillStyle(canUse ? 0x333333 : 0x222222);
      button.bg.setStrokeStyle(2, canUse ? 0x00aaff : 0x555555);
      button.text.setColor(canUse ? '#ffffff' : '#666666');
      button.costText.setColor(purchaseInfo?.canAfford ? '#ffdd00' : '#666666');
    }
  }

  /**
   * Crée la section boutique d'armes
   */
  private createWeaponShopSection(): void {
    const economySystem = this.gameScene.getEconomySystem();
    if (!economySystem) return;

    const purchasableWeapons = economySystem.getPurchasableWeapons();
    // Filtrer uniquement les armes non débloquées
    const availableWeapons = purchasableWeapons.filter(w => !w.isUnlocked);

    // Ne pas afficher la section si aucune arme n'est disponible
    if (availableWeapons.length === 0) return;

    const sectionX = 80;
    const sectionY = 470;

    // Titre de section
    const sectionTitle = this.add.text(sectionX, sectionY, 'BOUTIQUE D\'ARMES', {
      fontSize: '18px',
      color: '#ff00aa',
      fontStyle: 'bold',
    });
    sectionTitle.setAlpha(0);

    // Afficher les armes sur une ligne horizontale
    const buttonWidth = 140;
    const buttonHeight = 50;
    const buttonSpacing = 10;

    availableWeapons.slice(0, 6).forEach((weapon, index) => {
      const x = sectionX + index * (buttonWidth + buttonSpacing);
      const y = sectionY + 30;
      const button = this.createWeaponPurchaseButton(
        x,
        y,
        buttonWidth,
        buttonHeight,
        weapon
      );
      this.weaponPurchaseButtons.push(button);
    });

    // Animation
    this.tweens.add({
      targets: sectionTitle,
      alpha: 1,
      duration: 400,
      delay: 350,
    });
  }

  /**
   * Crée un bouton d'achat d'arme
   */
  private createWeaponPurchaseButton(
    x: number,
    y: number,
    width: number,
    height: number,
    weapon: {
      weaponId: string;
      name: string;
      cost: number;
      canAfford: boolean;
      category: 'melee' | 'ranged';
      description?: string;
    }
  ): WeaponPurchaseButton {
    const container = this.add.container(x, y);
    const canAfford = weapon.canAfford;

    // Couleur de bordure selon la catégorie
    const categoryColor = weapon.category === 'melee' ? 0xff4444 : 0x44aaff;

    // Fond du bouton
    const bg = this.add.rectangle(0, 0, width, height, canAfford ? 0x333333 : 0x222222, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, canAfford ? categoryColor : 0x555555);
    bg.setInteractive({ useHandCursor: true });

    // Nom de l'arme (tronqué si trop long)
    const displayName = weapon.name.length > 15 ? weapon.name.slice(0, 13) + '...' : weapon.name;
    const text = this.add.text(8, 8, displayName, {
      fontSize: '12px',
      color: canAfford ? '#ffffff' : '#666666',
      fontStyle: 'bold',
    });

    // Coût
    const costText = this.add.text(width - 8, height / 2, `${weapon.cost}`, {
      fontSize: '14px',
      color: canAfford ? '#ffdd00' : '#666666',
      fontStyle: 'bold',
    });
    costText.setOrigin(1, 0.5);

    // Icône de catégorie
    const categoryIcon = weapon.category === 'melee' ? '⚔' : '🔫';
    const iconText = this.add.text(8, height - 18, categoryIcon, {
      fontSize: '10px',
      color: '#888888',
    });

    container.add([bg, text, costText, iconText]);
    container.setAlpha(0);

    // Interactivité
    bg.on('pointerover', () => {
      if (canAfford) {
        bg.setFillStyle(0x444444);
      }
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(canAfford ? 0x333333 : 0x222222);
    });

    bg.on('pointerdown', () => {
      this.handleWeaponPurchase(weapon.weaponId);
    });

    // Animation d'apparition
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 300,
      delay: 450 + this.weaponPurchaseButtons.length * 50,
    });

    return { container, bg, text, costText, weaponId: weapon.weaponId, cost: weapon.cost };
  }

  /**
   * Gère l'achat d'une arme
   */
  private handleWeaponPurchase(weaponId: string): void {
    const economySystem = this.gameScene.getEconomySystem();
    if (!economySystem) return;

    const success = economySystem.purchaseWeapon(weaponId);

    if (success) {
      // Effet visuel de succès
      this.flashEffect(0x00ff00);

      // Retirer le bouton de l'arme achetée
      const buttonIndex = this.weaponPurchaseButtons.findIndex(b => b.weaponId === weaponId);
      if (buttonIndex !== -1) {
        const button = this.weaponPurchaseButtons[buttonIndex];
        this.tweens.add({
          targets: button.container,
          alpha: 0,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 200,
          onComplete: () => {
            button.container.destroy();
          },
        });
        this.weaponPurchaseButtons.splice(buttonIndex, 1);
      }

      // Mettre à jour les boutons restants
      this.updateWeaponPurchaseButtons();
    } else {
      // Effet visuel d'échec
      this.flashEffect(0xff0000);
    }
  }

  /**
   * Met à jour l'état des boutons d'achat d'armes
   */
  private updateWeaponPurchaseButtons(): void {
    const economySystem = this.gameScene.getEconomySystem();
    if (!economySystem) return;

    const purchasableWeapons = economySystem.getPurchasableWeapons();

    for (const button of this.weaponPurchaseButtons) {
      const weapon = purchasableWeapons.find(w => w.weaponId === button.weaponId);
      const canAfford = weapon?.canAfford || false;
      const categoryColor = weapon?.category === 'melee' ? 0xff4444 : 0x44aaff;

      button.bg.setFillStyle(canAfford ? 0x333333 : 0x222222);
      button.bg.setStrokeStyle(2, canAfford ? categoryColor : 0x555555);
      button.text.setColor(canAfford ? '#ffffff' : '#666666');
      button.costText.setColor(canAfford ? '#ffdd00' : '#666666');
    }
  }

  /**
   * Crée la section des portes
   */
  private createDoorSection(): void {
    const sectionX = 300;
    const sectionY = 130;

    // Titre de section
    const sectionTitle = this.add.text(sectionX, sectionY, 'PORTES', {
      fontSize: '20px',
      color: '#ff6600',
      fontStyle: 'bold',
    });
    sectionTitle.setAlpha(0);

    // Récupérer les portes de l'arène
    const doors = this.gameScene.arena.getDoors();
    const doorInfos = this.getDoorInfos(doors);

    // Créer l'affichage de chaque porte
    const doorWidth = 180;
    const doorHeight = 80;
    const doorSpacing = 10;
    const doorsPerRow = 4;

    doorInfos.forEach((doorInfo, index) => {
      const row = Math.floor(index / doorsPerRow);
      const col = index % doorsPerRow;
      const x = sectionX + col * (doorWidth + doorSpacing);
      const y = sectionY + 40 + row * (doorHeight + doorSpacing);

      const display = this.createDoorDisplay(x, y, doorWidth, doorHeight, doorInfo);
      this.doorInfoDisplays.push(display);
    });

    // Animation
    this.tweens.add({
      targets: sectionTitle,
      alpha: 1,
      duration: 400,
      delay: 300,
    });
  }

  /**
   * Récupère les informations de toutes les portes
   */
  private getDoorInfos(doors: Door[]): DoorDisplayInfo[] {
    return doors.map((door) => {
      const status = door.getDoorStatus();
      return {
        door,
        id: status.id,
        state: status.state,
        side: status.side,
        barricadeHealth: status.barricade.health,
        barricadeMaxHealth: status.barricade.maxHealth,
        barricadeType: status.barricade.type,
        trapType: status.trap.type,
        trapCharges: status.trap.chargesRemaining,
        canBarricade: status.canBarricade,
        canTrap: status.canTrap,
        canRepair: status.canRepair,
      };
    });
  }

  /**
   * Crée l'affichage d'une porte
   */
  private createDoorDisplay(
    x: number,
    y: number,
    width: number,
    height: number,
    doorInfo: DoorDisplayInfo
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Couleur basée sur l'état
    let bgColor = 0x333333;
    let borderColor = 0x666666;

    if (doorInfo.barricadeType) {
      bgColor = 0x4a3520;
      borderColor = 0x8b4513;
    }
    if (doorInfo.trapType) {
      borderColor = 0xff6600;
    }

    // Fond
    const bg = this.add.rectangle(0, 0, width, height, bgColor, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, borderColor);
    bg.setInteractive({ useHandCursor: true });

    // Nom de la porte
    const sideLabels: Record<string, string> = {
      top: 'Haut',
      bottom: 'Bas',
      left: 'Gauche',
      right: 'Droite',
    };
    const nameText = this.add.text(10, 8, `Porte ${sideLabels[doorInfo.side] || doorInfo.side}`, {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    // État
    let stateStr = '';
    if (doorInfo.barricadeType) {
      const healthPercent = Math.round((doorInfo.barricadeHealth / doorInfo.barricadeMaxHealth) * 100);
      stateStr += `Barricade: ${healthPercent}%`;
    }
    if (doorInfo.trapType) {
      if (stateStr) stateStr += ' | ';
      stateStr += `Piège: ${doorInfo.trapCharges}`;
    }
    if (!stateStr) {
      stateStr = doorInfo.state === 'active' ? 'Active' : 'Inactive';
    }

    const stateText = this.add.text(10, 28, stateStr, {
      fontSize: '10px',
      color: '#aaaaaa',
    });

    // Indicateurs d'actions disponibles
    let actionsStr = '';
    if (doorInfo.canBarricade) actionsStr += '[B]';
    if (doorInfo.canTrap) actionsStr += '[P]';
    if (doorInfo.canRepair) actionsStr += '[R]';

    const actionsText = this.add.text(10, height - 20, actionsStr, {
      fontSize: '10px',
      color: '#00ff00',
    });

    container.add([bg, nameText, stateText, actionsText]);
    container.setAlpha(0);

    // Interactivité
    bg.on('pointerover', () => {
      bg.setFillStyle(0x444444);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor);
    });

    bg.on('pointerdown', () => {
      this.selectDoor(doorInfo);
    });

    // Animation d'apparition
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 300,
      delay: 500 + this.doorInfoDisplays.length * 30,
    });

    return container;
  }

  /**
   * Sélectionne une porte pour afficher les actions
   */
  private selectDoor(doorInfo: DoorDisplayInfo): void {
    this.selectedDoor = doorInfo.door;

    // Supprimer le panneau existant s'il y en a un
    if (this.doorActionPanel) {
      this.doorActionPanel.destroy();
      this.doorActionPanel = null;
    }

    // Créer le panneau d'actions
    this.createDoorActionPanel(doorInfo);
  }

  /**
   * Crée le panneau d'actions pour une porte
   */
  private createDoorActionPanel(doorInfo: DoorDisplayInfo): void {
    const panelX = 750;
    const panelY = 130;
    const panelWidth = 250;
    const panelHeight = 350;

    const container = this.add.container(panelX, panelY);

    // Fond du panneau
    const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x222222, 0.95);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x00aaff);
    container.add(bg);

    // Titre
    const sideLabels: Record<string, string> = {
      top: 'Haut',
      bottom: 'Bas',
      left: 'Gauche',
      right: 'Droite',
    };
    const title = this.add.text(panelWidth / 2, 15, `Porte ${sideLabels[doorInfo.side] || doorInfo.side}`, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0);
    container.add(title);

    let buttonY = 50;
    const buttonHeight = 40;
    const buttonSpacing = 10;

    // Boutons de barricade
    if (doorInfo.canBarricade) {
      const lightCost = BALANCE.doors.barricades.light.cost;
      const reinforcedCost = BALANCE.doors.barricades.reinforced.cost;

      this.createActionButton(
        container,
        20,
        buttonY,
        panelWidth - 40,
        buttonHeight,
        `Barricade légère (${lightCost})`,
        lightCost,
        () => this.barricadeDoor(doorInfo.door, 'light', lightCost)
      );
      buttonY += buttonHeight + buttonSpacing;

      this.createActionButton(
        container,
        20,
        buttonY,
        panelWidth - 40,
        buttonHeight,
        `Barricade renforcée (${reinforcedCost})`,
        reinforcedCost,
        () => this.barricadeDoor(doorInfo.door, 'reinforced', reinforcedCost)
      );
      buttonY += buttonHeight + buttonSpacing;
    }

    // Boutons de piège
    if (doorInfo.canTrap) {
      const spikeCost = BALANCE.doors.traps.spike.cost;
      const slowCost = BALANCE.doors.traps.slow.cost;
      const fireCost = BALANCE.doors.traps.fire.cost;

      this.createActionButton(
        container,
        20,
        buttonY,
        panelWidth - 40,
        buttonHeight,
        `Piège piques (${spikeCost})`,
        spikeCost,
        () => this.trapDoor(doorInfo.door, 'spike', spikeCost)
      );
      buttonY += buttonHeight + buttonSpacing;

      this.createActionButton(
        container,
        20,
        buttonY,
        panelWidth - 40,
        buttonHeight,
        `Piège lent (${slowCost})`,
        slowCost,
        () => this.trapDoor(doorInfo.door, 'slow', slowCost)
      );
      buttonY += buttonHeight + buttonSpacing;

      this.createActionButton(
        container,
        20,
        buttonY,
        panelWidth - 40,
        buttonHeight,
        `Piège feu (${fireCost})`,
        fireCost,
        () => this.trapDoor(doorInfo.door, 'fire', fireCost)
      );
      buttonY += buttonHeight + buttonSpacing;
    }

    // Bouton de réparation
    if (doorInfo.canRepair) {
      const repairCost = BALANCE.doors.repairCost;
      this.createActionButton(
        container,
        20,
        buttonY,
        panelWidth - 40,
        buttonHeight,
        `Réparer (${repairCost})`,
        repairCost,
        () => this.repairDoor(doorInfo.door, repairCost)
      );
      buttonY += buttonHeight + buttonSpacing;
    }

    // Bouton fermer
    const closeBtn = this.add.text(panelWidth - 15, 10, 'X', {
      fontSize: '16px',
      color: '#ff4444',
      fontStyle: 'bold',
    });
    closeBtn.setOrigin(1, 0);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      container.destroy();
      this.doorActionPanel = null;
      this.selectedDoor = null;
    });
    container.add(closeBtn);

    this.doorActionPanel = container;

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
   * Crée un bouton d'action dans le panneau de porte
   */
  private createActionButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    cost: number,
    onClick: () => void
  ): void {
    const economySystem = this.gameScene.getEconomySystem();
    const canAfford = economySystem ? economySystem.canAfford(cost) : false;

    const bg = this.add.rectangle(x, y, width, height, canAfford ? 0x444444 : 0x333333, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, canAfford ? 0x00aaff : 0x555555);
    bg.setInteractive({ useHandCursor: canAfford });

    const text = this.add.text(x + 10, y + height / 2, label, {
      fontSize: '12px',
      color: canAfford ? '#ffffff' : '#666666',
    });
    text.setOrigin(0, 0.5);

    container.add([bg, text]);

    if (canAfford) {
      bg.on('pointerover', () => bg.setFillStyle(0x555555));
      bg.on('pointerout', () => bg.setFillStyle(0x444444));
      bg.on('pointerdown', () => {
        onClick();
        // Mettre à jour le panneau après l'action
        if (this.selectedDoor) {
          const doors = this.gameScene.arena.getDoors();
          const doorInfos = this.getDoorInfos(doors);
          const updatedInfo = doorInfos.find((d) => d.door === this.selectedDoor);
          if (updatedInfo) {
            if (this.doorActionPanel) {
              this.doorActionPanel.destroy();
              this.doorActionPanel = null;
            }
            this.createDoorActionPanel(updatedInfo);
          }
        }
      });
    }
  }

  /**
   * Barricade une porte
   */
  private barricadeDoor(door: Door, type: 'light' | 'reinforced', cost: number): void {
    const economySystem = this.gameScene.getEconomySystem();
    if (!economySystem || !economySystem.spendPoints(cost)) {
      this.flashEffect(0xff0000);
      return;
    }

    const barricadeType = type === 'light' ? BarricadeType.LIGHT : BarricadeType.REINFORCED;
    const success = door.barricade(barricadeType);

    if (success) {
      this.flashEffect(0x00ff00);
      this.refreshDoorDisplays();
    } else {
      // Rembourser si échec
      economySystem.addPoints(cost);
      this.flashEffect(0xff0000);
    }
  }

  /**
   * Place un piège sur une porte
   */
  private trapDoor(door: Door, type: 'spike' | 'slow' | 'fire', cost: number): void {
    const economySystem = this.gameScene.getEconomySystem();
    if (!economySystem || !economySystem.spendPoints(cost)) {
      this.flashEffect(0xff0000);
      return;
    }

    const trapConfig = BALANCE.doors.traps[type];
    let trapType: DoorTrapType;
    switch (type) {
      case 'spike':
        trapType = DoorTrapType.SPIKE;
        break;
      case 'slow':
        trapType = DoorTrapType.SLOW;
        break;
      case 'fire':
        trapType = DoorTrapType.FIRE;
        break;
    }

    const success = door.setTrap({
      type: trapType,
      damage: 'damage' in trapConfig ? trapConfig.damage : undefined,
      slowFactor: 'slowFactor' in trapConfig ? trapConfig.slowFactor : undefined,
      fireDuration: 'fireDuration' in trapConfig ? trapConfig.fireDuration : undefined,
      charges: trapConfig.charges,
    });

    if (success) {
      this.flashEffect(0x00ff00);
      this.refreshDoorDisplays();
    } else {
      // Rembourser si échec
      economySystem.addPoints(cost);
      this.flashEffect(0xff0000);
    }
  }

  /**
   * Répare une barricade
   */
  private repairDoor(door: Door, cost: number): void {
    const economySystem = this.gameScene.getEconomySystem();
    if (!economySystem || !economySystem.spendPoints(cost)) {
      this.flashEffect(0xff0000);
      return;
    }

    const success = door.repairBarricade(BALANCE.doors.repairAmount);

    if (success) {
      this.flashEffect(0x00ff00);
      this.refreshDoorDisplays();
    } else {
      // Rembourser si échec
      economySystem.addPoints(cost);
      this.flashEffect(0xff0000);
    }
  }

  /**
   * Rafraîchit l'affichage des portes
   */
  private refreshDoorDisplays(): void {
    // Détruire les anciens affichages
    this.doorInfoDisplays.forEach((display) => display.destroy());
    this.doorInfoDisplays = [];

    // Recréer la section des portes
    const doors = this.gameScene.arena.getDoors();
    const doorInfos = this.getDoorInfos(doors);

    const sectionX = 300;
    const sectionY = 130;
    const doorWidth = 180;
    const doorHeight = 80;
    const doorSpacing = 10;
    const doorsPerRow = 4;

    doorInfos.forEach((doorInfo, index) => {
      const row = Math.floor(index / doorsPerRow);
      const col = index % doorsPerRow;
      const x = sectionX + col * (doorWidth + doorSpacing);
      const y = sectionY + 40 + row * (doorHeight + doorSpacing);

      const display = this.createDoorDisplay(x, y, doorWidth, doorHeight, doorInfo);
      display.setAlpha(1); // Pas d'animation pour le refresh
      this.doorInfoDisplays.push(display);
    });
  }

  /**
   * Crée le timer (si limite de temps)
   */
  private createTimer(): void {
    this.timerText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.timerText.setOrigin(0.5);
    this.timerText.setAlpha(0);

    this.tweens.add({
      targets: this.timerText,
      alpha: 1,
      duration: 400,
      delay: 500,
    });
  }

  /**
   * Crée le bouton "Continuer"
   */
  private createContinueButton(): void {
    const buttonWidth = 200;
    const buttonHeight = 50;
    const x = GAME_WIDTH - buttonWidth - 30;
    const y = GAME_HEIGHT - buttonHeight - 30;

    this.continueButton = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x00aa00, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(3, 0x00ff00);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(buttonWidth / 2, buttonHeight / 2, 'CONTINUER', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    this.continueButton.add([bg, text]);
    this.continueButton.setAlpha(0);

    bg.on('pointerover', () => bg.setFillStyle(0x00cc00));
    bg.on('pointerout', () => bg.setFillStyle(0x00aa00));
    bg.on('pointerdown', () => this.closeScene());

    // Animation
    this.tweens.add({
      targets: this.continueButton,
      alpha: 1,
      duration: 400,
      delay: 600,
    });
  }

  /**
   * Animation d'apparition
   */
  private animateIn(): void {
    // Les animations sont gérées individuellement dans chaque méthode de création
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
      0.3
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

    // Animer la fermeture
    this.tweens.add({
      targets: [
        this.overlay,
        this.titleText,
        this.pointsText,
        this.continueButton,
        ...this.purchaseButtons.map((b) => b.container),
        ...this.weaponPurchaseButtons.map((b) => b.container),
        ...this.doorInfoDisplays,
      ],
      alpha: 0,
      duration: 300,
    });

    if (this.timerText) {
      this.tweens.add({
        targets: this.timerText,
        alpha: 0,
        duration: 300,
      });
    }

    if (this.doorActionPanel) {
      this.tweens.add({
        targets: this.doorActionPanel,
        alpha: 0,
        duration: 300,
      });
    }

    this.time.delayedCall(350, () => {
      // Reprendre le jeu
      this.gameScene.scene.resume();

      // Émettre l'événement de fermeture
      this.gameScene.events.emit('tacticalMenuClosed');

      // Arrêter cette scène
      this.scene.stop();
    });
  }

  /**
   * Nettoie la scène
   */
  shutdown(): void {
    this.purchaseButtons = [];
    this.weaponPurchaseButtons = [];
    this.doorInfoDisplays = [];
    this.selectedDoor = null;
    if (this.doorActionPanel) {
      this.doorActionPanel.destroy();
      this.doorActionPanel = null;
    }
  }
}
