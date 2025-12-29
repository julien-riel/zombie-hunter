/**
 * Configuration centralisée de l'équilibrage du jeu.
 * Toutes les valeurs de gameplay doivent être définies ici.
 *
 * Ce fichier permet de:
 * - Modifier l'équilibrage sans chercher dans le code
 * - Documenter les calculs de référence
 * - Faciliter les tests et le fine-tuning
 */

export const BALANCE = {
  player: {
    maxHealth: 100,
    speed: 200,
    dashSpeed: 400,
    dashDuration: 200,
    dashCooldown: 1000,
    invulnerabilityDuration: 500,
  },

  zombies: {
    shambler: {
      health: 30,
      speed: 60,
      damage: 10,
      attackCooldown: 1200,
      detectionRange: 300,
      attackRange: 35,
      scoreValue: 10,
    },
    runner: {
      health: 15,
      speed: 150,
      damage: 8,
      attackCooldown: 800,
      detectionRange: 500,
      attackRange: 30,
      chargeRange: 200,
      chargeMultiplier: 1.5,
      scoreValue: 15,
    },
    crawler: {
      health: 20,
      speed: 80,
      damage: 15,
      attackCooldown: 1200,
      detectionRange: 250,
      attackRange: 30,
      stunDuration: 300,
      scoreValue: 20,
    },
    tank: {
      health: 200,
      speed: 40,
      damage: 25,
      attackCooldown: 1500,
      detectionRange: 400,
      attackRange: 50,
      knockbackForce: 300,
      scoreValue: 50,
    },
    spitter: {
      health: 25,
      speed: 70,
      damage: 8,
      attackCooldown: 2000,
      detectionRange: 450,
      attackRange: 300,
      preferredRange: 200,
      projectileSpeed: 250,
      scoreValue: 25,
    },
    bomber: {
      health: 40,
      speed: 90,
      damage: 5,
      explosionDamage: 40,
      explosionRadius: 80,
      detectionRange: 350,
      attackRange: 40,
      attackCooldown: 1000,
      scoreValue: 30,
    },
    screamer: {
      health: 20,
      speed: 50,
      damage: 5,
      attackCooldown: 3000,
      detectionRange: 400,
      attackRange: 40,
      screamRadius: 200,
      screamSpeedBoost: 1.5,
      scoreValue: 35,
    },
    splitter: {
      health: 35,
      speed: 70,
      damage: 8,
      attackCooldown: 1000,
      detectionRange: 300,
      attackRange: 35,
      splitCount: 2,
      miniHealth: 10,
      miniSpeed: 120,
      scoreValue: 25,
    },
    invisible: {
      health: 25,
      speed: 100,
      damage: 20,
      attackCooldown: 1500,
      detectionRange: 400,
      attackRange: 35,
      visibilityDistance: 100,
      scoreValue: 40,
    },
    necromancer: {
      health: 30,
      speed: 45,
      damage: 5,
      attackCooldown: 4000,
      detectionRange: 500,
      attackRange: 40,
      resurrectRadius: 150,
      fleeDistance: 250,
      scoreValue: 50,
    },
  },

  weapons: {
    pistol: {
      damage: 10,
      fireRate: 250,
      magazineSize: 12,
      reloadTime: 1000,
      bulletSpeed: 600,
      spread: 0.05,
      // DPS théorique : 40 (sans reload)
    },
    shotgun: {
      damage: 8,
      pelletCount: 6,
      fireRate: 800,
      magazineSize: 6,
      reloadTime: 1500,
      bulletSpeed: 500,
      spread: 0.3,
      // DPS théorique : 60 (6 pellets * 8 dmg / 0.8s)
    },
    smg: {
      damage: 6,
      fireRate: 100,
      magazineSize: 30,
      reloadTime: 1200,
      bulletSpeed: 550,
      spread: 0.08,
      // DPS théorique : 60
    },
    sniper: {
      damage: 80,
      fireRate: 1200,
      magazineSize: 5,
      reloadTime: 2000,
      bulletSpeed: 900,
      spread: 0,
      // DPS théorique : 66.7
    },
  },

  waves: {
    baseZombieCount: 5,
    zombiesPerWave: 3,
    maxZombiesPerWave: 50,
    initialDoors: 2,
    doorsPerWaves: 5, // Nouvelle porte toutes les X vagues
    maxDoors: 8,
    transitionDelay: 3000,
    baseSpawnDelay: 1000,
    minSpawnDelay: 300,
    zombieTypeUnlocks: [
      { wave: 1, type: 'shambler' as const, weight: 0.7 },
      { wave: 1, type: 'runner' as const, weight: 0.3 },
      { wave: 6, type: 'crawler' as const, weight: 0.2 },
      { wave: 6, type: 'spitter' as const, weight: 0.15 },
      { wave: 11, type: 'tank' as const, weight: 0.1 },
      { wave: 11, type: 'bomber' as const, weight: 0.1 },
      { wave: 16, type: 'screamer' as const, weight: 0.1 },
      { wave: 16, type: 'splitter' as const, weight: 0.1 },
      { wave: 21, type: 'invisible' as const, weight: 0.05 },
      { wave: 21, type: 'necromancer' as const, weight: 0.05 },
    ],
  },

  combat: {
    comboTimeout: 3000, // Temps sans kill avant reset combo
    comboMultiplierMax: 10,
    invulnerabilityOnHit: 200,
  },

  // Calculs de référence pour validation de l'équilibrage
  reference: {
    // Temps pour tuer un Shambler avec Pistol : 30 HP / 40 DPS = 0.75 secondes
    // Temps pour tuer un Tank avec Pistol : 200 HP / 40 DPS = 5 secondes
    // Shambler atteint le joueur depuis porte (~640px) : 640px / 60 px/s = 10.6 secondes
    // Runner atteint le joueur depuis porte (~640px) : 640px / 150 px/s = 4.3 secondes
    // Runner en charge : 640px / 225 px/s = 2.8 secondes
  },
} as const;

/**
 * Types dérivés pour un typage strict
 */
export type ZombieBalanceType = keyof typeof BALANCE.zombies;
export type WeaponBalanceType = keyof typeof BALANCE.weapons;

/**
 * Helper pour accéder aux stats d'un zombie par son type
 */
export function getZombieStats<T extends ZombieBalanceType>(type: T): (typeof BALANCE.zombies)[T] {
  return BALANCE.zombies[type];
}

/**
 * Helper pour accéder aux stats d'une arme par son type
 */
export function getWeaponStats<T extends WeaponBalanceType>(type: T): (typeof BALANCE.weapons)[T] {
  return BALANCE.weapons[type];
}
