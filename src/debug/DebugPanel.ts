import Phaser from 'phaser';
import type { DebugSpawner, DebugItemType } from './DebugSpawner';
import { ZOMBIE_TYPES } from './DebugSpawner';
import type { ZombieType, CharacterType, BossType } from '@/types/entities';
import type { Door } from '@arena/Door';
import { BarricadeType, DoorTrapType } from '@arena/Door';
import type { DropType } from '@items/drops';
import { SpecialEventType } from '@systems/events';

/**
 * Configuration des armes disponibles
 */
const WEAPON_TYPES = [
  // Armes de base
  { id: 'pistol', label: 'Pistol' },
  { id: 'shotgun', label: 'Shotgun' },
  { id: 'smg', label: 'SMG' },
  { id: 'sniper', label: 'Sniper' },
  // Armes Phase 3
  { id: 'revolver', label: 'Revolver' },
  { id: 'assaultRifle', label: 'Assault' },
  { id: 'doubleBarrel', label: 'DblBarr' },
  { id: 'grenadeLauncher', label: 'Grenade' },
  // Armes spéciales
  { id: 'flamethrower', label: 'Flame' },
  { id: 'tesla', label: 'Tesla' },
  { id: 'nailgun', label: 'Nail' },
  { id: 'bow', label: 'Bow' },
  { id: 'microwave', label: 'Microwave' },
  // Armes expérimentales (Phase 4)
  { id: 'freezeRay', label: 'Freeze' },
  { id: 'gravityGun', label: 'Gravity' },
  { id: 'blackHole', label: 'BlkHole' },
  { id: 'laserMinigun', label: 'Laser' },
  { id: 'zombieConverter', label: 'Convert' },
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
 * Configuration des boss disponibles (Phase 7.3)
 */
const BOSS_TYPES: { id: BossType; label: string }[] = [
  { id: 'abomination', label: 'Abom.' },
  { id: 'patient_zero', label: 'Pat.0' },
  { id: 'colossus', label: 'Colos.' },
];

/**
 * Configuration des événements spéciaux (Phase 7.4)
 */
const EVENT_TYPES: { id: SpecialEventType; label: string }[] = [
  { id: SpecialEventType.BLACKOUT, label: 'Black' },
  { id: SpecialEventType.HORDE, label: 'Horde' },
  { id: SpecialEventType.OVERHEATED_DOOR, label: 'Door' },
  { id: SpecialEventType.BOSS_RUSH, label: 'Rush' },
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
  // Phase 7.3 - Bosses
  onBossSpawn?: (type: BossType) => void;
  onBossKill?: () => void;
  onBossDamage?: (amount: number) => void;
  getActiveBoss?: () => { type: BossType; healthPercent: number } | null;
  // Phase 7.4 - Events
  onEventTrigger?: (type: SpecialEventType) => void;
  onEventStop?: (type: SpecialEventType) => void;
  onEventStopAll?: () => void;
  getActiveEvents?: () => SpecialEventType[];
  // Wave control
  onGoToWave?: (wave: number) => void;
  getCurrentWave?: () => number;
  // Spawn point placement
  onEnterSpawnPointPlacement?: () => void;
  // Game speed control
  onSetGameSpeed?: (speed: number) => void;
  getGameSpeed?: () => number;
  // Reload weapons
  onReloadWeapons?: () => void;
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
 * Panneau UI de debug compact et amélioré
 * Layout en 2 colonnes avec sections bien organisées
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
  private waveInputText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
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
  // Phase 7.3 - Bosses
  private bossButtons: Phaser.GameObjects.Container[] = [];
  private bossStatusText!: Phaser.GameObjects.Text;
  // Phase 7.4 - Events
  private eventButtons: Phaser.GameObjects.Container[] = [];
  private eventStatusText!: Phaser.GameObjects.Text;

  // Wave selector state
  private waveInputValue: number = 1;

  // Placement mode
  private placementMode: 'none' | 'zombie' | 'item' = 'none';
  private placementType: string = '';
  private placementIndicator: Phaser.GameObjects.Container | null = null;
  private placementClickPending: boolean = false; // Flag to ignore the button click

  private readonly PANEL_WIDTH = 620;
  private readonly BUTTON_HEIGHT = 22;
  private readonly BUTTON_SPACING = 3;

  constructor(scene: Phaser.Scene, spawner: DebugSpawner, callbacks: DebugPanelCallbacks = {}) {
    this.scene = scene;
    this.spawner = spawner;
    this.callbacks = callbacks;

    // Position will be set after panel is created (need to know height)
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);

    this.createPanel();
    this.centerPanel();
  }

  /**
   * Centre le panneau à l'écran
   */
  private centerPanel(): void {
    const camera = this.scene.cameras.main;
    const panelHeight = this.background.height;

    const x = (camera.width - this.PANEL_WIDTH) / 2;
    const y = (camera.height - panelHeight) / 2;

    this.container.setPosition(x, y);
  }

  /**
   * Crée le panneau complet avec layout 2 colonnes
   */
  private createPanel(): void {
    const COL1_X = 10;
    const COL2_X = 320;
    let col1Y = 0;
    let col2Y = 0;

    // Background
    this.background = this.scene.add.rectangle(0, 0, this.PANEL_WIDTH, 400, 0x000000, 0.9);
    this.background.setOrigin(0, 0);
    this.background.setStrokeStyle(2, 0x00ff00);
    this.container.add(this.background);

    // ===== HEADER (full width) =====
    col1Y += 6;
    this.headerText = this.createText(10, col1Y, 'DEBUG PANEL (F1 close, F2 pause)', 12, '#00ff00');
    this.container.add(this.headerText);
    col1Y += 18;
    col2Y = col1Y;

    // Status line (full width)
    this.statusText = this.createText(10, col1Y, 'God: OFF | Pause: OFF | Zombies: 0 | Speed: 1x', 10, '#ffffff');
    this.container.add(this.statusText);
    col1Y += 16;
    col2Y = col1Y;

    col1Y = this.addSeparator(col1Y);
    col2Y = col1Y;

    // =============== COLUMN 1 (left) ===============

    // Quick actions
    col1Y = this.addSectionHeader(col1Y, 'QUICK ACTIONS', COL1_X);
    col1Y = this.createQuickActionButtons(col1Y, COL1_X);

    col1Y = this.addSeparatorAt(col1Y, COL1_X, 290);

    // Wave & Speed control (combined row)
    col1Y = this.addSectionHeader(col1Y, 'WAVE & SPEED', COL1_X);
    col1Y = this.createWaveAndSpeedControls(col1Y, COL1_X);

    col1Y = this.addSeparatorAt(col1Y, COL1_X, 290);

    // Zombies
    col1Y = this.addSectionHeader(col1Y, 'SPAWN ZOMBIES (click to place)', COL1_X);
    col1Y = this.createZombieButtons(col1Y, COL1_X);

    col1Y = this.addSeparatorAt(col1Y, COL1_X, 290);

    // Items
    col1Y = this.addSectionHeader(col1Y, 'SPAWN ITEMS (click to place)', COL1_X);
    col1Y = this.createItemButtons(col1Y, COL1_X);

    col1Y = this.addSeparatorAt(col1Y, COL1_X, 290);

    // Doors
    col1Y = this.addSectionHeader(col1Y, 'DOORS', COL1_X);
    col1Y = this.createDoorButtons(col1Y, COL1_X);

    // =============== COLUMN 2 (right) ===============

    // Weapons
    col2Y = this.addSectionHeader(col2Y, 'GIVE WEAPONS', COL2_X);
    col2Y = this.createWeaponButtons(col2Y, COL2_X);

    col2Y = this.addSeparatorAt(col2Y, COL2_X, 290);

    // Drops
    col2Y = this.addSectionHeader(col2Y, 'SPAWN DROPS (at player)', COL2_X);
    col2Y = this.createDropButtons(col2Y, COL2_X);

    col2Y = this.addSeparatorAt(col2Y, COL2_X, 290);

    // Characters
    col2Y = this.addSectionHeader(col2Y, 'CHARACTERS', COL2_X);
    col2Y = this.createCharacterButtons(col2Y, COL2_X);

    col2Y = this.addSeparatorAt(col2Y, COL2_X, 290);

    // Bosses
    col2Y = this.addSectionHeader(col2Y, 'BOSSES', COL2_X);
    col2Y = this.createBossButtons(col2Y, COL2_X);

    col2Y = this.addSeparatorAt(col2Y, COL2_X, 290);

    // Events
    col2Y = this.addSectionHeader(col2Y, 'SPECIAL EVENTS', COL2_X);
    col2Y = this.createEventButtons(col2Y, COL2_X);

    // Resize background to fit content
    const maxY = Math.max(col1Y, col2Y);
    this.background.setSize(this.PANEL_WIDTH, maxY + 10);

    // Setup placement mode click handler
    this.setupPlacementMode();
  }

  /**
   * Crée un texte avec le style par défaut
   */
  private createText(
    x: number,
    y: number,
    text: string,
    size: number = 11,
    color: string = '#ffffff'
  ): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, text, {
      fontSize: `${size}px`,
      fontFamily: 'monospace',
      color: color,
    });
  }

  /**
   * Ajoute un séparateur horizontal (full width)
   */
  private addSeparator(y: number): number {
    const line = this.scene.add.rectangle(10, y + 3, this.PANEL_WIDTH - 20, 1, 0x444444);
    line.setOrigin(0, 0);
    this.container.add(line);
    return y + 8;
  }

  /**
   * Ajoute un séparateur horizontal à une position spécifique
   */
  private addSeparatorAt(y: number, x: number, width: number): number {
    const line = this.scene.add.rectangle(x, y + 3, width, 1, 0x444444);
    line.setOrigin(0, 0);
    this.container.add(line);
    return y + 8;
  }

  /**
   * Ajoute un header de section
   */
  private addSectionHeader(y: number, text: string, x: number = 10): number {
    const header = this.createText(x, y, text, 9, '#888888');
    this.container.add(header);
    return y + 14;
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
    selected: boolean = false,
    color: string = '#ffffff'
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const bgColor = selected ? 0x004400 : 0x333333;
    const strokeColor = selected ? 0x00ff00 : 0x555555;
    const textColor = selected ? '#00ff00' : color;

    const bg = this.scene.add.rectangle(0, 0, width, this.BUTTON_HEIGHT, bgColor);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, strokeColor);
    bg.setInteractive({ useHandCursor: true });

    const text = this.createText(width / 2, this.BUTTON_HEIGHT / 2, label, 9, textColor);
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
   * Crée les boutons d'actions rapides
   */
  private createQuickActionButtons(startY: number, startX: number = 10): number {
    const y = startY;
    const buttonWidth = 68;
    let x = startX;

    // God Mode toggle
    const godBtn = this.createButton(x, y, buttonWidth, 'God Mode', () => {
      this.callbacks.onToggleGodMode?.();
    });
    this.container.add(godBtn);
    this.actionButtons.push(godBtn);
    x += buttonWidth + this.BUTTON_SPACING;

    // Pause toggle
    const pauseBtn = this.createButton(x, y, buttonWidth, 'Pause', () => {
      this.callbacks.onTogglePause?.();
    });
    this.container.add(pauseBtn);
    this.actionButtons.push(pauseBtn);
    x += buttonWidth + this.BUTTON_SPACING;

    // Kill All
    const killBtn = this.createButton(x, y, buttonWidth, 'Kill All', () => {
      this.callbacks.onKillAll?.();
    }, false, '#ff6666');
    this.container.add(killBtn);
    this.actionButtons.push(killBtn);
    x += buttonWidth + this.BUTTON_SPACING;

    // Heal
    const healBtn = this.createButton(x, y, buttonWidth, 'Heal 100%', () => {
      this.callbacks.onHealFull?.();
    }, false, '#66ff66');
    this.container.add(healBtn);
    this.actionButtons.push(healBtn);

    return y + this.BUTTON_HEIGHT + this.BUTTON_SPACING;
  }

  /**
   * Crée les contrôles de vague et vitesse combinés
   */
  private createWaveAndSpeedControls(startY: number, startX: number = 10): number {
    let y = startY;
    let x = startX;

    // Wave controls
    const waveLabel = this.createText(x, y + 4, 'Wave:', 10, '#ffff00');
    this.container.add(waveLabel);
    x += 40;

    // Decrease button
    const decBtn = this.createButton(x, y, 22, '-', () => {
      this.waveInputValue = Math.max(1, this.waveInputValue - 1);
      this.updateWaveInputDisplay();
    });
    this.container.add(decBtn);
    x += 25;

    // Wave number display
    this.waveInputText = this.createText(x, y + 4, '1', 10, '#ffff00');
    this.waveInputText.setFixedSize(24, 16);
    this.container.add(this.waveInputText);
    x += 28;

    // Increase button
    const incBtn = this.createButton(x, y, 22, '+', () => {
      this.waveInputValue = Math.min(100, this.waveInputValue + 1);
      this.updateWaveInputDisplay();
    });
    this.container.add(incBtn);
    x += 25;

    // +10 button
    const inc10Btn = this.createButton(x, y, 32, '+10', () => {
      this.waveInputValue = Math.min(100, this.waveInputValue + 10);
      this.updateWaveInputDisplay();
    });
    this.container.add(inc10Btn);
    x += 35;

    // GO button
    const goBtn = this.createButton(x, y, 35, 'GO!', () => {
      this.callbacks.onGoToWave?.(this.waveInputValue);
    }, false, '#00ffff');
    this.container.add(goBtn);
    x += 38;

    // Next Wave button
    const nextBtn = this.createButton(x, y, 40, 'Next', () => {
      this.callbacks.onNextWave?.();
    });
    this.container.add(nextBtn);

    // Speed controls on same row
    y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
    x = startX;

    // Speed label
    this.speedText = this.createText(x, y + 4, 'Speed:', 10, '#ffffff');
    this.container.add(this.speedText);
    x += 50;

    // Speed buttons
    const speeds = [
      { label: '0.5x', value: 0.5 },
      { label: '1x', value: 1 },
      { label: '2x', value: 2 },
      { label: '4x', value: 4 },
    ];

    for (const speed of speeds) {
      const btn = this.createButton(x, y, 35, speed.label, () => {
        this.callbacks.onSetGameSpeed?.(speed.value);
      });
      this.container.add(btn);
      x += 38;
    }

    return y + this.BUTTON_HEIGHT + this.BUTTON_SPACING;
  }

  /**
   * Crée les boutons de zombies
   */
  private createZombieButtons(startY: number, startX: number = 10): number {
    let y = startY;
    const buttonWidth = 54;
    const buttonsPerRow = 5;
    let x = startX;
    let col = 0;

    // Raccourcis pour les labels
    const shortLabels: Record<ZombieType, string> = {
      shambler: 'Sham',
      runner: 'Run',
      crawler: 'Craw',
      tank: 'Tank',
      spitter: 'Spit',
      bomber: 'Bomb',
      screamer: 'Scrm',
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
        () => this.enterPlacementMode('zombie', type),
        isSelected
      );

      this.container.add(button);
      this.zombieButtons.push(button);

      col++;
      x += buttonWidth + this.BUTTON_SPACING;

      if (col >= buttonsPerRow) {
        col = 0;
        x = startX;
        y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
      }
    }

    if (col > 0) {
      y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
    }

    return y;
  }

  /**
   * Crée les boutons d'items (séparés des drops)
   */
  private createItemButtons(startY: number, startX: number = 10): number {
    let y = startY;
    const buttonWidth = 54;
    const buttonsPerRow = 5;
    let x = startX;
    let col = 0;

    for (const item of ITEM_TYPES) {
      const button = this.createButton(x, y, buttonWidth, item.label, () =>
        this.enterPlacementMode('item', item.id)
      );

      this.container.add(button);
      this.itemButtons.push(button);

      col++;
      x += buttonWidth + this.BUTTON_SPACING;

      if (col >= buttonsPerRow) {
        col = 0;
        x = startX;
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
  private createWeaponButtons(startY: number, startX: number = 10): number {
    let y = startY;
    const buttonWidth = 68;
    const buttonsPerRow = 4;
    let x = startX;
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
        x = startX;
        y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
      }
    }

    if (col > 0) {
      y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
    }

    // Reload All button
    const reloadBtn = this.createButton(startX, y, 100, 'Reload All', () => {
      this.callbacks.onReloadWeapons?.();
    }, false, '#66ccff');
    this.container.add(reloadBtn);
    y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;

    return y;
  }

  /**
   * Crée les boutons de drops
   */
  private createDropButtons(startY: number, startX: number = 10): number {
    let y = startY;
    const buttonWidth = 68;
    let x = startX;

    for (const drop of DROP_TYPES) {
      const button = this.createButton(x, y, buttonWidth, drop.label, () =>
        this.onDropButtonClick(drop.id)
      , false, drop.color);

      this.container.add(button);
      this.dropButtons.push(button);
      x += buttonWidth + this.BUTTON_SPACING;
    }

    y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;

    return y;
  }

  /**
   * Crée les boutons de gestion des portes
   */
  private createDoorButtons(startY: number, startX: number = 10): number {
    let y = startY;
    let x = startX;

    // Door selector (< Door X >)
    const prevBtn = this.createButton(x, y, 22, '<', () => this.selectPrevDoor());
    this.container.add(prevBtn);
    this.doorButtons.push(prevBtn);
    x += 25;

    this.doorStatusText = this.createText(x, y + 4, 'Door 1: --', 9, '#ffff00');
    this.container.add(this.doorStatusText);
    x += 130;

    const nextBtn = this.createButton(x, y, 22, '>', () => this.selectNextDoor());
    this.container.add(nextBtn);
    this.doorButtons.push(nextBtn);

    y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;
    x = startX;

    // Barricade & trap buttons (compact row)
    const smallBtnWidth = 45;

    const barricadeLight = this.createButton(x, y, smallBtnWidth, 'Bar.L', () => this.onBarricadeDoor(BarricadeType.LIGHT));
    this.container.add(barricadeLight);
    this.doorButtons.push(barricadeLight);
    x += smallBtnWidth + this.BUTTON_SPACING;

    const barricadeHeavy = this.createButton(x, y, smallBtnWidth, 'Bar.R', () => this.onBarricadeDoor(BarricadeType.REINFORCED));
    this.container.add(barricadeHeavy);
    this.doorButtons.push(barricadeHeavy);
    x += smallBtnWidth + this.BUTTON_SPACING;

    const trapSpike = this.createButton(x, y, smallBtnWidth, 'Spike', () => this.onTrapDoor(DoorTrapType.SPIKE));
    this.container.add(trapSpike);
    this.doorButtons.push(trapSpike);
    x += smallBtnWidth + this.BUTTON_SPACING;

    const trapSlow = this.createButton(x, y, smallBtnWidth, 'Slow', () => this.onTrapDoor(DoorTrapType.SLOW));
    this.container.add(trapSlow);
    this.doorButtons.push(trapSlow);
    x += smallBtnWidth + this.BUTTON_SPACING;

    const trapFire = this.createButton(x, y, smallBtnWidth, 'Fire', () => this.onTrapDoor(DoorTrapType.FIRE));
    this.container.add(trapFire);
    this.doorButtons.push(trapFire);
    x += smallBtnWidth + this.BUTTON_SPACING;

    const destroyBtn = this.createButton(x, y, smallBtnWidth, 'Destr', () => this.onDestroyDoor());
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
  private createCharacterButtons(startY: number, startX: number = 10): number {
    let y = startY;
    const buttonWidth = 45;
    let x = startX;

    // Ligne de statut du personnage actuel
    this.characterStatusText = this.createText(x, y, `Current: ${this.state.selectedCharacter.toUpperCase()}`, 9, '#ff88ff');
    this.container.add(this.characterStatusText);
    y += 14;
    x = startX;

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
      x += buttonWidth + this.BUTTON_SPACING;
    }

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
   * Crée les boutons de boss (Phase 7.3)
   */
  private createBossButtons(startY: number, startX: number = 10): number {
    let y = startY;
    const buttonWidth = 52;
    let x = startX;

    // Ligne de statut du boss actif
    this.bossStatusText = this.createText(x, y, 'Boss: None', 9, '#ff4444');
    this.container.add(this.bossStatusText);
    y += 14;
    x = startX;

    // Boutons de spawn de boss
    for (const boss of BOSS_TYPES) {
      const button = this.createButton(
        x,
        y,
        buttonWidth,
        boss.label,
        () => this.onBossButtonClick(boss.id)
      );

      this.container.add(button);
      this.bossButtons.push(button);
      x += buttonWidth + this.BUTTON_SPACING;
    }

    // Boutons de contrôle
    x += 3;
    const killBtn = this.createButton(x, y, 40, 'Kill', () => this.onBossKill(), false, '#ff6666');
    this.container.add(killBtn);
    this.bossButtons.push(killBtn);
    x += 43;

    const dmgBtn = this.createButton(x, y, 50, 'Dmg100', () => this.onBossDamage());
    this.container.add(dmgBtn);
    this.bossButtons.push(dmgBtn);

    y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;

    return y;
  }

  /**
   * Handler pour clic sur bouton boss
   */
  private onBossButtonClick(type: BossType): void {
    this.callbacks.onBossSpawn?.(type);
  }

  /**
   * Handler pour tuer le boss
   */
  private onBossKill(): void {
    this.callbacks.onBossKill?.();
  }

  /**
   * Handler pour infliger des dégâts au boss
   */
  private onBossDamage(): void {
    this.callbacks.onBossDamage?.(100);
  }

  /**
   * Met à jour l'affichage du statut du boss
   */
  private updateBossStatusDisplay(): void {
    const activeBoss = this.callbacks.getActiveBoss?.();
    if (activeBoss) {
      const healthPercent = Math.round(activeBoss.healthPercent * 100);
      this.bossStatusText?.setText(`Boss: ${activeBoss.type} (${healthPercent}%)`);
    } else {
      this.bossStatusText?.setText('Boss: None');
    }
  }

  /**
   * Crée les boutons d'événements (Phase 7.4)
   */
  private createEventButtons(startY: number, startX: number = 10): number {
    let y = startY;
    const buttonWidth = 52;
    let x = startX;

    // Ligne de statut des événements actifs
    this.eventStatusText = this.createText(x, y, 'Events: None', 9, '#ffaa00');
    this.container.add(this.eventStatusText);
    y += 14;
    x = startX;

    // Boutons de déclenchement d'événements
    for (const event of EVENT_TYPES) {
      const button = this.createButton(
        x,
        y,
        buttonWidth,
        event.label,
        () => this.onEventButtonClick(event.id)
      );

      this.container.add(button);
      this.eventButtons.push(button);
      x += buttonWidth + this.BUTTON_SPACING;
    }

    // Bouton Stop All
    x += 3;
    const stopAllBtn = this.createButton(x, y, 55, 'Stop All', () => this.onStopAllEvents(), false, '#ff6666');
    this.container.add(stopAllBtn);
    this.eventButtons.push(stopAllBtn);

    y += this.BUTTON_HEIGHT + this.BUTTON_SPACING;

    return y;
  }

  /**
   * Handler pour clic sur bouton événement
   */
  private onEventButtonClick(type: SpecialEventType): void {
    // Si l'événement est actif, l'arrêter, sinon le déclencher
    const activeEvents = this.callbacks.getActiveEvents?.() || [];
    if (activeEvents.includes(type)) {
      this.callbacks.onEventStop?.(type);
    } else {
      this.callbacks.onEventTrigger?.(type);
    }
    this.updateEventStatusDisplay();
  }

  /**
   * Handler pour arrêter tous les événements
   */
  private onStopAllEvents(): void {
    this.callbacks.onEventStopAll?.();
    this.updateEventStatusDisplay();
  }

  /**
   * Met à jour l'affichage du statut des événements
   */
  private updateEventStatusDisplay(): void {
    const activeEvents = this.callbacks.getActiveEvents?.() || [];
    if (activeEvents.length > 0) {
      const eventNames = activeEvents.map(e => {
        const found = EVENT_TYPES.find(et => et.id === e);
        return found?.label || e;
      });
      this.eventStatusText?.setText(`Events: ${eventNames.join(', ')}`);
    } else {
      this.eventStatusText?.setText('Events: None');
    }
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
        bg.setStrokeStyle(1, isSelected ? 0xff00ff : 0x555555);
        text.setColor(isSelected ? '#ff00ff' : '#ffffff');
      }
    }
  }

  /**
   * Met à jour l'affichage du statut du personnage
   */
  private updateCharacterStatusDisplay(): void {
    const currentChar = this.callbacks.getCurrentCharacter?.() || this.state.selectedCharacter;
    this.characterStatusText?.setText(`Current: ${currentChar.toUpperCase()}`);
  }

  /**
   * Setup placement mode click handler
   */
  private setupPlacementMode(): void {
    // Create placement indicator (hidden by default)
    this.placementIndicator = this.scene.add.container(0, 0);
    this.placementIndicator.setDepth(999);
    this.placementIndicator.setVisible(false);

    const circle = this.scene.add.circle(0, 0, 16, 0x00ff00, 0.5);
    circle.setStrokeStyle(2, 0x00ff00);
    const text = this.scene.add.text(0, 25, 'Click to place', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#00ff00',
    });
    text.setOrigin(0.5, 0);

    this.placementIndicator.add([circle, text]);

    // Click handler for placement
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.placementMode === 'none') return;
      if (!pointer.leftButtonDown()) return;

      // Ignore the click that activated placement mode (same click as button)
      if (this.placementClickPending) {
        this.placementClickPending = false;
        return;
      }

      this.completePlacement(pointer.worldX, pointer.worldY);
    });

    // Update indicator position
    this.scene.events.on('update', () => {
      if (this.placementMode !== 'none' && this.placementIndicator) {
        const pointer = this.scene.input.activePointer;
        this.placementIndicator.setPosition(pointer.worldX, pointer.worldY);
      }
    });
  }

  /**
   * Enter placement mode - hide panel, show indicator
   */
  private enterPlacementMode(mode: 'zombie' | 'item', type: string): void {
    this.placementMode = mode;
    this.placementType = type;
    this.placementClickPending = true; // Ignore the current click (button click)

    // Update selected type
    if (mode === 'zombie') {
      this.spawner.setSelectedZombieType(type as ZombieType);
      this.state.selectedZombieType = type as ZombieType;
      this.updateZombieButtonStyles();
    }

    // Hide panel, show indicator
    this.container.setVisible(false);
    if (this.placementIndicator) {
      const text = this.placementIndicator.getAt(1) as Phaser.GameObjects.Text;
      text.setText(`Click to place: ${type}`);
      this.placementIndicator.setVisible(true);
    }

    console.log(`[Debug] Placement mode: ${mode} - ${type}`);
  }

  /**
   * Complete placement - spawn entity and show panel again
   */
  private completePlacement(x: number, y: number): void {
    if (this.placementMode === 'zombie') {
      this.callbacks.onZombieSpawn?.(this.placementType as ZombieType, x, y);
    } else if (this.placementMode === 'item') {
      this.callbacks.onItemSpawn?.(this.placementType as DebugItemType, x, y);
    }

    console.log(`[Debug] Placed ${this.placementType} at (${Math.round(x)}, ${Math.round(y)})`);

    // Exit placement mode
    this.exitPlacementMode();
  }

  /**
   * Exit placement mode - show panel again
   */
  public exitPlacementMode(): void {
    this.placementMode = 'none';
    this.placementType = '';
    this.placementClickPending = false;

    if (this.placementIndicator) {
      this.placementIndicator.setVisible(false);
    }
    this.container.setVisible(true);
  }

  /**
   * Check if in placement mode
   */
  public isInPlacementMode(): boolean {
    return this.placementMode !== 'none';
  }

  /**
   * Handler pour clic sur bouton arme
   */
  private onWeaponButtonClick(weaponId: string): void {
    this.callbacks.onWeaponGive?.(weaponId);
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
        bg.setStrokeStyle(1, isSelected ? 0x00ff00 : 0x555555);
        text.setColor(isSelected ? '#00ff00' : '#ffffff');
      }
    }
  }

  /**
   * Met à jour l'affichage de l'input de vague
   */
  private updateWaveInputDisplay(): void {
    this.waveInputText?.setText(String(this.waveInputValue));
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
    this.headerText.setText(`DEBUG PANEL (F1 to close)  Wave: ${this.state.currentWave}`);

    // Update status
    const godStatus = this.state.godMode ? 'ON' : 'OFF';
    const pauseStatus = this.state.spawnPaused ? 'ON' : 'OFF';
    this.statusText.setText(`God: ${godStatus} | Pause: ${pauseStatus} | Zombies: ${this.state.zombieCount}`);

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

    // Update boss display (Phase 7.3)
    this.updateBossStatusDisplay();

    // Update event display (Phase 7.4)
    this.updateEventStatusDisplay();

    // Update speed display
    const gameSpeed = this.callbacks.getGameSpeed?.() || 1;
    this.speedText?.setText(`Speed: ${gameSpeed}x`);
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
