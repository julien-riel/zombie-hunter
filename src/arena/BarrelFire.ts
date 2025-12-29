import { Interactive, InteractiveType, TriggerType, type InteractiveConfig } from './Interactive';
import { FireZone } from './FireZone';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';

/**
 * Configuration spécifique pour un baril incendiaire
 */
export interface BarrelFireConfig extends InteractiveConfig {
  fireRadius?: number;
  fireDuration?: number;
  fireDamage?: number;
}

/**
 * Baril incendiaire
 * - Déclenché par des projectiles ou explosions
 * - Crée une FireZone au lieu d'une explosion
 * - Zone de feu persistante pendant X secondes
 */
export class BarrelFire extends Interactive {
  /** Rayon de la zone de feu */
  private fireRadius: number;
  /** Durée de la zone de feu en ms */
  private fireDuration: number;
  /** Dégâts par seconde du feu */
  private fireDamage: number;
  /** Évite les déclenchements multiples */
  private isIgniting: boolean = false;

  constructor(scene: GameScene, config: BarrelFireConfig) {
    super(scene, InteractiveType.BARREL_FIRE, {
      ...config,
      triggerType: TriggerType.ON_DAMAGE,
      charges: 1,
    });

    const balanceConfig = BALANCE.interactive?.barrelFire ?? {
      health: 40,
      fireRadius: 96,
      fireDuration: 5000,
      fireDamage: 20,
    };

    this.fireRadius = config.fireRadius ?? balanceConfig.fireRadius ?? 96;
    this.fireDuration = config.fireDuration ?? balanceConfig.fireDuration ?? 5000;
    this.fireDamage = config.fireDamage ?? balanceConfig.fireDamage ?? 20;

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
    return BALANCE.interactive?.barrelFire ?? { health: 40 };
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

    // Corps du baril (orange/jaune)
    this.sprite.fillStyle(0xcc6600);
    this.sprite.fillRoundedRect(-halfW, -halfH, w, h, 4);

    // Bandes métalliques
    this.sprite.fillStyle(0x555555);
    this.sprite.fillRect(-halfW - 2, -halfH + 4, w + 4, 4);
    this.sprite.fillRect(-halfW - 2, halfH - 8, w + 4, 4);

    // Symbole flamme
    this.sprite.fillStyle(0xff4500);
    // Dessin simplifié de flamme
    this.sprite.beginPath();
    this.sprite.moveTo(0, -8);
    this.sprite.lineTo(-5, 4);
    this.sprite.lineTo(-2, 2);
    this.sprite.lineTo(0, 6);
    this.sprite.lineTo(2, 2);
    this.sprite.lineTo(5, 4);
    this.sprite.closePath();
    this.sprite.fillPath();

    // Centre de la flamme (jaune)
    this.sprite.fillStyle(0xffcc00);
    this.sprite.fillTriangle(0, -4, -2, 2, 2, 2);

    // Contour
    this.sprite.lineStyle(2, 0x994400);
    this.sprite.strokeRoundedRect(-halfW, -halfH, w, h, 4);
  }

  /**
   * Exécute l'effet d'ignition
   */
  protected executeEffect(): void {
    if (this.isIgniting) return;
    this.isIgniting = true;

    // Créer l'effet visuel d'ignition
    this.createIgnitionEffect();

    // Créer la zone de feu
    this.createFireZone();

    // Petit screen shake
    this.scene.cameras.main.shake(100, 0.005);
  }

  /**
   * Crée l'effet visuel d'ignition
   */
  private createIgnitionEffect(): void {
    // Flash d'ignition
    const flash = this.scene.add.circle(this.x, this.y, 15, 0xff6600, 1);
    flash.setDepth(this.depth + 5);

    this.scene.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 150,
      onComplete: () => flash.destroy(),
    });

    // Étincelles initiales
    const sparkCount = 10;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount;
      const speed = 40 + Math.random() * 60;

      const spark = this.scene.add.rectangle(
        this.x,
        this.y,
        3,
        3,
        Math.random() > 0.5 ? 0xff6600 : 0xffcc00
      );
      spark.setDepth(this.depth + 4);

      const targetX = this.x + Math.cos(angle) * speed;
      const targetY = this.y + Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: spark,
        x: targetX,
        y: targetY - 20, // Monte légèrement
        alpha: 0,
        duration: 200 + Math.random() * 100,
        onComplete: () => spark.destroy(),
      });
    }

    // Fumée noire initiale
    for (let i = 0; i < 3; i++) {
      const smoke = this.scene.add.circle(
        this.x + (Math.random() - 0.5) * 20,
        this.y,
        8,
        0x222222,
        0.6
      );
      smoke.setDepth(this.depth + 3);

      this.scene.tweens.add({
        targets: smoke,
        y: smoke.y - 40,
        scale: 2,
        alpha: 0,
        duration: 400,
        delay: i * 50,
        onComplete: () => smoke.destroy(),
      });
    }
  }

  /**
   * Crée la zone de feu persistante
   */
  private createFireZone(): void {
    const fireZone = new FireZone(this.scene, {
      x: this.x,
      y: this.y,
      radius: this.fireRadius,
      damage: this.fireDamage,
      duration: this.fireDuration,
    });

    // Ajouter la zone de feu à l'arena
    const arena = (this.scene as GameScene & { arena: { addTerrainZone(zone: FireZone): void } }).arena;
    if (arena?.addTerrainZone) {
      arena.addTerrainZone(fireZone);
    }

    // Émettre l'événement
    this.scene.events.emit('interactive:fire_created', {
      elementId: this.id,
      position: { x: this.x, y: this.y },
      radius: this.fireRadius,
      duration: this.fireDuration,
    });
  }

  /**
   * Retourne la couleur des débris
   */
  protected override getDebrisColor(): number {
    return 0xcc6600;
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
