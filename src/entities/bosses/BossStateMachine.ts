/**
 * BossStateMachine - Phase 7.3
 *
 * Machine d'état pour gérer l'IA complexe des boss.
 * Gère les transitions entre états et les comportements associés.
 */

import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Boss } from './Boss';
import type { Player } from '@entities/Player';

/**
 * États possibles d'un boss
 */
export enum BossState {
  IDLE = 'idle',
  CHASE = 'chase',
  ATTACK = 'attack',
  SPECIAL_ABILITY = 'special_ability',
  CHARGE = 'charge',
  RETREAT = 'retreat',
  SUMMON = 'summon',
  TRANSITIONING = 'transitioning',
  STUNNED = 'stunned',
  DEAD = 'dead',
}

/**
 * Configuration d'un état
 */
export interface StateConfig {
  /** Callback d'entrée dans l'état */
  onEnter?: () => void;
  /** Callback de sortie de l'état */
  onExit?: () => void;
  /** Callback de mise à jour */
  onUpdate?: (delta: number) => void;
  /** Durée minimale dans l'état (ms) */
  minDuration?: number;
  /** Durée maximale dans l'état (ms) */
  maxDuration?: number;
  /** États vers lesquels on peut transitionner */
  allowedTransitions?: BossState[];
}

/**
 * Machine d'état pour les boss
 */
export class BossStateMachine {
  private scene: GameScene;
  private boss: Boss;

  /** État actuel */
  private currentState: BossState = BossState.IDLE;

  /** Configurations des états */
  private stateConfigs: Map<BossState, StateConfig> = new Map();

  /** Temps passé dans l'état actuel */
  private timeInState: number = 0;

  /** Callback pour les décisions d'IA */
  private decisionCallback?: (delta: number) => BossState | null;

  /** Cible actuelle */
  private target: Player | null = null;

  constructor(scene: GameScene, boss: Boss) {
    this.scene = scene;
    this.boss = boss;

    // Initialiser les configurations d'état par défaut
    this.initDefaultStates();
  }

  /**
   * Initialise les configurations d'état par défaut
   */
  private initDefaultStates(): void {
    // État IDLE par défaut
    this.stateConfigs.set(BossState.IDLE, {
      allowedTransitions: [BossState.CHASE, BossState.ATTACK, BossState.SPECIAL_ABILITY],
    });

    // État CHASE par défaut
    this.stateConfigs.set(BossState.CHASE, {
      allowedTransitions: [BossState.ATTACK, BossState.SPECIAL_ABILITY, BossState.CHARGE, BossState.IDLE],
    });

    // État ATTACK par défaut
    this.stateConfigs.set(BossState.ATTACK, {
      minDuration: 500,
      allowedTransitions: [BossState.CHASE, BossState.IDLE, BossState.RETREAT],
    });

    // État SPECIAL_ABILITY par défaut
    this.stateConfigs.set(BossState.SPECIAL_ABILITY, {
      minDuration: 1000,
      allowedTransitions: [BossState.CHASE, BossState.IDLE],
    });

    // État CHARGE par défaut
    this.stateConfigs.set(BossState.CHARGE, {
      minDuration: 500,
      allowedTransitions: [BossState.STUNNED, BossState.CHASE, BossState.IDLE],
    });

    // État RETREAT par défaut
    this.stateConfigs.set(BossState.RETREAT, {
      allowedTransitions: [BossState.CHASE, BossState.SUMMON, BossState.IDLE],
    });

    // État SUMMON par défaut
    this.stateConfigs.set(BossState.SUMMON, {
      minDuration: 2000,
      allowedTransitions: [BossState.CHASE, BossState.IDLE, BossState.RETREAT],
    });

    // État TRANSITIONING par défaut
    this.stateConfigs.set(BossState.TRANSITIONING, {
      allowedTransitions: [BossState.CHASE, BossState.IDLE],
    });

    // État STUNNED par défaut
    this.stateConfigs.set(BossState.STUNNED, {
      allowedTransitions: [BossState.CHASE, BossState.IDLE],
    });

    // État DEAD par défaut (pas de transitions)
    this.stateConfigs.set(BossState.DEAD, {
      allowedTransitions: [],
    });
  }

  /**
   * Configure un état spécifique
   */
  public configureState(state: BossState, config: StateConfig): void {
    const existing = this.stateConfigs.get(state);
    this.stateConfigs.set(state, { ...existing, ...config });
  }

  /**
   * Définit le callback de décision d'IA
   */
  public setDecisionCallback(callback: (delta: number) => BossState | null): void {
    this.decisionCallback = callback;
  }

  /**
   * Mise à jour de la machine d'état
   */
  public update(delta: number): void {
    if (this.currentState === BossState.DEAD) return;

    this.timeInState += delta;

    // Mettre à jour la cible
    this.updateTarget();

    // Exécuter le callback de mise à jour de l'état actuel
    const stateConfig = this.stateConfigs.get(this.currentState);
    if (stateConfig?.onUpdate) {
      stateConfig.onUpdate(delta);
    }

    // Vérifier si on peut prendre une décision
    if (this.canMakeDecision()) {
      // Demander une décision à l'IA
      const newState = this.decisionCallback?.(delta);
      if (newState && newState !== this.currentState) {
        this.transitionTo(newState);
      }
    }
  }

  /**
   * Vérifie si on peut prendre une décision (durée minimale respectée)
   */
  private canMakeDecision(): boolean {
    const stateConfig = this.stateConfigs.get(this.currentState);
    if (!stateConfig?.minDuration) return true;
    return this.timeInState >= stateConfig.minDuration;
  }

  /**
   * Met à jour la cible (le joueur)
   */
  private updateTarget(): void {
    const player = this.scene.getPlayer();
    if (player && player.active) {
      this.target = player;
    } else {
      this.target = null;
    }
  }

  /**
   * Transition vers un nouvel état
   */
  public transitionTo(newState: BossState, force: boolean = false): boolean {
    // Vérifier si la transition est autorisée
    if (!force) {
      const stateConfig = this.stateConfigs.get(this.currentState);
      if (stateConfig?.allowedTransitions && !stateConfig.allowedTransitions.includes(newState)) {
        return false;
      }

      // Vérifier la durée minimale
      if (!this.canMakeDecision()) {
        return false;
      }
    }

    // Exécuter le callback de sortie
    const oldConfig = this.stateConfigs.get(this.currentState);
    if (oldConfig?.onExit) {
      oldConfig.onExit();
    }

    // Changer d'état
    const previousState = this.currentState;
    this.currentState = newState;
    this.timeInState = 0;

    // Exécuter le callback d'entrée
    const newConfig = this.stateConfigs.get(newState);
    if (newConfig?.onEnter) {
      newConfig.onEnter();
    }

    // Émettre l'événement de changement d'état
    this.scene.events.emit('bossStateChanged', {
      boss: this.boss,
      previousState,
      newState,
    });

    return true;
  }

  /**
   * Force un stun temporaire
   */
  public stun(duration: number): void {
    this.transitionTo(BossState.STUNNED, true);

    // Configurer la durée du stun
    this.configureState(BossState.STUNNED, {
      minDuration: duration,
      onExit: () => {
        // Réinitialiser la durée par défaut
        this.configureState(BossState.STUNNED, { minDuration: 0 });
      },
    });

    // Transition automatique après le stun
    this.scene.time.delayedCall(duration, () => {
      if (this.currentState === BossState.STUNNED) {
        this.transitionTo(BossState.CHASE, true);
      }
    });
  }

  /**
   * Récupère l'état actuel
   */
  public getCurrentState(): BossState {
    return this.currentState;
  }

  /**
   * Récupère le temps passé dans l'état actuel
   */
  public getTimeInState(): number {
    return this.timeInState;
  }

  /**
   * Récupère la cible actuelle
   */
  public getTarget(): Player | null {
    return this.target;
  }

  /**
   * Vérifie si le boss est dans un état spécifique
   */
  public isInState(state: BossState): boolean {
    return this.currentState === state;
  }

  /**
   * Vérifie si le boss peut attaquer
   */
  public canAttack(): boolean {
    return (
      this.currentState !== BossState.STUNNED &&
      this.currentState !== BossState.DEAD &&
      this.currentState !== BossState.TRANSITIONING
    );
  }

  /**
   * Calcule la distance jusqu'à la cible
   */
  public getDistanceToTarget(): number {
    if (!this.target) return Infinity;

    return Phaser.Math.Distance.Between(
      this.boss.x,
      this.boss.y,
      this.target.x,
      this.target.y
    );
  }

  /**
   * Calcule l'angle vers la cible
   */
  public getAngleToTarget(): number {
    if (!this.target) return 0;

    return Phaser.Math.Angle.Between(
      this.boss.x,
      this.boss.y,
      this.target.x,
      this.target.y
    );
  }

  /**
   * Déplace le boss vers la cible
   */
  public moveTowardsTarget(speed?: number): void {
    if (!this.target || this.currentState === BossState.STUNNED) return;

    const actualSpeed = speed ?? this.boss.getCurrentSpeed();
    const angle = this.getAngleToTarget();

    this.boss.setVelocity(
      Math.cos(angle) * actualSpeed,
      Math.sin(angle) * actualSpeed
    );
  }

  /**
   * Déplace le boss loin de la cible
   */
  public moveAwayFromTarget(speed?: number): void {
    if (!this.target || this.currentState === BossState.STUNNED) return;

    const actualSpeed = speed ?? this.boss.getCurrentSpeed();
    const angle = this.getAngleToTarget();

    this.boss.setVelocity(
      -Math.cos(angle) * actualSpeed,
      -Math.sin(angle) * actualSpeed
    );
  }

  /**
   * Arrête le mouvement du boss
   */
  public stopMovement(): void {
    this.boss.setVelocity(0, 0);
  }

  /**
   * Réinitialise la machine d'état
   */
  public reset(): void {
    this.currentState = BossState.IDLE;
    this.timeInState = 0;
    this.target = null;
  }

  /**
   * Passe en état mort
   */
  public die(): void {
    this.transitionTo(BossState.DEAD, true);
  }
}
