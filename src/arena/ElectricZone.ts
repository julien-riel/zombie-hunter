import Phaser from 'phaser';
import { TerrainZone, TerrainType, type TerrainZoneConfig } from './TerrainZone';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Entity } from '@entities/Entity';

/**
 * Configuration spécifique pour une zone électrique
 */
export interface ElectricZoneConfig {
  x: number;
  y: number;
  radius?: number;
  active?: boolean;
  linkedGeneratorId?: string;
}

/**
 * Zone électrifiée
 * - Inflige des dégâts périodiques
 * - Peut être activée/désactivée par un générateur
 * - Révèle les zombies invisibles
 * - Bonus de dégâts si la cible est dans une flaque
 */
export class ElectricZone extends TerrainZone {
  /** État d'activation */
  private isOn: boolean;
  /** ID du générateur lié */
  public readonly linkedGeneratorId: string | null;

  /** Timer pour les arcs électriques */
  private arcTimer: number = 0;
  private arcInterval: number = 150;

  /** Arcs visuels actuels */
  private arcs: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: GameScene, config: ElectricZoneConfig) {
    const balanceConfig = BALANCE.terrainZones.electric;

    const terrainConfig: TerrainZoneConfig = {
      type: TerrainType.ELECTRIC,
      x: config.x,
      y: config.y,
      radius: config.radius ?? balanceConfig.radius,
      slowFactor: balanceConfig.slowFactor,
      damagePerSecond: balanceConfig.damagePerSecond,
      revealInvisibles: balanceConfig.revealInvisibles,
      duration: balanceConfig.duration,
    };

    super(scene, terrainConfig);

    this.isOn = config.active ?? true;
    this.linkedGeneratorId = config.linkedGeneratorId ?? null;

    // Écouter les événements d'activation
    if (this.linkedGeneratorId) {
      scene.events.on('generator:toggle', this.onGeneratorToggle, this);
    }

    this.drawZone();
  }

  /**
   * Gère l'événement de bascule du générateur
   */
  private onGeneratorToggle(event: { generatorId: string; active: boolean }): void {
    if (event.generatorId === this.linkedGeneratorId) {
      this.setElectricActive(event.active);
    }
  }

  /**
   * Active ou désactive la zone électrique
   */
  public setElectricActive(active: boolean): void {
    this.isOn = active;

    if (!active) {
      // Nettoyer les arcs visuels
      this.clearArcs();
    }

    // Émettre l'événement
    this.scene.events.emit('electric:toggle', {
      zone: this,
      active: this.isOn,
    });
  }

  /**
   * Retourne si la zone est active
   */
  public isActiveZone(): boolean {
    return this.isOn && !this.isDestroyed;
  }

  /**
   * Dessine la zone électrique
   */
  protected override drawZone(): void {
    this.graphics.clear();

    if (!this.isOn) {
      // Zone inactive - gris
      this.graphics.fillStyle(0x333333, 0.3);
      this.graphics.fillCircle(0, 0, this.radius);
      this.graphics.lineStyle(2, 0x444444, 0.4);
      this.graphics.strokeCircle(0, 0, this.radius);
      return;
    }

    const alpha = this.getZoneAlpha();
    const flicker = 0.8 + Math.random() * 0.2;

    // Base de la zone avec effet de pulsation
    const pulse = 0.3 + Math.sin(this.scene.time.now / 100) * 0.1;
    this.graphics.fillStyle(0x00ffff, alpha * pulse * flicker);
    this.graphics.fillCircle(0, 0, this.radius);

    // Cercles concentriques électriques
    for (let i = 1; i <= 3; i++) {
      const ringRadius = (this.radius * i) / 3;
      const ringAlpha = (alpha * (4 - i)) / 4;
      this.graphics.lineStyle(1, 0x00ffff, ringAlpha * flicker);
      this.graphics.strokeCircle(0, 0, ringRadius);
    }

    // Contour principal
    this.graphics.lineStyle(2, 0x00ffff, alpha * flicker);
    this.graphics.strokeCircle(0, 0, this.radius);
  }

  /**
   * Met à jour les effets visuels
   */
  protected override updateVisuals(): void {
    super.updateVisuals();

    if (!this.isOn) return;

    // Générer des arcs électriques périodiques
    const now = this.scene.time.now;
    if (now - this.arcTimer >= this.arcInterval) {
      this.createRandomArc();
      this.arcTimer = now;
      this.arcInterval = 100 + Math.random() * 100;
    }

    // Nettoyer les vieux arcs
    this.cleanupArcs();
  }

  /**
   * Crée un arc électrique aléatoire dans la zone
   */
  private createRandomArc(): void {
    const arcGraphics = this.scene.add.graphics();
    arcGraphics.setDepth(this.depth + 1);

    // Point de départ et d'arrivée aléatoires
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = angle1 + Math.PI * (0.5 + Math.random() * 1);
    const dist1 = this.radius * (0.3 + Math.random() * 0.5);
    const dist2 = this.radius * (0.3 + Math.random() * 0.5);

    const x1 = this.x + Math.cos(angle1) * dist1;
    const y1 = this.y + Math.sin(angle1) * dist1;
    const x2 = this.x + Math.cos(angle2) * dist2;
    const y2 = this.y + Math.sin(angle2) * dist2;

    // Dessiner l'arc en zigzag
    arcGraphics.lineStyle(2, 0x00ffff, 0.8);
    arcGraphics.beginPath();
    arcGraphics.moveTo(x1, y1);

    const segments = 5;
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;

    for (let i = 1; i < segments; i++) {
      const jitterX = (Math.random() - 0.5) * 15;
      const jitterY = (Math.random() - 0.5) * 15;
      arcGraphics.lineTo(x1 + dx * i + jitterX, y1 + dy * i + jitterY);
    }

    arcGraphics.lineTo(x2, y2);
    arcGraphics.strokePath();

    // Stocker avec timestamp
    (arcGraphics as unknown as { createdAt: number }).createdAt = this.scene.time.now;
    this.arcs.push(arcGraphics);
  }

  /**
   * Nettoie les arcs expirés
   */
  private cleanupArcs(): void {
    const now = this.scene.time.now;
    const arcLifetime = 100;

    this.arcs = this.arcs.filter((arc) => {
      const createdAt = (arc as unknown as { createdAt: number }).createdAt ?? 0;
      if (now - createdAt > arcLifetime) {
        arc.destroy();
        return false;
      }
      return true;
    });
  }

  /**
   * Supprime tous les arcs visuels
   */
  private clearArcs(): void {
    for (const arc of this.arcs) {
      arc.destroy();
    }
    this.arcs = [];
  }

  /**
   * Override pour appliquer les dégâts avec effet électrique
   */
  protected override applyDamage(entity: Entity): void {
    if (!this.isOn) return;

    super.applyDamage(entity);

    // Arc visuel vers l'entité touchée
    this.createArcToEntity(entity);
  }

  /**
   * Crée un arc électrique vers une entité
   */
  private createArcToEntity(entity: Entity): void {
    const arcGraphics = this.scene.add.graphics();
    arcGraphics.setDepth(this.depth + 2);

    // Arc du centre de la zone vers l'entité
    arcGraphics.lineStyle(3, 0x00ffff, 0.9);
    arcGraphics.beginPath();
    arcGraphics.moveTo(this.x, this.y);

    const segments = 4;
    const dx = (entity.x - this.x) / segments;
    const dy = (entity.y - this.y) / segments;

    for (let i = 1; i < segments; i++) {
      const jitterX = (Math.random() - 0.5) * 20;
      const jitterY = (Math.random() - 0.5) * 20;
      arcGraphics.lineTo(this.x + dx * i + jitterX, this.y + dy * i + jitterY);
    }

    arcGraphics.lineTo(entity.x, entity.y);
    arcGraphics.strokePath();

    // Flash sur l'entité
    const flash = this.scene.add.circle(entity.x, entity.y, 10, 0x00ffff, 0.8);
    flash.setDepth(this.depth + 3);

    // Disparition rapide
    this.scene.tweens.add({
      targets: [arcGraphics, flash],
      alpha: 0,
      duration: 100,
      onComplete: () => {
        arcGraphics.destroy();
        flash.destroy();
      },
    });
  }

  /**
   * Crée un effet visuel de dégât électrique
   */
  protected override createDamageEffect(entity: Entity): void {
    // Étincelles autour de l'entité
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spark = this.scene.add.circle(
        entity.x + Math.cos(angle) * 10,
        entity.y + Math.sin(angle) * 10,
        2,
        0xffff00,
        1
      );
      spark.setDepth(this.depth + 2);

      this.scene.tweens.add({
        targets: spark,
        x: entity.x + Math.cos(angle) * 25,
        y: entity.y + Math.sin(angle) * 25,
        alpha: 0,
        duration: 150,
        onComplete: () => spark.destroy(),
      });
    }
  }

  /**
   * Override pour ne pas appliquer d'effets si désactivé
   */
  protected override applyEffects(): void {
    if (!this.isOn) return;
    super.applyEffects();
  }

  /**
   * Nettoie les ressources
   */
  public override destroy(fromScene?: boolean): void {
    this.clearArcs();

    if (this.linkedGeneratorId) {
      this.scene.events.off('generator:toggle', this.onGeneratorToggle, this);
    }

    super.destroy(fromScene);
  }
}
