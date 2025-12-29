import { TerrainZone, TerrainType, type TerrainZoneConfig } from './TerrainZone';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Entity } from '@entities/Entity';

/**
 * Configuration spécifique pour une zone d'acide
 */
export interface AcidZoneConfig {
  x: number;
  y: number;
  radius?: number;
  duration?: number;
  damage?: number;
}

/**
 * Zone d'acide (créée par les projectiles des Spitters)
 * - Inflige des dégâts corrosifs périodiques
 * - Ralentit légèrement les entités
 * - Durée limitée avec effet de dissolution
 */
export class AcidZone extends TerrainZone {
  /** Bulles d'acide */
  private bubbles: { x: number; y: number; size: number; delay: number }[] = [];
  /** Timer pour les bulles */
  private bubbleTimer: number = 0;

  constructor(scene: GameScene, config: AcidZoneConfig) {
    const balanceConfig = BALANCE.terrainZones.acid;

    const terrainConfig: TerrainZoneConfig = {
      type: TerrainType.ACID,
      x: config.x,
      y: config.y,
      radius: config.radius ?? balanceConfig.radius,
      damagePerSecond: config.damage ?? balanceConfig.damagePerSecond,
      duration: config.duration ?? balanceConfig.duration,
      slowFactor: balanceConfig.slowFactor,
      revealInvisibles: balanceConfig.revealInvisibles,
    };

    super(scene, terrainConfig);

    // Générer les bulles et redessiner
    this.generateBubbles();
    this.drawZone();
  }

  /**
   * Génère les positions des bulles
   */
  private generateBubbles(): void {
    const bubbleCount = 6 + Math.floor(Math.random() * 4);

    for (let i = 0; i < bubbleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (this.radius - 8);

      this.bubbles.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 1000,
      });
    }
  }

  /**
   * Dessine la zone d'acide
   */
  protected override drawZone(): void {
    this.graphics.clear();

    const alpha = this.getZoneAlpha();
    const time = this.scene.time.now;

    // Base verdâtre
    this.graphics.fillStyle(0x00ff00, alpha * 0.5);
    this.graphics.fillCircle(0, 0, this.radius);

    // Couche plus sombre au centre
    this.graphics.fillStyle(0x00cc00, alpha * 0.4);
    this.graphics.fillCircle(0, 0, this.radius * 0.7);

    // Couche très claire au centre
    this.graphics.fillStyle(0x88ff88, alpha * 0.3);
    this.graphics.fillCircle(0, 0, this.radius * 0.3);

    // Bulles animées
    for (const bubble of this.bubbles) {
      const bubbleTime = (time + bubble.delay) % 2000;
      const progress = bubbleTime / 2000;

      if (progress < 0.3) {
        // Bulle qui monte
        const bubbleAlpha = alpha * (1 - progress / 0.3) * 0.8;
        const bubbleY = bubble.y - progress * 15;
        const bubbleSize = bubble.size * (1 + progress);

        this.graphics.fillStyle(0x88ff88, bubbleAlpha);
        this.graphics.fillCircle(bubble.x, bubbleY, bubbleSize);

        // Reflet
        this.graphics.fillStyle(0xccffcc, bubbleAlpha * 0.5);
        this.graphics.fillCircle(bubble.x - bubbleSize * 0.3, bubbleY - bubbleSize * 0.3, bubbleSize * 0.3);
      }
    }

    // Bord plus lumineux
    this.graphics.lineStyle(2, 0x88ff88, alpha * 0.5);
    this.graphics.strokeCircle(0, 0, this.radius);
  }

  /**
   * Met à jour les effets visuels
   */
  protected override updateVisuals(): void {
    super.updateVisuals();

    // Créer des bulles qui éclatent
    const now = this.scene.time.now;
    if (now - this.bubbleTimer >= 300) {
      this.createBubblePopEffect();
      this.bubbleTimer = now;
    }
  }

  /**
   * Crée un effet de bulle qui éclate
   */
  private createBubblePopEffect(): void {
    if (Math.random() > 0.5) return;

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.radius * 0.8;
    const x = this.x + Math.cos(angle) * distance;
    const y = this.y + Math.sin(angle) * distance;

    const bubble = this.scene.add.circle(x, y, 3, 0x88ff88, 0.7);
    bubble.setDepth(this.depth + 0.5);

    this.scene.tweens.add({
      targets: bubble,
      y: y - 12,
      scale: 1.5,
      duration: 200,
      onComplete: () => {
        // Effet d'éclatement
        for (let i = 0; i < 3; i++) {
          const droplet = this.scene.add.circle(
            x + (Math.random() - 0.5) * 10,
            y - 12,
            1,
            0x88ff88,
            0.6
          );
          droplet.setDepth(this.depth + 0.6);

          this.scene.tweens.add({
            targets: droplet,
            y: droplet.y + 5,
            alpha: 0,
            duration: 150,
            onComplete: () => droplet.destroy(),
          });
        }
        bubble.destroy();
      },
    });
  }

  /**
   * Crée un effet de corrosion sur une entité
   */
  protected override createDamageEffect(entity: Entity): void {
    // Gouttes d'acide
    for (let i = 0; i < 2; i++) {
      const drop = this.scene.add.circle(
        entity.x + (Math.random() - 0.5) * 15,
        entity.y + (Math.random() - 0.5) * 15,
        2,
        0x00ff00,
        0.8
      );
      drop.setDepth(this.depth + 2);

      this.scene.tweens.add({
        targets: drop,
        y: drop.y + 10,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        onComplete: () => drop.destroy(),
      });
    }

    // Effet de fumée verte
    if (Math.random() < 0.3) {
      const smoke = this.scene.add.circle(
        entity.x + (Math.random() - 0.5) * 10,
        entity.y,
        5,
        0x88ff88,
        0.3
      );
      smoke.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: smoke,
        y: smoke.y - 15,
        scale: 1.5,
        alpha: 0,
        duration: 400,
        onComplete: () => smoke.destroy(),
      });
    }
  }

  /**
   * Override pour appliquer les dégâts avec effet de corrosion
   */
  protected override applyDamage(entity: Entity): void {
    super.applyDamage(entity);

    // Tint vert temporaire sur l'entité
    const tintable = entity as { setTint?: (tint: number) => void; clearTint?: () => void };
    if (tintable.setTint) {
      tintable.setTint(0x88ff88);
      this.scene.time.delayedCall(200, () => {
        if ((entity as { active: boolean }).active && tintable.clearTint) {
          tintable.clearTint();
        }
      });
    }
  }

  /**
   * Effet d'entrée spécifique à l'acide
   */
  protected override createEnterEffect(entity: Entity): void {
    // Éclaboussure d'acide
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.5;
      const droplet = this.scene.add.circle(
        entity.x,
        entity.y,
        2,
        0x00ff00,
        0.8
      );
      droplet.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: droplet,
        x: entity.x + Math.cos(angle) * 15,
        y: entity.y + Math.sin(angle) * 15,
        alpha: 0,
        duration: 200,
        onComplete: () => droplet.destroy(),
      });
    }
  }
}
