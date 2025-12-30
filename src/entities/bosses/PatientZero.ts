/**
 * Patient Zero Boss - Phase 7.3
 *
 * Presque humain, intelligent, commande la horde.
 * - Phase 1 (100-50% HP): Combat direct, esquive les tirs
 * - Phase 2 (50-0% HP): Se cache, commande la horde
 */

import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import { Boss, type BossConfig } from './Boss';
import { BossStateMachine, BossState } from './BossStateMachine';
import { BALANCE } from '@config/balance';
import { GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Configuration de Patient Zéro
 */
const PATIENT_ZERO_CONFIG: BossConfig = {
  type: 'patient_zero',
  name: 'Patient Zéro',
  maxHealth: BALANCE.bosses?.patient_zero?.health ?? 800,
  speed: BALANCE.bosses?.patient_zero?.speed ?? 150,
  damage: BALANCE.bosses?.patient_zero?.damage ?? 25,
  attackCooldown: BALANCE.bosses?.patient_zero?.attackCooldown ?? 1000,
  detectionRange: 500,
  attackRange: 45,
  scoreValue: BALANCE.bosses?.patient_zero?.scoreValue ?? 600,
  texture: 'boss_patient_zero',
  scale: 1.3,
  hitboxSize: { width: 32, height: 32 },
  phases: [
    {
      healthThreshold: 1.0,
      behavior: 'aggressive',
      speedMultiplier: 1.0,
      damageMultiplier: 1.0,
    },
    {
      healthThreshold: 0.5,
      behavior: 'tactical',
      speedMultiplier: 1.2,
      damageMultiplier: 0.8,
      onEnter: undefined, // Défini dans le constructeur
    },
  ],
};

/**
 * Patient Zéro - Boss intelligent
 */
export class PatientZero extends Boss {
  /** Rayon de commande de la horde */
  private commandRadius: number = 400;

  /** Chance d'esquive */
  private dodgeChance: number = 0.4;

  /** Cooldown d'esquive */
  private dodgeCooldown: number = 800;

  /** Timestamp de la dernière esquive */
  private lastDodgeTime: number = 0;

  /** Durée d'esquive */
  private dodgeDuration: number = 200;

  /** Distance d'esquive */
  private dodgeDistance: number = 80;

  /** Indique si une esquive est en cours */
  private isDodging: boolean = false;

  /** Dégâts reçus récemment (pour fuite) */
  private recentDamage: number = 0;

  /** Seuil de dégâts pour fuir */
  private fleeThreshold: number = 100;

  /** Timer de reset des dégâts récents */
  private damageResetTimer: Phaser.Time.TimerEvent | null = null;

  /** Timer de commande de la horde */
  private commandTimer: Phaser.Time.TimerEvent | null = null;

  /** Indique si en phase tactique (phase 2) */
  private isTactical: boolean = false;

  /** Cooldown de téléportation */
  private teleportCooldown: number = 5000;

  /** Timestamp de la dernière téléportation */
  private lastTeleportTime: number = 0;

  constructor(scene: GameScene, x: number, y: number) {
    const config = { ...PATIENT_ZERO_CONFIG };
    config.phases = config.phases.map((phase, index) => ({
      ...phase,
      onEnter: index === 1 ? () => this.enterTacticalPhase() : undefined,
    }));

    super(scene, x, y, config);

    this.initBossStateMachine();
    this.startHordeCommand();
  }

  /**
   * Initialise la machine d'état
   */
  private initBossStateMachine(): void {
    const stateMachine = new BossStateMachine(this.scene, this);

    stateMachine.configureState(BossState.CHASE, {
      onUpdate: (delta) => this.updateChase(delta),
    });

    stateMachine.configureState(BossState.ATTACK, {
      onEnter: () => this.performMeleeAttack(),
      minDuration: 500,
    });

    stateMachine.configureState(BossState.RETREAT, {
      onEnter: () => this.startRetreat(),
      onUpdate: (delta) => this.updateRetreat(delta),
      minDuration: 2000,
    });

    stateMachine.configureState(BossState.SUMMON, {
      onEnter: () => this.buffNearbyZombies(),
      minDuration: 1500,
    });

    stateMachine.setDecisionCallback((delta) => this.makeDecision(delta));

    this.initStateMachine(stateMachine);
  }

  /**
   * Animation d'entrée
   */
  protected async entranceAnimation(): Promise<void> {
    return new Promise((resolve) => {
      // Apparition rapide et menaçante
      this.setAlpha(0);

      // Effet de téléportation
      const teleportEffect = this.scene.add.circle(this.x, this.y, 5, 0x00ff00, 0.8);

      this.scene.tweens.add({
        targets: teleportEffect,
        radius: 100,
        alpha: 0,
        duration: 500,
        onComplete: () => teleportEffect.destroy(),
      });

      // Apparition
      this.scene.tweens.add({
        targets: this,
        alpha: 1,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          // Pose menaçante
          this.scene.time.delayedCall(300, () => {
            this.playEntranceGesture();
            resolve();
          });
        },
      });
    });
  }

  /**
   * Geste d'entrée menaçant
   */
  private playEntranceGesture(): void {
    // Lever le bras (animation visuelle)
    this.setTint(0x00ff00);
    this.scene.time.delayedCall(500, () => {
      this.clearTint();
    });

    // Tous les zombies à proximité deviennent alertes
    this.alertNearbyZombies();
  }

  /**
   * Alerte les zombies proches
   */
  private alertNearbyZombies(): void {
    const zombies = this.getZombiesInRange(this.commandRadius);
    for (const zombie of zombies) {
      // Faire avancer les zombies vers le joueur
      const player = this.scene.getPlayer();
      if (player && (zombie as any).setTarget) {
        (zombie as any).setTarget(player);
      }
    }
  }

  /**
   * Démarre le système de commande de la horde
   */
  private startHordeCommand(): void {
    this.commandTimer = this.scene.time.addEvent({
      delay: 2000,
      callback: () => this.commandHorde(),
      loop: true,
    });
  }

  /**
   * Commande la horde environnante
   */
  private commandHorde(): void {
    if (!this.active || this.stateMachine?.getCurrentState() === BossState.DEAD) {
      return;
    }

    const zombies = this.getZombiesInRange(this.commandRadius);
    const player = this.scene.getPlayer();

    if (!player) return;

    for (const zombie of zombies) {
      // Marquer comme coordonné
      if ((zombie as any).setCoordinated) {
        (zombie as any).setCoordinated(true);
      }

      // Partager la cible
      if ((zombie as any).setTarget) {
        (zombie as any).setTarget(player);
      }
    }
  }

  /**
   * Récupère les zombies dans un rayon
   */
  private getZombiesInRange(radius: number): Zombie[] {
    const allZombies = (this.scene as any).zombies?.getChildren() as Zombie[];
    if (!allZombies) return [];

    return allZombies.filter((zombie) => {
      if (!zombie.active) return false;
      const distance = Phaser.Math.Distance.Between(this.x, this.y, zombie.x, zombie.y);
      return distance <= radius;
    });
  }

  /**
   * Logique de décision
   */
  private makeDecision(_delta: number): BossState | null {
    if (!this.stateMachine) return null;

    const distance = this.stateMachine.getDistanceToTarget();
    const currentState = this.stateMachine.getCurrentState();

    // Si trop de dégâts reçus, fuir
    if (this.recentDamage >= this.fleeThreshold && currentState !== BossState.RETREAT) {
      return BossState.RETREAT;
    }

    // En phase tactique, préférer la distance
    if (this.isTactical) {
      if (distance < 150) {
        return BossState.RETREAT;
      }

      // Buff les zombies régulièrement
      if (currentState !== BossState.SUMMON && Math.random() < 0.1) {
        return BossState.SUMMON;
      }
    }

    // Attaque si à portée
    if (distance <= this.attackRange && this.canAttack()) {
      return BossState.ATTACK;
    }

    // Poursuivre
    if (currentState !== BossState.CHASE && currentState !== BossState.RETREAT) {
      return BossState.CHASE;
    }

    return null;
  }

  /**
   * Mise à jour de la poursuite
   */
  private updateChase(_delta: number): void {
    if (this.isDodging) return;
    this.stateMachine?.moveTowardsTarget(this.getCurrentSpeed());
  }

  /**
   * Attaque de mêlée
   */
  private performMeleeAttack(): void {
    this.stateMachine?.stopMovement();
    this.performAttack();

    const player = this.scene.getPlayer();
    if (player && player.active) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (distance <= this.attackRange + 15) {
        player.takeDamage(this.getDamage());
      }
    }
  }

  /**
   * Démarre une retraite
   */
  private startRetreat(): void {
    this.recentDamage = 0;

    // Téléportation si disponible
    const now = this.scene.time.now;
    if (now - this.lastTeleportTime >= this.teleportCooldown) {
      this.teleportAway();
    }
  }

  /**
   * Téléportation
   */
  private teleportAway(): void {
    this.lastTeleportTime = this.scene.time.now;

    // Effet de disparition
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        // Nouvelle position (loin du joueur)
        const player = this.scene.getPlayer();
        if (player) {
          const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
          const distance = 250 + Math.random() * 100;
          const newX = player.x + Math.cos(angle) * distance;
          const newY = player.y + Math.sin(angle) * distance;

          // Garder dans les limites de l'arène
          this.setPosition(
            Phaser.Math.Clamp(newX, 100, GAME_WIDTH - 100),
            Phaser.Math.Clamp(newY, 100, GAME_HEIGHT - 100)
          );
        }

        // Effet de réapparition
        const teleportEffect = this.scene.add.circle(this.x, this.y, 50, 0x00ff00, 0.5);
        this.scene.tweens.add({
          targets: teleportEffect,
          radius: 10,
          alpha: 0,
          duration: 300,
          onComplete: () => teleportEffect.destroy(),
        });

        this.scene.tweens.add({
          targets: this,
          alpha: 1,
          duration: 300,
        });
      },
    });
  }

  /**
   * Mise à jour de la retraite
   */
  private updateRetreat(_delta: number): void {
    if (this.isDodging) return;
    this.stateMachine?.moveAwayFromTarget(this.getCurrentSpeed() * 0.8);
  }

  /**
   * Buff les zombies proches
   */
  private buffNearbyZombies(): void {
    this.stateMachine?.stopMovement();

    // Animation de buff
    this.setTint(0x00ff00);

    const buffEffect = this.scene.add.circle(this.x, this.y, 20, 0x00ff00, 0.3);
    this.scene.tweens.add({
      targets: buffEffect,
      radius: this.commandRadius,
      alpha: 0,
      duration: 1000,
      onComplete: () => buffEffect.destroy(),
    });

    // Appliquer le buff aux zombies
    const zombies = this.getZombiesInRange(this.commandRadius);
    for (const zombie of zombies) {
      // Boost temporaire de vitesse
      if ((zombie as any).applySpeedBoost) {
        (zombie as any).applySpeedBoost(1.5, 5000);
      } else {
        // Fallback: modifier directement
        const originalSpeed = zombie.getSpeed();
        (zombie as any).entitySpeed = originalSpeed * 1.5;
        this.scene.time.delayedCall(5000, () => {
          if (zombie.active) {
            (zombie as any).entitySpeed = originalSpeed;
          }
        });
      }

      // Effet visuel
      zombie.setTint(0x00ff00);
      this.scene.time.delayedCall(5000, () => {
        if (zombie.active) {
          zombie.clearTint();
        }
      });
    }

    this.scene.time.delayedCall(500, () => {
      this.clearTint();
    });
  }

  /**
   * Entre en phase tactique
   */
  private enterTacticalPhase(): void {
    this.isTactical = true;

    // Effet de transition
    this.scene.cameras.main.flash(300, 0, 100, 0);

    // Message
    this.scene.events.emit('ui:announcement', {
      text: 'STRATÉGIE',
      subtext: 'Patient Zéro change de tactique',
      style: 'warning',
    });

    // Augmenter la fréquence de commande
    if (this.commandTimer) {
      this.commandTimer.destroy();
    }
    this.commandTimer = this.scene.time.addEvent({
      delay: 1000,
      callback: () => this.commandHorde(),
      loop: true,
    });
  }

  /**
   * Tente d'esquiver - peut être appelé par des systèmes externes
   * (par exemple: système de projectiles pour détecter les tirs proches)
   */
  public tryDodge(projectileX: number, projectileY: number): boolean {
    const now = this.scene.time.now;
    if (now - this.lastDodgeTime < this.dodgeCooldown) {
      return false;
    }

    if (Math.random() > this.dodgeChance) {
      return false;
    }

    this.performDodge(projectileX, projectileY);
    return true;
  }

  /**
   * Exécute une esquive
   */
  private performDodge(projectileX: number, projectileY: number): void {
    this.isDodging = true;
    this.lastDodgeTime = this.scene.time.now;

    // Direction perpendiculaire au projectile
    const incomingAngle = Phaser.Math.Angle.Between(projectileX, projectileY, this.x, this.y);
    const dodgeAngle = incomingAngle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);

    const targetX = this.x + Math.cos(dodgeAngle) * this.dodgeDistance;
    const targetY = this.y + Math.sin(dodgeAngle) * this.dodgeDistance;

    // Animation d'esquive
    this.setTint(0x888888);
    this.setAlpha(0.5);

    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration: this.dodgeDuration,
      ease: 'Power2',
      onComplete: () => {
        this.isDodging = false;
        this.clearTint();
        this.setAlpha(1);
      },
    });
  }

  /**
   * Override de takeDamage pour gérer l'esquive et les dégâts récents
   */
  public takeDamage(amount: number, hitZone?: string): void {
    super.takeDamage(amount, hitZone);

    // Comptabiliser les dégâts récents
    this.recentDamage += amount;

    // Reset après un délai
    if (this.damageResetTimer) {
      this.damageResetTimer.destroy();
    }
    this.damageResetTimer = this.scene.time.delayedCall(3000, () => {
      this.recentDamage = 0;
    });
  }

  /**
   * Callback de changement de phase
   */
  protected onPhaseChange(newPhase: number, _previousPhase: number): void {
    console.log(`[PatientZero] Transition vers phase ${newPhase + 1}`);
  }

  /**
   * Logique de mise à jour
   */
  protected updatePhaseLogic(_delta: number): void {
    // La logique est gérée par la machine d'état
  }

  /**
   * Mort du boss
   */
  protected die(): void {
    // Désorganiser la horde à la mort
    const zombies = this.getZombiesInRange(600);
    for (const zombie of zombies) {
      if ((zombie as any).setCoordinated) {
        (zombie as any).setCoordinated(false);
      }
      if ((zombie as any).applyStun) {
        (zombie as any).applyStun(2000);
      }
    }

    // Arrêter les timers
    if (this.commandTimer) {
      this.commandTimer.destroy();
      this.commandTimer = null;
    }
    if (this.damageResetTimer) {
      this.damageResetTimer.destroy();
      this.damageResetTimer = null;
    }

    super.die();
  }

  /**
   * Réinitialisation
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);

    this.recentDamage = 0;
    this.isDodging = false;
    this.isTactical = false;
    this.lastDodgeTime = 0;
    this.lastTeleportTime = 0;

    if (this.commandTimer) {
      this.commandTimer.destroy();
      this.commandTimer = null;
    }
    if (this.damageResetTimer) {
      this.damageResetTimer.destroy();
      this.damageResetTimer = null;
    }

    this.startHordeCommand();
  }
}
