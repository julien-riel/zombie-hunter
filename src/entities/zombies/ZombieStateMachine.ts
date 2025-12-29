import Phaser from 'phaser';
import type { Zombie } from './Zombie';
import type { Player } from '@entities/Player';
import type { Pathfinder } from '@utils/pathfinding';
import type { HordeManager } from '@ai/HordeManager';
import type { TacticalBehaviors, TacticalTarget } from '@ai/TacticalBehaviors';
import type { FlowFieldManager } from '@ai/FlowFieldManager';
import { SteeringBehaviors } from '@ai/SteeringBehaviors';

/**
 * États possibles d'un zombie
 */
export enum ZombieState {
  IDLE = 'idle',
  CHASE = 'chase',
  GROUP_CHASE = 'group_chase',
  ATTACK = 'attack',
  DEAD = 'dead',
  PINNED = 'pinned',
  STUNNED = 'stunned',
}

/** Intervalle minimum entre deux calculs de chemin (ms) */
const PATH_UPDATE_INTERVAL = 500;

/** Intervalle de mise à jour du steering (ms) */
const STEERING_UPDATE_INTERVAL = 50;

/** Intervalle entre chaque nouvelle destination en IDLE (ms) */
const IDLE_WANDER_INTERVAL = 2000;

/** Nombre minimum de voisins pour activer le mode groupe */
const MIN_NEIGHBORS_FOR_GROUP = 2;

/**
 * Machine à états pour l'IA des zombies
 * Gère les transitions entre les états et les comportements associés
 * Utilise le pathfinding A* pour contourner les obstacles
 * Supporte les comportements de horde via le HordeManager
 */
export class ZombieStateMachine {
  private zombie: Zombie;
  private currentState: ZombieState;
  private target: Player | null = null;

  private detectionRange: number;
  private attackRange: number;
  private attackCooldown: number;
  private lastAttackTime: number = 0;

  /** Dernière fois qu'un chemin a été calculé */
  private lastPathTime: number = 0;

  /** Dernière fois que le steering a été mis à jour */
  private lastSteeringTime: number = 0;

  /** Référence au HordeManager (optionnel) */
  private hordeManager: HordeManager | null = null;

  /** Référence aux TacticalBehaviors (optionnel) */
  private tacticalBehaviors: TacticalBehaviors | null = null;

  /** Cible tactique actuelle */
  private tacticalTarget: TacticalTarget | null = null;

  /** Force de steering accumulée */
  private steeringForce: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);

  /** Indique si le zombie utilise le mode horde */
  private useHordeMode: boolean = false;

  /** Comportements de steering locaux pour le wander */
  private steeringBehaviors: SteeringBehaviors;

  /** Dernière mise à jour du wander en IDLE */
  private lastIdleWanderTime: number = 0;

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

    // Initialiser les comportements de steering pour le wander
    // Utiliser une vitesse par défaut si getSpeed() retourne 0
    const baseSpeed = zombie.movementComponent.getSpeed() || 60;
    this.steeringBehaviors = new SteeringBehaviors(baseSpeed, 50);
    this.steeringBehaviors.setWanderParams(50, 80, 0.3);
    this.steeringBehaviors.resetWanderAngle();
  }

  /**
   * Configure le HordeManager pour les comportements de groupe
   */
  public setHordeManager(manager: HordeManager): void {
    this.hordeManager = manager;
  }

  /**
   * Configure les TacticalBehaviors pour les manoeuvres tactiques
   */
  public setTacticalBehaviors(behaviors: TacticalBehaviors): void {
    this.tacticalBehaviors = behaviors;
  }

  /**
   * Active ou désactive le mode horde
   */
  public setHordeMode(enabled: boolean): void {
    this.useHordeMode = enabled;
  }

  /**
   * Met à jour la machine à états
   */
  public update(time: number): void {
    if (this.currentState === ZombieState.DEAD) return;

    // Les états PINNED et STUNNED bloquent toute action
    if (this.currentState === ZombieState.PINNED || this.currentState === ZombieState.STUNNED) {
      this.zombie.movementComponent.stop();
      return;
    }

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
      case ZombieState.GROUP_CHASE:
        this.handleGroupChaseState(time);
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
   * Gère l'état IDLE - vagabondage et détection du joueur
   */
  private handleIdleState(): void {
    // Vérifier si le joueur est détecté
    if (this.target) {
      const distance = this.getDistanceToTarget();

      if (distance <= this.detectionRange) {
        // Vérifier si on doit passer en mode groupe
        if (this.shouldUseGroupChase()) {
          this.transitionTo(ZombieState.GROUP_CHASE);
        } else {
          this.transitionTo(ZombieState.CHASE);
        }
        return;
      }
    }

    // Comportement de vagabondage quand pas de cible détectée
    this.performIdleWander();
  }

  /**
   * Effectue le vagabondage en état IDLE
   * Définit une cible aléatoire à atteindre périodiquement
   */
  private performIdleWander(): void {
    const now = Date.now();

    // Vérifier si on doit choisir une nouvelle destination
    if (now - this.lastIdleWanderTime < IDLE_WANDER_INTERVAL) {
      return;
    }

    // Mettre à jour l'angle de wander
    this.steeringBehaviors.resetWanderAngle();
    this.lastIdleWanderTime = now;

    // Générer une direction aléatoire
    const angle = Math.random() * Math.PI * 2;
    const wanderDistance = 50 + Math.random() * 100; // 50-150 pixels

    // Calculer la position cible
    let targetX = this.zombie.x + Math.cos(angle) * wanderDistance;
    let targetY = this.zombie.y + Math.sin(angle) * wanderDistance;

    // Ajouter la séparation des voisins si on a un HordeManager
    if (this.hordeManager) {
      const neighbors = this.hordeManager.getNeighbors(this.zombie);
      if (neighbors.length > 0) {
        // S'éloigner du centre des voisins
        let avgX = 0, avgY = 0;
        for (const neighbor of neighbors) {
          avgX += neighbor.x;
          avgY += neighbor.y;
        }
        avgX /= neighbors.length;
        avgY /= neighbors.length;

        // Direction opposée aux voisins
        const awayX = this.zombie.x - avgX;
        const awayY = this.zombie.y - avgY;
        const awayDist = Math.sqrt(awayX * awayX + awayY * awayY);

        if (awayDist > 0) {
          targetX += (awayX / awayDist) * 50;
          targetY += (awayY / awayDist) * 50;
        }
      }
    }

    // Limiter aux bounds du monde
    const bounds = this.zombie.scene.physics.world.bounds;
    targetX = Math.max(bounds.x + 50, Math.min(bounds.width - 50, targetX));
    targetY = Math.max(bounds.y + 50, Math.min(bounds.height - 50, targetY));

    // Définir la cible pour le MovementComponent
    this.zombie.movementComponent.setTarget(targetX, targetY);
  }

  /**
   * Détermine si le zombie doit utiliser le mode groupe
   */
  private shouldUseGroupChase(): boolean {
    if (!this.useHordeMode || !this.hordeManager) {
      return false;
    }

    const neighbors = this.hordeManager.getNeighbors(this.zombie);
    return neighbors.length >= MIN_NEIGHBORS_FOR_GROUP;
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

    // Vérifier si on doit passer en mode groupe
    if (this.shouldUseGroupChase()) {
      this.transitionTo(ZombieState.GROUP_CHASE);
      return;
    }

    // Poursuivre le joueur avec pathfinding
    this.chaseWithPathfinding();
  }

  /**
   * Gère l'état GROUP_CHASE (poursuite coordonnée avec la horde)
   */
  private handleGroupChaseState(time: number): void {
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

    // Vérifier si on doit repasser en mode solo
    if (!this.shouldUseGroupChase()) {
      this.transitionTo(ZombieState.CHASE);
      return;
    }

    // Poursuivre avec comportements de horde
    this.chaseWithHordeBehavior(time);
  }

  /**
   * Poursuit avec les comportements de horde (steering + tactiques)
   */
  private chaseWithHordeBehavior(time: number): void {
    if (!this.target || !this.hordeManager) {
      this.chaseWithPathfinding();
      return;
    }

    const now = Date.now();

    // Mise à jour du steering à intervalle régulier
    if (now - this.lastSteeringTime >= STEERING_UPDATE_INTERVAL) {
      this.lastSteeringTime = now;
      this.updateSteeringForce();
    }

    // Obtenir la position cible (tactique ou joueur)
    let targetX = this.target.x;
    let targetY = this.target.y;

    // Utiliser la cible tactique si disponible
    if (this.tacticalBehaviors && this.target) {
      const allZombies = this.getAllActiveZombies();
      this.tacticalTarget = this.tacticalBehaviors.calculateTacticalTarget(
        this.zombie,
        this.target.x,
        this.target.y,
        allZombies
      );
      targetX = this.tacticalTarget.x;
      targetY = this.tacticalTarget.y;
    }

    // Combiner pathfinding et steering
    this.applyHordeMovement(targetX, targetY, time);
  }

  /**
   * Met à jour la force de steering basée sur les voisins
   */
  private updateSteeringForce(): void {
    if (!this.hordeManager || !this.target) return;

    const steering = this.hordeManager.getSteering();
    const neighbors = this.hordeManager.getNeighbors(this.zombie);

    // Calculer la force de groupe
    this.steeringForce = steering.calculateCombinedForce(
      this.zombie,
      neighbors,
      this.target.x,
      this.target.y,
      {
        separation: 2.0, // Forte séparation pour éviter le chevauchement
        alignment: 0.8,
        cohesion: 0.5,
        seek: 1.2,
      }
    );
  }

  /**
   * Applique le mouvement de horde
   * Utilise le flow field si disponible, sinon A* individuel
   */
  private applyHordeMovement(targetX: number, targetY: number, _time: number): void {
    const flowFieldManager = this.getFlowFieldManager();

    // Utiliser le flow field si disponible
    if (flowFieldManager && flowFieldManager.isReady()) {
      // Récupérer la direction depuis le flow field
      const direction = flowFieldManager.getDirectionSmooth(this.zombie.x, this.zombie.y);

      if (direction.x !== 0 || direction.y !== 0) {
        // Appliquer directement la direction du flow field
        this.zombie.movementComponent.moveInDirection(direction.x, direction.y);

        // Mettre à jour la rotation
        const angle = Math.atan2(direction.y, direction.x);
        this.zombie.setRotation(angle);
      } else {
        // Fallback sur la cible tactique directe
        this.zombie.movementComponent.setTarget(targetX, targetY);
      }
    } else {
      // Fallback sur A* individuel
      const now = Date.now();

      // Recalculer le chemin moins souvent en mode horde
      if (now - this.lastPathTime >= PATH_UPDATE_INTERVAL * 1.5) {
        this.lastPathTime = now;

        const pathfinder = this.getPathfinder();
        if (pathfinder) {
          // Calculer le chemin vers la cible tactique
          const path = pathfinder.findPath(this.zombie.x, this.zombie.y, targetX, targetY);

          if (path.length > 0) {
            this.zombie.movementComponent.setPath(path);
          }
        }
      }

      // Fallback si pas de chemin
      if (!this.zombie.movementComponent.hasPath()) {
        this.zombie.movementComponent.setTarget(targetX, targetY);
      }
    }

    // Appliquer la force de steering en plus du mouvement normal
    if (this.steeringForce.length() > 1) {
      const body = this.zombie.body as Phaser.Physics.Arcade.Body;
      if (body) {
        // Ajouter la force de steering à la vélocité actuelle
        const steerInfluence = 0.3; // 30% d'influence du steering
        body.velocity.x += this.steeringForce.x * steerInfluence;
        body.velocity.y += this.steeringForce.y * steerInfluence;

        // Limiter la vélocité totale
        const speed = this.zombie.movementComponent.getSpeed();
        const currentSpeed = Math.sqrt(
          body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y
        );
        if (currentSpeed > speed) {
          const scale = speed / currentSpeed;
          body.velocity.x *= scale;
          body.velocity.y *= scale;
        }
      }
    }
  }

  /**
   * Récupère tous les zombies actifs de la scène
   */
  private getAllActiveZombies(): Zombie[] {
    const scene = this.zombie.scene;
    if (scene && typeof (scene as { getActiveZombies?: () => Zombie[] }).getActiveZombies === 'function') {
      return (scene as { getActiveZombies: () => Zombie[] }).getActiveZombies();
    }
    return [];
  }

  /**
   * Poursuit la cible en utilisant le pathfinding
   * Utilise le flow field si disponible (beaucoup de zombies),
   * sinon fallback sur A* individuel
   */
  private chaseWithPathfinding(): void {
    if (!this.target) return;

    const flowFieldManager = this.getFlowFieldManager();

    // Utiliser le flow field si disponible (plus efficace avec beaucoup de zombies)
    if (flowFieldManager && flowFieldManager.isReady()) {
      this.chaseWithFlowField(flowFieldManager);
      return;
    }

    // Fallback sur A* individuel
    const now = Date.now();
    const pathfinder = this.getPathfinder();

    // Recalculer le chemin périodiquement ou si on n'en a pas
    if (!pathfinder || now - this.lastPathTime < PATH_UPDATE_INTERVAL) {
      // Pas de pathfinder ou trop tôt pour recalculer
      // Continuer à suivre le chemin actuel ou aller en ligne droite
      if (!this.zombie.movementComponent.hasPath()) {
        this.zombie.movementComponent.setTarget(this.target.x, this.target.y);
      }
      return;
    }

    // Calculer un nouveau chemin
    this.lastPathTime = now;
    const path = pathfinder.findPath(this.zombie.x, this.zombie.y, this.target.x, this.target.y);

    if (path.length > 0) {
      this.zombie.movementComponent.setPath(path);
    } else {
      // Fallback: aller en ligne droite
      this.zombie.movementComponent.setTarget(this.target.x, this.target.y);
    }
  }

  /**
   * Poursuit la cible en utilisant le flow field
   * Méthode optimisée pour le pathfinding de masse
   */
  private chaseWithFlowField(flowFieldManager: FlowFieldManager): void {
    if (!this.target) return;

    // Récupérer la direction depuis le flow field (interpolation smooth)
    const direction = flowFieldManager.getDirectionSmooth(this.zombie.x, this.zombie.y);

    // Si pas de direction valide, fallback sur mouvement direct
    if (direction.x === 0 && direction.y === 0) {
      this.zombie.movementComponent.setTarget(this.target.x, this.target.y);
      return;
    }

    // Appliquer directement la direction du flow field
    // moveInDirection applique la vélocité dans la direction donnée
    this.zombie.movementComponent.moveInDirection(direction.x, direction.y);

    // Mettre à jour la rotation pour regarder dans la direction du mouvement
    const angle = Math.atan2(direction.y, direction.x);
    this.zombie.setRotation(angle);
  }

  /**
   * Récupère le pathfinder depuis la scène
   */
  private getPathfinder(): Pathfinder | null {
    const scene = this.zombie.scene;
    if (
      scene &&
      typeof (scene as { getPathfinder?: () => Pathfinder }).getPathfinder === 'function'
    ) {
      return (scene as { getPathfinder: () => Pathfinder }).getPathfinder();
    }
    return null;
  }

  /**
   * Récupère le flow field manager depuis la scène
   */
  private getFlowFieldManager(): FlowFieldManager | null {
    const scene = this.zombie.scene;
    if (
      scene &&
      typeof (scene as { getFlowFieldManager?: () => FlowFieldManager }).getFlowFieldManager === 'function'
    ) {
      return (scene as { getFlowFieldManager: () => FlowFieldManager }).getFlowFieldManager();
    }
    return null;
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
      case ZombieState.GROUP_CHASE:
        this.zombie.movementComponent.stop();
        // Nettoyer la cible tactique
        if (this.tacticalBehaviors) {
          this.tacticalBehaviors.removeZombie(this.zombie);
        }
        this.tacticalTarget = null;
        break;
    }
  }

  /**
   * Actions lors de l'entrée dans un état
   */
  private onEnterState(state: ZombieState): void {
    switch (state) {
      case ZombieState.IDLE:
        // Réinitialiser l'angle de wander pour un nouveau comportement aléatoire
        this.steeringBehaviors.resetWanderAngle();
        // Ne pas arrêter le mouvement - le zombie va vagabonder
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
   * Immobilise le zombie (cloué au sol)
   * @param duration Durée de l'immobilisation en ms
   */
  public setPinned(duration: number): void {
    const previousState = this.currentState;
    this.transitionTo(ZombieState.PINNED);

    // Revenir à l'état précédent après la durée
    this.zombie.scene.time.delayedCall(duration, () => {
      if (this.currentState === ZombieState.PINNED && this.zombie.active) {
        this.transitionTo(previousState === ZombieState.DEAD ? ZombieState.IDLE : previousState);
      }
    });
  }

  /**
   * Étourdit le zombie
   * @param duration Durée de l'étourdissement en ms
   */
  public setStunned(duration: number): void {
    const previousState = this.currentState;
    this.transitionTo(ZombieState.STUNNED);

    // Revenir à l'état précédent après la durée
    this.zombie.scene.time.delayedCall(duration, () => {
      if (this.currentState === ZombieState.STUNNED && this.zombie.active) {
        this.transitionTo(previousState === ZombieState.DEAD ? ZombieState.IDLE : previousState);
      }
    });
  }

  /**
   * Réinitialise la machine à états
   */
  public reset(): void {
    this.currentState = ZombieState.IDLE;
    this.target = null;
    this.lastAttackTime = 0;
    this.lastPathTime = 0;
    this.lastSteeringTime = 0;
    this.lastIdleWanderTime = 0; // Force le vagabondage immédiat
    this.tacticalTarget = null;
    this.steeringForce.set(0, 0);
    this.steeringBehaviors.resetWanderAngle();

    // Nettoyer les assignations tactiques
    if (this.tacticalBehaviors) {
      this.tacticalBehaviors.removeZombie(this.zombie);
    }
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
