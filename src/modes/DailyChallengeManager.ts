/**
 * Gestionnaire du mode Challenge Quotidien (Phase 8.2)
 *
 * Génère un défi unique chaque jour avec les mêmes conditions
 * pour tous les joueurs. Utilise une seed basée sur la date.
 */

import Phaser from 'phaser';
import type { DailyChallengeConfig, ChallengeModifier } from '@/types/modes';
import { SaveManager } from '@managers/SaveManager';

/**
 * Liste des modificateurs disponibles
 */
const AVAILABLE_MODIFIERS: ChallengeModifier[] = [
  {
    id: 'double_damage',
    name: 'Double Dégâts',
    description: 'Les zombies infligent le double de dégâts',
    apply: (config) => {
      config.damageMultiplier = 2.0;
    },
  },
  {
    id: 'no_healing',
    name: 'Pas de Soin',
    description: 'Les items de soin sont désactivés',
    apply: (config) => {
      config.healthMultiplier = 0;
    },
  },
  {
    id: 'fast_zombies',
    name: 'Zombies Rapides',
    description: 'Les zombies se déplacent 25% plus vite',
    apply: (config) => {
      config.speedMultiplier = 1.25;
    },
  },
  {
    id: 'horde_mode',
    name: 'Mode Horde',
    description: 'Plus de zombies par vague',
    apply: (config) => {
      config.spawnRateMultiplier = 1.5;
    },
  },
  {
    id: 'glass_cannon',
    name: 'Canon de Verre',
    description: 'Dégâts x2 infligés et reçus',
    apply: (config) => {
      config.damageMultiplier = 2.0;
    },
  },
  {
    id: 'slow_motion',
    name: 'Ralenti',
    description: 'Zombies 20% plus lents',
    apply: (config) => {
      config.speedMultiplier = 0.8;
    },
  },
  {
    id: 'elite_only',
    name: 'Élites Seulement',
    description: 'Plus de zombies spéciaux',
    apply: (config) => {
      config.spawnRateMultiplier = 0.7;
    },
  },
];

/**
 * Liste des arènes disponibles pour le daily
 */
const DAILY_ARENAS = ['hospital', 'hall', 'warehouse', 'subway', 'laboratory'];

/**
 * Gestionnaire du mode Challenge Quotidien
 */
export class DailyChallengeManager {
  private scene: Phaser.Scene;
  private config: DailyChallengeConfig | null = null;
  private isActive: boolean = false;
  private startTime: number = 0;
  private totalScore: number = 0;
  private totalKills: number = 0;
  private maxWave: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Génère la seed du jour à partir de la date
   */
  public static getDailySeed(): number {
    const today = new Date().toISOString().split('T')[0];
    return DailyChallengeManager.hashString(today + 'zombie-hunter-daily');
  }

  /**
   * Hash une chaîne en nombre
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Obtient la date du jour au format YYYY-MM-DD
   */
  public static getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Génère la configuration du challenge quotidien
   */
  public static generateDailyConfig(): DailyChallengeConfig {
    const seed = DailyChallengeManager.getDailySeed();
    const date = DailyChallengeManager.getTodayDate();

    // Générateur pseudo-aléatoire basé sur la seed
    const random = DailyChallengeManager.createSeededRandom(seed);

    // Sélectionner une arène
    const arenaIndex = Math.floor(random() * DAILY_ARENAS.length);
    const arena = DAILY_ARENAS[arenaIndex];

    // Sélectionner 2 modificateurs
    const shuffledModifiers = [...AVAILABLE_MODIFIERS].sort(() => random() - 0.5);
    const selectedModifiers = shuffledModifiers.slice(0, 2);

    // Configuration de base
    const config: DailyChallengeConfig = {
      type: 'daily',
      date,
      seed,
      arena,
      modifiers: selectedModifiers,
      damageMultiplier: 1.0,
      healthMultiplier: 1.0,
      speedMultiplier: 1.0,
      spawnRateMultiplier: 1.0,
    };

    // Appliquer les modificateurs
    for (const modifier of selectedModifiers) {
      modifier.apply(config);
    }

    return config;
  }

  /**
   * Crée un générateur pseudo-aléatoire à partir d'une seed
   */
  private static createSeededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }

  /**
   * Initialise le manager avec la configuration du jour
   */
  public initialize(): boolean {
    this.config = DailyChallengeManager.generateDailyConfig();
    this.isActive = true;
    this.startTime = Date.now();
    this.totalScore = 0;
    this.totalKills = 0;
    this.maxWave = 0;

    console.log(`[DailyChallengeManager] Initialized daily challenge:`, {
      date: this.config.date,
      arena: this.config.arena,
      modifiers: this.config.modifiers.map((m) => m.name),
    });

    this.setupEventListeners();
    return true;
  }

  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    this.scene.events.on('zombieDeath', this.onZombieKilled, this);
    this.scene.events.on('scoreUpdate', this.onScoreUpdate, this);
    this.scene.events.on('waveComplete', this.onWaveComplete, this);
  }

  /**
   * Nettoie les écouteurs d'événements
   */
  private cleanupEventListeners(): void {
    this.scene.events.off('zombieDeath', this.onZombieKilled, this);
    this.scene.events.off('scoreUpdate', this.onScoreUpdate, this);
    this.scene.events.off('waveComplete', this.onWaveComplete, this);
  }

  /**
   * Obtient la configuration actuelle
   */
  public getConfig(): DailyChallengeConfig | null {
    return this.config;
  }

  /**
   * Obtient les modificateurs actifs
   */
  public getModifiers(): ChallengeModifier[] {
    return this.config?.modifiers || [];
  }

  /**
   * Obtient le multiplicateur de dégâts
   */
  public getDamageMultiplier(): number {
    return this.config?.damageMultiplier || 1.0;
  }

  /**
   * Obtient le multiplicateur de santé (pour les soins)
   */
  public getHealthMultiplier(): number {
    return this.config?.healthMultiplier || 1.0;
  }

  /**
   * Obtient le multiplicateur de vitesse
   */
  public getSpeedMultiplier(): number {
    return this.config?.speedMultiplier || 1.0;
  }

  /**
   * Obtient le multiplicateur de spawn
   */
  public getSpawnRateMultiplier(): number {
    return this.config?.spawnRateMultiplier || 1.0;
  }

  /**
   * Gestion d'un zombie tué
   */
  private onZombieKilled = (): void => {
    this.totalKills++;
  };

  /**
   * Gestion de la mise à jour du score
   */
  private onScoreUpdate = (score: number): void => {
    this.totalScore = score;
  };

  /**
   * Gestion de la fin d'une vague
   */
  private onWaveComplete = (wave: number): void => {
    this.maxWave = Math.max(this.maxWave, wave);
  };

  /**
   * Fin de la partie (défaite)
   */
  public onGameOver(): void {
    if (!this.isActive || !this.config) return;
    this.isActive = false;

    const date = this.config.date;
    const elapsed = this.getElapsedTime();

    // Sauvegarder le score
    const saveManager = SaveManager.getInstance();
    const isNewHighScore = saveManager.updateDailyChallengeScore(date, {
      score: this.totalScore,
      wave: this.maxWave,
    });
    saveManager.save();

    // Émettre l'événement de fin
    this.scene.events.emit('dailyChallengeEnd', {
      date,
      score: this.totalScore,
      wave: this.maxWave,
      kills: this.totalKills,
      time: elapsed,
      isNewHighScore,
    });

    console.log(`[DailyChallengeManager] Challenge ended. Score: ${this.totalScore}, Wave: ${this.maxWave}`);
  }

  /**
   * Vérifie si le joueur a déjà tenté le challenge aujourd'hui
   */
  public static hasPlayedToday(): boolean {
    const today = DailyChallengeManager.getTodayDate();
    const saveManager = SaveManager.getInstance();
    return saveManager.getDailyChallengeScore(today) !== null;
  }

  /**
   * Obtient le meilleur score du jour
   */
  public static getTodayHighScore(): { score: number; wave: number } | null {
    const today = DailyChallengeManager.getTodayDate();
    const saveManager = SaveManager.getInstance();
    return saveManager.getDailyChallengeScore(today);
  }

  /**
   * Obtient le temps écoulé en secondes
   */
  public getElapsedTime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Vérifie si le mode daily est actif
   */
  public isActiveChallenge(): boolean {
    return this.isActive;
  }

  /**
   * Obtient le score actuel
   */
  public getScore(): number {
    return this.totalScore;
  }

  /**
   * Obtient le nombre de kills
   */
  public getKills(): number {
    return this.totalKills;
  }

  /**
   * Obtient la vague max atteinte
   */
  public getMaxWave(): number {
    return this.maxWave;
  }

  /**
   * Détruit le manager
   */
  public destroy(): void {
    this.cleanupEventListeners();
    this.isActive = false;
    this.config = null;
  }
}
