import Phaser from 'phaser';
import { Weapon, WeaponConfig } from '@weapons/Weapon';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration du Zombie Converter
 */
const ZOMBIE_CONVERTER_CONFIG: WeaponConfig = {
  name: 'Convertisseur de Zombies',
  damage: 0, // Pas de dégâts directs
  fireRate: BALANCE.weapons.zombieConverter.fireRate,
  maxAmmo: BALANCE.weapons.zombieConverter.magazineSize,
  reloadTime: BALANCE.weapons.zombieConverter.reloadTime,
  bulletSpeed: BALANCE.weapons.zombieConverter.projectileSpeed,
};

/**
 * Représente un zombie converti (allié temporaire)
 */
interface ConvertedZombie {
  zombie: Zombie;
  remainingDuration: number;
  originalTint: number | null;
  healthBar: Phaser.GameObjects.Graphics;
  indicator: Phaser.GameObjects.Arc;
}

/**
 * Zombie Converter - Arme Expérimentale SECRÈTE
 * - Tire un rayon qui convertit les zombies en alliés
 * - Les zombies convertis attaquent leurs anciens congénères
 * - Durée limitée, maximum 3 zombies convertis en même temps
 * - Déblocage : Secret (condition spéciale)
 */
export class ZombieConverter extends Weapon {
  private convertDuration: number;
  private maxConverted: number;
  private convertedDamageBonus: number;

  /** Zombies actuellement convertis */
  private convertedZombies: ConvertedZombie[] = [];

  /** Graphiques pour les effets */
  private effectGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: GameScene, owner: Player) {
    super(scene, owner, ZOMBIE_CONVERTER_CONFIG);

    this.convertDuration = BALANCE.weapons.zombieConverter.convertDuration;
    this.maxConverted = BALANCE.weapons.zombieConverter.maxConverted;
    this.convertedDamageBonus = BALANCE.weapons.zombieConverter.convertedDamageBonus;

    this.effectGraphics = scene.add.graphics();
    this.effectGraphics.setDepth(15);
  }

  /**
   * Crée le projectile de conversion
   */
  protected override createProjectile(direction: Phaser.Math.Vector2): void {
    const startX = this.owner.x;
    const startY = this.owner.y;

    // Créer le projectile (orbe verte brillante)
    const projectile = this.scene.add.circle(startX, startY, 12, 0x00ff88, 0.9);
    projectile.setDepth(10);

    // Aura de conversion
    const aura = this.scene.add.circle(startX, startY, 20, 0x00ff88, 0.3);
    aura.setDepth(9);

    // Symboles qui orbitent
    const symbols: Phaser.GameObjects.Text[] = [];
    const symbolChars = ['☯', '♻', '⟳'];
    for (let i = 0; i < 3; i++) {
      const symbol = this.scene.add.text(startX, startY, symbolChars[i], {
        fontSize: '10px',
        color: '#00ff88',
      });
      symbol.setOrigin(0.5);
      symbol.setDepth(10);
      symbols.push(symbol);
    }

    const velocity = {
      x: direction.x * this.config.bulletSpeed,
      y: direction.y * this.config.bulletSpeed,
    };

    let distanceTraveled = 0;
    const maxDistance = 350;

    const updateEvent = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!projectile.active) return;

        // Déplacer le projectile
        projectile.x += velocity.x * 0.016;
        projectile.y += velocity.y * 0.016;
        aura.x = projectile.x;
        aura.y = projectile.y;

        // Animation des symboles en orbite
        symbols.forEach((s, i) => {
          const angle = this.scene.time.now / 300 + (i / 3) * Math.PI * 2;
          const dist = 18;
          s.x = projectile.x + Math.cos(angle) * dist;
          s.y = projectile.y + Math.sin(angle) * dist;
          s.setRotation(angle);
        });

        // Pulsation de l'aura
        aura.setScale(1 + Math.sin(this.scene.time.now / 100) * 0.3);

        distanceTraveled += this.config.bulletSpeed * 0.016;

        // Vérifier collision avec zombie
        const hitZombie = this.findConvertibleZombie(projectile.x, projectile.y);
        if (hitZombie) {
          this.convertZombie(hitZombie, projectile.x, projectile.y);
          this.destroyProjectile(projectile, aura, symbols, updateEvent);
          return;
        }

        // Vérifier la portée max
        if (distanceTraveled >= maxDistance) {
          // Effet de dissipation
          this.createDissipateEffect(projectile.x, projectile.y);
          this.destroyProjectile(projectile, aura, symbols, updateEvent);
        }
      },
    });
  }

  /**
   * Trouve un zombie convertible (pas déjà converti, pas un boss)
   */
  private findConvertibleZombie(x: number, y: number): Zombie | null {
    const activeZombies = this.scene.getActiveZombies();
    const hitRadius = 20;

    for (const zombie of activeZombies) {
      if (!zombie.active) continue;

      // Vérifier si déjà converti
      if (this.isZombieConverted(zombie)) continue;

      // Vérifier si c'est un boss (ne peut pas être converti)
      const zombieType = zombie.zombieType as string;
      if (zombieType === 'abomination' || zombieType === 'patient_zero' || zombieType === 'colossus') {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(x, y, zombie.x, zombie.y);
      if (distance < hitRadius + 16) {
        return zombie;
      }
    }

    return null;
  }

  /**
   * Vérifie si un zombie est déjà converti
   */
  private isZombieConverted(zombie: Zombie): boolean {
    return this.convertedZombies.some((c) => c.zombie === zombie);
  }

  /**
   * Convertit un zombie en allié
   */
  private convertZombie(zombie: Zombie, x: number, y: number): void {
    // Vérifier le maximum de zombies convertis
    if (this.convertedZombies.length >= this.maxConverted) {
      // Libérer le plus ancien
      const oldest = this.convertedZombies.shift();
      if (oldest) {
        this.revertZombie(oldest);
      }
    }

    // Effet visuel de conversion
    this.createConversionEffect(x, y);

    // Sauvegarder la teinte originale
    const originalTint = zombie.tintTopLeft;

    // Appliquer la teinte verte (allié)
    zombie.setTint(0x00ff88);

    // Marquer comme converti
    zombie.setData('isConverted', true);
    zombie.setData('convertedDamageBonus', this.convertedDamageBonus);

    // Créer l'indicateur visuel
    const indicator = this.scene.add.circle(zombie.x, zombie.y - 25, 6, 0x00ff88, 1);
    indicator.setStrokeStyle(2, 0xffffff, 1);
    indicator.setDepth(20);

    // Créer la barre de durée
    const healthBar = this.scene.add.graphics();
    healthBar.setDepth(20);

    const converted: ConvertedZombie = {
      zombie,
      remainingDuration: this.convertDuration,
      originalTint: originalTint || null,
      healthBar,
      indicator,
    };

    this.convertedZombies.push(converted);

    // Texte de notification
    const notifText = this.scene.add.text(zombie.x, zombie.y - 40, 'CONVERTI!', {
      fontSize: '12px',
      color: '#00ff88',
      fontStyle: 'bold',
      stroke: '#003322',
      strokeThickness: 2,
    });
    notifText.setOrigin(0.5);
    notifText.setDepth(25);

    this.scene.tweens.add({
      targets: notifText,
      y: notifText.y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => notifText.destroy(),
    });
  }

  /**
   * Revertit un zombie à son état normal
   */
  private revertZombie(converted: ConvertedZombie): void {
    const { zombie, originalTint, healthBar, indicator } = converted;

    if (zombie.active) {
      // Restaurer la teinte originale
      if (originalTint) {
        zombie.setTint(originalTint);
      } else {
        zombie.clearTint();
      }

      // Retirer les données de conversion
      zombie.setData('isConverted', false);
      zombie.setData('convertedDamageBonus', 0);

      // Effet de reversion
      this.createReversionEffect(zombie.x, zombie.y);
    }

    // Nettoyer les graphiques
    healthBar.destroy();
    indicator.destroy();
  }

  /**
   * Effet visuel de conversion
   */
  private createConversionEffect(x: number, y: number): void {
    // Explosion verte
    const flash = this.scene.add.circle(x, y, 30, 0x00ff88, 0.8);
    flash.setDepth(12);

    this.scene.tweens.add({
      targets: flash,
      scale: 3,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    });

    // Spirale de conversion
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const delay = i * 30;

      this.scene.time.delayedCall(delay, () => {
        const particle = this.scene.add.circle(
          x + Math.cos(angle) * 50,
          y + Math.sin(angle) * 50,
          5,
          0x00ff88,
          1
        );
        particle.setDepth(12);

        this.scene.tweens.add({
          targets: particle,
          x: x,
          y: y,
          scale: 0,
          duration: 300,
          onComplete: () => particle.destroy(),
        });
      });
    }

    // Symbole de paix
    const peaceSymbol = this.scene.add.text(x, y, '☮', {
      fontSize: '24px',
      color: '#00ff88',
    });
    peaceSymbol.setOrigin(0.5);
    peaceSymbol.setDepth(15);

    this.scene.tweens.add({
      targets: peaceSymbol,
      y: peaceSymbol.y - 40,
      scale: 2,
      alpha: 0,
      duration: 800,
      onComplete: () => peaceSymbol.destroy(),
    });
  }

  /**
   * Effet de reversion (fin de conversion)
   */
  private createReversionEffect(x: number, y: number): void {
    // Flash rouge
    const flash = this.scene.add.circle(x, y, 20, 0xff4444, 0.6);
    flash.setDepth(12);

    this.scene.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // Particules rouges
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const particle = this.scene.add.circle(x, y, 4, 0xff4444, 0.8);
      particle.setDepth(12);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40,
        alpha: 0,
        duration: 300,
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Effet de dissipation du projectile
   */
  private createDissipateEffect(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const particle = this.scene.add.circle(x, y, 4, 0x00ff88, 0.6);
      particle.setDepth(12);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 30,
        y: y + Math.sin(angle) * 30,
        alpha: 0,
        scale: 0.3,
        duration: 300,
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Mise à jour des zombies convertis
   */
  public override update(): void {
    const deltaTime = 16;

    for (let i = this.convertedZombies.length - 1; i >= 0; i--) {
      const converted = this.convertedZombies[i];
      const { zombie, healthBar, indicator } = converted;

      // Vérifier si le zombie est toujours actif
      if (!zombie.active) {
        healthBar.destroy();
        indicator.destroy();
        this.convertedZombies.splice(i, 1);
        continue;
      }

      // Réduire la durée
      converted.remainingDuration -= deltaTime;

      // Mettre à jour la position de l'indicateur
      indicator.x = zombie.x;
      indicator.y = zombie.y - 25;

      // Dessiner la barre de durée
      this.drawDurationBar(converted);

      // Faire attaquer les autres zombies
      this.updateConvertedBehavior(converted);

      // Vérifier fin de conversion
      if (converted.remainingDuration <= 0) {
        this.convertedZombies.splice(i, 1);
        this.revertZombie(converted);
      }
    }
  }

  /**
   * Dessine la barre de durée restante
   */
  private drawDurationBar(converted: ConvertedZombie): void {
    const { zombie, remainingDuration, healthBar } = converted;

    healthBar.clear();

    const barWidth = 30;
    const barHeight = 4;
    const barX = zombie.x - barWidth / 2;
    const barY = zombie.y - 32;

    // Fond
    healthBar.fillStyle(0x333333, 0.8);
    healthBar.fillRect(barX, barY, barWidth, barHeight);

    // Barre de durée
    const durationPercent = remainingDuration / this.convertDuration;
    healthBar.fillStyle(0x00ff88, 1);
    healthBar.fillRect(barX, barY, barWidth * durationPercent, barHeight);

    // Bordure
    healthBar.lineStyle(1, 0xffffff, 0.6);
    healthBar.strokeRect(barX, barY, barWidth, barHeight);
  }

  /**
   * Met à jour le comportement d'un zombie converti
   */
  private updateConvertedBehavior(converted: ConvertedZombie): void {
    const { zombie } = converted;
    const activeZombies = this.scene.getActiveZombies();

    // Trouver le zombie ennemi le plus proche
    let closestEnemy: Zombie | null = null;
    let closestDistance = 200; // Rayon de détection

    for (const enemy of activeZombies) {
      if (!enemy.active) continue;
      if (this.isZombieConverted(enemy)) continue; // Ignorer les alliés
      if (enemy === zombie) continue;

      const distance = Phaser.Math.Distance.Between(zombie.x, zombie.y, enemy.x, enemy.y);
      if (distance < closestDistance) {
        closestEnemy = enemy;
        closestDistance = distance;
      }
    }

    if (closestEnemy) {
      // Se déplacer vers l'ennemi
      const dx = closestEnemy.x - zombie.x;
      const dy = closestEnemy.y - zombie.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 30) {
        // Se rapprocher
        const speed = 80; // Vitesse de poursuite
        zombie.x += (dx / dist) * speed * 0.016;
        zombie.y += (dy / dist) * speed * 0.016;
      } else {
        // Attaquer!
        const canAttack = !zombie.getData('lastConvertedAttack') ||
          this.scene.time.now - zombie.getData('lastConvertedAttack') > 800;

        if (canAttack) {
          zombie.setData('lastConvertedAttack', this.scene.time.now);

          // Infliger des dégâts à l'ennemi
          const damage = 15 * (1 + this.convertedDamageBonus);
          closestEnemy.takeDamage(damage);

          // Effet d'attaque
          this.createAttackEffect(zombie.x, zombie.y, closestEnemy.x, closestEnemy.y);
        }
      }
    }
  }

  /**
   * Effet visuel d'attaque entre zombies
   */
  private createAttackEffect(x1: number, y1: number, x2: number, y2: number): void {
    // Ligne d'attaque
    this.effectGraphics.lineStyle(3, 0x00ff88, 0.8);
    this.effectGraphics.beginPath();
    this.effectGraphics.moveTo(x1, y1);
    this.effectGraphics.lineTo(x2, y2);
    this.effectGraphics.strokePath();

    // Impact
    const impact = this.scene.add.circle(x2, y2, 15, 0x00ff88, 0.6);
    impact.setDepth(12);

    this.scene.tweens.add({
      targets: impact,
      scale: 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => impact.destroy(),
    });

    // Effacer la ligne
    this.scene.time.delayedCall(100, () => {
      this.effectGraphics.clear();
    });
  }

  /**
   * Détruit un projectile
   */
  private destroyProjectile(
    projectile: Phaser.GameObjects.Arc,
    aura: Phaser.GameObjects.Arc,
    symbols: Phaser.GameObjects.Text[],
    updateEvent: Phaser.Time.TimerEvent
  ): void {
    updateEvent.remove();
    projectile.destroy();
    aura.destroy();
    symbols.forEach((s) => s.destroy());
  }

  /**
   * Retourne le nombre de zombies convertis
   */
  public getConvertedCount(): number {
    return this.convertedZombies.length;
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    for (const converted of this.convertedZombies) {
      converted.healthBar.destroy();
      converted.indicator.destroy();
    }
    this.convertedZombies = [];
    this.effectGraphics?.destroy();
  }
}
