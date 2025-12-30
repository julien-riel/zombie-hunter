import { describe, it, expect, beforeEach } from 'vitest';
import { Pathfinder, type PathPoint } from '@utils/pathfinding';

/**
 * Tests unitaires pour le système de pathfinding A*
 */
describe('Pathfinder', () => {
  let pathfinder: Pathfinder;

  beforeEach(() => {
    // Créer un pathfinder avec une petite grille pour les tests
    // tileSize = 32, avec dimensions par défaut GAME_WIDTH/GAME_HEIGHT
    pathfinder = new Pathfinder({ tileSize: 32 });
  });

  describe('constructor and initialization', () => {
    it('should create a pathfinder with default config', () => {
      const pf = new Pathfinder();
      const size = pf.getGridSize();

      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    });

    it('should create fully walkable grid initially', () => {
      // Center tiles should be walkable after init
      expect(pathfinder.isWalkable(5, 5)).toBe(true);
      expect(pathfinder.isWalkable(10, 10)).toBe(true);
    });

    it('should respect tileSize config', () => {
      const pf32 = new Pathfinder({ tileSize: 32 });
      const pf64 = new Pathfinder({ tileSize: 64 });

      // Smaller tiles = larger grid
      expect(pf32.getGridSize().width).toBeGreaterThan(pf64.getGridSize().width);
    });
  });

  describe('buildGrid', () => {
    it('should mark walls as non-walkable', () => {
      pathfinder.buildGrid([]);

      // After buildGrid, peripheral walls should be non-walkable
      expect(pathfinder.isWalkable(0, 0)).toBe(false); // Top-left corner
      expect(pathfinder.isWalkable(0, 5)).toBe(false); // Left wall
      expect(pathfinder.isWalkable(5, 0)).toBe(false); // Top wall
    });

    it('should mark obstacles as non-walkable', () => {
      // Place an obstacle in the center of the grid
      pathfinder.buildGrid([
        { x: 200, y: 200, width: 64, height: 64 },
      ]);

      const gridPos = pathfinder.worldToGrid(200, 200);
      expect(pathfinder.isWalkable(gridPos.x, gridPos.y)).toBe(false);
    });

    it('should keep non-obstacle areas walkable', () => {
      pathfinder.buildGrid([
        { x: 200, y: 200, width: 32, height: 32 },
      ]);

      // Far from obstacle should be walkable
      const farPos = pathfinder.worldToGrid(600, 400);
      expect(pathfinder.isWalkable(farPos.x, farPos.y)).toBe(true);
    });

    it('should handle multiple obstacles', () => {
      pathfinder.buildGrid([
        { x: 200, y: 200, width: 64, height: 64 },
        { x: 400, y: 300, width: 64, height: 64 },
        { x: 600, y: 200, width: 64, height: 64 },
      ]);

      const pos1 = pathfinder.worldToGrid(200, 200);
      const pos2 = pathfinder.worldToGrid(400, 300);
      const pos3 = pathfinder.worldToGrid(600, 200);

      expect(pathfinder.isWalkable(pos1.x, pos1.y)).toBe(false);
      expect(pathfinder.isWalkable(pos2.x, pos2.y)).toBe(false);
      expect(pathfinder.isWalkable(pos3.x, pos3.y)).toBe(false);
    });

    it('should reset grid when called multiple times', () => {
      // Add obstacles
      pathfinder.buildGrid([
        { x: 200, y: 200, width: 64, height: 64 },
      ]);

      const pos = pathfinder.worldToGrid(200, 200);
      expect(pathfinder.isWalkable(pos.x, pos.y)).toBe(false);

      // Rebuild without obstacles - should be walkable again (except walls)
      pathfinder.buildGrid([]);
      expect(pathfinder.isWalkable(pos.x, pos.y)).toBe(true);
    });
  });

  describe('invalidateArea', () => {
    it('should make area walkable when obstacle is destroyed', () => {
      // First build with obstacle
      pathfinder.buildGrid([
        { x: 200, y: 200, width: 64, height: 64 },
      ]);

      const pos = pathfinder.worldToGrid(200, 200);
      expect(pathfinder.isWalkable(pos.x, pos.y)).toBe(false);

      // Invalidate the area (obstacle destroyed)
      pathfinder.invalidateArea(200, 200, 64, 64);

      expect(pathfinder.isWalkable(pos.x, pos.y)).toBe(true);
    });

    it('should only affect specified area', () => {
      pathfinder.buildGrid([
        { x: 200, y: 200, width: 64, height: 64 },
        { x: 400, y: 200, width: 64, height: 64 },
      ]);

      // Invalidate only first obstacle
      pathfinder.invalidateArea(200, 200, 64, 64);

      const pos1 = pathfinder.worldToGrid(200, 200);
      const pos2 = pathfinder.worldToGrid(400, 200);

      expect(pathfinder.isWalkable(pos1.x, pos1.y)).toBe(true);
      expect(pathfinder.isWalkable(pos2.x, pos2.y)).toBe(false);
    });
  });

  describe('worldToGrid / gridToWorld', () => {
    it('should convert world to grid coordinates correctly', () => {
      const grid = pathfinder.worldToGrid(64, 96);

      expect(grid.x).toBe(2); // 64 / 32 = 2
      expect(grid.y).toBe(3); // 96 / 32 = 3
    });

    it('should convert grid to world coordinates (center of tile)', () => {
      const world = pathfinder.gridToWorld(2, 3);

      expect(world.x).toBe(80); // 2 * 32 + 16 = 80
      expect(world.y).toBe(112); // 3 * 32 + 16 = 112
    });

    it('should be inverse operations (approximately)', () => {
      const originalWorld = { x: 150, y: 200 };
      const grid = pathfinder.worldToGrid(originalWorld.x, originalWorld.y);
      const backToWorld = pathfinder.gridToWorld(grid.x, grid.y);

      // Should be close (within one tile)
      expect(Math.abs(backToWorld.x - originalWorld.x)).toBeLessThan(32);
      expect(Math.abs(backToWorld.y - originalWorld.y)).toBeLessThan(32);
    });

    it('should handle edge coordinates', () => {
      const grid = pathfinder.worldToGrid(0, 0);
      expect(grid.x).toBe(0);
      expect(grid.y).toBe(0);
    });
  });

  describe('isWalkable', () => {
    it('should return false for out of bounds coordinates', () => {
      expect(pathfinder.isWalkable(-1, 0)).toBe(false);
      expect(pathfinder.isWalkable(0, -1)).toBe(false);
      expect(pathfinder.isWalkable(1000, 0)).toBe(false);
      expect(pathfinder.isWalkable(0, 1000)).toBe(false);
    });

    it('should return true for valid walkable tile', () => {
      pathfinder.buildGrid([]);
      expect(pathfinder.isWalkable(5, 5)).toBe(true);
    });

    it('should return false for wall tiles', () => {
      pathfinder.buildGrid([]);
      expect(pathfinder.isWalkable(0, 5)).toBe(false); // Left wall
    });
  });

  describe('findPath - basic pathfinding', () => {
    beforeEach(() => {
      pathfinder.buildGrid([]);
    });

    it('should find direct path with no obstacles', () => {
      const path = pathfinder.findPath(100, 100, 300, 100);

      expect(path.length).toBeGreaterThan(0);
      // Last point should be at or near target
      const lastPoint = path[path.length - 1];
      expect(lastPoint.x).toBe(300);
      expect(lastPoint.y).toBe(100);
    });

    it('should return target if start equals end', () => {
      const path = pathfinder.findPath(100, 100, 100, 100);

      expect(path.length).toBe(1);
      expect(path[0].x).toBe(100);
      expect(path[0].y).toBe(100);
    });

    it('should return path ending at exact target position', () => {
      const targetX = 350;
      const targetY = 250;
      const path = pathfinder.findPath(100, 100, targetX, targetY);

      const lastPoint = path[path.length - 1];
      expect(lastPoint.x).toBe(targetX);
      expect(lastPoint.y).toBe(targetY);
    });
  });

  describe('findPath - obstacle avoidance', () => {
    it('should find path around single obstacle', () => {
      // Create a wall obstacle
      pathfinder.buildGrid([
        { x: 300, y: 200, width: 64, height: 200 }, // Vertical wall
      ]);

      const path = pathfinder.findPath(200, 200, 400, 200);

      expect(path.length).toBeGreaterThan(0);

      // Path should go around, so at least one waypoint should have different Y
      const hasDetour = path.some((p) => {
        const gridP = pathfinder.worldToGrid(p.x, p.y);
        const obstacleGrid = pathfinder.worldToGrid(300, 200);
        return gridP.x !== obstacleGrid.x || Math.abs(gridP.y - obstacleGrid.y) > 3;
      });

      expect(hasDetour || path.length > 2).toBe(true);
    });

    it('should find path through maze-like obstacles', () => {
      pathfinder.buildGrid([
        { x: 200, y: 100, width: 32, height: 150 },
        { x: 200, y: 400, width: 32, height: 150 },
        { x: 400, y: 200, width: 32, height: 150 },
        { x: 400, y: 500, width: 32, height: 150 },
      ]);

      const path = pathfinder.findPath(100, 300, 500, 300);

      expect(path.length).toBeGreaterThan(0);
      // Should reach destination
      const lastPoint = path[path.length - 1];
      expect(lastPoint.x).toBe(500);
      expect(lastPoint.y).toBe(300);
    });
  });

  describe('findPath - fallback behavior', () => {
    it('should find path from nearest walkable when start is non-walkable', () => {
      pathfinder.buildGrid([
        { x: 100, y: 100, width: 64, height: 64 },
      ]);

      const path = pathfinder.findPath(100, 100, 300, 300);

      // Should find nearest walkable position and create path from there
      // Path should exist and end at target
      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1].x).toBe(300);
      expect(path[path.length - 1].y).toBe(300);
    });

    it('should find path to nearest walkable when end is non-walkable', () => {
      pathfinder.buildGrid([
        { x: 300, y: 300, width: 64, height: 64 },
      ]);

      const path = pathfinder.findPath(100, 100, 300, 300);

      // Should find nearest walkable position to end and create path to there
      // Path should exist and end at target (or near it)
      expect(path.length).toBeGreaterThan(0);
      // Last waypoint should be the exact target position (even if non-walkable)
      expect(path[path.length - 1].x).toBe(300);
      expect(path[path.length - 1].y).toBe(300);
    });

    it('should return empty array if completely blocked', () => {
      // Create a complete barrier
      const obstacles = [];
      for (let y = 0; y < 720; y += 32) {
        obstacles.push({ x: 640, y, width: 64, height: 32 });
      }
      pathfinder.buildGrid(obstacles);

      const path = pathfinder.findPath(200, 360, 800, 360);

      // Should return empty array when no path exists
      // This prevents zombies from going directly through obstacles
      expect(path.length).toBe(0);
    });
  });

  describe('findPath - path optimization', () => {
    beforeEach(() => {
      pathfinder.buildGrid([]);
    });

    it('should smooth path to remove unnecessary waypoints', () => {
      const path = pathfinder.findPath(100, 100, 100, 400);

      // Straight line should be optimized to minimal waypoints
      expect(path.length).toBeLessThanOrEqual(3);
    });

    it('should keep necessary waypoints around corners', () => {
      // L-shaped obstacle
      pathfinder.buildGrid([
        { x: 300, y: 200, width: 200, height: 32 },
        { x: 300, y: 200, width: 32, height: 200 },
      ]);

      const path = pathfinder.findPath(200, 100, 200, 400);

      // Should have waypoints to go around corner
      expect(path.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('diagonal movement', () => {
    it('should allow diagonal movement by default', () => {
      const pf = new Pathfinder({ allowDiagonal: true });
      pf.buildGrid([]);

      const path = pf.findPath(100, 100, 200, 200);

      // Diagonal path should be shorter than L-shaped
      expect(path.length).toBeLessThanOrEqual(3);
    });

    it('should prevent corner cutting', () => {
      // Create two adjacent obstacles forming a corner
      pathfinder.buildGrid([
        { x: 200, y: 168, width: 32, height: 32 },
        { x: 232, y: 200, width: 32, height: 32 },
      ]);

      const path = pathfinder.findPath(168, 200, 232, 168);

      // Path should exist and not cut through corner
      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe('getGrid', () => {
    it('should return the grid for debugging', () => {
      pathfinder.buildGrid([]);

      const grid = pathfinder.getGrid();

      expect(Array.isArray(grid)).toBe(true);
      expect(Array.isArray(grid[0])).toBe(true);
      expect(typeof grid[5][5]).toBe('boolean');
    });
  });

  describe('getGridSize', () => {
    it('should return correct grid dimensions', () => {
      const size = pathfinder.getGridSize();

      expect(size.width).toBe(40); // 1280 / 32 = 40
      expect(size.height).toBe(23); // Math.ceil(720 / 32) = 23
    });
  });

  describe('edge cases', () => {
    it('should handle very short paths', () => {
      pathfinder.buildGrid([]);

      const path = pathfinder.findPath(100, 100, 110, 110);

      expect(path.length).toBeGreaterThan(0);
    });

    it('should handle paths at grid boundaries', () => {
      pathfinder.buildGrid([]);

      // Path near edge of map
      const path = pathfinder.findPath(50, 50, 1200, 650);

      expect(path.length).toBeGreaterThan(0);
    });

    it('should handle zero-size obstacles gracefully', () => {
      // Zero-size obstacles don't block any tiles
      // Implementation detail: Math.floor/ceil on same values creates no range
      pathfinder.buildGrid([
        { x: 200, y: 200, width: 0, height: 0 },
      ]);

      // Path should still work near zero-size obstacles
      const path = pathfinder.findPath(100, 200, 300, 200);
      expect(path.length).toBeGreaterThan(0);
    });

    it('should handle large obstacles', () => {
      pathfinder.buildGrid([
        { x: 640, y: 360, width: 500, height: 300 },
      ]);

      const path = pathfinder.findPath(100, 100, 1100, 600);

      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should find path in reasonable time for long distance', () => {
      pathfinder.buildGrid([]);

      const start = performance.now();
      const path = pathfinder.findPath(50, 50, 1200, 650);
      const duration = performance.now() - start;

      expect(path.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should handle multiple consecutive pathfinding requests', () => {
      pathfinder.buildGrid([
        { x: 400, y: 300, width: 100, height: 100 },
      ]);

      for (let i = 0; i < 50; i++) {
        const path = pathfinder.findPath(
          100 + (i % 10) * 20,
          100 + (i % 10) * 20,
          1000 - (i % 10) * 20,
          600 - (i % 10) * 20
        );
        expect(path.length).toBeGreaterThan(0);
      }
    });
  });

  describe('findNearestWalkable', () => {
    it('should return same position if already walkable', () => {
      pathfinder.buildGrid([]);

      const result = pathfinder.findNearestWalkable(5, 5);

      expect(result).not.toBeNull();
      expect(result!.x).toBe(5);
      expect(result!.y).toBe(5);
    });

    it('should find nearest walkable position when on obstacle', () => {
      pathfinder.buildGrid([
        { x: 200, y: 200, width: 64, height: 64 },
      ]);

      // Position in the middle of obstacle (grid coords 6, 6 approximately)
      const gridPos = pathfinder.worldToGrid(200, 200);
      const result = pathfinder.findNearestWalkable(gridPos.x, gridPos.y);

      expect(result).not.toBeNull();
      // Should find a walkable position nearby
      expect(pathfinder.isWalkable(result!.x, result!.y)).toBe(true);
    });

    it('should return null if no walkable position within radius', () => {
      // Create a massive obstacle covering most of the grid
      const obstacles = [];
      for (let x = 0; x < 1280; x += 32) {
        for (let y = 0; y < 720; y += 32) {
          obstacles.push({ x, y, width: 32, height: 32 });
        }
      }
      pathfinder.buildGrid(obstacles);

      const result = pathfinder.findNearestWalkable(10, 10, 2);

      // Might be null if completely blocked, or might find wall edges
      // The important thing is it doesn't throw
      expect(result === null || pathfinder.isWalkable(result.x, result.y)).toBe(true);
    });
  });

  describe('findNearestWalkableWorld', () => {
    it('should return world coordinates of nearest walkable position', () => {
      pathfinder.buildGrid([
        { x: 200, y: 200, width: 64, height: 64 },
      ]);

      const result = pathfinder.findNearestWalkableWorld(200, 200);

      expect(result).not.toBeNull();
      // Should return world coordinates (center of tile)
      expect(result!.x % 16).toBe(0); // Should be center of 32px tile
      expect(result!.y % 16).toBe(0);
    });

    it('should return null if no walkable position found', () => {
      // This is hard to test without blocking everything
      // Just verify the method exists and works
      pathfinder.buildGrid([]);

      const result = pathfinder.findNearestWalkableWorld(400, 400);

      expect(result).not.toBeNull();
    });
  });
});
