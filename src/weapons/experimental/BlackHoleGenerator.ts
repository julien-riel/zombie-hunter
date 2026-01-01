import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration du Black Hole Generator
 */
const BLACK_HOLE_CONFIG: WeaponConfig = {
  name: 'Générateur de Trou Noir',
  damage: BALANCE.weapons.blackHoleGenerator.damage,
  fireRate: BALANCE.weapons.blackHoleGenerator.fireRate,
  maxAmmo: BALANCE.weapons.blackHoleGenerator.magazineSize,
  reloadTime: BALANCE.weapons.blackHoleGenerator.reloadTime,
  bulletSpeed: BALANCE.weapons.blackHoleGenerator.projectileSpeed,
};

/**
 * Représente un trou noir actif
 */
interface ActiveBlackHole {
  x: number;
  y: number;
  remainingDuration: number;
  graphics: Phaser.GameObjects.Graphics;
  core: Phaser.GameObjects.Arc;
  ring: Phaser.GameObjects.Arc;
  currentRadius: number;
}

/**
 * Black Hole Generator - Arme Expérimentale
 * - Tire un projectile qui crée un trou noir à l'impact
 * - Le trou noir aspire les zombies et inflige des dégâts
 * - Maximum 2 trous noirs actifs en même temps
 * - Déblocage : Drop de boss
 */
export class BlackHoleGenerator extends Weapon {
  private blackHoleDuration: number;
  private attractRadius: number;
  private damagePerSecond: number;
  private pullForce: number;
  private maxBlackHoles: number;
  private implosionDamage: number;

  /** Trous noirs actifs */
  private activeBlackHoles: ActiveBlackHole[] = [];

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, BLACK_HOLE_CONFIG);

    this.blackHoleDuration = BALANCE.weapons.blackHoleGenerator.duration;
    this.attractRadius = BALANCE.weapons.blackHoleGenerator.attractRadius;
    this.damagePerSecond = BALANCE.weapons.blackHoleGenerator.damagePerSecond;
    this.pullForce = BALANCE.weapons.blackHoleGenerator.pullForce;
    this.maxBlackHoles = BALANCE.weapons.blackHoleGenerator.maxBlackHoles;
    this.implosionDamage = BALANCE.weapons.blackHoleGenerator.implosionDamage;
  }

  /**
   * Crée le projectile de trou noir
   */
  protected override createProjectile(direction: Phaser.Math.Vector2): void {
    const startX = this.owner.x;
    const startY = this.owner.y;

    // Créer le projectile (sphère d'énergie sombre)
    const projectile = this.scene.add.circle(startX, startY, 10, 0x220044, 1);
    projectile.setStrokeStyle(2, 0x8800ff, 1);
    projectile.setDepth(10);

    // Halo d'énergie
    const halo = this.scene.add.circle(startX, startY, 18, 0x8800ff, 0.3);
    halo.setDepth(9);

    // Particules d'énergie sombre
    const particles: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 6; i++) {
      const particle = this.scene.add.circle(startX, startY, 3, 0x440088, 0.8);
      particle.setDepth(9);
      particles.push(particle);
    }

    const velocity = {
      x: direction.x * this.config.bulletSpeed,
      y: direction.y * this.config.bulletSpeed,
    };

    let distanceTraveled = 0;
    const maxDistance = 400;

    const updateEvent = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!projectile.active) return;

        // Déplacer le projectile
        projectile.x += velocity.x * 0.016;
        projectile.y += velocity.y * 0.016;
        halo.x = projectile.x;
        halo.y = projectile.y;

        // Animation des particules en orbite
        particles.forEach((p, i) => {
          const angle = this.scene.time.now / 200 + (i / particles.length) * Math.PI * 2;
          const dist = 15 + Math.sin(this.scene.time.now / 100 + i) * 5;
          p.x = projectile.x + Math.cos(angle) * dist;
          p.y = projectile.y + Math.sin(angle) * dist;
        });

        // Pulsation du halo
        halo.setScale(1 + Math.sin(this.scene.time.now / 100) * 0.2);

        distanceTraveled += this.config.bulletSpeed * 0.016;

        // Vérifier collision avec zombie ou distance max
        const hitZombie = this.checkZombieCollision(projectile.x, projectile.y);
        if (hitZombie || distanceTraveled >= maxDistance) {
          this.createBlackHole(projectile.x, projectile.y);
          this.destroyProjectile(projectile, halo, particles, updateEvent);
        }
      },
    });
  }

  /**
   * Vérifie les collisions avec les zombies
   */
  private checkZombieCollision(x: number, y: number): Zombie | null {
    const activeZombies = this.scene.getActiveZombies();

    for (const zombie of activeZombies) {
      if (!zombie.active) continue;

      const distance = Phaser.Math.Distance.Between(x, y, zombie.x, zombie.y);
      if (distance < 20) {
        return zombie;
      }
    }

    return null;
  }

  /**
   * Crée un trou noir à la position donnée
   */
  private createBlackHole(x: number, y: number): void {
    // Vérifier le maximum de trous noirs
    if (this.activeBlackHoles.length >= this.maxBlackHoles) {
      // Détruire le plus ancien
      const oldest = this.activeBlackHoles.shift();
      if (oldest) {
        this.implodeBlackHole(oldest);
      }
    }

    // Créer les graphiques du trou noir
    const graphics = this.scene.add.graphics();
    graphics.setDepth(8);

    // Noyau central
    const core = this.scene.add.circle(x, y, 15, 0x000000, 1);
    core.setDepth(10);

    // Anneau d'accrétion
    const ring = this.scene.add.circle(x, y, 25, 0x000000, 0);
    ring.setStrokeStyle(8, 0x8800ff, 0.8);
    ring.setDepth(9);

    const blackHole: ActiveBlackHole = {
      x,
      y,
      remainingDuration: this.blackHoleDuration,
      graphics,
      core,
      ring,
      currentRadius: this.attractRadius,
    };

    this.activeBlackHoles.push(blackHole);

    // Animation d'apparition
    core.setScale(0);
    ring.setScale(0);

    this.scene.tweens.add({
      targets: [core, ring],
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Effet sonore visuel (onde de choc inversée)
    const shockwave = this.scene.add.circle(x, y, this.attractRadius, 0x8800ff, 0);
    shockwave.setStrokeStyle(2, 0x8800ff, 0.8);
    shockwave.setDepth(7);

    this.scene.tweens.add({
      targets: shockwave,
      scale: 0,
      alpha: 0,
      duration: 500,
      onComplete: () => shockwave.destroy(),
    });
  }

  /**
   * Implose un trou noir (fin de vie)
   */
  private implodeBlackHole(blackHole: ActiveBlackHole): void {
    // Dégâts d'implosion aux zombies proches
    const activeZombies = this.scene.getActiveZombies();
    for (const zombie of activeZombies) {
      if (!zombie.active) continue;

      const distance = Phaser.Math.Distance.Between(blackHole.x, blackHole.y, zombie.x, zombie.y);
      if (distance < blackHole.currentRadius * 0.5) {
        const damageFactor = 1 - distance / (blackHole.currentRadius * 0.5);
        zombie.takeDamage(this.implosionDamage * damageFactor);
      }
    }

    // Animation d'implosion
    this.scene.tweens.add({
      targets: [blackHole.core, blackHole.ring],
      scale: 3,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        blackHole.core.destroy();
        blackHole.ring.destroy();
        blackHole.graphics.destroy();
      },
    });

    // Explosion de particules
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const speed = 150 + Math.random() * 100;

      const particle = this.scene.add.circle(
        blackHole.x,
        blackHole.y,
        4 + Math.random() * 4,
        0x8800ff,
        0.8
      );
      particle.setDepth(12);

      this.scene.tweens.add({
        targets: particle,
        x: blackHole.x + Math.cos(angle) * speed,
        y: blackHole.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 400 + Math.random() * 200,
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Mise à jour des trous noirs actifs
   */
  public override update(): void {
    const deltaTime = 16;

    for (let i = this.activeBlackHoles.length - 1; i >= 0; i--) {
      const blackHole = this.activeBlackHoles[i];

      // Réduire la durée
      blackHole.remainingDuration -= deltaTime;

      // Dessiner les effets visuels
      this.drawBlackHoleEffects(blackHole);

      // Attirer et endommager les zombies
      this.attractZombies(blackHole);

      // Vérifier fin de vie
      if (blackHole.remainingDuration <= 0) {
        this.activeBlackHoles.splice(i, 1);
        this.implodeBlackHole(blackHole);
      }
    }
  }

  /**
   * Dessine les effets visuels du trou noir
   */
  private drawBlackHoleEffects(blackHole: ActiveBlackHole): void {
    blackHole.graphics.clear();

    // Lignes de distorsion gravitationnelle
    blackHole.graphics.lineStyle(1, 0x440088, 0.3);

    const lineCount = 12;
    const time = this.scene.time.now;

    for (let i = 0; i < lineCount; i++) {
      const baseAngle = (i / lineCount) * Math.PI * 2;
      const angle = baseAngle + time / 1000;

      // Spirale qui s'enroule
      blackHole.graphics.beginPath();
      for (let t = 0; t < 1; t += 0.1) {
        const r = blackHole.currentRadius * (1 - t);
        const spiralAngle = angle + t * Math.PI * 2;
        const px = blackHole.x + Math.cos(spiralAngle) * r;
        const py = blackHole.y + Math.sin(spiralAngle) * r;

        if (t === 0) {
          blackHole.graphics.moveTo(px, py);
        } else {
          blackHole.graphics.lineTo(px, py);
        }
      }
      blackHole.graphics.strokePath();
    }

    // Rotation de l'anneau
    blackHole.ring.setRotation(time / 500);

    // Pulsation du noyau
    const pulse = 1 + Math.sin(time / 200) * 0.1;
    blackHole.core.setScale(pulse);

    // Particules aspirées (décor)
    if (Math.random() < 0.3) {
      const spawnAngle = Math.random() * Math.PI * 2;
      const spawnDist = blackHole.currentRadius * (0.8 + Math.random() * 0.4);

      const debrisParticle = this.scene.add.circle(
        blackHole.x + Math.cos(spawnAngle) * spawnDist,
        blackHole.y + Math.sin(spawnAngle) * spawnDist,
        2,
        0x666666,
        0.6
      );
      debrisParticle.setDepth(8);

      // Animation vers le centre
      this.scene.tweens.add({
        targets: debrisParticle,
        x: blackHole.x,
        y: blackHole.y,
        scale: 0,
        duration: 500,
        ease: 'Quad.easeIn',
        onComplete: () => debrisParticle.destroy(),
      });
    }
  }

  /**
   * Attire les zombies vers le trou noir
   */
  private attractZombies(blackHole: ActiveBlackHole): void {
    const activeZombies = this.scene.getActiveZombies();

    for (const zombie of activeZombies) {
      if (!zombie.active) continue;

      const dx = blackHole.x - zombie.x;
      const dy = blackHole.y - zombie.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > blackHole.currentRadius) continue;
      if (distance < 5) continue; // Éviter division par zéro

      // Force d'attraction inversement proportionnelle au carré de la distance
      const forceFactor = 1 / (distance / 50);
      const force = this.pullForce * Math.min(forceFactor, 3);

      // Normaliser et appliquer
      const normalX = dx / distance;
      const normalY = dy / distance;

      zombie.x += normalX * force * 0.016;
      zombie.y += normalY * force * 0.016;

      // Dégâts basés sur la proximité
      const damageFactor = 1 - distance / blackHole.currentRadius;
      const damageThisFrame = this.damagePerSecond * damageFactor * 0.016;
      zombie.takeDamage(damageThisFrame);

      // Effet visuel sur le zombie (teinte violette)
      if (!zombie.getData('inBlackHole')) {
        zombie.setData('inBlackHole', true);
        zombie.setTint(0x8844ff);
      }
    }

    // Nettoyer la teinte des zombies sortis
    for (const zombie of activeZombies) {
      if (!zombie.active) continue;

      const distance = Phaser.Math.Distance.Between(blackHole.x, blackHole.y, zombie.x, zombie.y);
      if (distance > blackHole.currentRadius && zombie.getData('inBlackHole')) {
        zombie.setData('inBlackHole', false);
        zombie.clearTint();
      }
    }
  }

  /**
   * Détruit un projectile
   */
  private destroyProjectile(
    projectile: Phaser.GameObjects.Arc,
    halo: Phaser.GameObjects.Arc,
    particles: Phaser.GameObjects.Arc[],
    updateEvent: Phaser.Time.TimerEvent
  ): void {
    updateEvent.remove();
    projectile.destroy();
    halo.destroy();
    particles.forEach((p) => p.destroy());
  }

  /**
   * Retourne le nombre de trous noirs actifs
   */
  public getActiveBlackHoleCount(): number {
    return this.activeBlackHoles.length;
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    for (const blackHole of this.activeBlackHoles) {
      blackHole.graphics.destroy();
      blackHole.core.destroy();
      blackHole.ring.destroy();
    }
    this.activeBlackHoles = [];
  }
}
