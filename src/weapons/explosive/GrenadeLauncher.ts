import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration du grenade launcher depuis balance.ts
 */
const GRENADE_LAUNCHER_CONFIG: WeaponConfig = {
  name: 'Lance-Grenades',
  damage: BALANCE.weapons.grenadeLauncher.damage,
  fireRate: BALANCE.weapons.grenadeLauncher.fireRate,
  maxAmmo: BALANCE.weapons.grenadeLauncher.magazineSize,
  reloadTime: BALANCE.weapons.grenadeLauncher.reloadTime,
  bulletSpeed: BALANCE.weapons.grenadeLauncher.projectileSpeed,
  spread: 0,
};

/**
 * Grenade Launcher - Lance-grenades explosif
 * - Tir en arc (affecté par la gravité)
 * - Explosion de zone à l'impact
 * - 4 grenades par chargeur
 * - Rechargement lent
 * - Ne blesse PAS le joueur (contrairement aux barils)
 */
export class GrenadeLauncher extends Weapon {
  private explosionDamage: number;
  private explosionRadius: number;
  private arcGravity: number;
  private activeGrenades: Set<Phaser.GameObjects.Arc> = new Set();

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, GRENADE_LAUNCHER_CONFIG);
    this.explosionDamage = BALANCE.weapons.grenadeLauncher.explosionDamage;
    this.explosionRadius = BALANCE.weapons.grenadeLauncher.explosionRadius;
    this.arcGravity = BALANCE.weapons.grenadeLauncher.arcGravity;
  }

  /**
   * Override fire pour lancer une grenade
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

    // Émettre l'événement de tir
    this.scene.events.emit('weaponFired', { weapon: this.config.name });

    // Créer la grenade
    this.createProjectile(direction);

    // Effet de tir
    this.createLaunchEffect(direction);

    return true;
  }

  /**
   * Crée une grenade avec trajectoire en arc
   */
  protected createProjectile(direction: Phaser.Math.Vector2): void {
    const offset = 25;
    const startX = this.owner.x + direction.x * offset;
    const startY = this.owner.y + direction.y * offset;

    // Créer la grenade comme un cercle
    const grenade = this.scene.add.circle(startX, startY, 8, 0x556b2f, 1);
    grenade.setStrokeStyle(2, 0x3a4a2a);
    grenade.setDepth(50);

    // Ajouter à la physique
    this.scene.physics.add.existing(grenade);
    const body = grenade.body as Phaser.Physics.Arcade.Body;

    // Vélocité initiale
    const speed = this.config.bulletSpeed;
    body.setVelocity(direction.x * speed, direction.y * speed);

    // Appliquer la gravité
    body.setGravityY(this.arcGravity);

    // Traquer la grenade
    this.activeGrenades.add(grenade);

    // Stocker les données
    grenade.setData('damage', this.config.damage);
    grenade.setData('startTime', this.scene.time.now);
    grenade.setData('maxLifetime', 3000);
    grenade.setData('hasExploded', false);

    // Rotation de la grenade
    this.scene.tweens.add({
      targets: grenade,
      angle: 360,
      duration: 500,
      repeat: -1,
    });

    // Vérifier les collisions avec le sol et les zombies
    this.setupGrenadeCollisions(grenade);
  }

  /**
   * Configure les collisions pour la grenade
   */
  private setupGrenadeCollisions(grenade: Phaser.GameObjects.Arc): void {
    // Timer pour vérifier les conditions d'explosion
    const checkInterval = this.scene.time.addEvent({
      delay: 16, // ~60 fps
      callback: () => {
        if (!grenade.active || grenade.getData('hasExploded')) {
          checkInterval.remove();
          return;
        }

        const body = grenade.body as Phaser.Physics.Arcade.Body;
        const startTime = grenade.getData('startTime');
        const maxLifetime = grenade.getData('maxLifetime');

        // Explosion si atteint le sol (y > hauteur du monde - marge)
        if (grenade.y > this.scene.scale.height - 50) {
          this.explodeGrenade(grenade);
          checkInterval.remove();
          return;
        }

        // Explosion si timeout
        if (this.scene.time.now - startTime > maxLifetime) {
          this.explodeGrenade(grenade);
          checkInterval.remove();
          return;
        }

        // Collision avec les zombies
        const zombies = this.scene.getActiveZombies();
        for (const zombie of zombies) {
          if (!zombie.active) continue;
          const dist = Phaser.Math.Distance.Between(grenade.x, grenade.y, zombie.x, zombie.y);
          if (dist < 25) {
            this.explodeGrenade(grenade);
            checkInterval.remove();
            return;
          }
        }

        // Collision avec les murs (approximation simple - si vélocité presque nulle et temps écoulé)
        if (this.scene.time.now - startTime > 200) {
          const vx = body.velocity.x;
          const vy = body.velocity.y;
          if (Math.abs(vx) < 10 && Math.abs(vy) < 10) {
            this.explodeGrenade(grenade);
            checkInterval.remove();
            return;
          }
        }
      },
      loop: true,
    });
  }

  /**
   * Fait exploser la grenade
   */
  private explodeGrenade(grenade: Phaser.GameObjects.Arc): void {
    if (grenade.getData('hasExploded')) return;
    grenade.setData('hasExploded', true);

    const x = grenade.x;
    const y = grenade.y;

    // Supprimer la grenade
    this.activeGrenades.delete(grenade);
    grenade.destroy();

    // Créer l'effet d'explosion
    this.createExplosionEffect(x, y);

    // Appliquer les dégâts
    this.applyExplosionDamage(x, y);

    // Screen shake
    this.scene.cameras.main.shake(150, 0.012);
  }

  /**
   * Crée l'effet visuel d'explosion
   */
  private createExplosionEffect(x: number, y: number): void {
    // Flash central
    const flash = this.scene.add.circle(x, y, 15, 0xffffff, 1);
    flash.setDepth(100);

    this.scene.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 80,
      onComplete: () => flash.destroy(),
    });

    // Cercle d'explosion
    const explosion = this.scene.add.circle(x, y, 10, 0xff6600, 0.9);
    explosion.setDepth(99);

    this.scene.tweens.add({
      targets: explosion,
      scale: this.explosionRadius / 10,
      alpha: 0,
      duration: 250,
      ease: 'Cubic.easeOut',
      onComplete: () => explosion.destroy(),
    });

    // Onde de choc
    const shockwave = this.scene.add.circle(x, y, 10, 0xffffff, 0);
    shockwave.setStrokeStyle(3, 0xff9900, 0.8);
    shockwave.setDepth(98);

    this.scene.tweens.add({
      targets: shockwave,
      scale: (this.explosionRadius * 1.3) / 10,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => shockwave.destroy(),
    });

    // Débris
    this.createExplosionDebris(x, y);

    // Fumée
    this.createSmokeEffect(x, y);
  }

  /**
   * Crée les débris de l'explosion
   */
  private createExplosionDebris(x: number, y: number): void {
    const debrisCount = 12;
    const colors = [0xff4500, 0xff6600, 0xff8800, 0x333333, 0x444444];

    for (let i = 0; i < debrisCount; i++) {
      const angle = (Math.PI * 2 * i) / debrisCount + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * 150;
      const size = 2 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];

      const debris = this.scene.add.rectangle(x, y, size, size, color);
      debris.setDepth(97);

      const targetX = x + Math.cos(angle) * speed;
      const targetY = y + Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: debris,
        x: targetX,
        y: targetY,
        alpha: 0,
        angle: Math.random() * 540,
        scale: 0.3,
        duration: 250 + Math.random() * 150,
        ease: 'Quad.easeOut',
        onComplete: () => debris.destroy(),
      });
    }
  }

  /**
   * Crée l'effet de fumée
   */
  private createSmokeEffect(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;

      const smoke = this.scene.add.circle(
        x + offsetX,
        y + offsetY,
        8 + Math.random() * 8,
        0x555555,
        0.5
      );
      smoke.setDepth(96);

      this.scene.tweens.add({
        targets: smoke,
        y: smoke.y - 40,
        scale: 2,
        alpha: 0,
        duration: 500 + Math.random() * 300,
        delay: i * 40,
        onComplete: () => smoke.destroy(),
      });
    }
  }

  /**
   * Applique les dégâts de l'explosion aux zombies
   */
  private applyExplosionDamage(x: number, y: number): void {
    const radiusSq = this.explosionRadius * this.explosionRadius;
    let kills = 0;

    // Dégâts aux zombies uniquement (pas au joueur)
    const zombies = this.scene.getActiveZombies();
    for (const zombie of zombies) {
      if (!zombie.active) continue;

      const distSq = Phaser.Math.Distance.Squared(x, y, zombie.x, zombie.y);
      if (distSq <= radiusSq) {
        // Dégâts réduits avec la distance
        const damageFactor = 1 - Math.sqrt(distSq) / this.explosionRadius;
        const damage = Math.floor(this.explosionDamage * damageFactor);

        const wasAlive = zombie.getHealth() > 0;
        zombie.takeDamage(damage);

        if (wasAlive && zombie.getHealth() <= 0) {
          kills++;
        }

        // Effet visuel de hit
        this.scene.events.emit('weaponHit', {
          weapon: 'grenadeLauncher',
          damage,
          position: { x: zombie.x, y: zombie.y },
        });
      }
    }

    // Émettre l'événement d'explosion
    this.scene.events.emit('grenade:explosion', {
      position: { x, y },
      damage: this.explosionDamage,
      radius: this.explosionRadius,
      kills,
    });
  }

  /**
   * Effet de lancement
   */
  private createLaunchEffect(direction: Phaser.Math.Vector2): void {
    const offset = 20;
    const flashX = this.owner.x + direction.x * offset;
    const flashY = this.owner.y + direction.y * offset;

    // Flash de lancement
    const flash = this.scene.add.circle(flashX, flashY, 10, 0x88aa44, 0.8);
    flash.setDepth(100);

    this.scene.tweens.add({
      targets: flash,
      scale: 0.3,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy(),
    });

    // Petit recul
    this.scene.cameras.main.shake(40, 0.004);
  }

  /**
   * Update - nettoyer les grenades hors écran
   */
  public override update(): void {
    for (const grenade of this.activeGrenades) {
      if (!grenade.active) {
        this.activeGrenades.delete(grenade);
        continue;
      }

      // Supprimer si hors écran
      if (
        grenade.x < -100 ||
        grenade.x > this.scene.scale.width + 100 ||
        grenade.y > this.scene.scale.height + 100
      ) {
        this.activeGrenades.delete(grenade);
        grenade.destroy();
      }
    }
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    for (const grenade of this.activeGrenades) {
      grenade.destroy();
    }
    this.activeGrenades.clear();
  }
}
