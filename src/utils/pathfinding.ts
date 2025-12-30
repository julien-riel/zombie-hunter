import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '@config/constants';

/**
 * Nœud pour l'algorithme A*
 */
interface PathNode {
  x: number;
  y: number;
  g: number; // Coût depuis le départ
  h: number; // Heuristique vers l'arrivée
  f: number; // g + h
  parent: PathNode | null;
}

/**
 * Point 2D simple
 */
export interface PathPoint {
  x: number;
  y: number;
}

/**
 * Configuration du pathfinder
 */
export interface PathfinderConfig {
  tileSize?: number;
  allowDiagonal?: boolean;
}

/**
 * Système de pathfinding A* pour la navigation des zombies
 * Utilise une grille précalculée basée sur TILE_SIZE
 */
export class Pathfinder {
  private grid: boolean[][]; // true = walkable
  private gridWidth: number;
  private gridHeight: number;
  private tileSize: number;
  private allowDiagonal: boolean;

  constructor(config: PathfinderConfig = {}) {
    this.tileSize = config.tileSize ?? TILE_SIZE;
    this.allowDiagonal = config.allowDiagonal ?? true;
    this.gridWidth = Math.ceil(GAME_WIDTH / this.tileSize);
    this.gridHeight = Math.ceil(GAME_HEIGHT / this.tileSize);

    // Initialiser la grille comme entièrement walkable
    this.grid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x] = true;
      }
    }
  }

  /**
   * Construit la grille de navigation à partir des données de collision
   * @param obstacles - Liste de rectangles d'obstacles {x, y, width, height}
   */
  public buildGrid(obstacles: { x: number; y: number; width: number; height: number }[]): void {
    // Réinitialiser la grille
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x] = true;
      }
    }

    // Marquer les murs périphériques comme non-walkable
    for (let x = 0; x < this.gridWidth; x++) {
      this.grid[0][x] = false; // Mur du haut
      this.grid[this.gridHeight - 1][x] = false; // Mur du bas
    }
    for (let y = 0; y < this.gridHeight; y++) {
      this.grid[y][0] = false; // Mur de gauche
      this.grid[y][this.gridWidth - 1] = false; // Mur de droite
    }

    // Marquer les obstacles
    for (const obstacle of obstacles) {
      this.markObstacle(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
  }

  /**
   * Marque une zone comme non-walkable
   */
  private markObstacle(worldX: number, worldY: number, width: number, height: number): void {
    // Convertir les coordonnées monde en coordonnées grille
    // L'obstacle est centré sur (worldX, worldY)
    const left = Math.floor((worldX - width / 2) / this.tileSize);
    const right = Math.ceil((worldX + width / 2) / this.tileSize);
    const top = Math.floor((worldY - height / 2) / this.tileSize);
    const bottom = Math.ceil((worldY + height / 2) / this.tileSize);

    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        if (this.isValidTile(x, y)) {
          this.grid[y][x] = false;
        }
      }
    }
  }

  /**
   * Invalide une zone (obstacle détruit)
   */
  public invalidateArea(worldX: number, worldY: number, width: number, height: number): void {
    const left = Math.floor((worldX - width / 2) / this.tileSize);
    const right = Math.ceil((worldX + width / 2) / this.tileSize);
    const top = Math.floor((worldY - height / 2) / this.tileSize);
    const bottom = Math.ceil((worldY + height / 2) / this.tileSize);

    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        if (this.isValidTile(x, y)) {
          this.grid[y][x] = true; // Rendre walkable
        }
      }
    }
  }

  /**
   * Vérifie si une tuile est valide
   */
  private isValidTile(x: number, y: number): boolean {
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
  }

  /**
   * Vérifie si une tuile est walkable
   */
  public isWalkable(gridX: number, gridY: number): boolean {
    if (!this.isValidTile(gridX, gridY)) return false;
    return this.grid[gridY][gridX];
  }

  /**
   * Convertit des coordonnées monde en coordonnées grille
   */
  public worldToGrid(worldX: number, worldY: number): PathPoint {
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize),
    };
  }

  /**
   * Convertit des coordonnées grille en coordonnées monde (centre de la tuile)
   */
  public gridToWorld(gridX: number, gridY: number): PathPoint {
    return {
      x: gridX * this.tileSize + this.tileSize / 2,
      y: gridY * this.tileSize + this.tileSize / 2,
    };
  }

  /**
   * Trouve un chemin entre deux points en coordonnées monde
   * @returns Liste de waypoints en coordonnées monde, ou tableau vide si pas de chemin
   */
  public findPath(startX: number, startY: number, endX: number, endY: number): PathPoint[] {
    const start = this.worldToGrid(startX, startY);
    const end = this.worldToGrid(endX, endY);

    // Si départ non walkable, chercher la case walkable la plus proche
    let actualStart = start;
    if (!this.isWalkable(start.x, start.y)) {
      const nearestStart = this.findNearestWalkable(start.x, start.y);
      if (!nearestStart) {
        return []; // Pas de case walkable proche, retourner vide
      }
      actualStart = nearestStart;
    }

    // Si arrivée non walkable, chercher la case walkable la plus proche de la destination
    let actualEnd = end;
    if (!this.isWalkable(end.x, end.y)) {
      const nearestEnd = this.findNearestWalkable(end.x, end.y);
      if (!nearestEnd) {
        return []; // Pas de case walkable proche, retourner vide
      }
      actualEnd = nearestEnd;
    }

    // Si même tuile, pas besoin de chemin
    if (actualStart.x === actualEnd.x && actualStart.y === actualEnd.y) {
      return [{ x: endX, y: endY }];
    }

    const openList: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      x: actualStart.x,
      y: actualStart.y,
      g: 0,
      h: this.heuristic(actualStart.x, actualStart.y, actualEnd.x, actualEnd.y),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openList.push(startNode);

    while (openList.length > 0) {
      // Trouver le nœud avec le plus petit f
      let lowestIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[lowestIndex].f) {
          lowestIndex = i;
        }
      }

      const current = openList[lowestIndex];

      // Arrivée atteinte
      if (current.x === actualEnd.x && current.y === actualEnd.y) {
        return this.reconstructPath(current, endX, endY);
      }

      // Déplacer current de open à closed
      openList.splice(lowestIndex, 1);
      closedSet.add(`${current.x},${current.y}`);

      // Explorer les voisins
      const neighbors = this.getNeighbors(current);

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(key)) continue;

        // Calculer le coût
        const isDiagonal = neighbor.x !== current.x && neighbor.y !== current.y;
        const moveCost = isDiagonal ? 1.414 : 1; // sqrt(2) pour diagonale
        const tentativeG = current.g + moveCost;

        // Chercher si le voisin est déjà dans openList
        const existingIndex = openList.findIndex((n) => n.x === neighbor.x && n.y === neighbor.y);

        if (existingIndex === -1) {
          // Nouveau nœud
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor.x, neighbor.y, actualEnd.x, actualEnd.y);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
          openList.push(neighbor);
        } else if (tentativeG < openList[existingIndex].g) {
          // Meilleur chemin trouvé
          openList[existingIndex].g = tentativeG;
          openList[existingIndex].f = tentativeG + openList[existingIndex].h;
          openList[existingIndex].parent = current;
        }
      }
    }

    // Pas de chemin trouvé - retourner tableau vide
    // Ne PAS retourner un chemin direct qui ignorerait les obstacles
    return [];
  }

  /**
   * Trouve la case walkable la plus proche d'une position donnée
   * Utilise une recherche en spirale (BFS)
   * @param gridX Position X en coordonnées grille
   * @param gridY Position Y en coordonnées grille
   * @param maxRadius Rayon max de recherche (en tuiles)
   * @returns Position walkable ou null si aucune trouvée
   */
  public findNearestWalkable(gridX: number, gridY: number, maxRadius: number = 5): PathPoint | null {
    // Si déjà walkable, retourner la position
    if (this.isWalkable(gridX, gridY)) {
      return { x: gridX, y: gridY };
    }

    // Recherche en spirale (BFS)
    for (let radius = 1; radius <= maxRadius; radius++) {
      // Parcourir le périmètre du carré de rayon 'radius'
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Ne vérifier que le périmètre, pas l'intérieur
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

          const nx = gridX + dx;
          const ny = gridY + dy;

          if (this.isWalkable(nx, ny)) {
            return { x: nx, y: ny };
          }
        }
      }
    }

    return null;
  }

  /**
   * Trouve la position walkable la plus proche en coordonnées monde
   * @param worldX Position X en coordonnées monde
   * @param worldY Position Y en coordonnées monde
   * @returns Position monde de la case walkable la plus proche, ou null
   */
  public findNearestWalkableWorld(worldX: number, worldY: number): PathPoint | null {
    const gridPos = this.worldToGrid(worldX, worldY);
    const nearestGrid = this.findNearestWalkable(gridPos.x, gridPos.y);

    if (!nearestGrid) return null;

    return this.gridToWorld(nearestGrid.x, nearestGrid.y);
  }

  /**
   * Heuristique Manhattan (ou Euclidienne si diagonale autorisée)
   */
  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    if (this.allowDiagonal) {
      // Heuristique octile pour mouvement diagonal
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      return dx + dy + (1.414 - 2) * Math.min(dx, dy);
    }
    // Manhattan
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }

  /**
   * Retourne les voisins walkable d'un nœud
   */
  private getNeighbors(node: PathNode): PathNode[] {
    const neighbors: PathNode[] = [];
    const directions = [
      { dx: 0, dy: -1 }, // Haut
      { dx: 1, dy: 0 }, // Droite
      { dx: 0, dy: 1 }, // Bas
      { dx: -1, dy: 0 }, // Gauche
    ];

    if (this.allowDiagonal) {
      directions.push(
        { dx: 1, dy: -1 }, // Haut-droite
        { dx: 1, dy: 1 }, // Bas-droite
        { dx: -1, dy: 1 }, // Bas-gauche
        { dx: -1, dy: -1 } // Haut-gauche
      );
    }

    for (const dir of directions) {
      const nx = node.x + dir.dx;
      const ny = node.y + dir.dy;

      if (this.isWalkable(nx, ny)) {
        // Pour les mouvements diagonaux, vérifier que les cases adjacentes sont aussi walkable
        // (éviter de couper les coins)
        if (dir.dx !== 0 && dir.dy !== 0) {
          if (
            !this.isWalkable(node.x + dir.dx, node.y) ||
            !this.isWalkable(node.x, node.y + dir.dy)
          ) {
            continue;
          }
        }

        neighbors.push({
          x: nx,
          y: ny,
          g: 0,
          h: 0,
          f: 0,
          parent: null,
        });
      }
    }

    return neighbors;
  }

  /**
   * Reconstruit le chemin depuis le nœud final
   */
  private reconstructPath(endNode: PathNode, finalX: number, finalY: number): PathPoint[] {
    const path: PathPoint[] = [];
    let current: PathNode | null = endNode;

    while (current !== null) {
      const worldPos = this.gridToWorld(current.x, current.y);
      path.unshift(worldPos);
      current = current.parent;
    }

    // Remplacer le dernier waypoint par la position exacte de la cible
    if (path.length > 0) {
      path[path.length - 1] = { x: finalX, y: finalY };
    }

    // Optimiser le chemin en supprimant les waypoints inutiles (ligne de vue directe)
    return this.smoothPath(path);
  }

  /**
   * Lisse le chemin en supprimant les waypoints intermédiaires inutiles
   */
  private smoothPath(path: PathPoint[]): PathPoint[] {
    if (path.length <= 2) return path;

    const smoothed: PathPoint[] = [path[0]];
    let current = 0;

    while (current < path.length - 1) {
      let furthest = current + 1;

      // Trouver le point le plus éloigné avec ligne de vue directe
      for (let i = current + 2; i < path.length; i++) {
        if (this.hasLineOfSight(path[current], path[i])) {
          furthest = i;
        }
      }

      smoothed.push(path[furthest]);
      current = furthest;
    }

    return smoothed;
  }

  /**
   * Vérifie s'il y a une ligne de vue directe entre deux points
   */
  private hasLineOfSight(from: PathPoint, to: PathPoint): boolean {
    const fromGrid = this.worldToGrid(from.x, from.y);
    const toGrid = this.worldToGrid(to.x, to.y);

    // Algorithme de Bresenham
    let x0 = fromGrid.x;
    let y0 = fromGrid.y;
    const x1 = toGrid.x;
    const y1 = toGrid.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (!this.isWalkable(x0, y0)) return false;

      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }

    return true;
  }

  /**
   * Retourne les dimensions de la grille
   */
  public getGridSize(): { width: number; height: number } {
    return { width: this.gridWidth, height: this.gridHeight };
  }

  /**
   * Debug: retourne la grille pour visualisation
   */
  public getGrid(): boolean[][] {
    return this.grid;
  }
}
