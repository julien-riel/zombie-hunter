import Phaser from 'phaser';
import type { Zombie } from '@entities/zombies/Zombie';
import { SteeringBehaviors, SteeringWeights, DEFAULT_STEERING_WEIGHTS } from './SteeringBehaviors';

/**
 * Configuration du gestionnaire de horde
 */
export interface HordeConfig {
  /** Taille des cellules de la grille spatiale (pixels) */
  cellSize: number;
  /** Distance maximale pour considérer des zombies comme voisins */
  neighborRadius: number;
  /** Intervalle de mise à jour du hash spatial (ms) */
  spatialUpdateInterval: number;
  /** Nombre maximum de zombies mis à jour par frame pour le steering */
  maxUpdatesPerFrame: number;
  /** Distance pour considérer un zombie "hors écran" */
  offScreenMargin: number;
}

/**
 * Configuration par défaut
 */
export const DEFAULT_HORDE_CONFIG: HordeConfig = {
  cellSize: 64,
  neighborRadius: 120,
  spatialUpdateInterval: 100,
  maxUpdatesPerFrame: 20,
  offScreenMargin: 100,
};

/**
 * Représente une cellule dans la grille spatiale
 */
interface SpatialCell {
  zombies: Set<Zombie>;
}

/**
 * Statistiques de groupe pour un zombie
 */
export interface GroupStats {
  center: Phaser.Math.Vector2;
  averageVelocity: Phaser.Math.Vector2;
  memberCount: number;
  nearestNeighborDistance: number;
}

/**
 * Gestionnaire de horde pour la coordination des zombies
 * Utilise le spatial hashing pour des requêtes de voisinage efficaces
 */
export class HordeManager {
  private config: HordeConfig;
  private steeringBehaviors: SteeringBehaviors;

  /** Grille spatiale pour le hash */
  private spatialGrid: Map<string, SpatialCell> = new Map();

  /** Dernier temps de mise à jour de la grille */
  private lastSpatialUpdate: number = 0;

  /** Index pour le throttling des mises à jour */
  private updateIndex: number = 0;

  /** Cache des voisins par zombie */
  private neighborCache: Map<Zombie, Zombie[]> = new Map();

  /** Liste des zombies enregistrés */
  private registeredZombies: Set<Zombie> = new Set();

  /** Caméra pour le LOD comportemental */
  private camera: Phaser.Cameras.Scene2D.Camera | null = null;

  constructor(scene: Phaser.Scene, config: Partial<HordeConfig> = {}) {
    this.config = { ...DEFAULT_HORDE_CONFIG, ...config };
    this.steeringBehaviors = new SteeringBehaviors();

    // Configurer les distances du steering
    this.steeringBehaviors.setDistances(40, 80, 120);

    // Récupérer la caméra principale
    this.camera = scene.cameras.main;
  }

  /**
   * Calcule la clé de cellule pour une position
   */
  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.config.cellSize);
    const cellY = Math.floor(y / this.config.cellSize);
    return `${cellX},${cellY}`;
  }

  /**
   * Met à jour la grille spatiale
   */
  public updateSpatialGrid(zombies: Zombie[]): void {
    const now = Date.now();

    // Throttle la mise à jour
    if (now - this.lastSpatialUpdate < this.config.spatialUpdateInterval) {
      return;
    }
    this.lastSpatialUpdate = now;

    // Vider la grille
    this.spatialGrid.clear();
    this.neighborCache.clear();
    this.registeredZombies.clear();

    // Remplir la grille
    for (const zombie of zombies) {
      if (!zombie.active) continue;

      this.registeredZombies.add(zombie);
      const key = this.getCellKey(zombie.x, zombie.y);

      if (!this.spatialGrid.has(key)) {
        this.spatialGrid.set(key, { zombies: new Set() });
      }

      this.spatialGrid.get(key)!.zombies.add(zombie);
    }
  }

  /**
   * Récupère les voisins d'un zombie dans un rayon donné
   * Utilise le spatial hashing pour l'efficacité
   */
  public getNeighbors(zombie: Zombie, radius?: number): Zombie[] {
    // Vérifier le cache
    if (this.neighborCache.has(zombie)) {
      return this.neighborCache.get(zombie)!;
    }

    const r = radius ?? this.config.neighborRadius;
    const neighbors: Zombie[] = [];

    // Calculer les cellules à vérifier
    const cellsToCheck = Math.ceil(r / this.config.cellSize) + 1;
    const centerCellX = Math.floor(zombie.x / this.config.cellSize);
    const centerCellY = Math.floor(zombie.y / this.config.cellSize);

    for (let dx = -cellsToCheck; dx <= cellsToCheck; dx++) {
      for (let dy = -cellsToCheck; dy <= cellsToCheck; dy++) {
        const key = `${centerCellX + dx},${centerCellY + dy}`;
        const cell = this.spatialGrid.get(key);

        if (!cell) continue;

        for (const other of cell.zombies) {
          if (other === zombie || !other.active) continue;

          const distSq =
            (other.x - zombie.x) * (other.x - zombie.x) +
            (other.y - zombie.y) * (other.y - zombie.y);

          if (distSq <= r * r) {
            neighbors.push(other);
          }
        }
      }
    }

    // Mettre en cache
    this.neighborCache.set(zombie, neighbors);

    return neighbors;
  }

  /**
   * Calcule les statistiques de groupe pour un zombie
   */
  public getGroupStats(zombie: Zombie): GroupStats {
    const neighbors = this.getNeighbors(zombie);

    if (neighbors.length === 0) {
      return {
        center: new Phaser.Math.Vector2(zombie.x, zombie.y),
        averageVelocity: new Phaser.Math.Vector2(0, 0),
        memberCount: 1,
        nearestNeighborDistance: Infinity,
      };
    }

    let centerX = zombie.x;
    let centerY = zombie.y;
    let velX = 0;
    let velY = 0;
    let nearestDist = Infinity;

    for (const neighbor of neighbors) {
      centerX += neighbor.x;
      centerY += neighbor.y;

      const body = neighbor.body as Phaser.Physics.Arcade.Body | null;
      if (body) {
        velX += body.velocity.x;
        velY += body.velocity.y;
      }

      const dist = Math.sqrt(
        (neighbor.x - zombie.x) * (neighbor.x - zombie.x) +
          (neighbor.y - zombie.y) * (neighbor.y - zombie.y)
      );
      if (dist < nearestDist) {
        nearestDist = dist;
      }
    }

    const count = neighbors.length + 1;
    return {
      center: new Phaser.Math.Vector2(centerX / count, centerY / count),
      averageVelocity: new Phaser.Math.Vector2(velX / neighbors.length, velY / neighbors.length),
      memberCount: count,
      nearestNeighborDistance: nearestDist,
    };
  }

  /**
   * Calcule la vélocité de groupe pour un zombie
   * Combine les comportements de steering avec les objectifs individuels
   */
  public calculateGroupVelocity(
    zombie: Zombie,
    targetX: number,
    targetY: number,
    weights?: Partial<SteeringWeights>
  ): Phaser.Math.Vector2 {
    const neighbors = this.getNeighbors(zombie);

    // Si pas de voisins, juste seek vers la cible
    if (neighbors.length === 0) {
      return this.steeringBehaviors.seek(zombie, targetX, targetY);
    }

    // Calculer la force combinée
    const force = this.steeringBehaviors.calculateCombinedForce(
      zombie,
      neighbors,
      targetX,
      targetY,
      weights ?? DEFAULT_STEERING_WEIGHTS
    );

    return force;
  }

  /**
   * Vérifie si un zombie est visible à l'écran (pour LOD)
   */
  public isOnScreen(zombie: Zombie): boolean {
    if (!this.camera) return true;

    const margin = this.config.offScreenMargin;
    const bounds = this.camera.worldView;

    return (
      zombie.x >= bounds.x - margin &&
      zombie.x <= bounds.x + bounds.width + margin &&
      zombie.y >= bounds.y - margin &&
      zombie.y <= bounds.y + bounds.height + margin
    );
  }

  /**
   * Met à jour le gestionnaire (à appeler chaque frame)
   * Gère le throttling pour limiter les calculs
   */
  public update(zombies: Zombie[], _time: number): void {
    // Mettre à jour la grille spatiale
    this.updateSpatialGrid(zombies);

    // Réinitialiser l'index de mise à jour si nécessaire
    if (this.updateIndex >= zombies.length) {
      this.updateIndex = 0;
    }
  }

  /**
   * Récupère les zombies qui devraient être mis à jour cette frame
   * Implémente le throttling pour les performances
   */
  public getZombiesToUpdate(zombies: Zombie[]): Zombie[] {
    const result: Zombie[] = [];
    const count = Math.min(this.config.maxUpdatesPerFrame, zombies.length);

    for (let i = 0; i < count; i++) {
      const index = (this.updateIndex + i) % zombies.length;
      const zombie = zombies[index];

      if (zombie.active) {
        // Priorité aux zombies à l'écran
        if (this.isOnScreen(zombie)) {
          result.push(zombie);
        } else if (result.length < count / 2) {
          // Mettre à jour quelques zombies hors écran aussi
          result.push(zombie);
        }
      }
    }

    this.updateIndex = (this.updateIndex + count) % Math.max(1, zombies.length);

    return result;
  }

  /**
   * Récupère les comportements de steering
   */
  public getSteering(): SteeringBehaviors {
    return this.steeringBehaviors;
  }

  /**
   * Récupère tous les zombies dans un rayon autour d'un point
   */
  public getZombiesInRadius(x: number, y: number, radius: number): Zombie[] {
    const result: Zombie[] = [];
    const radiusSq = radius * radius;

    const cellsToCheck = Math.ceil(radius / this.config.cellSize) + 1;
    const centerCellX = Math.floor(x / this.config.cellSize);
    const centerCellY = Math.floor(y / this.config.cellSize);

    for (let dx = -cellsToCheck; dx <= cellsToCheck; dx++) {
      for (let dy = -cellsToCheck; dy <= cellsToCheck; dy++) {
        const key = `${centerCellX + dx},${centerCellY + dy}`;
        const cell = this.spatialGrid.get(key);

        if (!cell) continue;

        for (const zombie of cell.zombies) {
          if (!zombie.active) continue;

          const distSq = (zombie.x - x) * (zombie.x - x) + (zombie.y - y) * (zombie.y - y);

          if (distSq <= radiusSq) {
            result.push(zombie);
          }
        }
      }
    }

    return result;
  }

  /**
   * Nettoie le gestionnaire
   */
  public destroy(): void {
    this.spatialGrid.clear();
    this.neighborCache.clear();
    this.registeredZombies.clear();
  }
}
