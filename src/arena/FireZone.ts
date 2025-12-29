import { TerrainZone, TerrainType, type TerrainZoneConfig } from './TerrainZone';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Entity } from '@entities/Entity';

/**
 * Configuration spécifique pour une zone de feu
 */
export interface FireZoneConfig {
  x: number;
  y: number;
  radius?: number;
  duration?: number;
  damage?: number;
}

/**
 * Zone de feu (créée par le lance-flammes ou barils incendiaires)
 * - Inflige des dégâts périodiques
 * - Révèle les zombies invisibles
 * - Durée limitée avec fade out
 */
export class FireZone extends TerrainZone {
  /** Flammes animées */
  private flames: { x: number; y: number; size: number; speed: number }[] = [];

  /**
   * Constructeur avec support de l'ancienne signature (x, y) pour compatibilité
   */
  constructor(scene: GameScene, configOrX: FireZoneConfig | number, y?: number) {
    // Support de l'ancienne signature: new FireZone(scene, x, y)
    const config: FireZoneConfig =
      typeof configOrX === 'number'
        ? { x: configOrX, y: y! }
        : configOrX;

    const balanceConfig = BALANCE.terrainZones.fire;
    const flamethrowerConfig = BALANCE.weapons.flamethrower;

    const terrainConfig: TerrainZoneConfig = {
      type: TerrainType.FIRE,
      x: config.x,
      y: config.y,
      radius: config.radius ?? balanceConfig.radius,
      damagePerSecond: config.damage ?? flamethrowerConfig.fireZoneDamage,
      duration: config.duration ?? flamethrowerConfig.fireZoneDuration,
      revealInvisibles: balanceConfig.revealInvisibles,
      slowFactor: balanceConfig.slowFactor,
    };

    super(scene, terrainConfig);

    // Générer les positions des flammes et redessiner
    this.generateFlames();
    this.drawZone();

    // Tick rate plus rapide pour le feu
    this.damageTickRate = 500;
  }

  /**
   * Génère les positions des flammes animées
   */
  private generateFlames(): void {
    const flameCount = 8 + Math.floor(Math.random() * 4);

    for (let i = 0; i < flameCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (this.radius - 5);

      this.flames.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: 8 + Math.random() * 8,
        speed: 0.5 + Math.random() * 0.5,
      });
    }
  }

  /**
   * Dessine la zone de feu avec animation
   */
  protected override drawZone(): void {
    this.graphics.clear();

    const alpha = this.getZoneAlpha();
    const time = this.scene.time.now;

    // Base orangée
    const flicker = 0.4 + Math.random() * 0.2;
    this.graphics.fillStyle(0xff6600, alpha * flicker);
    this.graphics.fillCircle(0, 0, this.radius - 2 + Math.random() * 4);

    // Centre plus lumineux
    this.graphics.fillStyle(0xffcc00, alpha * 0.6 + Math.random() * 0.2);
    this.graphics.fillCircle(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      this.radius * 0.4 + Math.random() * 5
    );

    // Flammes individuelles
    for (const flame of this.flames) {
      const waveOffset = Math.sin(time * 0.01 * flame.speed + flame.x) * 3;
      const flickerSize = flame.size * (0.8 + Math.random() * 0.4);

      // Forme de flamme (triangle arrondi)
      this.graphics.fillStyle(0xff8800, alpha * (0.6 + Math.random() * 0.2));
      this.graphics.fillCircle(
        flame.x + (Math.random() - 0.5) * 3,
        flame.y + waveOffset - flickerSize / 2,
        flickerSize / 2
      );

      // Pointe jaune
      this.graphics.fillStyle(0xffff00, alpha * (0.4 + Math.random() * 0.3));
      this.graphics.fillCircle(
        flame.x + (Math.random() - 0.5) * 2,
        flame.y + waveOffset - flickerSize,
        flickerSize / 4
      );
    }

    // Étincelles occasionnelles
    if (Math.random() < 0.3) {
      const sparkX = (Math.random() - 0.5) * this.radius * 1.5;
      const sparkY = (Math.random() - 0.5) * this.radius - this.radius * 0.3;
      this.graphics.fillStyle(0xffff88, alpha);
      this.graphics.fillCircle(sparkX, sparkY, 1 + Math.random());
    }
  }

  /**
   * Crée un effet visuel de brûlure sur une entité
   */
  protected override createDamageEffect(entity: Entity): void {
    // Étincelles de feu
    const sparkCount = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < sparkCount; i++) {
      const spark = this.scene.add.circle(
        entity.x + (Math.random() - 0.5) * 10,
        entity.y + (Math.random() - 0.5) * 10,
        2 + Math.random() * 2,
        0xffcc00,
        0.8
      );
      spark.setDepth(this.depth + 2);

      this.scene.tweens.add({
        targets: spark,
        y: spark.y - 15 - Math.random() * 10,
        alpha: 0,
        duration: 200 + Math.random() * 100,
        onComplete: () => spark.destroy(),
      });
    }

    // Effet de fumée occasionnel
    if (Math.random() < 0.3) {
      const smoke = this.scene.add.circle(
        entity.x + (Math.random() - 0.5) * 10,
        entity.y,
        4,
        0x333333,
        0.4
      );
      smoke.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: smoke,
        y: smoke.y - 25,
        scale: 2,
        alpha: 0,
        duration: 400,
        onComplete: () => smoke.destroy(),
      });
    }
  }

  /**
   * Override pour révéler les invisibles avec effet de feu
   */
  protected override tryRevealInvisible(entity: Entity): void {
    const zombie = entity as { zombieType?: string; getData: (key: string) => boolean; setData: (key: string, value: boolean) => void; setAlpha: (alpha: number) => void; setTint: (tint: number) => void; clearTint: () => void };

    if (zombie.zombieType === 'invisible' && !zombie.getData('revealed')) {
      zombie.setData('revealed', true);
      zombie.setAlpha(1);

      // Tint de feu temporaire
      zombie.setTint(0xff8800);
      this.scene.time.delayedCall(500, () => {
        if ((entity as { active: boolean }).active) {
          zombie.clearTint();
        }
      });

      // Effet visuel de révélation par le feu
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const spark = this.scene.add.circle(
          entity.x + Math.cos(angle) * 10,
          entity.y + Math.sin(angle) * 10,
          3,
          0xff6600,
          0.9
        );
        spark.setDepth(10);

        this.scene.tweens.add({
          targets: spark,
          x: entity.x + Math.cos(angle) * 30,
          y: entity.y + Math.sin(angle) * 30 - 15,
          alpha: 0,
          duration: 300,
          onComplete: () => spark.destroy(),
        });
      }
    }
  }
}
