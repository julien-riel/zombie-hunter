/**
 * Gestionnaire de sauvegarde (Phase 6.7)
 *
 * Gère la persistance des données de progression via localStorage.
 * Supporte le versioning pour les migrations futures.
 */

import { PROGRESSION } from '@config/progression';

/**
 * Statistiques de jeu globales
 */
export interface GameStats {
  totalKills: number;
  totalDeaths: number;
  highestWave: number;
  totalPlayTime: number; // en secondes
  gamesPlayed: number;
  killsByZombieType: Record<string, number>;
  killsByWeaponType: Record<string, number>;
}

/**
 * High scores par mode de jeu (Phase 8.2)
 */
export interface ModeHighScoresData {
  survival: {
    wave: number;
    score: number;
    kills: number;
    time: number;
    date: string;
  };
  campaign: Record<string, {
    stars: number;
    score: number;
    completed: boolean;
    date: string;
  }>;
  daily: Record<string, {
    score: number;
    wave: number;
    date: string;
  }>;
}

/**
 * Progression de la campagne (Phase 8.2)
 */
export interface CampaignProgressData {
  currentLevel: string;
  completedLevels: string[];
  levelStars: Record<string, number>;
  totalStars: number;
}

/**
 * Données de progression des upgrades permanents
 */
export interface ProgressionData {
  totalXP: number;
  spentXP: number;
  upgrades: Record<string, number>; // id -> niveau
}

/**
 * Données de déblocages
 */
export interface UnlockData {
  characters: string[]; // IDs des personnages débloqués
  weapons: string[]; // IDs des armes débloquées
  activeItems: string[]; // IDs des objets actifs débloqués
  achievements: string[]; // IDs des succès débloqués
}

/**
 * Paramètres du jeu
 */
export interface SettingsData {
  musicVolume: number;
  sfxVolume: number;
  ddaEnabled: boolean;
  showTutorials: boolean;
}

/**
 * Structure complète de la sauvegarde
 */
export interface SaveData {
  version: string;
  lastSaved: number; // timestamp
  progression: ProgressionData;
  unlocks: UnlockData;
  stats: GameStats;
  settings: SettingsData;
  modeHighScores: ModeHighScoresData;
  campaignProgress: CampaignProgressData;
}

/**
 * Données par défaut pour une nouvelle sauvegarde
 */
const DEFAULT_SAVE_DATA: SaveData = {
  version: PROGRESSION.saveVersion,
  lastSaved: 0,
  progression: {
    totalXP: 0,
    spentXP: 0,
    upgrades: {},
  },
  unlocks: {
    characters: [],
    weapons: [],
    activeItems: [],
    achievements: [],
  },
  stats: {
    totalKills: 0,
    totalDeaths: 0,
    highestWave: 0,
    totalPlayTime: 0,
    gamesPlayed: 0,
    killsByZombieType: {},
    killsByWeaponType: {},
  },
  settings: {
    musicVolume: 0.7,
    sfxVolume: 0.8,
    ddaEnabled: true,
    showTutorials: true,
  },
  modeHighScores: {
    survival: {
      wave: 0,
      score: 0,
      kills: 0,
      time: 0,
      date: '',
    },
    campaign: {},
    daily: {},
  },
  campaignProgress: {
    currentLevel: 'level_1',
    completedLevels: [],
    levelStars: {},
    totalStars: 0,
  },
};

/**
 * Gestionnaire de sauvegarde
 * Singleton pour accès global
 */
export class SaveManager {
  private static instance: SaveManager | null = null;
  private data: SaveData;
  private isDirty: boolean = false;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.data = this.load() || this.createNewSave();
  }

  /**
   * Obtient l'instance singleton du SaveManager
   */
  public static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  /**
   * Réinitialise l'instance (pour les tests)
   */
  public static resetInstance(): void {
    if (SaveManager.instance) {
      SaveManager.instance.stopAutoSave();
    }
    SaveManager.instance = null;
  }

  /**
   * Crée une nouvelle sauvegarde avec les valeurs par défaut
   */
  private createNewSave(): SaveData {
    const newData = JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA)) as SaveData;
    newData.lastSaved = Date.now();
    return newData;
  }

  /**
   * Charge les données depuis localStorage
   */
  public load(): SaveData | null {
    try {
      const saved = localStorage.getItem(PROGRESSION.saveKey);
      if (!saved) {
        console.log('[SaveManager] No existing save found');
        return null;
      }

      const parsed = JSON.parse(saved) as SaveData;

      // Vérifier et migrer si nécessaire
      const migrated = this.migrate(parsed);

      console.log('[SaveManager] Save loaded successfully', {
        version: migrated.version,
        totalXP: migrated.progression.totalXP,
        gamesPlayed: migrated.stats.gamesPlayed,
      });

      return migrated;
    } catch (error) {
      console.error('[SaveManager] Failed to load save:', error);
      return null;
    }
  }

  /**
   * Sauvegarde les données dans localStorage
   */
  public save(): boolean {
    try {
      this.data.lastSaved = Date.now();
      localStorage.setItem(PROGRESSION.saveKey, JSON.stringify(this.data));
      this.isDirty = false;
      console.log('[SaveManager] Save successful');
      return true;
    } catch (error) {
      console.error('[SaveManager] Failed to save:', error);
      return false;
    }
  }

  /**
   * Marque les données comme modifiées
   */
  public markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Vérifie si des modifications sont en attente
   */
  public hasPendingChanges(): boolean {
    return this.isDirty;
  }

  /**
   * Sauvegarde si des modifications sont en attente
   */
  public saveIfDirty(): boolean {
    if (this.isDirty) {
      return this.save();
    }
    return true;
  }

  /**
   * Démarre l'auto-sauvegarde périodique
   */
  public startAutoSave(intervalMs: number = 30000): void {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      this.saveIfDirty();
    }, intervalMs);
    console.log(`[SaveManager] Auto-save started (every ${intervalMs}ms)`);
  }

  /**
   * Arrête l'auto-sauvegarde
   */
  public stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('[SaveManager] Auto-save stopped');
    }
  }

  /**
   * Migre les données vers la version actuelle si nécessaire
   */
  private migrate(data: SaveData): SaveData {
    // Pour l'instant, pas de migration nécessaire
    // Structure pour futures migrations:
    // if (data.version === '0.9.0') {
    //   data = this.migrateFrom090(data);
    // }

    // S'assurer que toutes les propriétés existent (merge avec défaut)
    const migrated = this.deepMerge(DEFAULT_SAVE_DATA, data);
    migrated.version = PROGRESSION.saveVersion;

    return migrated;
  }

  /**
   * Fusionne récursivement deux objets
   */
  private deepMerge<T extends object>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key of Object.keys(source) as (keyof T)[]) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue !== undefined &&
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(targetValue as object, sourceValue as object) as T[keyof T];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[keyof T];
      }
    }

    return result;
  }

  /**
   * Réinitialise toutes les données de sauvegarde
   */
  public reset(): void {
    localStorage.removeItem(PROGRESSION.saveKey);
    this.data = this.createNewSave();
    this.isDirty = false;
    console.log('[SaveManager] Save data reset');
  }

  // ==================== GETTERS ====================

  /**
   * Obtient toutes les données de sauvegarde
   */
  public getData(): SaveData {
    return this.data;
  }

  /**
   * Obtient les données de progression
   */
  public getProgression(): ProgressionData {
    return this.data.progression;
  }

  /**
   * Obtient les données de déblocage
   */
  public getUnlocks(): UnlockData {
    return this.data.unlocks;
  }

  /**
   * Obtient les statistiques
   */
  public getStats(): GameStats {
    return this.data.stats;
  }

  /**
   * Obtient les paramètres
   */
  public getSettings(): SettingsData {
    return this.data.settings;
  }

  // ==================== PROGRESSION ====================

  /**
   * Ajoute de l'XP
   */
  public addXP(amount: number): number {
    this.data.progression.totalXP += amount;
    this.markDirty();
    return this.data.progression.totalXP;
  }

  /**
   * Dépense de l'XP
   */
  public spendXP(amount: number): boolean {
    const available = this.data.progression.totalXP - this.data.progression.spentXP;
    if (available < amount) {
      return false;
    }
    this.data.progression.spentXP += amount;
    this.markDirty();
    return true;
  }

  /**
   * Obtient l'XP disponible
   */
  public getAvailableXP(): number {
    return this.data.progression.totalXP - this.data.progression.spentXP;
  }

  /**
   * Obtient le niveau d'un upgrade
   */
  public getUpgradeLevel(upgradeId: string): number {
    return this.data.progression.upgrades[upgradeId] || 0;
  }

  /**
   * Définit le niveau d'un upgrade
   */
  public setUpgradeLevel(upgradeId: string, level: number): void {
    this.data.progression.upgrades[upgradeId] = level;
    this.markDirty();
  }

  // ==================== UNLOCKS ====================

  /**
   * Vérifie si un élément est débloqué
   */
  public isUnlocked(id: string): boolean {
    return (
      this.data.unlocks.characters.includes(id) ||
      this.data.unlocks.weapons.includes(id) ||
      this.data.unlocks.activeItems.includes(id) ||
      this.data.unlocks.achievements.includes(id)
    );
  }

  /**
   * Débloque un personnage
   */
  public unlockCharacter(id: string): boolean {
    if (this.data.unlocks.characters.includes(id)) return false;
    this.data.unlocks.characters.push(id);
    this.markDirty();
    return true;
  }

  /**
   * Débloque une arme
   */
  public unlockWeapon(id: string): boolean {
    if (this.data.unlocks.weapons.includes(id)) return false;
    this.data.unlocks.weapons.push(id);
    this.markDirty();
    return true;
  }

  /**
   * Débloque un objet actif
   */
  public unlockActiveItem(id: string): boolean {
    if (this.data.unlocks.activeItems.includes(id)) return false;
    this.data.unlocks.activeItems.push(id);
    this.markDirty();
    return true;
  }

  /**
   * Débloque un succès
   */
  public unlockAchievement(id: string): boolean {
    if (this.data.unlocks.achievements.includes(id)) return false;
    this.data.unlocks.achievements.push(id);
    this.markDirty();
    return true;
  }

  // ==================== STATS ====================

  /**
   * Incrémente le compteur de kills
   */
  public addKills(count: number, zombieType?: string, weaponType?: string): void {
    this.data.stats.totalKills += count;

    if (zombieType) {
      this.data.stats.killsByZombieType[zombieType] =
        (this.data.stats.killsByZombieType[zombieType] || 0) + count;
    }

    if (weaponType) {
      this.data.stats.killsByWeaponType[weaponType] =
        (this.data.stats.killsByWeaponType[weaponType] || 0) + count;
    }

    this.markDirty();
  }

  /**
   * Incrémente le compteur de morts
   */
  public addDeath(): void {
    this.data.stats.totalDeaths++;
    this.markDirty();
  }

  /**
   * Met à jour la vague la plus haute
   */
  public updateHighestWave(wave: number): boolean {
    if (wave > this.data.stats.highestWave) {
      this.data.stats.highestWave = wave;
      this.markDirty();
      return true;
    }
    return false;
  }

  /**
   * Ajoute du temps de jeu
   */
  public addPlayTime(seconds: number): void {
    this.data.stats.totalPlayTime += seconds;
    this.markDirty();
  }

  /**
   * Incrémente le nombre de parties jouées
   */
  public incrementGamesPlayed(): void {
    this.data.stats.gamesPlayed++;
    this.markDirty();
  }

  // ==================== SETTINGS ====================

  /**
   * Met à jour un paramètre
   */
  public updateSetting<K extends keyof SettingsData>(key: K, value: SettingsData[K]): void {
    this.data.settings[key] = value;
    this.markDirty();
  }

  // ==================== MODE HIGH SCORES (Phase 8.2) ====================

  /**
   * Obtient les high scores par mode
   */
  public getModeHighScores(): ModeHighScoresData {
    return this.data.modeHighScores;
  }

  /**
   * Obtient le high score du mode survie
   */
  public getSurvivalHighScore(): ModeHighScoresData['survival'] {
    return this.data.modeHighScores.survival;
  }

  /**
   * Met à jour le high score du mode survie
   * @returns true si c'est un nouveau record
   */
  public updateSurvivalHighScore(data: {
    wave: number;
    score: number;
    kills: number;
    time: number;
  }): boolean {
    const current = this.data.modeHighScores.survival;
    const isNewHighScore = data.score > current.score;

    if (isNewHighScore) {
      this.data.modeHighScores.survival = {
        ...data,
        date: new Date().toISOString(),
      };
      this.markDirty();
    }

    return isNewHighScore;
  }

  /**
   * Obtient le résultat d'un niveau de campagne
   */
  public getCampaignLevelResult(levelId: string): ModeHighScoresData['campaign'][string] | null {
    return this.data.modeHighScores.campaign[levelId] || null;
  }

  /**
   * Met à jour le résultat d'un niveau de campagne
   * @returns true si c'est une amélioration
   */
  public updateCampaignLevelResult(
    levelId: string,
    data: { stars: number; score: number; completed: boolean }
  ): boolean {
    const current = this.data.modeHighScores.campaign[levelId];
    const isImprovement = !current || data.score > current.score || data.stars > current.stars;

    if (isImprovement) {
      this.data.modeHighScores.campaign[levelId] = {
        stars: Math.max(data.stars, current?.stars || 0),
        score: Math.max(data.score, current?.score || 0),
        completed: data.completed || current?.completed || false,
        date: new Date().toISOString(),
      };
      this.markDirty();
    }

    return isImprovement;
  }

  /**
   * Obtient le score du défi quotidien pour une date
   */
  public getDailyChallengeScore(date: string): ModeHighScoresData['daily'][string] | null {
    return this.data.modeHighScores.daily[date] || null;
  }

  /**
   * Met à jour le score du défi quotidien
   * @returns true si c'est un nouveau record pour cette date
   */
  public updateDailyChallengeScore(date: string, data: { score: number; wave: number }): boolean {
    const current = this.data.modeHighScores.daily[date];
    const isNewHighScore = !current || data.score > current.score;

    if (isNewHighScore) {
      this.data.modeHighScores.daily[date] = {
        ...data,
        date: new Date().toISOString(),
      };
      this.markDirty();
    }

    return isNewHighScore;
  }

  // ==================== CAMPAIGN PROGRESS (Phase 8.2) ====================

  /**
   * Obtient la progression de la campagne
   */
  public getCampaignProgress(): CampaignProgressData {
    return this.data.campaignProgress;
  }

  /**
   * Vérifie si un niveau est débloqué
   */
  public isLevelUnlocked(levelId: string): boolean {
    // Le premier niveau est toujours débloqué
    if (levelId === 'level_1') return true;
    // Les autres sont débloqués si le niveau précédent est complété
    return this.data.campaignProgress.completedLevels.includes(levelId);
  }

  /**
   * Marque un niveau comme complété
   */
  public completeLevel(levelId: string, stars: number): void {
    if (!this.data.campaignProgress.completedLevels.includes(levelId)) {
      this.data.campaignProgress.completedLevels.push(levelId);
    }

    // Mettre à jour les étoiles si c'est mieux
    const currentStars = this.data.campaignProgress.levelStars[levelId] || 0;
    if (stars > currentStars) {
      this.data.campaignProgress.levelStars[levelId] = stars;
      this.data.campaignProgress.totalStars += (stars - currentStars);
    }

    this.markDirty();
  }

  /**
   * Obtient le nombre total d'étoiles
   */
  public getTotalCampaignStars(): number {
    return this.data.campaignProgress.totalStars;
  }

  /**
   * Obtient les étoiles d'un niveau
   */
  public getLevelStars(levelId: string): number {
    return this.data.campaignProgress.levelStars[levelId] || 0;
  }
}
