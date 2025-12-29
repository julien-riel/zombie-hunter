import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration d'une arme de mêlée
 */
export interface MeleeConfig {
  name: string;
  damage: number;
  range: number;
  swingSpeed: number;
  knockback: number;
  arcAngle: number;
}

/**
 * Classe de base pour toutes les armes de mêlée
 * Gère les attaques en arc et la détection de collision
 */
export abstract class MeleeWeapon {
  protected scene: GameScene;
  protected owner: Player;
  protected config: MeleeConfig;

  protected isSwinging: boolean = false;
  protected canSwing: boolean = true;
  protected lastSwingTime: number = 0;

  /** Graphique pour visualiser l'arc d'attaque */
  protected arcGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: GameScene, owner: Player, config: MeleeConfig) {
    this.scene = scene;
    this.owner = owner;
    this.config = config;

    // Créer le graphique pour l'arc
    this.arcGraphics = scene.add.graphics();
    this.arcGraphics.setDepth(10);
  }

  /**
   * Effectue une attaque en arc
   * @returns true si l'attaque a été effectuée
   */
  public swing(direction: Phaser.Math.Vector2): boolean {
    const now = this.scene.time.now;

    if (!this.canSwing || this.isSwinging) return false;
    if (now - this.lastSwingTime < this.config.swingSpeed) return false;

    this.lastSwingTime = now;
    this.isSwinging = true;
    this.canSwing = false;

    // Calculer l'angle central de l'attaque
    const centerAngle = Math.atan2(direction.y, direction.x);

    // Visualiser l'arc d'attaque
    this.drawSwingArc(centerAngle);

    // Détecter les zombies dans l'arc
    const hitZombies = this.detectZombiesInArc(centerAngle);

    // Appliquer les dégâts et effets
    this.onHit(hitZombies, direction);

    // Fin du swing
    this.scene.time.delayedCall(this.config.swingSpeed * 0.8, () => {
      this.isSwinging = false;
      this.clearArcGraphics();
    });

    // Cooldown
    this.scene.time.delayedCall(this.config.swingSpeed, () => {
      this.canSwing = true;
    });

    return true;
  }

  /**
   * Dessine l'arc d'attaque
   */
  protected drawSwingArc(centerAngle: number): void {
    if (!this.arcGraphics) return;

    this.arcGraphics.clear();
    this.arcGraphics.lineStyle(3, 0xffffff, 0.8);
    this.arcGraphics.fillStyle(0xffff00, 0.3);

    const halfArc = Phaser.Math.DegToRad(this.config.arcAngle / 2);
    const startAngle = centerAngle - halfArc;
    const endAngle = centerAngle + halfArc;

    // Dessiner le secteur
    this.arcGraphics.beginPath();
    this.arcGraphics.moveTo(this.owner.x, this.owner.y);
    this.arcGraphics.arc(
      this.owner.x,
      this.owner.y,
      this.config.range,
      startAngle,
      endAngle,
      false
    );
    this.arcGraphics.closePath();
    this.arcGraphics.fillPath();
    this.arcGraphics.strokePath();

    // Animer la disparition
    this.scene.tweens.add({
      targets: this.arcGraphics,
      alpha: 0,
      duration: this.config.swingSpeed * 0.6,
      onComplete: () => {
        if (this.arcGraphics) {
          this.arcGraphics.alpha = 1;
        }
      },
    });
  }

  /**
   * Efface le graphique de l'arc
   */
  protected clearArcGraphics(): void {
    if (this.arcGraphics) {
      this.arcGraphics.clear();
    }
  }

  /**
   * Détecte les zombies dans l'arc d'attaque
   */
  protected detectZombiesInArc(centerAngle: number): Zombie[] {
    const hitZombies: Zombie[] = [];
    const halfArc = Phaser.Math.DegToRad(this.config.arcAngle / 2);
    const activeZombies = this.scene.getActiveZombies();

    for (const zombie of activeZombies) {
      if (!zombie.active) continue;

      // Calculer la distance
      const dx = zombie.x - this.owner.x;
      const dy = zombie.y - this.owner.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Vérifier si dans la portée
      if (distance > this.config.range) continue;

      // Calculer l'angle vers le zombie
      const angleToZombie = Math.atan2(dy, dx);

      // Normaliser la différence d'angle
      let angleDiff = angleToZombie - centerAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Vérifier si dans l'arc
      if (Math.abs(angleDiff) <= halfArc) {
        hitZombies.push(zombie);
      }
    }

    return hitZombies;
  }

  /**
   * Applique les effets aux zombies touchés
   */
  protected onHit(zombies: Zombie[], direction: Phaser.Math.Vector2): void {
    for (const zombie of zombies) {
      // Infliger les dégâts
      zombie.takeDamage(this.config.damage);

      // Appliquer le knockback si configuré
      if (this.config.knockback > 0) {
        this.applyKnockback(zombie, direction);
      }

      // Créer un effet d'impact
      this.createHitEffect(zombie.x, zombie.y);
    }
  }

  /**
   * Applique un knockback au zombie
   */
  protected applyKnockback(zombie: Zombie, direction: Phaser.Math.Vector2): void {
    const body = zombie.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(
        direction.x * this.config.knockback,
        direction.y * this.config.knockback
      );
    }
  }

  /**
   * Crée un effet visuel d'impact
   */
  protected createHitEffect(x: number, y: number): void {
    const flash = this.scene.add.circle(x, y, 15, 0xff6600, 0.8);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 150,
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  /**
   * Met à jour l'arme (utilisé par les armes continues comme la tronçonneuse)
   */
  public update(): void {
    // Override dans les sous-classes si nécessaire
  }

  /**
   * Retourne les dégâts de l'arme
   */
  public getDamage(): number {
    return this.config.damage;
  }

  /**
   * Retourne le nom de l'arme
   */
  public getName(): string {
    return this.config.name;
  }

  /**
   * Indique si c'est une arme de mêlée (pour le système d'armes)
   */
  public isMelee(): boolean {
    return true;
  }

  /**
   * Propriétés pour compatibilité avec le système d'armes existant
   */
  public get currentAmmo(): number {
    return Infinity; // Les armes de mêlée n'ont pas de munitions
  }

  public get maxAmmo(): number {
    return Infinity;
  }

  public get isReloading(): boolean {
    return false;
  }

  /**
   * Méthode fire() pour compatibilité avec le système d'armes
   * Redirige vers swing()
   */
  public fire(direction: Phaser.Math.Vector2): boolean {
    return this.swing(direction);
  }

  /**
   * Rechargement (ne fait rien pour les armes de mêlée)
   */
  public reload(): void {
    // Les armes de mêlée ne rechargent pas
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    if (this.arcGraphics) {
      this.arcGraphics.destroy();
      this.arcGraphics = null;
    }
  }
}
