import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';
import { ActiveItem, ActiveItemType, ActiveItemRarity } from './ActiveItem';
import { BALANCE } from '@config/balance';

const CONFIG = BALANCE.activeItems.mine;

/**
 * Mine de proximité
 *
 * Une mine qui explose quand un zombie s'en approche.
 * - Dégâts: 80 en zone (rayon 60px)
 * - Rayon de détection: 40px
 * - Temps d'armement: 1 seconde
 * - Limite: 3 mines actives
 */
export class ProximityMine extends ActiveItem {
  public readonly type: ActiveItemType = 'mine';
  public readonly rarity: ActiveItemRarity = CONFIG.rarity;
  public readonly color: number = CONFIG.color;
  public readonly name: string = 'Mine de Proximité';
  public readonly description: string = 'Explose au contact des zombies (80 dégâts)';

  // Configuration
  private readonly damage: number = CONFIG.damage;
  private readonly explosionRadius: number = CONFIG.explosionRadius;
  private readonly detectionRadius: number = CONFIG.detectionRadius;
  private readonly armingTime: number = CONFIG.armingTime;

  // État
  private isArmed: boolean = false;
  private armingProgress: number = 0;
  private hasExploded: boolean = false;

  // Visuels
  private container: Phaser.GameObjects.Container | null = null;
  private baseGraphics: Phaser.GameObjects.Graphics | null = null;
  private lightGraphics: Phaser.GameObjects.Graphics | null = null;
  private blinkTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super();
    // Les mines n'ont pas de durée limitée
    this.duration = 0;
  }

  /**
   * Déploie la mine à une position
   */
  protected onDeploy(
    _player: Player,
    scene: GameScene,
    x: number,
    y: number
  ): boolean {
    // Créer le conteneur
    this.container = scene.add.container(x, y);

    // Corps de la mine
    this.baseGraphics = scene.add.graphics();
    this.drawMineBody(false);
    this.container.add(this.baseGraphics);

    // LED indicatrice
    this.lightGraphics = scene.add.graphics();
    this.drawLight(0xff0000, 0.3); // Rouge = pas armée
    this.container.add(this.lightGraphics);

    // Animation de déploiement
    this.container.setScale(0);
    scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });

    return true;
  }

  /**
   * Met à jour la mine
   */
  protected onUpdate(
    delta: number,
    _player: Player,
    scene: GameScene
  ): boolean {
    if (!this.container || this.hasExploded) return false;

    // Phase d'armement
    if (!this.isArmed) {
      this.armingProgress += delta;
      if (this.armingProgress >= this.armingTime) {
        this.arm(scene);
      }
      return true;
    }

    // Détection des zombies
    const zombies = scene.getActiveZombies();
    for (const zombie of zombies) {
      if (!zombie.active || zombie.getHealth() <= 0) continue;

      const dist = Phaser.Math.Distance.Between(
        this.position.x,
        this.position.y,
        zombie.x,
        zombie.y
      );

      if (dist <= this.detectionRadius) {
        this.explode(scene);
        return false;
      }
    }

    return true;
  }

  /**
   * Détruit la mine
   */
  protected onDestroy(_player: Player, _scene: GameScene): void {
    this.cleanup();
  }

  /**
   * Arme la mine (prête à exploser)
   */
  private arm(scene: GameScene): void {
    this.isArmed = true;

    // Changer l'apparence
    this.drawMineBody(true);
    this.drawLight(0x00ff00, 1); // Vert = armée

    // Animation de clignotement
    if (this.lightGraphics) {
      this.blinkTween = scene.tweens.add({
        targets: this.lightGraphics,
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }

    // Son d'armement (placeholder)
    console.log('[ProximityMine] Armed!');
  }

  /**
   * Fait exploser la mine
   */
  private explode(scene: GameScene): void {
    if (this.hasExploded) return;
    this.hasExploded = true;

    // Arrêter le clignotement
    if (this.blinkTween) {
      this.blinkTween.stop();
    }

    // Effet d'explosion
    this.createExplosionEffect(scene);

    // Infliger des dégâts aux zombies dans le rayon
    const zombies = scene.getActiveZombies();
    let zombiesHit = 0;

    for (const zombie of zombies) {
      if (!zombie.active || zombie.getHealth() <= 0) continue;

      const dist = Phaser.Math.Distance.Between(
        this.position.x,
        this.position.y,
        zombie.x,
        zombie.y
      );

      if (dist <= this.explosionRadius) {
        // Dégâts décroissants avec la distance
        const damageMultiplier = 1 - (dist / this.explosionRadius) * 0.5;
        const actualDamage = Math.floor(this.damage * damageMultiplier);
        zombie.takeDamage(actualDamage);
        zombiesHit++;

        // Knockback
        this.applyKnockback(zombie, scene);
      }
    }

    // Émettre l'événement d'explosion
    scene.events.emit('activeitem:mine_explode', {
      itemId: this.id,
      position: this.position,
      zombiesHit,
    });

    console.log(`[ProximityMine] Exploded! Hit ${zombiesHit} zombies`);

    // Nettoyer après l'animation
    scene.time.delayedCall(100, () => {
      this.cleanup();
    });
  }

  /**
   * Dessine le corps de la mine
   */
  private drawMineBody(armed: boolean): void {
    if (!this.baseGraphics) return;

    this.baseGraphics.clear();

    // Corps principal (octogone)
    const radius = 12;
    const color = armed ? 0x444444 : 0x333333;

    this.baseGraphics.fillStyle(color, 1);
    this.baseGraphics.beginPath();

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) {
        this.baseGraphics.moveTo(px, py);
      } else {
        this.baseGraphics.lineTo(px, py);
      }
    }
    this.baseGraphics.closePath();
    this.baseGraphics.fillPath();

    // Contour
    this.baseGraphics.lineStyle(2, armed ? 0x666666 : 0x555555, 1);
    this.baseGraphics.strokePath();

    // Détails centraux
    this.baseGraphics.fillStyle(0x222222, 1);
    this.baseGraphics.fillCircle(0, 0, 5);
  }

  /**
   * Dessine la LED indicatrice
   */
  private drawLight(color: number, alpha: number): void {
    if (!this.lightGraphics) return;

    this.lightGraphics.clear();
    this.lightGraphics.fillStyle(color, alpha);
    this.lightGraphics.fillCircle(0, -6, 3);

    // Lueur
    this.lightGraphics.fillStyle(color, alpha * 0.3);
    this.lightGraphics.fillCircle(0, -6, 6);
  }

  /**
   * Crée l'effet d'explosion
   */
  private createExplosionEffect(scene: GameScene): void {
    // Cercle d'explosion principal
    const explosion = scene.add.circle(
      this.position.x,
      this.position.y,
      this.explosionRadius,
      0xff6600,
      0.6
    );

    scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // Cercle intérieur (plus lumineux)
    const innerExplosion = scene.add.circle(
      this.position.x,
      this.position.y,
      this.explosionRadius * 0.5,
      0xffaa00,
      0.8
    );

    scene.tweens.add({
      targets: innerExplosion,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => innerExplosion.destroy(),
    });

    // Particules de débris
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 50 + Math.random() * 100;
      const debris = scene.add.rectangle(
        this.position.x,
        this.position.y,
        3,
        3,
        0x888888
      );

      scene.tweens.add({
        targets: debris,
        x: this.position.x + Math.cos(angle) * speed,
        y: this.position.y + Math.sin(angle) * speed,
        alpha: 0,
        rotation: Math.random() * 6,
        duration: 400,
        onComplete: () => debris.destroy(),
      });
    }

    // Shake de la caméra
    scene.cameras.main.shake(100, 0.01);
  }

  /**
   * Applique un knockback à un zombie
   */
  private applyKnockback(zombie: Zombie, scene: GameScene): void {
    const angle = Phaser.Math.Angle.Between(
      this.position.x,
      this.position.y,
      zombie.x,
      zombie.y
    );

    const knockbackDistance = 50;

    scene.tweens.add({
      targets: zombie,
      x: zombie.x + Math.cos(angle) * knockbackDistance,
      y: zombie.y + Math.sin(angle) * knockbackDistance,
      duration: 150,
      ease: 'Power2',
    });
  }

  /**
   * Vérifie si la mine est armée
   */
  public getIsArmed(): boolean {
    return this.isArmed;
  }

  /**
   * Nettoie les ressources
   */
  private cleanup(): void {
    if (this.blinkTween) {
      this.blinkTween.stop();
      this.blinkTween = null;
    }
    if (this.baseGraphics) {
      this.baseGraphics.destroy();
      this.baseGraphics = null;
    }
    if (this.lightGraphics) {
      this.lightGraphics.destroy();
      this.lightGraphics = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
