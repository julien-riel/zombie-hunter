import Phaser from 'phaser';
import type { DebugSpawner, DebugItemType } from './DebugSpawner';
import { ZOMBIE_TYPES } from './DebugSpawner';
import type { ZombieType, CharacterType } from '@/types/entities';
import type { Door } from '@arena/Door';
import { BarricadeType, DoorTrapType } from '@arena/Door';
import type { DropType } from '@items/drops';

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
 * Configuration des drops disponibles (Phase 6.2)
 */
const DROP_TYPES: { id: DropType; label: string; color: string }[] = [
  { id: 'ammo', label: 'Ammo', color: '#ffd700' },
  { id: 'healthSmall', label: 'HP+', color: '#00ff00' },
  { id: 'healthMedium', label: 'HP++', color: '#00cc00' },
  { id: 'powerUp', label: 'Power', color: '#9932cc' },
];

/**
 * Configuration des personnages disponibles (Phase 7.1)
 */
const CHARACTER_TYPES: { id: CharacterType; label: string }[] = [
  { id: 'cop', label: 'Cop' },
  { id: 'doctor', label: 'Doc' },
  { id: 'mechanic', label: 'Mech' },
  { id: 'athlete', label: 'Ath' },
  { id: 'pyromaniac', label: 'Pyro' },
  { id: 'kid', label: 'Kid' },
];

/**
 * Callbacks du panneau debug
 */
export interface DebugPanelCallbacks {
  onZombieSpawn?: (type: ZombieType, x: number, y: number) => void;
  onWeaponGive?: (weaponId: string) => void;
  onItemSpawn?: (type: DebugItemType, x: number, y: number) => void;
  onDropSpawn?: (type: DropType, x: number, y: number) => void;
  onKillAll?: () => void;
  onNextWave?: () => void;
  onHealFull?: () => void;
  onToggleGodMode?: () => void;
  onTogglePause?: () => void;
  onDoorBarricade?: (door: Door, type: BarricadeType) => void;
  onDoorTrap?: (door: Door, type: DoorTrapType) => void;
  onDoorDestroy?: (door: Door) => void;
  onDoorDamageBarricade?: (door: Door, damage: number) => void;
  getDoors?: () => Door[];
  getDropCount?: () => number;
  // Phase 7.1 - Characters
  onCharacterChange?: (type: CharacterType) => void;
  onAbilityUse?: () => void;
  onAbilityReset?: () => void;
  getCurrentCharacter?: () => CharacterType;
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
  selectedCharacter: CharacterType;
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
    selectedCharacter: 'cop',
  };

  // UI Elements
  private background!: Phaser.GameObjects.Rectangle;
  private headerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private zombieButtons: Phaser.GameObjects.Container[] = [];
  private weaponButtons: Phaser.GameObjects.Container[] = [];
  private itemButtons: Phaser.GameObjects.Container[] = [];
  private dropButtons: Phaser.GameObjects.Container[] = [];
  private actionButtons: Phaser.GameObjects.Container[] = [];
  private doorButtons: Phaser.GameObjects.Container[] = [];
  private doorStatusText!: Phaser.GameObjects.Text;
  private selectedDoorIndex: number = 0;
  // Phase 7.1 - Characters
  private characterButtons: Phaser.GameObjects.Container[] = [];
  private characterStatusText!: Phaser.GameObjects.Text;

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

    // Drops section (Phase 6.2)
    currentY = this.addSectionHeader(currentY, 'DROPS (click to spawn at player)');
    currentY = this.createDropButtons(currentY);

    // Separator
    currentY = this.addSeparator(currentY);

    // Doors section
    currentY = this.addSectionHeader(currentY, 'DOORS (barricade/trap/destroy)');
    currentY = this.createDoorButtons(currentY);

    // Separator
    currentY = this.addSeparator(currentY);

    // Characters section (Phase 7.1)
    currentY = this.addSectionHeader(currentY, 'CHARACTERS (click to switch)');
    currentY = this.createCharacterButtons(currentY);

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
   * Crée les boutons de drops (Phase 6.2)
   */
  private createDropButtons(startY: number): number {
    let y = startY;
    const buttonWidth = 70;
    const buttonsPerRow = 4;
    let x = 8;
    let col = 0;

    for (const drop of DROP_TYPES) {
      const button = this.createButton(x, y, buttonWidth, drop.label, () =>
        this.onDropButtonClick(drop.id)
      );

      this.container.add(button);
      this.dropButtons.push(button);

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
   * Crée les boutons de gestion des portes
   */
  private createDoorButtons(startY: number): number {
    let y = startY;
    const buttonWidth = 48;
    let x = 8;

    // Door selector (< Door X >)
    const prevBtn = this.createButton(x, y, 24, '<', () => this.selectPrevDoor());
    this.container.add(prevBtn);
    this.doorButtons.push(prevBtn);
    x += 28;

    this.doorStatusText = this.createText(x, y + 4, 'Door 1: --', 10, '#ffff00');
    this.container.add(this.doorStatusText);
    x += 130;

    const nextBtn = this.createButton(x, y, 24, '>', () => this.selectNextDoor());
    this.container.add(nextBtn);
    this.doorButtons.push(nextBtn);

    y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
    x = 8;

    // Barricade buttons
    const barricadeLight = this.createButton(x, y, buttonWidth, 'Bar.L', () => this.onBarricadeDoor(BarricadeType.LIGHT));
    this.container.add(barricadeLight);
    this.doorButtons.push(barricadeLight);
    x += buttonWidth + this.BUTTON_SPACING;

    const barricadeHeavy = this.createButton(x, y, buttonWidth, 'Bar.R', () => this.onBarricadeDoor(BarricadeType.REINFORCED));
    this.container.add(barricadeHeavy);
    this.doorButtons.push(barricadeHeavy);
    x += buttonWidth + this.BUTTON_SPACING;

    // Damage barricade
    const damageBtn = this.createButton(x, y, buttonWidth, 'Dmg 50', () => this.onDamageBarricade(50));
    this.container.add(damageBtn);
    this.doorButtons.push(damageBtn);
    x += buttonWidth + this.BUTTON_SPACING;

    y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
    x = 8;

    // Trap buttons
    const trapSpike = this.createButton(x, y, buttonWidth, 'T.Spike', () => this.onTrapDoor(DoorTrapType.SPIKE));
    this.container.add(trapSpike);
    this.doorButtons.push(trapSpike);
    x += buttonWidth + this.BUTTON_SPACING;

    const trapSlow = this.createButton(x, y, buttonWidth, 'T.Slow', () => this.onTrapDoor(DoorTrapType.SLOW));
    this.container.add(trapSlow);
    this.doorButtons.push(trapSlow);
    x += buttonWidth + this.BUTTON_SPACING;

    const trapFire = this.createButton(x, y, buttonWidth, 'T.Fire', () => this.onTrapDoor(DoorTrapType.FIRE));
    this.container.add(trapFire);
    this.doorButtons.push(trapFire);
    x += buttonWidth + this.BUTTON_SPACING;

    // Destroy door
    const destroyBtn = this.createButton(x, y, buttonWidth, 'Destroy', () => this.onDestroyDoor());
    this.container.add(destroyBtn);
    this.doorButtons.push(destroyBtn);

    y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;

    return y;
  }

  /**
   * Sélectionne la porte précédente
   */
  private selectPrevDoor(): void {
    const doors = this.callbacks.getDoors?.() || [];
    if (doors.length === 0) return;
    this.selectedDoorIndex = (this.selectedDoorIndex - 1 + doors.length) % doors.length;
    this.updateDoorStatusDisplay();
  }

  /**
   * Sélectionne la porte suivante
   */
  private selectNextDoor(): void {
    const doors = this.callbacks.getDoors?.() || [];
    if (doors.length === 0) return;
    this.selectedDoorIndex = (this.selectedDoorIndex + 1) % doors.length;
    this.updateDoorStatusDisplay();
  }

  /**
   * Récupère la porte actuellement sélectionnée
   */
  private getSelectedDoor(): Door | null {
    const doors = this.callbacks.getDoors?.() || [];
    if (doors.length === 0) return null;
    return doors[this.selectedDoorIndex] || null;
  }

  /**
   * Met à jour l'affichage du statut de la porte
   */
  private updateDoorStatusDisplay(): void {
    const door = this.getSelectedDoor();
    if (!door) {
      this.doorStatusText.setText('No doors');
      return;
    }

    const status = door.getDoorStatus();
    let statusStr = `Door ${this.selectedDoorIndex + 1} (${status.side}): `;

    if (status.isDestroyed) {
      statusStr += 'DESTROYED';
    } else if (status.barricade.type) {
      statusStr += `Bar ${status.barricade.health}/${status.barricade.maxHealth}`;
    } else if (status.trap.type) {
      statusStr += `Trap(${status.trap.type}) x${status.trap.chargesRemaining}`;
    } else {
      statusStr += status.state;
    }

    this.doorStatusText.setText(statusStr);
  }

  /**
   * Handler barricade porte
   */
  private onBarricadeDoor(type: BarricadeType): void {
    const door = this.getSelectedDoor();
    if (!door) return;
    this.callbacks.onDoorBarricade?.(door, type);
    this.updateDoorStatusDisplay();
  }

  /**
   * Handler piège porte
   */
  private onTrapDoor(type: DoorTrapType): void {
    const door = this.getSelectedDoor();
    if (!door) return;
    this.callbacks.onDoorTrap?.(door, type);
    this.updateDoorStatusDisplay();
  }

  /**
   * Handler destruction porte
   */
  private onDestroyDoor(): void {
    const door = this.getSelectedDoor();
    if (!door) return;
    this.callbacks.onDoorDestroy?.(door);
    this.updateDoorStatusDisplay();
  }

  /**
   * Crée les boutons de personnages (Phase 7.1)
   */
  private createCharacterButtons(startY: number): number {
    let y = startY;
    const buttonWidth = 48;
    const buttonsPerRow = 6;
    let x = 8;
    let col = 0;

    // Ligne de statut du personnage actuel
    this.characterStatusText = this.createText(x, y, `Char: ${this.state.selectedCharacter.toUpperCase()} [Q=Ability]`, 10, '#ff88ff');
    this.container.add(this.characterStatusText);
    y += 16;

    for (const char of CHARACTER_TYPES) {
      const isSelected = char.id === this.state.selectedCharacter;
      const button = this.createButton(
        x,
        y,
        buttonWidth,
        char.label,
        () => this.onCharacterButtonClick(char.id),
        isSelected
      );

      this.container.add(button);
      this.characterButtons.push(button);

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

    // Bouton pour reset le cooldown de la compétence
    const resetAbilityBtn = this.createButton(8, y, 100, 'Reset Ability', () => this.onResetAbility());
    this.container.add(resetAbilityBtn);
    this.characterButtons.push(resetAbilityBtn);

    y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;

    return y;
  }

  /**
   * Handler pour clic sur bouton personnage
   */
  private onCharacterButtonClick(type: CharacterType): void {
    this.state.selectedCharacter = type;
    this.callbacks.onCharacterChange?.(type);
    this.updateCharacterButtonStyles();
    this.updateCharacterStatusDisplay();
  }

  /**
   * Handler pour reset la compétence
   */
  private onResetAbility(): void {
    this.callbacks.onAbilityReset?.();
  }

  /**
   * Met à jour le style des boutons personnage pour refléter la sélection
   */
  private updateCharacterButtonStyles(): void {
    for (let i = 0; i < CHARACTER_TYPES.length; i++) {
      const button = this.characterButtons[i];
      if (!button) continue;

      const isSelected = CHARACTER_TYPES[i].id === this.state.selectedCharacter;
      const bg = button.getAt(0) as Phaser.GameObjects.Rectangle;
      const text = button.getAt(1) as Phaser.GameObjects.Text;

      if (bg && text) {
        bg.setFillStyle(isSelected ? 0x440044 : 0x333333);
        bg.setStrokeStyle(1, isSelected ? 0xff00ff : 0x666666);
        text.setColor(isSelected ? '#ff00ff' : '#ffffff');
      }
    }
  }

  /**
   * Met à jour l'affichage du statut du personnage
   */
  private updateCharacterStatusDisplay(): void {
    const currentChar = this.callbacks.getCurrentCharacter?.() || this.state.selectedCharacter;
    this.characterStatusText?.setText(`Char: ${currentChar.toUpperCase()} [Q=Ability]`);
  }

  /**
   * Handler dégâts barricade
   */
  private onDamageBarricade(damage: number): void {
    const door = this.getSelectedDoor();
    if (!door) return;
    this.callbacks.onDoorDamageBarricade?.(door, damage);
    this.updateDoorStatusDisplay();
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
   * Handler pour clic sur bouton drop (Phase 6.2)
   */
  private onDropButtonClick(type: DropType): void {
    const pointer = this.scene.input.activePointer;
    this.callbacks.onDropSpawn?.(type, pointer.worldX, pointer.worldY);
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

    // Update character display (Phase 7.1)
    const currentChar = this.callbacks.getCurrentCharacter?.();
    if (currentChar && currentChar !== this.state.selectedCharacter) {
      this.state.selectedCharacter = currentChar;
      this.updateCharacterButtonStyles();
      this.updateCharacterStatusDisplay();
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
