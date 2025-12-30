/**
 * Types et interfaces pour les modes de jeu (Phase 8.2)
 */

/**
 * Types de modes de jeu disponibles
 */
export type GameModeType = 'survival' | 'campaign' | 'daily';

/**
 * Configuration de base d'un mode de jeu
 */
export interface GameModeConfig {
  id: GameModeType;
  name: string;
  description: string;
  icon: string;
  available: boolean;
  comingSoon?: boolean;
}

/**
 * Configuration du mode Survie
 */
export interface SurvivalModeConfig {
  type: 'survival';
  infiniteWaves: true;
  trackHighScore: true;
  difficulty?: 'easy' | 'normal' | 'hard';
}

/**
 * Types d'objectifs pour le mode Campagne
 */
export type ObjectiveType = 'survive' | 'kill' | 'protect' | 'collect' | 'time' | 'boss';

/**
 * Objectif de niveau
 */
export interface Objective {
  type: ObjectiveType;
  target: number;
  description: string;
  current?: number;
  completed?: boolean;
}

/**
 * Configuration d'un niveau de campagne
 */
export interface CampaignLevel {
  id: string;
  name: string;
  arena: string;
  objectives: Objective[];
  waves: number;
  starThresholds: [number, number, number];
  unlockCondition: string | null;
  narrative?: string;
  narrativeEnd?: string;
  rewards?: {
    xp: number;
    unlocks?: string[];
  };
}

/**
 * Configuration du mode Campagne
 */
export interface CampaignModeConfig {
  type: 'campaign';
  levelId: string;
  level: CampaignLevel;
}

/**
 * Modificateur pour le challenge quotidien
 */
export interface ChallengeModifier {
  id: string;
  name: string;
  description: string;
  apply: (config: DailyChallengeConfig) => void;
}

/**
 * Configuration du challenge quotidien
 */
export interface DailyChallengeConfig {
  type: 'daily';
  date: string;
  seed: number;
  arena: string;
  modifiers: ChallengeModifier[];
  character?: string;
  startingWeapon?: string;
  damageMultiplier: number;
  healthMultiplier: number;
  speedMultiplier: number;
  spawnRateMultiplier: number;
}

/**
 * Union des configurations de mode
 */
export type ModeConfig = SurvivalModeConfig | CampaignModeConfig | DailyChallengeConfig;

/**
 * Données passées à GameScene
 */
export interface GameSceneData {
  mode: ModeConfig;
  character?: string;
}

/**
 * High scores par mode
 */
export interface ModeHighScores {
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
 * Progression de la campagne
 */
export interface CampaignProgress {
  currentLevel: string;
  completedLevels: string[];
  levelStars: Record<string, number>;
  totalStars: number;
}

/**
 * Résultat d'une partie
 */
export interface GameResult {
  mode: GameModeType;
  isVictory: boolean;
  score: number;
  wave: number;
  kills: number;
  time: number;
  xpEarned: number;
  isNewHighScore?: boolean;
  starsEarned?: number;
  objectivesCompleted?: number;
}
