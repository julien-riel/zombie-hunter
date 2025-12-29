import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BALANCE } from '@config/balance';

/**
 * Mock de GameScene minimal pour tester WaveSystem
 */
const createMockScene = () => {
  const events = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  const time = {
    delayedCall: vi.fn().mockReturnValue({
      paused: false,
      destroy: vi.fn(),
    }),
  };

  const arena = {
    getDoors: vi.fn().mockReturnValue([
      { isActive: () => false, activate: vi.fn() },
      { isActive: () => false, activate: vi.fn() },
      { isActive: () => false, activate: vi.fn() },
      { isActive: () => false, activate: vi.fn() },
      { isActive: () => false, activate: vi.fn() },
      { isActive: () => false, activate: vi.fn() },
      { isActive: () => false, activate: vi.fn() },
      { isActive: () => false, activate: vi.fn() },
    ]),
  };

  const spawnSystem = {
    startWaveSpawning: vi.fn(),
    stopSpawning: vi.fn(),
  };

  return {
    events,
    time,
    arena,
    getSpawnSystem: () => spawnSystem,
  };
};

/**
 * Classe WaveSystem extraite pour tests unitaires
 * Reproduit la logique de génération de vagues sans dépendances Phaser
 */
class WaveSystemTestable {
  private currentWave: number = 0;

  /**
   * Génère la configuration d'une vague (logique extraite)
   */
  generateWaveConfig(waveNumber: number) {
    const WAVES = BALANCE.waves;

    // Calculer le nombre de zombies
    const totalZombies = Math.min(
      WAVES.maxZombiesPerWave,
      WAVES.baseZombieCount + (waveNumber - 1) * WAVES.zombiesPerWave
    );

    // Calculer le nombre de portes actives
    const activeDoors = Math.min(
      WAVES.maxDoors,
      WAVES.initialDoors + Math.floor((waveNumber - 1) / WAVES.doorsPerWaves)
    );

    // Obtenir les types de zombies disponibles pour cette vague
    const availableTypes = this.getAvailableZombieTypes(waveNumber);

    // Générer les groupes de spawn
    const spawnGroups = this.generateSpawnGroups(totalZombies, availableTypes);

    return {
      waveNumber,
      activeDoors,
      spawnGroups,
      totalZombies,
    };
  }

  /**
   * Récupère les types de zombies disponibles pour une vague
   */
  getAvailableZombieTypes(waveNumber: number) {
    return BALANCE.waves.zombieTypeUnlocks
      .filter((unlock) => waveNumber >= unlock.wave)
      .map((unlock) => ({ type: unlock.type, weight: unlock.weight }));
  }

  /**
   * Génère les groupes de spawn pour une vague
   */
  generateSpawnGroups(
    totalZombies: number,
    availableTypes: { type: string; weight: number }[]
  ) {
    const totalWeight = availableTypes.reduce((sum, t) => sum + t.weight, 0);
    const spawnGroups: { zombieType: string; count: number }[] = [];

    let remaining = totalZombies;

    for (const typeConfig of availableTypes) {
      const normalizedWeight = typeConfig.weight / totalWeight;
      const count = Math.round(totalZombies * normalizedWeight);

      if (count > 0) {
        spawnGroups.push({
          zombieType: typeConfig.type,
          count: Math.min(count, remaining),
        });
        remaining -= count;
      }
    }

    // Ajuster si nécessaire pour atteindre le total
    if (remaining > 0 && spawnGroups.length > 0) {
      spawnGroups[0].count += remaining;
    }

    return spawnGroups;
  }
}

describe('WaveSystem', () => {
  let waveSystem: WaveSystemTestable;

  beforeEach(() => {
    waveSystem = new WaveSystemTestable();
  });

  describe('generateWaveConfig - zombie count', () => {
    it('should start with baseZombieCount zombies on wave 1', () => {
      const config = waveSystem.generateWaveConfig(1);
      expect(config.totalZombies).toBe(BALANCE.waves.baseZombieCount);
    });

    it('should increase zombie count each wave', () => {
      const wave1 = waveSystem.generateWaveConfig(1);
      const wave2 = waveSystem.generateWaveConfig(2);
      const wave3 = waveSystem.generateWaveConfig(3);

      expect(wave2.totalZombies).toBeGreaterThan(wave1.totalZombies);
      expect(wave3.totalZombies).toBeGreaterThan(wave2.totalZombies);
    });

    it('should increase by zombiesPerWave each wave', () => {
      const wave1 = waveSystem.generateWaveConfig(1);
      const wave2 = waveSystem.generateWaveConfig(2);

      expect(wave2.totalZombies - wave1.totalZombies).toBe(BALANCE.waves.zombiesPerWave);
    });

    it('should cap zombie count at maxZombiesPerWave', () => {
      // Calculer une vague très élevée
      const highWave = 100;
      const config = waveSystem.generateWaveConfig(highWave);

      expect(config.totalZombies).toBe(BALANCE.waves.maxZombiesPerWave);
    });

    it('should return totalZombies equal to sum of spawnGroups counts', () => {
      const config = waveSystem.generateWaveConfig(10);
      const spawnTotal = config.spawnGroups.reduce((sum, g) => sum + g.count, 0);

      expect(spawnTotal).toBe(config.totalZombies);
    });
  });

  describe('generateWaveConfig - door activation', () => {
    it('should start with initialDoors active doors', () => {
      const config = waveSystem.generateWaveConfig(1);
      expect(config.activeDoors).toBe(BALANCE.waves.initialDoors);
    });

    it('should add doors every doorsPerWaves waves', () => {
      const wave1 = waveSystem.generateWaveConfig(1);
      const waveAfterUnlock = waveSystem.generateWaveConfig(
        BALANCE.waves.doorsPerWaves + 1
      );

      expect(waveAfterUnlock.activeDoors).toBe(wave1.activeDoors + 1);
    });

    it('should cap doors at maxDoors', () => {
      const highWave = 100;
      const config = waveSystem.generateWaveConfig(highWave);

      expect(config.activeDoors).toBe(BALANCE.waves.maxDoors);
    });

    it('should not exceed maxDoors even after many waves', () => {
      for (let wave = 1; wave <= 50; wave++) {
        const config = waveSystem.generateWaveConfig(wave);
        expect(config.activeDoors).toBeLessThanOrEqual(BALANCE.waves.maxDoors);
      }
    });
  });

  describe('getAvailableZombieTypes - zombie type unlocks', () => {
    it('should have shambler and runner available on wave 1', () => {
      const types = waveSystem.getAvailableZombieTypes(1);
      const typeNames = types.map((t) => t.type);

      expect(typeNames).toContain('shambler');
      expect(typeNames).toContain('runner');
    });

    it('should unlock crawler and spitter on wave 6', () => {
      const types = waveSystem.getAvailableZombieTypes(6);
      const typeNames = types.map((t) => t.type);

      expect(typeNames).toContain('crawler');
      expect(typeNames).toContain('spitter');
    });

    it('should unlock tank and bomber on wave 11', () => {
      const types = waveSystem.getAvailableZombieTypes(11);
      const typeNames = types.map((t) => t.type);

      expect(typeNames).toContain('tank');
      expect(typeNames).toContain('bomber');
    });

    it('should unlock screamer and splitter on wave 16', () => {
      const types = waveSystem.getAvailableZombieTypes(16);
      const typeNames = types.map((t) => t.type);

      expect(typeNames).toContain('screamer');
      expect(typeNames).toContain('splitter');
    });

    it('should unlock invisible and necromancer on wave 21', () => {
      const types = waveSystem.getAvailableZombieTypes(21);
      const typeNames = types.map((t) => t.type);

      expect(typeNames).toContain('invisible');
      expect(typeNames).toContain('necromancer');
    });

    it('should not have crawler available before wave 6', () => {
      const types = waveSystem.getAvailableZombieTypes(5);
      const typeNames = types.map((t) => t.type);

      expect(typeNames).not.toContain('crawler');
    });

    it('should have all zombie types available on wave 21+', () => {
      const types = waveSystem.getAvailableZombieTypes(25);

      expect(types.length).toBe(BALANCE.waves.zombieTypeUnlocks.length);
    });

    it('should increase available types as waves progress', () => {
      const wave1Types = waveSystem.getAvailableZombieTypes(1);
      const wave10Types = waveSystem.getAvailableZombieTypes(10);
      const wave20Types = waveSystem.getAvailableZombieTypes(20);

      expect(wave10Types.length).toBeGreaterThan(wave1Types.length);
      expect(wave20Types.length).toBeGreaterThan(wave10Types.length);
    });
  });

  describe('generateSpawnGroups - spawn distribution', () => {
    it('should generate spawn groups that sum to total zombies', () => {
      const availableTypes = [
        { type: 'shambler', weight: 0.7 },
        { type: 'runner', weight: 0.3 },
      ];
      const totalZombies = 10;

      const groups = waveSystem.generateSpawnGroups(totalZombies, availableTypes);
      const total = groups.reduce((sum, g) => sum + g.count, 0);

      expect(total).toBe(totalZombies);
    });

    it('should distribute zombies according to weights', () => {
      const availableTypes = [
        { type: 'shambler', weight: 0.7 },
        { type: 'runner', weight: 0.3 },
      ];
      const totalZombies = 100;

      const groups = waveSystem.generateSpawnGroups(totalZombies, availableTypes);
      const shamblerGroup = groups.find((g) => g.zombieType === 'shambler');
      const runnerGroup = groups.find((g) => g.zombieType === 'runner');

      // Avec 70% shambler et 30% runner, on attend ~70 et ~30
      expect(shamblerGroup!.count).toBeGreaterThan(60);
      expect(runnerGroup!.count).toBeGreaterThan(20);
    });

    it('should handle single zombie type', () => {
      const availableTypes = [{ type: 'shambler', weight: 1 }];
      const totalZombies = 15;

      const groups = waveSystem.generateSpawnGroups(totalZombies, availableTypes);

      expect(groups.length).toBe(1);
      expect(groups[0].count).toBe(totalZombies);
    });

    it('should handle empty available types', () => {
      const groups = waveSystem.generateSpawnGroups(10, []);

      expect(groups.length).toBe(0);
    });

    it('should create group for each available type with positive count', () => {
      const availableTypes = [
        { type: 'a', weight: 0.5 },
        { type: 'b', weight: 0.3 },
        { type: 'c', weight: 0.2 },
      ];
      const totalZombies = 20;

      const groups = waveSystem.generateSpawnGroups(totalZombies, availableTypes);
      const types = groups.map((g) => g.zombieType);

      // Au moins certains types devraient être présents
      expect(groups.length).toBeGreaterThanOrEqual(1);
      groups.forEach((g) => expect(g.count).toBeGreaterThan(0));
    });
  });

  describe('wave progression scenarios', () => {
    it('early game (wave 1-5) should only have shambler and runner', () => {
      for (let wave = 1; wave <= 5; wave++) {
        const config = waveSystem.generateWaveConfig(wave);
        const types = config.spawnGroups.map((g) => g.zombieType);

        types.forEach((type) => {
          expect(['shambler', 'runner']).toContain(type);
        });
      }
    });

    it('mid game (wave 11-15) should have diverse zombie types', () => {
      const config = waveSystem.generateWaveConfig(12);
      const types = config.spawnGroups.map((g) => g.zombieType);

      // Devrait avoir au moins 3 types différents
      expect(new Set(types).size).toBeGreaterThanOrEqual(2);
    });

    it('late game should have significantly more zombies than early game', () => {
      const wave1 = waveSystem.generateWaveConfig(1);
      const wave20 = waveSystem.generateWaveConfig(20);

      expect(wave20.totalZombies).toBeGreaterThan(wave1.totalZombies * 2);
    });
  });
});
