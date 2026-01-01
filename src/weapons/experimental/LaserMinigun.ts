import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration du Laser Minigun
 */
const LASER_MINIGUN_CONFIG: WeaponConfig = {
  name: 'Laser Minigun',
  damage: BALANCE.weapons.laserMinigun.damagePerSecond / 60, // Dégâts par frame
  fireRate: 16, // Tir continu (~60fps)
  maxAmmo: BALANCE.weapons.laserMinigun.maxEnergy,
  reloadTime: BALANCE.weapons.laserMinigun.rechargeTime,
  bulletSpeed: 0, // Pas de projectile
};

/**
 * Laser Minigun - Arme Expérimentale
 * - Faisceau laser continu qui balaye les ennemis
 * - Temps de chauffe avant le tir max
 * - Surchauffe si utilisé trop longtemps
 * - Déblocage : Achat 10000pts
 */
export class LaserMinigun extends Weapon {
  private range: number;
  private beamWidth: number;
  private damagePerSecond: number;
  private warmupTime: number;
  private overheatTime: number;
  private cooldownRate: number;

  /** État du laser */
  private isFiring: boolean = false;
  private currentHeat: number = 0;
  private isOverheated: boolean = false;
  private warmupProgress: number = 0;
  private currentAngle: number = 0;

  /** Graphiques */
  private laserGraphics: Phaser.GameObjects.Graphics;
  private heatBarGraphics: Phaser.GameObjects.Graphics;

  /** Zombies touchés ce frame (pour éviter les doubles dégâts) */
  private hitZombiesThisFrame: Set<Zombie> = new Set();

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, LASER_MINIGUN_CONFIG);

    this.range = BALANCE.weapons.laserMinigun.range;
    this.beamWidth = BALANCE.weapons.laserMinigun.beamWidth;
    this.damagePerSecond = BALANCE.weapons.laserMinigun.damagePerSecond;
    this.warmupTime = BALANCE.weapons.laserMinigun.warmupTime;
    this.overheatTime = BALANCE.weapons.laserMinigun.overheatTime;
    this.cooldownRate = BALANCE.weapons.laserMinigun.cooldownRate;

    this.laserGraphics = scene.add.graphics();
    this.laserGraphics.setDepth(15);

    this.heatBarGraphics = scene.add.graphics();
    this.heatBarGraphics.setDepth(25);
  }

  /**
   * Override de fire pour le tir continu
   */
  public override fire(direction: Phaser.Math.Vector2): boolean {
    // Vérifier la surchauffe
    if (this.isOverheated) {
      return false;
    }

    if (this.isReloading) {
      return false;
    }

    if (this.currentAmmo <= 0) {
      this.reload();
      return false;
    }

    this.isFiring = true;
    this.currentAngle = Math.atan2(direction.y, direction.x);

    // Augmenter le warmup
    if (this.warmupProgress < 1) {
      this.warmupProgress += 16 / this.warmupTime;
      if (this.warmupProgress > 1) this.warmupProgress = 1;
    }

    // Consommer l'énergie
    const energyCost = BALANCE.weapons.laserMinigun.energyPerSecond * 0.016;
    this.currentAmmo -= energyCost;

    // Augmenter la chaleur
    this.currentHeat += 16 / this.overheatTime;
    if (this.currentHeat >= 1) {
      this.triggerOverheat();
      return false;
    }

    // Infliger les dégâts si warmup complet
    if (this.warmupProgress >= 0.5) {
      this.fireLaser();
    }

    return true;
  }

  /**
   * Tire le laser et inflige des dégâts
   */
  private fireLaser(): void {
    this.hitZombiesThisFrame.clear();

    const activeZombies = this.scene.getActiveZombies();
    const damageThisFrame = (this.damagePerSecond * this.warmupProgress) / 60;

    // Calculer la ligne du laser
    const endX = this.owner.x + Math.cos(this.currentAngle) * this.range;
    const endY = this.owner.y + Math.sin(this.currentAngle) * this.range;

    // Vérifier les zombies sur le trajet
    for (const zombie of activeZombies) {
      if (!zombie.active) continue;
      if (this.hitZombiesThisFrame.has(zombie)) continue;

      // Distance du zombie à la ligne du laser
      const distToLine = this.pointToLineDistance(
        zombie.x,
        zombie.y,
        this.owner.x,
        this.owner.y,
        endX,
        endY
      );

      // Vérifier si le zombie est sur la ligne
      const zombieRadius = 16;
      const effectiveWidth = (this.beamWidth / 2) * this.warmupProgress;

      if (distToLine <= effectiveWidth + zombieRadius) {
        // Vérifier si le zombie est dans la portée
        const distToOwner = Phaser.Math.Distance.Between(
          this.owner.x,
          this.owner.y,
          zombie.x,
          zombie.y
        );

        if (distToOwner <= this.range) {
          zombie.takeDamage(damageThisFrame);
          this.hitZombiesThisFrame.add(zombie);

          // Effet visuel d'impact
          this.createHitEffect(zombie);
        }
      }
    }
  }

  /**
   * Calcule la distance d'un point à une ligne
   */
  private pointToLineDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Déclenche la surchauffe
   */
  private triggerOverheat(): void {
    this.isOverheated = true;
    this.isFiring = false;
    this.warmupProgress = 0;

    // Texte d'avertissement
    const warningText = this.scene.add.text(
      this.owner.x,
      this.owner.y - 50,
      'SURCHAUFFE!',
      {
        fontSize: '14px',
        color: '#ff4444',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }
    );
    warningText.setOrigin(0.5);
    warningText.setDepth(30);

    this.scene.tweens.add({
      targets: warningText,
      y: warningText.y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => warningText.destroy(),
    });

    // Effet de fumée
    for (let i = 0; i < 10; i++) {
      const smoke = this.scene.add.circle(
        this.owner.x + (Math.random() - 0.5) * 30,
        this.owner.y + (Math.random() - 0.5) * 30,
        5 + Math.random() * 8,
        0x444444,
        0.6
      );
      smoke.setDepth(12);

      this.scene.tweens.add({
        targets: smoke,
        y: smoke.y - 40,
        scale: 2,
        alpha: 0,
        duration: 800 + Math.random() * 400,
        onComplete: () => smoke.destroy(),
      });
    }
  }

  /**
   * Crée un effet d'impact sur un zombie
   */
  private createHitEffect(zombie: Zombie): void {
    // Flash sur le zombie
    zombie.setTint(0xff4400);
    this.scene.time.delayedCall(50, () => {
      if (zombie.active) {
        zombie.clearTint();
      }
    });

    // Étincelles
    if (Math.random() < 0.3) {
      const spark = this.scene.add.circle(
        zombie.x + (Math.random() - 0.5) * 20,
        zombie.y + (Math.random() - 0.5) * 20,
        3,
        0xffaa00,
        1
      );
      spark.setDepth(14);

      this.scene.tweens.add({
        targets: spark,
        scale: 0,
        duration: 150,
        onComplete: () => spark.destroy(),
      });
    }
  }

  /**
   * Mise à jour du laser
   */
  public override update(): void {
    // Refroidissement
    if (!this.isFiring) {
      this.warmupProgress -= 0.02;
      if (this.warmupProgress < 0) this.warmupProgress = 0;

      this.currentHeat -= this.cooldownRate * 0.016;
      if (this.currentHeat < 0) {
        this.currentHeat = 0;
        if (this.isOverheated && this.currentHeat <= 0) {
          this.isOverheated = false;
        }
      }
    }

    // Dessiner le laser
    this.drawLaser();

    // Dessiner la barre de chaleur
    this.drawHeatBar();

    // Reset de l'état de tir (sera réactivé par fire())
    this.isFiring = false;
  }

  /**
   * Dessine le faisceau laser
   */
  private drawLaser(): void {
    this.laserGraphics.clear();

    if (this.warmupProgress <= 0) return;

    const endX = this.owner.x + Math.cos(this.currentAngle) * this.range;
    const endY = this.owner.y + Math.sin(this.currentAngle) * this.range;

    // Couleur basée sur la chaleur
    let color: number;
    if (this.warmupProgress < 0.5) {
      color = 0xff8800; // Orange (warmup)
    } else if (this.currentHeat > 0.8) {
      color = 0xff0000; // Rouge (proche surchauffe)
    } else {
      color = 0xff4400; // Rouge-orange (normal)
    }

    // Faisceau principal
    const width = this.beamWidth * this.warmupProgress;

    // Glow externe
    this.laserGraphics.lineStyle(width + 10, color, 0.2);
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(this.owner.x, this.owner.y);
    this.laserGraphics.lineTo(endX, endY);
    this.laserGraphics.strokePath();

    // Faisceau moyen
    this.laserGraphics.lineStyle(width + 4, color, 0.5);
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(this.owner.x, this.owner.y);
    this.laserGraphics.lineTo(endX, endY);
    this.laserGraphics.strokePath();

    // Coeur du faisceau (blanc)
    this.laserGraphics.lineStyle(width, 0xffffff, 0.8);
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(this.owner.x, this.owner.y);
    this.laserGraphics.lineTo(endX, endY);
    this.laserGraphics.strokePath();

    // Point d'impact
    const impactFlash = 10 + Math.sin(this.scene.time.now / 30) * 5;
    this.laserGraphics.fillStyle(0xffffff, 0.8);
    this.laserGraphics.fillCircle(endX, endY, impactFlash * this.warmupProgress);

    // Effet de vibration si proche de la surchauffe
    if (this.currentHeat > 0.7) {
      const jitter = (this.currentHeat - 0.7) * 10;
      this.laserGraphics.x = (Math.random() - 0.5) * jitter;
      this.laserGraphics.y = (Math.random() - 0.5) * jitter;
    } else {
      this.laserGraphics.x = 0;
      this.laserGraphics.y = 0;
    }
  }

  /**
   * Dessine la barre de chaleur
   */
  private drawHeatBar(): void {
    this.heatBarGraphics.clear();

    if (this.currentHeat <= 0 && !this.isOverheated) return;

    const barWidth = 50;
    const barHeight = 6;
    const barX = this.owner.x - barWidth / 2;
    const barY = this.owner.y - 45;

    // Fond
    this.heatBarGraphics.fillStyle(0x333333, 0.8);
    this.heatBarGraphics.fillRect(barX, barY, barWidth, barHeight);

    // Barre de chaleur
    let heatColor: number;
    if (this.isOverheated) {
      // Clignotement rouge
      heatColor = Math.sin(this.scene.time.now / 100) > 0 ? 0xff0000 : 0xff4444;
    } else if (this.currentHeat > 0.8) {
      heatColor = 0xff0000;
    } else if (this.currentHeat > 0.5) {
      heatColor = 0xff8800;
    } else {
      heatColor = 0xffcc00;
    }

    this.heatBarGraphics.fillStyle(heatColor, 1);
    this.heatBarGraphics.fillRect(barX, barY, barWidth * this.currentHeat, barHeight);

    // Bordure
    this.heatBarGraphics.lineStyle(1, 0xffffff, 0.8);
    this.heatBarGraphics.strokeRect(barX, barY, barWidth, barHeight);

    // Note: L'icône de chaleur serait '🔥' ou '🌡️' mais Graphics ne supporte pas le texte
  }

  /**
   * Appelé quand le joueur relâche le tir
   */
  public stopFiring(): void {
    this.isFiring = false;
  }

  /**
   * Retourne l'état de surchauffe
   */
  public isWeaponOverheated(): boolean {
    return this.isOverheated;
  }

  /**
   * Retourne le niveau de chaleur (0-1)
   */
  public getHeatLevel(): number {
    return this.currentHeat;
  }

  /**
   * Override createProjectile (non utilisé)
   */
  protected override createProjectile(_direction: Phaser.Math.Vector2): void {
    // Le laser ne crée pas de projectiles
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.laserGraphics?.destroy();
    this.heatBarGraphics?.destroy();
  }
}
