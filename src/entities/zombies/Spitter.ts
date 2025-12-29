import type { GameScene } from '@scenes/GameScene';
import { Zombie, ZombieConfig } from './Zombie';
import { ASSET_KEYS } from '@config/assets.manifest';
import { BALANCE } from '@config/balance';
import type { AcidSpitPool } from '@entities/projectiles/AcidSpitPool';

/**
 * Configuration du Spitter depuis balance.ts
 */
const SPITTER_CONFIG: ZombieConfig = {
  type: 'spitter',
  texture: ASSET_KEYS.SPITTER,
  maxHealth: BALANCE.zombies.spitter.health,
  speed: BALANCE.zombies.spitter.speed,
  damage: BALANCE.zombies.spitter.damage,
  detectionRange: BALANCE.zombies.spitter.detectionRange,
  attackRange: BALANCE.zombies.spitter.attackRange,
  attackCooldown: BALANCE.zombies.spitter.attackCooldown,
  scoreValue: BALANCE.zombies.spitter.scoreValue,
};

/**
 * Spitter - Zombie à distance qui crache de l'acide
 *
 * Caractéristiques selon le GDD:
 * - HP faible (25), vitesse moyenne (70)
 * - Attaque à distance (300px)
 * - Maintient une distance préférée (200px)
 * - Fuit si le joueur est trop proche
 */
export class Spitter extends Zombie {
  /** Distance préférée pour attaquer */
  private readonly preferredRange: number = BALANCE.zombies.spitter.preferredRange;
  /** Vitesse du projectile */
  private readonly projectileSpeed: number = BALANCE.zombies.spitter.projectileSpeed;
  /** Dernière attaque */
  private lastAttackTime: number = 0;
  /** Pool de projectiles acides (référence partagée) */
  private acidPool: AcidSpitPool | null = null;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, SPITTER_CONFIG);
    this.onSpawn();
  }

  /**
   * Définit le pool de projectiles acides
   */
  public setAcidPool(pool: AcidSpitPool): void {
    this.acidPool = pool;
  }

  /**
   * Comportement lors du spawn
   */
  protected onSpawn(): void {
    // Le Spitter a une teinte verdâtre
    this.setTint(0xccffcc);
  }

  /**
   * Mise à jour du Spitter avec comportement ranged
   */
  update(time: number, delta: number): void {
    if (!this.active) return;

    // Comportement personnalisé pour le Spitter
    const player = this.scene.getPlayer();
    if (!player || !player.active) {
      super.update(time, delta);
      return;
    }

    const distance = this.movementComponent.distanceTo(player.x, player.y);

    // Comportement basé sur la distance
    if (distance < this.preferredRange * 0.7) {
      // Trop proche - fuir
      this.fleeFromPlayer(player);
    } else if (distance <= this.config.attackRange) {
      // Dans la portée d'attaque - tirer
      this.movementComponent.stop();
      this.tryAttack(time, player);
    } else if (distance <= this.config.detectionRange) {
      // Détecté mais pas à portée - s'approcher jusqu'à la distance préférée
      if (distance > this.preferredRange) {
        this.movementComponent.setTarget(player.x, player.y);
      } else {
        this.movementComponent.stop();
        this.tryAttack(time, player);
      }
    } else {
      // Hors de portée - idle
      this.movementComponent.stop();
    }

    // Rotation vers le joueur
    this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y));

    // Mise à jour du mouvement
    this.movementComponent.update(delta);
  }

  /**
   * Fuit le joueur
   */
  private fleeFromPlayer(player: Phaser.GameObjects.Sprite): void {
    // Calculer la direction opposée au joueur
    const fleeAngle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
    const fleeDistance = this.preferredRange;

    const targetX = this.x + Math.cos(fleeAngle) * fleeDistance;
    const targetY = this.y + Math.sin(fleeAngle) * fleeDistance;

    this.movementComponent.setTarget(targetX, targetY);
  }

  /**
   * Tente une attaque
   */
  private tryAttack(time: number, player: Phaser.GameObjects.Sprite): void {
    if (time - this.lastAttackTime < this.config.attackCooldown) return;

    this.lastAttackTime = time;
    this.fireAcid(player.x, player.y);

    // Animation d'attaque
    this.setTint(0x00ff00);
    this.scene.time.delayedCall(100, () => {
      if (this.active) {
        this.setTint(0xccffcc);
      }
    });
  }

  /**
   * Tire un projectile acide vers une position
   */
  private fireAcid(targetX: number, targetY: number): void {
    if (!this.acidPool) {
      // Si pas de pool, essayer de le récupérer depuis la scène
      const acidPool = (this.scene as GameScene & { acidSpitPool?: AcidSpitPool }).acidSpitPool;
      if (acidPool) {
        this.acidPool = acidPool;
      } else {
        return;
      }
    }

    this.acidPool.fire(
      this.x,
      this.y,
      targetX,
      targetY,
      this.projectileSpeed,
      this.damage
    );
  }

  /**
   * Réinitialise le Spitter pour réutilisation (pooling)
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);
    this.lastAttackTime = 0;
    this.setTint(0xccffcc);
  }
}
