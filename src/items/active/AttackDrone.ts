import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';
import { ActiveItem, ActiveItemType, ActiveItemRarity } from './ActiveItem';
import { BALANCE } from '@config/balance';

const CONFIG = BALANCE.activeItems.drone;

/**
 * Drone d'attaque
 *
 * Un drone qui orbite autour du joueur et tire sur les zombies.
 * - Durée: 20 secondes
 * - Santé: 50 HP (peut être détruit par projectiles)
 * - Suit le joueur en orbite
 * - Tire sur l'ennemi le plus proche
 */
export class AttackDrone extends ActiveItem {
  public readonly type: ActiveItemType = 'drone';
  public readonly rarity: ActiveItemRarity = CONFIG.rarity;
  public readonly color: number = CONFIG.color;
  public readonly name: string = "Drone d'Attaque";
  public readonly description: string = 'Orbite et tire automatiquement pendant 20s';

  // Configuration
  private readonly droneHealth: number = CONFIG.health;
  private readonly damage: number = CONFIG.damage;
  private readonly fireRate: number = CONFIG.fireRate;
  private readonly orbitRadius: number = CONFIG.orbitRadius;
  private readonly orbitSpeed: number = CONFIG.orbitSpeed;
  private readonly detectionRadius: number = CONFIG.detectionRadius;

  // État
  private health: number = CONFIG.health;
  private orbitAngle: number = 0;
  private lastFireTime: number = 0;
  private currentTarget: Zombie | null = null;

  // Visuels
  private container: Phaser.GameObjects.Container | null = null;
  private bodyGraphics: Phaser.GameObjects.Graphics | null = null;
  private propellerGraphics: Phaser.GameObjects.Graphics | null = null;
  private shadowGraphics: Phaser.GameObjects.Graphics | null = null;
  private healthBar: Phaser.GameObjects.Graphics | null = null;
  private propellerAngle: number = 0;

  constructor() {
    super();
    this.duration = CONFIG.duration;
    this.timeRemaining = this.duration;
  }

  /**
   * Déploie le drone
   */
  protected onDeploy(
    player: Player,
    scene: GameScene,
    _x: number,
    _y: number
  ): boolean {
    // Le drone apparaît près du joueur
    const startX = player.x + this.orbitRadius;
    const startY = player.y;

    // Créer l'ombre au sol
    this.shadowGraphics = scene.add.graphics();
    this.shadowGraphics.setDepth(0);

    // Créer le conteneur du drone
    this.container = scene.add.container(startX, startY);
    this.container.setDepth(100); // Au-dessus des autres éléments

    // Corps du drone
    this.bodyGraphics = scene.add.graphics();
    this.drawBody();
    this.container.add(this.bodyGraphics);

    // Hélices
    this.propellerGraphics = scene.add.graphics();
    this.drawPropellers();
    this.container.add(this.propellerGraphics);

    // Barre de vie
    this.healthBar = scene.add.graphics();
    this.updateHealthBar();
    this.container.add(this.healthBar);

    // Animation d'apparition
    this.container.setScale(0);
    this.container.setAlpha(0);
    scene.tweens.add({
      targets: this.container,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    return true;
  }

  /**
   * Met à jour le drone
   */
  protected onUpdate(
    delta: number,
    player: Player,
    scene: GameScene
  ): boolean {
    if (!this.container) return false;

    // Vérifier si détruit
    if (this.health <= 0) {
      this.createDestructionEffect(scene);
      return false;
    }

    // Mettre à jour l'orbite
    this.orbitAngle += this.orbitSpeed * (delta / 1000);

    // Position en orbite autour du joueur
    const targetX = player.x + Math.cos(this.orbitAngle) * this.orbitRadius;
    const targetY = player.y + Math.sin(this.orbitAngle) * this.orbitRadius;

    // Mouvement fluide vers la position cible
    this.container.x += (targetX - this.container.x) * 0.1;
    this.container.y += (targetY - this.container.y) * 0.1;

    // Mettre à jour la position interne
    this.position.x = this.container.x;
    this.position.y = this.container.y;

    // Animation des hélices
    this.propellerAngle += delta * 0.03;
    this.drawPropellers();

    // Mettre à jour l'ombre
    this.updateShadow();

    // Chercher une cible et tirer
    this.findTarget(scene);
    if (this.currentTarget) {
      this.tryFire(scene, delta);
    }

    return true;
  }

  /**
   * Détruit le drone
   */
  protected onDestroy(_player: Player, scene: GameScene): void {
    if (this.container) {
      scene.tweens.add({
        targets: this.container,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          this.cleanup();
        },
      });
    } else {
      this.cleanup();
    }
  }

  /**
   * Cherche une cible
   */
  private findTarget(scene: GameScene): void {
    // Vérifier la cible actuelle
    if (this.currentTarget) {
      if (!this.currentTarget.active || this.currentTarget.getHealth() <= 0) {
        this.currentTarget = null;
      } else {
        const dist = Phaser.Math.Distance.Between(
          this.position.x,
          this.position.y,
          this.currentTarget.x,
          this.currentTarget.y
        );
        if (dist > this.detectionRadius) {
          this.currentTarget = null;
        }
      }
    }

    // Chercher une nouvelle cible
    if (!this.currentTarget) {
      const zombies = scene.getActiveZombies();
      let closestDist = this.detectionRadius;
      let closest: Zombie | null = null;

      for (const zombie of zombies) {
        if (!zombie.active || zombie.getHealth() <= 0) continue;

        const dist = Phaser.Math.Distance.Between(
          this.position.x,
          this.position.y,
          zombie.x,
          zombie.y
        );

        if (dist < closestDist) {
          closestDist = dist;
          closest = zombie;
        }
      }

      this.currentTarget = closest;
    }
  }

  /**
   * Tente de tirer
   */
  private tryFire(scene: GameScene, delta: number): void {
    this.lastFireTime += delta;

    if (this.lastFireTime >= this.fireRate && this.currentTarget) {
      this.lastFireTime = 0;
      this.fire(scene);
    }
  }

  /**
   * Tire sur la cible
   */
  private fire(scene: GameScene): void {
    if (!this.currentTarget || !this.container) return;

    // Créer le laser/projectile
    const startX = this.position.x;
    const startY = this.position.y;
    const targetX = this.currentTarget.x;
    const targetY = this.currentTarget.y;

    // Ligne laser
    const laser = scene.add.graphics();
    laser.lineStyle(2, this.color, 1);
    laser.beginPath();
    laser.moveTo(startX, startY);
    laser.lineTo(targetX, targetY);
    laser.strokePath();

    // Faire disparaître le laser
    scene.tweens.add({
      targets: laser,
      alpha: 0,
      duration: 100,
      onComplete: () => laser.destroy(),
    });

    // Infliger des dégâts
    if (this.currentTarget.active) {
      this.currentTarget.takeDamage(this.damage);
      this.createImpactEffect(scene, targetX, targetY);
    }
  }

  /**
   * Dessine le corps du drone
   */
  private drawBody(): void {
    if (!this.bodyGraphics) return;

    this.bodyGraphics.clear();

    // Corps principal (forme de X)
    this.bodyGraphics.fillStyle(0x333333, 1);

    // Centre
    this.bodyGraphics.fillCircle(0, 0, 8);

    // Bras
    const armLength = 15;
    const armWidth = 4;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      this.bodyGraphics.save();
      this.bodyGraphics.translateCanvas(0, 0);
      this.bodyGraphics.rotateCanvas(angle);
      this.bodyGraphics.fillRect(0, -armWidth / 2, armLength, armWidth);
      this.bodyGraphics.restore();
    }

    // Lumière centrale
    this.bodyGraphics.fillStyle(this.color, 1);
    this.bodyGraphics.fillCircle(0, 0, 4);
  }

  /**
   * Dessine les hélices
   */
  private drawPropellers(): void {
    if (!this.propellerGraphics) return;

    this.propellerGraphics.clear();

    const armLength = 15;
    const propRadius = 6;

    for (let i = 0; i < 4; i++) {
      const armAngle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const px = Math.cos(armAngle) * armLength;
      const py = Math.sin(armAngle) * armLength;

      // Cercle de l'hélice
      this.propellerGraphics.lineStyle(1, 0x666666, 0.5);
      this.propellerGraphics.strokeCircle(px, py, propRadius);

      // Pales (tournent)
      this.propellerGraphics.lineStyle(2, 0x888888, 1);
      const bladeAngle = this.propellerAngle + i * 0.5;

      for (let j = 0; j < 2; j++) {
        const blade = bladeAngle + j * Math.PI;
        const bx1 = px + Math.cos(blade) * propRadius;
        const by1 = py + Math.sin(blade) * propRadius;
        const bx2 = px - Math.cos(blade) * propRadius;
        const by2 = py - Math.sin(blade) * propRadius;

        this.propellerGraphics.beginPath();
        this.propellerGraphics.moveTo(bx1, by1);
        this.propellerGraphics.lineTo(bx2, by2);
        this.propellerGraphics.strokePath();
      }
    }
  }

  /**
   * Met à jour l'ombre
   */
  private updateShadow(): void {
    if (!this.shadowGraphics) return;

    this.shadowGraphics.clear();
    this.shadowGraphics.fillStyle(0x000000, 0.2);
    this.shadowGraphics.fillEllipse(
      this.position.x + 5,
      this.position.y + 20,
      25,
      10
    );
  }

  /**
   * Met à jour la barre de vie
   */
  private updateHealthBar(): void {
    if (!this.healthBar) return;

    this.healthBar.clear();

    const barWidth = 20;
    const barHeight = 3;
    const yOffset = -20;

    // Fond
    this.healthBar.fillStyle(0x333333, 1);
    this.healthBar.fillRect(-barWidth / 2, yOffset, barWidth, barHeight);

    // Vie
    const healthPercent = this.health / this.droneHealth;
    const healthColor =
      healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000;
    this.healthBar.fillStyle(healthColor, 1);
    this.healthBar.fillRect(-barWidth / 2, yOffset, barWidth * healthPercent, barHeight);
  }

  /**
   * Crée un effet d'impact
   */
  private createImpactEffect(scene: GameScene, x: number, y: number): void {
    const impact = scene.add.circle(x, y, 6, this.color, 1);
    scene.tweens.add({
      targets: impact,
      alpha: 0,
      scale: 1.5,
      duration: 100,
      onComplete: () => impact.destroy(),
    });
  }

  /**
   * Crée l'effet de destruction
   */
  private createDestructionEffect(scene: GameScene): void {
    // Explosion
    const explosion = scene.add.circle(
      this.position.x,
      this.position.y,
      15,
      this.color,
      0.8
    );

    scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 3,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // Débris
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const debris = scene.add.rectangle(
        this.position.x,
        this.position.y,
        4,
        4,
        0x333333
      );

      scene.tweens.add({
        targets: debris,
        x: this.position.x + Math.cos(angle) * 40,
        y: this.position.y + Math.sin(angle) * 40 + 20, // Tombe vers le sol
        alpha: 0,
        rotation: Math.random() * 4,
        duration: 500,
        ease: 'Quad.easeIn',
        onComplete: () => debris.destroy(),
      });
    }
  }

  /**
   * Inflige des dégâts au drone
   */
  public takeDamage(amount: number): void {
    this.health -= amount;
    this.updateHealthBar();

    if (this.container && this.scene) {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0.5,
        duration: 50,
        yoyo: true,
      });
    }
  }

  /**
   * Récupère la santé
   */
  public getHealth(): number {
    return this.health;
  }

  /**
   * Nettoie les ressources
   */
  private cleanup(): void {
    if (this.shadowGraphics) {
      this.shadowGraphics.destroy();
      this.shadowGraphics = null;
    }
    if (this.bodyGraphics) {
      this.bodyGraphics.destroy();
      this.bodyGraphics = null;
    }
    if (this.propellerGraphics) {
      this.propellerGraphics.destroy();
      this.propellerGraphics = null;
    }
    if (this.healthBar) {
      this.healthBar.destroy();
      this.healthBar = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
