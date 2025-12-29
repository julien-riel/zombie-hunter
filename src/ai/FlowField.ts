import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '@config/constants';

/**
 * Direction représentée par un vecteur normalisé
 */
export interface FlowDirection {
  x: number;
  y: number;
}

/**
 * État de calcul pour l'exécution asynchrone
 */
interface ComputeState {
  targetX: number;
  targetY: number;
  integrationMap: number[][];
  openList: { x: number; y: number; cost: number }[];
  closedSet: Set<string>;
  phase: 'integration' | 'flow' | 'done';
  currentRow: number;
}

/** Coût infini pour les cellules non-walkable */
const INFINITY_COST = 65535;

/** Coût de base pour une cellule walkable */
const BASE_COST = 1;

/** Coût diagonal */
const DIAGONAL_COST = 1.414;

/**
 * Flow Field pour le pathfinding de masse
 *
 * Un flow field est une grille où chaque cellule contient un vecteur de direction
 * pointant vers le chemin optimal vers la cible. Tous les zombies peuvent
 * consulter cette même grille pour leur navigation.
 *
 * Algorithme:
 * 1. Dijkstra inversé depuis la cible pour créer l'integration map (coûts)
 * 2. Gradient descent pour calculer les vecteurs de direction
 */
export class FlowField {
  /** Grille de directions (vecteurs normalisés) */
  private flowMap: FlowDirection[][];

  /** Grille de coûts d'intégration (distance à la cible) */
  private integrationMap: number[][];

  /** Grille de walkability (référence externe) */
  private walkableGrid: boolean[][];

  /** Dimensions de la grille */
  private readonly gridWidth: number;
  private readonly gridHeight: number;
  private readonly tileSize: number;

  /** Position de la cible actuelle */
  private targetGridX: number = -1;
  private targetGridY: number = -1;

  /** Flag indiquant si le flow field est valide */
  private isValid: boolean = false;

  /** État de calcul asynchrone */
  private computeState: ComputeState | null = null;

  /** Timestamp de la dernière mise à jour */
  private lastUpdateTime: number = 0;

  constructor(walkableGrid: boolean[][], tileSize: number = TILE_SIZE) {
    this.walkableGrid = walkableGrid;
    this.tileSize = tileSize;
    this.gridWidth = Math.ceil(GAME_WIDTH / tileSize);
    this.gridHeight = Math.ceil(GAME_HEIGHT / tileSize);

    // Initialiser les grilles
    this.flowMap = this.createEmptyFlowMap();
    this.integrationMap = this.createEmptyIntegrationMap();
  }

  /**
   * Crée une flow map vide
   */
  private createEmptyFlowMap(): FlowDirection[][] {
    const map: FlowDirection[][] = [];
    for (let y = 0; y < this.gridHeight; y++) {
      map[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        map[y][x] = { x: 0, y: 0 };
      }
    }
    return map;
  }

  /**
   * Crée une integration map vide (coûts infinis)
   */
  private createEmptyIntegrationMap(): number[][] {
    const map: number[][] = [];
    for (let y = 0; y < this.gridHeight; y++) {
      map[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        map[y][x] = INFINITY_COST;
      }
    }
    return map;
  }

  /**
   * Met à jour la grille de walkability (après destruction d'obstacle)
   */
  public updateWalkableGrid(grid: boolean[][]): void {
    this.walkableGrid = grid;
    this.isValid = false;
  }

  /**
   * Démarre le calcul du flow field (synchrone)
   * Utilisé quand on a besoin du résultat immédiatement
   */
  public computeSync(targetWorldX: number, targetWorldY: number): void {
    const targetGridX = Math.floor(targetWorldX / this.tileSize);
    const targetGridY = Math.floor(targetWorldY / this.tileSize);

    // Skip si même cible et déjà valide
    if (this.isValid && targetGridX === this.targetGridX && targetGridY === this.targetGridY) {
      return;
    }

    this.targetGridX = targetGridX;
    this.targetGridY = targetGridY;

    // Réinitialiser l'integration map
    this.resetIntegrationMap();

    // Phase 1: Dijkstra inversé (integration)
    this.computeIntegrationMapSync(targetGridX, targetGridY);

    // Phase 2: Calcul des directions (flow)
    this.computeFlowMapSync();

    this.isValid = true;
    this.lastUpdateTime = Date.now();
    this.computeState = null;
  }

  /**
   * Démarre le calcul asynchrone du flow field
   * Le calcul sera étalé sur plusieurs frames via continueCompute()
   */
  public startComputeAsync(targetWorldX: number, targetWorldY: number): void {
    const targetGridX = Math.floor(targetWorldX / this.tileSize);
    const targetGridY = Math.floor(targetWorldY / this.tileSize);

    // Skip si même cible et déjà valide
    if (this.isValid && targetGridX === this.targetGridX && targetGridY === this.targetGridY) {
      this.computeState = null;
      return;
    }

    this.targetGridX = targetGridX;
    this.targetGridY = targetGridY;
    this.isValid = false;

    // Réinitialiser l'integration map
    const integrationMap = this.createEmptyIntegrationMap();

    // Initialiser l'état de calcul
    this.computeState = {
      targetX: targetGridX,
      targetY: targetGridY,
      integrationMap,
      openList: [],
      closedSet: new Set(),
      phase: 'integration',
      currentRow: 0,
    };

    // Initialiser la cellule cible
    if (this.isValidTile(targetGridX, targetGridY)) {
      integrationMap[targetGridY][targetGridX] = 0;
      this.computeState.openList.push({ x: targetGridX, y: targetGridY, cost: 0 });
    }
  }

  /**
   * Continue le calcul asynchrone
   * @param maxIterations Nombre max d'itérations par frame
   * @returns true si le calcul est terminé
   */
  public continueCompute(maxIterations: number = 100): boolean {
    if (!this.computeState) return true;

    const state = this.computeState;
    let iterations = 0;

    if (state.phase === 'integration') {
      // Phase Dijkstra
      while (state.openList.length > 0 && iterations < maxIterations) {
        iterations++;

        // Trouver la cellule avec le coût le plus bas
        let lowestIndex = 0;
        for (let i = 1; i < state.openList.length; i++) {
          if (state.openList[i].cost < state.openList[lowestIndex].cost) {
            lowestIndex = i;
          }
        }

        const current = state.openList[lowestIndex];
        state.openList.splice(lowestIndex, 1);

        const key = `${current.x},${current.y}`;
        if (state.closedSet.has(key)) continue;
        state.closedSet.add(key);

        // Explorer les voisins
        const neighbors = this.getNeighbors(current.x, current.y);
        for (const neighbor of neighbors) {
          const neighborKey = `${neighbor.x},${neighbor.y}`;
          if (state.closedSet.has(neighborKey)) continue;

          const isDiagonal = neighbor.x !== current.x && neighbor.y !== current.y;
          const moveCost = isDiagonal ? DIAGONAL_COST : BASE_COST;
          const newCost = current.cost + moveCost;

          if (newCost < state.integrationMap[neighbor.y][neighbor.x]) {
            state.integrationMap[neighbor.y][neighbor.x] = newCost;
            state.openList.push({ x: neighbor.x, y: neighbor.y, cost: newCost });
          }
        }
      }

      // Vérifier si phase terminée
      if (state.openList.length === 0) {
        this.integrationMap = state.integrationMap;
        state.phase = 'flow';
        state.currentRow = 0;
      }
    } else if (state.phase === 'flow') {
      // Phase calcul des directions
      const rowsPerIteration = Math.ceil(maxIterations / this.gridWidth);
      const endRow = Math.min(state.currentRow + rowsPerIteration, this.gridHeight);

      for (let y = state.currentRow; y < endRow; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          this.computeFlowDirection(x, y);
        }
      }

      state.currentRow = endRow;

      // Vérifier si phase terminée
      if (state.currentRow >= this.gridHeight) {
        state.phase = 'done';
        this.isValid = true;
        this.lastUpdateTime = Date.now();
        this.computeState = null;
        return true;
      }
    }

    return state.phase === 'done';
  }

  /**
   * Vérifie si un calcul asynchrone est en cours
   */
  public isComputing(): boolean {
    return this.computeState !== null;
  }

  /**
   * Réinitialise l'integration map
   */
  private resetIntegrationMap(): void {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.integrationMap[y][x] = INFINITY_COST;
      }
    }
  }

  /**
   * Calcule l'integration map de manière synchrone (Dijkstra)
   */
  private computeIntegrationMapSync(targetX: number, targetY: number): void {
    if (!this.isValidTile(targetX, targetY)) return;

    const openList: { x: number; y: number; cost: number }[] = [];
    const closedSet = new Set<string>();

    // Initialiser la cible avec coût 0
    this.integrationMap[targetY][targetX] = 0;
    openList.push({ x: targetX, y: targetY, cost: 0 });

    while (openList.length > 0) {
      // Trouver la cellule avec le coût le plus bas
      let lowestIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].cost < openList[lowestIndex].cost) {
          lowestIndex = i;
        }
      }

      const current = openList[lowestIndex];
      openList.splice(lowestIndex, 1);

      const key = `${current.x},${current.y}`;
      if (closedSet.has(key)) continue;
      closedSet.add(key);

      // Explorer les voisins
      const neighbors = this.getNeighbors(current.x, current.y);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(neighborKey)) continue;

        const isDiagonal = neighbor.x !== current.x && neighbor.y !== current.y;
        const moveCost = isDiagonal ? DIAGONAL_COST : BASE_COST;
        const newCost = current.cost + moveCost;

        if (newCost < this.integrationMap[neighbor.y][neighbor.x]) {
          this.integrationMap[neighbor.y][neighbor.x] = newCost;
          openList.push({ x: neighbor.x, y: neighbor.y, cost: newCost });
        }
      }
    }
  }

  /**
   * Calcule la flow map (directions) de manière synchrone
   */
  private computeFlowMapSync(): void {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.computeFlowDirection(x, y);
      }
    }
  }

  /**
   * Calcule la direction pour une cellule donnée
   */
  private computeFlowDirection(x: number, y: number): void {
    // Les cellules non-walkable pointent vers (0, 0)
    if (!this.isWalkable(x, y)) {
      this.flowMap[y][x] = { x: 0, y: 0 };
      return;
    }

    const currentCost = this.integrationMap[y][x];

    // Si coût infini, pas de direction
    if (currentCost >= INFINITY_COST) {
      this.flowMap[y][x] = { x: 0, y: 0 };
      return;
    }

    // Trouver le voisin avec le coût le plus bas
    let bestDx = 0;
    let bestDy = 0;
    let bestCost = currentCost;

    // Directions: 8 directions
    const directions = [
      { dx: 0, dy: -1 },   // N
      { dx: 1, dy: -1 },   // NE
      { dx: 1, dy: 0 },    // E
      { dx: 1, dy: 1 },    // SE
      { dx: 0, dy: 1 },    // S
      { dx: -1, dy: 1 },   // SW
      { dx: -1, dy: 0 },   // W
      { dx: -1, dy: -1 },  // NW
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;

      if (!this.isValidTile(nx, ny)) continue;

      const neighborCost = this.integrationMap[ny][nx];

      // Pour les diagonales, vérifier que les cases adjacentes sont walkable
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (!this.isWalkable(x + dir.dx, y) || !this.isWalkable(x, y + dir.dy)) {
          continue;
        }
      }

      if (neighborCost < bestCost) {
        bestCost = neighborCost;
        bestDx = dir.dx;
        bestDy = dir.dy;
      }
    }

    // Normaliser le vecteur direction
    const length = Math.sqrt(bestDx * bestDx + bestDy * bestDy);
    if (length > 0) {
      this.flowMap[y][x] = {
        x: bestDx / length,
        y: bestDy / length,
      };
    } else {
      this.flowMap[y][x] = { x: 0, y: 0 };
    }
  }

  /**
   * Récupère les voisins walkable d'une cellule
   */
  private getNeighbors(x: number, y: number): { x: number; y: number }[] {
    const neighbors: { x: number; y: number }[] = [];

    // 8 directions
    const directions = [
      { dx: 0, dy: -1 },   // N
      { dx: 1, dy: -1 },   // NE
      { dx: 1, dy: 0 },    // E
      { dx: 1, dy: 1 },    // SE
      { dx: 0, dy: 1 },    // S
      { dx: -1, dy: 1 },   // SW
      { dx: -1, dy: 0 },   // W
      { dx: -1, dy: -1 },  // NW
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;

      if (!this.isValidTile(nx, ny)) continue;
      if (!this.isWalkable(nx, ny)) continue;

      // Pour les diagonales, vérifier corner-cutting
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (!this.isWalkable(x + dir.dx, y) || !this.isWalkable(x, y + dir.dy)) {
          continue;
        }
      }

      neighbors.push({ x: nx, y: ny });
    }

    return neighbors;
  }

  /**
   * Vérifie si une cellule est dans les limites
   */
  private isValidTile(x: number, y: number): boolean {
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
  }

  /**
   * Vérifie si une cellule est walkable
   */
  private isWalkable(x: number, y: number): boolean {
    if (!this.isValidTile(x, y)) return false;
    return this.walkableGrid[y]?.[x] ?? false;
  }

  /**
   * Récupère la direction à suivre pour des coordonnées monde
   */
  public getDirection(worldX: number, worldY: number): FlowDirection {
    if (!this.isValid) {
      return { x: 0, y: 0 };
    }

    const gridX = Math.floor(worldX / this.tileSize);
    const gridY = Math.floor(worldY / this.tileSize);

    if (!this.isValidTile(gridX, gridY)) {
      return { x: 0, y: 0 };
    }

    return this.flowMap[gridY][gridX];
  }

  /**
   * Récupère la direction avec interpolation bilinéaire
   * Plus smooth que getDirection() mais plus coûteux
   */
  public getDirectionSmooth(worldX: number, worldY: number): FlowDirection {
    if (!this.isValid) {
      return { x: 0, y: 0 };
    }

    // Position dans la grille (avec décimales)
    const gx = worldX / this.tileSize;
    const gy = worldY / this.tileSize;

    // Cellules adjacentes
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    // Facteurs d'interpolation
    const fx = gx - x0;
    const fy = gy - y0;

    // Récupérer les directions des 4 cellules
    const d00 = this.getSafeDirection(x0, y0);
    const d10 = this.getSafeDirection(x1, y0);
    const d01 = this.getSafeDirection(x0, y1);
    const d11 = this.getSafeDirection(x1, y1);

    // Interpolation bilinéaire
    const dx = d00.x * (1 - fx) * (1 - fy) +
               d10.x * fx * (1 - fy) +
               d01.x * (1 - fx) * fy +
               d11.x * fx * fy;

    const dy = d00.y * (1 - fx) * (1 - fy) +
               d10.y * fx * (1 - fy) +
               d01.y * (1 - fx) * fy +
               d11.y * fx * fy;

    // Renormaliser
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0.001) {
      return { x: dx / length, y: dy / length };
    }

    return { x: 0, y: 0 };
  }

  /**
   * Récupère une direction avec bounds checking
   */
  private getSafeDirection(gridX: number, gridY: number): FlowDirection {
    if (!this.isValidTile(gridX, gridY)) {
      return { x: 0, y: 0 };
    }
    return this.flowMap[gridY][gridX];
  }

  /**
   * Récupère le coût pour atteindre la cible depuis une position
   */
  public getCost(worldX: number, worldY: number): number {
    const gridX = Math.floor(worldX / this.tileSize);
    const gridY = Math.floor(worldY / this.tileSize);

    if (!this.isValidTile(gridX, gridY)) {
      return INFINITY_COST;
    }

    return this.integrationMap[gridY][gridX];
  }

  /**
   * Vérifie si le flow field est valide
   */
  public isFieldValid(): boolean {
    return this.isValid;
  }

  /**
   * Invalide le flow field (force le recalcul)
   */
  public invalidate(): void {
    this.isValid = false;
    this.computeState = null;
  }

  /**
   * Récupère le timestamp de la dernière mise à jour
   */
  public getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  /**
   * Récupère la position de la cible actuelle (grille)
   */
  public getTarget(): { x: number; y: number } {
    return { x: this.targetGridX, y: this.targetGridY };
  }

  /**
   * Récupère les dimensions de la grille
   */
  public getGridSize(): { width: number; height: number } {
    return { width: this.gridWidth, height: this.gridHeight };
  }

  /**
   * Debug: récupère la flow map complète
   */
  public getFlowMap(): FlowDirection[][] {
    return this.flowMap;
  }

  /**
   * Debug: récupère l'integration map complète
   */
  public getIntegrationMap(): number[][] {
    return this.integrationMap;
  }
}
