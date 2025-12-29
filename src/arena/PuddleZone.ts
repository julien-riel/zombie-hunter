import { TerrainZone, TerrainType, type TerrainZoneConfig } from './TerrainZone';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Entity } from '@entities/Entity';

/**
 * Configuration spécifique pour une flaque
 */
export interface PuddleConfig {
  x: number;
  y: number;
  radius?: number;
  isBlood?: boolean;
}

/**
 * Zone de flaque (eau ou sang)
 * - Ralentit les entités qui la traversent
 * - Révèle les zombies invisibles (éclaboussures)
 * - Conduit l'électricité du TeslaCannon (eau seulement)
 */
export class PuddleZone extends TerrainZone {
  /** True si c'est une flaque de sang */
  public readonly isBlood: boolean;

  /** Animation de surface */
  private rippleTimer: number = 0;
  private rippleInterval: number = 2000;

  constructor(scene: GameScene, config: PuddleConfig) {
    const type = config.isBlood ? TerrainType.BLOOD_POOL : TerrainType.PUDDLE;
    const balanceConfig = BALANCE.terrainZones[config.isBlood ? 'blood_pool' : 'puddle'];

    const terrainConfig: TerrainZoneConfig = {
      type,
      x: config.x,
      y: config.y,
      radius: config.radius ?? balanceConfig.radius,
      slowFactor: balanceConfig.slowFactor,
      damagePerSecond: balanceConfig.damagePerSecond,
      revealInvisibles: balanceConfig.revealInvisibles,
      conductElectricity: balanceConfig.conductElectricity,
      duration: balanceConfig.duration,
    };

    super(scene, terrainConfig);

    this.isBlood = config.isBlood ?? false;
    this.drawZone();
  }

  /**
   * Dessine la flaque avec des effets de surface
   */
  protected override drawZone(): void {
    this.graphics.clear();

    const baseColor = this.isBlood ? 0x8b0000 : 0x4488cc;
    const alpha = this.getZoneAlpha();

    // Forme irrégulière pour la flaque (plusieurs ellipses)
    this.graphics.fillStyle(baseColor, alpha * 0.6);

    // Forme principale
    this.graphics.fillEllipse(0, 0, this.radius * 2, this.radius * 1.6);

    // Variations pour rendre la flaque plus organique
    this.graphics.fillEllipse(-this.radius * 0.3, this.radius * 0.2, this.radius * 0.8, this.radius * 0.5);
    this.graphics.fillEllipse(this.radius * 0.2, -this.radius * 0.3, this.radius * 0.6, this.radius * 0.4);

    // Reflets (seulement pour l'eau)
    if (!this.isBlood) {
      this.graphics.fillStyle(0xaaddff, alpha * 0.3);
      this.graphics.fillEllipse(-this.radius * 0.2, -this.radius * 0.3, this.radius * 0.4, this.radius * 0.2);
    }

    // Bord plus sombre
    this.graphics.lineStyle(1, this.isBlood ? 0x5a0000 : 0x336699, alpha * 0.5);
    this.graphics.strokeEllipse(0, 0, this.radius * 2, this.radius * 1.6);
  }

  /**
   * Met à jour les effets visuels
   */
  protected override updateVisuals(): void {
    super.updateVisuals();

    // Animation de ondulation périodique
    const now = this.scene.time.now;
    if (now - this.rippleTimer >= this.rippleInterval) {
      this.createRipple();
      this.rippleTimer = now;
      this.rippleInterval = 1500 + Math.random() * 1000;
    }
  }

  /**
   * Crée une ondulation sur la surface
   */
  private createRipple(): void {
    const color = this.isBlood ? 0xaa3333 : 0x88ccff;

    const ripple = this.scene.add.circle(
      this.x + (Math.random() - 0.5) * this.radius,
      this.y + (Math.random() - 0.5) * this.radius * 0.8,
      5,
      color,
      0
    );
    ripple.setStrokeStyle(1, color, 0.5);
    ripple.setDepth(this.depth + 0.1);

    this.scene.tweens.add({
      targets: ripple,
      scaleX: 3,
      scaleY: 2,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut',
      onComplete: () => ripple.destroy(),
    });
  }

  /**
   * Override pour créer des éclaboussures plus prononcées
   */
  protected override createSplashEffect(x: number, y: number): void {
    const color = this.isBlood ? 0xaa3333 : 0x88ccff;

    // Plus de particules pour les flaques
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 + Math.random() * 0.3;
      const distance = 10 + Math.random() * 15;

      const droplet = this.scene.add.circle(
        x + Math.cos(angle) * 5,
        y + Math.sin(angle) * 5,
        2 + Math.random() * 2,
        color,
        0.8
      );
      droplet.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: droplet,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance - 10,
        alpha: 0,
        scale: 0.5,
        duration: 250 + Math.random() * 100,
        ease: 'Quad.easeOut',
        onComplete: () => droplet.destroy(),
      });
    }

    // Onde d'éclaboussure
    const splash = this.scene.add.circle(x, y, 5, color, 0);
    splash.setStrokeStyle(2, color, 0.6);
    splash.setDepth(this.depth + 0.5);

    this.scene.tweens.add({
      targets: splash,
      scaleX: 2.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 300,
      onComplete: () => splash.destroy(),
    });
  }

  /**
   * Override pour révéler les invisibles avec effet
   */
  protected override tryRevealInvisible(entity: Entity): void {
    const zombie = entity as { zombieType?: string; getData: (key: string) => boolean; setData: (key: string, value: boolean) => void; setAlpha: (alpha: number) => void };

    if (zombie.zombieType === 'invisible' && !zombie.getData('revealed')) {
      zombie.setData('revealed', true);
      zombie.setAlpha(1);

      // Effet visuel de révélation par éclaboussure
      const color = this.isBlood ? 0xaa3333 : 0x88ccff;

      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const droplet = this.scene.add.circle(
          entity.x + Math.cos(angle) * 15,
          entity.y + Math.sin(angle) * 15,
          3,
          color,
          0.9
        );
        droplet.setDepth(10);

        this.scene.tweens.add({
          targets: droplet,
          x: entity.x + Math.cos(angle) * 35,
          y: entity.y + Math.sin(angle) * 35,
          alpha: 0,
          duration: 400,
          onComplete: () => droplet.destroy(),
        });
      }
    }
  }
}
