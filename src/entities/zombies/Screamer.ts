import type { GameScene } from '@scenes/GameScene';
import { Zombie, ZombieConfig } from './Zombie';
import { ASSET_KEYS } from '@config/assets.manifest';
import { BALANCE } from '@config/balance';

/**
 * Configuration du Screamer depuis balance.ts
 */
const SCREAMER_CONFIG: ZombieConfig = {
  type: 'screamer',
  texture: ASSET_KEYS.SCREAMER,
  maxHealth: BALANCE.zombies.screamer.health,
  speed: BALANCE.zombies.screamer.speed,
  damage: BALANCE.zombies.screamer.damage,
  detectionRange: BALANCE.zombies.screamer.detectionRange,
  attackRange: BALANCE.zombies.screamer.attackRange,
  attackCooldown: BALANCE.zombies.screamer.attackCooldown,
  scoreValue: BALANCE.zombies.screamer.scoreValue,
};

/** Durée du buff de vitesse (ms) */
const SCREAM_DURATION = 5000;
/** Cooldown entre les cris (ms) */
const SCREAM_COOLDOWN = 8000;
/** Durée du wind-up avant le cri (ms) */
const SCREAM_WINDUP = 500;

/**
 * Screamer - Zombie qui amplifie les autres zombies
 *
 * Caractéristiques selon le GDD:
 * - HP faible (20), vitesse lente (50)
 * - Pousse un cri qui buff la vitesse des zombies proches
 * - Wind-up visible avant le cri (télégraphié)
 */
export class Screamer extends Zombie {
  /** Rayon du cri */
  private readonly screamRadius: number = BALANCE.zombies.screamer.screamRadius;
  /** Multiplicateur de vitesse appliqué */
  private readonly speedBoost: number = BALANCE.zombies.screamer.screamSpeedBoost;
  /** Dernière fois qu'un cri a été poussé */
  private lastScreamTime: number = 0;
  /** Indique si le Screamer est en train de crier */
  private isScreaming: boolean = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, SCREAMER_CONFIG);
    this.onSpawn();
  }

  /**
   * Comportement lors du spawn
   */
  protected onSpawn(): void {
    // Le Screamer a une teinte violette
    this.setTint(0xff00ff);
  }

  /**
   * Mise à jour du Screamer
   */
  update(time: number, delta: number): void {
    if (!this.active) return;

    // Ne pas se déplacer pendant le cri
    if (this.isScreaming) return;

    super.update(time, delta);

    // Vérifier si on peut crier
    const player = this.scene.getPlayer();
    if (!player || !player.active) return;

    const distance = this.movementComponent.distanceTo(player.x, player.y);

    // Crier quand le joueur est détecté et que le cooldown est passé
    if (distance <= this.config.detectionRange && time - this.lastScreamTime >= SCREAM_COOLDOWN) {
      this.startScream(time);
    }
  }

  /**
   * Commence le wind-up du cri
   */
  private startScream(time: number): void {
    if (this.isScreaming) return;

    this.isScreaming = true;
    this.lastScreamTime = time;

    // Arrêter le mouvement
    this.movementComponent.stop();

    // Animation de wind-up (grossissement + tremblement)
    this.setTint(0xffff00);

    // Effet de tremblement
    this.scene.tweens.add({
      targets: this,
      x: this.x + 2,
      duration: 50,
      yoyo: true,
      repeat: SCREAM_WINDUP / 100,
    });

    // Effet de grossissement
    this.scene.tweens.add({
      targets: this,
      scale: 1.3,
      duration: SCREAM_WINDUP,
      onComplete: () => {
        if (this.active) {
          this.performScream();
        }
      },
    });
  }

  /**
   * Effectue le cri et applique le buff
   */
  private performScream(): void {
    // Créer l'effet visuel du cri
    this.createScreamEffect();

    // Appliquer le buff aux zombies proches
    this.buffNearbyZombies();

    // Émettre un événement
    this.scene.events.emit('zombie:screamed', {
      x: this.x,
      y: this.y,
      radius: this.screamRadius,
    });

    // Revenir à l'état normal
    this.scene.time.delayedCall(300, () => {
      if (this.active) {
        this.isScreaming = false;
        this.setScale(1);
        this.setTint(0xff00ff);
      }
    });
  }

  /**
   * Crée l'effet visuel du cri
   */
  private createScreamEffect(): void {
    // Onde sonore
    const wave = this.scene.add.circle(this.x, this.y, 10, 0xff00ff, 0.3);

    this.scene.tweens.add({
      targets: wave,
      radius: this.screamRadius,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => {
        wave.destroy();
      },
    });

    // Particules d'onde secondaires
    for (let i = 0; i < 3; i++) {
      const delay = i * 100;
      this.scene.time.delayedCall(delay, () => {
        const miniWave = this.scene.add.circle(
          this.x,
          this.y,
          10 + i * 20,
          0xff66ff,
          0.2
        );

        this.scene.tweens.add({
          targets: miniWave,
          radius: this.screamRadius * 0.8,
          alpha: 0,
          duration: 300,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            miniWave.destroy();
          },
        });
      });
    }
  }

  /**
   * Applique le buff de vitesse aux zombies proches
   */
  private buffNearbyZombies(): void {
    const activeZombies = this.scene.getActiveZombies();

    for (const zombie of activeZombies) {
      if (zombie === this) continue;
      if (!zombie.active) continue;

      const distance = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        zombie.x,
        zombie.y
      );

      if (distance <= this.screamRadius) {
        this.applySpeedBuff(zombie);
      }
    }
  }

  /**
   * Applique le buff de vitesse à un zombie
   */
  private applySpeedBuff(zombie: Zombie): void {
    // Utiliser la méthode applySpeedBoost du MovementComponent
    zombie.movementComponent.applySpeedBoost(this.speedBoost, SCREAM_DURATION);

    // Effet visuel de buff
    zombie.setTint(0xff66ff);

    // Retirer l'effet visuel après la durée
    this.scene.time.delayedCall(SCREAM_DURATION, () => {
      if (zombie.active) {
        zombie.clearTint();
      }
    });
  }

  /**
   * Réinitialise le Screamer pour réutilisation (pooling)
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);
    this.lastScreamTime = 0;
    this.isScreaming = false;
    this.setTint(0xff00ff);
    this.setScale(1);
  }
}
