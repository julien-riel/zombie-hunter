import Phaser from 'phaser';
import { Interactive, InteractiveType, TriggerType, type InteractiveConfig } from './Interactive';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';

/**
 * Configuration spécifique pour un générateur
 */
export interface GeneratorConfig extends InteractiveConfig {
  defaultActive?: boolean;
  linkedZoneIds?: string[];
  canBeRepaired?: boolean;
}

/**
 * Générateur électrique
 * - Peut être saboté (tiré dessus = destruction)
 * - Contrôle des zones électrifiées
 * - Peut être réparé par interaction (si configuré)
 * - Effet visuel d'activité (lumières, étincelles)
 */
export class Generator extends Interactive {
  /** État d'activité */
  private isActive: boolean;
  /** IDs des zones liées */
  public readonly linkedZoneIds: string[];
  /** Peut être réparé */
  private canBeRepaired: boolean;
  /** Est en panne */
  private isBroken: boolean = false;

  /** Éléments visuels */
  private lightIndicator: Phaser.GameObjects.Arc | null = null;
  private sparkTimer: number = 0;
  private humTimer: number = 0;

  constructor(scene: GameScene, config: GeneratorConfig) {
    super(scene, InteractiveType.GENERATOR, {
      ...config,
      triggerType: TriggerType.ON_INTERACT,
    });

    this.isActive = config.defaultActive ?? true;
    this.linkedZoneIds = config.linkedZoneIds ?? [];
    this.canBeRepaired = config.canBeRepaired ?? true;

    // Dessiner le sprite après initialisation
    this.drawSprite();

    // Émettre l'état initial aux zones liées
    this.notifyLinkedZones();
  }

  /**
   * Retourne la configuration de balance
   */
  protected getBalanceConfig(): {
    health?: number;
    cooldown?: number;
    charges?: number;
  } {
    return BALANCE.interactive?.generator ?? {
      health: 100,
      cooldown: 1000,
    };
  }

  /**
   * Dessine le générateur
   */
  protected drawSprite(): void {
    this.sprite.clear();

    const w = this.interactiveWidth;
    const h = this.interactiveHeight;
    const halfW = w / 2;
    const halfH = h / 2;

    // Couleur de base selon l'état
    const baseColor = this.isBroken ? 0x444444 : 0x2a4a5a;
    const accentColor = this.isBroken ? 0x333333 : 0x3a6a7a;

    // Corps principal du générateur
    this.sprite.fillStyle(baseColor);
    this.sprite.fillRect(-halfW, -halfH, w, h);

    // Panneau de contrôle
    this.sprite.fillStyle(0x222222);
    this.sprite.fillRect(-halfW + 4, -halfH + 4, w - 8, 20);

    // Grille d'aération
    this.sprite.fillStyle(0x111111);
    for (let i = 0; i < 4; i++) {
      this.sprite.fillRect(-halfW + 6 + i * 8, halfH - 16, 4, 12);
    }

    // Bobines latérales
    this.sprite.fillStyle(accentColor);
    this.sprite.fillRect(-halfW - 4, -halfH + 10, 6, h - 20);
    this.sprite.fillRect(halfW - 2, -halfH + 10, 6, h - 20);

    // Câbles de cuivre sur les bobines
    this.sprite.lineStyle(1, 0xcc8844);
    for (let i = 0; i < 5; i++) {
      const y = -halfH + 14 + i * 8;
      this.sprite.strokeRect(-halfW - 3, y, 4, 4);
      this.sprite.strokeRect(halfW - 1, y, 4, 4);
    }

    // Contour
    this.sprite.lineStyle(2, 0x1a3a4a);
    this.sprite.strokeRect(-halfW, -halfH, w, h);

    // Symbole d'éclair si actif
    if (this.isActive && !this.isBroken) {
      this.sprite.fillStyle(0xffcc00);
      this.drawLightningBolt(-halfW + 8, -halfH + 8, 10);
    }

    // Symbole de panne si cassé
    if (this.isBroken) {
      this.sprite.lineStyle(2, 0xff0000);
      this.sprite.strokeCircle(0, 0, 10);
      this.sprite.lineBetween(-7, -7, 7, 7);
    }

    // Indicateur LED
    this.updateLightIndicator();
  }

  /**
   * Dessine un petit éclair
   */
  private drawLightningBolt(x: number, y: number, size: number): void {
    this.sprite.beginPath();
    this.sprite.moveTo(x + size * 0.5, y);
    this.sprite.lineTo(x + size * 0.2, y + size * 0.4);
    this.sprite.lineTo(x + size * 0.5, y + size * 0.4);
    this.sprite.lineTo(x + size * 0.2, y + size);
    this.sprite.lineTo(x + size * 0.6, y + size * 0.5);
    this.sprite.lineTo(x + size * 0.35, y + size * 0.5);
    this.sprite.closePath();
    this.sprite.fillPath();
  }

  /**
   * Met à jour l'indicateur lumineux
   */
  private updateLightIndicator(): void {
    if (this.lightIndicator) {
      this.lightIndicator.destroy();
    }

    let color: number;
    let alpha: number;

    if (this.isBroken) {
      color = 0xff0000;
      alpha = 0.5;
    } else if (this.isActive) {
      color = 0x00ff00;
      alpha = 1;
    } else {
      color = 0xffaa00;
      alpha = 0.7;
    }

    this.lightIndicator = this.scene.add.circle(
      0,
      -this.interactiveHeight / 2 + 10,
      4,
      color,
      alpha
    );
    this.add(this.lightIndicator);
  }

  /**
   * Exécute l'effet d'interaction
   */
  protected executeEffect(): void {
    if (this.isBroken && this.canBeRepaired) {
      // Réparer le générateur
      this.repair();
    } else if (!this.isBroken) {
      // Basculer l'état
      this.toggle();
    }
  }

  /**
   * Bascule l'état du générateur
   */
  public toggle(): void {
    if (this.isBroken) return;

    this.isActive = !this.isActive;
    this.createToggleEffect();
    this.drawSprite();
    this.notifyLinkedZones();
  }

  /**
   * Active le générateur
   */
  public activate(): void {
    if (this.isBroken || this.isActive) return;

    this.isActive = true;
    this.createToggleEffect();
    this.drawSprite();
    this.notifyLinkedZones();
  }

  /**
   * Désactive le générateur
   */
  public deactivate(): void {
    if (this.isBroken || !this.isActive) return;

    this.isActive = false;
    this.createToggleEffect();
    this.drawSprite();
    this.notifyLinkedZones();
  }

  /**
   * Répare le générateur
   */
  public repair(): void {
    if (!this.isBroken) return;

    this.isBroken = false;
    this.health = this.maxHealth;
    this.isActive = true;

    this.createRepairEffect();
    this.drawSprite();
    this.notifyLinkedZones();

    this.scene.events.emit('generator:repaired', {
      generatorId: this.id,
    });
  }

  /**
   * Casse le générateur (appelé quand les HP tombent à 0)
   */
  protected override onDestroy(): void {
    // Le générateur ne se détruit pas, il tombe en panne
    this.isBroken = true;
    this.isActive = false;
    this.health = 0;

    this.createBreakdownEffect();
    this.drawSprite();
    this.notifyLinkedZones();

    this.scene.events.emit('generator:breakdown', {
      generatorId: this.id,
    });
  }

  /**
   * Crée l'effet visuel de basculement
   */
  private createToggleEffect(): void {
    const color = this.isActive ? 0x00ff00 : 0xff6600;

    // Flash
    const flash = this.scene.add.circle(this.x, this.y, 30, color, 0.5);
    flash.setDepth(this.depth + 2);

    this.scene.tweens.add({
      targets: flash,
      scale: 1.5,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });

    // Étincelles
    if (this.isActive) {
      this.createSparks(5);
    }
  }

  /**
   * Crée l'effet visuel de réparation
   */
  private createRepairEffect(): void {
    // Série d'étincelles vertes
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 50, () => {
        const angle = (Math.PI * 2 * i) / 8;
        const spark = this.scene.add.rectangle(
          this.x + Math.cos(angle) * 20,
          this.y + Math.sin(angle) * 20,
          4,
          4,
          0x00ff00
        );
        spark.setDepth(this.depth + 2);

        this.scene.tweens.add({
          targets: spark,
          x: this.x,
          y: this.y,
          alpha: 0,
          duration: 200,
          onComplete: () => spark.destroy(),
        });
      });
    }

    // Flash vert
    const flash = this.scene.add.circle(this.x, this.y, 40, 0x00ff00, 0.6);
    flash.setDepth(this.depth + 1);

    this.scene.tweens.add({
      targets: flash,
      scale: 0.5,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Crée l'effet visuel de panne
   */
  private createBreakdownEffect(): void {
    // Explosion d'étincelles
    this.createSparks(15);

    // Fumée
    for (let i = 0; i < 5; i++) {
      const smoke = this.scene.add.circle(
        this.x + (Math.random() - 0.5) * 30,
        this.y,
        8 + Math.random() * 8,
        0x333333,
        0.6
      );
      smoke.setDepth(this.depth + 2);

      this.scene.tweens.add({
        targets: smoke,
        y: smoke.y - 50,
        scale: 2,
        alpha: 0,
        duration: 600,
        delay: i * 100,
        onComplete: () => smoke.destroy(),
      });
    }

    // Screen shake léger
    this.scene.cameras.main.shake(100, 0.003);
  }

  /**
   * Crée des étincelles
   */
  private createSparks(count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      const color = Math.random() > 0.5 ? 0xffff00 : 0x00ffff;

      const spark = this.scene.add.rectangle(this.x, this.y, 3, 3, color);
      spark.setDepth(this.depth + 3);

      this.scene.tweens.add({
        targets: spark,
        x: this.x + Math.cos(angle) * speed,
        y: this.y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 150 + Math.random() * 100,
        onComplete: () => spark.destroy(),
      });
    }
  }

  /**
   * Notifie les zones liées du changement d'état
   */
  private notifyLinkedZones(): void {
    this.scene.events.emit('generator:toggle', {
      generatorId: this.id,
      active: this.isActive && !this.isBroken,
    });

    // Notification spécifique pour chaque zone
    for (const zoneId of this.linkedZoneIds) {
      this.scene.events.emit('zone:power_change', {
        zoneId,
        generatorId: this.id,
        powered: this.isActive && !this.isBroken,
      });
    }
  }

  /**
   * Met à jour le générateur
   */
  public override update(): void {
    if (!this.isActive || this.isBroken) return;

    const now = this.scene.time.now;

    // Étincelles occasionnelles quand actif
    if (now - this.sparkTimer > 2000 + Math.random() * 3000) {
      this.createSparks(2);
      this.sparkTimer = now;
    }

    // Effet de pulsation de la lumière
    if (this.lightIndicator && now - this.humTimer > 100) {
      const pulse = 0.8 + Math.sin(now / 200) * 0.2;
      this.lightIndicator.setAlpha(pulse);
      this.humTimer = now;
    }
  }

  /**
   * Retourne l'état actif
   */
  public isGeneratorActive(): boolean {
    return this.isActive && !this.isBroken;
  }

  /**
   * Retourne si le générateur est en panne
   */
  public isGeneratorBroken(): boolean {
    return this.isBroken;
  }

  /**
   * Vérifie si le générateur est interactable
   */
  public override isInteractable(): boolean {
    // Peut interagir pour toggle ou réparer
    return !this.destroyed && (this.canBeRepaired || !this.isBroken);
  }

  /**
   * Retourne les dimensions par défaut
   */
  protected override getDefaultWidth(): number {
    return 48;
  }

  protected override getDefaultHeight(): number {
    return 56;
  }

  /**
   * Nettoie les ressources
   */
  public override destroy(fromScene?: boolean): void {
    if (this.lightIndicator) {
      this.lightIndicator.destroy();
      this.lightIndicator = null;
    }
    super.destroy(fromScene);
  }
}
