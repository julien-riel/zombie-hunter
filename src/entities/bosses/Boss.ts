/**
 * Boss Base Class - Phase 7.3
 *
 * Classe abstraite pour tous les boss du jeu.
 * Gère les phases, les animations d'entrée et les comportements spécifiques.
 */

import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import { Entity } from '@entities/Entity';
import type { BossType } from '@/types/entities';
import type { BossStateMachine, BossState } from './BossStateMachine';

/**
 * Configuration d'une phase de boss
 */
export interface BossPhase {
  /** Seuil de HP pour déclencher la phase (1.0 = 100%, 0.3 = 30%) */
  healthThreshold: number;
  /** Comportement pendant cette phase */
  behavior: string;
  /** Callback appelé à l'entrée de la phase */
  onEnter?: () => void;
  /** Multiplicateur de vitesse pour cette phase */
  speedMultiplier?: number;
  /** Multiplicateur de dégâts pour cette phase */
  damageMultiplier?: number;
}

/**
 * Configuration d'un boss
 */
export interface BossConfig {
  type: BossType;
  name: string;
  maxHealth: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  detectionRange: number;
  attackRange: number;
  scoreValue: number;
  phases: BossPhase[];
  /** Texture du sprite */
  texture: string;
  /** Échelle du sprite */
  scale?: number;
  /** Taille de la hitbox */
  hitboxSize?: { width: number; height: number };
}

/**
 * Classe de base abstraite pour tous les boss
 */
export abstract class Boss extends Entity {
  /** Type du boss */
  public readonly bossType: BossType;

  /** Nom affiché du boss */
  public readonly bossName: string;

  /** Configuration du boss */
  protected config: BossConfig;

  /** Phase actuelle (0-indexed) */
  protected currentPhase: number = 0;

  /** Machine d'état pour l'IA */
  protected stateMachine!: BossStateMachine;

  /** Dégâts de base */
  protected baseDamage: number;

  /** Cooldown d'attaque en ms */
  protected attackCooldown: number;

  /** Timestamp de la dernière attaque */
  protected lastAttackTime: number = 0;

  /** Portée de détection */
  protected detectionRange: number;

  /** Portée d'attaque */
  protected attackRange: number;

  /** Points accordés à la mort */
  protected scoreValue: number;

  /** Indique si le boss est en rage */
  protected isEnraged: boolean = false;

  /** Indique si le boss est invulnérable (pendant animations) */
  protected isInvulnerable: boolean = false;

  /** Indique si l'animation d'entrée est terminée */
  protected hasEntered: boolean = false;

  /** Effet de ralentissement actif (0-1, 1 = normal) */
  protected slowFactor: number = 1;

  constructor(scene: GameScene, x: number, y: number, config: BossConfig) {
    super(scene, x, y, config.texture, config.maxHealth, config.speed);

    this.bossType = config.type;
    this.bossName = config.name;
    this.config = config;
    this.baseDamage = config.damage;
    this.attackCooldown = config.attackCooldown;
    this.detectionRange = config.detectionRange;
    this.attackRange = config.attackRange;
    this.scoreValue = config.scoreValue;

    // Appliquer l'échelle si spécifiée
    if (config.scale) {
      this.setScale(config.scale);
    }

    // Configurer la hitbox si spécifiée
    if (config.hitboxSize && this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setSize(config.hitboxSize.width, config.hitboxSize.height);
    }

    // Démarrer invisible pour l'animation d'entrée
    this.setAlpha(0);
    this.isInvulnerable = true;

    // Émettre l'événement de spawn
    this.scene.events.emit('bossSpawned', this);
  }

  /**
   * Initialise la machine d'état (appelé par les sous-classes)
   */
  protected initStateMachine(stateMachine: BossStateMachine): void {
    this.stateMachine = stateMachine;
  }

  /**
   * Démarre l'animation d'entrée du boss
   */
  public async startEntrance(): Promise<void> {
    this.isInvulnerable = true;

    // Animation d'entrée spécifique au boss
    await this.entranceAnimation();

    this.hasEntered = true;
    this.isInvulnerable = false;

    // Émettre l'événement d'entrée terminée
    this.scene.events.emit('bossEntranceComplete', this);
  }

  /**
   * Animation d'entrée à implémenter par chaque boss
   */
  protected abstract entranceAnimation(): Promise<void>;

  /**
   * Mise à jour du boss
   */
  update(time: number, delta: number): void {
    if (!this.active || !this.hasEntered) return;

    // Mise à jour de base
    super.update(time, delta);

    // Vérifier les changements de phase
    this.checkPhaseTransition();

    // Mise à jour de la machine d'état
    if (this.stateMachine) {
      this.stateMachine.update(delta);
    }

    // Logique spécifique de la phase
    this.updatePhaseLogic(delta);
  }

  /**
   * Vérifie si une transition de phase doit avoir lieu
   */
  protected checkPhaseTransition(): void {
    const healthPercent = this.getHealth() / this.getMaxHealth();
    const phases = this.config.phases;

    // Trouver la phase appropriée pour le HP actuel
    for (let i = phases.length - 1; i >= 0; i--) {
      if (healthPercent <= phases[i].healthThreshold && i > this.currentPhase) {
        this.transitionToPhase(i);
        break;
      }
    }
  }

  /**
   * Transition vers une nouvelle phase
   */
  protected transitionToPhase(newPhase: number): void {
    const previousPhase = this.currentPhase;
    this.currentPhase = newPhase;

    const phaseConfig = this.config.phases[newPhase];

    // Appeler le callback d'entrée de phase
    if (phaseConfig.onEnter) {
      phaseConfig.onEnter();
    }

    // Appliquer les modificateurs de phase
    this.onPhaseChange(newPhase, previousPhase);

    // Émettre l'événement de changement de phase
    this.scene.events.emit('bossPhaseChanged', {
      boss: this,
      phase: newPhase,
      previousPhase,
      behavior: phaseConfig.behavior,
    });
  }

  /**
   * Callback appelé lors d'un changement de phase
   */
  protected abstract onPhaseChange(newPhase: number, previousPhase: number): void;

  /**
   * Logique de mise à jour spécifique à la phase
   */
  protected abstract updatePhaseLogic(delta: number): void;

  /**
   * Récupère les dégâts actuels (avec modificateurs de phase)
   */
  public getDamage(): number {
    const phaseConfig = this.config.phases[this.currentPhase];
    const multiplier = phaseConfig?.damageMultiplier ?? 1;
    return Math.round(this.baseDamage * multiplier);
  }

  /**
   * Récupère la vitesse actuelle (avec modificateurs)
   */
  public getCurrentSpeed(): number {
    const phaseConfig = this.config.phases[this.currentPhase];
    const phaseMultiplier = phaseConfig?.speedMultiplier ?? 1;
    const rageMultiplier = this.isEnraged ? 1.5 : 1;
    return this.entitySpeed * phaseMultiplier * rageMultiplier * this.slowFactor;
  }

  /**
   * Inflige des dégâts au boss
   */
  public takeDamage(amount: number, hitZone?: string): void {
    if (this.isInvulnerable) return;

    // Permettre aux sous-classes de modifier les dégâts selon la zone touchée
    const modifiedDamage = this.calculateDamage(amount, hitZone);

    // Appeler la méthode parente
    super.takeDamage(modifiedDamage);

    // Émettre l'événement de dégâts
    this.scene.events.emit('bossDamaged', {
      boss: this,
      damage: modifiedDamage,
      hitZone,
      remainingHealth: this.getHealth(),
      healthPercent: this.getHealth() / this.getMaxHealth(),
    });
  }

  /**
   * Calcule les dégâts modifiés selon la zone touchée
   */
  protected calculateDamage(amount: number, _hitZone?: string): number {
    return amount;
  }

  /**
   * Vérifie si le boss peut attaquer
   */
  protected canAttack(): boolean {
    const now = this.scene.time.now;
    return now - this.lastAttackTime >= this.attackCooldown;
  }

  /**
   * Effectue une attaque
   */
  protected performAttack(): void {
    this.lastAttackTime = this.scene.time.now;
  }

  /**
   * Active le mode rage
   */
  public enterRage(): void {
    if (this.isEnraged) return;

    this.isEnraged = true;

    // Effet visuel de rage
    this.setTint(0xff4444);

    // Émettre l'événement
    this.scene.events.emit('bossEnraged', this);
  }

  /**
   * Applique un ralentissement au boss
   */
  public applySlow(factor: number, duration: number): void {
    // Les boss résistent mieux aux ralentissements
    const resistedFactor = 1 - (1 - factor) * 0.5;
    this.slowFactor = resistedFactor;

    // Réinitialiser après la durée
    this.scene.time.delayedCall(duration, () => {
      this.slowFactor = 1;
    });
  }

  /**
   * Récupère le pourcentage de HP
   */
  public getHealthPercent(): number {
    return this.getHealth() / this.getMaxHealth();
  }

  /**
   * Récupère la phase actuelle
   */
  public getCurrentPhase(): number {
    return this.currentPhase;
  }

  /**
   * Récupère l'état actuel de la machine d'état
   */
  public getState(): BossState | null {
    return this.stateMachine?.getCurrentState() ?? null;
  }

  /**
   * Gère la mort du boss
   */
  protected die(): void {
    // Animation de mort
    this.playDeathAnimation();

    // Émettre les événements
    this.scene.events.emit('bossDeath', {
      boss: this,
      type: this.bossType,
      scoreValue: this.scoreValue,
    });

    // Désactiver après l'animation
    this.scene.time.delayedCall(1500, () => {
      this.deactivate();
      this.destroy();
    });
  }

  /**
   * Animation de mort du boss
   */
  protected playDeathAnimation(): void {
    // Désactiver les collisions
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    // Flash et fade out
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: this.scaleX * 1.2,
      scaleY: this.scaleY * 1.2,
      duration: 1500,
      ease: 'Power2',
    });

    // Shake de la caméra
    this.scene.cameras.main.shake(500, 0.03);

    // Effet de particules
    this.createDeathParticles();
  }

  /**
   * Crée les particules de mort
   */
  protected createDeathParticles(): void {
    const particles = this.scene.add.particles(this.x, this.y, 'pixel', {
      speed: { min: 100, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 2, end: 0 },
      lifespan: { min: 500, max: 1500 },
      quantity: 50,
      tint: [0xff0000, 0x880000, 0x440000],
    });

    this.scene.time.delayedCall(2000, () => {
      particles.destroy();
    });
  }

  /**
   * Réinitialise le boss pour réutilisation
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);

    this.currentPhase = 0;
    this.isEnraged = false;
    this.isInvulnerable = true;
    this.hasEntered = false;
    this.slowFactor = 1;
    this.lastAttackTime = 0;

    this.setAlpha(0);
    this.clearTint();

    if (this.stateMachine) {
      this.stateMachine.reset();
    }
  }

  /**
   * Récupère le score accordé à la mort
   */
  public getScoreValue(): number {
    return this.scoreValue;
  }
}
