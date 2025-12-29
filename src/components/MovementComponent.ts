import Phaser from 'phaser';
import type { Entity } from '@entities/Entity';

/**
 * Composant de gestion du mouvement
 * Gère la vélocité, la direction et les effets de statut affectant le mouvement
 */
export class MovementComponent {
  private entity: Entity;
  private baseSpeed: number;
  private currentSpeed: number;
  private direction: Phaser.Math.Vector2;
  private target: Phaser.Math.Vector2 | null = null;
  private slowMultiplier: number = 1;

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
    if (this.target) {
      this.moveTowardsTarget();
    }
  }

  /**
   * Définit une cible vers laquelle se déplacer
   */
  public setTarget(x: number, y: number): void {
    if (!this.target) {
      this.target = new Phaser.Math.Vector2(x, y);
    } else {
      this.target.set(x, y);
    }
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
  }
}
