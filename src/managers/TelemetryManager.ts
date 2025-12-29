/**
 * Gestionnaire de Télémétrie
 *
 * Collecte les données de gameplay pour l'analyse, le fine-tuning de l'équilibrage
 * et l'alimentation du système de difficulté adaptative (DDA).
 *
 * Les métriques sont collectées à deux niveaux:
 * - Temps réel (fenêtre glissante) pour le DDA
 * - Cumulatif pour le résumé de fin de run
 */

import type { ZombieType } from '@/types/entities';
import type { WeaponBalanceType } from '@config/balance';

/**
 * Types d'événements de télémétrie
 */
export type TelemetryEventType =
  | 'zombie:killed'
  | 'zombie:spawned'
  | 'player:hit'
  | 'player:heal'
  | 'player:death'
  | 'player:dash'
  | 'weapon:fired'
  | 'weapon:hit'
  | 'weapon:reload'
  | 'wave:start'
  | 'wave:clear'
  | 'powerup:collected'
  | 'combo:updated';

/**
 * Événement de télémétrie
 */
export interface TelemetryEvent {
  timestamp: number;
  type: TelemetryEventType;
  data: Record<string, unknown>;
}

/**
 * Métriques pour le DDA (calculées en temps réel)
 */
export interface DDAMetrics {
  /** Précision: hits / shots (0-1) */
  accuracy: number;
  /** Dégâts reçus par minute */
  damageTakenPerMin: number;
  /** Temps moyen pour clear une vague (secondes) */
  avgWaveClearTime: number;
  /** Nombre de passages sous 15% HP */
  nearDeaths: number;
  /** Usage du dash par minute */
  dashUsagePerMin: number;
  /** Temps de survie total (secondes) */
  survivalTime: number;
  /** Kills par minute */
  killsPerMin: number;
  /** Santé actuelle (%) */
  currentHealthPercent: number;
}

/**
 * Résumé de fin de run
 */
export interface RunSummary {
  /** Durée totale en secondes */
  duration: number;
  /** Nombre de vagues complétées */
  wavesCleared: number;
  /** Vague maximale atteinte */
  maxWave: number;
  /** Zombies tués par type */
  zombiesKilled: Record<string, number>;
  /** Zombies tués total */
  totalKills: number;
  /** Dégâts infligés */
  damageDealt: number;
  /** Dégâts subis */
  damageTaken: number;
  /** Précision globale */
  accuracy: number;
  /** Tirs totaux */
  shotsFired: number;
  /** Tirs touchés */
  shotsHit: number;
  /** Usage des armes */
  weaponUsage: Record<string, number>;
  /** Cause de mort */
  causeOfDeath: { type: ZombieType; distance: number } | null;
  /** Score final */
  finalScore: number;
  /** Combo maximal atteint */
  maxCombo: number;

  /** Métriques dérivées */
  avgTTKByType: Record<string, number>;
  damagePerMinute: number;
  avgWaveClearTime: number;
}

/**
 * Configuration de la fenêtre glissante
 */
export interface SlidingWindowConfig {
  /** Taille de la fenêtre en millisecondes */
  windowSize: number;
  /** Intervalle de mise à jour en millisecondes */
  updateInterval: number;
}

/**
 * Gestionnaire de télémétrie
 */
export class TelemetryManager {
  private events: TelemetryEvent[] = [];
  private startTime: number = 0;
  private windowConfig: SlidingWindowConfig;

  // Compteurs cumulatifs
  private shotsFired: number = 0;
  private shotsHit: number = 0;
  private totalDamageDealt: number = 0;
  private totalDamageTaken: number = 0;
  private zombieKills: Map<string, number> = new Map();
  private weaponShots: Map<string, number> = new Map();
  private waveClearTimes: number[] = [];
  private waveStartTime: number = 0;
  private currentWave: number = 0;
  private nearDeathCount: number = 0;
  private dashCount: number = 0;
  private maxCombo: number = 0;
  private finalScore: number = 0;
  private causeOfDeath: { type: ZombieType; distance: number } | null = null;

  // Métriques temps réel (fenêtre glissante)
  private recentShots: { timestamp: number; hit: boolean }[] = [];
  private recentDamage: { timestamp: number; amount: number }[] = [];
  private recentKills: { timestamp: number; type: ZombieType }[] = [];
  private recentDashes: { timestamp: number }[] = [];
  private currentHealth: number = 100;
  private maxHealth: number = 100;

  // TTK tracking
  private zombieSpawnTimes: Map<string, number> = new Map();
  private ttkRecords: Map<string, number[]> = new Map();

  constructor(windowConfig: Partial<SlidingWindowConfig> = {}) {
    this.windowConfig = {
      windowSize: 30000, // 30 secondes par défaut
      updateInterval: 1000,
      ...windowConfig,
    };
  }

  /**
   * Démarre une nouvelle session de télémétrie
   */
  public start(): void {
    this.reset();
    this.startTime = Date.now();
  }

  /**
   * Réinitialise toutes les métriques
   */
  public reset(): void {
    this.events = [];
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.totalDamageDealt = 0;
    this.totalDamageTaken = 0;
    this.zombieKills.clear();
    this.weaponShots.clear();
    this.waveClearTimes = [];
    this.waveStartTime = 0;
    this.currentWave = 0;
    this.nearDeathCount = 0;
    this.dashCount = 0;
    this.maxCombo = 0;
    this.finalScore = 0;
    this.causeOfDeath = null;
    this.recentShots = [];
    this.recentDamage = [];
    this.recentKills = [];
    this.recentDashes = [];
    this.currentHealth = 100;
    this.zombieSpawnTimes.clear();
    this.ttkRecords.clear();
  }

  /**
   * Enregistre un événement de télémétrie
   */
  public log(type: TelemetryEventType, data: Record<string, unknown> = {}): void {
    const timestamp = Date.now();
    const event: TelemetryEvent = { timestamp, type, data };
    this.events.push(event);

    // Traiter l'événement
    this.processEvent(event);
  }

  /**
   * Traite un événement et met à jour les métriques
   */
  private processEvent(event: TelemetryEvent): void {
    const { type, data } = event;

    switch (type) {
      case 'zombie:killed':
        this.handleZombieKilled(data as { type: ZombieType; zombieId: string; damage: number });
        break;

      case 'zombie:spawned':
        this.handleZombieSpawned(data as { type: ZombieType; zombieId: string });
        break;

      case 'player:hit':
        this.handlePlayerHit(data as { amount: number; source: ZombieType; distance: number });
        break;

      case 'player:heal':
        this.handlePlayerHeal(data as { amount: number });
        break;

      case 'player:death':
        this.handlePlayerDeath(data as { source: ZombieType; distance: number });
        break;

      case 'player:dash':
        this.handlePlayerDash();
        break;

      case 'weapon:fired':
        this.handleWeaponFired(data as { weapon: WeaponBalanceType });
        break;

      case 'weapon:hit':
        this.handleWeaponHit(data as { weapon: WeaponBalanceType; damage: number });
        break;

      case 'wave:start':
        this.handleWaveStart(data as { wave: number });
        break;

      case 'wave:clear':
        this.handleWaveClear(data as { wave: number });
        break;

      case 'combo:updated':
        this.handleComboUpdated(data as { combo: number; score: number });
        break;
    }
  }

  private handleZombieKilled(data: { type: ZombieType; zombieId: string; damage: number }): void {
    const { type, zombieId, damage } = data;
    const timestamp = Date.now();

    // Incrémenter le compteur
    const count = this.zombieKills.get(type) || 0;
    this.zombieKills.set(type, count + 1);

    // Ajouter aux kills récents
    this.recentKills.push({ timestamp, type });

    // Calculer le TTK si on a le spawn time
    const spawnTime = this.zombieSpawnTimes.get(zombieId);
    if (spawnTime) {
      const ttk = (timestamp - spawnTime) / 1000;
      const ttkList = this.ttkRecords.get(type) || [];
      ttkList.push(ttk);
      this.ttkRecords.set(type, ttkList);
      this.zombieSpawnTimes.delete(zombieId);
    }

    // Ajouter les dégâts infligés
    this.totalDamageDealt += damage;
  }

  private handleZombieSpawned(data: { type: ZombieType; zombieId: string }): void {
    this.zombieSpawnTimes.set(data.zombieId, Date.now());
  }

  private handlePlayerHit(data: { amount: number; source: ZombieType; distance: number }): void {
    const timestamp = Date.now();
    this.totalDamageTaken += data.amount;
    this.recentDamage.push({ timestamp, amount: data.amount });

    // Mettre à jour la santé
    this.currentHealth = Math.max(0, this.currentHealth - data.amount);

    // Vérifier near death
    if (this.currentHealth < this.maxHealth * 0.15) {
      this.nearDeathCount++;
    }
  }

  private handlePlayerHeal(data: { amount: number }): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + data.amount);
  }

  private handlePlayerDeath(data: { source: ZombieType; distance: number }): void {
    this.causeOfDeath = { type: data.source, distance: data.distance };
    this.currentHealth = 0;
  }

  private handlePlayerDash(): void {
    this.dashCount++;
    this.recentDashes.push({ timestamp: Date.now() });
  }

  private handleWeaponFired(data: { weapon: WeaponBalanceType }): void {
    const timestamp = Date.now();
    this.shotsFired++;
    this.recentShots.push({ timestamp, hit: false });

    const count = this.weaponShots.get(data.weapon) || 0;
    this.weaponShots.set(data.weapon, count + 1);
  }

  private handleWeaponHit(data: { weapon: WeaponBalanceType; damage: number }): void {
    this.shotsHit++;
    this.totalDamageDealt += data.damage;

    // Marquer le dernier tir comme touché
    if (this.recentShots.length > 0) {
      this.recentShots[this.recentShots.length - 1].hit = true;
    }
  }

  private handleWaveStart(data: { wave: number }): void {
    this.currentWave = data.wave;
    this.waveStartTime = Date.now();
  }

  private handleWaveClear(_data: { wave: number }): void {
    if (this.waveStartTime > 0) {
      const clearTime = (Date.now() - this.waveStartTime) / 1000;
      this.waveClearTimes.push(clearTime);
    }
  }

  private handleComboUpdated(data: { combo: number; score: number }): void {
    if (data.combo > this.maxCombo) {
      this.maxCombo = data.combo;
    }
    this.finalScore = data.score;
  }

  /**
   * Met à jour la santé actuelle du joueur
   */
  public updateHealth(current: number, max: number): void {
    this.currentHealth = current;
    this.maxHealth = max;
  }

  /**
   * Met à jour le score
   */
  public updateScore(score: number): void {
    this.finalScore = score;
  }

  /**
   * Nettoie les données hors de la fenêtre glissante
   */
  private cleanupWindow(): void {
    const cutoff = Date.now() - this.windowConfig.windowSize;

    this.recentShots = this.recentShots.filter((s) => s.timestamp > cutoff);
    this.recentDamage = this.recentDamage.filter((d) => d.timestamp > cutoff);
    this.recentKills = this.recentKills.filter((k) => k.timestamp > cutoff);
    this.recentDashes = this.recentDashes.filter((d) => d.timestamp > cutoff);
  }

  /**
   * Récupère les métriques temps réel pour le DDA
   */
  public getRealtimeMetrics(): DDAMetrics {
    this.cleanupWindow();

    const now = Date.now();
    const survivalTime = (now - this.startTime) / 1000;
    const windowMinutes = this.windowConfig.windowSize / 60000;

    // Précision sur la fenêtre
    const windowShots = this.recentShots.length;
    const windowHits = this.recentShots.filter((s) => s.hit).length;
    const accuracy = windowShots > 0 ? windowHits / windowShots : 0;

    // Dégâts par minute
    const windowDamage = this.recentDamage.reduce((sum, d) => sum + d.amount, 0);
    const damageTakenPerMin = windowDamage / windowMinutes;

    // Kills par minute
    const killsPerMin = this.recentKills.length / windowMinutes;

    // Dash par minute
    const dashUsagePerMin = this.recentDashes.length / windowMinutes;

    // Temps moyen de clear
    const avgWaveClearTime =
      this.waveClearTimes.length > 0
        ? this.waveClearTimes.reduce((a, b) => a + b, 0) / this.waveClearTimes.length
        : 0;

    // Santé actuelle
    const currentHealthPercent = this.maxHealth > 0 ? this.currentHealth / this.maxHealth : 0;

    return {
      accuracy,
      damageTakenPerMin,
      avgWaveClearTime,
      nearDeaths: this.nearDeathCount,
      dashUsagePerMin,
      survivalTime,
      killsPerMin,
      currentHealthPercent,
    };
  }

  /**
   * Génère le résumé de fin de run
   */
  public generateRunSummary(): RunSummary {
    const duration = (Date.now() - this.startTime) / 1000;

    // Convertir les Maps en Records
    const zombiesKilled: Record<string, number> = {};
    for (const [type, count] of this.zombieKills) {
      zombiesKilled[type] = count;
    }

    const weaponUsage: Record<string, number> = {};
    for (const [weapon, count] of this.weaponShots) {
      weaponUsage[weapon] = count;
    }

    // Calculer les TTK moyens
    const avgTTKByType: Record<string, number> = {};
    for (const [type, ttkList] of this.ttkRecords) {
      if (ttkList.length > 0) {
        avgTTKByType[type] = ttkList.reduce((a, b) => a + b, 0) / ttkList.length;
      }
    }

    const totalKills = Array.from(this.zombieKills.values()).reduce((a, b) => a + b, 0);

    return {
      duration,
      wavesCleared: this.waveClearTimes.length,
      maxWave: this.currentWave,
      zombiesKilled,
      totalKills,
      damageDealt: this.totalDamageDealt,
      damageTaken: this.totalDamageTaken,
      accuracy: this.shotsFired > 0 ? this.shotsHit / this.shotsFired : 0,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      weaponUsage,
      causeOfDeath: this.causeOfDeath,
      finalScore: this.finalScore,
      maxCombo: this.maxCombo,
      avgTTKByType,
      damagePerMinute: duration > 0 ? (this.totalDamageDealt / duration) * 60 : 0,
      avgWaveClearTime:
        this.waveClearTimes.length > 0
          ? this.waveClearTimes.reduce((a, b) => a + b, 0) / this.waveClearTimes.length
          : 0,
    };
  }

  /**
   * Exporte les données en JSON
   */
  public exportToJSON(): string {
    return JSON.stringify(
      {
        summary: this.generateRunSummary(),
        events: this.events,
        realtimeMetrics: this.getRealtimeMetrics(),
      },
      null,
      2
    );
  }

  /**
   * Récupère le nombre d'événements
   */
  public getEventCount(): number {
    return this.events.length;
  }

  /**
   * Récupère les événements récents d'un type
   */
  public getRecentEvents(type: TelemetryEventType, count: number = 10): TelemetryEvent[] {
    return this.events.filter((e) => e.type === type).slice(-count);
  }
}
