import Phaser from 'phaser';
import type { DebugSpawner, DebugItemType } from './DebugSpawner';
import { ZOMBIE_TYPES } from './DebugSpawner';
import type { ZombieType } from '@/types/entities';

/**
 * Configuration des armes disponibles
 */
const WEAPON_TYPES = [
  { id: 'pistol', label: 'Pistol' },
  { id: 'shotgun', label: 'Shotgun' },
  { id: 'smg', label: 'SMG' },
  { id: 'sniper', label: 'Sniper' },
  { id: 'flamethrower', label: 'Flame' },
  { id: 'tesla', label: 'Tesla' },
  { id: 'nailgun', label: 'Nail' },
  { id: 'bow', label: 'Bow' },
] as const;

/**
 * Configuration des items disponibles
 */
const ITEM_TYPES: { id: DebugItemType; label: string }[] = [
  { id: 'health', label: 'Health' },
  { id: 'ammo', label: 'Ammo' },
  { id: 'speedBoost', label: 'Speed' },
  { id: 'damageBoost', label: 'Damage' },
  { id: 'turret', label: 'Turret' },
  { id: 'mine', label: 'Mine' },
  { id: 'drone', label: 'Drone' },
  { id: 'decoy', label: 'Decoy' },
];

/**
 * Callbacks du panneau debug
 */
export interface DebugPanelCallbacks {
  onZombieSpawn?: (type: ZombieType, x: number, y: number) => void;
  onWeaponGive?: (weaponId: string) => void;
  onItemSpawn?: (type: DebugItemType, x: number, y: number) => void;
  onKillAll?: () => void;
  onNextWave?: () => void;
  onHealFull?: () => void;
  onToggleGodMode?: () => void;
  onTogglePause?: () => void;
}

/**
 * État affiché dans le panneau
 */
export interface DebugPanelState {
  godMode: boolean;
  spawnPaused: boolean;
  currentWave: number;
  zombieCount: number;
  selectedZombieType: ZombieType;
}

/**
 * Panneau UI de debug compact
 * Affiche les contrôles et l'état du jeu
 */
export class DebugPanel {
  private scene: Phaser.Scene;
  private spawner: DebugSpawner;
  private callbacks: DebugPanelCallbacks;
  private container: Phaser.GameObjects.Container;

  private state: DebugPanelState = {
    godMode: false,
    spawnPaused: false,
    currentWave: 1,
    zombieCount: 0,
    selectedZombieType: 'shambler',
  };

  // UI Elements
  private background!: Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private zombieButtons: Phaser.GameObjects.Container[] = [];
  private weaponButtons: Phaser.GameObjects.Container[] = [];
  private itemButtons: Phaser.GameObjects.Container[] = [];
  private actionButtons: Phaser.GameObjects.Container[] = [];

  private readonly PANEL_WIDTH = 320;
  private readonly PANEL_X = 10;
  private readonly PANEL_Y = 10;
  private readonly BUTTON_HEIGHT = 24;
  private readonly BUTTON_SPACING = 4;

  constructor(scene: Phaser.Scene, spawner: DebugSpawner, callbacks: DebugPanelCallbacks = {}) {
    this.scene = scene;
    this.spawner = spawner;
    this.callbacks = callbacks;

    this.container = scene.add.container(this.PANEL_X, this.PANEL_Y);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);

    this.createPanel();
  }

  /**
   * Crée le panneau complet
   */
  private createPanel(): void {
    let currentY = 0;

    // Background
    this.background = this.scene.add.rectangle(0, 0, this.PANEL_WIDTH, 400, 0x000000, 0.85);
    this.background.setOrigin(0, 0);
    this.background.setStrokeStyle(2, 0x444444);
    this.container.add(this.background);

    // Header
    currentY += 8;
    this.headerText = this.createText(8, currentY, 'DEBUG [F1]                Wave: 1', 14, '#00ff00');
    this.container.add(this.headerText);
    currentY += 24;

    // Separator
    currentY = this.addSeparator(currentY);

    // Status line
    this.statusText = this.createText(8, currentY, '[God: OFF] [Pause: OFF] Zombies: 0', 11, '#ffffff');
    this.container.add(this.statusText);
    currentY += 20;

    // Separator
    currentY = this.addSeparator(currentY);

    // Zombies section
    currentY = this.addSectionHeader(currentY, 'ZOMBIES (click to spawn)');
    currentY = this.createZombieButtons(currentY);

    // Separator
    currentY = this.addSeparator(currentY);

    // Weapons section
    currentY = this.addSectionHeader(currentY, 'WEAPONS (click to give)');
    currentY = this.createWeaponButtons(currentY);

    // Separator
    currentY = this.addSeparator(currentY);

    // Items section
    currentY = this.addSectionHeader(currentY, 'ITEMS (click to spawn)');
    currentY = this.createItemButtons(currentY);

    // Separator
    currentY = this.addSeparator(currentY);

    // Action buttons
    currentY = this.createActionButtons(currentY);

    // Resize background to fit content
    this.background.setSize(this.PANEL_WIDTH, currentY + 10);
  }

  /**
   * Crée un texte avec le style par défaut
   */
  private createText(
    x: number,
    y: number,
    text: string,
    size: number = 12,
    color: string = '#ffffff'
  ): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, text, {
      fontSize: `${size}px`,
      fontFamily: 'monospace',
      color: color,
    });
  }

  /**
   * Ajoute un séparateur horizontal
   */
  private addSeparator(y: number): number {
    const line = this.scene.add.rectangle(8, y + 4, this.PANEL_WIDTH - 16, 1, 0x444444);
    line.setOrigin(0, 0);
    this.container.add(line);
    return y + 10;
  }

  /**
   * Ajoute un header de section
   */
  private addSectionHeader(y: number, text: string): number {
    const header = this.createText(8, y, text, 10, '#888888');
    this.container.add(header);
    return y + 16;
  }

  /**
   * Crée un bouton interactif
   */
  private createButton(
    x: number,
    y: number,
    width: number,
    label: string,
    onClick: () => void,
    selected: boolean = false
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(0, 0, width, this.BUTTON_HEIGHT, selected ? 0x004400 : 0x333333);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, selected ? 0x00ff00 : 0x666666);
    bg.setInteractive({ useHandCursor: true });

    const text = this.createText(width / 2, this.BUTTON_HEIGHT / 2, label, 10, selected ? '#00ff00' : '#ffffff');
    text.setOrigin(0.5, 0.5);

    container.add([bg, text]);

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(selected ? 0x006600 : 0x444444);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(selected ? 0x004400 : 0x333333);
    });

    bg.on('pointerdown', onClick);

    return container;
  }

  /**
   * Crée les boutons de zombies
   */
  private createZombieButtons(startY: number): number {
    let y = startY;
    const buttonWidth = 56;
    const buttonsPerRow = 5;
    let x = 8;
    let col = 0;

    // Raccourcis pour les labels
    const shortLabels: Record<ZombieType, string> = {
      shambler: 'Sham',
      runner: 'Run',
      crawler: 'Craw',
      tank: 'Tank',
      spitter: 'Spit',
      bomber: 'Bomb',
      screamer: 'Scream',
      splitter: 'Split',
      invisible: 'Invis',
      necromancer: 'Necro',
    };

    for (const type of ZOMBIE_TYPES) {
      const isSelected = type === this.state.selectedZombieType;
      const button = this.createButton(
        x,
        y,
        buttonWidth,
        shortLabels[type],
        () => this.onZombieButtonClick(type),
        isSelected
      );

      this.container.add(button);
      this.zombieButtons.push(button);

      col++;
      x += buttonWidth + this.BUTTON_SPACING;

      if (col >= buttonsPerRow) {
        col = 0;
        x = 8;
        y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
      }
    }

    if (col > 0) {
      y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
    }

    return y;
  }

  /**
   * Crée les boutons d'armes
   */
  private createWeaponButtons(startY: number): number {
    let y = startY;
    const buttonWidth = 56;
    const buttonsPerRow = 5;
    let x = 8;
    let col = 0;

    for (const weapon of WEAPON_TYPES) {
      const button = this.createButton(x, y, buttonWidth, weapon.label, () =>
        this.onWeaponButtonClick(weapon.id)
      );

      this.container.add(button);
      this.weaponButtons.push(button);

      col++;
      x += buttonWidth + this.BUTTON_SPACING;

      if (col >= buttonsPerRow) {
        col = 0;
        x = 8;
        y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
      }
    }

    if (col > 0) {
      y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
    }

    return y;
  }

  /**
   * Crée les boutons d'items
   */
  private createItemButtons(startY: number): number {
    let y = startY;
    const buttonWidth = 70;
    const buttonsPerRow = 4;
    let x = 8;
    let col = 0;

    for (const item of ITEM_TYPES) {
      const button = this.createButton(x, y, buttonWidth, item.label, () =>
        this.onItemButtonClick(item.id)
      );

      this.container.add(button);
      this.itemButtons.push(button);

      col++;
      x += buttonWidth + this.BUTTON_SPACING;

      if (col >= buttonsPerRow) {
        col = 0;
        x = 8;
        y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
      }
    }

    if (col > 0) {
      y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
    }

    return y;
  }

  /**
   * Crée les boutons d'action
   */
  private createActionButtons(startY: number): number {
    const y = startY;
    const buttonWidth = 95;
    let x = 8;

    const actions = [
      { label: 'Kill All [F5]', onClick: () => this.callbacks.onKillAll?.() },
      { label: 'Next Wave [F9]', onClick: () => this.callbacks.onNextWave?.() },
      { label: 'Heal 100% [F7]', onClick: () => this.callbacks.onHealFull?.() },
    ];

    for (const action of actions) {
      const button = this.createButton(x, y, buttonWidth, action.label, action.onClick);
      this.container.add(button);
      this.actionButtons.push(button);
      x += buttonWidth + this.BUTTON_SPACING;
    }

    return y + this.BUTTON_HEIGHT + this.BUTTON_SPACING;
  }

  /**
   * Handler pour clic sur bouton zombie
   */
  private onZombieButtonClick(type: ZombieType): void {
    this.spawner.setSelectedZombieType(type);
    this.state.selectedZombieType = type;
    this.updateZombieButtonStyles();

    // Spawn à la position du joueur si panneau visible
    const pointer = this.scene.input.activePointer;
    this.callbacks.onZombieSpawn?.(type, pointer.worldX, pointer.worldY);
  }

  /**
   * Handler pour clic sur bouton arme
   */
  private onWeaponButtonClick(weaponId: string): void {
    this.callbacks.onWeaponGive?.(weaponId);
  }

  /**
   * Handler pour clic sur bouton item
   */
  private onItemButtonClick(type: DebugItemType): void {
    this.spawner.setSelectedItemType(type);
    const pointer = this.scene.input.activePointer;
    this.callbacks.onItemSpawn?.(type, pointer.worldX, pointer.worldY);
  }

  /**
   * Met à jour le style des boutons zombie pour refléter la sélection
   */
  private updateZombieButtonStyles(): void {
    for (let i = 0; i < ZOMBIE_TYPES.length; i++) {
      const button = this.zombieButtons[i];
      if (!button) continue;

      const isSelected = ZOMBIE_TYPES[i] === this.state.selectedZombieType;
      const bg = button.getAt(0) as Phaser.GameObjects.Rectangle;
      const text = button.getAt(1) as Phaser.GameObjects.Text;

      if (bg && text) {
        bg.setFillStyle(isSelected ? 0x004400 : 0x333333);
        bg.setStrokeStyle(1, isSelected ? 0x00ff00 : 0x666666);
        text.setColor(isSelected ? '#00ff00' : '#ffffff');
      }
    }
  }

  /**
   * Met à jour l'état affiché
   */
  public updateState(newState: Partial<DebugPanelState>): void {
    this.state = { ...this.state, ...newState };
    this.updateDisplay();
  }

  /**
   * Met à jour l'affichage
   */
  private updateDisplay(): void {
    // Update header
    this.headerText.setText(`DEBUG [F1]              Wave: ${this.state.currentWave}`);

    // Update status
    const godStatus = this.state.godMode ? 'ON' : 'OFF';
    const pauseStatus = this.state.spawnPaused ? 'ON' : 'OFF';
    this.statusText.setText(`[God: ${godStatus}] [Pause: ${pauseStatus}] Zombies: ${this.state.zombieCount}`);

    // Update zombie button selection
    if (this.state.selectedZombieType !== this.spawner.getSelectedZombieType()) {
      this.state.selectedZombieType = this.spawner.getSelectedZombieType();
      this.updateZombieButtonStyles();
    }
  }

  /**
   * Affiche ou masque le panneau
   */
  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /**
   * Vérifie si le panneau est visible
   */
  public isVisible(): boolean {
    return this.container.visible;
  }

  /**
   * Toggle la visibilité
   */
  public toggle(): void {
    this.setVisible(!this.isVisible());
  }

  /**
   * Met à jour les callbacks
   */
  public setCallbacks(callbacks: DebugPanelCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.container.destroy();
  }
}
