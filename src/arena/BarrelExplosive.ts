import Phaser from 'phaser';
import { Interactive, InteractiveType, TriggerType, type InteractiveConfig } from './Interactive';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';

/**
 * Configuration spécifique pour un baril explosif
 */
export interface BarrelExplosiveConfig extends InteractiveConfig {
  explosionDamage?: number;
  explosionRadius?: number;
}

/**
 * Baril explosif
 * - Déclenché par des projectiles ou explosions
 * - Explosion avec dégâts de zone
 * - Réaction en chaîne avec d'autres barils
 * - Affecte joueur ET zombies
 */
export class BarrelExplosive extends Interactive {
  /** Dégâts de l'explosion */
  private explosionDamage: number;
  /** Rayon de l'explosion */
  private explosionRadius: number;
  /** Évite les déclenchements multiples */
  private isExploding: boolean = false;

  constructor(scene: GameScene, config: BarrelExplosiveConfig) {
    super(scene, InteractiveType.BARREL_EXPLOSIVE, {
      ...config,
      triggerType: TriggerType.ON_DAMAGE,
      charges: 1,
    });

    const balanceConfig = BALANCE.interactive?.barrel ?? {
      health: 50,
      explosionDamage: 100,
      explosionRadius: 128,
    };

    this.explosionDamage = config.explosionDamage ?? balanceConfig.explosionDamage ?? 100;
    this.explosionRadius = config.explosionRadius ?? balanceConfig.explosionRadius ?? 128;

    // Dessiner le sprite après initialisation
    this.drawSprite();
  }

  /**
   * Retourne la configuration de balance
   */
  protected getBalanceConfig(): {
    health?: number;
    cooldown?: number;
    charges?: number;
  } {
    return BALANCE.interactive?.barrel ?? { health: 50 };
  }

  /**
   * Dessine le baril
   */
  protected drawSprite(): void {
    this.sprite.clear();

    const w = this.interactiveWidth;
    const h = this.interactiveHeight;
    const halfW = w / 2;
    const halfH = h / 2;

    // Corps du baril (rouge foncé)
    this.sprite.fillStyle(0x8b0000);
    this.sprite.fillRoundedRect(-halfW, -halfH, w, h, 4);

    // Bandes métalliques (gris)
    this.sprite.fillStyle(0x666666);
    this.sprite.fillRect(-halfW - 2, -halfH + 4, w + 4, 4);
    this.sprite.fillRect(-halfW - 2, halfH - 8, w + 4, 4);

    // Symbole danger (triangle jaune avec !)
    this.sprite.fillStyle(0xffcc00);
    this.sprite.fillTriangle(0, -8, -6, 4, 6, 4);
    this.sprite.fillStyle(0x000000);
    this.sprite.fillRect(-1, -4, 2, 6);
    this.sprite.fillCircle(0, 4, 1);

    // Contour
    this.sprite.lineStyle(2, 0x5a0000);
    this.sprite.strokeRoundedRect(-halfW, -halfH, w, h, 4);
  }

  /**
   * Exécute l'effet d'explosion
   */
  protected executeEffect(): void {
    if (this.isExploding) return;
    this.isExploding = true;

    // Créer les effets visuels
    this.createExplosionEffect();

    // Appliquer les dégâts aux entités dans la zone
    this.applyExplosionDamage();

    // Déclencher les réactions en chaîne
    this.triggerChainReaction();

    // Screen shake
    this.scene.cameras.main.shake(200, 0.01);
  }

  /**
   * Crée l'effet visuel d'explosion
   */
  private createExplosionEffect(): void {
    // Flash central
    const flash = this.scene.add.circle(this.x, this.y, 20, 0xffffff, 1);
    flash.setDepth(this.depth + 5);

    this.scene.tweens.add({
      targets: flash,
      scale: 3,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy(),
    });

    // Cercle d'explosion principal
    const explosion = this.scene.add.circle(this.x, this.y, 10, 0xff4500, 0.8);
    explosion.setDepth(this.depth + 4);

    this.scene.tweens.add({
      targets: explosion,
      scale: this.explosionRadius / 10,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => explosion.destroy(),
    });

    // Onde de choc
    const shockwave = this.scene.add.circle(this.x, this.y, 10, 0xffffff, 0);
    shockwave.setStrokeStyle(4, 0xff6600, 0.8);
    shockwave.setDepth(this.depth + 3);

    this.scene.tweens.add({
      targets: shockwave,
      scale: (this.explosionRadius * 1.5) / 10,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => shockwave.destroy(),
    });

    // Particules de débris
    this.createExplosionDebris();

    // Fumée
    this.createSmokeEffect();
  }

  /**
   * Crée les particules de débris d'explosion
   */
  private createExplosionDebris(): void {
    const debrisCount = 15;

    for (let i = 0; i < debrisCount; i++) {
      const angle = (Math.PI * 2 * i) / debrisCount + (Math.random() - 0.5) * 0.5;
      const speed = 100 + Math.random() * 200;
      const size = 3 + Math.random() * 5;

      // Couleurs variées (rouge, orange, noir)
      const colors = [0xff4500, 0xff6600, 0xff0000, 0x333333];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const debris = this.scene.add.rectangle(this.x, this.y, size, size, color);
      debris.setDepth(this.depth + 2);

      const targetX = this.x + Math.cos(angle) * speed;
      const targetY = this.y + Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: debris,
        x: targetX,
        y: targetY,
        alpha: 0,
        angle: Math.random() * 720,
        scale: 0.3,
        duration: 300 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => debris.destroy(),
      });
    }
  }

  /**
   * Crée l'effet de fumée après l'explosion
   */
  private createSmokeEffect(): void {
    const smokeCount = 5;

    for (let i = 0; i < smokeCount; i++) {
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;

      const smoke = this.scene.add.circle(
        this.x + offsetX,
        this.y + offsetY,
        10 + Math.random() * 10,
        0x333333,
        0.5
      );
      smoke.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: smoke,
        y: smoke.y - 50,
        scale: 2,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Quad.easeOut',
        delay: i * 50,
        onComplete: () => smoke.destroy(),
      });
    }
  }

  /**
   * Applique les dégâts de l'explosion aux entités
   */
  private applyExplosionDamage(): void {
    const radiusSq = this.explosionRadius * this.explosionRadius;
    let kills = 0;

    // Dégâts au joueur
    const player = this.scene.getPlayer();
    if (player && player.active) {
      const distSq = Phaser.Math.Distance.Squared(this.x, this.y, player.x, player.y);
      if (distSq <= radiusSq) {
        // Dégâts réduits avec la distance
        const damageFactor = 1 - Math.sqrt(distSq) / this.explosionRadius;
        const damage = Math.floor(this.explosionDamage * damageFactor);
        player.takeDamage(damage);
      }
    }

    // Dégâts aux zombies
    const zombies = this.scene.getActiveZombies();
    for (const zombie of zombies) {
      if (!zombie.active) continue;

      const distSq = Phaser.Math.Distance.Squared(this.x, this.y, zombie.x, zombie.y);
      if (distSq <= radiusSq) {
        const damageFactor = 1 - Math.sqrt(distSq) / this.explosionRadius;
        const damage = Math.floor(this.explosionDamage * damageFactor);

        const wasAlive = zombie.getHealth() > 0;
        zombie.takeDamage(damage);

        if (wasAlive && zombie.getHealth() <= 0) {
          kills++;
        }
      }
    }

    // Émettre l'événement d'explosion avec les stats
    this.scene.events.emit('interactive:explosion', {
      elementId: this.id,
      position: { x: this.x, y: this.y },
      damage: this.explosionDamage,
      radius: this.explosionRadius,
      kills,
    });
  }

  /**
   * Déclenche les réactions en chaîne avec d'autres barils
   */
  private triggerChainReaction(): void {
    // Récupérer les éléments interactifs de l'arena
    const arena = (this.scene as GameScene & { arena: { getInteractiveElements(): Interactive[] } }).arena;
    if (!arena?.getInteractiveElements) return;

    const interactives = arena.getInteractiveElements();
    const chainRadius = this.explosionRadius * 1.2; // Un peu plus grand pour le chain
    const chainRadiusSq = chainRadius * chainRadius;

    for (const interactive of interactives) {
      if (interactive === this || interactive.isDestroyed()) continue;

      const distSq = Phaser.Math.Distance.Squared(this.x, this.y, interactive.x, interactive.y);
      if (distSq <= chainRadiusSq) {
        // Délai pour effet visuel de chaîne
        this.scene.time.delayedCall(50 + Math.random() * 100, () => {
          interactive.takeDamage(this.explosionDamage * 0.5, 'chain_explosion');
        });
      }
    }
  }

  /**
   * Retourne la couleur des débris
   */
  protected override getDebrisColor(): number {
    return 0x8b0000;
  }

  /**
   * Retourne les dimensions par défaut
   */
  protected override getDefaultWidth(): number {
    return 32;
  }

  protected override getDefaultHeight(): number {
    return 40;
  }
}
