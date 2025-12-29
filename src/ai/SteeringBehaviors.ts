import Phaser from 'phaser';

/**
 * Interface pour une entité avec position et vélocité
 */
export interface SteerableEntity {
  x: number;
  y: number;
  body?: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null;
}

/**
 * Configuration des poids pour les comportements de steering
 */
export interface SteeringWeights {
  separation: number;
  alignment: number;
  cohesion: number;
  seek: number;
  flee: number;
  arrive: number;
}

/**
 * Configuration par défaut des poids
 */
export const DEFAULT_STEERING_WEIGHTS: SteeringWeights = {
  separation: 1.5,
  alignment: 1.0,
  cohesion: 1.0,
  seek: 1.0,
  flee: 1.5,
  arrive: 1.0,
};

/**
 * Classe de comportements de steering pour l'IA de horde
 * Implémente les algorithmes de Craig Reynolds pour le flocking
 */
export class SteeringBehaviors {
  /** Force maximale applicable */
  private maxForce: number;
  /** Vitesse maximale de l'entité */
  private maxSpeed: number;

  // Distances pour les comportements
  private separationDistance: number = 40;
  private alignmentDistance: number = 80;
  private cohesionDistance: number = 120;

  // Vecteurs réutilisables pour éviter les allocations
  private tempVec: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  private steeringForce: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  constructor(maxSpeed: number = 100, maxForce: number = 50) {
    this.maxSpeed = maxSpeed;
    this.maxForce = maxForce;
  }

  /**
   * Configure les distances de comportement
   */
  public setDistances(separation: number, alignment: number, cohesion: number): void {
    this.separationDistance = separation;
    this.alignmentDistance = alignment;
    this.cohesionDistance = cohesion;
  }

  /**
   * Configure la force et vitesse maximales
   */
  public setLimits(maxSpeed: number, maxForce: number): void {
    this.maxSpeed = maxSpeed;
    this.maxForce = maxForce;
  }

  /**
   * Comportement SEEK - Se diriger vers une cible
   * @param entity L'entité qui cherche
   * @param targetX Position X de la cible
   * @param targetY Position Y de la cible
   * @returns Vecteur de force de steering
   */
  public seek(entity: SteerableEntity, targetX: number, targetY: number): Phaser.Math.Vector2 {
    const desired = this.tempVec.set(targetX - entity.x, targetY - entity.y);

    // Normaliser et appliquer la vitesse max
    const distance = desired.length();
    if (distance > 0) {
      desired.normalize().scale(this.maxSpeed);
    }

    // Calculer la force de steering (desired - current velocity)
    const body = entity.body as Phaser.Physics.Arcade.Body | null;
    const currentVelX = body?.velocity.x ?? 0;
    const currentVelY = body?.velocity.y ?? 0;

    this.steeringForce.set(desired.x - currentVelX, desired.y - currentVelY);

    // Limiter la force
    if (this.steeringForce.length() > this.maxForce) {
      this.steeringForce.normalize().scale(this.maxForce);
    }

    return this.steeringForce.clone();
  }

  /**
   * Comportement FLEE - Fuir une menace
   * @param entity L'entité qui fuit
   * @param threatX Position X de la menace
   * @param threatY Position Y de la menace
   * @returns Vecteur de force de steering
   */
  public flee(entity: SteerableEntity, threatX: number, threatY: number): Phaser.Math.Vector2 {
    const desired = this.tempVec.set(entity.x - threatX, entity.y - threatY);

    // Normaliser et appliquer la vitesse max
    const distance = desired.length();
    if (distance > 0) {
      desired.normalize().scale(this.maxSpeed);
    }

    // Calculer la force de steering
    const body = entity.body as Phaser.Physics.Arcade.Body | null;
    const currentVelX = body?.velocity.x ?? 0;
    const currentVelY = body?.velocity.y ?? 0;

    this.steeringForce.set(desired.x - currentVelX, desired.y - currentVelY);

    // Limiter la force
    if (this.steeringForce.length() > this.maxForce) {
      this.steeringForce.normalize().scale(this.maxForce);
    }

    return this.steeringForce.clone();
  }

  /**
   * Comportement ARRIVE - Arriver doucement à une destination
   * Ralentit progressivement à l'approche de la cible
   * @param entity L'entité qui arrive
   * @param targetX Position X de la cible
   * @param targetY Position Y de la cible
   * @param slowingRadius Rayon à partir duquel commencer à ralentir
   * @returns Vecteur de force de steering
   */
  public arrive(
    entity: SteerableEntity,
    targetX: number,
    targetY: number,
    slowingRadius: number = 100
  ): Phaser.Math.Vector2 {
    const desired = this.tempVec.set(targetX - entity.x, targetY - entity.y);
    const distance = desired.length();

    if (distance === 0) {
      return this.steeringForce.set(0, 0);
    }

    // Calculer la vitesse désirée basée sur la distance
    let desiredSpeed: number;
    if (distance < slowingRadius) {
      // Ralentir progressivement
      desiredSpeed = this.maxSpeed * (distance / slowingRadius);
    } else {
      desiredSpeed = this.maxSpeed;
    }

    desired.normalize().scale(desiredSpeed);

    // Calculer la force de steering
    const body = entity.body as Phaser.Physics.Arcade.Body | null;
    const currentVelX = body?.velocity.x ?? 0;
    const currentVelY = body?.velocity.y ?? 0;

    this.steeringForce.set(desired.x - currentVelX, desired.y - currentVelY);

    // Limiter la force
    if (this.steeringForce.length() > this.maxForce) {
      this.steeringForce.normalize().scale(this.maxForce);
    }

    return this.steeringForce.clone();
  }

  /**
   * Comportement SEPARATION - Éviter les voisins trop proches
   * Crée une force de répulsion par rapport aux autres entités
   * @param entity L'entité concernée
   * @param neighbors Liste des voisins à éviter
   * @returns Vecteur de force de steering
   */
  public separation(entity: SteerableEntity, neighbors: SteerableEntity[]): Phaser.Math.Vector2 {
    this.steeringForce.set(0, 0);

    if (neighbors.length === 0) {
      return this.steeringForce.clone();
    }

    let count = 0;

    for (const neighbor of neighbors) {
      if (neighbor === entity) continue;

      const dx = entity.x - neighbor.x;
      const dy = entity.y - neighbor.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0 && distance < this.separationDistance) {
        // Force inversement proportionnelle à la distance
        const force = this.tempVec.set(dx, dy).normalize();
        force.scale(this.separationDistance / distance);
        this.steeringForce.add(force);
        count++;
      }
    }

    if (count > 0) {
      this.steeringForce.scale(1 / count);
      this.steeringForce.normalize().scale(this.maxSpeed);

      // Soustraire la vélocité actuelle
      const body = entity.body as Phaser.Physics.Arcade.Body | null;
      const currentVelX = body?.velocity.x ?? 0;
      const currentVelY = body?.velocity.y ?? 0;
      this.steeringForce.subtract(new Phaser.Math.Vector2(currentVelX, currentVelY));

      // Limiter
      if (this.steeringForce.length() > this.maxForce) {
        this.steeringForce.normalize().scale(this.maxForce);
      }
    }

    return this.steeringForce.clone();
  }

  /**
   * Comportement ALIGNMENT - S'aligner avec la direction du groupe
   * @param entity L'entité concernée
   * @param neighbors Liste des voisins
   * @returns Vecteur de force de steering
   */
  public alignment(entity: SteerableEntity, neighbors: SteerableEntity[]): Phaser.Math.Vector2 {
    this.steeringForce.set(0, 0);

    if (neighbors.length === 0) {
      return this.steeringForce.clone();
    }

    let count = 0;
    const avgVelocity = new Phaser.Math.Vector2(0, 0);

    for (const neighbor of neighbors) {
      if (neighbor === entity) continue;

      const dx = neighbor.x - entity.x;
      const dy = neighbor.y - entity.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0 && distance < this.alignmentDistance) {
        const body = neighbor.body as Phaser.Physics.Arcade.Body | null;
        if (body) {
          avgVelocity.add(new Phaser.Math.Vector2(body.velocity.x, body.velocity.y));
          count++;
        }
      }
    }

    if (count > 0) {
      avgVelocity.scale(1 / count);

      if (avgVelocity.length() > 0) {
        avgVelocity.normalize().scale(this.maxSpeed);

        // Calculer la force de steering
        const body = entity.body as Phaser.Physics.Arcade.Body | null;
        const currentVelX = body?.velocity.x ?? 0;
        const currentVelY = body?.velocity.y ?? 0;

        this.steeringForce.set(avgVelocity.x - currentVelX, avgVelocity.y - currentVelY);

        // Limiter
        if (this.steeringForce.length() > this.maxForce) {
          this.steeringForce.normalize().scale(this.maxForce);
        }
      }
    }

    return this.steeringForce.clone();
  }

  /**
   * Comportement COHESION - Se rapprocher du centre du groupe
   * @param entity L'entité concernée
   * @param neighbors Liste des voisins
   * @returns Vecteur de force de steering
   */
  public cohesion(entity: SteerableEntity, neighbors: SteerableEntity[]): Phaser.Math.Vector2 {
    this.steeringForce.set(0, 0);

    if (neighbors.length === 0) {
      return this.steeringForce.clone();
    }

    let count = 0;
    let centerX = 0;
    let centerY = 0;

    for (const neighbor of neighbors) {
      if (neighbor === entity) continue;

      const dx = neighbor.x - entity.x;
      const dy = neighbor.y - entity.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0 && distance < this.cohesionDistance) {
        centerX += neighbor.x;
        centerY += neighbor.y;
        count++;
      }
    }

    if (count > 0) {
      centerX /= count;
      centerY /= count;

      // Seek vers le centre
      return this.seek(entity, centerX, centerY);
    }

    return this.steeringForce.clone();
  }

  /**
   * Calcule une force de steering combinée avec des poids
   * @param entity L'entité concernée
   * @param neighbors Liste des voisins
   * @param targetX Position X de la cible (optionnelle)
   * @param targetY Position Y de la cible (optionnelle)
   * @param weights Poids pour chaque comportement
   * @param fleeTarget Position de la menace à fuir (optionnelle)
   * @returns Vecteur de force combinée
   */
  public calculateCombinedForce(
    entity: SteerableEntity,
    neighbors: SteerableEntity[],
    targetX?: number,
    targetY?: number,
    weights: Partial<SteeringWeights> = {},
    fleeTarget?: { x: number; y: number }
  ): Phaser.Math.Vector2 {
    const w = { ...DEFAULT_STEERING_WEIGHTS, ...weights };
    const combined = new Phaser.Math.Vector2(0, 0);

    // Séparation (toujours active avec des voisins)
    if (neighbors.length > 0 && w.separation > 0) {
      const sep = this.separation(entity, neighbors);
      combined.add(sep.scale(w.separation));
    }

    // Alignment
    if (neighbors.length > 0 && w.alignment > 0) {
      const ali = this.alignment(entity, neighbors);
      combined.add(ali.scale(w.alignment));
    }

    // Cohésion
    if (neighbors.length > 0 && w.cohesion > 0) {
      const coh = this.cohesion(entity, neighbors);
      combined.add(coh.scale(w.cohesion));
    }

    // Seek vers la cible
    if (targetX !== undefined && targetY !== undefined && w.seek > 0) {
      const seekForce = this.seek(entity, targetX, targetY);
      combined.add(seekForce.scale(w.seek));
    }

    // Flee de la menace
    if (fleeTarget && w.flee > 0) {
      const fleeForce = this.flee(entity, fleeTarget.x, fleeTarget.y);
      combined.add(fleeForce.scale(w.flee));
    }

    // Limiter la force totale
    if (combined.length() > this.maxForce) {
      combined.normalize().scale(this.maxForce);
    }

    return combined;
  }

  /**
   * Applique les comportements de flocking (separation + alignment + cohesion)
   * @param entity L'entité concernée
   * @param neighbors Liste des voisins
   * @param weights Poids pour chaque comportement
   * @returns Vecteur de force de flocking
   */
  public flock(
    entity: SteerableEntity,
    neighbors: SteerableEntity[],
    weights: Partial<Pick<SteeringWeights, 'separation' | 'alignment' | 'cohesion'>> = {}
  ): Phaser.Math.Vector2 {
    const w = {
      separation: weights.separation ?? DEFAULT_STEERING_WEIGHTS.separation,
      alignment: weights.alignment ?? DEFAULT_STEERING_WEIGHTS.alignment,
      cohesion: weights.cohesion ?? DEFAULT_STEERING_WEIGHTS.cohesion,
    };

    const combined = new Phaser.Math.Vector2(0, 0);

    if (neighbors.length === 0) {
      return combined;
    }

    const sep = this.separation(entity, neighbors).scale(w.separation);
    const ali = this.alignment(entity, neighbors).scale(w.alignment);
    const coh = this.cohesion(entity, neighbors).scale(w.cohesion);

    combined.add(sep).add(ali).add(coh);

    // Limiter la force
    if (combined.length() > this.maxForce) {
      combined.normalize().scale(this.maxForce);
    }

    return combined;
  }
}
