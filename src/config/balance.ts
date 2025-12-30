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
    // === ARMES A FEU ===
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

    // === ARMES DE MELEE ===
    baseballBat: {
      damage: 25,
      range: 60,
      swingSpeed: 400,
      knockback: 200,
      arcAngle: 90,
      stunChance: 0.2,
      stunDuration: 500,
      // DPS théorique : 62.5 (25 dmg / 0.4s)
    },
    machete: {
      damage: 30,
      range: 45,
      swingSpeed: 250,
      knockback: 0,
      arcAngle: 60,
      // DPS théorique : 120 (30 dmg / 0.25s)
    },
    chainsaw: {
      damage: 8,
      range: 50,
      tickRate: 100,
      fuelConsumption: 2,
      maxFuel: 100,
      slowdown: 0.5,
      // DPS théorique : 80 (8 dmg * 10 ticks/s)
    },

    // === ARMES SPECIALES ===
    flamethrower: {
      damage: 5,
      range: 150,
      fireRate: 50,
      magazineSize: 100,
      reloadTime: 2000,
      flameSpeed: 300,
      dotDamage: 3,
      dotDuration: 2000,
      dotTickRate: 500,
      fireZoneDuration: 3000,
      fireZoneDamage: 5,
      // DPS théorique : 100+ avec DoT
    },
    teslaCannon: {
      damage: 15,
      range: 250,
      fireRate: 600,
      magazineSize: 20,
      reloadTime: 1500,
      chainCount: 4,
      chainRange: 100,
      chainDamageFalloff: 0.7,
      // DPS théorique : variable selon chaînes
    },
    nailGun: {
      damage: 12,
      fireRate: 200,
      magazineSize: 40,
      reloadTime: 1200,
      bulletSpeed: 500,
      pinDuration: 2000,
      // DPS théorique : 60 + effet de contrôle
    },
    compositeBow: {
      damageMin: 20,
      damageMax: 80,
      chargeTime: 1500,
      magazineSize: 15,
      reloadTime: 800,
      bulletSpeed: 700,
      silent: true,
      // DPS théorique : variable selon charge
    },
    microwaveCannon: {
      damage: 60,
      range: 200,
      fireRate: 2000,
      magazineSize: 10,
      reloadTime: 2500,
      chargeTime: 500,
      coneAngle: 45,
      // DPS théorique : 30 (faible mais dégâts de zone)
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
    // Paramètres de spawn (SpawnSystem)
    spawnInterval: 2000, // Intervalle initial entre spawns (mode legacy)
    minSpawnInterval: 500, // Intervalle minimum
    spawnDecrement: 50, // Réduction par accélération
    spawnDelayVariance: 500, // Variance aléatoire sur les spawns
    spawnWaveMultiplierMin: 0.5, // Multiplicateur minimum de délai
    spawnWaveMultiplierDecrement: 0.02, // Réduction du multiplicateur par vague
    legacySpawnDelay: 200, // Délai entre spawns successifs (mode legacy)
    minPlayerSpawnDistance: 150, // Distance minimum du joueur pour spawn
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

  combo: {
    timeoutMs: 3000, // Temps sans kill avant reset combo
    incrementPerKill: 0.1, // +0.1 par kill
    maxMultiplier: 10, // Plafond du multiplicateur
    dropQualityBonusPerLevel: 0.05, // +5% qualité par niveau de combo
    milestones: [2, 3, 4, 5, 6, 7, 8, 9, 10], // Seuils pour effets visuels
  },

  drops: {
    // Configuration générale des drops
    lifetime: 15000, // Durée de vie en ms avant disparition
    blinkStartTime: 3000, // Temps avant disparition où le drop commence à clignoter
    collectionRadius: 32, // Rayon de collecte par défaut
    magnetRadius: 64, // Rayon d'attraction magnétique vers le joueur
    magnetSpeed: 200, // Vitesse d'attraction
    popVelocity: 100, // Vitesse initiale du "pop" à la création
    maxDropsOnGround: 50, // Limite de drops au sol

    // Types de drops et leurs effets
    ammo: {
      reloadPercent: 0.3, // +30% du chargeur
    },
    healthSmall: {
      healAmount: 15, // +15 HP
    },
    healthMedium: {
      healAmount: 30, // +30 HP
    },

    // Table de loot par type de zombie
    // Format: { ammo, healthSmall, healthMedium, powerUp }
    lootTables: {
      shambler: { ammo: 0.15, healthSmall: 0.08, healthMedium: 0, powerUp: 0.01 },
      runner: { ammo: 0.12, healthSmall: 0.05, healthMedium: 0, powerUp: 0.02 },
      crawler: { ammo: 0.12, healthSmall: 0.06, healthMedium: 0.02, powerUp: 0.02 },
      tank: { ammo: 0.25, healthSmall: 0.15, healthMedium: 0.15, powerUp: 0.05 },
      spitter: { ammo: 0.20, healthSmall: 0.10, healthMedium: 0, powerUp: 0.03 },
      bomber: { ammo: 0.10, healthSmall: 0.05, healthMedium: 0, powerUp: 0.03 },
      screamer: { ammo: 0.20, healthSmall: 0.12, healthMedium: 0, powerUp: 0.08 },
      splitter: { ammo: 0.15, healthSmall: 0.08, healthMedium: 0, powerUp: 0.02 },
      invisible: { ammo: 0.18, healthSmall: 0.10, healthMedium: 0.05, powerUp: 0.05 },
      necromancer: { ammo: 0.30, healthSmall: 0.20, healthMedium: 0.10, powerUp: 0.10 },
    },
  },

  powerUps: {
    // Configuration des power-ups
    rage: {
      duration: 10000, // 10 secondes
      damageMultiplier: 2, // x2 dégâts
      rarity: 'common' as const,
      weight: 0.25, // Probabilité relative
      color: 0xff4444, // Rouge
    },
    freeze: {
      duration: 8000, // 8 secondes
      slowFactor: 0.3, // 70% de ralentissement (vitesse = 30%)
      bossSlowFactor: 0.7, // Seulement 30% de ralentissement pour les boss
      rarity: 'common' as const,
      weight: 0.25,
      color: 0x44aaff, // Bleu
    },
    ghost: {
      duration: 5000, // 5 secondes
      rarity: 'rare' as const,
      weight: 0.15,
      color: 0xaaaaff, // Bleu clair/violet
    },
    magnet: {
      duration: 12000, // 12 secondes
      magnetRadius: 300, // Rayon d'attraction élargi
      magnetSpeed: 400, // Vitesse d'attraction augmentée
      rarity: 'common' as const,
      weight: 0.25,
      color: 0xffaa00, // Orange
    },
    nuke: {
      duration: 0, // Instantané
      bossDamagePercent: 0.5, // 50% de dégâts aux boss
      minWaveToSpawn: 3, // Ne peut pas drop avant la vague 3
      rarity: 'legendary' as const,
      weight: 0.05,
      color: 0xffff00, // Jaune
    },
  },

  covers: {
    pillar: {
      health: Infinity,
      blocksLineOfSight: true,
      providesPartialCover: false,
    },
    halfWall: {
      health: 80,
      blocksLineOfSight: true,
      providesPartialCover: true,
    },
    table: {
      health: 40,
      blocksLineOfSight: false,
      providesPartialCover: true,
      lootChance: 0.1,
    },
    crate: {
      health: 30,
      blocksLineOfSight: false,
      providesPartialCover: false,
      lootChance: 0.3,
    },
    shelf: {
      health: 50,
      blocksLineOfSight: false,
      providesPartialCover: false,
      lootChance: 0.5,
    },
    barricade: {
      health: 100,
      blocksLineOfSight: true,
      providesPartialCover: false,
    },
  },

  terrainZones: {
    puddle: {
      slowFactor: 0.6,
      damagePerSecond: 0,
      duration: 0, // Permanent
      revealInvisibles: true,
      conductElectricity: true,
      radius: 40,
    },
    blood_pool: {
      slowFactor: 0.8,
      damagePerSecond: 0,
      duration: 0, // Permanent
      revealInvisibles: true,
      conductElectricity: false,
      radius: 35,
    },
    debris: {
      slowFactor: 0.7,
      damagePerSecond: 0,
      duration: 0, // Permanent
      revealInvisibles: false,
      conductElectricity: false,
      radius: 50,
    },
    electric: {
      slowFactor: 1,
      damagePerSecond: 15,
      duration: 0, // Activable
      revealInvisibles: true,
      conductElectricity: false,
      radius: 45,
    },
    fire: {
      slowFactor: 1,
      damagePerSecond: 20,
      duration: 3000, // 3 secondes
      revealInvisibles: true,
      conductElectricity: false,
      radius: 30,
    },
    acid: {
      slowFactor: 0.8,
      damagePerSecond: 10,
      duration: 4000, // 4 secondes
      revealInvisibles: false,
      conductElectricity: false,
      radius: 32,
    },
  },

  tesla: {
    puddleChainDamageBonus: 1.5, // +50% de dégâts dans les flaques
    puddleChainRadius: 80, // Rayon de propagation dans les flaques
  },

  interactive: {
    barrel: {
      health: 50,
      explosionDamage: 100,
      explosionRadius: 128,
    },
    barrelFire: {
      health: 40,
      fireRadius: 96,
      fireDuration: 5000,
      fireDamage: 20,
    },
    switch: {
      health: Infinity,
      cooldown: 500,
    },
    generator: {
      health: 100,
      cooldown: 1000,
    },
    flameTrap: {
      health: Infinity,
      cooldown: 10000,
      flameLength: 150,
      flameDuration: 3000,
      damagePerSecond: 30,
    },
    bladeTrap: {
      health: Infinity,
      damagePerHit: 50,
      hitCooldown: 500,
      rotationSpeed: 5,
    },
  },

  doors: {
    barricades: {
      light: {
        health: 100,
        cost: 100,
      },
      reinforced: {
        health: 250,
        cost: 250,
      },
    },
    traps: {
      spike: {
        damage: 30,
        charges: 5,
        cost: 150,
      },
      slow: {
        slowFactor: 0.5,
        slowDuration: 3000,
        charges: 10,
        cost: 100,
      },
      fire: {
        fireDuration: 3000,
        fireDamage: 20,
        charges: 3,
        cost: 200,
      },
    },
    repairCost: 50,
    repairAmount: 50,
    destroyedSpawnMultiplier: 1.5, // 50% faster spawns on destroyed doors
  },

  economy: {
    // Configuration du système économique (Phase 6.6)
    basePointsPerKill: 10, // Points de base par zombie tué
    comboMultiplierEnabled: true, // Les points sont multipliés par le combo

    // Table de points par type de zombie (multiplicateur du base)
    zombiePointMultipliers: {
      shambler: 1.0,
      runner: 1.5,
      crawler: 2.0,
      tank: 5.0,
      spitter: 2.5,
      bomber: 3.0,
      screamer: 3.5,
      splitter: 2.5,
      invisible: 4.0,
      necromancer: 5.0,
    } as Record<string, number>,

    // Coûts des achats dans le menu tactique
    purchases: {
      ammo: { cost: 50, reloadPercent: 1.0 }, // Recharge complète de l'arme
      healthSmall: { cost: 50, healAmount: 25 },
      healthLarge: { cost: 100, healAmount: 50 },
      mine: { cost: 100, charges: 1 },
      turret: { cost: 200, charges: 1 },
    },

    // Coûts liés aux portes (référence depuis doors.barricades/traps)
    // Les coûts de barricades et pièges sont définis dans la section doors
  },

  activeItems: {
    // Configuration des objets actifs (Phase 6.4)
    turret: {
      duration: 30000, // 30 secondes
      health: 100,
      damage: 5, // 50% du pistolet
      fireRate: 400, // Tirs par seconde
      detectionRadius: 200,
      maxActive: 1, // Une seule tourelle active à la fois
      rarity: 'rare' as const,
      color: 0x888888, // Gris
    },
    mine: {
      damage: 80,
      explosionRadius: 60,
      detectionRadius: 40,
      maxActive: 3, // Jusqu'à 3 mines actives
      armingTime: 1000, // 1 seconde avant activation
      rarity: 'common' as const,
      color: 0xff6600, // Orange
    },
    drone: {
      duration: 20000, // 20 secondes
      health: 50,
      damage: 3,
      fireRate: 300,
      orbitRadius: 80,
      orbitSpeed: 2, // Radians par seconde
      detectionRadius: 150,
      rarity: 'rare' as const,
      color: 0x00aaff, // Bleu clair
    },
    decoy: {
      duration: 8000, // 8 secondes
      maxHits: 3, // Disparaît après 3 coups
      attractionRadius: 200, // Rayon d'attraction des zombies
      rarity: 'common' as const,
      color: 0xaa00ff, // Violet
    },
    discoball: {
      attractDuration: 3000, // 3 secondes d'attraction
      attractRadius: 150,
      explosionRadius: 100,
      baseDamage: 50,
      damagePerZombie: 5, // Bonus par zombie attiré
      maxBonusDamage: 100, // Plafond du bonus
      rarity: 'rare' as const,
      color: 0xff00ff, // Magenta
    },
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
