import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration du Gravity Gun
 */
const GRAVITY_GUN_CONFIG: WeaponConfig = {
  name: 'Canon Gravitique',
  damage: BALANCE.weapons.gravityGun.damage,
  fireRate: BALANCE.weapons.gravityGun.fireRate,
  maxAmmo: BALANCE.weapons.gravityGun.magazineSize,
  reloadTime: BALANCE.weapons.gravityGun.reloadTime,
  bulletSpeed: 0, // Pas de projectile
};

/**
 * Gravity Gun - Arme Expérimentale
 * - Mode Push : Repousse violemment les zombies
 * - Mode Pull : Attire les zombies vers le joueur
 * - Les zombies projetés infligent des dégâts aux autres
 * - Déblocage : Vague 20+
 */
export class GravityGun extends Weapon {
  private range: number;
  private coneAngle: number;
  private pushForce: number;
  private pullForce: number;
  private collisionDamage: number;

  /** Mode actuel : true = push, false = pull */
  private isPushMode: boolean = true;

  /** Graphiques pour les effets */
  private effectGraphics: Phaser.GameObjects.Graphics;

  /** Zombies actuellement affectés par la gravité */
  private affectedZombies: Map<Zombie, { vx: number; vy: number; duration: number }> = new Map();

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, GRAVITY_GUN_CONFIG);

    this.range = BALANCE.weapons.gravityGun.range;
    this.coneAngle = BALANCE.weapons.gravityGun.coneAngle;
    this.pushForce = BALANCE.weapons.gravityGun.pushForce;
    this.pullForce = BALANCE.weapons.gravityGun.pullForce;
    this.collisionDamage = BALANCE.weapons.gravityGun.collisionDamage;

    this.effectGraphics = scene.add.graphics();
    this.effectGraphics.setDepth(15);
  }

  /**
   * Toggle entre les modes push et pull
   */
  public toggleMode(): void {
    this.isPushMode = !this.isPushMode;

    // Feedback visuel du changement de mode
    const modeText = this.scene.add.text(
      this.owner.x,
      this.owner.y - 50,
      this.isPushMode ? 'MODE: PUSH' : 'MODE: PULL',
      {
        fontSize: '12px',
        color: this.isPushMode ? '#ff4444' : '#44aaff',
        fontStyle: 'bold',
      }
    );
    modeText.setOrigin(0.5);
    modeText.setDepth(25);

    this.scene.tweens.add({
      targets: modeText,
      y: modeText.y - 20,
      alpha: 0,
      duration: 800,
      onComplete: () => modeText.destroy(),
    });
  }

  /**
   * Override de fire pour créer l'effet gravitique
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

    // Trouver les zombies dans le cône
    const zombiesInCone = this.findZombiesInCone(direction);

    if (zombiesInCone.length > 0) {
      if (this.isPushMode) {
        this.performPush(zombiesInCone, direction);
      } else {
        this.performPull(zombiesInCone);
      }
    }

    // Effet visuel
    this.drawGravityEffect(direction);

    return true;
  }

  /**
   * Trouve les zombies dans le cône d'effet
   */
  private findZombiesInCone(direction: Phaser.Math.Vector2): Zombie[] {
    const zombies: Zombie[] = [];
    const centerAngle = Math.atan2(direction.y, direction.x);
    const halfCone = Phaser.Math.DegToRad(this.coneAngle / 2);
    const activeZombies = this.scene.getActiveZombies();

    for (const zombie of activeZombies) {
      if (!zombie.active) continue;

      const dx = zombie.x - this.owner.x;
      const dy = zombie.y - this.owner.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.range) continue;

      const angleToZombie = Math.atan2(dy, dx);
      let angleDiff = angleToZombie - centerAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= halfCone) {
        zombies.push(zombie);
      }
    }

    return zombies;
  }

  /**
   * Mode PUSH : Repousse les zombies
   */
  private performPush(zombies: Zombie[], _direction: Phaser.Math.Vector2): void {
    for (const zombie of zombies) {
      // Calculer la direction de répulsion
      const dx = zombie.x - this.owner.x;
      const dy = zombie.y - this.owner.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const normalX = dx / distance;
      const normalY = dy / distance;

      // Force inversement proportionnelle à la distance
      const forceFactor = 1 - distance / this.range;
      const force = this.pushForce * forceFactor;

      // Appliquer les dégâts
      zombie.takeDamage(this.config.damage * forceFactor);

      // Ajouter à la liste des zombies affectés
      this.affectedZombies.set(zombie, {
        vx: normalX * force,
        vy: normalY * force,
        duration: 500,
      });

      // Effet visuel sur le zombie
      this.createPushEffect(zombie);
    }

    // Son et flash
    this.createShockwave(this.owner.x, this.owner.y, 0xff4444);
  }

  /**
   * Mode PULL : Attire les zombies
   */
  private performPull(zombies: Zombie[]): void {
    for (const zombie of zombies) {
      // Calculer la direction d'attraction
      const dx = this.owner.x - zombie.x;
      const dy = this.owner.y - zombie.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const normalX = dx / distance;
      const normalY = dy / distance;

      // Force proportionnelle à la distance (plus loin = plus fort)
      const forceFactor = distance / this.range;
      const force = this.pullForce * forceFactor;

      // Ajouter à la liste des zombies affectés
      this.affectedZombies.set(zombie, {
        vx: normalX * force,
        vy: normalY * force,
        duration: 400,
      });

      // Effet visuel sur le zombie
      this.createPullEffect(zombie);
    }

    // Flash d'attraction
    this.createShockwave(this.owner.x, this.owner.y, 0x44aaff);
  }

  /**
   * Effet visuel de push sur un zombie
   */
  private createPushEffect(zombie: Zombie): void {
    // Lignes de force qui partent du zombie
    for (let i = 0; i < 4; i++) {
      const angle = Math.atan2(zombie.y - this.owner.y, zombie.x - this.owner.x);
      const spread = (Math.random() - 0.5) * 0.5;

      const line = this.scene.add.graphics();
      line.lineStyle(2, 0xff4444, 0.8);
      line.beginPath();
      line.moveTo(zombie.x, zombie.y);
      line.lineTo(
        zombie.x + Math.cos(angle + spread) * 40,
        zombie.y + Math.sin(angle + spread) * 40
      );
      line.strokePath();
      line.setDepth(12);

      this.scene.tweens.add({
        targets: line,
        alpha: 0,
        duration: 300,
        onComplete: () => line.destroy(),
      });
    }
  }

  /**
   * Effet visuel de pull sur un zombie
   */
  private createPullEffect(zombie: Zombie): void {
    // Spirale qui s'enroule autour du zombie
    const spiral = this.scene.add.graphics();
    spiral.lineStyle(2, 0x44aaff, 0.8);

    const points: { x: number; y: number }[] = [];
    for (let t = 0; t < Math.PI * 4; t += 0.3) {
      const r = 30 - t * 2;
      if (r > 0) {
        points.push({
          x: zombie.x + Math.cos(t) * r,
          y: zombie.y + Math.sin(t) * r,
        });
      }
    }

    if (points.length > 1) {
      spiral.beginPath();
      spiral.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        spiral.lineTo(points[i].x, points[i].y);
      }
      spiral.strokePath();
    }

    spiral.setDepth(12);

    this.scene.tweens.add({
      targets: spiral,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 400,
      onComplete: () => spiral.destroy(),
    });
  }

  /**
   * Crée une onde de choc visuelle
   */
  private createShockwave(x: number, y: number, color: number): void {
    const wave = this.scene.add.circle(x, y, 20, color, 0);
    wave.setStrokeStyle(3, color, 0.8);
    wave.setDepth(11);

    this.scene.tweens.add({
      targets: wave,
      scale: 8,
      alpha: 0,
      duration: 400,
      ease: 'Sine.easeOut',
      onComplete: () => wave.destroy(),
    });
  }

  /**
   * Dessine l'effet gravitique principal
   */
  private drawGravityEffect(direction: Phaser.Math.Vector2): void {
    this.effectGraphics.clear();

    const centerAngle = Math.atan2(direction.y, direction.x);
    const halfCone = Phaser.Math.DegToRad(this.coneAngle / 2);
    const color = this.isPushMode ? 0xff4444 : 0x44aaff;

    // Dessiner le cône d'effet
    this.effectGraphics.fillStyle(color, 0.15);
    this.effectGraphics.lineStyle(2, color, 0.6);

    this.effectGraphics.beginPath();
    this.effectGraphics.moveTo(this.owner.x, this.owner.y);
    this.effectGraphics.arc(
      this.owner.x,
      this.owner.y,
      this.range,
      centerAngle - halfCone,
      centerAngle + halfCone,
      false
    );
    this.effectGraphics.closePath();
    this.effectGraphics.fillPath();
    this.effectGraphics.strokePath();

    // Lignes de champ gravitique
    const lineCount = 8;
    for (let i = 0; i < lineCount; i++) {
      const angle = centerAngle - halfCone + ((i + 0.5) / lineCount) * halfCone * 2;
      const startDist = this.isPushMode ? 20 : this.range;
      const endDist = this.isPushMode ? this.range : 20;

      this.effectGraphics.lineStyle(1, color, 0.4);
      this.effectGraphics.beginPath();
      this.effectGraphics.moveTo(
        this.owner.x + Math.cos(angle) * startDist,
        this.owner.y + Math.sin(angle) * startDist
      );
      this.effectGraphics.lineTo(
        this.owner.x + Math.cos(angle) * endDist,
        this.owner.y + Math.sin(angle) * endDist
      );
      this.effectGraphics.strokePath();
    }

    // Effacer après un délai
    this.scene.time.delayedCall(200, () => {
      this.effectGraphics.clear();
    });
  }

  /**
   * Mise à jour : déplacer les zombies affectés
   */
  public override update(): void {
    const deltaTime = 16; // ~60fps

    this.affectedZombies.forEach((data, zombie) => {
      if (!zombie.active) {
        this.affectedZombies.delete(zombie);
        return;
      }

      // Appliquer la vélocité
      zombie.x += data.vx * (deltaTime / 1000);
      zombie.y += data.vy * (deltaTime / 1000);

      // Friction
      data.vx *= 0.95;
      data.vy *= 0.95;

      // Réduire la durée
      data.duration -= deltaTime;

      // Vérifier les collisions avec d'autres zombies (pour les dégâts)
      if (this.isPushMode && (Math.abs(data.vx) > 100 || Math.abs(data.vy) > 100)) {
        this.checkZombieCollisions(zombie);
      }

      // Retirer si terminé
      if (data.duration <= 0 || (Math.abs(data.vx) < 10 && Math.abs(data.vy) < 10)) {
        this.affectedZombies.delete(zombie);
      }
    });
  }

  /**
   * Vérifie les collisions entre zombies projetés
   */
  private checkZombieCollisions(flyingZombie: Zombie): void {
    const activeZombies = this.scene.getActiveZombies();
    const collisionRadius = 30;

    for (const zombie of activeZombies) {
      if (!zombie.active || zombie === flyingZombie) continue;
      if (this.affectedZombies.has(zombie)) continue; // Déjà en mouvement

      const distance = Phaser.Math.Distance.Between(
        flyingZombie.x,
        flyingZombie.y,
        zombie.x,
        zombie.y
      );

      if (distance < collisionRadius) {
        // Dégâts de collision
        zombie.takeDamage(this.collisionDamage);
        flyingZombie.takeDamage(this.collisionDamage * 0.5);

        // Effet visuel d'impact
        this.createCollisionEffect(
          (flyingZombie.x + zombie.x) / 2,
          (flyingZombie.y + zombie.y) / 2
        );

        // Propager le mouvement au zombie touché
        const data = this.affectedZombies.get(flyingZombie);
        if (data) {
          this.affectedZombies.set(zombie, {
            vx: data.vx * 0.5,
            vy: data.vy * 0.5,
            duration: 200,
          });
        }
      }
    }
  }

  /**
   * Effet visuel de collision entre zombies
   */
  private createCollisionEffect(x: number, y: number): void {
    // Impact
    const impact = this.scene.add.circle(x, y, 15, 0xffff00, 0.8);
    impact.setDepth(13);

    this.scene.tweens.add({
      targets: impact,
      scale: 2,
      alpha: 0,
      duration: 150,
      onComplete: () => impact.destroy(),
    });

    // Étoiles d'impact
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const star = this.scene.add.text(
        x + Math.cos(angle) * 10,
        y + Math.sin(angle) * 10,
        '✦',
        { fontSize: '10px', color: '#ffff00' }
      );
      star.setOrigin(0.5);
      star.setDepth(14);

      this.scene.tweens.add({
        targets: star,
        x: star.x + Math.cos(angle) * 30,
        y: star.y + Math.sin(angle) * 30,
        alpha: 0,
        duration: 300,
        onComplete: () => star.destroy(),
      });
    }
  }

  /**
   * Override createProjectile (non utilisé)
   */
  protected override createProjectile(_direction: Phaser.Math.Vector2): void {
    // Le Gravity Gun n'utilise pas de projectiles
  }

  /**
   * Retourne le mode actuel
   */
  public getMode(): 'push' | 'pull' {
    return this.isPushMode ? 'push' : 'pull';
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.effectGraphics?.destroy();
    this.affectedZombies.clear();
  }
}
