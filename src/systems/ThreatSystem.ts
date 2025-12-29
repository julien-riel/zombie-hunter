/**
 * Système de Budget de Menace
 *
 * Remplace le système de comptage fixe par une gestion dynamique basée sur le coût.
 * Chaque zombie a un coût basé sur son threatScore, et chaque vague dispose d'un
 * budget à dépenser. Ce système permet un équilibrage plus fin et des compositions
 * de vagues plus variées tout en maintenant une difficulté cohérente.
 */

import type { ZombieType } from '@/types/entities';
import { BALANCE, ZombieBalanceType } from '@config/balance';
import { getDerivedZombieStats, ZOMBIE_ROLES } from '@config/derivedBalance';

/**
 * Configuration du système de menace
 */
export interface ThreatConfig {
  /** Budget initial (vague 1) */
  baseBudget: number;
  /** Augmentation de budget par vague */
  budgetPerWave: number;
  /** Type de courbe de difficulté */
  budgetCurve: 'linear' | 'exponential' | 'logarithmic';
  /** Facteur pour courbe exponentielle */
  exponentialFactor: number;

  /** Caps par rôle (maximum simultané de chaque type) */
  roleCaps: {
    fodder: number;
    rusher: number;
    tank: number;
    ranged: number;
    special: number;
  };

  /** Délai minimum entre spawns (ms) */
  minSpawnGap: number;
  /** Ratio de respiration (portion de la vague en pause relative) */
  breathingRatio: number;
}

/**
 * Plan de spawn pour un zombie
 */
export interface SpawnPlan {
  type: ZombieType;
  delay: number; // Délai avant ce spawn (ms)
}

/**
 * Résultat de la génération d'une vague
 */
export interface WaveComposition {
  spawnPlans: SpawnPlan[];
  totalBudget: number;
  spentBudget: number;
  zombieCounts: Record<ZombieType, number>;
}

/**
 * Configuration par défaut du système de menace
 */
export const DEFAULT_THREAT_CONFIG: ThreatConfig = {
  baseBudget: 5, // Équivalent à 5 shamblers
  budgetPerWave: 2.5, // +2.5 shamblers équivalent par vague
  budgetCurve: 'linear',
  exponentialFactor: 1.1,

  roleCaps: {
    fodder: 15, // Shamblers illimités pratiquement
    rusher: 6, // Max 6 runners/crawlers simultanés
    tank: 2, // Max 2 tanks simultanés
    ranged: 3, // Max 3 spitters simultanés
    special: 3, // Max 3 spéciaux (screamer, bomber, etc.)
  },

  minSpawnGap: 300, // 300ms minimum entre spawns
  breathingRatio: 0.2, // 20% du temps en "respiration"
};

/**
 * Système de gestion du budget de menace
 */
export class ThreatSystem {
  private config: ThreatConfig;
  private activeByRole: Map<string, number>;
  private currentWave: number = 0;

  constructor(config: Partial<ThreatConfig> = {}) {
    this.config = { ...DEFAULT_THREAT_CONFIG, ...config };
    this.activeByRole = new Map();
    this.resetRoleCounts();
  }

  /**
   * Réinitialise les compteurs de rôles actifs
   */
  private resetRoleCounts(): void {
    this.activeByRole.set('fodder', 0);
    this.activeByRole.set('rusher', 0);
    this.activeByRole.set('tank', 0);
    this.activeByRole.set('ranged', 0);
    this.activeByRole.set('special', 0);
  }

  /**
   * Calcule le budget pour une vague donnée
   */
  public getBudget(waveNumber: number): number {
    const { baseBudget, budgetPerWave, budgetCurve, exponentialFactor } = this.config;

    switch (budgetCurve) {
      case 'linear':
        return baseBudget + (waveNumber - 1) * budgetPerWave;

      case 'exponential':
        return baseBudget * Math.pow(exponentialFactor, waveNumber - 1);

      case 'logarithmic':
        // Croissance rapide au début, puis ralentit
        return baseBudget + budgetPerWave * Math.log2(waveNumber + 1) * 2;

      default:
        return baseBudget + (waveNumber - 1) * budgetPerWave;
    }
  }

  /**
   * Calcule le coût d'un type de zombie
   */
  public getZombieCost(type: ZombieType): number {
    const derived = getDerivedZombieStats(type);
    return derived.cost;
  }

  /**
   * Récupère les types de zombies disponibles pour une vague
   * en respectant les unlocks définis dans balance.ts
   */
  public getAvailableTypes(waveNumber: number): ZombieType[] {
    return BALANCE.waves.zombieTypeUnlocks
      .filter((unlock) => waveNumber >= unlock.wave)
      .map((unlock) => unlock.type);
  }

  /**
   * Récupère les types disponibles qui respectent les caps de rôle
   */
  private getAvailableTypesWithCaps(waveNumber: number): ZombieType[] {
    const available = this.getAvailableTypes(waveNumber);

    return available.filter((type) => {
      const role = ZOMBIE_ROLES[type as ZombieBalanceType];
      const currentCount = this.activeByRole.get(role) || 0;
      const cap = this.config.roleCaps[role];
      return currentCount < cap;
    });
  }

  /**
   * Récupère le poids de spawn d'un type de zombie
   */
  private getTypeWeight(type: ZombieType): number {
    const unlock = BALANCE.waves.zombieTypeUnlocks.find((u) => u.type === type);
    return unlock?.weight || 0.1;
  }

  /**
   * Sélection aléatoire pondérée parmi les types disponibles
   */
  private weightedRandomType(availableTypes: ZombieType[]): ZombieType {
    if (availableTypes.length === 0) {
      return 'shambler';
    }

    if (availableTypes.length === 1) {
      return availableTypes[0];
    }

    const weights = availableTypes.map((t) => this.getTypeWeight(t));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let random = Math.random() * totalWeight;

    for (let i = 0; i < availableTypes.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return availableTypes[i];
      }
    }

    return availableTypes[availableTypes.length - 1];
  }

  /**
   * Incrémente le compteur de rôle pour un type de zombie
   */
  private incrementRoleCount(type: ZombieType): void {
    const role = ZOMBIE_ROLES[type as ZombieBalanceType];
    const current = this.activeByRole.get(role) || 0;
    this.activeByRole.set(role, current + 1);
  }

  /**
   * Génère la composition d'une vague
   */
  public generateWaveComposition(waveNumber: number, spawnDelayMultiplier: number = 1): WaveComposition {
    this.currentWave = waveNumber;
    this.resetRoleCounts();

    const totalBudget = this.getBudget(waveNumber);
    let spentBudget = 0;
    const spawnPlans: SpawnPlan[] = [];
    const zombieCounts: Record<string, number> = {};

    // Initialiser les compteurs
    for (const type of Object.keys(BALANCE.zombies)) {
      zombieCounts[type] = 0;
    }

    // Dépenser le budget
    let attempts = 0;
    const maxAttempts = 100; // Éviter les boucles infinies

    while (spentBudget < totalBudget && attempts < maxAttempts) {
      attempts++;

      // Obtenir les types disponibles qui respectent les caps
      const availableTypes = this.getAvailableTypesWithCaps(waveNumber);

      if (availableTypes.length === 0) {
        // Tous les caps sont atteints, sortir
        break;
      }

      // Sélectionner un type
      const type = this.weightedRandomType(availableTypes);
      const cost = this.getZombieCost(type);

      // Vérifier si on peut encore dépenser
      if (spentBudget + cost > totalBudget * 1.1) {
        // Permettre un léger dépassement (10%)
        // Mais si on dépasse trop, essayer un type moins cher
        const cheaperTypes = availableTypes.filter((t) => {
          const c = this.getZombieCost(t);
          return spentBudget + c <= totalBudget * 1.1;
        });

        if (cheaperTypes.length === 0) {
          break;
        }

        const cheaperType = this.weightedRandomType(cheaperTypes);
        const cheaperCost = this.getZombieCost(cheaperType);

        spawnPlans.push({ type: cheaperType, delay: 0 }); // Délai calculé plus tard
        spentBudget += cheaperCost;
        zombieCounts[cheaperType] = (zombieCounts[cheaperType] || 0) + 1;
        this.incrementRoleCount(cheaperType);
      } else {
        spawnPlans.push({ type, delay: 0 });
        spentBudget += cost;
        zombieCounts[type] = (zombieCounts[type] || 0) + 1;
        this.incrementRoleCount(type);
      }
    }

    // Appliquer le pacing (pic/respiration) et calculer les délais
    this.applyPacing(spawnPlans, spawnDelayMultiplier);

    return {
      spawnPlans,
      totalBudget,
      spentBudget,
      zombieCounts: zombieCounts as Record<ZombieType, number>,
    };
  }

  /**
   * Applique le pacing aux plans de spawn
   * Alterne entre pics d'intensité et moments de respiration
   */
  private applyPacing(spawnPlans: SpawnPlan[], delayMultiplier: number): void {
    if (spawnPlans.length === 0) return;

    const baseDelay = this.config.minSpawnGap * delayMultiplier;
    const breathingDelay = baseDelay * 3; // Délai plus long pour la respiration

    // Mélanger les plans pour un ordre plus naturel
    this.shuffleArray(spawnPlans);

    // Calculer les indices de respiration (toutes les X spawns)
    const breathingInterval = Math.max(3, Math.floor(spawnPlans.length * (1 - this.config.breathingRatio)));

    let accumulatedDelay = 0;

    for (let i = 0; i < spawnPlans.length; i++) {
      // Est-ce un moment de respiration ?
      const isBreathing = i > 0 && i % breathingInterval === 0;

      if (isBreathing) {
        accumulatedDelay += breathingDelay + Math.random() * baseDelay;
      } else {
        accumulatedDelay += baseDelay + Math.random() * (baseDelay * 0.5);
      }

      spawnPlans[i].delay = Math.round(accumulatedDelay);
    }

    // Le premier spawn est immédiat (ou presque)
    if (spawnPlans.length > 0) {
      spawnPlans[0].delay = Math.round(baseDelay * 0.5);
    }
  }

  /**
   * Mélange un tableau en place (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Met à jour la configuration
   */
  public updateConfig(config: Partial<ThreatConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Récupère la configuration actuelle
   */
  public getConfig(): ThreatConfig {
    return { ...this.config };
  }

  /**
   * Calcule le nombre estimé de zombies pour un budget donné
   * Utile pour l'affichage HUD ou les prédictions
   */
  public estimateZombieCount(budget: number): number {
    // Coût moyen approximatif basé sur les premiers types
    const averageCost = 1.2; // Légèrement au-dessus du shambler
    return Math.round(budget / averageCost);
  }

  /**
   * Génère un rapport de la composition de vague
   */
  public generateReport(composition: WaveComposition): string {
    const lines: string[] = [];
    lines.push(`=== VAGUE ${this.currentWave} ===`);
    lines.push(`Budget: ${composition.spentBudget.toFixed(1)} / ${composition.totalBudget.toFixed(1)}`);
    lines.push(`Zombies: ${composition.spawnPlans.length}`);
    lines.push('');
    lines.push('Composition:');

    for (const [type, count] of Object.entries(composition.zombieCounts)) {
      if (count > 0) {
        const cost = this.getZombieCost(type as ZombieType);
        lines.push(`  ${type}: ${count} (coût: ${cost.toFixed(2)} × ${count} = ${(cost * count).toFixed(1)})`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Notifie le système qu'un zombie a été tué
   * Permet de libérer un slot dans le cap du rôle correspondant
   */
  public onZombieKilled(type: ZombieType): void {
    const role = ZOMBIE_ROLES[type as ZombieBalanceType];
    const current = this.activeByRole.get(role) || 0;
    if (current > 0) {
      this.activeByRole.set(role, current - 1);
    }
  }

  /**
   * Réinitialise le système pour une nouvelle partie
   */
  public reset(): void {
    this.currentWave = 0;
    this.resetRoleCounts();
  }
}
