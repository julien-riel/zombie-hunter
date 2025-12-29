/**
 * Système de Difficulté Adaptative (DDA)
 *
 * Ajuste dynamiquement la difficulté du jeu en fonction des performances du joueur.
 * Le système observe les métriques de jeu et ajuste les paramètres de spawn
 * pour maintenir le joueur dans la "zone de flow" (ni ennui, ni frustration).
 *
 * Principes clés:
 * - Ajustements subtils et graduels
 * - Hysteresis pour éviter les oscillations
 * - Transparence (option ON/OFF pour le joueur)
 * - Bornes strictes pour éviter les extrêmes
 */

import type { TelemetryManager } from '@managers/TelemetryManager';

/**
 * Configuration du système DDA
 */
export interface DDAConfig {
  /** Activation du système */
  enabled: boolean;
  /** Taille de la fenêtre d'observation (ms) */
  windowSize: number;
  /** Cooldown entre ajustements (ms) */
  adjustmentCooldown: number;
  /** Pas d'ajustement (%) */
  adjustmentStep: number;

  /** Seuils de performance */
  thresholds: {
    /** Seuil "en difficulté" */
    struggling: {
      accuracy: number; // En dessous = en difficulté
      damageTakenPerMin: number; // Au dessus = en difficulté
      nearDeathsPerWave: number; // Au dessus = en difficulté
      healthPercent: number; // En dessous = en difficulté
    };
    /** Seuil "dominant" */
    dominating: {
      accuracy: number; // Au dessus = dominant
      damageTakenPerMin: number; // En dessous = dominant
      waveClearTime: number; // En dessous (secondes) = dominant
      healthPercent: number; // Au dessus = dominant
    };
  };

  /** Bornes des modificateurs */
  bounds: {
    spawnDelay: { min: number; max: number };
    budgetMultiplier: { min: number; max: number };
  };
}

/**
 * Modificateurs appliqués par le DDA
 */
export interface DDAModifiers {
  /** Multiplicateur de délai de spawn (>1 = plus lent, <1 = plus rapide) */
  spawnDelayMultiplier: number;
  /** Multiplicateur de budget de menace */
  budgetMultiplier: number;
  /** Modificateur de drop rate */
  dropRateMultiplier: number;
}

/**
 * État de performance du joueur
 */
export type PerformanceState = 'struggling' | 'neutral' | 'dominating';

/**
 * Configuration par défaut du DDA
 */
export const DEFAULT_DDA_CONFIG: DDAConfig = {
  enabled: true,
  windowSize: 30000, // 30 secondes
  adjustmentCooldown: 10000, // 10 secondes entre ajustements
  adjustmentStep: 0.05, // 5% par ajustement

  thresholds: {
    struggling: {
      accuracy: 0.25, // Moins de 25% de précision
      damageTakenPerMin: 50, // Plus de 50 dégâts/min
      nearDeathsPerWave: 2, // Plus de 2 near deaths par vague
      healthPercent: 0.3, // Moins de 30% de vie
    },
    dominating: {
      accuracy: 0.6, // Plus de 60% de précision
      damageTakenPerMin: 15, // Moins de 15 dégâts/min
      waveClearTime: 20, // Moins de 20 secondes par vague
      healthPercent: 0.8, // Plus de 80% de vie
    },
  },

  bounds: {
    spawnDelay: { min: 0.6, max: 1.5 }, // 60% à 150% du délai normal
    budgetMultiplier: { min: 0.7, max: 1.3 }, // 70% à 130% du budget
  },
};

/**
 * Système de Difficulté Adaptative
 */
export class DDASystem {
  private config: DDAConfig;
  private telemetryManager: TelemetryManager | null = null;
  private currentModifiers: DDAModifiers;
  private lastAdjustmentTime: number = 0;
  private adjustmentHistory: { timestamp: number; state: PerformanceState; action: string }[] = [];
  private wavesWithoutAdjustment: number = 0;

  constructor(config: Partial<DDAConfig> = {}) {
    this.config = { ...DEFAULT_DDA_CONFIG, ...config };
    this.currentModifiers = this.getDefaultModifiers();
  }

  /**
   * Retourne les modificateurs par défaut (neutres)
   */
  private getDefaultModifiers(): DDAModifiers {
    return {
      spawnDelayMultiplier: 1.0,
      budgetMultiplier: 1.0,
      dropRateMultiplier: 1.0,
    };
  }

  /**
   * Connecte le système au TelemetryManager
   */
  public setTelemetryManager(manager: TelemetryManager): void {
    this.telemetryManager = manager;
  }

  /**
   * Active ou désactive le DDA
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.currentModifiers = this.getDefaultModifiers();
    }
  }

  /**
   * Vérifie si le DDA est activé
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Vérifie si un ajustement est possible (cooldown)
   */
  private canAdjust(): boolean {
    const now = Date.now();
    return now - this.lastAdjustmentTime >= this.config.adjustmentCooldown;
  }

  /**
   * Évalue la performance actuelle du joueur
   */
  public evaluatePerformance(): PerformanceState {
    if (!this.telemetryManager) {
      return 'neutral';
    }

    const metrics = this.telemetryManager.getRealtimeMetrics();
    const { thresholds } = this.config;

    // Compteur de critères struggling/dominating
    let strugglingScore = 0;
    let dominatingScore = 0;

    // Précision
    if (metrics.accuracy < thresholds.struggling.accuracy) {
      strugglingScore++;
    } else if (metrics.accuracy > thresholds.dominating.accuracy) {
      dominatingScore++;
    }

    // Dégâts reçus
    if (metrics.damageTakenPerMin > thresholds.struggling.damageTakenPerMin) {
      strugglingScore++;
    } else if (metrics.damageTakenPerMin < thresholds.dominating.damageTakenPerMin) {
      dominatingScore++;
    }

    // Santé actuelle
    if (metrics.currentHealthPercent < thresholds.struggling.healthPercent) {
      strugglingScore++;
    } else if (metrics.currentHealthPercent > thresholds.dominating.healthPercent) {
      dominatingScore++;
    }

    // Temps de clear (si applicable)
    if (metrics.avgWaveClearTime > 0) {
      if (metrics.avgWaveClearTime < thresholds.dominating.waveClearTime) {
        dominatingScore++;
      }
    }

    // Déterminer l'état
    // Il faut au moins 2 critères pour être considéré struggling ou dominating
    if (strugglingScore >= 2) {
      return 'struggling';
    } else if (dominatingScore >= 2) {
      return 'dominating';
    }

    return 'neutral';
  }

  /**
   * Facilite le jeu (joueur en difficulté)
   */
  private easeUp(): void {
    const step = this.config.adjustmentStep;
    const { bounds } = this.config;

    // Augmenter le délai de spawn (spawns plus lents)
    this.currentModifiers.spawnDelayMultiplier = Math.min(
      bounds.spawnDelay.max,
      this.currentModifiers.spawnDelayMultiplier + step
    );

    // Réduire le budget de menace
    this.currentModifiers.budgetMultiplier = Math.max(
      bounds.budgetMultiplier.min,
      this.currentModifiers.budgetMultiplier - step
    );

    // Augmenter le drop rate
    this.currentModifiers.dropRateMultiplier = Math.min(1.5, this.currentModifiers.dropRateMultiplier + step);

    this.logAdjustment('struggling', 'eased');
  }

  /**
   * Augmente la difficulté (joueur dominant)
   */
  private rampUp(): void {
    const step = this.config.adjustmentStep;
    const { bounds } = this.config;

    // Réduire le délai de spawn (spawns plus rapides)
    this.currentModifiers.spawnDelayMultiplier = Math.max(
      bounds.spawnDelay.min,
      this.currentModifiers.spawnDelayMultiplier - step
    );

    // Augmenter le budget de menace
    this.currentModifiers.budgetMultiplier = Math.min(
      bounds.budgetMultiplier.max,
      this.currentModifiers.budgetMultiplier + step
    );

    // Normaliser le drop rate
    this.currentModifiers.dropRateMultiplier = Math.max(0.8, this.currentModifiers.dropRateMultiplier - step * 0.5);

    this.logAdjustment('dominating', 'ramped');
  }

  /**
   * Retourne progressivement vers les valeurs neutres
   */
  private normalize(): void {
    const step = this.config.adjustmentStep * 0.5; // Normalisation plus lente

    // Spawn delay vers 1.0
    if (this.currentModifiers.spawnDelayMultiplier > 1.0) {
      this.currentModifiers.spawnDelayMultiplier = Math.max(1.0, this.currentModifiers.spawnDelayMultiplier - step);
    } else if (this.currentModifiers.spawnDelayMultiplier < 1.0) {
      this.currentModifiers.spawnDelayMultiplier = Math.min(1.0, this.currentModifiers.spawnDelayMultiplier + step);
    }

    // Budget vers 1.0
    if (this.currentModifiers.budgetMultiplier > 1.0) {
      this.currentModifiers.budgetMultiplier = Math.max(1.0, this.currentModifiers.budgetMultiplier - step);
    } else if (this.currentModifiers.budgetMultiplier < 1.0) {
      this.currentModifiers.budgetMultiplier = Math.min(1.0, this.currentModifiers.budgetMultiplier + step);
    }

    // Drop rate vers 1.0
    if (this.currentModifiers.dropRateMultiplier > 1.0) {
      this.currentModifiers.dropRateMultiplier = Math.max(1.0, this.currentModifiers.dropRateMultiplier - step);
    } else if (this.currentModifiers.dropRateMultiplier < 1.0) {
      this.currentModifiers.dropRateMultiplier = Math.min(1.0, this.currentModifiers.dropRateMultiplier + step);
    }
  }

  /**
   * Enregistre un ajustement dans l'historique
   */
  private logAdjustment(state: PerformanceState, action: string): void {
    this.adjustmentHistory.push({
      timestamp: Date.now(),
      state,
      action,
    });

    // Garder seulement les 50 derniers ajustements
    if (this.adjustmentHistory.length > 50) {
      this.adjustmentHistory.shift();
    }
  }

  /**
   * Met à jour le système DDA
   * Doit être appelé régulièrement (chaque frame ou à intervalles)
   */
  public update(_delta: number): void {
    if (!this.config.enabled || !this.telemetryManager) {
      return;
    }

    if (!this.canAdjust()) {
      return;
    }

    const performance = this.evaluatePerformance();

    switch (performance) {
      case 'struggling':
        this.easeUp();
        break;

      case 'dominating':
        this.rampUp();
        break;

      case 'neutral':
        // Revenir lentement vers la normale
        this.normalize();
        this.wavesWithoutAdjustment++;
        break;
    }

    this.lastAdjustmentTime = Date.now();
  }

  /**
   * Appelé à chaque fin de vague pour évaluation périodique
   */
  public onWaveComplete(): void {
    // Forcer une évaluation à la fin de chaque vague
    if (this.config.enabled && this.telemetryManager) {
      this.lastAdjustmentTime = 0; // Reset cooldown
      this.update(0);
    }
  }

  /**
   * Récupère les modificateurs actuels
   */
  public getModifiers(): DDAModifiers {
    if (!this.config.enabled) {
      return this.getDefaultModifiers();
    }
    return { ...this.currentModifiers };
  }

  /**
   * Récupère la configuration
   */
  public getConfig(): DDAConfig {
    return { ...this.config };
  }

  /**
   * Met à jour la configuration
   */
  public updateConfig(config: Partial<DDAConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Réinitialise le système
   */
  public reset(): void {
    this.currentModifiers = this.getDefaultModifiers();
    this.lastAdjustmentTime = 0;
    this.adjustmentHistory = [];
    this.wavesWithoutAdjustment = 0;
  }

  /**
   * Génère un rapport d'état du DDA
   */
  public generateReport(): string {
    const lines: string[] = [];
    lines.push('=== DDA STATUS ===');
    lines.push(`Enabled: ${this.config.enabled}`);
    lines.push('');
    lines.push('Current Modifiers:');
    lines.push(`  Spawn Delay: ${(this.currentModifiers.spawnDelayMultiplier * 100).toFixed(0)}%`);
    lines.push(`  Budget: ${(this.currentModifiers.budgetMultiplier * 100).toFixed(0)}%`);
    lines.push(`  Drop Rate: ${(this.currentModifiers.dropRateMultiplier * 100).toFixed(0)}%`);
    lines.push('');

    if (this.telemetryManager) {
      const metrics = this.telemetryManager.getRealtimeMetrics();
      const performance = this.evaluatePerformance();

      lines.push('Current Performance:');
      lines.push(`  State: ${performance}`);
      lines.push(`  Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
      lines.push(`  Damage/min: ${metrics.damageTakenPerMin.toFixed(1)}`);
      lines.push(`  Health: ${(metrics.currentHealthPercent * 100).toFixed(0)}%`);
      lines.push(`  Kills/min: ${metrics.killsPerMin.toFixed(1)}`);
    }

    lines.push('');
    lines.push(`Adjustments: ${this.adjustmentHistory.length}`);
    if (this.adjustmentHistory.length > 0) {
      const recent = this.adjustmentHistory.slice(-5);
      lines.push('Recent:');
      for (const adj of recent) {
        const ago = Math.round((Date.now() - adj.timestamp) / 1000);
        lines.push(`  ${ago}s ago: ${adj.state} -> ${adj.action}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Récupère l'historique des ajustements
   */
  public getAdjustmentHistory(): { timestamp: number; state: PerformanceState; action: string }[] {
    return [...this.adjustmentHistory];
  }
}
