/**
 * Métriques dérivées pour l'équilibrage du jeu.
 * Ces valeurs sont calculées automatiquement à partir des stats brutes de balance.ts
 *
 * Framework MDA : Ces métriques permettent de valider objectivement l'équilibrage
 * et d'alimenter le système de budget de menace (ThreatSystem) ainsi que
 * la difficulté adaptative (DDASystem).
 */

import { BALANCE, ZombieBalanceType } from './balance';

/**
 * Types d'armes à feu (supportées par le système de métriques dérivées)
 */
export type FirearmBalanceType = 'pistol' | 'shotgun' | 'smg' | 'sniper';

/**
 * Distances de référence pour les calculs de TTC (Time-to-Contact)
 */
export const REFERENCE_DISTANCES = {
  close: 150, // Combat rapproché
  medium: 300, // Distance moyenne
  door: 500, // Distance typique porte → centre de l'arène
  far: 640, // Distance maximale dans l'arène
} as const;

export type ReferenceDistance = keyof typeof REFERENCE_DISTANCES;

/**
 * Statistiques dérivées pour une arme
 */
export interface DerivedWeaponStats {
  /** DPS brut (sans rechargement) : damage / (fireRate / 1000) */
  rawDPS: number;
  /** DPS soutenu (avec rechargement pris en compte) */
  sustainedDPS: number;
  /** Temps pour vider le chargeur (ms) */
  timeToEmpty: number;
  /** Temps de cycle complet: vider + recharger (ms) */
  cycleTime: number;
  /** Dégâts par cycle complet */
  damagePerCycle: number;
  /** Dégâts par tir (incluant pellets pour shotgun) */
  damagePerShot: number;
}

/**
 * Statistiques dérivées pour un zombie
 */
export interface DerivedZombieStats {
  /** TTK par arme à feu (en secondes) */
  TTKByWeapon: Record<FirearmBalanceType, number>;
  /** TTC par distance de référence (en secondes) */
  TTC: Record<ReferenceDistance, number>;
  /** DPS reçu si contact maintenu: damage / (attackCooldown / 1000) */
  receivedDPS: number;
  /** Score de menace: (receivedDPS) × (1 / TTC_door) × facteur_special */
  threatScore: number;
  /** Coût pour le budget de menace */
  cost: number;
}

/**
 * Facteurs spéciaux par type de zombie pour le calcul du threatScore
 * Ces facteurs représentent la dangerosité "qualitative" au-delà des stats brutes
 *
 * Note: Les zombies comme Screamer/Necromancer ont des stats individuelles faibles
 * mais sont très dangereux pour leurs effets sur les autres zombies.
 * Les facteurs élevés compensent leurs stats de base basses.
 */
const ZOMBIE_SPECIAL_FACTORS: Record<ZombieBalanceType, number> = {
  shambler: 1.0, // Baseline
  runner: 1.3, // Plus rapide, plus difficile à toucher
  crawler: 1.4, // Angle mort, stun
  tank: 2.5, // Résistant, knockback, détruit couvertures, très lent
  spitter: 2.0, // Attaque à distance, force à bouger
  bomber: 2.0, // Explosion, danger de zone
  screamer: 8.0, // Buff alliés, priorité absolue - stats individuelles faibles mais effet dévastateur
  splitter: 1.8, // Se divise, gestion de munitions
  invisible: 2.5, // Difficile à détecter
  necromancer: 10.0, // Ressuscite les morts, fuit le joueur - stats très faibles mais très dangereux
};

/**
 * Rôles des zombies pour les caps de composition
 */
export const ZOMBIE_ROLES: Record<ZombieBalanceType, 'fodder' | 'rusher' | 'tank' | 'ranged' | 'special'> = {
  shambler: 'fodder',
  runner: 'rusher',
  crawler: 'rusher',
  tank: 'tank',
  spitter: 'ranged',
  bomber: 'special',
  screamer: 'special',
  splitter: 'special',
  invisible: 'special',
  necromancer: 'special',
};

/**
 * Calcule les statistiques dérivées d'une arme à feu
 */
export function calculateWeaponDerivedStats(weaponType: FirearmBalanceType): DerivedWeaponStats {
  const stats = BALANCE.weapons[weaponType];
  const fireRateSeconds = stats.fireRate / 1000;

  // Calcul des dégâts par tir (incluant les pellets pour le shotgun)
  const pelletCount = 'pelletCount' in stats ? (stats as typeof BALANCE.weapons.shotgun).pelletCount : 1;
  const damagePerShot = stats.damage * pelletCount;

  // DPS brut: dégâts par seconde en tir continu
  const rawDPS = damagePerShot / fireRateSeconds;

  // Temps pour vider le chargeur
  const timeToEmpty = stats.magazineSize * stats.fireRate;

  // Temps de cycle complet (vider + recharger)
  const cycleTime = timeToEmpty + stats.reloadTime;

  // Dégâts par cycle
  const damagePerCycle = stats.magazineSize * damagePerShot;

  // DPS soutenu: prend en compte le temps de rechargement
  const sustainedDPS = damagePerCycle / (cycleTime / 1000);

  return {
    rawDPS,
    sustainedDPS,
    timeToEmpty,
    cycleTime,
    damagePerCycle,
    damagePerShot,
  };
}

/**
 * Calcule le TTK (Time-to-Kill) d'un zombie avec une arme à feu spécifique
 * @returns Temps en secondes pour tuer le zombie
 */
export function calculateTTK(zombieType: ZombieBalanceType, weaponType: FirearmBalanceType): number {
  const zombieStats = BALANCE.zombies[zombieType];
  const weaponDerived = calculateWeaponDerivedStats(weaponType);

  // TTK = HP / DPS soutenu
  return zombieStats.health / weaponDerived.sustainedDPS;
}

/**
 * Calcule le TTC (Time-to-Contact) d'un zombie depuis une distance
 * @returns Temps en secondes pour atteindre le joueur
 */
export function calculateTTC(zombieType: ZombieBalanceType, distance: number): number {
  const zombieStats = BALANCE.zombies[zombieType];
  let effectiveSpeed = zombieStats.speed;

  // Prise en compte des modificateurs de vitesse spéciaux
  if (zombieType === 'runner' && 'chargeMultiplier' in zombieStats) {
    // Les runners peuvent charger
    const runnerStats = zombieStats as typeof BALANCE.zombies.runner;
    if (distance <= runnerStats.chargeRange) {
      effectiveSpeed *= runnerStats.chargeMultiplier;
    }
  }

  return distance / effectiveSpeed;
}

/** Liste des armes à feu */
const FIREARMS: FirearmBalanceType[] = ['pistol', 'shotgun', 'smg', 'sniper'];

/**
 * Calcule les statistiques dérivées d'un zombie
 */
export function calculateZombieDerivedStats(zombieType: ZombieBalanceType): DerivedZombieStats {
  const stats = BALANCE.zombies[zombieType];

  // Calculer le TTK pour chaque arme à feu
  const TTKByWeapon: Record<FirearmBalanceType, number> = {} as Record<FirearmBalanceType, number>;
  for (const weapon of FIREARMS) {
    TTKByWeapon[weapon] = calculateTTK(zombieType, weapon);
  }

  // Calculer le TTC pour chaque distance de référence
  const TTC: Record<ReferenceDistance, number> = {} as Record<ReferenceDistance, number>;
  for (const [distanceName, distanceValue] of Object.entries(REFERENCE_DISTANCES)) {
    TTC[distanceName as ReferenceDistance] = calculateTTC(zombieType, distanceValue);
  }

  // DPS reçu si contact maintenu
  const receivedDPS = stats.damage / (stats.attackCooldown / 1000);

  // Score de menace: combine DPS, vitesse d'approche et facteur spécial
  // Plus le TTC est bas (zombie rapide), plus le score est élevé
  const ttcDoor = TTC.door;
  const specialFactor = ZOMBIE_SPECIAL_FACTORS[zombieType];
  const threatScore = receivedDPS * (1 / ttcDoor) * specialFactor;

  // Coût pour le budget de menace (normalisé pour que shambler = 1)
  const shamblerThreatScore = calculateShamblerBaseThreatScore();
  const cost = threatScore / shamblerThreatScore;

  return {
    TTKByWeapon,
    TTC,
    receivedDPS,
    threatScore,
    cost,
  };
}

/**
 * Calcule le score de menace de base du Shambler (pour normalisation)
 */
function calculateShamblerBaseThreatScore(): number {
  const stats = BALANCE.zombies.shambler;
  const receivedDPS = stats.damage / (stats.attackCooldown / 1000);
  const ttcDoor = REFERENCE_DISTANCES.door / stats.speed;
  return receivedDPS * (1 / ttcDoor) * ZOMBIE_SPECIAL_FACTORS.shambler;
}

/**
 * Cache des statistiques dérivées pour éviter les recalculs
 */
const weaponStatsCache = new Map<FirearmBalanceType, DerivedWeaponStats>();
const zombieStatsCache = new Map<ZombieBalanceType, DerivedZombieStats>();

/**
 * Récupère les stats dérivées d'une arme à feu (avec cache)
 */
export function getDerivedWeaponStats(weaponType: FirearmBalanceType): DerivedWeaponStats {
  if (!weaponStatsCache.has(weaponType)) {
    weaponStatsCache.set(weaponType, calculateWeaponDerivedStats(weaponType));
  }
  return weaponStatsCache.get(weaponType)!;
}

/**
 * Récupère les stats dérivées d'un zombie (avec cache)
 */
export function getDerivedZombieStats(zombieType: ZombieBalanceType): DerivedZombieStats {
  if (!zombieStatsCache.has(zombieType)) {
    zombieStatsCache.set(zombieType, calculateZombieDerivedStats(zombieType));
  }
  return zombieStatsCache.get(zombieType)!;
}

/**
 * Vide le cache (utile si les valeurs de balance changent)
 */
export function clearDerivedStatsCache(): void {
  weaponStatsCache.clear();
  zombieStatsCache.clear();
}

/**
 * Table de vérité pour validation des valeurs d'équilibrage
 * Ces plages représentent les valeurs "acceptables" pour une expérience de jeu équilibrée
 */
export const BALANCE_VALIDATION = {
  // TTK cibles (en secondes) - temps pour tuer avec l'arme de base
  TTK: {
    shamblerWithPistol: { min: 0.5, max: 1.5, description: 'Shambler doit mourir rapidement au pistol' },
    tankWithPistol: { min: 4, max: 8, description: 'Tank doit nécessiter un effort significatif' },
    runnerWithSMG: { min: 0.1, max: 0.4, description: 'Runner fragile, SMG efficace' },
    tankWithSniper: { min: 1, max: 3, description: 'Sniper efficace contre Tank' },
  },

  // TTC cibles (en secondes) - temps pour atteindre le joueur depuis une porte
  TTC: {
    shamblerFromDoor: { min: 7, max: 12, description: 'Shambler laisse le temps de réagir' },
    runnerFromDoor: { min: 2.5, max: 5, description: 'Runner rapide mais gérable' },
    tankFromDoor: { min: 10, max: 16, description: 'Tank très lent, temps de préparation' },
  },

  // DPS cibles des armes
  weaponDPS: {
    pistolSustained: { min: 25, max: 45, description: 'Pistol: DPS modéré, fiable' },
    smgSustained: { min: 40, max: 70, description: 'SMG: DPS élevé, consomme vite' },
    shotgunSustained: { min: 35, max: 55, description: 'Shotgun: DPS moyen, burst' },
    sniperSustained: { min: 50, max: 80, description: 'Sniper: DPS élevé par coup' },
  },

  // Coûts de menace (normalisés, shambler = 1)
  threatCost: {
    runner: { min: 1.2, max: 2.0, description: 'Runner plus cher que Shambler' },
    tank: { min: 3.0, max: 6.0, description: 'Tank significativement plus cher' },
    screamer: { min: 2.5, max: 5.0, description: 'Screamer prioritaire et cher' },
    necromancer: { min: 3.5, max: 7.0, description: 'Necromancer très dangereux' },
  },
} as const;

/**
 * Résultat de validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valide les métriques dérivées contre la table de vérité
 */
export function validateBalance(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Valider les TTK
  const shamblerTTK = calculateTTK('shambler', 'pistol');
  if (shamblerTTK < BALANCE_VALIDATION.TTK.shamblerWithPistol.min) {
    warnings.push(`Shambler TTK (pistol) trop bas: ${shamblerTTK.toFixed(2)}s < ${BALANCE_VALIDATION.TTK.shamblerWithPistol.min}s`);
  } else if (shamblerTTK > BALANCE_VALIDATION.TTK.shamblerWithPistol.max) {
    errors.push(`Shambler TTK (pistol) trop élevé: ${shamblerTTK.toFixed(2)}s > ${BALANCE_VALIDATION.TTK.shamblerWithPistol.max}s`);
  }

  const tankTTKPistol = calculateTTK('tank', 'pistol');
  if (tankTTKPistol < BALANCE_VALIDATION.TTK.tankWithPistol.min) {
    warnings.push(`Tank TTK (pistol) trop bas: ${tankTTKPistol.toFixed(2)}s`);
  } else if (tankTTKPistol > BALANCE_VALIDATION.TTK.tankWithPistol.max) {
    errors.push(`Tank TTK (pistol) trop élevé: ${tankTTKPistol.toFixed(2)}s`);
  }

  const runnerTTKSMG = calculateTTK('runner', 'smg');
  if (runnerTTKSMG < BALANCE_VALIDATION.TTK.runnerWithSMG.min) {
    warnings.push(`Runner TTK (SMG) trop bas: ${runnerTTKSMG.toFixed(2)}s`);
  } else if (runnerTTKSMG > BALANCE_VALIDATION.TTK.runnerWithSMG.max) {
    errors.push(`Runner TTK (SMG) trop élevé: ${runnerTTKSMG.toFixed(2)}s`);
  }

  // Valider les TTC
  const shamblerTTC = calculateTTC('shambler', REFERENCE_DISTANCES.door);
  if (shamblerTTC < BALANCE_VALIDATION.TTC.shamblerFromDoor.min) {
    errors.push(`Shambler TTC trop bas: ${shamblerTTC.toFixed(2)}s - le joueur n'a pas le temps de réagir`);
  } else if (shamblerTTC > BALANCE_VALIDATION.TTC.shamblerFromDoor.max) {
    warnings.push(`Shambler TTC trop élevé: ${shamblerTTC.toFixed(2)}s - pas assez de pression`);
  }

  const runnerTTC = calculateTTC('runner', REFERENCE_DISTANCES.door);
  if (runnerTTC < BALANCE_VALIDATION.TTC.runnerFromDoor.min) {
    errors.push(`Runner TTC trop bas: ${runnerTTC.toFixed(2)}s - quasi impossible à gérer`);
  } else if (runnerTTC > BALANCE_VALIDATION.TTC.runnerFromDoor.max) {
    warnings.push(`Runner TTC trop élevé: ${runnerTTC.toFixed(2)}s - pas de menace`);
  }

  // Valider les DPS d'armes
  const pistolDPS = getDerivedWeaponStats('pistol').sustainedDPS;
  if (pistolDPS < BALANCE_VALIDATION.weaponDPS.pistolSustained.min ||
      pistolDPS > BALANCE_VALIDATION.weaponDPS.pistolSustained.max) {
    warnings.push(`Pistol DPS soutenu hors plage: ${pistolDPS.toFixed(1)} (attendu: ${BALANCE_VALIDATION.weaponDPS.pistolSustained.min}-${BALANCE_VALIDATION.weaponDPS.pistolSustained.max})`);
  }

  // Valider les coûts de menace
  const runnerCost = getDerivedZombieStats('runner').cost;
  if (runnerCost < BALANCE_VALIDATION.threatCost.runner.min ||
      runnerCost > BALANCE_VALIDATION.threatCost.runner.max) {
    warnings.push(`Runner cost hors plage: ${runnerCost.toFixed(2)} (attendu: ${BALANCE_VALIDATION.threatCost.runner.min}-${BALANCE_VALIDATION.threatCost.runner.max})`);
  }

  const tankCost = getDerivedZombieStats('tank').cost;
  if (tankCost < BALANCE_VALIDATION.threatCost.tank.min ||
      tankCost > BALANCE_VALIDATION.threatCost.tank.max) {
    warnings.push(`Tank cost hors plage: ${tankCost.toFixed(2)} (attendu: ${BALANCE_VALIDATION.threatCost.tank.min}-${BALANCE_VALIDATION.threatCost.tank.max})`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Génère un rapport complet des métriques dérivées
 */
export function generateBalanceReport(): string {
  const lines: string[] = [];
  lines.push('=== RAPPORT D\'ÉQUILIBRAGE ===\n');

  // Armes à feu
  lines.push('--- ARMES A FEU ---');
  for (const weapon of FIREARMS) {
    const stats = getDerivedWeaponStats(weapon);
    lines.push(`${weapon.toUpperCase()}:`);
    lines.push(`  DPS brut: ${stats.rawDPS.toFixed(1)}`);
    lines.push(`  DPS soutenu: ${stats.sustainedDPS.toFixed(1)}`);
    lines.push(`  Temps pour vider: ${(stats.timeToEmpty / 1000).toFixed(2)}s`);
    lines.push(`  Cycle complet: ${(stats.cycleTime / 1000).toFixed(2)}s`);
    lines.push(`  Dégâts/cycle: ${stats.damagePerCycle}`);
    lines.push('');
  }

  // Zombies
  lines.push('--- ZOMBIES ---');
  for (const zombie of Object.keys(BALANCE.zombies) as ZombieBalanceType[]) {
    const stats = getDerivedZombieStats(zombie);
    lines.push(`${zombie.toUpperCase()}:`);
    lines.push(`  TTK (pistol): ${stats.TTKByWeapon.pistol.toFixed(2)}s`);
    lines.push(`  TTK (smg): ${stats.TTKByWeapon.smg.toFixed(2)}s`);
    lines.push(`  TTC (door): ${stats.TTC.door.toFixed(2)}s`);
    lines.push(`  DPS reçu: ${stats.receivedDPS.toFixed(1)}`);
    lines.push(`  Score menace: ${stats.threatScore.toFixed(2)}`);
    lines.push(`  Coût: ${stats.cost.toFixed(2)}`);
    lines.push('');
  }

  // Validation
  lines.push('--- VALIDATION ---');
  const validation = validateBalance();
  lines.push(`Statut: ${validation.valid ? 'OK' : 'ERREURS DÉTECTÉES'}`);
  if (validation.errors.length > 0) {
    lines.push('Erreurs:');
    for (const error of validation.errors) {
      lines.push(`  ❌ ${error}`);
    }
  }
  if (validation.warnings.length > 0) {
    lines.push('Avertissements:');
    for (const warning of validation.warnings) {
      lines.push(`  ⚠️ ${warning}`);
    }
  }

  return lines.join('\n');
}
