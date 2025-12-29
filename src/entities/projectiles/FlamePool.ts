import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Zombie } from '@entities/zombies/Zombie';
import { FireZone } from '@entities/effects/FireZone';
import { BALANCE } from '@config/balance';

/**
 * Particule de flamme pour le lance-flammes
 */
class FlameParticle extends Phaser.GameObjects.Container {
  public damage: number = 0;
  public dotDamage: number = 0;
  public dotDuration: number = 0;
  public speed: number = 0;
  public direction: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  public hitZombies: Set<number> = new Set();
  private createdAt: number = 0;
  private maxLifetime: number = 500;

  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y);

    this.graphics = scene.add.graphics();
    this.add(this.graphics);
    this.setActive(false);
    this.setVisible(false);
  }

  /**
   * Active la flamme
   */
  public activate(
    x: number,
    y: number,
    direction: Phaser.Math.Vector2,
    speed: number,
    damage: number,
    dotDamage: number,
    dotDuration: number
  ): void {
    this.setPosition(x, y);
    this.direction = direction.clone();
    this.speed = speed;
    this.damage = damage;
    this.dotDamage = dotDamage;
    this.dotDuration = dotDuration;
    this.hitZombies.clear();
    this.createdAt = (this.scene as GameScene).time.now;
    this.setActive(true);
    this.setVisible(true);
    this.setAlpha(1);
  }

  /**
   * Met à jour la flamme
   */
  public update(delta: number): void {
    if (!this.active) return;

    const scene = this.scene as GameScene;
    const elapsed = scene.time.now - this.createdAt;

    // Vérifier la durée de vie
    if (elapsed > this.maxLifetime) {
      this.deactivate();
      return;
    }

    // Mouvement
    const moveX = this.direction.x * this.speed * (delta / 1000);
    const moveY = this.direction.y * this.speed * (delta / 1000);
    this.x += moveX;
    this.y += moveY;

    // Grossir avec le temps
    const scale = 1 + (elapsed / this.maxLifetime) * 1.5;
    this.setScale(scale);

    // Fading
    this.setAlpha(1 - elapsed / this.maxLifetime * 0.5);

    // Dessiner la flamme
    this.drawFlame(elapsed / this.maxLifetime);
  }

  /**
   * Dessine la flamme
   */
  private drawFlame(progress: number): void {
    this.graphics.clear();

    const size = 8 + progress * 12;

    // Coeur de la flamme
    this.graphics.fillStyle(0xffff00, 0.8);
    this.graphics.fillCircle(0, 0, size * 0.4);

    // Flamme externe
    this.graphics.fillStyle(0xff6600, 0.6);
    this.graphics.fillCircle(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      size
    );

    // Bord de flamme
    this.graphics.fillStyle(0xff3300, 0.3);
    this.graphics.fillCircle(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      size * 1.3
    );
  }

  /**
   * Désactive la flamme
   */
  public deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    this.graphics.clear();
  }
}

/**
 * Pool de flammes pour le lance-flammes
 */
export class FlamePool {
  private scene: GameScene;
  private flames: FlameParticle[] = [];
  private maxFlames: number = 50;
  private fireZones: FireZone[] = [];
  private maxFireZones: number = 10;

  private lastFireZoneTime: number = 0;
  private fireZoneInterval: number = 200; // Une zone tous les 200ms

  constructor(scene: GameScene) {
    this.scene = scene;
    this.prewarm();
  }

  /**
   * Préchauffe le pool
   */
  private prewarm(): void {
    for (let i = 0; i < this.maxFlames; i++) {
      const flame = new FlameParticle(this.scene, -100, -100);
      this.scene.add.existing(flame);
      this.flames.push(flame);
    }
  }

  /**
   * Récupère une flamme du pool
   */
  public get(
    x: number,
    y: number,
    direction: Phaser.Math.Vector2,
    speed: number,
    damage: number,
    dotDamage: number,
    dotDuration: number
  ): FlameParticle | null {
    // Trouver une flamme inactive
    for (const flame of this.flames) {
      if (!flame.active) {
        flame.activate(x, y, direction, speed, damage, dotDamage, dotDuration);
        return flame;
      }
    }

    return null;
  }

  /**
   * Crée une zone de feu
   */
  public createFireZone(x: number, y: number): void {
    const now = this.scene.time.now;

    // Limiter la fréquence
    if (now - this.lastFireZoneTime < this.fireZoneInterval) return;
    this.lastFireZoneTime = now;

    // Limiter le nombre de zones actives
    this.fireZones = this.fireZones.filter(zone => zone.active);
    if (this.fireZones.length >= this.maxFireZones) {
      // Supprimer la plus ancienne
      const oldest = this.fireZones.shift();
      if (oldest) oldest.destroy();
    }

    const zone = new FireZone(this.scene, x, y);
    this.fireZones.push(zone);
  }

  /**
   * Met à jour le pool
   */
  public update(delta: number): void {
    const activeZombies = this.scene.getActiveZombies();

    // Mettre à jour les flammes
    for (const flame of this.flames) {
      if (flame.active) {
        flame.update(delta);

        // Vérifier les collisions avec les zombies
        this.checkFlameCollisions(flame, activeZombies);
      }
    }

    // Mettre à jour les zones de feu
    for (const zone of this.fireZones) {
      if (zone.active) {
        zone.update();
      }
    }
  }

  /**
   * Vérifie les collisions d'une flamme avec les zombies
   */
  private checkFlameCollisions(flame: FlameParticle, zombies: Zombie[]): void {
    for (const zombie of zombies) {
      if (!zombie.active) continue;

      // Éviter de toucher le même zombie plusieurs fois
      const zombieId = zombie.getData('instanceId') || 0;
      if (flame.hitZombies.has(zombieId)) continue;

      const distance = Phaser.Math.Distance.Between(flame.x, flame.y, zombie.x, zombie.y);

      if (distance < 30) {
        // Infliger les dégâts directs
        zombie.takeDamage(flame.damage);

        // Appliquer le DoT (brûlure)
        this.applyBurning(zombie, flame.dotDamage, flame.dotDuration);

        // Révéler les invisibles
        if (zombie.zombieType === 'invisible') {
          zombie.setData('revealed', true);
          zombie.setAlpha(1);
        }

        // Marquer comme touché
        flame.hitZombies.add(zombieId);

        // Effet visuel
        this.createHitEffect(zombie.x, zombie.y);

        // Créer une zone de feu au sol
        this.createFireZone(zombie.x, zombie.y);
      }
    }
  }

  /**
   * Applique l'effet de brûlure (DoT)
   */
  private applyBurning(zombie: Zombie, damage: number, duration: number): void {
    // Vérifier si déjà en feu
    if (zombie.getData('burning')) return;

    zombie.setData('burning', true);
    zombie.setTint(0xff6600);

    const tickRate = BALANCE.weapons.flamethrower.dotTickRate;
    const ticks = Math.floor(duration / tickRate);
    let currentTick = 0;

    const burnEvent = this.scene.time.addEvent({
      delay: tickRate,
      repeat: ticks - 1,
      callback: () => {
        if (!zombie.active) {
          burnEvent.destroy();
          return;
        }

        zombie.takeDamage(damage);
        currentTick++;

        // Effet visuel de brûlure
        const spark = this.scene.add.circle(
          zombie.x + (Math.random() - 0.5) * 15,
          zombie.y + (Math.random() - 0.5) * 15,
          3,
          0xffcc00,
          0.8
        );

        this.scene.tweens.add({
          targets: spark,
          y: spark.y - 20,
          alpha: 0,
          duration: 300,
          onComplete: () => spark.destroy(),
        });

        if (currentTick >= ticks) {
          zombie.setData('burning', false);
          if (zombie.active) {
            zombie.clearTint();
          }
        }
      },
    });
  }

  /**
   * Crée un effet d'impact
   */
  private createHitEffect(x: number, y: number): void {
    const flash = this.scene.add.circle(x, y, 15, 0xff6600, 0.8);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 150,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Nettoie le pool
   */
  public destroy(): void {
    for (const flame of this.flames) {
      flame.destroy();
    }
    this.flames = [];

    for (const zone of this.fireZones) {
      zone.destroy();
    }
    this.fireZones = [];
  }
}
