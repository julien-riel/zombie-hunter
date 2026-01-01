import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration du Freeze Ray
 */
const FREEZE_RAY_CONFIG: WeaponConfig = {
  name: 'Rayon Glacial',
  damage: BALANCE.weapons.freezeRay.damage,
  fireRate: BALANCE.weapons.freezeRay.fireRate,
  maxAmmo: BALANCE.weapons.freezeRay.magazineSize,
  reloadTime: BALANCE.weapons.freezeRay.reloadTime,
  bulletSpeed: BALANCE.weapons.freezeRay.projectileSpeed,
};

/**
 * Freeze Ray - Arme Expérimentale
 * - Tire un projectile de glace qui gèle les ennemis
 * - Les ennemis gelés sont ralentis et vulnérables à la mêlée
 * - Effet de chaîne : le gel se propage aux ennemis proches
 * - Déblocage : Vague 20+
 */
export class FreezeRay extends Weapon {
  private freezeDuration: number;
  private freezeSlowFactor: number;
  private chainRadius: number;
  private chainChance: number;
  private meleeBonusDamage: number;

  /** Graphiques pour les effets visuels */
  private effectGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, FREEZE_RAY_CONFIG);

    this.freezeDuration = BALANCE.weapons.freezeRay.freezeDuration;
    this.freezeSlowFactor = BALANCE.weapons.freezeRay.freezeSlowFactor;
    this.chainRadius = BALANCE.weapons.freezeRay.chainRadius;
    this.chainChance = BALANCE.weapons.freezeRay.chainChance;
    this.meleeBonusDamage = BALANCE.weapons.freezeRay.meleeBonusDamage;

    this.effectGraphics = scene.add.graphics();
    this.effectGraphics.setDepth(15);
  }

  /**
   * Crée le projectile de glace
   */
  protected override createProjectile(direction: Phaser.Math.Vector2): void {
    const startX = this.owner.x;
    const startY = this.owner.y;

    // Créer le projectile de glace
    const iceProjectile = this.scene.add.circle(startX, startY, 8, 0x00ccff, 1);
    iceProjectile.setDepth(10);

    // Ajouter une lueur autour du projectile
    const glow = this.scene.add.circle(startX, startY, 16, 0x88eeff, 0.3);
    glow.setDepth(9);

    // Particules de givre qui suivent
    const particles: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 5; i++) {
      const particle = this.scene.add.circle(
        startX,
        startY,
        2 + Math.random() * 3,
        0xffffff,
        0.6
      );
      particle.setDepth(9);
      particles.push(particle);
    }

    const velocity = {
      x: direction.x * this.config.bulletSpeed,
      y: direction.y * this.config.bulletSpeed,
    };

    let distanceTraveled = 0;
    const maxDistance = BALANCE.weapons.freezeRay.range;

    // Mise à jour du projectile
    const updateEvent = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!iceProjectile.active) return;

        // Déplacer le projectile
        iceProjectile.x += velocity.x * 0.016;
        iceProjectile.y += velocity.y * 0.016;
        glow.x = iceProjectile.x;
        glow.y = iceProjectile.y;

        // Mettre à jour les particules
        particles.forEach((p, i) => {
          p.x = iceProjectile.x - direction.x * (10 + i * 5) + (Math.random() - 0.5) * 10;
          p.y = iceProjectile.y - direction.y * (10 + i * 5) + (Math.random() - 0.5) * 10;
          p.alpha -= 0.02;
          if (p.alpha <= 0) {
            p.x = iceProjectile.x;
            p.y = iceProjectile.y;
            p.alpha = 0.6;
          }
        });

        distanceTraveled += this.config.bulletSpeed * 0.016;

        // Vérifier les collisions avec les zombies
        const hitZombie = this.checkZombieCollision(iceProjectile.x, iceProjectile.y);
        if (hitZombie) {
          this.onHit(hitZombie, iceProjectile.x, iceProjectile.y);
          this.destroyProjectile(iceProjectile, glow, particles, updateEvent);
          return;
        }

        // Vérifier la portée max
        if (distanceTraveled >= maxDistance) {
          this.destroyProjectile(iceProjectile, glow, particles, updateEvent);
        }
      },
    });
  }

  /**
   * Vérifie les collisions avec les zombies
   */
  private checkZombieCollision(x: number, y: number): Zombie | null {
    const activeZombies = this.scene.getActiveZombies();
    const hitRadius = 15;

    for (const zombie of activeZombies) {
      if (!zombie.active) continue;

      const distance = Phaser.Math.Distance.Between(x, y, zombie.x, zombie.y);
      if (distance < hitRadius + 16) {
        return zombie;
      }
    }

    return null;
  }

  /**
   * Appelé quand le projectile touche un zombie
   */
  private onHit(zombie: Zombie, x: number, y: number): void {
    // Infliger les dégâts
    zombie.takeDamage(this.config.damage);

    // Appliquer l'effet de gel
    this.applyFreezeEffect(zombie);

    // Effet visuel d'impact
    this.createImpactEffect(x, y);

    // Propagation en chaîne
    this.tryChainFreeze(zombie);
  }

  /**
   * Applique l'effet de gel à un zombie
   */
  private applyFreezeEffect(zombie: Zombie): void {
    // Vérifier si déjà gelé
    if (zombie.getData('frozen')) return;

    zombie.setData('frozen', true);
    zombie.setData('originalSpeed', zombie.getData('speed') || 60);
    zombie.setData('meleeBonusDamage', this.meleeBonusDamage);

    // Appliquer le ralentissement
    const originalSpeed = zombie.getData('originalSpeed');
    zombie.setData('speed', originalSpeed * this.freezeSlowFactor);

    // Effet visuel : teinte bleue glacée
    zombie.setTint(0x88ccff);

    // Créer des cristaux de glace autour du zombie
    this.createIceCrystals(zombie);

    // Retirer l'effet après la durée
    this.scene.time.delayedCall(this.freezeDuration, () => {
      if (zombie.active) {
        zombie.setData('frozen', false);
        zombie.setData('meleeBonusDamage', 0);
        zombie.setData('speed', zombie.getData('originalSpeed'));
        zombie.clearTint();
      }
    });
  }

  /**
   * Crée des cristaux de glace visuels autour du zombie
   */
  private createIceCrystals(zombie: Zombie): void {
    const crystalCount = 6;

    for (let i = 0; i < crystalCount; i++) {
      const angle = (i / crystalCount) * Math.PI * 2;
      const distance = 15 + Math.random() * 10;

      const crystal = this.scene.add.polygon(
        zombie.x + Math.cos(angle) * distance,
        zombie.y + Math.sin(angle) * distance,
        [0, -8, 4, 0, 0, 8, -4, 0], // Forme de losange
        0x88eeff,
        0.8
      );
      crystal.setDepth(12);
      crystal.setRotation(angle);

      // Animation de flottement
      this.scene.tweens.add({
        targets: crystal,
        y: crystal.y - 5,
        alpha: 0,
        duration: this.freezeDuration,
        ease: 'Sine.easeOut',
        onComplete: () => crystal.destroy(),
      });
    }
  }

  /**
   * Essaie de propager le gel aux zombies proches
   */
  private tryChainFreeze(sourceZombie: Zombie): void {
    const activeZombies = this.scene.getActiveZombies();

    for (const zombie of activeZombies) {
      if (!zombie.active || zombie === sourceZombie) continue;
      if (zombie.getData('frozen')) continue;

      const distance = Phaser.Math.Distance.Between(
        sourceZombie.x,
        sourceZombie.y,
        zombie.x,
        zombie.y
      );

      if (distance <= this.chainRadius) {
        if (Math.random() < this.chainChance) {
          // Dessiner l'arc de gel
          this.drawFreezeChain(sourceZombie.x, sourceZombie.y, zombie.x, zombie.y);

          // Appliquer le gel avec un délai
          this.scene.time.delayedCall(100, () => {
            if (zombie.active) {
              zombie.takeDamage(this.config.damage * 0.5);
              this.applyFreezeEffect(zombie);
            }
          });
        }
      }
    }
  }

  /**
   * Dessine un arc de gel entre deux points
   */
  private drawFreezeChain(x1: number, y1: number, x2: number, y2: number): void {
    this.effectGraphics.lineStyle(3, 0x88eeff, 0.8);
    this.effectGraphics.beginPath();
    this.effectGraphics.moveTo(x1, y1);

    // Ligne ondulée glacée
    const segments = 6;
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;

    for (let i = 1; i < segments; i++) {
      const jitterX = (Math.random() - 0.5) * 15;
      const jitterY = (Math.random() - 0.5) * 15;
      this.effectGraphics.lineTo(x1 + dx * i + jitterX, y1 + dy * i + jitterY);
    }

    this.effectGraphics.lineTo(x2, y2);
    this.effectGraphics.strokePath();

    // Effacer après un court délai
    this.scene.time.delayedCall(150, () => {
      this.effectGraphics.clear();
    });
  }

  /**
   * Crée l'effet d'impact
   */
  private createImpactEffect(x: number, y: number): void {
    // Explosion de glace
    const impactFlash = this.scene.add.circle(x, y, 20, 0x88eeff, 0.8);
    impactFlash.setDepth(12);

    this.scene.tweens.add({
      targets: impactFlash,
      scale: 2.5,
      alpha: 0,
      duration: 200,
      onComplete: () => impactFlash.destroy(),
    });

    // Particules de glace
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 80 + Math.random() * 60;
      const size = 3 + Math.random() * 4;

      const particle = this.scene.add.circle(x, y, size, 0xffffff, 0.9);
      particle.setDepth(12);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 300 + Math.random() * 150,
        onComplete: () => particle.destroy(),
      });
    }

    // Flocons de neige
    for (let i = 0; i < 6; i++) {
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;

      const snowflake = this.scene.add.text(x + offsetX, y + offsetY, '❄', {
        fontSize: '12px',
        color: '#ffffff',
      });
      snowflake.setOrigin(0.5);
      snowflake.setDepth(13);

      this.scene.tweens.add({
        targets: snowflake,
        y: snowflake.y + 30,
        alpha: 0,
        rotation: Math.PI,
        duration: 800,
        onComplete: () => snowflake.destroy(),
      });
    }
  }

  /**
   * Détruit le projectile et ses effets
   */
  private destroyProjectile(
    projectile: Phaser.GameObjects.Arc,
    glow: Phaser.GameObjects.Arc,
    particles: Phaser.GameObjects.Arc[],
    updateEvent: Phaser.Time.TimerEvent
  ): void {
    updateEvent.remove();
    projectile.destroy();
    glow.destroy();
    particles.forEach((p) => p.destroy());
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.effectGraphics?.destroy();
  }
}
