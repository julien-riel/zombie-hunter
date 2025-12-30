/**
 * Configuration des upgrades roguelite (Phase 6.5)
 *
 * Catégories:
 * - weapon: Dégâts, cadence, capacité, rechargement
 * - defense: Santé max, armure, régénération
 * - mobility: Vitesse, dash cooldown, distance dash
 * - utility: Portée ramassage, durée power-ups
 * - special: Effets uniques
 */

/**
 * Rareté des upgrades
 */
export type UpgradeRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Catégorie d'upgrade
 */
export type UpgradeCategory = 'weapon' | 'defense' | 'mobility' | 'utility' | 'special';

/**
 * Interface pour les stats du joueur modifiables par upgrades
 */
export interface PlayerUpgradeStats {
  // Armes
  damageMultiplier: number;
  fireRateMultiplier: number;
  reloadSpeedMultiplier: number;
  magazineSizeMultiplier: number;
  piercing: number;
  explosiveRounds: boolean;

  // Défense
  maxHealthBonus: number;
  damageReduction: number;
  healthRegen: number;
  secondWind: boolean;
  secondWindUsed: boolean;

  // Mobilité
  speedMultiplier: number;
  dashCooldownMultiplier: number;
  dashDistanceMultiplier: number;
  dashCharges: number;

  // Utilitaire
  pickupRangeMultiplier: number;
  powerUpDurationMultiplier: number;
  dropChanceBonus: number;
}

/**
 * Valeurs par défaut des stats
 */
export const DEFAULT_PLAYER_STATS: PlayerUpgradeStats = {
  // Armes
  damageMultiplier: 1,
  fireRateMultiplier: 1,
  reloadSpeedMultiplier: 1,
  magazineSizeMultiplier: 1,
  piercing: 0,
  explosiveRounds: false,

  // Défense
  maxHealthBonus: 0,
  damageReduction: 0,
  healthRegen: 0,
  secondWind: false,
  secondWindUsed: false,

  // Mobilité
  speedMultiplier: 1,
  dashCooldownMultiplier: 1,
  dashDistanceMultiplier: 1,
  dashCharges: 1,

  // Utilitaire
  pickupRangeMultiplier: 1,
  powerUpDurationMultiplier: 1,
  dropChanceBonus: 0,
};

/**
 * Définition d'un upgrade
 */
export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  category: UpgradeCategory;
  stackable: boolean;
  maxStacks: number;
  icon: string;
  apply: (stats: PlayerUpgradeStats) => void;
  prerequisites?: string[];
}

/**
 * Configuration de rareté (probabilités et couleurs)
 */
export const RARITY_CONFIG: Record<UpgradeRarity, {
  probability: number;
  color: number;
  textColor: string;
  glowIntensity: number;
}> = {
  common: {
    probability: 0.60,
    color: 0x888888,
    textColor: '#aaaaaa',
    glowIntensity: 0,
  },
  rare: {
    probability: 0.30,
    color: 0x4488ff,
    textColor: '#4488ff',
    glowIntensity: 0.3,
  },
  epic: {
    probability: 0.08,
    color: 0xaa44ff,
    textColor: '#aa44ff',
    glowIntensity: 0.5,
  },
  legendary: {
    probability: 0.02,
    color: 0xffaa00,
    textColor: '#ffaa00',
    glowIntensity: 0.8,
  },
};

/**
 * Couleurs par catégorie
 */
export const CATEGORY_COLORS: Record<UpgradeCategory, number> = {
  weapon: 0xff4444,
  defense: 0x44ff44,
  mobility: 0x44aaff,
  utility: 0xffaa44,
  special: 0xff44ff,
};

/**
 * Icônes par catégorie (caractères unicode simples)
 */
export const CATEGORY_ICONS: Record<UpgradeCategory, string> = {
  weapon: '⚔',
  defense: '🛡',
  mobility: '👟',
  utility: '🔧',
  special: '✨',
};

/**
 * Définitions de tous les upgrades
 */
export const UPGRADES: UpgradeDefinition[] = [
  // ========== ARMES (weapon) ==========
  {
    id: 'damage_boost_1',
    name: 'Munitions renforcées',
    description: '+10% de dégâts',
    rarity: 'common',
    category: 'weapon',
    stackable: true,
    maxStacks: 5,
    icon: '💥',
    apply: (stats) => { stats.damageMultiplier += 0.1; },
  },
  {
    id: 'fire_rate_1',
    name: 'Doigts agiles',
    description: '+15% cadence de tir',
    rarity: 'rare',
    category: 'weapon',
    stackable: true,
    maxStacks: 3,
    icon: '🔥',
    apply: (stats) => { stats.fireRateMultiplier += 0.15; },
  },
  {
    id: 'reload_speed_1',
    name: 'Rechargement rapide',
    description: '+20% vitesse de rechargement',
    rarity: 'common',
    category: 'weapon',
    stackable: true,
    maxStacks: 3,
    icon: '⚡',
    apply: (stats) => { stats.reloadSpeedMultiplier += 0.2; },
  },
  {
    id: 'magazine_size_1',
    name: 'Chargeur étendu',
    description: '+25% capacité du chargeur',
    rarity: 'rare',
    category: 'weapon',
    stackable: true,
    maxStacks: 3,
    icon: '📦',
    apply: (stats) => { stats.magazineSizeMultiplier += 0.25; },
  },
  {
    id: 'piercing_rounds',
    name: 'Balles perforantes',
    description: 'Les balles traversent 1 ennemi',
    rarity: 'epic',
    category: 'weapon',
    stackable: true,
    maxStacks: 3,
    icon: '➡',
    apply: (stats) => { stats.piercing += 1; },
  },
  {
    id: 'explosive_rounds',
    name: 'Munitions explosives',
    description: 'Les balles explosent au contact',
    rarity: 'legendary',
    category: 'weapon',
    stackable: false,
    maxStacks: 1,
    icon: '💣',
    apply: (stats) => { stats.explosiveRounds = true; },
  },
  {
    id: 'critical_boost',
    name: 'Visée précise',
    description: '+15% de dégâts critiques',
    rarity: 'rare',
    category: 'weapon',
    stackable: true,
    maxStacks: 4,
    icon: '🎯',
    apply: (stats) => { stats.damageMultiplier += 0.15; },
  },

  // ========== DÉFENSE (defense) ==========
  {
    id: 'health_boost_1',
    name: 'Constitution robuste',
    description: '+20 HP max',
    rarity: 'common',
    category: 'defense',
    stackable: true,
    maxStacks: 5,
    icon: '❤',
    apply: (stats) => { stats.maxHealthBonus += 20; },
  },
  {
    id: 'armor_1',
    name: 'Gilet pare-balles',
    description: '-10% dégâts reçus',
    rarity: 'rare',
    category: 'defense',
    stackable: true,
    maxStacks: 4,
    icon: '🛡',
    apply: (stats) => { stats.damageReduction += 0.1; },
  },
  {
    id: 'regen_1',
    name: 'Régénération',
    description: '+1 HP toutes les 5 secondes',
    rarity: 'rare',
    category: 'defense',
    stackable: true,
    maxStacks: 3,
    icon: '💚',
    apply: (stats) => { stats.healthRegen += 0.2; },
  },
  {
    id: 'second_wind',
    name: 'Second souffle',
    description: 'Survit à un coup fatal (1x par vague)',
    rarity: 'legendary',
    category: 'defense',
    stackable: false,
    maxStacks: 1,
    icon: '🌟',
    apply: (stats) => { stats.secondWind = true; },
  },
  {
    id: 'tough_skin',
    name: 'Peau épaisse',
    description: '-5% dégâts reçus',
    rarity: 'common',
    category: 'defense',
    stackable: true,
    maxStacks: 6,
    icon: '🧱',
    apply: (stats) => { stats.damageReduction += 0.05; },
  },

  // ========== MOBILITÉ (mobility) ==========
  {
    id: 'speed_boost_1',
    name: 'Jambes légères',
    description: '+10% vitesse de déplacement',
    rarity: 'common',
    category: 'mobility',
    stackable: true,
    maxStacks: 4,
    icon: '👟',
    apply: (stats) => { stats.speedMultiplier += 0.1; },
  },
  {
    id: 'dash_cooldown_1',
    name: 'Récupération rapide',
    description: '-15% cooldown du dash',
    rarity: 'rare',
    category: 'mobility',
    stackable: true,
    maxStacks: 3,
    icon: '⏱',
    apply: (stats) => { stats.dashCooldownMultiplier -= 0.15; },
  },
  {
    id: 'dash_distance_1',
    name: 'Élan puissant',
    description: '+20% distance de dash',
    rarity: 'common',
    category: 'mobility',
    stackable: true,
    maxStacks: 3,
    icon: '💨',
    apply: (stats) => { stats.dashDistanceMultiplier += 0.2; },
  },
  {
    id: 'double_dash',
    name: 'Double dash',
    description: '2 charges de dash',
    rarity: 'epic',
    category: 'mobility',
    stackable: false,
    maxStacks: 1,
    icon: '⚡⚡',
    apply: (stats) => { stats.dashCharges = 2; },
  },
  {
    id: 'triple_dash',
    name: 'Triple dash',
    description: '3 charges de dash',
    rarity: 'legendary',
    category: 'mobility',
    stackable: false,
    maxStacks: 1,
    icon: '⚡⚡⚡',
    apply: (stats) => { stats.dashCharges = 3; },
    prerequisites: ['double_dash'],
  },

  // ========== UTILITAIRE (utility) ==========
  {
    id: 'pickup_range_1',
    name: 'Bras longs',
    description: '+50% portée de ramassage',
    rarity: 'common',
    category: 'utility',
    stackable: true,
    maxStacks: 3,
    icon: '🧲',
    apply: (stats) => { stats.pickupRangeMultiplier *= 1.5; },
  },
  {
    id: 'powerup_duration_1',
    name: 'Effet prolongé',
    description: '+25% durée des power-ups',
    rarity: 'rare',
    category: 'utility',
    stackable: true,
    maxStacks: 3,
    icon: '⏰',
    apply: (stats) => { stats.powerUpDurationMultiplier *= 1.25; },
  },
  {
    id: 'lucky_drops',
    name: 'Chanceux',
    description: '+10% de chance de drops',
    rarity: 'rare',
    category: 'utility',
    stackable: true,
    maxStacks: 4,
    icon: '🍀',
    apply: (stats) => { stats.dropChanceBonus += 0.1; },
  },
  {
    id: 'treasure_hunter',
    name: 'Chasseur de trésors',
    description: '+20% de chance de drops rares',
    rarity: 'epic',
    category: 'utility',
    stackable: true,
    maxStacks: 2,
    icon: '💎',
    apply: (stats) => { stats.dropChanceBonus += 0.2; },
  },

  // ========== SPÉCIAL (special) ==========
  {
    id: 'vampiric',
    name: 'Vampirisme',
    description: 'Soigne 1 HP par kill',
    rarity: 'epic',
    category: 'special',
    stackable: true,
    maxStacks: 3,
    icon: '🦇',
    apply: (stats) => { stats.healthRegen += 0.5; }, // Simplified as regen
  },
  {
    id: 'berserker',
    name: 'Berserker',
    description: '+30% dégâts quand HP < 30%',
    rarity: 'epic',
    category: 'special',
    stackable: false,
    maxStacks: 1,
    icon: '😤',
    apply: (stats) => { stats.damageMultiplier += 0.3; }, // Applied conditionally in combat
  },
  {
    id: 'glass_cannon',
    name: 'Canon de verre',
    description: '+50% dégâts, -25% HP max',
    rarity: 'legendary',
    category: 'special',
    stackable: false,
    maxStacks: 1,
    icon: '💀',
    apply: (stats) => {
      stats.damageMultiplier += 0.5;
      stats.maxHealthBonus -= 25;
    },
  },
  {
    id: 'executioner',
    name: 'Exécuteur',
    description: '+100% dégâts aux ennemis < 20% HP',
    rarity: 'legendary',
    category: 'special',
    stackable: false,
    maxStacks: 1,
    icon: '⚰',
    apply: (stats) => { stats.damageMultiplier += 0.2; }, // Simplified
  },
];

/**
 * Récupère un upgrade par son ID
 */
export function getUpgradeById(id: string): UpgradeDefinition | undefined {
  return UPGRADES.find(u => u.id === id);
}

/**
 * Récupère les upgrades par catégorie
 */
export function getUpgradesByCategory(category: UpgradeCategory): UpgradeDefinition[] {
  return UPGRADES.filter(u => u.category === category);
}

/**
 * Récupère les upgrades par rareté
 */
export function getUpgradesByRarity(rarity: UpgradeRarity): UpgradeDefinition[] {
  return UPGRADES.filter(u => u.rarity === rarity);
}

/**
 * Configuration du système d'upgrade
 */
export const UPGRADE_SYSTEM_CONFIG = {
  /** Nombre de choix proposés par sélection */
  choicesPerSelection: 3,
  /** Temps limite pour choisir (en secondes, 0 = pas de limite) */
  selectionTimeLimit: 0,
  /** Afficher la rareté avant de révéler l'upgrade */
  showRarityFirst: false,
  /** Animation de révélation des cartes */
  cardRevealDelay: 200,
};
