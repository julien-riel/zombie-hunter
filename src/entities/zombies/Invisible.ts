import type { GameScene } from '@scenes/GameScene';
import { Zombie, ZombieConfig } from './Zombie';
import { ASSET_KEYS } from '@config/assets.manifest';
import { BALANCE } from '@config/balance';

/**
 * Configuration de l'Invisible depuis balance.ts
 */
const INVISIBLE_CONFIG: ZombieConfig = {
  type: 'invisible',
  texture: ASSET_KEYS.INVISIBLE,
  maxHealth: BALANCE.zombies.invisible.health,
  speed: BALANCE.zombies.invisible.speed,
  damage: BALANCE.zombies.invisible.damage,
  detectionRange: BALANCE.zombies.invisible.detectionRange,
  attackRange: BALANCE.zombies.invisible.attackRange,
  attackCooldown: BALANCE.zombies.invisible.attackCooldown,
  scoreValue: BALANCE.zombies.invisible.scoreValue,
};

/** Opacité minimale (presque invisible) */
const MIN_ALPHA = 0.1;
/** Opacité maximale (complètement visible) */
const MAX_ALPHA = 1;
/** Durée de révélation après être touché (ms) */
const REVEAL_DURATION = 2000;

/**
 * Invisible - Zombie furtif
 *
 * Caractéristiques selon le GDD:
 * - HP faible (25), vitesse élevée (100)
 * - Dégâts importants (20)
 * - Presque invisible sauf quand proche du joueur
 * - Révélé par le feu, l'électricité, ou les flaques
 */
export class Invisible extends Zombie {
  /** Distance à laquelle le zombie devient visible */
  private readonly visibilityDistance: number = BALANCE.zombies.invisible.visibilityDistance;
  /** Indique si le zombie est actuellement révélé */
  private isRevealed: boolean = false;
  /** Timer de révélation */
  private revealTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, INVISIBLE_CONFIG);
    this.onSpawn();
  }

  /**
   * Comportement lors du spawn
   */
  protected onSpawn(): void {
    // Commencer presque invisible
    this.setAlpha(MIN_ALPHA);
  }

  /**
   * Mise à jour de l'Invisible
   */
  update(time: number, delta: number): void {
    if (!this.active) return;

    // Gérer la visibilité basée sur la distance au joueur
    if (!this.isRevealed) {
      this.updateVisibility();
    }

    super.update(time, delta);
  }

  /**
   * Met à jour la visibilité en fonction de la distance au joueur
   */
  private updateVisibility(): void {
    const player = this.scene.getPlayer();
    if (!player || !player.active) return;

    const distance = this.movementComponent.distanceTo(player.x, player.y);

    // Calculer l'opacité basée sur la distance
    if (distance <= this.visibilityDistance) {
      // Plus le joueur est proche, plus visible
      const visibility = 1 - (distance / this.visibilityDistance);
      const alpha = MIN_ALPHA + (MAX_ALPHA - MIN_ALPHA) * visibility;
      this.setAlpha(alpha);
    } else {
      // Hors de portée, presque invisible
      this.setAlpha(MIN_ALPHA);
    }
  }

  /**
   * Override de takeDamage pour révéler le zombie quand il est touché
   */
  public takeDamage(amount: number): void {
    // Révéler temporairement quand touché
    this.reveal(REVEAL_DURATION);

    super.takeDamage(amount);
  }

  /**
   * Révèle le zombie temporairement
   */
  public reveal(duration: number = REVEAL_DURATION): void {
    // Annuler le timer précédent s'il existe
    if (this.revealTimer) {
      this.revealTimer.destroy();
      this.revealTimer = null;
    }

    this.isRevealed = true;
    this.setAlpha(MAX_ALPHA);

    // Effet de scintillement à la révélation
    this.setTint(0xffffff);

    // Programmer la fin de la révélation
    this.revealTimer = this.scene.time.delayedCall(duration, () => {
      if (this.active) {
        this.isRevealed = false;
        this.clearTint();
        // L'opacité sera mise à jour automatiquement dans update()
      }
    });
  }

  /**
   * Vérifie si le zombie est actuellement révélé
   */
  public getIsRevealed(): boolean {
    return this.isRevealed;
  }

  /**
   * Override de l'animation de mort
   */
  protected playDeathAnimation(): void {
    // Désactiver le corps physique immédiatement
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    // Effet de disparition spécial
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.8,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.deactivate();
      },
    });

    // Particules fantomatiques
    for (let i = 0; i < 5; i++) {
      const particle = this.scene.add.circle(
        this.x + Phaser.Math.Between(-10, 10),
        this.y + Phaser.Math.Between(-10, 10),
        4,
        0xffffff,
        0.5
      );

      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 30,
        alpha: 0,
        duration: 600,
        delay: i * 50,
        ease: 'Quad.easeOut',
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }

  /**
   * Réinitialise l'Invisible pour réutilisation (pooling)
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);

    // Annuler le timer de révélation
    if (this.revealTimer) {
      this.revealTimer.destroy();
      this.revealTimer = null;
    }

    this.isRevealed = false;
    this.setAlpha(MIN_ALPHA);
    this.clearTint();
    this.setScale(1);
  }
}
