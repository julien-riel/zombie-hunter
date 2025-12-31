import Phaser from 'phaser';

/**
 * Configuration du joystick virtuel
 */
export interface VirtualJoystickConfig {
  x: number;
  y: number;
  baseRadius?: number;
  stickRadius?: number;
  baseColor?: number;
  stickColor?: number;
  baseAlpha?: number;
  stickAlpha?: number;
  deadZone?: number;
  fixed?: boolean;
  /** Zone de capture étendue pour le mode dynamique (définie par MobileControls) */
  captureZone?: { x: number; y: number; width: number; height: number };
}

/**
 * Joystick virtuel tactile pour le contrôle du mouvement ou de la visée
 *
 * Caractéristiques:
 * - Zone de capture configurable
 * - Stick interne mobile
 * - Zone morte centrale
 * - Affichage semi-transparent
 * - Peut apparaître où le pouce touche (mode dynamique)
 */
export class VirtualJoystick extends Phaser.GameObjects.Container {
  private config: Omit<Required<VirtualJoystickConfig>, 'captureZone'> & { captureZone?: { x: number; y: number; width: number; height: number } };

  // Éléments visuels
  private base!: Phaser.GameObjects.Arc;
  private stick!: Phaser.GameObjects.Arc;

  // État
  private isActive: boolean = false;
  private pointerId: number = -1;
  private touchIdentifier: number = -1; // Pour iOS touch events
  private baseOriginX: number;
  private baseOriginY: number;

  // Valeurs de sortie
  private outputVector: { x: number; y: number } = { x: 0, y: 0 };
  private outputAngle: number = 0;
  private outputForce: number = 0;

  // Callbacks
  private onMoveCallback?: (x: number, y: number, angle: number) => void;
  private onStartCallback?: () => void;
  private onEndCallback?: () => void;

  constructor(scene: Phaser.Scene, config: VirtualJoystickConfig) {
    super(scene, config.x, config.y);

    // Configuration par défaut
    this.config = {
      x: config.x,
      y: config.y,
      baseRadius: config.baseRadius ?? 75,
      stickRadius: config.stickRadius ?? 30,
      baseColor: config.baseColor ?? 0x333333,
      stickColor: config.stickColor ?? 0x888888,
      baseAlpha: config.baseAlpha ?? 0.5,
      stickAlpha: config.stickAlpha ?? 0.7,
      deadZone: config.deadZone ?? 0.15,
      fixed: config.fixed ?? true,
      captureZone: config.captureZone,
    };

    this.baseOriginX = config.x;
    this.baseOriginY = config.y;

    this.createJoystick();
    this.setupInput();
    this.setupTouchEvents(); // Support iOS natif

    scene.add.existing(this);
  }

  /**
   * Crée les éléments visuels du joystick
   */
  private createJoystick(): void {
    const { baseRadius, stickRadius, baseColor, stickColor, baseAlpha, stickAlpha } = this.config;

    // Base extérieure
    this.base = this.scene.add.circle(0, 0, baseRadius, baseColor, baseAlpha);
    this.base.setStrokeStyle(2, 0xffffff, 0.3);
    this.add(this.base);

    // Stick intérieur
    this.stick = this.scene.add.circle(0, 0, stickRadius, stickColor, stickAlpha);
    this.stick.setStrokeStyle(2, 0xffffff, 0.5);
    this.add(this.stick);
  }

  /**
   * Configure les entrées tactiles via Phaser
   */
  private setupInput(): void {
    // Rendre la base interactive
    this.base.setInteractive({
      hitArea: new Phaser.Geom.Circle(0, 0, this.config.baseRadius),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      draggable: false,
    });

    // Handler commun pour pointer down
    const handlePointerDown = (pointer: Phaser.Input.Pointer) => {
      if (this.isActive) return;

      this.isActive = true;
      this.pointerId = pointer.id;

      // Mode dynamique: déplacer le joystick où le doigt touche
      if (!this.config.fixed) {
        this.setPosition(pointer.x, pointer.y);
        this.baseOriginX = pointer.x;
        this.baseOriginY = pointer.y;
      }

      this.updateStickPosition(pointer.x, pointer.y);

      if (this.onStartCallback) {
        this.onStartCallback();
      }
    };

    // Pointer down sur la base (pour desktop/souris)
    this.base.on('pointerdown', handlePointerDown);

    // Pointer move global
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isActive || pointer.id !== this.pointerId) return;
      this.updateStickPosition(pointer.x, pointer.y);
    });

    // Pointer up global
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isActive || pointer.id !== this.pointerId) return;
      this.releaseStick();
    });
  }

  /**
   * Configure les événements touch natifs pour iOS
   * iOS Safari gère mieux les événements touch natifs que les pointer events
   */
  private setupTouchEvents(): void {
    const canvas = this.scene.game.canvas;
    if (!canvas) return;

    // Vérifier si on a une zone de capture pour le mode dynamique
    const zone = this.config.captureZone;

    const handleTouchStart = (e: TouchEvent) => {
      if (this.isActive) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;

        // Vérifier si le touch est dans notre zone
        let isInZone = false;

        if (zone && !this.config.fixed) {
          // Mode dynamique avec zone de capture
          isInZone = x >= zone.x && x <= zone.x + zone.width &&
                     y >= zone.y && y <= zone.y + zone.height;
        } else {
          // Mode fixe - vérifier si dans le cercle de base
          const dx = x - this.baseOriginX;
          const dy = y - this.baseOriginY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          isInZone = distance <= this.config.baseRadius;
        }

        if (isInZone) {
          this.isActive = true;
          this.touchIdentifier = touch.identifier;
          this.pointerId = -1; // Invalider le pointerId Phaser

          // Mode dynamique: déplacer le joystick
          if (!this.config.fixed) {
            this.setPosition(x, y);
            this.baseOriginX = x;
            this.baseOriginY = y;
          }

          this.updateStickPosition(x, y);

          if (this.onStartCallback) {
            this.onStartCallback();
          }

          e.preventDefault();
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!this.isActive || this.touchIdentifier === -1) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.touchIdentifier) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (touch.clientX - rect.left) * scaleX;
          const y = (touch.clientY - rect.top) * scaleY;

          this.updateStickPosition(x, y);
          e.preventDefault();
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!this.isActive || this.touchIdentifier === -1) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.touchIdentifier) {
          this.releaseStick();
          e.preventDefault();
          break;
        }
      }
    };

    // Stocker les références pour pouvoir les supprimer
    (this as any)._touchStartHandler = handleTouchStart;
    (this as any)._touchMoveHandler = handleTouchMove;
    (this as any)._touchEndHandler = handleTouchEnd;

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  }

  /**
   * Met à jour la position du stick en fonction du pointeur
   */
  private updateStickPosition(pointerX: number, pointerY: number): void {
    // Calculer le déplacement par rapport au centre du joystick
    const dx = pointerX - this.baseOriginX;
    const dy = pointerY - this.baseOriginY;

    // Calculer la distance et l'angle
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const maxDistance = this.config.baseRadius - this.config.stickRadius / 2;

    // Limiter au rayon de la base
    const clampedDistance = Math.min(distance, maxDistance);

    // Calculer la position du stick
    const stickX = Math.cos(angle) * clampedDistance;
    const stickY = Math.sin(angle) * clampedDistance;

    // Mettre à jour la position visuelle
    this.stick.setPosition(stickX, stickY);

    // Calculer la force normalisée (0-1)
    const normalizedForce = clampedDistance / maxDistance;

    // Appliquer la zone morte
    if (normalizedForce < this.config.deadZone) {
      this.outputVector = { x: 0, y: 0 };
      this.outputForce = 0;
    } else {
      // Remapper la force pour exclure la zone morte
      const adjustedForce = (normalizedForce - this.config.deadZone) / (1 - this.config.deadZone);
      this.outputVector = {
        x: Math.cos(angle) * adjustedForce,
        y: Math.sin(angle) * adjustedForce,
      };
      this.outputForce = adjustedForce;
    }

    this.outputAngle = angle;

    // Appeler le callback
    if (this.onMoveCallback) {
      this.onMoveCallback(this.outputVector.x, this.outputVector.y, this.outputAngle);
    }
  }

  /**
   * Relâche le stick et le recentre
   */
  private releaseStick(): void {
    this.isActive = false;
    this.pointerId = -1;
    this.touchIdentifier = -1;

    // Animation de retour au centre
    this.scene.tweens.add({
      targets: this.stick,
      x: 0,
      y: 0,
      duration: 100,
      ease: 'Power2',
    });

    // Réinitialiser les valeurs
    this.outputVector = { x: 0, y: 0 };
    this.outputForce = 0;

    // Mode dynamique: revenir à la position d'origine
    if (!this.config.fixed) {
      this.scene.tweens.add({
        targets: this,
        x: this.config.x,
        y: this.config.y,
        duration: 150,
        ease: 'Power2',
      });
      this.baseOriginX = this.config.x;
      this.baseOriginY = this.config.y;
    }

    if (this.onMoveCallback) {
      this.onMoveCallback(0, 0, this.outputAngle);
    }

    if (this.onEndCallback) {
      this.onEndCallback();
    }
  }

  /**
   * Définit le callback appelé lors du mouvement
   */
  public onMove(callback: (x: number, y: number, angle: number) => void): this {
    this.onMoveCallback = callback;
    return this;
  }

  /**
   * Définit le callback appelé au début du toucher
   */
  public onStart(callback: () => void): this {
    this.onStartCallback = callback;
    return this;
  }

  /**
   * Définit le callback appelé à la fin du toucher
   */
  public onEnd(callback: () => void): this {
    this.onEndCallback = callback;
    return this;
  }

  /**
   * Retourne le vecteur de mouvement normalisé
   */
  public getVector(): { x: number; y: number } {
    return { ...this.outputVector };
  }

  /**
   * Retourne l'angle en radians
   */
  public getAngle(): number {
    return this.outputAngle;
  }

  /**
   * Retourne la force (0-1)
   */
  public getForce(): number {
    return this.outputForce;
  }

  /**
   * Vérifie si le joystick est actuellement utilisé
   */
  public isPressed(): boolean {
    return this.isActive;
  }

  /**
   * Change la visibilité avec animation
   */
  public setVisibility(visible: boolean, animate: boolean = true): void {
    if (animate) {
      this.scene.tweens.add({
        targets: this,
        alpha: visible ? 1 : 0,
        duration: 200,
        ease: 'Power2',
      });
    } else {
      this.setAlpha(visible ? 1 : 0);
    }
  }

  /**
   * Redimensionne le joystick
   */
  public resize(baseRadius: number, stickRadius: number): void {
    this.config.baseRadius = baseRadius;
    this.config.stickRadius = stickRadius;

    this.base.setRadius(baseRadius);
    this.stick.setRadius(stickRadius);

    // Recréer la zone interactive
    this.base.setInteractive({
      hitArea: new Phaser.Geom.Circle(0, 0, baseRadius),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      draggable: false,
    });
  }

  /**
   * Définit la position d'origine (pour le mode dynamique)
   */
  public setOrigin(x: number, y: number): void {
    this.config.x = x;
    this.config.y = y;
    this.baseOriginX = x;
    this.baseOriginY = y;
    this.setPosition(x, y);
  }

  /**
   * Met à jour la zone de capture (appelé lors du redimensionnement)
   */
  public setCaptureZone(zone: { x: number; y: number; width: number; height: number }): void {
    this.config.captureZone = zone;
  }

  /**
   * Nettoyage
   */
  public destroy(fromScene?: boolean): void {
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');

    // Supprimer les event listeners touch natifs
    const canvas = this.scene.game.canvas;
    if (canvas) {
      if ((this as any)._touchStartHandler) {
        canvas.removeEventListener('touchstart', (this as any)._touchStartHandler);
      }
      if ((this as any)._touchMoveHandler) {
        canvas.removeEventListener('touchmove', (this as any)._touchMoveHandler);
      }
      if ((this as any)._touchEndHandler) {
        canvas.removeEventListener('touchend', (this as any)._touchEndHandler);
        canvas.removeEventListener('touchcancel', (this as any)._touchEndHandler);
      }
    }

    super.destroy(fromScene);
  }
}
