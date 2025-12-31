import Phaser from 'phaser';
import { DeviceDetector, InputMode } from '@/utils/DeviceDetector';

/**
 * Types d'actions supportées par l'InputManager
 */
export type InputAction =
  | 'shoot'
  | 'dash'
  | 'reload'
  | 'ability'
  | 'interact'
  | 'useItem'
  | 'itemNext'
  | 'weapon1'
  | 'weapon2'
  | 'weapon3'
  | 'weapon4'
  | 'weaponNext'
  | 'weaponPrev'
  | 'pause';

/**
 * Vecteur 2D normalisé
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Callback pour les actions
 */
export type ActionCallback = () => void;

/**
 * Gestionnaire d'entrées abstrait
 * Supporte clavier/souris et tactile de manière transparente
 */
export class InputManager {
  private scene: Phaser.Scene;
  private inputMode: InputMode;

  // Contrôles clavier
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  } | null = null;
  private spaceKey: Phaser.Input.Keyboard.Key | null = null;
  private reloadKey: Phaser.Input.Keyboard.Key | null = null;
  private abilityKey: Phaser.Input.Keyboard.Key | null = null;
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private useItemKey: Phaser.Input.Keyboard.Key | null = null;
  private itemNextKey: Phaser.Input.Keyboard.Key | null = null;
  private pauseKeys: Phaser.Input.Keyboard.Key[] = [];
  private weaponKeys: Phaser.Input.Keyboard.Key[] = [];

  // État des entrées tactiles (sera rempli par les contrôles tactiles en Phase 2)
  private touchMovement: Vector2 = { x: 0, y: 0 };
  private touchAimAngle: number = 0;
  private touchActions: Map<InputAction, boolean> = new Map();

  // Callbacks pour les actions
  private actionCallbacks: Map<InputAction, ActionCallback[]> = new Map();

  // État du tir (maintenu)
  private isShootingKeyboard: boolean = false;
  private isShootingTouch: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.inputMode = DeviceDetector.getRecommendedInputMode();

    this.setupKeyboardInput();
    this.setupMouseInput();

    // Initialiser les actions tactiles à false
    const actions: InputAction[] = [
      'shoot', 'dash', 'reload', 'ability', 'interact',
      'useItem', 'itemNext',
      'weapon1', 'weapon2', 'weapon3', 'weapon4',
      'weaponNext', 'weaponPrev', 'pause'
    ];
    actions.forEach(action => this.touchActions.set(action, false));
  }

  /**
   * Configure les entrées clavier
   */
  private setupKeyboardInput(): void {
    if (!this.scene.input.keyboard) return;

    // Touches de mouvement
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasd = {
      W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Touches d'action
    this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.reloadKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.abilityKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.interactKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.useItemKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.itemNextKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);

    // Empêcher Tab de changer le focus du navigateur
    if (this.itemNextKey) {
      this.itemNextKey.on('down', (event: KeyboardEvent) => {
        event.preventDefault();
      });
    }

    // Touches de pause
    this.pauseKeys = [
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P),
    ];

    // Touches d'armes (1-4)
    this.weaponKeys = [
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
    ];
  }

  /**
   * Configure les entrées souris
   */
  private setupMouseInput(): void {
    // Molette pour cycler les armes
    this.scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gx: number[], _gy: number[], deltaY: number) => {
      if (this.inputMode === 'keyboard') {
        if (deltaY > 0) {
          this.triggerAction('weaponNext');
        } else if (deltaY < 0) {
          this.triggerAction('weaponPrev');
        }
      }
    });

    // Suivi du clic pour le tir
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.inputMode === 'keyboard' && pointer.leftButtonDown()) {
        this.isShootingKeyboard = true;
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.inputMode === 'keyboard' && !pointer.leftButtonDown()) {
        this.isShootingKeyboard = false;
      }
    });
  }

  /**
   * Détecte automatiquement le mode d'entrée
   * Appelé au premier input détecté
   */
  public detectInputMode(): InputMode {
    return this.inputMode;
  }

  /**
   * Force un mode d'entrée spécifique
   */
  public setInputMode(mode: InputMode): void {
    this.inputMode = mode;
  }

  /**
   * Retourne le mode d'entrée actuel
   */
  public getInputMode(): InputMode {
    return this.inputMode;
  }

  /**
   * Retourne le vecteur de mouvement normalisé (-1 à 1)
   */
  public getMovementVector(): Vector2 {
    if (this.inputMode === 'touch') {
      return this.touchMovement;
    }

    // Mode clavier
    let x = 0;
    let y = 0;

    if (this.cursors && this.wasd) {
      // Horizontal
      if (this.cursors.left.isDown || this.wasd.A.isDown) {
        x = -1;
      } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
        x = 1;
      }

      // Vertical
      if (this.cursors.up.isDown || this.wasd.W.isDown) {
        y = -1;
      } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
        y = 1;
      }
    }

    // Normaliser pour le mouvement diagonal
    if (x !== 0 && y !== 0) {
      const factor = Math.SQRT1_2; // 1/sqrt(2)
      x *= factor;
      y *= factor;
    }

    return { x, y };
  }

  /**
   * Retourne l'angle de visée en radians
   * @param playerX Position X du joueur (pour calcul souris)
   * @param playerY Position Y du joueur (pour calcul souris)
   */
  public getAimAngle(playerX: number, playerY: number): number {
    if (this.inputMode === 'touch') {
      return this.touchAimAngle;
    }

    // Mode clavier/souris
    const pointer = this.scene.input.activePointer;
    return Phaser.Math.Angle.Between(playerX, playerY, pointer.worldX, pointer.worldY);
  }

  /**
   * Retourne la direction de visée en vecteur normalisé
   * @param playerX Position X du joueur
   * @param playerY Position Y du joueur
   */
  public getAimDirection(playerX: number, playerY: number): Vector2 {
    const angle = this.getAimAngle(playerX, playerY);
    return {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
  }

  /**
   * Vérifie si une action est maintenue (pour les actions continues comme le tir)
   */
  public isActionPressed(action: InputAction): boolean {
    if (this.inputMode === 'touch') {
      return this.touchActions.get(action) || false;
    }

    // Mode clavier
    switch (action) {
      case 'shoot':
        return this.isShootingKeyboard;
      case 'dash':
        return this.spaceKey?.isDown || false;
      case 'reload':
        return this.reloadKey?.isDown || false;
      case 'ability':
        return this.abilityKey?.isDown || false;
      case 'interact':
        return this.interactKey?.isDown || false;
      case 'useItem':
        return this.useItemKey?.isDown || false;
      case 'itemNext':
        return this.itemNextKey?.isDown || false;
      case 'pause':
        return this.pauseKeys.some(key => key.isDown);
      case 'weapon1':
        return this.weaponKeys[0]?.isDown || false;
      case 'weapon2':
        return this.weaponKeys[1]?.isDown || false;
      case 'weapon3':
        return this.weaponKeys[2]?.isDown || false;
      case 'weapon4':
        return this.weaponKeys[3]?.isDown || false;
      default:
        return false;
    }
  }

  /**
   * Vérifie si une action vient d'être déclenchée (JustDown)
   */
  public isActionJustPressed(action: InputAction): boolean {
    if (this.inputMode === 'touch') {
      // Pour tactile, on utilise les callbacks
      return false;
    }

    // Mode clavier
    switch (action) {
      case 'dash':
        return this.spaceKey ? Phaser.Input.Keyboard.JustDown(this.spaceKey) : false;
      case 'reload':
        return this.reloadKey ? Phaser.Input.Keyboard.JustDown(this.reloadKey) : false;
      case 'ability':
        return this.abilityKey ? Phaser.Input.Keyboard.JustDown(this.abilityKey) : false;
      case 'interact':
        return this.interactKey ? Phaser.Input.Keyboard.JustDown(this.interactKey) : false;
      case 'useItem':
        return this.useItemKey ? Phaser.Input.Keyboard.JustDown(this.useItemKey) : false;
      case 'itemNext':
        return this.itemNextKey ? Phaser.Input.Keyboard.JustDown(this.itemNextKey) : false;
      case 'pause':
        return this.pauseKeys.some(key => Phaser.Input.Keyboard.JustDown(key));
      case 'weapon1':
        return this.weaponKeys[0] ? Phaser.Input.Keyboard.JustDown(this.weaponKeys[0]) : false;
      case 'weapon2':
        return this.weaponKeys[1] ? Phaser.Input.Keyboard.JustDown(this.weaponKeys[1]) : false;
      case 'weapon3':
        return this.weaponKeys[2] ? Phaser.Input.Keyboard.JustDown(this.weaponKeys[2]) : false;
      case 'weapon4':
        return this.weaponKeys[3] ? Phaser.Input.Keyboard.JustDown(this.weaponKeys[3]) : false;
      default:
        return false;
    }
  }

  /**
   * Enregistre un callback pour une action
   * Utile pour les déclencheurs (boutons tactiles)
   */
  public onActionTriggered(action: InputAction, callback: ActionCallback): void {
    if (!this.actionCallbacks.has(action)) {
      this.actionCallbacks.set(action, []);
    }
    this.actionCallbacks.get(action)!.push(callback);
  }

  /**
   * Supprime un callback pour une action
   */
  public offActionTriggered(action: InputAction, callback: ActionCallback): void {
    const callbacks = this.actionCallbacks.get(action);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Déclenche une action manuellement (utilisé par les contrôles tactiles)
   */
  public triggerAction(action: InputAction): void {
    const callbacks = this.actionCallbacks.get(action);
    if (callbacks) {
      callbacks.forEach(callback => callback());
    }
  }

  // ==================== MÉTHODES POUR LES CONTRÔLES TACTILES (Phase 2) ====================

  /**
   * Met à jour le vecteur de mouvement tactile
   * Appelé par le joystick virtuel gauche
   */
  public setTouchMovement(x: number, y: number): void {
    this.touchMovement.x = x;
    this.touchMovement.y = y;
  }

  /**
   * Met à jour l'angle de visée tactile
   * Appelé par le joystick virtuel droit
   */
  public setTouchAimAngle(angle: number): void {
    this.touchAimAngle = angle;
  }

  /**
   * Met à jour l'état d'une action tactile
   * Appelé par les boutons tactiles
   */
  public setTouchAction(action: InputAction, pressed: boolean): void {
    const wasPressed = this.touchActions.get(action) || false;
    this.touchActions.set(action, pressed);

    // Déclencher le callback si on vient d'appuyer
    if (pressed && !wasPressed) {
      this.triggerAction(action);
    }
  }

  /**
   * Active le mode tir tactile (maintenu)
   */
  public setTouchShooting(shooting: boolean): void {
    this.isShootingTouch = shooting;
    this.touchActions.set('shoot', shooting);
  }

  /**
   * Vérifie si le joueur est en train de tirer
   */
  public isShooting(): boolean {
    if (this.inputMode === 'touch') {
      return this.isShootingTouch;
    }
    return this.isShootingKeyboard;
  }

  /**
   * Nettoyage lors de la destruction de la scène
   */
  public destroy(): void {
    this.actionCallbacks.clear();
    this.touchActions.clear();
  }
}
