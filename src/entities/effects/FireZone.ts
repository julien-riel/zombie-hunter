import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import { BALANCE } from '@config/balance';

/**
 * Zone de feu laissée par le lance-flammes
 * Inflige des dégâts périodiques aux zombies qui marchent dessus
 * Révèle les zombies invisibles
 */
export class FireZone extends Phaser.GameObjects.Container {
  declare public scene: GameScene;
  private damage: number;
  private duration: number;
  private tickRate: number = 500;
  private lastTickTime: number = 0;
  private createdAt: number;

  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y);

    this.damage = BALANCE.weapons.flamethrower.fireZoneDamage;
    this.duration = BALANCE.weapons.flamethrower.fireZoneDuration;
    this.createdAt = scene.time.now;

    scene.add.existing(this);

    // Créer les graphiques de la zone de feu
    this.graphics = scene.add.graphics();
    this.add(this.graphics);
    this.drawFire();

    // Configurer la physique
    scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(30);
    body.setOffset(-30, -30);

    // Auto-destruction après la durée
    scene.time.delayedCall(this.duration, () => {
      this.destroy();
    });
  }

  /**
   * Dessine l'effet de feu
   */
  private drawFire(): void {
    this.graphics.clear();

    // Base de feu orangée
    this.graphics.fillStyle(0xff6600, 0.5);
    this.graphics.fillCircle(0, 0, 30);

    // Centre plus lumineux
    this.graphics.fillStyle(0xffcc00, 0.6);
    this.graphics.fillCircle(0, 0, 15);

    // Flammes animées seront gérées par update
  }

  /**
   * Met à jour la zone de feu
   */
  public update(): void {
    if (!this.active) return;

    const now = this.scene.time.now;

    // Animation du feu
    this.animateFire();

    // Fade out vers la fin
    const elapsed = now - this.createdAt;
    const remaining = this.duration - elapsed;
    if (remaining < 500) {
      this.setAlpha(remaining / 500);
    }

    // Tick de dégâts
    if (now - this.lastTickTime >= this.tickRate) {
      this.applyDamage();
      this.lastTickTime = now;
    }
  }

  /**
   * Anime l'effet de feu
   */
  private animateFire(): void {
    this.graphics.clear();

    // Base de feu avec variation
    const flicker = 0.4 + Math.random() * 0.2;
    this.graphics.fillStyle(0xff6600, flicker);
    this.graphics.fillCircle(0, 0, 28 + Math.random() * 4);

    // Centre
    this.graphics.fillStyle(0xffcc00, 0.5 + Math.random() * 0.2);
    this.graphics.fillCircle(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      12 + Math.random() * 5
    );
  }

  /**
   * Applique les dégâts aux zombies dans la zone
   */
  private applyDamage(): void {
    const activeZombies = this.scene.getActiveZombies();

    for (const zombie of activeZombies) {
      if (!zombie.active) continue;

      const distance = Phaser.Math.Distance.Between(this.x, this.y, zombie.x, zombie.y);

      if (distance <= 35) {
        zombie.takeDamage(this.damage);

        // Révéler les zombies invisibles
        if (zombie.zombieType === 'invisible') {
          zombie.setData('revealed', true);
          zombie.setAlpha(1);
        }

        // Effet visuel de brûlure
        this.createBurnEffect(zombie.x, zombie.y);
      }
    }
  }

  /**
   * Crée un effet de brûlure
   */
  private createBurnEffect(x: number, y: number): void {
    const spark = this.scene.add.circle(
      x + (Math.random() - 0.5) * 10,
      y + (Math.random() - 0.5) * 10,
      3,
      0xffcc00,
      0.8
    );

    this.scene.tweens.add({
      targets: spark,
      y: spark.y - 15,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        spark.destroy();
      },
    });
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.graphics?.destroy();
    super.destroy();
  }
}
