import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';
import { ActiveItem, ActiveItemType, ActiveItemRarity } from './ActiveItem';
import { BALANCE } from '@config/balance';

const CONFIG = BALANCE.activeItems.turret;

/**
 * Tourelle portable
 *
 * Une tourelle automatique qui tire sur les zombies proches.
 * - Durée: 30 secondes
 * - Santé: 100 HP (peut être détruite)
 * - Détecte les zombies dans un rayon de 200px
 * - Tir automatique avec dégâts = 50% du pistolet
 * - Limite: 1 tourelle active à la fois
 */
export class PortableTurret extends ActiveItem {
  public readonly type: ActiveItemType = 'turret';
  public readonly rarity: ActiveItemRarity = CONFIG.rarity;
  public readonly color: number = CONFIG.color;
  public readonly name: string = 'Tourelle Portable';
  public readonly description: string = 'Tire automatiquement sur les zombies proches pendant 30s';

  // Configuration
  private readonly detectionRadius: number = CONFIG.detectionRadius;
  private readonly fireRate: number = CONFIG.fireRate;
  private readonly damage: number = CONFIG.damage;
  private readonly maxHealth: number = CONFIG.health;

  // État
  private health: number = CONFIG.health;
  private lastFireTime: number = 0;
  private currentTarget: Zombie | null = null;
  private angle: number = 0;

  // Visuels
  private container: Phaser.GameObjects.Container | null = null;
  private baseGraphics: Phaser.GameObjects.Graphics | null = null;
  private turretGraphics: Phaser.GameObjects.Graphics | null = null;
  private rangeCircle: Phaser.GameObjects.Graphics | null = null;
  private healthBar: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super();
    this.duration = CONFIG.duration;
    this.timeRemaining = this.duration;
  }

  /**
   * Déploie la tourelle à une position
   */
  protected onDeploy(
    _player: Player,
    scene: GameScene,
    x: number,
    y: number
  ): boolean {
    // Créer le conteneur pour tous les éléments visuels
    this.container = scene.add.container(x, y);

    // Cercle de portée (optionnel, pour debug)
    this.rangeCircle = scene.add.graphics();
    this.rangeCircle.lineStyle(1, 0x00ff00, 0.2);
    this.rangeCircle.strokeCircle(0, 0, this.detectionRadius);
    this.container.add(this.rangeCircle);
    this.rangeCircle.setVisible(false);

    // Base de la tourelle
    this.baseGraphics = scene.add.graphics();
    this.baseGraphics.fillStyle(0x444444, 1);
    this.baseGraphics.fillCircle(0, 0, 16);
    this.baseGraphics.fillStyle(0x666666, 1);
    this.baseGraphics.fillCircle(0, 0, 12);
    this.container.add(this.baseGraphics);

    // Canon de la tourelle (rectangle qui tourne)
    this.turretGraphics = scene.add.graphics();
    this.drawTurretCannon();
    this.container.add(this.turretGraphics);

    // Barre de vie
    this.healthBar = scene.add.graphics();
    this.updateHealthBar();
    this.container.add(this.healthBar);

    // Animation de déploiement
    this.container.setScale(0);
    scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    return true;
  }

  /**
   * Met à jour la tourelle
   */
  protected onUpdate(
    delta: number,
    _player: Player,
    scene: GameScene
  ): boolean {
    if (!this.container) return false;

    // Vérifier si la tourelle est détruite
    if (this.health <= 0) {
      this.createDestructionEffect(scene);
      return false;
    }

    // Chercher une cible
    this.findTarget(scene);

    // Si on a une cible, viser et tirer
    if (this.currentTarget && this.currentTarget.active) {
      this.aimAtTarget();
      this.tryFire(scene, delta);
    }

    // Rotation lente si pas de cible
    if (!this.currentTarget) {
      this.angle += delta * 0.001;
      this.drawTurretCannon();
    }

    return true;
  }

  /**
   * Détruit la tourelle
   */
  protected onDestroy(_player: Player, scene: GameScene): void {
    // Animation de destruction
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
   * Cherche le zombie le plus proche dans le rayon de détection
   */
  private findTarget(scene: GameScene): void {
    // Vérifier si la cible actuelle est toujours valide
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

    // Chercher une nouvelle cible si nécessaire
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
   * Vise la cible actuelle
   */
  private aimAtTarget(): void {
    if (!this.currentTarget) return;

    const targetAngle = Phaser.Math.Angle.Between(
      this.position.x,
      this.position.y,
      this.currentTarget.x,
      this.currentTarget.y
    );

    // Rotation fluide vers la cible
    const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - this.angle);
    this.angle += angleDiff * 0.2;

    this.drawTurretCannon();
  }

  /**
   * Tente de tirer si le cooldown est écoulé
   */
  private tryFire(scene: GameScene, delta: number): void {
    this.lastFireTime += delta;

    if (this.lastFireTime >= this.fireRate && this.currentTarget) {
      this.lastFireTime = 0;
      this.fire(scene);
    }
  }

  /**
   * Tire une balle vers la cible
   */
  private fire(scene: GameScene): void {
    if (!this.currentTarget || !this.container) return;

    // Position du canon
    const cannonLength = 20;
    const bulletX = this.position.x + Math.cos(this.angle) * cannonLength;
    const bulletY = this.position.y + Math.sin(this.angle) * cannonLength;

    // Créer une balle visuelle
    const bullet = scene.add.circle(bulletX, bulletY, 3, 0xffff00);

    // Calculer la direction vers la cible
    const targetX = this.currentTarget.x;
    const targetY = this.currentTarget.y;
    const speed = 600;

    // Animation du projectile
    const distance = Phaser.Math.Distance.Between(bulletX, bulletY, targetX, targetY);
    const duration = (distance / speed) * 1000;

    scene.tweens.add({
      targets: bullet,
      x: targetX,
      y: targetY,
      duration: duration,
      onComplete: () => {
        // Infliger des dégâts si la cible est toujours là
        if (this.currentTarget && this.currentTarget.active) {
          this.currentTarget.takeDamage(this.damage);
          this.createImpactEffect(scene, targetX, targetY);
        }
        bullet.destroy();
      },
    });

    // Effet de recul sur le canon
    if (this.turretGraphics) {
      scene.tweens.add({
        targets: this.turretGraphics,
        x: -3,
        duration: 50,
        yoyo: true,
      });
    }

    // Flash de tir
    this.createMuzzleFlash(scene);
  }

  /**
   * Dessine le canon de la tourelle
   */
  private drawTurretCannon(): void {
    if (!this.turretGraphics) return;

    this.turretGraphics.clear();
    this.turretGraphics.fillStyle(0x888888, 1);

    // Canon (rectangle tourné)
    const cannonLength = 20;
    const cannonWidth = 6;

    // Dessiner le canon comme un rectangle pivoté
    this.turretGraphics.save();
    this.turretGraphics.translateCanvas(0, 0);
    this.turretGraphics.rotateCanvas(this.angle);

    this.turretGraphics.fillRect(0, -cannonWidth / 2, cannonLength, cannonWidth);

    // Bout du canon plus large
    this.turretGraphics.fillRect(cannonLength - 4, -cannonWidth / 2 - 2, 4, cannonWidth + 4);

    this.turretGraphics.restore();
  }

  /**
   * Met à jour la barre de vie
   */
  private updateHealthBar(): void {
    if (!this.healthBar) return;

    this.healthBar.clear();

    const barWidth = 24;
    const barHeight = 4;
    const yOffset = -25;

    // Fond
    this.healthBar.fillStyle(0x333333, 1);
    this.healthBar.fillRect(-barWidth / 2, yOffset, barWidth, barHeight);

    // Vie
    const healthPercent = this.health / this.maxHealth;
    const healthColor = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000;
    this.healthBar.fillStyle(healthColor, 1);
    this.healthBar.fillRect(-barWidth / 2, yOffset, barWidth * healthPercent, barHeight);
  }

  /**
   * Crée un effet d'impact
   */
  private createImpactEffect(scene: GameScene, x: number, y: number): void {
    const impact = scene.add.circle(x, y, 8, 0xffff00, 1);
    scene.tweens.add({
      targets: impact,
      alpha: 0,
      scale: 2,
      duration: 100,
      onComplete: () => impact.destroy(),
    });
  }

  /**
   * Crée un flash de tir
   */
  private createMuzzleFlash(scene: GameScene): void {
    const flashX = this.position.x + Math.cos(this.angle) * 22;
    const flashY = this.position.y + Math.sin(this.angle) * 22;

    const flash = scene.add.circle(flashX, flashY, 6, 0xffaa00, 1);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 0.5,
      duration: 50,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Crée un effet de destruction
   */
  private createDestructionEffect(scene: GameScene): void {
    // Explosion visuelle
    const explosion = scene.add.circle(this.position.x, this.position.y, 20, 0xff6600, 0.8);
    scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 3,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // Particules de débris
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const debris = scene.add.rectangle(
        this.position.x,
        this.position.y,
        4,
        4,
        0x666666
      );

      scene.tweens.add({
        targets: debris,
        x: this.position.x + Math.cos(angle) * 40,
        y: this.position.y + Math.sin(angle) * 40,
        alpha: 0,
        rotation: Math.random() * 4,
        duration: 400,
        onComplete: () => debris.destroy(),
      });
    }
  }

  /**
   * Inflige des dégâts à la tourelle
   */
  public takeDamage(amount: number): void {
    this.health -= amount;
    this.updateHealthBar();

    // Effet de dégât
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
   * Récupère la santé actuelle
   */
  public getHealth(): number {
    return this.health;
  }

  /**
   * Nettoie les ressources visuelles
   */
  private cleanup(): void {
    if (this.rangeCircle) {
      this.rangeCircle.destroy();
      this.rangeCircle = null;
    }
    if (this.baseGraphics) {
      this.baseGraphics.destroy();
      this.baseGraphics = null;
    }
    if (this.turretGraphics) {
      this.turretGraphics.destroy();
      this.turretGraphics = null;
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
