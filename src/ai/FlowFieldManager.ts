import { FlowField, FlowDirection } from './FlowField';
import { TILE_SIZE } from '@config/constants';

/**
 * Configuration du FlowFieldManager
 */
export interface FlowFieldManagerConfig {
  /** Distance min de déplacement de la cible pour déclencher un recalcul (pixels) */
  targetMoveThreshold?: number;

  /** Intervalle minimum entre deux recalculs (ms) */
  minUpdateInterval?: number;

  /** Nombre max d'itérations de calcul par frame */
  maxIterationsPerFrame?: number;

  /** Nombre min de zombies pour utiliser le flow field au lieu de A* */
  minZombiesForFlowField?: number;

  /** Distance max pour utiliser le flow field (au-delà, les zombies sont "hors-champ") */
  maxFlowFieldDistance?: number;
}

/**
 * Statistiques de performance
 */
export interface FlowFieldStats {
  lastComputeTime: number;
  totalComputeTime: number;
  computeCount: number;
  activeZombiesUsingFlow: number;
}

/**
 * Gestionnaire de Flow Fields
 *
 * Gère la création, mise à jour et invalidation des flow fields.
 * Optimise les performances en:
 * - Étalant les calculs sur plusieurs frames (async)
 * - Évitant les recalculs inutiles (caching)
 * - Basculant automatiquement entre A* et flow field selon le nombre de zombies
 */
export class FlowFieldManager {
  /** Flow field principal (vers le joueur) */
  private playerFlowField: FlowField | null = null;

  /** Grille de walkability (référence) */
  private walkableGrid: boolean[][] = [];

  /** Configuration */
  private readonly config: Required<FlowFieldManagerConfig>;

  /** Dernière position connue de la cible */
  private lastTargetX: number = 0;
  private lastTargetY: number = 0;

  /** Timestamp de la dernière mise à jour */
  private lastUpdateTime: number = 0;

  /** Flag indiquant que la grille a changé */
  private gridDirty: boolean = true;

  /** Statistiques */
  private stats: FlowFieldStats = {
    lastComputeTime: 0,
    totalComputeTime: 0,
    computeCount: 0,
    activeZombiesUsingFlow: 0,
  };

  /** Nombre de zombies actifs (mis à jour par le HordeManager ou GameScene) */
  private activeZombieCount: number = 0;

  /** Flag pour forcer un calcul synchrone au premier update */
  private needsInitialCompute: boolean = true;

  constructor(config: FlowFieldManagerConfig = {}) {
    this.config = {
      targetMoveThreshold: config.targetMoveThreshold ?? 32, // Une tuile
      minUpdateInterval: config.minUpdateInterval ?? 200, // 5 updates/sec max
      maxIterationsPerFrame: config.maxIterationsPerFrame ?? 150,
      minZombiesForFlowField: config.minZombiesForFlowField ?? 10,
      maxFlowFieldDistance: config.maxFlowFieldDistance ?? 1500,
    };
  }

  /**
   * Initialise le manager avec la grille de walkability
   */
  public initialize(walkableGrid: boolean[][]): void {
    this.walkableGrid = walkableGrid;
    this.playerFlowField = new FlowField(walkableGrid, TILE_SIZE);
    this.gridDirty = true;
  }

  /**
   * Met à jour le nombre de zombies actifs
   */
  public setActiveZombieCount(count: number): void {
    this.activeZombieCount = count;
    this.stats.activeZombiesUsingFlow = this.shouldUseFlowField() ? count : 0;
  }

  /**
   * Détermine si on doit utiliser le flow field
   */
  public shouldUseFlowField(): boolean {
    return this.activeZombieCount >= this.config.minZombiesForFlowField;
  }

  /**
   * Met à jour le flow field (appelé chaque frame)
   *
   * @param targetX Position X de la cible (joueur)
   * @param targetY Position Y de la cible (joueur)
   */
  public update(targetX: number, targetY: number): void {
    if (!this.playerFlowField) {
      return;
    }

    // Si pas assez de zombies, on ne calcule pas mais on ne reset pas le flag
    if (!this.shouldUseFlowField()) {
      return;
    }

    const now = Date.now();

    // Premier calcul synchrone pour avoir un flow field prêt immédiatement
    if (this.needsInitialCompute) {
      this.needsInitialCompute = false;
      this.forceSync(targetX, targetY);
      return;
    }

    // Vérifier si un calcul asynchrone est en cours
    if (this.playerFlowField.isComputing()) {
      const startTime = performance.now();
      const done = this.playerFlowField.continueCompute(this.config.maxIterationsPerFrame);
      const computeTime = performance.now() - startTime;

      this.stats.lastComputeTime = computeTime;
      this.stats.totalComputeTime += computeTime;

      if (done) {
        this.stats.computeCount++;
      }
      return;
    }

    // Vérifier si on doit recalculer
    const needsUpdate = this.needsUpdate(targetX, targetY, now);

    if (needsUpdate) {
      // Mettre à jour la grille si nécessaire
      if (this.gridDirty) {
        this.playerFlowField.updateWalkableGrid(this.walkableGrid);
        this.gridDirty = false;
      }

      // Démarrer le calcul asynchrone
      this.playerFlowField.startComputeAsync(targetX, targetY);
      this.lastTargetX = targetX;
      this.lastTargetY = targetY;
      this.lastUpdateTime = now;
    }
  }

  /**
   * Force un recalcul synchrone (à utiliser avec précaution)
   */
  public forceSync(targetX: number, targetY: number): void {
    if (!this.playerFlowField) return;

    if (this.gridDirty) {
      this.playerFlowField.updateWalkableGrid(this.walkableGrid);
      this.gridDirty = false;
    }

    const startTime = performance.now();
    this.playerFlowField.computeSync(targetX, targetY);
    const computeTime = performance.now() - startTime;

    this.stats.lastComputeTime = computeTime;
    this.stats.totalComputeTime += computeTime;
    this.stats.computeCount++;

    this.lastTargetX = targetX;
    this.lastTargetY = targetY;
    this.lastUpdateTime = Date.now();
  }

  /**
   * Vérifie si une mise à jour est nécessaire
   */
  private needsUpdate(targetX: number, targetY: number, now: number): boolean {
    // Vérifier l'intervalle minimum
    if (now - this.lastUpdateTime < this.config.minUpdateInterval) {
      return false;
    }

    // Vérifier si le flow field est invalide
    if (!this.playerFlowField?.isFieldValid()) {
      return true;
    }

    // Vérifier si la grille a changé
    if (this.gridDirty) {
      return true;
    }

    // Vérifier si la cible s'est suffisamment déplacée
    const dx = targetX - this.lastTargetX;
    const dy = targetY - this.lastTargetY;
    const distanceMoved = Math.sqrt(dx * dx + dy * dy);

    return distanceMoved >= this.config.targetMoveThreshold;
  }

  /**
   * Marque la grille comme modifiée (après destruction d'obstacle)
   */
  public invalidateGrid(): void {
    this.gridDirty = true;
    this.playerFlowField?.invalidate();
  }

  /**
   * Met à jour une zone de la grille (après destruction d'obstacle)
   */
  public updateGridArea(
    worldX: number,
    worldY: number,
    width: number,
    height: number,
    walkable: boolean
  ): void {
    const left = Math.floor((worldX - width / 2) / TILE_SIZE);
    const right = Math.ceil((worldX + width / 2) / TILE_SIZE);
    const top = Math.floor((worldY - height / 2) / TILE_SIZE);
    const bottom = Math.ceil((worldY + height / 2) / TILE_SIZE);

    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        if (y >= 0 && y < this.walkableGrid.length &&
            x >= 0 && x < this.walkableGrid[0].length) {
          this.walkableGrid[y][x] = walkable;
        }
      }
    }

    this.invalidateGrid();
  }

  /**
   * Récupère la direction à suivre pour une position donnée
   */
  public getDirection(worldX: number, worldY: number): FlowDirection {
    if (!this.playerFlowField || !this.playerFlowField.isFieldValid()) {
      return { x: 0, y: 0 };
    }

    return this.playerFlowField.getDirection(worldX, worldY);
  }

  /**
   * Récupère la direction avec interpolation (plus smooth)
   */
  public getDirectionSmooth(worldX: number, worldY: number): FlowDirection {
    if (!this.playerFlowField || !this.playerFlowField.isFieldValid()) {
      return { x: 0, y: 0 };
    }

    return this.playerFlowField.getDirectionSmooth(worldX, worldY);
  }

  /**
   * Vérifie si le flow field est prêt à être utilisé
   */
  public isReady(): boolean {
    return this.playerFlowField !== null &&
           this.playerFlowField.isFieldValid() &&
           this.shouldUseFlowField();
  }

  /**
   * Vérifie si un calcul est en cours
   */
  public isComputing(): boolean {
    return this.playerFlowField?.isComputing() ?? false;
  }

  /**
   * Récupère le coût pour atteindre la cible
   */
  public getCost(worldX: number, worldY: number): number {
    if (!this.playerFlowField) return Infinity;
    return this.playerFlowField.getCost(worldX, worldY);
  }

  /**
   * Récupère les statistiques de performance
   */
  public getStats(): FlowFieldStats {
    return { ...this.stats };
  }

  /**
   * Réinitialise les statistiques
   */
  public resetStats(): void {
    this.stats = {
      lastComputeTime: 0,
      totalComputeTime: 0,
      computeCount: 0,
      activeZombiesUsingFlow: 0,
    };
  }

  /**
   * Récupère la configuration actuelle
   */
  public getConfig(): Readonly<Required<FlowFieldManagerConfig>> {
    return this.config;
  }

  /**
   * Récupère le flow field pour debug
   */
  public getFlowField(): FlowField | null {
    return this.playerFlowField;
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.playerFlowField = null;
    this.walkableGrid = [];
  }
}
