import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration de l'arc composite
 */
const BOW_CONFIG: WeaponConfig = {
  name: 'Arc Composite',
  damage: BALANCE.weapons.compositeBow.damageMin, // Dégâts min par défaut
  fireRate: 100, // Pas de limite, c'est le système de charge qui gère
  maxAmmo: BALANCE.weapons.compositeBow.magazineSize,
  reloadTime: BALANCE.weapons.compositeBow.reloadTime,
  bulletSpeed: BALANCE.weapons.compositeBow.bulletSpeed,
  spread: 0,
};

/**
 * Arc Composite
 * - Silencieux (n'alerte pas les zombies)
 * - Système de charge (hold pour plus de dégâts)
 * - Dégâts min/max selon temps de charge
 */
export class CompositeBow extends Weapon {
  private damageMin: number;
  private damageMax: number;
  private chargeTime: number;

  private isCharging: boolean = false;
  private chargeStartTime: number = 0;
  private chargeGraphics: Phaser.GameObjects.Graphics;

  /** Callback pour écouter le relâchement du clic */
  private pointerUpHandler: (pointer: Phaser.Input.Pointer) => void;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, BOW_CONFIG);

    this.damageMin = BALANCE.weapons.compositeBow.damageMin;
    this.damageMax = BALANCE.weapons.compositeBow.damageMax;
    this.chargeTime = BALANCE.weapons.compositeBow.chargeTime;

    // Graphique pour la barre de charge
    this.chargeGraphics = scene.add.graphics();
    this.chargeGraphics.setDepth(20);

    // Écouter le relâchement du clic
    this.pointerUpHandler = (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonReleased() && this.isCharging) {
        this.releaseArrow();
      }
    };
    scene.input.on('pointerup', this.pointerUpHandler);
  }

  /**
   * Override de fire pour démarrer la charge
   */
  public override fire(direction: Phaser.Math.Vector2): boolean {
    if (this.isReloading) return false;
    if (this.currentAmmo <= 0) {
      this.reload();
      return false;
    }

    // Si pas déjà en charge, commencer
    if (!this.isCharging) {
      this.startCharge();
    }

    // Stocker la direction actuelle
    this.owner.setData('bowDirection', direction);

    return true;
  }

  /**
   * Démarre la charge
   */
  private startCharge(): void {
    this.isCharging = true;
    this.chargeStartTime = this.scene.time.now;
    this.canFire = false;
  }

  /**
   * Relâche la flèche
   */
  private releaseArrow(): void {
    if (!this.isCharging) return;

    const now = this.scene.time.now;
    const chargeDuration = now - this.chargeStartTime;
    const chargePercent = Math.min(1, chargeDuration / this.chargeTime);

    // Calculer les dégâts en fonction de la charge
    const damage = this.damageMin + (this.damageMax - this.damageMin) * chargePercent;

    // Calculer la vitesse en fonction de la charge
    const speed = this.config.bulletSpeed * (0.6 + chargePercent * 0.4);

    // Récupérer la direction
    const direction = this.owner.getData('bowDirection') as Phaser.Math.Vector2;

    if (direction) {
      // Créer la flèche
      this.createArrow(direction, damage, speed, chargePercent);
      this.currentAmmo--;
    }

    // Reset
    this.isCharging = false;
    this.chargeGraphics.clear();
    this.canFire = true;
  }

  /**
   * Crée une flèche
   */
  private createArrow(
    direction: Phaser.Math.Vector2,
    damage: number,
    speed: number,
    chargePercent: number
  ): void {
    const offset = 25;
    const startX = this.owner.x + direction.x * offset;
    const startY = this.owner.y + direction.y * offset;

    const bullet = this.scene.bulletPool.get(
      startX,
      startY,
      direction,
      speed,
      damage,
      chargePercent >= 0.8 // Perforant si charge >= 80%
    );

    if (bullet) {
      // Marquer comme flèche silencieuse
      bullet.setData('silent', true);
      bullet.setData('chargePercent', chargePercent);

      // Couleur selon la charge
      if (chargePercent >= 0.8) {
        bullet.setTint(0xff8800); // Orange pour charge max
      } else if (chargePercent >= 0.5) {
        bullet.setTint(0xffcc00); // Jaune pour charge moyenne
      } else {
        bullet.setTint(0x88ff88); // Vert pour charge faible
      }
    }

    // Effet de tir silencieux (pas de flash visible)
    this.createSilentFireEffect(startX, startY, chargePercent);
  }

  /**
   * Effet de tir silencieux
   */
  private createSilentFireEffect(x: number, y: number, chargePercent: number): void {
    // Petit whoosh visuel
    const size = 5 + chargePercent * 10;
    const trail = this.scene.add.circle(x, y, size, 0x88ff88, 0.4);

    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 1.5,
      duration: 150,
      onComplete: () => trail.destroy(),
    });
  }

  /**
   * Override de update pour dessiner la barre de charge
   */
  public override update(): void {
    if (this.isCharging) {
      this.drawChargeIndicator();
    }
  }

  /**
   * Dessine l'indicateur de charge
   */
  private drawChargeIndicator(): void {
    const now = this.scene.time.now;
    const chargeDuration = now - this.chargeStartTime;
    const chargePercent = Math.min(1, chargeDuration / this.chargeTime);

    this.chargeGraphics.clear();

    // Position au-dessus du joueur
    const barWidth = 40;
    const barHeight = 6;
    const x = this.owner.x - barWidth / 2;
    const y = this.owner.y - 40;

    // Fond
    this.chargeGraphics.fillStyle(0x333333, 0.8);
    this.chargeGraphics.fillRect(x, y, barWidth, barHeight);

    // Barre de progression
    let color = 0x00ff00; // Vert
    if (chargePercent >= 0.8) {
      color = 0xff8800; // Orange - charge max
    } else if (chargePercent >= 0.5) {
      color = 0xffff00; // Jaune
    }

    this.chargeGraphics.fillStyle(color, 1);
    this.chargeGraphics.fillRect(x, y, barWidth * chargePercent, barHeight);

    // Bordure
    this.chargeGraphics.lineStyle(1, 0xffffff, 0.8);
    this.chargeGraphics.strokeRect(x, y, barWidth, barHeight);

    // Indicateur de seuil de perforation (80%)
    this.chargeGraphics.lineStyle(2, 0xff0000, 0.8);
    this.chargeGraphics.beginPath();
    this.chargeGraphics.moveTo(x + barWidth * 0.8, y);
    this.chargeGraphics.lineTo(x + barWidth * 0.8, y + barHeight);
    this.chargeGraphics.strokePath();
  }

  /**
   * Override de createProjectile (pas utilisé directement)
   */
  protected override createProjectile(_direction: Phaser.Math.Vector2): void {
    // Non utilisé - la création de flèche est gérée par releaseArrow
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.scene.input.off('pointerup', this.pointerUpHandler);
    this.chargeGraphics?.destroy();
  }
}
