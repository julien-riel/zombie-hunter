import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Mock de Phaser.GameObjects.Group pour tester PoolManager
 */
class MockGroup {
  private children: MockZombie[] = [];
  private maxSizeValue: number;

  constructor(config: { maxSize?: number } = {}) {
    this.maxSizeValue = config.maxSize ?? 100;
  }

  add(obj: MockZombie): void {
    this.children.push(obj);
  }

  getFirstDead(createIfNull: boolean): MockZombie | null {
    const dead = this.children.find((c) => !c.active);
    return dead ?? null;
  }

  getLength(): number {
    return this.children.length;
  }

  countActive(value: boolean): number {
    return this.children.filter((c) => c.active === value).length;
  }

  getChildren(): MockZombie[] {
    return this.children;
  }

  destroy(destroyChildren: boolean): void {
    if (destroyChildren) {
      this.children.forEach((c) => c.destroy());
    }
    this.children = [];
  }
}

/**
 * Mock de Zombie pour les tests
 */
class MockZombie {
  public active: boolean = true;
  public visible: boolean = true;
  public x: number;
  public y: number;
  public health: number = 100;
  public zombieType: string;

  constructor(scene: MockScene, x: number, y: number, type: string = 'shambler') {
    this.x = x;
    this.y = y;
    this.zombieType = type;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.active = true;
    this.visible = true;
    this.health = 100;
  }

  deactivate(): void {
    this.active = false;
    this.visible = false;
  }

  destroy(): void {
    this.active = false;
    this.visible = false;
  }
}

/**
 * Mock de GameScene
 */
class MockScene {
  public add = {
    group: (config: { maxSize?: number; runChildUpdate?: boolean }) =>
      new MockGroup(config),
  };
}

/**
 * Implémentation testable du PoolManager (sans dépendance Phaser)
 */
class PoolManagerTestable {
  private scene: MockScene;
  private zombiePools: Map<string, MockGroup>;
  private zombieConstructors: Map<string, new (scene: MockScene, x: number, y: number) => MockZombie>;
  private maxPoolSize: number;

  constructor(scene: MockScene, maxPoolSize: number = 100) {
    this.scene = scene;
    this.zombiePools = new Map();
    this.zombieConstructors = new Map();
    this.maxPoolSize = maxPoolSize;
  }

  registerZombiePool(
    zombieType: string,
    classType: new (scene: MockScene, x: number, y: number) => MockZombie,
    initialSize: number = 10
  ): void {
    if (this.zombiePools.has(zombieType)) {
      return;
    }

    this.zombieConstructors.set(zombieType, classType);

    const pool = this.scene.add.group({
      maxSize: this.maxPoolSize,
      runChildUpdate: false,
    });

    for (let i = 0; i < initialSize; i++) {
      const zombie = new classType(this.scene, 0, 0);
      zombie.deactivate();
      pool.add(zombie);
    }

    this.zombiePools.set(zombieType, pool);
  }

  getZombie(zombieType: string, x: number, y: number): MockZombie | null {
    const classType = this.zombieConstructors.get(zombieType);
    if (!classType) {
      return null;
    }

    let pool = this.zombiePools.get(zombieType);

    if (!pool) {
      this.registerZombiePool(zombieType, classType, 5);
      pool = this.zombiePools.get(zombieType)!;
    }

    const zombie = pool.getFirstDead(false);

    if (zombie) {
      zombie.reset(x, y);
      return zombie;
    }

    if (pool.getLength() < this.maxPoolSize) {
      const constructor = this.zombieConstructors.get(zombieType);
      if (constructor) {
        const newZombie = new constructor(this.scene, x, y);
        pool.add(newZombie);
        return newZombie;
      }
    }

    return null;
  }

  releaseZombie(zombie: MockZombie): void {
    zombie.deactivate();
  }

  getZombieGroup(zombieType: string): MockGroup | undefined {
    return this.zombiePools.get(zombieType);
  }

  getAllZombieGroups(): MockGroup[] {
    return Array.from(this.zombiePools.values());
  }

  getActiveZombieCount(): number {
    let count = 0;
    for (const pool of this.zombiePools.values()) {
      count += pool.countActive(true);
    }
    return count;
  }

  getActiveZombies(): MockZombie[] {
    const activeZombies: MockZombie[] = [];
    for (const pool of this.zombiePools.values()) {
      const children = pool.getChildren();
      for (const zombie of children) {
        if (zombie.active) {
          activeZombies.push(zombie);
        }
      }
    }
    return activeZombies;
  }

  releaseAllZombies(): void {
    for (const pool of this.zombiePools.values()) {
      const children = pool.getChildren();
      for (const zombie of children) {
        if (zombie.active) {
          zombie.deactivate();
        }
      }
    }
  }

  getPoolSize(zombieType: string): number {
    const pool = this.zombiePools.get(zombieType);
    return pool ? pool.getLength() : 0;
  }

  destroy(): void {
    for (const pool of this.zombiePools.values()) {
      pool.destroy(true);
    }
    this.zombiePools.clear();
    this.zombieConstructors.clear();
  }
}

describe('PoolManager', () => {
  let poolManager: PoolManagerTestable;
  let mockScene: MockScene;

  beforeEach(() => {
    mockScene = new MockScene();
    poolManager = new PoolManagerTestable(mockScene, 20);
  });

  describe('registerZombiePool', () => {
    it('should create a pool with initial zombies', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);

      const pool = poolManager.getZombieGroup('shambler');
      expect(pool).toBeDefined();
      expect(pool!.getLength()).toBe(5);
    });

    it('should create inactive zombies in initial pool', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);

      const pool = poolManager.getZombieGroup('shambler');
      expect(pool!.countActive(true)).toBe(0);
      expect(pool!.countActive(false)).toBe(5);
    });

    it('should not create duplicate pools for same type', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);
      poolManager.registerZombiePool('shambler', MockZombie, 10);

      const pool = poolManager.getZombieGroup('shambler');
      expect(pool!.getLength()).toBe(5); // Should remain 5, not 10
    });

    it('should support multiple zombie types', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);
      poolManager.registerZombiePool('runner', MockZombie, 3);

      expect(poolManager.getZombieGroup('shambler')).toBeDefined();
      expect(poolManager.getZombieGroup('runner')).toBeDefined();
      expect(poolManager.getAllZombieGroups().length).toBe(2);
    });
  });

  describe('getZombie', () => {
    beforeEach(() => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);
    });

    it('should return inactive zombie from pool', () => {
      const zombie = poolManager.getZombie('shambler', 100, 200);

      expect(zombie).not.toBeNull();
      expect(zombie!.active).toBe(true);
      expect(zombie!.x).toBe(100);
      expect(zombie!.y).toBe(200);
    });

    it('should properly reset zombie state on reuse', () => {
      const zombie1 = poolManager.getZombie('shambler', 100, 200);
      zombie1!.health = 50; // Simulate damage
      poolManager.releaseZombie(zombie1!);

      const zombie2 = poolManager.getZombie('shambler', 300, 400);

      expect(zombie2).toBe(zombie1); // Should be same object
      expect(zombie2!.x).toBe(300);
      expect(zombie2!.y).toBe(400);
      expect(zombie2!.active).toBe(true);
      expect(zombie2!.health).toBe(100); // Health should be reset
    });

    it('should create new zombie if pool is empty', () => {
      // Get all 5 initial zombies
      for (let i = 0; i < 5; i++) {
        poolManager.getZombie('shambler', i * 10, 0);
      }

      // Get 6th zombie - should create new one
      const zombie = poolManager.getZombie('shambler', 500, 500);

      expect(zombie).not.toBeNull();
      expect(poolManager.getPoolSize('shambler')).toBe(6);
    });

    it('should not exceed max pool size', () => {
      // Max pool size is 20 in this test
      for (let i = 0; i < 25; i++) {
        poolManager.getZombie('shambler', i * 10, 0);
      }

      // Try to get one more
      const zombie = poolManager.getZombie('shambler', 999, 999);

      expect(zombie).toBeNull();
      expect(poolManager.getPoolSize('shambler')).toBe(20);
    });

    it('should return null for unregistered zombie type', () => {
      const zombie = poolManager.getZombie('unknown', 100, 100);

      expect(zombie).toBeNull();
    });

    it('should auto-register pool if constructor is known but pool doesnt exist', () => {
      // First register to save the constructor
      poolManager.registerZombiePool('tank', MockZombie, 2);

      // Get zombies normally
      const zombie = poolManager.getZombie('tank', 50, 50);
      expect(zombie).not.toBeNull();
    });
  });

  describe('releaseZombie', () => {
    beforeEach(() => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);
    });

    it('should deactivate zombie when released', () => {
      const zombie = poolManager.getZombie('shambler', 100, 100);
      expect(zombie!.active).toBe(true);

      poolManager.releaseZombie(zombie!);

      expect(zombie!.active).toBe(false);
      expect(zombie!.visible).toBe(false);
    });

    it('should make zombie available for reuse', () => {
      // Get all zombies
      const zombies: MockZombie[] = [];
      for (let i = 0; i < 5; i++) {
        zombies.push(poolManager.getZombie('shambler', i * 10, 0)!);
      }

      expect(poolManager.getActiveZombieCount()).toBe(5);

      // Release one
      poolManager.releaseZombie(zombies[0]);

      expect(poolManager.getActiveZombieCount()).toBe(4);

      // Get new zombie - should be the released one
      const newZombie = poolManager.getZombie('shambler', 999, 999);
      expect(newZombie).toBe(zombies[0]);
    });
  });

  describe('getActiveZombieCount', () => {
    it('should return 0 for empty pools', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);

      expect(poolManager.getActiveZombieCount()).toBe(0);
    });

    it('should count active zombies correctly', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 10);

      poolManager.getZombie('shambler', 0, 0);
      poolManager.getZombie('shambler', 0, 0);
      poolManager.getZombie('shambler', 0, 0);

      expect(poolManager.getActiveZombieCount()).toBe(3);
    });

    it('should count across multiple pools', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);
      poolManager.registerZombiePool('runner', MockZombie, 5);

      poolManager.getZombie('shambler', 0, 0);
      poolManager.getZombie('shambler', 0, 0);
      poolManager.getZombie('runner', 0, 0);

      expect(poolManager.getActiveZombieCount()).toBe(3);
    });

    it('should update when zombies are released', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);

      const zombie = poolManager.getZombie('shambler', 0, 0);
      poolManager.getZombie('shambler', 0, 0);

      expect(poolManager.getActiveZombieCount()).toBe(2);

      poolManager.releaseZombie(zombie!);

      expect(poolManager.getActiveZombieCount()).toBe(1);
    });
  });

  describe('getActiveZombies', () => {
    it('should return empty array when no active zombies', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);

      const active = poolManager.getActiveZombies();

      expect(active).toEqual([]);
    });

    it('should return all active zombies', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);

      const zombie1 = poolManager.getZombie('shambler', 10, 10);
      const zombie2 = poolManager.getZombie('shambler', 20, 20);

      const active = poolManager.getActiveZombies();

      expect(active.length).toBe(2);
      expect(active).toContain(zombie1);
      expect(active).toContain(zombie2);
    });

    it('should not include released zombies', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);

      const zombie1 = poolManager.getZombie('shambler', 10, 10);
      const zombie2 = poolManager.getZombie('shambler', 20, 20);
      poolManager.releaseZombie(zombie1!);

      const active = poolManager.getActiveZombies();

      expect(active.length).toBe(1);
      expect(active).toContain(zombie2);
      expect(active).not.toContain(zombie1);
    });
  });

  describe('releaseAllZombies', () => {
    it('should deactivate all zombies across all pools', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);
      poolManager.registerZombiePool('runner', MockZombie, 5);

      poolManager.getZombie('shambler', 0, 0);
      poolManager.getZombie('shambler', 0, 0);
      poolManager.getZombie('runner', 0, 0);
      poolManager.getZombie('runner', 0, 0);
      poolManager.getZombie('runner', 0, 0);

      expect(poolManager.getActiveZombieCount()).toBe(5);

      poolManager.releaseAllZombies();

      expect(poolManager.getActiveZombieCount()).toBe(0);
    });

    it('should not affect pool structure', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);

      poolManager.getZombie('shambler', 0, 0);
      poolManager.getZombie('shambler', 0, 0);

      poolManager.releaseAllZombies();

      expect(poolManager.getPoolSize('shambler')).toBe(5);
      expect(poolManager.getAllZombieGroups().length).toBe(1);
    });
  });

  describe('destroy', () => {
    it('should clear all pools', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 5);
      poolManager.registerZombiePool('runner', MockZombie, 3);

      poolManager.destroy();

      expect(poolManager.getAllZombieGroups().length).toBe(0);
      expect(poolManager.getZombieGroup('shambler')).toBeUndefined();
      expect(poolManager.getZombieGroup('runner')).toBeUndefined();
    });
  });

  describe('performance scenarios', () => {
    it('should handle rapid get/release cycles', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 10);

      // Simulate rapid spawn/death cycle
      for (let cycle = 0; cycle < 100; cycle++) {
        const zombies: MockZombie[] = [];

        // Spawn 5 zombies
        for (let i = 0; i < 5; i++) {
          const z = poolManager.getZombie('shambler', i * 10, cycle);
          if (z) zombies.push(z);
        }

        // Release all
        zombies.forEach((z) => poolManager.releaseZombie(z));
      }

      // Pool should still work normally
      expect(poolManager.getPoolSize('shambler')).toBe(10);
      expect(poolManager.getActiveZombieCount()).toBe(0);
    });

    it('should reuse zombies efficiently', () => {
      poolManager.registerZombiePool('shambler', MockZombie, 3);

      // Get 3 zombies
      const z1 = poolManager.getZombie('shambler', 0, 0);
      const z2 = poolManager.getZombie('shambler', 0, 0);
      const z3 = poolManager.getZombie('shambler', 0, 0);

      // Release all
      poolManager.releaseZombie(z1!);
      poolManager.releaseZombie(z2!);
      poolManager.releaseZombie(z3!);

      // Get 3 more - should reuse existing
      const z4 = poolManager.getZombie('shambler', 0, 0);
      const z5 = poolManager.getZombie('shambler', 0, 0);
      const z6 = poolManager.getZombie('shambler', 0, 0);

      // Pool size should not have grown
      expect(poolManager.getPoolSize('shambler')).toBe(3);

      // Should have reused the same objects
      expect([z1, z2, z3]).toContain(z4);
      expect([z1, z2, z3]).toContain(z5);
      expect([z1, z2, z3]).toContain(z6);
    });
  });
});
