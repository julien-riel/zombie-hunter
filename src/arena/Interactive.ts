import Phaser from 'phaser';
import { TILE_SIZE } from '@config/constants';
import type { GameScene } from '@scenes/GameScene';

/**
 * Types d'éléments interactifs
 */
export enum InteractiveType {
  BARREL_EXPLOSIVE = 'barrel_explosive',
  BARREL_FIRE = 'barrel_fire',
  SWITCH = 'switch',
  GENERATOR = 'generator',
  FLAME_TRAP = 'flame_trap',
  BLADE_TRAP = 'blade_trap',
}

/**
 * Types de déclenchement
 */
export enum TriggerType {
  ON_DAMAGE = 'on_damage',
  ON_INTERACT = 'on_interact',
  ON_PROXIMITY = 'on_proximity',
  ON_SWITCH = 'on_switch',
}

/**
 * Configuration de base pour un élément interactif
 */
export interface InteractiveConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  triggerType?: TriggerType;
  cooldown?: number;
  charges?: number;
  linkedId?: string;
}

/**
 * Données d'un élément interactif
 */
export interface InteractiveData {
  id: string;
  type: InteractiveType;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  isTriggered: boolean;
}

/**
 * Classe de base abstraite pour les éléments interactifs
 * Les éléments interactifs peuvent être déclenchés par:
 * - Des dégâts (explosions, projectiles)
 * - Une interaction joueur (touche E)
 * - La proximité d'entités
 * - Un interrupteur lié
 */
export abstract class Interactive extends Phaser.GameObjects.Container {
  declare public scene: GameScene;

  /** ID unique de l'élément */
  public readonly id: string;
  /** Type d'élément interactif */
  public readonly interactiveType: InteractiveType;
  /** Type de déclenchement */
  public readonly triggerType: TriggerType;

  /** Points de vie */
  protected health: number;
  protected maxHealth: number;

  /** Dimensions */
  protected interactiveWidth: number;
  protected interactiveHeight: number;

  /** États */
  protected destroyed: boolean = false;
  protected triggered: boolean = false;
  protected canInteract: boolean = true;

  /** Cooldown et charges */
  protected cooldown: number;
  protected cooldownTimer: number = 0;
  protected charges: number;
  protected maxCharges: number;

  /** Lien avec d'autres éléments */
  protected linkedId: string | null;

  /** Visuels */
  protected sprite: Phaser.GameObjects.Graphics;

  /** Compteur unique pour les IDs */
  private static idCounter: number = 0;

  constructor(scene: GameScene, type: InteractiveType, config: InteractiveConfig) {
    super(scene, config.x, config.y);

    // Générer un ID unique
    this.id = `${type}_${Interactive.idCounter++}`;
    this.interactiveType = type;

    // Récupérer la configuration depuis balance.ts
    const balanceConfig = this.getBalanceConfig();

    // Configuration de base
    this.triggerType = config.triggerType ?? TriggerType.ON_DAMAGE;
    this.maxHealth = balanceConfig.health ?? 50;
    this.health = this.maxHealth;
    this.cooldown = config.cooldown ?? balanceConfig.cooldown ?? 0;
    this.maxCharges = config.charges ?? balanceConfig.charges ?? -1;
    this.charges = this.maxCharges;
    this.linkedId = config.linkedId ?? null;

    // Dimensions par défaut
    this.interactiveWidth = config.width ?? this.getDefaultWidth();
    this.interactiveHeight = config.height ?? this.getDefaultHeight();

    // Créer les visuels
    this.sprite = this.scene.add.graphics();
    this.add(this.sprite);
    // Note: drawSprite() doit être appelé par les classes filles après leur propre initialisation

    // Ajouter au monde
    scene.add.existing(this);

    // Configurer la physique
    this.setupPhysics();

    // Profondeur
    this.setDepth(1);
  }

  /**
   * Retourne la configuration de balance pour ce type
   */
  protected abstract getBalanceConfig(): {
    health?: number;
    cooldown?: number;
    charges?: number;
    [key: string]: unknown;
  };

  /**
   * Dessine le sprite de l'élément
   */
  protected abstract drawSprite(): void;

  /**
   * Exécute l'effet de l'élément lorsqu'il est déclenché
   */
  protected abstract executeEffect(): void;

  /**
   * Retourne la largeur par défaut
   */
  protected getDefaultWidth(): number {
    return TILE_SIZE;
  }

  /**
   * Retourne la hauteur par défaut
   */
  protected getDefaultHeight(): number {
    return TILE_SIZE;
  }

  /**
   * Configure la physique de l'élément
   */
  protected setupPhysics(): void {
    this.scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.interactiveWidth, this.interactiveHeight);
    body.setOffset(-this.interactiveWidth / 2, -this.interactiveHeight / 2);
    body.setImmovable(true);
  }

  /**
   * Déclenche l'élément interactif
   * @returns true si le déclenchement a réussi
   */
  public trigger(source?: string): boolean {
    if (!this.canTrigger()) {
      return false;
    }

    this.triggered = true;
    this.cooldownTimer = this.scene.time.now;

    // Consommer une charge si limité
    if (this.charges > 0) {
      this.charges--;
    }

    // Émettre l'événement
    this.scene.events.emit('interactive:trigger', {
      elementId: this.id,
      elementType: this.interactiveType,
      source,
      position: { x: this.x, y: this.y },
    });

    // Exécuter l'effet
    this.executeEffect();

    // Vérifier si l'élément doit être détruit
    if (this.charges === 0) {
      this.onDestroy();
    }

    return true;
  }

  /**
   * Vérifie si l'élément peut être déclenché
   */
  public canTrigger(): boolean {
    if (this.destroyed || !this.canInteract) {
      return false;
    }

    // Vérifier le cooldown
    if (this.cooldown > 0) {
      const elapsed = this.scene.time.now - this.cooldownTimer;
      if (elapsed < this.cooldown) {
        return false;
      }
    }

    // Vérifier les charges
    if (this.charges === 0) {
      return false;
    }

    return true;
  }

  /**
   * Inflige des dégâts à l'élément
   * @returns true si l'élément est détruit
   */
  public takeDamage(amount: number, source?: string): boolean {
    if (this.destroyed) {
      return false;
    }

    this.health -= amount;

    // Effet visuel de dégât
    this.flashDamage();

    // Émettre l'événement de dégât
    this.scene.events.emit('interactive:damage', {
      elementId: this.id,
      elementType: this.interactiveType,
      damage: amount,
      source,
      remainingHealth: this.health,
    });

    // Déclencher si le type est ON_DAMAGE
    if (this.triggerType === TriggerType.ON_DAMAGE) {
      this.trigger(source);
    }

    if (this.health <= 0) {
      this.onDestroy();
      return true;
    }

    return false;
  }

  /**
   * Appelé quand le joueur interagit (touche E)
   */
  public onPlayerInteract(): boolean {
    if (this.triggerType === TriggerType.ON_INTERACT) {
      return this.trigger('player');
    }
    return false;
  }

  /**
   * Appelé quand une entité entre en contact
   */
  public onEntityProximity(entityType: 'player' | 'zombie'): boolean {
    if (this.triggerType === TriggerType.ON_PROXIMITY) {
      return this.trigger(entityType);
    }
    return false;
  }

  /**
   * Appelé quand un interrupteur lié est activé
   */
  public onSwitchActivated(switchId: string): boolean {
    if (this.triggerType === TriggerType.ON_SWITCH && this.linkedId === switchId) {
      return this.trigger(`switch:${switchId}`);
    }
    return false;
  }

  /**
   * Effet visuel de dégât
   */
  protected flashDamage(): void {
    // Flash rouge
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.5,
      duration: 50,
      yoyo: true,
      repeat: 1,
    });
  }

  /**
   * Gère la destruction de l'élément
   */
  protected onDestroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // Émettre l'événement de destruction
    this.scene.events.emit('interactive:destroy', {
      elementId: this.id,
      elementType: this.interactiveType,
      position: { x: this.x, y: this.y },
    });

    // Créer des particules de débris
    this.createDebrisParticles();

    // Animation de destruction
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 200,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  /**
   * Crée des particules de débris
   */
  protected createDebrisParticles(): void {
    const debrisCount = 5;
    const color = this.getDebrisColor();

    for (let i = 0; i < debrisCount; i++) {
      const offsetX = (Math.random() - 0.5) * this.interactiveWidth;
      const offsetY = (Math.random() - 0.5) * this.interactiveHeight;
      const size = 4 + Math.random() * 6;

      const debris = this.scene.add.rectangle(
        this.x + offsetX,
        this.y + offsetY,
        size,
        size,
        color
      );
      debris.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: debris,
        x: debris.x + (Math.random() - 0.5) * 50,
        y: debris.y + (Math.random() - 0.5) * 50,
        alpha: 0,
        angle: Math.random() * 360,
        duration: 400 + Math.random() * 200,
        onComplete: () => {
          debris.destroy();
        },
      });
    }
  }

  /**
   * Retourne la couleur des débris
   */
  protected getDebrisColor(): number {
    return 0x888888;
  }

  /**
   * Met à jour l'élément interactif
   */
  public update(): void {
    // Override dans les classes filles si nécessaire
  }

  /**
   * Retourne les données de l'élément
   */
  public getData(): InteractiveData {
    return {
      id: this.id,
      type: this.interactiveType,
      x: this.x,
      y: this.y,
      width: this.interactiveWidth,
      height: this.interactiveHeight,
      health: this.health,
      maxHealth: this.maxHealth,
      isTriggered: this.triggered,
    };
  }

  /**
   * Vérifie si l'élément est interactable par le joueur
   */
  public isInteractable(): boolean {
    return (
      !this.destroyed &&
      this.canInteract &&
      this.triggerType === TriggerType.ON_INTERACT &&
      this.canTrigger()
    );
  }

  /**
   * Retourne si l'élément est détruit
   */
  public isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Retourne les dimensions
   */
  public getDimensions(): { width: number; height: number } {
    return { width: this.interactiveWidth, height: this.interactiveHeight };
  }

  /**
   * Nettoie l'élément
   */
  public destroy(fromScene?: boolean): void {
    this.destroyed = true;
    this.sprite?.destroy();
    super.destroy(fromScene);
  }
}
