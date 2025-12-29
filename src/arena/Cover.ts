import Phaser from 'phaser';
import { TILE_SIZE } from '@config/constants';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';

/**
 * Types de couverture disponibles
 */
export enum CoverType {
  PILLAR = 'pillar',
  HALF_WALL = 'halfWall',
  TABLE = 'table',
  CRATE = 'crate',
  SHELF = 'shelf',
  BARRICADE = 'barricade',
}

/**
 * Configuration pour créer une couverture
 */
export interface CoverConfig {
  type: CoverType;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

/**
 * Données d'une couverture pour le pathfinding
 */
export interface CoverData {
  x: number;
  y: number;
  width: number;
  height: number;
  type: CoverType;
  destructible: boolean;
}

/**
 * Classe de base pour les couvertures
 * Les couvertures sont des obstacles tactiques qui bloquent les projectiles
 * et peuvent être destructibles ou indestructibles
 */
export class Cover extends Phaser.GameObjects.Container {
  declare public scene: GameScene;

  public readonly coverType: CoverType;
  public readonly destructible: boolean;
  public readonly blocksLineOfSight: boolean;
  public readonly providesPartialCover: boolean;
  public readonly lootChance: number;

  protected health: number;
  protected maxHealth: number;
  protected coverWidth: number;
  protected coverHeight: number;
  protected sprite: Phaser.GameObjects.Rectangle;
  protected destroyed: boolean = false;

  constructor(scene: GameScene, config: CoverConfig) {
    super(scene, config.x, config.y);

    this.coverType = config.type;

    // Récupérer la config depuis balance.ts
    const balanceConfig = BALANCE.covers[config.type];
    this.maxHealth = balanceConfig.health;
    this.health = this.maxHealth;
    this.destructible = this.maxHealth !== Infinity;
    this.blocksLineOfSight = balanceConfig.blocksLineOfSight;
    this.providesPartialCover = balanceConfig.providesPartialCover;
    this.lootChance = (balanceConfig as { lootChance?: number }).lootChance ?? 0;

    // Dimensions par défaut selon le type
    this.coverWidth = config.width ?? this.getDefaultWidth();
    this.coverHeight = config.height ?? this.getDefaultHeight();

    // Créer le sprite
    this.sprite = this.createSprite();
    this.add(this.sprite);

    // Ajouter au monde
    scene.add.existing(this);

    // Configurer la physique
    this.setupPhysics();

    // Profondeur (au-dessus du sol, sous le joueur)
    this.setDepth(1);
  }

  /**
   * Retourne la largeur par défaut selon le type
   */
  protected getDefaultWidth(): number {
    switch (this.coverType) {
      case CoverType.PILLAR:
        return TILE_SIZE * 2;
      case CoverType.HALF_WALL:
        return TILE_SIZE * 3;
      case CoverType.TABLE:
        return TILE_SIZE * 2;
      case CoverType.CRATE:
        return TILE_SIZE;
      case CoverType.SHELF:
        return TILE_SIZE * 2;
      case CoverType.BARRICADE:
        return TILE_SIZE * 2;
      default:
        return TILE_SIZE;
    }
  }

  /**
   * Retourne la hauteur par défaut selon le type
   */
  protected getDefaultHeight(): number {
    switch (this.coverType) {
      case CoverType.PILLAR:
        return TILE_SIZE * 2;
      case CoverType.HALF_WALL:
        return TILE_SIZE;
      case CoverType.TABLE:
        return TILE_SIZE;
      case CoverType.CRATE:
        return TILE_SIZE;
      case CoverType.SHELF:
        return TILE_SIZE * 2;
      case CoverType.BARRICADE:
        return TILE_SIZE * 2;
      default:
        return TILE_SIZE;
    }
  }

  /**
   * Crée le sprite visuel de la couverture
   */
  protected createSprite(): Phaser.GameObjects.Rectangle {
    const color = this.getColor();
    const rect = this.scene.add.rectangle(0, 0, this.coverWidth, this.coverHeight, color);
    rect.setStrokeStyle(2, this.getStrokeColor());
    return rect;
  }

  /**
   * Retourne la couleur selon le type
   */
  protected getColor(): number {
    switch (this.coverType) {
      case CoverType.PILLAR:
        return 0x5d6d7e; // Gris pierre
      case CoverType.HALF_WALL:
        return 0x7f8c8d; // Gris clair
      case CoverType.TABLE:
        return 0x8b4513; // Marron bois
      case CoverType.CRATE:
        return 0xd4a574; // Marron clair
      case CoverType.SHELF:
        return 0x6b4423; // Marron foncé
      case CoverType.BARRICADE:
        return 0x4a3728; // Marron sombre
      default:
        return 0x888888;
    }
  }

  /**
   * Retourne la couleur du contour
   */
  protected getStrokeColor(): number {
    switch (this.coverType) {
      case CoverType.PILLAR:
        return 0x34495e;
      case CoverType.HALF_WALL:
        return 0x5d6d7e;
      case CoverType.TABLE:
        return 0x5d3a1a;
      case CoverType.CRATE:
        return 0xa67c52;
      case CoverType.SHELF:
        return 0x4a3020;
      case CoverType.BARRICADE:
        return 0x2c1810;
      default:
        return 0x666666;
    }
  }

  /**
   * Configure la physique de la couverture
   */
  protected setupPhysics(): void {
    this.scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.coverWidth, this.coverHeight);
    body.setOffset(-this.coverWidth / 2, -this.coverHeight / 2);
    body.setImmovable(true);

    // Catégorie de collision
    body.setCollideWorldBounds(false);
  }

  /**
   * Inflige des dégâts à la couverture
   * @returns true si la couverture est détruite
   */
  public takeDamage(amount: number, source?: string): boolean {
    if (!this.destructible || this.destroyed) {
      return false;
    }

    this.health -= amount;

    // Effet visuel de dégât
    this.flashDamage();

    // Émettre l'événement de dégât
    this.scene.events.emit('cover:damage', {
      cover: this,
      type: this.coverType,
      damage: amount,
      source,
      remainingHealth: this.health,
    });

    if (this.health <= 0) {
      this.onDestroy();
      return true;
    }

    return false;
  }

  /**
   * Effet visuel de dégât
   */
  protected flashDamage(): void {
    const originalTint = this.sprite.fillColor;
    this.sprite.setFillStyle(0xff0000);

    this.scene.time.delayedCall(100, () => {
      if (!this.destroyed) {
        this.sprite.setFillStyle(originalTint);
      }
    });
  }

  /**
   * Gère la destruction de la couverture
   */
  protected onDestroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // Émettre l'événement de destruction
    this.scene.events.emit('cover:destroy', {
      cover: this,
      type: this.coverType,
      x: this.x,
      y: this.y,
      width: this.coverWidth,
      height: this.coverHeight,
    });

    // Créer des particules de débris
    this.createDebrisParticles();

    // Vérifier si on doit drop du loot
    if (this.lootChance > 0 && Math.random() < this.lootChance) {
      this.dropLoot();
    }

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
    const color = this.getColor();

    for (let i = 0; i < debrisCount; i++) {
      const offsetX = (Math.random() - 0.5) * this.coverWidth;
      const offsetY = (Math.random() - 0.5) * this.coverHeight;
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
   * Drop du loot à la destruction
   */
  protected dropLoot(): void {
    // TODO: Implémenter le système de loot (Phase 6)
    // Pour l'instant, émettre un événement
    this.scene.events.emit('cover:loot', {
      x: this.x,
      y: this.y,
      coverType: this.coverType,
    });
  }

  /**
   * Retourne les données pour le pathfinding
   */
  public getCoverData(): CoverData {
    return {
      x: this.x,
      y: this.y,
      width: this.coverWidth,
      height: this.coverHeight,
      type: this.coverType,
      destructible: this.destructible,
    };
  }

  /**
   * Retourne la santé actuelle
   */
  public getHealth(): number {
    return this.health;
  }

  /**
   * Retourne la santé maximum
   */
  public getMaxHealth(): number {
    return this.maxHealth;
  }

  /**
   * Vérifie si la couverture est détruite
   */
  public isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Retourne les dimensions
   */
  public getDimensions(): { width: number; height: number } {
    return { width: this.coverWidth, height: this.coverHeight };
  }

  /**
   * Nettoie la couverture
   */
  public destroy(fromScene?: boolean): void {
    this.destroyed = true;
    super.destroy(fromScene);
  }
}
