import Phaser from 'phaser';
import { Interactive, InteractiveType, TriggerType, type InteractiveConfig } from './Interactive';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Entity } from '@entities/Entity';

/**
 * Configuration spécifique pour un piège à lames
 */
export interface BladeTrapConfig extends InteractiveConfig {
  damagePerHit?: number;
  hitCooldown?: number;
  alwaysActive?: boolean;
  linkedSwitchId?: string;
  rotationSpeed?: number;
}

/**
 * Piège à lames rotatives
 * - Lames rotatives au sol
 * - Activé par interrupteur ou permanent
 * - Dégâts au contact (50 par hit)
 * - Zone de danger visuelle
 */
export class BladeTrap extends Interactive {
  /** Dégâts par hit */
  private damagePerHit: number;
  /** Cooldown entre les hits sur la même entité */
  private hitCooldown: number;
  /** Toujours actif ou contrôlé par switch */
  private alwaysActive: boolean;
  /** ID de l'interrupteur lié */
  private linkedSwitchId: string | null;
  /** Vitesse de rotation */
  private rotationSpeed: number;

  /** État d'activation */
  private isActive: boolean;
  /** Angle actuel des lames */
  private bladeAngle: number = 0;

  /** Suivi des entités touchées (pour le cooldown) */
  private hitEntities: Map<Entity, number> = new Map();

  /** Éléments visuels */
  private bladeGraphics: Phaser.GameObjects.Graphics | null = null;
  private dangerZone: Phaser.GameObjects.Arc | null = null;

  constructor(scene: GameScene, config: BladeTrapConfig) {
    super(scene, InteractiveType.BLADE_TRAP, {
      ...config,
      triggerType: TriggerType.ON_SWITCH,
      charges: -1,
    });

    const balanceConfig = BALANCE.interactive?.bladeTrap ?? {
      health: Infinity,
      damagePerHit: 50,
      hitCooldown: 500,
      rotationSpeed: 5,
    };

    this.damagePerHit = config.damagePerHit ?? balanceConfig.damagePerHit ?? 50;
    this.hitCooldown = config.hitCooldown ?? balanceConfig.hitCooldown ?? 500;
    this.alwaysActive = config.alwaysActive ?? false;
    this.linkedSwitchId = config.linkedSwitchId ?? null;
    this.rotationSpeed = config.rotationSpeed ?? balanceConfig.rotationSpeed ?? 5;

    // État initial
    this.isActive = this.alwaysActive;

    // Dessiner le sprite de base
    this.drawSprite();

    // Créer les visuels
    this.createBladeVisuals();
    this.createDangerZone();

    // Écouter les événements de switch si non permanent
    if (!this.alwaysActive) {
      scene.events.on('switch:activated', this.handleSwitchActivation, this);
    }
  }

  /**
   * Retourne la configuration de balance
   */
  protected getBalanceConfig(): {
    health?: number;
    cooldown?: number;
    charges?: number;
  } {
    return BALANCE.interactive?.bladeTrap ?? {
      health: Infinity,
    };
  }

  /**
   * Dessine la base du piège
   */
  protected drawSprite(): void {
    this.sprite.clear();

    const radius = this.interactiveWidth / 2;

    // Base métallique
    this.sprite.fillStyle(0x444444);
    this.sprite.fillCircle(0, 0, radius);

    // Anneau extérieur
    this.sprite.lineStyle(3, 0x333333);
    this.sprite.strokeCircle(0, 0, radius);

    // Centre mécanique
    this.sprite.fillStyle(0x666666);
    this.sprite.fillCircle(0, 0, 8);

    // Indicateur d'état
    const stateColor = this.isActive ? 0xff0000 : 0x444444;
    this.sprite.fillStyle(stateColor);
    this.sprite.fillCircle(0, 0, 4);

    // Rivets décoratifs
    this.sprite.fillStyle(0x555555);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const rivetX = Math.cos(angle) * (radius - 5);
      const rivetY = Math.sin(angle) * (radius - 5);
      this.sprite.fillCircle(rivetX, rivetY, 2);
    }
  }

  /**
   * Crée les visuels des lames
   */
  private createBladeVisuals(): void {
    this.bladeGraphics = this.scene.add.graphics();
    this.bladeGraphics.setDepth(this.depth + 1);
    this.updateBladeVisuals();
  }

  /**
   * Met à jour les visuels des lames
   */
  private updateBladeVisuals(): void {
    if (!this.bladeGraphics) return;

    this.bladeGraphics.clear();

    if (!this.isActive) {
      // Dessiner les lames statiques (gris)
      this.drawBlades(0x666666, 0.5);
      return;
    }

    // Dessiner les lames actives (métal brillant)
    this.drawBlades(0xaaaaaa, 1);

    // Effet de mouvement (blur)
    if (this.rotationSpeed > 3) {
      this.bladeGraphics.lineStyle(2, 0xcccccc, 0.3);
      for (let i = 0; i < 4; i++) {
        const angle = this.bladeAngle + (Math.PI / 2) * i - 0.1;
        const endX = this.x + Math.cos(angle) * (this.interactiveWidth / 2 - 5);
        const endY = this.y + Math.sin(angle) * (this.interactiveWidth / 2 - 5);
        this.bladeGraphics.lineBetween(this.x, this.y, endX, endY);
      }
    }
  }

  /**
   * Dessine les 4 lames
   */
  private drawBlades(color: number, alpha: number): void {
    if (!this.bladeGraphics) return;

    const bladeLength = this.interactiveWidth / 2 - 5;
    const bladeWidth = 6;

    for (let i = 0; i < 4; i++) {
      const angle = this.bladeAngle + (Math.PI / 2) * i;

      // Calculer les points de la lame
      const tipX = this.x + Math.cos(angle) * bladeLength;
      const tipY = this.y + Math.sin(angle) * bladeLength;

      const perpAngle = angle + Math.PI / 2;
      const halfWidth = bladeWidth / 2;

      const baseLeft = {
        x: this.x + Math.cos(perpAngle) * halfWidth,
        y: this.y + Math.sin(perpAngle) * halfWidth,
      };
      const baseRight = {
        x: this.x - Math.cos(perpAngle) * halfWidth,
        y: this.y - Math.sin(perpAngle) * halfWidth,
      };

      // Dessiner la lame
      this.bladeGraphics.fillStyle(color, alpha);
      this.bladeGraphics.beginPath();
      this.bladeGraphics.moveTo(baseLeft.x, baseLeft.y);
      this.bladeGraphics.lineTo(tipX, tipY);
      this.bladeGraphics.lineTo(baseRight.x, baseRight.y);
      this.bladeGraphics.closePath();
      this.bladeGraphics.fillPath();

      // Bord tranchant
      this.bladeGraphics.lineStyle(1, 0xffffff, alpha * 0.5);
      this.bladeGraphics.lineBetween(baseLeft.x, baseLeft.y, tipX, tipY);
    }
  }

  /**
   * Crée la zone de danger visuelle
   */
  private createDangerZone(): void {
    const radius = this.interactiveWidth / 2 + 5;

    this.dangerZone = this.scene.add.circle(this.x, this.y, radius, 0xff0000, 0);
    this.dangerZone.setStrokeStyle(2, 0xff0000, 0.3);
    this.dangerZone.setDepth(this.depth - 1);

    this.updateDangerZone();
  }

  /**
   * Met à jour la zone de danger
   */
  private updateDangerZone(): void {
    if (!this.dangerZone) return;

    if (this.isActive) {
      // Pulsation quand actif
      const pulse = 0.2 + Math.sin(this.scene.time.now / 200) * 0.1;
      this.dangerZone.setFillStyle(0xff0000, pulse);
      this.dangerZone.setStrokeStyle(2, 0xff0000, 0.5);
    } else {
      this.dangerZone.setFillStyle(0xff0000, 0);
      this.dangerZone.setStrokeStyle(2, 0x666666, 0.2);
    }
  }

  /**
   * Gère l'événement d'activation de switch
   */
  private handleSwitchActivation(event: { switchId: string; isOn: boolean }): void {
    if (this.linkedSwitchId && event.switchId === this.linkedSwitchId) {
      this.setTrapActive(event.isOn);
    }
  }

  /**
   * Active ou désactive le piège
   */
  public setTrapActive(active: boolean): void {
    if (this.isActive === active) return;

    this.isActive = active;
    this.triggered = active;

    if (active) {
      this.createActivationEffect();
    }

    this.drawSprite();
    this.updateBladeVisuals();
  }

  /**
   * Exécute l'effet (bascule l'état)
   */
  protected executeEffect(): void {
    this.setTrapActive(!this.isActive);
  }

  /**
   * Crée l'effet d'activation
   */
  private createActivationEffect(): void {
    // Flash rouge
    const flash = this.scene.add.circle(this.x, this.y, this.interactiveWidth / 2 + 10, 0xff0000, 0.5);
    flash.setDepth(this.depth + 3);

    this.scene.tweens.add({
      targets: flash,
      scale: 1.5,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });

    // Étincelles
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const spark = this.scene.add.rectangle(
        this.x + Math.cos(angle) * 15,
        this.y + Math.sin(angle) * 15,
        3,
        3,
        0xffff00
      );
      spark.setDepth(this.depth + 2);

      this.scene.tweens.add({
        targets: spark,
        x: this.x + Math.cos(angle) * 40,
        y: this.y + Math.sin(angle) * 40,
        alpha: 0,
        duration: 200,
        onComplete: () => spark.destroy(),
      });
    }
  }

  /**
   * Vérifie et applique les dégâts aux entités dans la zone
   */
  public checkDamage(entity: { x: number; y: number; active: boolean; takeDamage: (amount: number, source?: string) => void }): void {
    if (!this.isActive || this.destroyed) return;

    // Vérifier la distance
    const distance = Phaser.Math.Distance.Between(this.x, this.y, entity.x, entity.y);
    const damageRadius = this.interactiveWidth / 2;

    if (distance > damageRadius) return;

    // Vérifier le cooldown pour cette entité
    const now = this.scene.time.now;
    const entityKey = entity as unknown as Entity;
    const lastHit = this.hitEntities.get(entityKey);

    if (lastHit && now - lastHit < this.hitCooldown) return;

    // Appliquer les dégâts
    entity.takeDamage(this.damagePerHit, 'blade_trap');
    this.hitEntities.set(entityKey, now);

    // Effet visuel de hit
    this.createHitEffect(entity);

    // Émettre l'événement
    this.scene.events.emit('interactive:blade_hit', {
      elementId: this.id,
      entityId: (entity as { id?: string }).id,
      damage: this.damagePerHit,
    });
  }

  /**
   * Crée l'effet visuel de hit
   */
  private createHitEffect(entity: { x: number; y: number }): void {
    // Éclaboussure de sang
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;

      const blood = this.scene.add.circle(entity.x, entity.y, 2, 0x880000, 1);
      blood.setDepth(this.depth + 3);

      this.scene.tweens.add({
        targets: blood,
        x: entity.x + Math.cos(angle) * speed,
        y: entity.y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 200,
        onComplete: () => blood.destroy(),
      });
    }

    // Flash blanc à la position de l'entité
    const flash = this.scene.add.circle(entity.x, entity.y, 15, 0xffffff, 0.5);
    flash.setDepth(this.depth + 4);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 100,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Met à jour le piège
   */
  public override update(): void {
    if (!this.isActive) return;

    // Faire tourner les lames
    const deltaTime = this.scene.game.loop.delta / 1000;
    this.bladeAngle += this.rotationSpeed * deltaTime;

    // Garder l'angle dans [0, 2π]
    if (this.bladeAngle > Math.PI * 2) {
      this.bladeAngle -= Math.PI * 2;
    }

    this.updateBladeVisuals();
    this.updateDangerZone();

    // Nettoyer les entités qui ne sont plus trackées
    const now = this.scene.time.now;
    for (const [entity, lastHit] of this.hitEntities) {
      if (!entity.active || now - lastHit > this.hitCooldown * 2) {
        this.hitEntities.delete(entity);
      }
    }
  }

  /**
   * Retourne si le piège est actif
   */
  public isTrapActive(): boolean {
    return this.isActive;
  }

  /**
   * Retourne le rayon de dégâts
   */
  public getDamageRadius(): number {
    return this.interactiveWidth / 2;
  }

  /**
   * Retourne les dimensions par défaut (diamètre)
   */
  protected override getDefaultWidth(): number {
    return 64;
  }

  protected override getDefaultHeight(): number {
    return 64;
  }

  /**
   * Nettoie les ressources
   */
  public override destroy(fromScene?: boolean): void {
    if (!this.alwaysActive) {
      this.scene.events.off('switch:activated', this.handleSwitchActivation, this);
    }

    if (this.bladeGraphics) {
      this.bladeGraphics.destroy();
      this.bladeGraphics = null;
    }

    if (this.dangerZone) {
      this.dangerZone.destroy();
      this.dangerZone = null;
    }

    this.hitEntities.clear();

    super.destroy(fromScene);
  }
}
