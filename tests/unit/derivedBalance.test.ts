import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateWeaponDerivedStats,
  calculateZombieDerivedStats,
  calculateTTK,
  calculateTTC,
  getDerivedWeaponStats,
  getDerivedZombieStats,
  clearDerivedStatsCache,
  validateBalance,
  generateBalanceReport,
  REFERENCE_DISTANCES,
  ZOMBIE_ROLES,
  BALANCE_VALIDATION,
} from '@config/derivedBalance';
import { BALANCE } from '@config/balance';

describe('derivedBalance', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearDerivedStatsCache();
  });

  describe('calculateWeaponDerivedStats', () => {
    it('should calculate pistol DPS correctly', () => {
      const stats = calculateWeaponDerivedStats('pistol');

      // Pistol: 10 damage, 250ms fire rate
      // Raw DPS = 10 / 0.25 = 40
      expect(stats.rawDPS).toBeCloseTo(40, 1);
    });

    it('should calculate sustained DPS with reload', () => {
      const stats = calculateWeaponDerivedStats('pistol');

      // Pistol: 12 shots, 250ms each, 1000ms reload
      // Time to empty: 12 * 250 = 3000ms
      // Cycle time: 3000 + 1000 = 4000ms
      // Damage per cycle: 12 * 10 = 120
      // Sustained DPS: 120 / 4 = 30
      expect(stats.timeToEmpty).toBe(3000);
      expect(stats.cycleTime).toBe(4000);
      expect(stats.damagePerCycle).toBe(120);
      expect(stats.sustainedDPS).toBeCloseTo(30, 1);
    });

    it('should handle shotgun pellet count', () => {
      const stats = calculateWeaponDerivedStats('shotgun');

      // Shotgun: 8 damage * 6 pellets = 48 damage per shot
      expect(stats.damagePerShot).toBe(48);

      // 48 damage / 0.8s = 60 raw DPS
      expect(stats.rawDPS).toBeCloseTo(60, 1);
    });

    it('should calculate SMG stats', () => {
      const stats = calculateWeaponDerivedStats('smg');

      // SMG: 6 damage, 100ms fire rate
      // Raw DPS = 6 / 0.1 = 60
      expect(stats.rawDPS).toBeCloseTo(60, 1);

      // 30 shots, 100ms each = 3000ms to empty
      expect(stats.timeToEmpty).toBe(3000);
    });

    it('should calculate sniper stats', () => {
      const stats = calculateWeaponDerivedStats('sniper');

      // Sniper: 80 damage, 1200ms fire rate
      // Raw DPS = 80 / 1.2 = 66.67
      expect(stats.rawDPS).toBeCloseTo(66.67, 1);
    });
  });

  describe('calculateTTK', () => {
    it('should calculate shambler TTK with pistol', () => {
      // Shambler: 30 HP, Pistol sustained DPS: ~30
      // TTK = 30 / 30 = 1s
      const ttk = calculateTTK('shambler', 'pistol');
      expect(ttk).toBeGreaterThan(0.5);
      expect(ttk).toBeLessThan(1.5);
    });

    it('should calculate tank TTK with pistol', () => {
      // Tank: 200 HP, requires multiple pistol cycles
      const ttk = calculateTTK('tank', 'pistol');
      expect(ttk).toBeGreaterThan(4);
      expect(ttk).toBeLessThan(10);
    });

    it('should show SMG is faster than pistol', () => {
      const ttkPistol = calculateTTK('shambler', 'pistol');
      const ttkSMG = calculateTTK('shambler', 'smg');

      // SMG has higher sustained DPS, so TTK should be lower
      expect(ttkSMG).toBeLessThan(ttkPistol);
    });

    it('should show sniper is effective against tanks', () => {
      const ttkPistol = calculateTTK('tank', 'pistol');
      const ttkSniper = calculateTTK('tank', 'sniper');

      // Sniper should kill tank faster than pistol
      expect(ttkSniper).toBeLessThan(ttkPistol);
    });
  });

  describe('calculateTTC', () => {
    it('should calculate shambler TTC from door', () => {
      // Shambler: 60 speed, door distance: 500
      // TTC = 500 / 60 = 8.33s
      const ttc = calculateTTC('shambler', REFERENCE_DISTANCES.door);
      expect(ttc).toBeCloseTo(8.33, 1);
    });

    it('should calculate runner TTC from door', () => {
      // Runner: 150 speed, door distance: 500
      // TTC = 500 / 150 = 3.33s
      const ttc = calculateTTC('runner', REFERENCE_DISTANCES.door);
      expect(ttc).toBeCloseTo(3.33, 1);
    });

    it('should show tank is slower than shambler', () => {
      const ttcShambler = calculateTTC('shambler', REFERENCE_DISTANCES.door);
      const ttcTank = calculateTTC('tank', REFERENCE_DISTANCES.door);

      expect(ttcTank).toBeGreaterThan(ttcShambler);
    });

    it('should handle different distances', () => {
      const ttcClose = calculateTTC('shambler', REFERENCE_DISTANCES.close);
      const ttcFar = calculateTTC('shambler', REFERENCE_DISTANCES.far);

      expect(ttcClose).toBeLessThan(ttcFar);
    });
  });

  describe('calculateZombieDerivedStats', () => {
    it('should calculate all TTKs for a zombie', () => {
      const stats = calculateZombieDerivedStats('shambler');

      expect(stats.TTKByWeapon).toHaveProperty('pistol');
      expect(stats.TTKByWeapon).toHaveProperty('shotgun');
      expect(stats.TTKByWeapon).toHaveProperty('smg');
      expect(stats.TTKByWeapon).toHaveProperty('sniper');
    });

    it('should calculate all TTCs for a zombie', () => {
      const stats = calculateZombieDerivedStats('shambler');

      expect(stats.TTC).toHaveProperty('close');
      expect(stats.TTC).toHaveProperty('medium');
      expect(stats.TTC).toHaveProperty('door');
      expect(stats.TTC).toHaveProperty('far');
    });

    it('should calculate received DPS', () => {
      const stats = calculateZombieDerivedStats('shambler');

      // Shambler: 10 damage, 1200ms cooldown
      // DPS = 10 / 1.2 = 8.33
      expect(stats.receivedDPS).toBeCloseTo(8.33, 1);
    });

    it('should calculate threat score', () => {
      const stats = calculateZombieDerivedStats('shambler');

      // Threat score should be positive
      expect(stats.threatScore).toBeGreaterThan(0);
    });

    it('should normalize costs relative to shambler', () => {
      const shamblerStats = calculateZombieDerivedStats('shambler');
      const runnerStats = calculateZombieDerivedStats('runner');
      const tankStats = calculateZombieDerivedStats('tank');

      // Shambler should have cost of 1
      expect(shamblerStats.cost).toBeCloseTo(1, 1);

      // Runner should cost more than shambler (faster = more threatening)
      expect(runnerStats.cost).toBeGreaterThan(shamblerStats.cost);

      // Tank should cost more than shambler (but not necessarily more than runner
      // because threat is based on speed and DPS, and tank is very slow)
      expect(tankStats.cost).toBeGreaterThan(shamblerStats.cost);
    });
  });

  describe('caching', () => {
    it('should cache weapon stats', () => {
      const stats1 = getDerivedWeaponStats('pistol');
      const stats2 = getDerivedWeaponStats('pistol');

      // Should be the exact same object
      expect(stats1).toBe(stats2);
    });

    it('should cache zombie stats', () => {
      const stats1 = getDerivedZombieStats('shambler');
      const stats2 = getDerivedZombieStats('shambler');

      // Should be the exact same object
      expect(stats1).toBe(stats2);
    });

    it('should clear cache', () => {
      const stats1 = getDerivedWeaponStats('pistol');
      clearDerivedStatsCache();
      const stats2 = getDerivedWeaponStats('pistol');

      // Should NOT be the same object after cache clear
      expect(stats1).not.toBe(stats2);
      // But values should be equal
      expect(stats1.rawDPS).toEqual(stats2.rawDPS);
    });
  });

  describe('ZOMBIE_ROLES', () => {
    it('should categorize all zombie types', () => {
      const zombieTypes = Object.keys(BALANCE.zombies);

      for (const type of zombieTypes) {
        expect(ZOMBIE_ROLES).toHaveProperty(type);
      }
    });

    it('should have correct role assignments', () => {
      expect(ZOMBIE_ROLES.shambler).toBe('fodder');
      expect(ZOMBIE_ROLES.runner).toBe('rusher');
      expect(ZOMBIE_ROLES.tank).toBe('tank');
      expect(ZOMBIE_ROLES.spitter).toBe('ranged');
      expect(ZOMBIE_ROLES.screamer).toBe('special');
    });
  });

  describe('validateBalance', () => {
    it('should return validation result', () => {
      const result = validateBalance();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should validate TTK ranges', () => {
      const shamblerTTK = calculateTTK('shambler', 'pistol');
      const validation = BALANCE_VALIDATION.TTK.shamblerWithPistol;

      // Current balance should be within acceptable range
      expect(shamblerTTK).toBeGreaterThanOrEqual(validation.min);
      expect(shamblerTTK).toBeLessThanOrEqual(validation.max);
    });

    it('should validate TTC ranges', () => {
      const shamblerTTC = calculateTTC('shambler', REFERENCE_DISTANCES.door);
      const validation = BALANCE_VALIDATION.TTC.shamblerFromDoor;

      // Current balance should be within acceptable range
      expect(shamblerTTC).toBeGreaterThanOrEqual(validation.min);
      expect(shamblerTTC).toBeLessThanOrEqual(validation.max);
    });
  });

  describe('generateBalanceReport', () => {
    it('should generate a comprehensive report', () => {
      const report = generateBalanceReport();

      expect(report).toContain('ARMES');
      expect(report).toContain('ZOMBIES');
      expect(report).toContain('VALIDATION');
      expect(report).toContain('PISTOL'); // Uppercase in report
      expect(report).toContain('SHAMBLER'); // Uppercase in report
      expect(report).toContain('DPS');
      expect(report).toContain('TTK');
    });

    it('should include all weapon types', () => {
      const report = generateBalanceReport();
      const reportUpper = report.toUpperCase();

      for (const weapon of Object.keys(BALANCE.weapons)) {
        expect(reportUpper).toContain(weapon.toUpperCase());
      }
    });

    it('should include all zombie types', () => {
      const report = generateBalanceReport();
      const reportUpper = report.toUpperCase();

      for (const zombie of Object.keys(BALANCE.zombies)) {
        expect(reportUpper).toContain(zombie.toUpperCase());
      }
    });
  });

  describe('balance relationships', () => {
    it('should ensure runners are more threatening than shamblers', () => {
      const shamblerStats = getDerivedZombieStats('shambler');
      const runnerStats = getDerivedZombieStats('runner');

      expect(runnerStats.threatScore).toBeGreaterThan(shamblerStats.threatScore);
    });

    it('should ensure tanks have highest TTC', () => {
      const tankStats = getDerivedZombieStats('tank');
      const shamblerStats = getDerivedZombieStats('shambler');
      const runnerStats = getDerivedZombieStats('runner');

      expect(tankStats.TTC.door).toBeGreaterThan(shamblerStats.TTC.door);
      expect(tankStats.TTC.door).toBeGreaterThan(runnerStats.TTC.door);
    });

    it('should ensure special zombies have higher costs', () => {
      const shamblerStats = getDerivedZombieStats('shambler');
      const screamerStats = getDerivedZombieStats('screamer');
      const necromancerStats = getDerivedZombieStats('necromancer');

      // Special zombies should cost more than shamblers due to their special factors
      expect(screamerStats.cost).toBeGreaterThan(shamblerStats.cost);
      expect(necromancerStats.cost).toBeGreaterThan(shamblerStats.cost);
    });

    it('should ensure sniper is most effective against high HP targets', () => {
      // Calculate efficiency: damage per cycle / cycle time for tank
      const pistolStats = getDerivedWeaponStats('pistol');
      const sniperStats = getDerivedWeaponStats('sniper');

      const tankHP = BALANCE.zombies.tank.health;

      // Time to kill tank
      const pistolTTK = tankHP / pistolStats.sustainedDPS;
      const sniperTTK = tankHP / sniperStats.sustainedDPS;

      // Sniper should be more efficient for tanks
      expect(sniperTTK).toBeLessThan(pistolTTK);
    });
  });

  describe('edge cases', () => {
    it('should handle zero speed gracefully', () => {
      // This shouldn't happen with real data, but let's ensure no division by zero
      const ttc = calculateTTC('shambler', 0);
      expect(ttc).toBe(0);
    });

    it('should handle all zombie types', () => {
      const zombieTypes = Object.keys(BALANCE.zombies);

      for (const type of zombieTypes) {
        const stats = getDerivedZombieStats(type as keyof typeof BALANCE.zombies);
        expect(stats.cost).toBeGreaterThan(0);
        expect(stats.threatScore).toBeGreaterThan(0);
        expect(stats.receivedDPS).toBeGreaterThan(0);
      }
    });

    it('should handle all weapon types', () => {
      const weaponTypes = Object.keys(BALANCE.weapons);

      for (const type of weaponTypes) {
        const stats = getDerivedWeaponStats(type as keyof typeof BALANCE.weapons);
        expect(stats.rawDPS).toBeGreaterThan(0);
        expect(stats.sustainedDPS).toBeGreaterThan(0);
        expect(stats.cycleTime).toBeGreaterThan(0);
      }
    });
  });
});
