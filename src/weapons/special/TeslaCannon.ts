import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration du canon Tesla
 */
const TESLA_CONFIG: WeaponConfig = {
  name: 'Canon Tesla',
  damage: BALANCE.weapons.teslaCannon.damage,
  fireRate: BALANCE.weapons.teslaCannon.fireRate,
  maxAmmo: BALANCE.weapons.teslaCannon.magazineSize,
  reloadTime: BALANCE.weapons.teslaCannon.reloadTime,
  bulletSpeed: 0, // Pas de projectile
};

/**
 * Canon Tesla
 * - Arc électrique primaire vers la cible la plus proche
 * - Chain vers les ennemis proches (max chainCount cibles)
 * - Révèle les zombies invisibles
 */
export class TeslaCannon extends Weapon {
  private range: number;
  private chainCount: number;
  private chainRange: number;
  private chainDamageFalloff: number;

  /** Graphique pour les arcs électriques */
  private lightningGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, TESLA_CONFIG);

    this.range = BALANCE.weapons.teslaCannon.range;
    this.chainCount = BALANCE.weapons.teslaCannon.chainCount;
    this.chainRange = BALANCE.weapons.teslaCannon.chainRange;
    this.chainDamageFalloff = BALANCE.weapons.teslaCannon.chainDamageFalloff;

    // Créer les graphiques pour l'éclair
    this.lightningGraphics = scene.add.graphics();
    this.lightningGraphics.setDepth(15);
  }

  /**
   * Override de fire pour créer un arc électrique
   */
  public override fire(direction: Phaser.Math.Vector2): boolean {
    const now = this.scene.time.now;

    if (!this.canFire || this.isReloading) return false;
    if (this.currentAmmo <= 0) {
      this.reload();
      return false;
    }
    if (now - this.lastFireTime < this.config.fireRate) return false;

    this.lastFireTime = now;
    this.currentAmmo--;

    // Trouver la cible primaire
    const primaryTarget = this.findPrimaryTarget(direction);

    if (primaryTarget) {
      // Effectuer l'attaque avec chaîne
      this.performChainAttack(primaryTarget);
    } else {
      // Pas de cible - afficher un arc dans le vide
      this.drawMissedArc(direction);
    }

    return true;
  }

  /**
   * Trouve la cible primaire dans la direction visée
   */
  private findPrimaryTarget(direction: Phaser.Math.Vector2): Zombie | null {
    const activeZombies = this.scene.getActiveZombies();
    const centerAngle = Math.atan2(direction.y, direction.x);
    const halfArc = Phaser.Math.DegToRad(30); // Cône de 60°

    let closestZombie: Zombie | null = null;
    let closestDistance = this.range;

    for (const zombie of activeZombies) {
      if (!zombie.active) continue;

      const dx = zombie.x - this.owner.x;
      const dy = zombie.y - this.owner.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.range) continue;

      // Vérifier si dans le cône
      const angleToZombie = Math.atan2(dy, dx);
      let angleDiff = angleToZombie - centerAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= halfArc && distance < closestDistance) {
        closestZombie = zombie;
        closestDistance = distance;
      }
    }

    return closestZombie;
  }

  /**
   * Effectue l'attaque en chaîne
   */
  private performChainAttack(primaryTarget: Zombie): void {
    const hitTargets: Zombie[] = [primaryTarget];
    let currentDamage = this.config.damage;

    // Infliger les dégâts à la cible primaire
    primaryTarget.takeDamage(currentDamage);
    this.revealInvisible(primaryTarget);

    // Dessiner l'arc vers la cible primaire
    this.drawLightningArc(this.owner.x, this.owner.y, primaryTarget.x, primaryTarget.y, 0);

    // Chercher des cibles secondaires
    let lastTarget = primaryTarget;
    for (let i = 1; i < this.chainCount; i++) {
      currentDamage *= this.chainDamageFalloff;

      const nextTarget = this.findNextChainTarget(lastTarget, hitTargets);
      if (!nextTarget) break;

      hitTargets.push(nextTarget);
      nextTarget.takeDamage(currentDamage);
      this.revealInvisible(nextTarget);

      // Dessiner l'arc de chaîne
      this.drawLightningArc(lastTarget.x, lastTarget.y, nextTarget.x, nextTarget.y, i);

      lastTarget = nextTarget;
    }

    // Nettoyer les graphiques après un délai
    this.scene.time.delayedCall(200, () => {
      this.lightningGraphics.clear();
    });
  }

  /**
   * Trouve la prochaine cible pour la chaîne
   */
  private findNextChainTarget(fromTarget: Zombie, alreadyHit: Zombie[]): Zombie | null {
    const activeZombies = this.scene.getActiveZombies();
    let closestZombie: Zombie | null = null;
    let closestDistance = this.chainRange;

    for (const zombie of activeZombies) {
      if (!zombie.active) continue;
      if (alreadyHit.includes(zombie)) continue;

      const distance = Phaser.Math.Distance.Between(
        fromTarget.x,
        fromTarget.y,
        zombie.x,
        zombie.y
      );

      if (distance < closestDistance) {
        closestZombie = zombie;
        closestDistance = distance;
      }
    }

    return closestZombie;
  }

  /**
   * Dessine un arc électrique entre deux points
   */
  private drawLightningArc(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    chainIndex: number
  ): void {
    // Couleur qui s'atténue avec chaque chaîne
    const alpha = 1 - chainIndex * 0.15;
    const color = chainIndex === 0 ? 0x00ffff : 0x8888ff;

    this.lightningGraphics.lineStyle(4 - chainIndex * 0.5, color, alpha);

    // Dessiner un éclair en zigzag
    const segments = 8;
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;

    this.lightningGraphics.beginPath();
    this.lightningGraphics.moveTo(x1, y1);

    for (let i = 1; i < segments; i++) {
      const jitterX = (Math.random() - 0.5) * 30;
      const jitterY = (Math.random() - 0.5) * 30;
      this.lightningGraphics.lineTo(x1 + dx * i + jitterX, y1 + dy * i + jitterY);
    }

    this.lightningGraphics.lineTo(x2, y2);
    this.lightningGraphics.strokePath();

    // Branches secondaires
    if (chainIndex === 0) {
      this.drawSecondaryBranches(x1, y1, x2, y2);
    }

    // Effet de flash à l'impact
    const flash = this.scene.add.circle(x2, y2, 15, color, 0.8);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 150,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Dessine des branches secondaires d'éclair
   */
  private drawSecondaryBranches(x1: number, y1: number, x2: number, y2: number): void {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const length = 20 + Math.random() * 30;
      const endX = midX + Math.cos(angle) * length;
      const endY = midY + Math.sin(angle) * length;

      this.lightningGraphics.lineStyle(2, 0x00ffff, 0.5);
      this.lightningGraphics.beginPath();
      this.lightningGraphics.moveTo(midX, midY);
      this.lightningGraphics.lineTo(endX, endY);
      this.lightningGraphics.strokePath();
    }
  }

  /**
   * Dessine un arc qui rate (pas de cible)
   */
  private drawMissedArc(direction: Phaser.Math.Vector2): void {
    const endX = this.owner.x + direction.x * this.range;
    const endY = this.owner.y + direction.y * this.range;

    this.lightningGraphics.lineStyle(3, 0x4444ff, 0.5);
    this.lightningGraphics.beginPath();
    this.lightningGraphics.moveTo(this.owner.x, this.owner.y);

    const segments = 6;
    const dx = (endX - this.owner.x) / segments;
    const dy = (endY - this.owner.y) / segments;

    for (let i = 1; i <= segments; i++) {
      const jitterX = (Math.random() - 0.5) * 20;
      const jitterY = (Math.random() - 0.5) * 20;
      this.lightningGraphics.lineTo(
        this.owner.x + dx * i + jitterX,
        this.owner.y + dy * i + jitterY
      );
    }

    this.lightningGraphics.strokePath();

    this.scene.time.delayedCall(150, () => {
      this.lightningGraphics.clear();
    });
  }

  /**
   * Révèle un zombie invisible
   */
  private revealInvisible(zombie: Zombie): void {
    if (zombie.zombieType === 'invisible') {
      zombie.setData('revealed', true);
      zombie.setAlpha(1);

      // Effet électrique persistant
      zombie.setTint(0x8888ff);
      this.scene.time.delayedCall(500, () => {
        if (zombie.active) {
          zombie.clearTint();
        }
      });
    }
  }

  /**
   * Ne crée pas de projectile (override vide)
   */
  protected override createProjectile(_direction: Phaser.Math.Vector2): void {
    // Le canon Tesla n'utilise pas de projectiles
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.lightningGraphics?.destroy();
  }
}
