import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Entity } from '@entities/Entity';
import { BALANCE } from '@config/balance';

/**
 * Types de zones de terrain
 */
export enum TerrainType {
  PUDDLE = 'puddle',
  BLOOD_POOL = 'blood_pool',
  DEBRIS = 'debris',
  ELECTRIC = 'electric',
  FIRE = 'fire',
  ACID = 'acid',
}

/**
 * Configuration pour créer une zone de terrain
 */
export interface TerrainZoneConfig {
  type: TerrainType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  duration?: number;
  slowFactor?: number;
  damagePerSecond?: number;
  revealInvisibles?: boolean;
  conductElectricity?: boolean;
}

/**
 * Données d'une zone de terrain pour le système de jeu
 */
export interface TerrainZoneData {
  x: number;
  y: number;
  width: number;
  height: number;
  type: TerrainType;
  slowFactor: number;
  damagePerSecond: number;
}

/**
 * Classe de base pour les zones de terrain
 * Ces zones appliquent des effets aux entités qui les traversent
 */
export class TerrainZone extends Phaser.GameObjects.Container {
  declare public scene: GameScene;

  public readonly terrainType: TerrainType;
  public readonly slowFactor: number;
  public readonly damagePerSecond: number;
  public readonly revealInvisibles: boolean;
  public readonly conductElectricity: boolean;
  public readonly isPermanent: boolean;

  protected zoneWidth: number;
  protected zoneHeight: number;
  protected radius: number;
  protected duration: number;
  protected createdAt: number;
  protected graphics: Phaser.GameObjects.Graphics;
  protected isDestroyed: boolean = false;

  /** Entités actuellement dans la zone */
  protected entitiesInZone: Set<Entity> = new Set();
  /** Dernier tick de dégâts par entité */
  protected lastDamageTick: Map<Entity, number> = new Map();
  /** Intervalle entre les ticks de dégâts (ms) */
  protected damageTickRate: number = 500;

  constructor(scene: GameScene, config: TerrainZoneConfig) {
    super(scene, config.x, config.y);

    this.terrainType = config.type;
    this.createdAt = scene.time.now;

    // Récupérer la config depuis balance.ts si elle existe
    const balanceConfig = BALANCE.terrainZones?.[config.type];

    // Dimensions (radius prioritaire sur width/height)
    this.radius = config.radius ?? this.getDefaultRadius();
    this.zoneWidth = config.width ?? this.radius * 2;
    this.zoneHeight = config.height ?? this.radius * 2;

    // Propriétés d'effet
    this.slowFactor = config.slowFactor ?? balanceConfig?.slowFactor ?? 1;
    this.damagePerSecond = config.damagePerSecond ?? balanceConfig?.damagePerSecond ?? 0;
    this.revealInvisibles = config.revealInvisibles ?? balanceConfig?.revealInvisibles ?? false;
    this.conductElectricity = config.conductElectricity ?? balanceConfig?.conductElectricity ?? false;

    // Durée (0 = permanent)
    this.duration = config.duration ?? balanceConfig?.duration ?? 0;
    this.isPermanent = this.duration === 0;

    // Créer les graphiques visuels
    this.graphics = scene.add.graphics();
    this.add(this.graphics);
    // Note: drawZone() est appelé par les sous-classes après initialisation de leurs données

    // Ajouter au monde
    scene.add.existing(this);

    // Configurer la physique (zone de trigger, pas de blocage)
    this.setupPhysics();

    // Profondeur (sous les entités)
    this.setDepth(0);

    // Auto-destruction si non permanent
    if (!this.isPermanent) {
      scene.time.delayedCall(this.duration, () => {
        this.destroyZone();
      });
    }
  }

  /**
   * Retourne le rayon par défaut selon le type
   */
  protected getDefaultRadius(): number {
    switch (this.terrainType) {
      case TerrainType.PUDDLE:
        return 40;
      case TerrainType.BLOOD_POOL:
        return 35;
      case TerrainType.DEBRIS:
        return 50;
      case TerrainType.ELECTRIC:
        return 45;
      case TerrainType.FIRE:
        return 30;
      case TerrainType.ACID:
        return 32;
      default:
        return 40;
    }
  }

  /**
   * Configure la physique de la zone
   */
  protected setupPhysics(): void {
    this.scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Zone circulaire par défaut
    body.setCircle(this.radius);
    body.setOffset(-this.radius, -this.radius);

    // Zone de trigger (pas de collision physique)
    body.setImmovable(true);
  }

  /**
   * Dessine la zone (à override dans les sous-classes)
   */
  protected drawZone(): void {
    this.graphics.clear();

    const color = this.getZoneColor();
    const alpha = this.getZoneAlpha();

    // Cercle de base
    this.graphics.fillStyle(color, alpha);
    this.graphics.fillCircle(0, 0, this.radius);

    // Contour
    this.graphics.lineStyle(2, color, alpha + 0.2);
    this.graphics.strokeCircle(0, 0, this.radius);
  }

  /**
   * Retourne la couleur de la zone selon le type
   */
  protected getZoneColor(): number {
    switch (this.terrainType) {
      case TerrainType.PUDDLE:
        return 0x4488cc; // Bleu eau
      case TerrainType.BLOOD_POOL:
        return 0x8b0000; // Rouge sang
      case TerrainType.DEBRIS:
        return 0x666666; // Gris
      case TerrainType.ELECTRIC:
        return 0x00ffff; // Cyan électrique
      case TerrainType.FIRE:
        return 0xff6600; // Orange feu
      case TerrainType.ACID:
        return 0x00ff00; // Vert acide
      default:
        return 0x888888;
    }
  }

  /**
   * Retourne l'opacité de la zone
   */
  protected getZoneAlpha(): number {
    // Fade out vers la fin pour les zones non permanentes
    if (!this.isPermanent) {
      const elapsed = this.scene.time.now - this.createdAt;
      const remaining = this.duration - elapsed;
      if (remaining < 500) {
        return Math.max(0.1, (remaining / 500) * 0.4);
      }
    }
    return 0.4;
  }

  /**
   * Met à jour la zone à chaque frame
   */
  public update(): void {
    if (!this.active || this.isDestroyed) return;

    // Mise à jour visuelle
    this.updateVisuals();

    // Appliquer les effets aux entités dans la zone
    this.applyEffects();
  }

  /**
   * Met à jour les effets visuels
   */
  protected updateVisuals(): void {
    this.drawZone();
  }

  /**
   * Applique les effets aux entités dans la zone
   */
  protected applyEffects(): void {
    const now = this.scene.time.now;

    for (const entity of this.entitiesInZone) {
      if (!entity.active) {
        this.entitiesInZone.delete(entity);
        this.lastDamageTick.delete(entity);
        continue;
      }

      // Vérifier si l'entité est toujours dans la zone
      if (!this.isEntityInZone(entity)) {
        this.onEntityExit(entity);
        continue;
      }

      // Appliquer les dégâts périodiques
      if (this.damagePerSecond > 0) {
        const lastTick = this.lastDamageTick.get(entity) ?? 0;
        if (now - lastTick >= this.damageTickRate) {
          this.applyDamage(entity);
          this.lastDamageTick.set(entity, now);
        }
      }

      // Révéler les invisibles
      if (this.revealInvisibles) {
        this.tryRevealInvisible(entity);
      }
    }
  }

  /**
   * Vérifie si une entité est dans la zone
   */
  protected isEntityInZone(entity: Entity): boolean {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, entity.x, entity.y);
    return distance <= this.radius + 10; // Petite marge
  }

  /**
   * Appelé quand une entité entre dans la zone
   */
  public onEntityEnter(entity: Entity): void {
    if (this.isDestroyed) return;

    this.entitiesInZone.add(entity);

    // Appliquer le ralentissement immédiatement
    if (this.slowFactor < 1) {
      this.applySlowEffect(entity);
    }

    // Effet visuel d'entrée
    this.createEnterEffect(entity);

    // Émettre l'événement
    this.scene.events.emit('terrain:enter', {
      zone: this,
      type: this.terrainType,
      entity,
    });
  }

  /**
   * Appelé quand une entité quitte la zone
   */
  public onEntityExit(entity: Entity): void {
    this.entitiesInZone.delete(entity);
    this.lastDamageTick.delete(entity);

    // Émettre l'événement
    this.scene.events.emit('terrain:exit', {
      zone: this,
      type: this.terrainType,
      entity,
    });
  }

  /**
   * Applique l'effet de ralentissement à une entité
   */
  protected applySlowEffect(entity: Entity): void {
    // Utilise le MovementComponent si disponible
    const movement = (entity as { movement?: { applySlow: (factor: number, duration: number) => void } }).movement;
    if (movement?.applySlow) {
      // Durée courte car on réapplique à chaque frame tant que dans la zone
      movement.applySlow(this.slowFactor, 200);
    }
  }

  /**
   * Applique les dégâts à une entité
   */
  protected applyDamage(entity: Entity): void {
    const damage = (this.damagePerSecond * this.damageTickRate) / 1000;

    // Vérifier si l'entité a une méthode takeDamage
    const damageable = entity as { takeDamage?: (amount: number) => void };
    if (damageable.takeDamage) {
      damageable.takeDamage(damage);
    }

    // Effet visuel de dégât
    this.createDamageEffect(entity);
  }

  /**
   * Essaie de révéler un zombie invisible
   */
  protected tryRevealInvisible(entity: Entity): void {
    const zombie = entity as { zombieType?: string; setData: (key: string, value: boolean) => void; setAlpha: (alpha: number) => void };
    if (zombie.zombieType === 'invisible') {
      zombie.setData('revealed', true);
      zombie.setAlpha(1);
    }
  }

  /**
   * Crée un effet visuel quand une entité entre dans la zone
   */
  protected createEnterEffect(entity: Entity): void {
    // Splash/éclaboussure pour les flaques
    if (this.terrainType === TerrainType.PUDDLE || this.terrainType === TerrainType.BLOOD_POOL) {
      this.createSplashEffect(entity.x, entity.y);
    }
  }

  /**
   * Crée un effet d'éclaboussure
   */
  protected createSplashEffect(x: number, y: number): void {
    const color = this.getZoneColor();

    for (let i = 0; i < 3; i++) {
      const droplet = this.scene.add.circle(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 20,
        3 + Math.random() * 3,
        color,
        0.7
      );
      droplet.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: droplet,
        y: droplet.y - 10 - Math.random() * 10,
        alpha: 0,
        scale: 0.5,
        duration: 200 + Math.random() * 100,
        onComplete: () => droplet.destroy(),
      });
    }
  }

  /**
   * Crée un effet visuel de dégât
   */
  protected createDamageEffect(_entity: Entity): void {
    // À override dans les sous-classes pour des effets spécifiques
  }

  /**
   * Retourne les données de la zone
   */
  public getZoneData(): TerrainZoneData {
    return {
      x: this.x,
      y: this.y,
      width: this.zoneWidth,
      height: this.zoneHeight,
      type: this.terrainType,
      slowFactor: this.slowFactor,
      damagePerSecond: this.damagePerSecond,
    };
  }

  /**
   * Retourne les entités dans la zone
   */
  public getEntitiesInZone(): Entity[] {
    return Array.from(this.entitiesInZone);
  }

  /**
   * Vérifie si la zone est active
   */
  public isActive(): boolean {
    return !this.isDestroyed && this.active;
  }

  /**
   * Retourne le rayon de la zone
   */
  public getRadius(): number {
    return this.radius;
  }

  /**
   * Détruit la zone proprement
   */
  public destroyZone(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Émettre l'événement de destruction
    this.scene.events.emit('terrain:destroy', {
      zone: this,
      type: this.terrainType,
      x: this.x,
      y: this.y,
    });

    // Animation de disparition
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.5,
      duration: 200,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  /**
   * Nettoie les ressources
   */
  public destroy(fromScene?: boolean): void {
    this.isDestroyed = true;
    this.entitiesInZone.clear();
    this.lastDamageTick.clear();
    this.graphics?.destroy();
    super.destroy(fromScene);
  }
}
