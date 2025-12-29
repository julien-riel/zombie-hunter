import type { Zombie } from './Zombie';
import type { Player } from '@entities/Player';

/**
 * États possibles d'un zombie
 */
export enum ZombieState {
  IDLE = 'idle',
  CHASE = 'chase',
  ATTACK = 'attack',
  DEAD = 'dead',
}

/**
 * Machine à états pour l'IA des zombies
 * Gère les transitions entre les états et les comportements associés
 */
export class ZombieStateMachine {
  private zombie: Zombie;
  private currentState: ZombieState;
  private target: Player | null = null;

  private detectionRange: number;
  private attackRange: number;
  private attackCooldown: number;
  private lastAttackTime: number = 0;

  constructor(
    zombie: Zombie,
    detectionRange: number = 400,
    attackRange: number = 40,
    attackCooldown: number = 1000
  ) {
    this.zombie = zombie;
    this.currentState = ZombieState.IDLE;
    this.detectionRange = detectionRange;
    this.attackRange = attackRange;
    this.attackCooldown = attackCooldown;
  }

  /**
   * Met à jour la machine à états
   */
  public update(time: number): void {
    if (this.currentState === ZombieState.DEAD) return;

    // Mettre à jour la cible
    this.updateTarget();

    // Transitions d'état
    switch (this.currentState) {
      case ZombieState.IDLE:
        this.handleIdleState();
        break;
      case ZombieState.CHASE:
        this.handleChaseState();
        break;
      case ZombieState.ATTACK:
        this.handleAttackState(time);
        break;
    }
  }

  /**
   * Met à jour la cible (le joueur)
   */
  private updateTarget(): void {
    const player = this.zombie.scene.getPlayer();
    if (player && player.active) {
      this.target = player;
    } else {
      this.target = null;
    }
  }

  /**
   * Gère l'état IDLE
   */
  private handleIdleState(): void {
    if (!this.target) return;

    const distance = this.getDistanceToTarget();

    // Détecter le joueur
    if (distance <= this.detectionRange) {
      this.transitionTo(ZombieState.CHASE);
    }
  }

  /**
   * Gère l'état CHASE
   */
  private handleChaseState(): void {
    if (!this.target) {
      this.transitionTo(ZombieState.IDLE);
      return;
    }

    const distance = this.getDistanceToTarget();

    // Vérifier si on peut attaquer
    if (distance <= this.attackRange) {
      this.transitionTo(ZombieState.ATTACK);
      return;
    }

    // Vérifier si le joueur est hors de portée
    if (distance > this.detectionRange * 1.5) {
      this.transitionTo(ZombieState.IDLE);
      return;
    }

    // Poursuivre le joueur
    this.zombie.movementComponent.setTarget(this.target.x, this.target.y);
  }

  /**
   * Gère l'état ATTACK
   */
  private handleAttackState(time: number): void {
    if (!this.target) {
      this.transitionTo(ZombieState.IDLE);
      return;
    }

    const distance = this.getDistanceToTarget();

    // Vérifier si le joueur s'est éloigné
    if (distance > this.attackRange * 1.5) {
      this.transitionTo(ZombieState.CHASE);
      return;
    }

    // Arrêter le mouvement pendant l'attaque
    this.zombie.movementComponent.stop();

    // Attaquer si le cooldown est terminé
    if (time - this.lastAttackTime >= this.attackCooldown) {
      this.performAttack();
      this.lastAttackTime = time;
    }
  }

  /**
   * Effectue une attaque
   */
  private performAttack(): void {
    if (!this.target || !this.target.active) return;

    const damage = this.zombie.getDamage();
    this.target.takeDamage(damage);

    // Animation d'attaque (flash)
    this.zombie.setTint(0xffff00);
    this.zombie.scene.time.delayedCall(100, () => {
      if (this.zombie.active) {
        this.zombie.clearTint();
      }
    });
  }

  /**
   * Calcule la distance jusqu'à la cible
   */
  private getDistanceToTarget(): number {
    if (!this.target) return Infinity;
    return this.zombie.movementComponent.distanceTo(this.target.x, this.target.y);
  }

  /**
   * Transition vers un nouvel état
   */
  private transitionTo(newState: ZombieState): void {
    if (this.currentState === newState) return;

    // Actions de sortie de l'état actuel
    this.onExitState(this.currentState);

    // Changer d'état
    this.currentState = newState;

    // Actions d'entrée dans le nouvel état
    this.onEnterState(newState);
  }

  /**
   * Actions lors de la sortie d'un état
   */
  private onExitState(state: ZombieState): void {
    switch (state) {
      case ZombieState.CHASE:
        this.zombie.movementComponent.stop();
        break;
    }
  }

  /**
   * Actions lors de l'entrée dans un état
   */
  private onEnterState(state: ZombieState): void {
    switch (state) {
      case ZombieState.IDLE:
        this.zombie.movementComponent.stop();
        break;
      case ZombieState.DEAD:
        this.zombie.movementComponent.stop();
        break;
    }
  }

  /**
   * Récupère l'état actuel
   */
  public getState(): ZombieState {
    return this.currentState;
  }

  /**
   * Force le passage à l'état mort
   */
  public setDead(): void {
    this.transitionTo(ZombieState.DEAD);
  }

  /**
   * Réinitialise la machine à états
   */
  public reset(): void {
    this.currentState = ZombieState.IDLE;
    this.target = null;
    this.lastAttackTime = 0;
  }

  /**
   * Configure les paramètres de l'IA
   */
  public configure(detectionRange: number, attackRange: number, attackCooldown: number): void {
    this.detectionRange = detectionRange;
    this.attackRange = attackRange;
    this.attackCooldown = attackCooldown;
  }
}
