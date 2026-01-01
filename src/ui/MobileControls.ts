import Phaser from 'phaser';
import { VirtualJoystick } from './VirtualJoystick';
import { TouchButton } from './TouchButton';
import { InputManager } from '@/managers/InputManager';
import { DeviceDetector } from '@/utils/DeviceDetector';
import { getPerformanceConfig } from '@/config/MobilePerformanceConfig';

/**
 * Configuration des contrôles mobiles
 */
export interface MobileControlsConfig {
  inputManager: InputManager;
  joystickSize?: number;
  buttonSize?: number;
  margin?: number;
  autoAim?: boolean;
}

/**
 * Interface pour les cooldowns des boutons
 */
export interface ButtonCooldowns {
  dash?: number;
  ability?: number;
}

/**
 * Conteneur de tous les contrôles tactiles pour mobile
 *
 * Layout:
 * ```
 * [Pause]  [Arme +]
 *          [Arme -]
 *
 *
 * [Dash]              [Capacité][Reload]
 *   [Joystick]          [Joystick Visée]
 *     Gauche               Droit
 * ```
 */
export class MobileControls extends Phaser.GameObjects.Container {
  private inputManager: InputManager;
  private config: Required<MobileControlsConfig>;

  // Joysticks
  private moveJoystick!: VirtualJoystick;
  private aimJoystick!: VirtualJoystick;

  // Boutons
  private dashButton!: TouchButton;
  private meleeButton!: TouchButton;
  private reloadButton!: TouchButton;
  private abilityButton!: TouchButton;
  private interactButton!: TouchButton;
  private useItemButton!: TouchButton;
  private itemNextButton!: TouchButton;
  private weaponNextButton!: TouchButton;
  private weaponPrevButton!: TouchButton;
  private meleeNextButton!: TouchButton;
  private pauseButton!: TouchButton;

  // Affichage de l'arme actuelle
  private weaponNameText!: Phaser.GameObjects.Text;

  // État
  private isVisible: boolean = true;
  private isShooting: boolean = false;

  // Tracking des touches actives
  private activeTouches: Map<number, { element: 'moveJoystick' | 'aimJoystick' | 'button'; button?: TouchButton }> = new Map();

  // Handlers pour cleanup
  private touchStartHandler?: (e: TouchEvent) => void;
  private touchMoveHandler?: (e: TouchEvent) => void;
  private touchEndHandler?: (e: TouchEvent) => void;

  constructor(scene: Phaser.Scene, config: MobileControlsConfig) {
    super(scene, 0, 0);

    this.inputManager = config.inputManager;

    // Récupérer les paramètres de performance mobile
    const touchSettings = getPerformanceConfig().getTouchControlSettings();

    // Configuration par défaut avec valeurs optimisées pour l'appareil
    this.config = {
      inputManager: config.inputManager,
      joystickSize: config.joystickSize ?? touchSettings.joystickSize,
      buttonSize: config.buttonSize ?? touchSettings.buttonSize,
      margin: config.margin ?? touchSettings.margin,
      autoAim: config.autoAim ?? false,
    };

    // Vérifier si on doit afficher les contrôles mobiles
    if (DeviceDetector.getRecommendedInputMode() !== 'touch') {
      this.setVisible(false);
      return;
    }

    this.createControls();
    this.setupConnections();
    this.setupResizeHandler();
    this.setupTouchHandler();

    scene.add.existing(this);

    // Fixer le scroll depth pour être au-dessus de tout
    this.setDepth(1000);
  }

  /**
   * Calcule les zones de capture pour les joysticks
   * Chaque joystick a une zone de capture couvrant sa moitié de l'écran
   */
  private getCaptureZones(): { left: { x: number; y: number; width: number; height: number }; right: { x: number; y: number; width: number; height: number } } {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Zone de gauche pour le joystick de mouvement (moitié gauche, partie basse)
    const leftZone = {
      x: 0,
      y: height * 0.35, // Commence à 35% de la hauteur
      width: width * 0.45, // 45% de la largeur
      height: height * 0.65, // 65% de la hauteur
    };

    // Zone de droite pour le joystick de visée (moitié droite, partie basse)
    const rightZone = {
      x: width * 0.55, // Commence à 55% de la largeur
      y: height * 0.35,
      width: width * 0.45,
      height: height * 0.65,
    };

    return { left: leftZone, right: rightZone };
  }

  /**
   * Crée tous les contrôles tactiles
   */
  private createControls(): void {
    const { joystickSize, buttonSize, margin } = this.config;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Calculer les zones de capture
    const zones = this.getCaptureZones();

    // ========== JOYSTICK DE MOUVEMENT (gauche) ==========
    this.moveJoystick = new VirtualJoystick(this.scene, {
      x: margin + joystickSize,
      y: height - margin - joystickSize,
      baseRadius: joystickSize,
      stickRadius: joystickSize * 0.4,
      fixed: false,
      captureZone: zones.left, // Zone de capture étendue
    });

    // ========== JOYSTICK DE VISÉE (droite) ==========
    this.aimJoystick = new VirtualJoystick(this.scene, {
      x: width - margin - joystickSize,
      y: height - margin - joystickSize,
      baseRadius: joystickSize,
      stickRadius: joystickSize * 0.4,
      baseColor: 0x442222,
      stickColor: 0xaa4444,
      fixed: false,
      captureZone: zones.right, // Zone de capture étendue
    });

    // ========== BOUTON DASH (à droite du joystick gauche) ==========
    this.dashButton = new TouchButton(this.scene, {
      x: margin + joystickSize * 2 + buttonSize + margin / 2,
      y: height - margin - joystickSize,
      radius: buttonSize,
      icon: '⚡',
      iconSize: 28,
      color: 0x4444aa,
      cooldown: 0,
      showCooldown: true,
    });

    // ========== BOUTON MELEE (au-dessus du dash) ==========
    this.meleeButton = new TouchButton(this.scene, {
      x: margin + joystickSize * 2 + buttonSize + margin / 2,
      y: height - margin - joystickSize - buttonSize * 2 - margin / 2,
      radius: buttonSize,
      icon: '🗡️',
      iconSize: 28,
      color: 0xaa6644,
    });

    // ========== BOUTON RELOAD (au-dessus du joystick droit) ==========
    this.reloadButton = new TouchButton(this.scene, {
      x: width - margin - joystickSize,
      y: height - margin - joystickSize * 2 - buttonSize,
      radius: buttonSize * 0.85,
      icon: '🔄',
      iconSize: 22,
      color: 0x448844,
    });

    // ========== BOUTON ABILITY (à gauche du joystick droit) ==========
    this.abilityButton = new TouchButton(this.scene, {
      x: width - margin - joystickSize * 2 - buttonSize - margin / 2,
      y: height - margin - joystickSize,
      radius: buttonSize,
      icon: '🔥',
      iconSize: 28,
      color: 0xaa4444,
      cooldown: 0,
      showCooldown: true,
    });

    // ========== BOUTON INTERACT (au-dessus du bouton ability) ==========
    this.interactButton = new TouchButton(this.scene, {
      x: width - margin - joystickSize * 2 - buttonSize - margin / 2,
      y: height - margin - joystickSize - buttonSize * 2 - margin / 2,
      radius: buttonSize * 0.85,
      icon: '👆',
      iconSize: 22,
      color: 0x8844aa,
    });

    // ========== BOUTON UTILISER ITEM (au-dessus du bouton reload) ==========
    this.useItemButton = new TouchButton(this.scene, {
      x: width - margin - joystickSize,
      y: height - margin - joystickSize * 2 - buttonSize * 2.5,
      radius: buttonSize * 0.85,
      icon: '📦',
      iconSize: 22,
      color: 0xaa8844,
    });

    // ========== BOUTON CYCLER ITEM (à côté du bouton utiliser) ==========
    this.itemNextButton = new TouchButton(this.scene, {
      x: width - margin - joystickSize - buttonSize * 2,
      y: height - margin - joystickSize * 2 - buttonSize * 2.5,
      radius: buttonSize * 0.7,
      icon: '↻',
      iconSize: 18,
      color: 0x666688,
    });

    // ========== BOUTONS ARME DISTANCE (haut droite) ==========
    this.weaponNextButton = new TouchButton(this.scene, {
      x: width - margin - buttonSize,
      y: margin + buttonSize,
      radius: buttonSize * 0.7,
      icon: '🔫',
      iconSize: 16,
      color: 0x446688,
    });

    this.weaponPrevButton = new TouchButton(this.scene, {
      x: width - margin - buttonSize,
      y: margin + buttonSize * 2.5,
      radius: buttonSize * 0.7,
      icon: '↕',
      iconSize: 18,
      color: 0x446688,
    });

    // ========== BOUTON ARME MELEE (sous les boutons distance) ==========
    this.meleeNextButton = new TouchButton(this.scene, {
      x: width - margin - buttonSize,
      y: margin + buttonSize * 4,
      radius: buttonSize * 0.7,
      icon: '⚔',
      iconSize: 18,
      color: 0x886644,
    });

    // ========== AFFICHAGE NOM DE L'ARME (entre les boutons +/-) ==========
    this.weaponNameText = this.scene.add.text(
      width - margin - buttonSize * 2.5,
      margin + buttonSize * 1.75,
      '',
      {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'right',
      }
    );
    this.weaponNameText.setOrigin(1, 0.5);
    this.weaponNameText.setDepth(1000);

    // ========== BOUTON PAUSE (haut gauche) ==========
    this.pauseButton = new TouchButton(this.scene, {
      x: margin + buttonSize,
      y: margin + buttonSize,
      radius: buttonSize * 0.8,
      icon: '⏸',
      iconSize: 20,
      color: 0x555555,
    });
  }

  /**
   * Connecte les contrôles à l'InputManager
   */
  private setupConnections(): void {
    // ========== JOYSTICK MOUVEMENT ==========
    this.moveJoystick.onMove((x, y) => {
      this.inputManager.setTouchMovement(x, y);
    });

    // ========== JOYSTICK VISÉE + TIR ==========
    this.aimJoystick.onStart(() => {
      this.isShooting = true;
      this.inputManager.setTouchShooting(true);
    });

    this.aimJoystick.onMove((_x, _y, angle) => {
      this.inputManager.setTouchAimAngle(angle);
    });

    this.aimJoystick.onEnd(() => {
      this.isShooting = false;
      this.inputManager.setTouchShooting(false);
    });

    // ========== BOUTONS D'ACTION ==========
    this.dashButton.onPress(() => {
      this.inputManager.setTouchAction('dash', true);
    });
    this.dashButton.onRelease(() => {
      this.inputManager.setTouchAction('dash', false);
    });

    this.meleeButton.onPress(() => {
      this.inputManager.triggerAction('melee');
    });

    this.reloadButton.onPress(() => {
      this.inputManager.setTouchAction('reload', true);
    });
    this.reloadButton.onRelease(() => {
      this.inputManager.setTouchAction('reload', false);
    });

    this.abilityButton.onPress(() => {
      this.inputManager.setTouchAction('ability', true);
    });
    this.abilityButton.onRelease(() => {
      this.inputManager.setTouchAction('ability', false);
    });

    this.interactButton.onPress(() => {
      this.inputManager.triggerAction('interact');
    });

    this.useItemButton.onPress(() => {
      this.inputManager.triggerAction('useItem');
    });

    this.itemNextButton.onPress(() => {
      this.inputManager.triggerAction('itemNext');
    });

    this.weaponNextButton.onPress(() => {
      this.inputManager.triggerAction('weaponNext');
    });

    this.weaponPrevButton.onPress(() => {
      this.inputManager.triggerAction('weaponPrev');
    });

    this.meleeNextButton.onPress(() => {
      this.inputManager.triggerAction('meleeNext');
    });

    this.pauseButton.onPress(() => {
      this.inputManager.triggerAction('pause');
    });
  }

  /**
   * Configure le gestionnaire de redimensionnement
   */
  private setupResizeHandler(): void {
    this.scene.scale.on('resize', this.handleResize, this);
  }

  /**
   * Configure le gestionnaire d'événements tactiles centralisé
   * Gère tous les touch events et les distribue aux bons éléments
   */
  private setupTouchHandler(): void {
    const canvas = this.scene.game.canvas;
    if (!canvas) return;

    // Liste de tous les boutons pour la détection
    const buttons = [
      this.dashButton,
      this.meleeButton,
      this.reloadButton,
      this.abilityButton,
      this.interactButton,
      this.useItemButton,
      this.itemNextButton,
      this.weaponNextButton,
      this.weaponPrevButton,
      this.meleeNextButton,
      this.pauseButton,
    ];

    /**
     * Convertit les coordonnées touch en coordonnées canvas
     */
    const getTouchCoords = (touch: Touch): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    };

    /**
     * Vérifie si un point est dans une zone rectangulaire
     */
    const isInZone = (x: number, y: number, zone: { x: number; y: number; width: number; height: number }): boolean => {
      return x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height;
    };

    // ========== TOUCH START ==========
    this.touchStartHandler = (e: TouchEvent) => {
      const zones = this.getCaptureZones();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const { x, y } = getTouchCoords(touch);
        const touchId = touch.identifier;

        // Déjà tracké?
        if (this.activeTouches.has(touchId)) continue;

        // 1. Vérifier les boutons EN PREMIER (haute priorité)
        let buttonFound = false;
        for (const button of buttons) {
          if (button.containsPoint(x, y)) {
            this.activeTouches.set(touchId, { element: 'button', button });
            button.activate();
            buttonFound = true;
            e.preventDefault();
            break;
          }
        }
        if (buttonFound) continue;

        // 2. Vérifier le joystick de mouvement (zone gauche)
        if (isInZone(x, y, zones.left) && !this.moveJoystick.isPressed()) {
          this.activeTouches.set(touchId, { element: 'moveJoystick' });
          this.moveJoystick.activate(x, y, touchId);
          e.preventDefault();
          continue;
        }

        // 3. Vérifier le joystick de visée (zone droite)
        if (isInZone(x, y, zones.right) && !this.aimJoystick.isPressed()) {
          this.activeTouches.set(touchId, { element: 'aimJoystick' });
          this.aimJoystick.activate(x, y, touchId);
          e.preventDefault();
          continue;
        }
      }
    };

    // ========== TOUCH MOVE ==========
    this.touchMoveHandler = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const { x, y } = getTouchCoords(touch);
        const touchId = touch.identifier;

        const tracked = this.activeTouches.get(touchId);
        if (!tracked) continue;

        if (tracked.element === 'moveJoystick') {
          this.moveJoystick.handleMove(x, y, touchId);
          e.preventDefault();
        } else if (tracked.element === 'aimJoystick') {
          this.aimJoystick.handleMove(x, y, touchId);
          e.preventDefault();
        }
        // Les boutons n'ont pas besoin de tracking du mouvement
      }
    };

    // ========== TOUCH END / CANCEL ==========
    this.touchEndHandler = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchId = touch.identifier;

        const tracked = this.activeTouches.get(touchId);
        if (!tracked) continue;

        if (tracked.element === 'moveJoystick') {
          this.moveJoystick.deactivate(touchId);
        } else if (tracked.element === 'aimJoystick') {
          this.aimJoystick.deactivate(touchId);
        } else if (tracked.element === 'button' && tracked.button) {
          tracked.button.deactivate();
        }

        this.activeTouches.delete(touchId);
        e.preventDefault();
      }
    };

    // Ajouter les listeners
    canvas.addEventListener('touchstart', this.touchStartHandler, { passive: false });
    canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    canvas.addEventListener('touchend', this.touchEndHandler, { passive: false });
    canvas.addEventListener('touchcancel', this.touchEndHandler, { passive: false });
  }

  /**
   * Gère le redimensionnement de l'écran
   */
  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { joystickSize, buttonSize, margin } = this.config;
    const width = gameSize.width;
    const height = gameSize.height;

    // Recalculer les zones de capture
    const zones = this.getCaptureZones();

    // Repositionner le joystick de mouvement et mettre à jour sa zone
    this.moveJoystick.setOrigin(margin + joystickSize, height - margin - joystickSize);
    this.moveJoystick.setCaptureZone(zones.left);

    // Repositionner le joystick de visée et mettre à jour sa zone
    this.aimJoystick.setOrigin(width - margin - joystickSize, height - margin - joystickSize);
    this.aimJoystick.setCaptureZone(zones.right);

    // Repositionner les boutons
    this.dashButton.setPosition(
      margin + joystickSize * 2 + buttonSize + margin / 2,
      height - margin - joystickSize
    );

    this.meleeButton.setPosition(
      margin + joystickSize * 2 + buttonSize + margin / 2,
      height - margin - joystickSize - buttonSize * 2 - margin / 2
    );

    this.reloadButton.setPosition(
      width - margin - joystickSize,
      height - margin - joystickSize * 2 - buttonSize
    );

    this.abilityButton.setPosition(
      width - margin - joystickSize * 2 - buttonSize - margin / 2,
      height - margin - joystickSize
    );

    this.interactButton.setPosition(
      width - margin - joystickSize * 2 - buttonSize - margin / 2,
      height - margin - joystickSize - buttonSize * 2 - margin / 2
    );

    this.useItemButton.setPosition(
      width - margin - joystickSize,
      height - margin - joystickSize * 2 - buttonSize * 2.5
    );

    this.itemNextButton.setPosition(
      width - margin - joystickSize - buttonSize * 2,
      height - margin - joystickSize * 2 - buttonSize * 2.5
    );

    this.weaponNextButton.setPosition(width - margin - buttonSize, margin + buttonSize);

    this.weaponPrevButton.setPosition(width - margin - buttonSize, margin + buttonSize * 2.5);

    this.meleeNextButton.setPosition(width - margin - buttonSize, margin + buttonSize * 4);

    this.weaponNameText.setPosition(
      width - margin - buttonSize * 2.5,
      margin + buttonSize * 1.75
    );

    this.pauseButton.setPosition(margin + buttonSize, margin + buttonSize);
  }

  /**
   * Met à jour les cooldowns des boutons (à appeler depuis le jeu)
   */
  public updateCooldowns(cooldowns: ButtonCooldowns): void {
    if (cooldowns.dash !== undefined && cooldowns.dash > 0) {
      this.dashButton.triggerCooldown(cooldowns.dash);
    }
    if (cooldowns.ability !== undefined && cooldowns.ability > 0) {
      this.abilityButton.triggerCooldown(cooldowns.ability);
    }
  }

  /**
   * Met à jour l'icône de la capacité spéciale
   */
  public setAbilityIcon(icon: string): void {
    this.abilityButton.setIcon(icon);
  }

  /**
   * Met à jour l'affichage de l'arme actuelle
   */
  public setCurrentWeapon(weaponName: string): void {
    if (this.weaponNameText) {
      this.weaponNameText.setText(weaponName);
    }
  }

  /**
   * Affiche/masque les contrôles avec animation
   */
  public showControls(show: boolean): void {
    this.isVisible = show;

    const elements = [
      this.moveJoystick,
      this.aimJoystick,
      this.dashButton,
      this.meleeButton,
      this.reloadButton,
      this.abilityButton,
      this.interactButton,
      this.useItemButton,
      this.itemNextButton,
      this.weaponNextButton,
      this.weaponPrevButton,
      this.meleeNextButton,
      this.pauseButton,
    ];

    // Gérer la visibilité du texte d'arme séparément
    this.weaponNameText.setVisible(show);

    elements.forEach((element) => {
      if (element.setVisibility) {
        element.setVisibility(show, true);
      }
    });
  }

  /**
   * Vérifie si les contrôles sont visibles
   */
  public areControlsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Vérifie si le joueur est en train de tirer
   */
  public getIsShooting(): boolean {
    return this.isShooting;
  }

  /**
   * Retourne le vecteur de mouvement
   */
  public getMovementVector(): { x: number; y: number } {
    return this.moveJoystick.getVector();
  }

  /**
   * Retourne l'angle de visée
   */
  public getAimAngle(): number {
    return this.aimJoystick.getAngle();
  }

  /**
   * Active le mode auto-aim
   */
  public setAutoAim(enabled: boolean): void {
    this.config.autoAim = enabled;
    if (enabled) {
      // Masquer le joystick de visée en mode auto-aim
      this.aimJoystick.setVisibility(false, true);
    } else {
      this.aimJoystick.setVisibility(true, true);
    }
  }

  /**
   * Définit la taille des contrôles (pour accessibilité)
   */
  public setControlSize(scale: number): void {
    const baseJoystickSize = 75 * scale;
    const baseButtonSize = 35 * scale;

    this.config.joystickSize = baseJoystickSize;
    this.config.buttonSize = baseButtonSize;

    // Redimensionner les éléments
    this.moveJoystick.resize(baseJoystickSize, baseJoystickSize * 0.4);
    this.aimJoystick.resize(baseJoystickSize, baseJoystickSize * 0.4);

    this.dashButton.resize(baseButtonSize);
    this.meleeButton.resize(baseButtonSize);
    this.reloadButton.resize(baseButtonSize * 0.85);
    this.abilityButton.resize(baseButtonSize);
    this.interactButton.resize(baseButtonSize * 0.85);
    this.useItemButton.resize(baseButtonSize * 0.85);
    this.itemNextButton.resize(baseButtonSize * 0.7);
    this.weaponNextButton.resize(baseButtonSize * 0.7);
    this.weaponPrevButton.resize(baseButtonSize * 0.7);
    this.meleeNextButton.resize(baseButtonSize * 0.7);
    this.pauseButton.resize(baseButtonSize * 0.8);

    // Repositionner
    this.handleResize(this.scene.scale.gameSize);
  }

  /**
   * Nettoyage
   */
  public destroy(fromScene?: boolean): void {
    this.scene.scale.off('resize', this.handleResize, this);

    // Supprimer les touch event listeners
    const canvas = this.scene.game.canvas;
    if (canvas) {
      if (this.touchStartHandler) {
        canvas.removeEventListener('touchstart', this.touchStartHandler);
      }
      if (this.touchMoveHandler) {
        canvas.removeEventListener('touchmove', this.touchMoveHandler);
      }
      if (this.touchEndHandler) {
        canvas.removeEventListener('touchend', this.touchEndHandler);
        canvas.removeEventListener('touchcancel', this.touchEndHandler);
      }
    }

    this.activeTouches.clear();

    this.moveJoystick.destroy();
    this.aimJoystick.destroy();
    this.dashButton.destroy();
    this.meleeButton.destroy();
    this.reloadButton.destroy();
    this.abilityButton.destroy();
    this.interactButton.destroy();
    this.useItemButton.destroy();
    this.itemNextButton.destroy();
    this.weaponNextButton.destroy();
    this.weaponPrevButton.destroy();
    this.meleeNextButton.destroy();
    this.pauseButton.destroy();
    this.weaponNameText.destroy();

    super.destroy(fromScene);
  }
}
