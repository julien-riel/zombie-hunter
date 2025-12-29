import { TerrainZone, TerrainType, type TerrainZoneConfig } from './TerrainZone';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Entity } from '@entities/Entity';

/**
 * Configuration spécifique pour une zone de gravats
 */
export interface DebrisConfig {
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
}

/**
 * Zone de gravats/débris
 * - Ralentit les entités qui la traversent
 * - Pas de dégâts
 * - Son de pas différent (futur)
 */
export class DebrisZone extends TerrainZone {
  /** Positions des débris individuels */
  private debrisPositions: { x: number; y: number; size: number; rotation: number; color: number }[] = [];

  constructor(scene: GameScene, config: DebrisConfig) {
    const balanceConfig = BALANCE.terrainZones.debris;

    const terrainConfig: TerrainZoneConfig = {
      type: TerrainType.DEBRIS,
      x: config.x,
      y: config.y,
      radius: config.radius ?? balanceConfig.radius,
      width: config.width,
      height: config.height,
      slowFactor: balanceConfig.slowFactor,
      damagePerSecond: balanceConfig.damagePerSecond,
      duration: balanceConfig.duration,
    };

    super(scene, terrainConfig);

    // Générer les positions des débris et redessiner
    this.generateDebrisPositions();
    this.drawZone();
  }

  /**
   * Génère les positions aléatoires des débris
   */
  private generateDebrisPositions(): void {
    const debrisCount = Math.floor(8 + Math.random() * 6);
    const colors = [0x555555, 0x666666, 0x777777, 0x4a4a4a, 0x5d5d5d];

    for (let i = 0; i < debrisCount; i++) {
      // Distribution dans un cercle
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (this.radius - 10);

      this.debrisPositions.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: 4 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  /**
   * Dessine la zone de gravats
   */
  protected override drawZone(): void {
    this.graphics.clear();

    const alpha = this.getZoneAlpha();

    // Base de poussière
    this.graphics.fillStyle(0x888888, alpha * 0.2);
    this.graphics.fillCircle(0, 0, this.radius);

    // Dessiner chaque débris
    for (const debris of this.debrisPositions) {
      this.graphics.save();
      this.graphics.translateCanvas(debris.x, debris.y);

      // Forme irrégulière (rectangle avec rotation)
      this.graphics.fillStyle(debris.color, alpha * 0.8);

      const halfSize = debris.size / 2;
      const points = [
        { x: -halfSize, y: -halfSize * 0.6 },
        { x: halfSize * 0.8, y: -halfSize * 0.4 },
        { x: halfSize, y: halfSize * 0.5 },
        { x: -halfSize * 0.6, y: halfSize * 0.7 },
      ];

      // Appliquer la rotation
      const cos = Math.cos(debris.rotation);
      const sin = Math.sin(debris.rotation);

      this.graphics.beginPath();
      const firstPoint = points[0];
      this.graphics.moveTo(
        firstPoint.x * cos - firstPoint.y * sin,
        firstPoint.x * sin + firstPoint.y * cos
      );

      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        this.graphics.lineTo(p.x * cos - p.y * sin, p.x * sin + p.y * cos);
      }

      this.graphics.closePath();
      this.graphics.fillPath();

      // Ombre légère
      this.graphics.fillStyle(0x333333, alpha * 0.3);
      this.graphics.fillEllipse(2, 2, debris.size * 0.8, debris.size * 0.4);

      this.graphics.restore();
    }

    // Contour subtil de la zone
    this.graphics.lineStyle(1, 0x555555, alpha * 0.3);
    this.graphics.strokeCircle(0, 0, this.radius);
  }

  /**
   * Crée un effet de poussière quand une entité entre
   */
  protected override createEnterEffect(entity: Entity): void {
    this.createDustCloud(entity.x, entity.y);
  }

  /**
   * Crée un nuage de poussière
   */
  private createDustCloud(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const particle = this.scene.add.circle(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 20,
        3 + Math.random() * 4,
        0x888888,
        0.4
      );
      particle.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 10 - Math.random() * 10,
        alpha: 0,
        scale: 1.5,
        duration: 400 + Math.random() * 200,
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Override pour appliquer le ralentissement avec effet
   */
  protected override applySlowEffect(entity: Entity): void {
    super.applySlowEffect(entity);

    // Petit effet de poussière périodique pendant le mouvement
    const movement = (entity as { movement?: { isMoving: () => boolean } }).movement;
    if (movement?.isMoving?.()) {
      if (Math.random() < 0.1) {
        const particle = this.scene.add.circle(
          entity.x + (Math.random() - 0.5) * 10,
          entity.y + 5,
          2,
          0x888888,
          0.3
        );
        particle.setDepth(this.depth + 0.5);

        this.scene.tweens.add({
          targets: particle,
          y: particle.y - 8,
          alpha: 0,
          duration: 200,
          onComplete: () => particle.destroy(),
        });
      }
    }
  }
}
