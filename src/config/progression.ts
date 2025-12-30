/**
 * Configuration de la progression permanente (Phase 6.7)
 *
 * Ce fichier définit:
 * - L'arbre d'améliorations permanentes
 * - Les conditions de déblocage
 * - La courbe d'XP
 * - Les récompenses
 */

/**
 * Types de catégories d'upgrades permanents
 */
export type PermanentUpgradeCategory = 'combat' | 'survival' | 'utility';

/**
 * Définition d'un upgrade permanent
 */
export interface PermanentUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  category: PermanentUpgradeCategory;
  maxLevel: number;
  xpCostPerLevel: number;
  effectPerLevel: number;
  effectType: 'percentage' | 'flat';
  icon?: string;
  prerequisite?: string; // ID de l'upgrade requis
}

/**
 * Types de déblocages
 */
export type UnlockType = 'character' | 'weapon' | 'activeItem' | 'achievement';

/**
 * Définition d'un déblocage
 */
export interface UnlockDefinition {
  id: string;
  name: string;
  description: string;
  type: UnlockType;
  condition: UnlockCondition;
  icon?: string;
  hidden?: boolean; // Caché jusqu'à déblocage
}

/**
 * Condition de déblocage
 */
export interface UnlockCondition {
  type: 'wave' | 'kills' | 'totalKills' | 'gamesPlayed' | 'killsWithWeapon' | 'surviveTime' | 'achievement';
  value: number;
  weaponType?: string;
  zombieType?: string;
}

/**
 * Configuration de la progression
 */
export const PROGRESSION = {
  // Clé de sauvegarde localStorage
  saveKey: 'zombie-hunter-save',
  saveVersion: '1.0.0',

  // Configuration XP
  xp: {
    // XP de base par vague survivée
    basePerWave: 50,
    // Multiplicateur par numéro de vague (vague 5 = 50 * 5 = 250 XP)
    waveMultiplier: 1.0,
    // XP par kill
    perKill: 2,
    // XP bonus pour score élevé (par tranche de 1000 points)
    perScoreThreshold: 25,
    scoreThreshold: 1000,
    // Multiplicateur de l'XP en fonction du score final
    scoreMultiplierMax: 2.0,
    // XP minimum garantie par partie
    minPerGame: 25,
  },

  // Couleurs par catégorie
  categoryColors: {
    combat: 0xff4444,
    survival: 0x44ff44,
    utility: 0x4444ff,
  } as Record<PermanentUpgradeCategory, number>,

  // Noms des catégories
  categoryNames: {
    combat: 'Combat',
    survival: 'Survie',
    utility: 'Utilitaire',
  } as Record<PermanentUpgradeCategory, string>,
} as const;

/**
 * Définitions des upgrades permanents
 * Organisés par catégorie selon le GDD
 */
export const PERMANENT_UPGRADES: PermanentUpgradeDefinition[] = [
  // ==================== COMBAT ====================
  {
    id: 'perm_damage',
    name: 'Dégâts +5%',
    description: 'Augmente tous les dégâts infligés de 5%',
    category: 'combat',
    maxLevel: 5,
    xpCostPerLevel: 100,
    effectPerLevel: 0.05,
    effectType: 'percentage',
  },
  {
    id: 'perm_fire_rate',
    name: 'Cadence +5%',
    description: 'Augmente la cadence de tir de 5%',
    category: 'combat',
    maxLevel: 3,
    xpCostPerLevel: 150,
    effectPerLevel: 0.05,
    effectType: 'percentage',
    prerequisite: 'perm_damage',
  },
  {
    id: 'perm_crit',
    name: 'Critique +2%',
    description: 'Augmente les chances de coup critique de 2%',
    category: 'combat',
    maxLevel: 5,
    xpCostPerLevel: 200,
    effectPerLevel: 0.02,
    effectType: 'percentage',
    prerequisite: 'perm_fire_rate',
  },

  // ==================== SURVIE ====================
  {
    id: 'perm_health',
    name: 'HP max +10',
    description: 'Augmente les points de vie maximum de 10',
    category: 'survival',
    maxLevel: 5,
    xpCostPerLevel: 100,
    effectPerLevel: 10,
    effectType: 'flat',
  },
  {
    id: 'perm_regen',
    name: 'Régénération +0.5/s',
    description: 'Régénère 0.5 HP par seconde',
    category: 'survival',
    maxLevel: 3,
    xpCostPerLevel: 175,
    effectPerLevel: 0.5,
    effectType: 'flat',
    prerequisite: 'perm_health',
  },
  {
    id: 'perm_armor',
    name: 'Armure +5%',
    description: 'Réduit les dégâts reçus de 5%',
    category: 'survival',
    maxLevel: 3,
    xpCostPerLevel: 200,
    effectPerLevel: 0.05,
    effectType: 'percentage',
    prerequisite: 'perm_regen',
  },

  // ==================== UTILITAIRE ====================
  {
    id: 'perm_pickup',
    name: 'Ramassage +10%',
    description: 'Augmente le rayon de ramassage des items de 10%',
    category: 'utility',
    maxLevel: 5,
    xpCostPerLevel: 75,
    effectPerLevel: 0.10,
    effectType: 'percentage',
  },
  {
    id: 'perm_powerup_duration',
    name: 'Durée Power-ups +10%',
    description: 'Augmente la durée des power-ups de 10%',
    category: 'utility',
    maxLevel: 3,
    xpCostPerLevel: 125,
    effectPerLevel: 0.10,
    effectType: 'percentage',
    prerequisite: 'perm_pickup',
  },
  {
    id: 'perm_points',
    name: 'Points +10%',
    description: 'Augmente les points gagnés de 10%',
    category: 'utility',
    maxLevel: 5,
    xpCostPerLevel: 150,
    effectPerLevel: 0.10,
    effectType: 'percentage',
    prerequisite: 'perm_powerup_duration',
  },
];

/**
 * Définitions des déblocages
 */
export const UNLOCKS: UnlockDefinition[] = [
  // ==================== PERSONNAGES ====================
  {
    id: 'char_runner',
    name: 'Runner',
    description: 'Personnage rapide avec dash amélioré',
    type: 'character',
    condition: { type: 'wave', value: 10 },
  },
  {
    id: 'char_medic',
    name: 'Médecin',
    description: 'Personnage avec régénération passive',
    type: 'character',
    condition: { type: 'gamesPlayed', value: 5 },
  },
  {
    id: 'char_tank',
    name: 'Tank',
    description: 'Personnage avec plus de vie mais plus lent',
    type: 'character',
    condition: { type: 'wave', value: 20 },
    hidden: true,
  },
  {
    id: 'char_assassin',
    name: 'Assassin',
    description: 'Personnage avec dégâts critiques améliorés',
    type: 'character',
    condition: { type: 'totalKills', value: 1000 },
    hidden: true,
  },

  // ==================== ARMES DE DÉPART ====================
  {
    id: 'weapon_shotgun',
    name: 'Shotgun',
    description: 'Arme de départ: Shotgun',
    type: 'weapon',
    condition: { type: 'killsWithWeapon', value: 100, weaponType: 'pistol' },
  },
  {
    id: 'weapon_smg',
    name: 'SMG',
    description: 'Arme de départ: SMG',
    type: 'weapon',
    condition: { type: 'killsWithWeapon', value: 100, weaponType: 'shotgun' },
  },
  {
    id: 'weapon_sniper',
    name: 'Sniper',
    description: 'Arme de départ: Sniper',
    type: 'weapon',
    condition: { type: 'wave', value: 15 },
  },

  // ==================== OBJETS ACTIFS ====================
  {
    id: 'item_drone',
    name: 'Drone de départ',
    description: 'Commencer avec un Drone d\'attaque',
    type: 'activeItem',
    condition: { type: 'totalKills', value: 500 },
  },
  {
    id: 'item_mine',
    name: 'Mines de départ',
    description: 'Commencer avec 3 Mines de proximité',
    type: 'activeItem',
    condition: { type: 'wave', value: 8 },
  },

  // ==================== SUCCÈS ====================
  {
    id: 'achievement_survivor',
    name: 'Survivant',
    description: 'Atteindre la vague 10',
    type: 'achievement',
    condition: { type: 'wave', value: 10 },
  },
  {
    id: 'achievement_veteran',
    name: 'Vétéran',
    description: 'Atteindre la vague 25',
    type: 'achievement',
    condition: { type: 'wave', value: 25 },
    hidden: true,
  },
  {
    id: 'achievement_slayer',
    name: 'Tueur',
    description: 'Tuer 100 zombies en une partie',
    type: 'achievement',
    condition: { type: 'kills', value: 100 },
  },
  {
    id: 'achievement_exterminator',
    name: 'Exterminateur',
    description: 'Tuer 500 zombies en une partie',
    type: 'achievement',
    condition: { type: 'kills', value: 500 },
    hidden: true,
  },
  {
    id: 'achievement_persistent',
    name: 'Persévérant',
    description: 'Jouer 10 parties',
    type: 'achievement',
    condition: { type: 'gamesPlayed', value: 10 },
  },
  {
    id: 'achievement_dedicated',
    name: 'Dévoué',
    description: 'Jouer 50 parties',
    type: 'achievement',
    condition: { type: 'gamesPlayed', value: 50 },
    hidden: true,
  },
];

/**
 * Helper pour obtenir un upgrade par son ID
 */
export function getPermanentUpgradeById(id: string): PermanentUpgradeDefinition | undefined {
  return PERMANENT_UPGRADES.find((u) => u.id === id);
}

/**
 * Helper pour obtenir un déblocage par son ID
 */
export function getUnlockById(id: string): UnlockDefinition | undefined {
  return UNLOCKS.find(u => u.id === id);
}

/**
 * Helper pour obtenir les upgrades par catégorie
 */
export function getUpgradesByCategory(category: PermanentUpgradeCategory): PermanentUpgradeDefinition[] {
  return PERMANENT_UPGRADES.filter((u) => u.category === category);
}

/**
 * Helper pour obtenir les déblocages par type
 */
export function getUnlocksByType(type: UnlockType): UnlockDefinition[] {
  return UNLOCKS.filter((u) => u.type === type);
}

/**
 * Calcule le coût total d'XP pour un niveau d'upgrade
 */
export function getUpgradeCost(upgrade: PermanentUpgradeDefinition, currentLevel: number): number {
  if (currentLevel >= upgrade.maxLevel) return Infinity;
  // Coût croissant: base * (niveau + 1)
  return upgrade.xpCostPerLevel * (currentLevel + 1);
}

/**
 * Calcule l'XP totale nécessaire pour maxer un upgrade
 */
export function getTotalUpgradeCost(upgrade: PermanentUpgradeDefinition): number {
  let total = 0;
  for (let i = 0; i < upgrade.maxLevel; i++) {
    total += upgrade.xpCostPerLevel * (i + 1);
  }
  return total;
}
