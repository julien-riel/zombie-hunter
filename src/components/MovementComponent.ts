import Phaser from 'phaser';
import type { Entity } from '@entities/Entity';
import type { PathPoint } from '@utils/pathfinding';

/**
 * Composant de gestion du mouvement
 * Gère la vélocité, la direction et les effets de statut affectant le mouvement
 * Supporte la navigation par waypoints pour le pathfinding
 */
export class MovementComponent {
  private entity: Entity;
  private baseSpeed: number;
  private currentSpeed: number;
  private direction: Phaser.Math.Vector2;
  private target: Phaser.Math.Vector2 | null = null;
  private slowMultiplier: number = 1;

  /** Liste des waypoints à suivre */
  private path: PathPoint[] = [];
  /** Index du waypoint actuel */
  private currentWaypointIndex: number = 0;
  /** Distance pour considérer un waypoint comme atteint */
  private waypointThreshold: number = 16;

  constructor(entity: Entity, speed: number) {
    this.entity = entity;
    this.baseSpeed = speed;
    this.currentSpeed = speed;
    this.direction = new Phaser.Math.Vector2(0, 0);
  }

  /**
   * Met à jour le mouvement à chaque frame
   */
  public update(_delta: number): void {
    // Priorité au chemin si défini
    if (this.path.length > 0) {
      this.followPath();
    } else if (this.target) {
      this.moveTowardsTarget();
    }
  }

  /**
   * Suit le chemin de waypoints
   */
  private followPath(): void {
    if (this.currentWaypointIndex >= this.path.length) {
      // Chemin terminé
      this.clearPath();
      return;
    }

    const waypoint = this.path[this.currentWaypointIndex];
    const dx = waypoint.x - this.entity.x;
    const dy = waypoint.y - this.entity.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Waypoint atteint, passer au suivant
    if (distance < this.waypointThreshold) {
      this.currentWaypointIndex++;

      // Vérifier si c'était le dernier waypoint
      if (this.currentWaypointIndex >= this.path.length) {
        this.clearPath();
        return;
      }
    }

    // Se déplacer vers le waypoint actuel
    if (distance > 0) {
      this.direction.set(dx / distance, dy / distance);
      const speed = this.currentSpeed * this.slowMultiplier;
      this.entity.setVelocity(this.direction.x * speed, this.direction.y * speed);

      // Faire tourner l'entité vers le waypoint
      const angle = Math.atan2(dy, dx);
      this.entity.setRotation(angle);
    }
  }

  /**
   * Définit une cible vers laquelle se déplacer
   * Note: Si un chemin est défini, il sera suivi en priorité
   */
  public setTarget(x: number, y: number): void {
    if (!this.target) {
      this.target = new Phaser.Math.Vector2(x, y);
    } else {
      this.target.set(x, y);
    }
  }

  /**
   * Définit un chemin de waypoints à suivre
   * @param waypoints - Liste de points {x, y} à suivre dans l'ordre
   */
  public setPath(waypoints: PathPoint[]): void {
    this.path = [...waypoints];
    this.currentWaypointIndex = 0;
    // Effacer la cible simple car le chemin prend la priorité
    this.target = null;
  }

  /**
   * Efface le chemin actuel
   */
  public clearPath(): void {
    this.path = [];
    this.currentWaypointIndex = 0;
  }

  /**
   * Vérifie si l'entité suit actuellement un chemin
   */
  public hasPath(): boolean {
    return this.path.length > 0 && this.currentWaypointIndex < this.path.length;
  }

  /**
   * Efface la cible actuelle
   */
  public clearTarget(): void {
    this.target = null;
    this.entity.setVelocity(0, 0);
  }

  /**
   * Déplace l'entité vers la cible
   */
  private moveTowardsTarget(): void {
    if (!this.target) return;

    const dx = this.target.x - this.entity.x;
    const dy = this.target.y - this.entity.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Arrêter si très proche de la cible
    if (distance < 5) {
      this.entity.setVelocity(0, 0);
      return;
    }

    // Normaliser et appliquer la vitesse
    this.direction.set(dx / distance, dy / distance);
    const speed = this.currentSpeed * this.slowMultiplier;

    this.entity.setVelocity(this.direction.x * speed, this.direction.y * speed);

    // Faire tourner l'entité vers la cible
    const angle = Math.atan2(dy, dx);
    this.entity.setRotation(angle);
  }

  /**
   * Déplace l'entité dans une direction donnée
   */
  public moveInDirection(dirX: number, dirY: number): void {
    const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
    if (magnitude === 0) {
      this.entity.setVelocity(0, 0);
      return;
    }

    // Normaliser
    this.direction.set(dirX / magnitude, dirY / magnitude);
    const speed = this.currentSpeed * this.slowMultiplier;

    this.entity.setVelocity(this.direction.x * speed, this.direction.y * speed);
  }

  /**
   * Applique un effet de ralentissement
   */
  public applySlow(multiplier: number, duration: number): void {
    this.slowMultiplier = multiplier;

    this.entity.scene.time.delayedCall(duration, () => {
      this.slowMultiplier = 1;
    });
  }

  /**
   * Définit le multiplicateur de vitesse (pour les power-ups)
   * Contrairement à applySlow, ceci est permanent jusqu'à ce qu'il soit changé
   */
  public setSpeedMultiplier(multiplier: number): void {
    this.slowMultiplier = multiplier;
  }

  /**
   * Récupère le multiplicateur de vitesse actuel
   */
  public getSpeedMultiplier(): number {
    return this.slowMultiplier;
  }

  /**
   * Applique un boost de vitesse
   */
  public applySpeedBoost(multiplier: number, duration: number): void {
    const originalSpeed = this.currentSpeed;
    this.currentSpeed *= multiplier;

    this.entity.scene.time.delayedCall(duration, () => {
      this.currentSpeed = originalSpeed;
    });
  }

  /**
   * Récupère la vitesse actuelle
   */
  public getSpeed(): number {
    return this.currentSpeed * this.slowMultiplier;
  }

  /**
   * Récupère la vitesse de base
   */
  public getBaseSpeed(): number {
    return this.baseSpeed;
  }

  /**
   * Définit la vitesse de base
   */
  public setBaseSpeed(speed: number): void {
    this.baseSpeed = speed;
    this.currentSpeed = speed;
  }

  /**
   * Récupère la direction actuelle
   */
  public getDirection(): Phaser.Math.Vector2 {
    return this.direction.clone();
  }

  /**
   * Vérifie si l'entité est en mouvement
   */
  public isMoving(): boolean {
    const body = this.entity.body as Phaser.Physics.Arcade.Body;
    return body && (Math.abs(body.velocity.x) > 1 || Math.abs(body.velocity.y) > 1);
  }

  /**
   * Arrête le mouvement
   */
  public stop(): void {
    this.entity.setVelocity(0, 0);
    this.target = null;
    this.clearPath();
  }

  /**
   * Calcule la distance jusqu'à une position
   */
  public distanceTo(x: number, y: number): number {
    const dx = x - this.entity.x;
    const dy = y - this.entity.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Réinitialise le composant
   */
  public reset(): void {
    this.currentSpeed = this.baseSpeed;
    this.slowMultiplier = 1;
    this.target = null;
    this.direction.set(0, 0);
    this.clearPath();
  }
}
