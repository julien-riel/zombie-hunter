import type { GameScene } from '@scenes/GameScene';
import { Zombie, ZombieConfig } from './Zombie';
import { ASSET_KEYS } from '@config/assets.manifest';
import { BALANCE } from '@config/balance';

/**
 * Configuration du Crawler depuis balance.ts
 */
const CRAWLER_CONFIG: ZombieConfig = {
  type: 'crawler',
  texture: ASSET_KEYS.CRAWLER,
  maxHealth: BALANCE.zombies.crawler.health,
  speed: BALANCE.zombies.crawler.speed,
  damage: BALANCE.zombies.crawler.damage,
  detectionRange: BALANCE.zombies.crawler.detectionRange,
  attackRange: BALANCE.zombies.crawler.attackRange,
  attackCooldown: BALANCE.zombies.crawler.attackCooldown,
  scoreValue: BALANCE.zombies.crawler.scoreValue,
};

/** Opacité du Crawler en mode caché */
const HIDDEN_ALPHA = 0.3;

/** Durée de l'animation de révélation (ms) */
const REVEAL_DURATION = 300;

/**
 * Crawler - Zombie rampant
 *
 * Caractéristiques selon le GDD:
 * - Rampe au sol, difficile à repérer dans le chaos
 * - Surgit des angles morts
 * - Attaque surprise: dégâts + effet de sursaut (stun)
 *
 * Comportement spécial:
 * - Spawn en mode HIDDEN (semi-transparent)
 * - Se révèle avec un fade-in quand le joueur approche
 * - L'attaque applique un stun au joueur
 */
export class Crawler extends Zombie {
  /** Indique si le crawler est caché */
  private isHidden: boolean = true;

  /** Durée du stun appliqué au joueur (ms) */
  private readonly stunDuration: number = BALANCE.zombies.crawler.stunDuration;

  /** Animation de révélation en cours */
  private isRevealing: boolean = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, CRAWLER_CONFIG);
    this.onSpawn();
  }

  /**
   * Comportement lors du spawn
   */
  protected onSpawn(): void {
    // Le Crawler spawn en mode caché (semi-transparent)
    this.isHidden = true;
    this.isRevealing = false;
    this.setAlpha(HIDDEN_ALPHA);

    // Réduire la hitbox en hauteur pour simuler un ennemi rampant
    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      // Hitbox plus petite (24x16 au lieu de 32x32 standard)
      body.setSize(24, 16);
      body.setOffset(0, 4);
    }
  }

  /**
   * Mise à jour du Crawler
   */
  update(time: number, delta: number): void {
    if (!this.active) return;

    // En mode caché, vérifier si le joueur est proche pour se révéler
    if (this.isHidden && !this.isRevealing) {
      this.checkReveal();
    }

    // Si toujours caché, ne pas utiliser la state machine normale
    if (this.isHidden) {
      return;
    }

    // Comportement normal une fois révélé
    super.update(time, delta);
  }

  /**
   * Vérifie si le crawler doit se révéler
   */
  private checkReveal(): void {
    const player = this.scene.getPlayer();
    if (!player || !player.active) return;

    const distance = this.movementComponent.distanceTo(player.x, player.y);

    // Se révéler quand le joueur est à portée de détection
    if (distance <= this.config.detectionRange) {
      this.reveal();
    }
  }

  /**
   * Révèle le crawler avec un effet de fade-in
   */
  private reveal(): void {
    if (!this.isHidden || this.isRevealing) return;

    this.isRevealing = true;

    // Animation de révélation
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: REVEAL_DURATION,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.isHidden = false;
        this.isRevealing = false;
      },
    });

    // Effet visuel: léger flash pour attirer l'attention
    this.setTint(0xffff00);
    this.scene.time.delayedCall(100, () => {
      if (this.active) {
        this.clearTint();
      }
    });
  }

  /**
   * Override de l'attaque pour ajouter l'effet stun
   * Cette méthode est appelée par la state machine lors d'une attaque réussie
   */
  public getDamage(): number {
    // Appliquer le stun au joueur lors de l'attaque
    this.applyStunToPlayer();
    return this.damage;
  }

  /**
   * Applique l'effet de stun au joueur
   */
  private applyStunToPlayer(): void {
    const player = this.scene.getPlayer();
    if (!player || !player.active) return;

    // Appeler la méthode stun du joueur
    if (typeof player.applyStun === 'function') {
      player.applyStun(this.stunDuration);
    }
  }

  /**
   * Réinitialise le Crawler pour réutilisation (pooling)
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);

    // Réinitialiser l'état caché
    this.isHidden = true;
    this.isRevealing = false;
    this.setAlpha(HIDDEN_ALPHA);
    this.clearTint();

    // Réappliquer la hitbox réduite
    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setSize(24, 16);
      body.setOffset(0, 4);
    }
  }

  /**
   * Vérifie si le crawler est actuellement caché
   */
  public getIsHidden(): boolean {
    return this.isHidden;
  }
}
