/**
 * AutoTurret Entity - Phase 7.2.3
 *
 * Tourelle automatique qui tire sur les zombies proches.
 * Utilisée par la compétence du Mécanicien.
 */

import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Zombie } from '@entities/zombies/Zombie';

export interface TurretConfig {
  damage: number;
  fireRate: number;
  range: number;
  lifespan: number;
}

const DEFAULT_TURRET_CONFIG: TurretConfig = {
  damage: 8,
  fireRate: 300, // ms entre chaque tir
  range: 250,
  lifespan: 20000, // 20 secondes
};

/**
 * Tourelle automatique posée par le Mécanicien
 */
export class AutoTurret extends Phaser.GameObjects.Container {
  declare public scene: GameScene;

  private config: TurretConfig;
  private lastFireTime: number = 0;
  private lifespanRemaining: number;
  private turretBase!: Phaser.GameObjects.Arc;
  private turretBarrel!: Phaser.GameObjects.Rectangle;
  private rangeIndicator!: Phaser.GameObjects.Arc;

  constructor(
    scene: GameScene,
    x: number,
    y: number,
    config: Partial<TurretConfig> = {}
  ) {
    super(scene, x, y);

    this.config = { ...DEFAULT_TURRET_CONFIG, ...config };
    this.lifespanRemaining = this.config.lifespan;

    // Créer les visuels de la tourelle
    this.createVisuals();

    // Ajouter au jeu
    scene.add.existing(this);

    // Effet d'apparition
    this.playSpawnEffect();
  }

  /**
   * Crée les éléments visuels de la tourelle
   */
  private createVisuals(): void {
    // Indicateur de portée (semi-transparent)
    this.rangeIndicator = this.scene.add.arc(0, 0, this.config.range, 0, 360, false, 0x00ff00, 0.1);
    this.rangeIndicator.setStrokeStyle(1, 0x00ff00, 0.3);
    this.add(this.rangeIndicator);

    // Base de la tourelle
    this.turretBase = this.scene.add.arc(0, 0, 12, 0, 360, false, 0x666666);
    this.turretBase.setStrokeStyle(2, 0x444444);
    this.add(this.turretBase);

    // Canon de la tourelle
    this.turretBarrel = this.scene.add.rectangle(10, 0, 16, 4, 0x888888);
    this.turretBarrel.setOrigin(0, 0.5);
    this.add(this.turretBarrel);
  }

  /**
   * Effet d'apparition de la tourelle
   */
  private playSpawnEffect(): void {
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Son de placement (si disponible)
    if (this.scene.sound.get('turret_place')) {
      this.scene.sound.play('turret_place', { volume: 0.5 });
    }
  }

  /**
   * Mise à jour de la tourelle
   */
  update(_time: number, delta: number): void {
    if (!this.active) return;

    // Réduire le temps de vie
    this.lifespanRemaining -= delta;
    if (this.lifespanRemaining <= 0) {
      this.destroy();
      return;
    }

    // Clignotement quand il reste peu de temps
    if (this.lifespanRemaining < 3000) {
      const blink = Math.sin(this.lifespanRemaining * 0.01) > 0;
      this.turretBase.setFillStyle(blink ? 0xff6666 : 0x666666);
    }

    // Trouver et viser la cible la plus proche
    const target = this.findNearestTarget();
    if (target) {
      this.aimAt(target);
      this.tryFire(target);
    }
  }

  /**
   * Trouve le zombie le plus proche dans la portée
   */
  private findNearestTarget(): Zombie | null {
    const zombies = (this.scene as any).zombies?.getChildren() as Zombie[];
    if (!zombies || zombies.length === 0) return null;

    let nearest: Zombie | null = null;
    let nearestDistance = this.config.range;

    for (const zombie of zombies) {
      if (!zombie.active) continue;

      const distance = Phaser.Math.Distance.Between(
        this.x, this.y,
        zombie.x, zombie.y
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = zombie;
      }
    }

    return nearest;
  }

  /**
   * Oriente la tourelle vers la cible
   */
  private aimAt(target: Zombie): void {
    const angle = Phaser.Math.Angle.Between(
      this.x, this.y,
      target.x, target.y
    );
    this.turretBarrel.setRotation(angle);
  }

  /**
   * Tente de tirer sur la cible
   */
  private tryFire(target: Zombie): void {
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastFireTime < this.config.fireRate) {
      return;
    }

    this.lastFireTime = currentTime;
    this.fire(target);
  }

  /**
   * Tire sur la cible
   */
  private fire(target: Zombie): void {
    // Infliger les dégâts directement (hitscan)
    if (target.active) {
      target.takeDamage(this.config.damage);
    }

    // Effet visuel du tir
    this.playFireEffect(target);

    // Son du tir (si disponible)
    if (this.scene.sound.get('turret_fire')) {
      this.scene.sound.play('turret_fire', { volume: 0.3 });
    }
  }

  /**
   * Effet visuel du tir
   */
  private playFireEffect(target: Zombie): void {
    // Ligne de tir
    const line = this.scene.add.line(
      0, 0,
      this.x, this.y,
      target.x, target.y,
      0xffff00, 0.8
    );
    line.setOrigin(0, 0);
    line.setLineWidth(2);

    // Disparition rapide
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 100,
      onComplete: () => line.destroy(),
    });

    // Flash sur la tourelle
    this.turretBase.setFillStyle(0xffff00);
    this.scene.time.delayedCall(50, () => {
      if (this.active && this.turretBase) {
        this.turretBase.setFillStyle(0x666666);
      }
    });
  }

  /**
   * Définit la durée de vie
   */
  setLifespan(ms: number): void {
    this.lifespanRemaining = ms;
  }

  /**
   * Récupère le temps de vie restant
   */
  getLifespanRemaining(): number {
    return this.lifespanRemaining;
  }

  /**
   * Destruction de la tourelle
   */
  destroy(fromScene?: boolean): void {
    // Effet de destruction
    if (this.scene && this.active) {
      // Particules de débris
      const particles = this.scene.add.particles(this.x, this.y, 'pixel', {
        speed: { min: 50, max: 100 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 500,
        quantity: 10,
        tint: [0x666666, 0x888888, 0x444444],
      });

      // Auto-destruction des particules
      this.scene.time.delayedCall(600, () => {
        particles.destroy();
      });
    }

    super.destroy(fromScene);
  }
}
