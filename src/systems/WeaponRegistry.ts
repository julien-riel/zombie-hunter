import type { GameScene } from '@/scenes/GameScene';
import type { Player } from '@/entities/Player';
import type {
  WeaponDefinition,
  WeaponCategory,
  LoadoutConfig,
} from '@/types/inventory';
import { DEFAULT_LOADOUT } from '@/types/inventory';

// Melee weapons
import { BaseballBat } from '@/weapons/melee/BaseballBat';
import { Machete } from '@/weapons/melee/Machete';
import { Chainsaw } from '@/weapons/melee/Chainsaw';
import { FireAxe } from '@/weapons/melee/FireAxe';
import { Katana } from '@/weapons/melee/Katana';
import { Sledgehammer } from '@/weapons/melee/Sledgehammer';

// Firearms
import { Pistol } from '@/weapons/firearms/Pistol';
import { Shotgun } from '@/weapons/firearms/Shotgun';
import { SMG } from '@/weapons/firearms/SMG';
import { SniperRifle } from '@/weapons/firearms/SniperRifle';
import { Revolver } from '@/weapons/firearms/Revolver';
import { AssaultRifle } from '@/weapons/firearms/AssaultRifle';
import { DoubleBarrel } from '@/weapons/firearms/DoubleBarrel';

// Explosives
import { GrenadeLauncher } from '@/weapons/explosive/GrenadeLauncher';

// Special weapons
import { Flamethrower } from '@/weapons/special/Flamethrower';
import { TeslaCannon } from '@/weapons/special/TeslaCannon';
import { NailGun } from '@/weapons/special/NailGun';
import { CompositeBow } from '@/weapons/special/CompositeBow';
import { MicrowaveCannon } from '@/weapons/special/MicrowaveCannon';

// Experimental weapons
import { FreezeRay } from '@/weapons/experimental/FreezeRay';
import { GravityGun } from '@/weapons/experimental/GravityGun';
import { BlackHoleGenerator } from '@/weapons/experimental/BlackHoleGenerator';
import { LaserMinigun } from '@/weapons/experimental/LaserMinigun';
import { ZombieConverter } from '@/weapons/experimental/ZombieConverter';

/**
 * Registre central de toutes les armes du jeu
 * Singleton pattern pour un accès global
 */
export class WeaponRegistry {
  private static weapons: Map<string, WeaponDefinition> = new Map();
  private static initialized: boolean = false;

  /**
   * Initialise le registre avec toutes les armes du jeu
   * Appelé automatiquement au premier accès
   */
  private static initialize(): void {
    if (this.initialized) return;

    // === ARMES DE MÊLÉE ===

    this.register({
      id: 'baseballBat',
      name: 'Batte de Baseball',
      category: 'melee',
      factory: (scene: GameScene, player: Player) => new BaseballBat(scene, player),
      rarity: 'common',
      tier: 1,
      description: 'Arme de base, fiable et rapide',
    });

    this.register({
      id: 'machete',
      name: 'Machette',
      category: 'melee',
      factory: (scene: GameScene, player: Player) => new Machete(scene, player),
      rarity: 'common',
      tier: 1,
      description: 'Coups rapides avec saignement',
    });

    this.register({
      id: 'fireAxe',
      name: 'Hache de Pompier',
      category: 'melee',
      factory: (scene: GameScene, player: Player) => new FireAxe(scene, player),
      rarity: 'rare',
      tier: 2,
      unlockCondition: { type: 'wave', value: 5, description: 'Atteindre la vague 5' },
      description: 'Dégâts élevés, portée moyenne',
    });

    this.register({
      id: 'chainsaw',
      name: 'Tronçonneuse',
      category: 'melee',
      factory: (scene: GameScene, player: Player) => new Chainsaw(scene, player),
      rarity: 'rare',
      tier: 2,
      unlockCondition: { type: 'purchase', value: 500, description: 'Acheter pour 500 points' },
      description: 'Dégâts continus dévastateurs',
    });

    this.register({
      id: 'katana',
      name: 'Katana',
      category: 'melee',
      factory: (scene: GameScene, player: Player) => new Katana(scene, player),
      rarity: 'epic',
      tier: 3,
      unlockCondition: { type: 'wave', value: 10, description: 'Atteindre la vague 10' },
      description: 'Coups critiques fréquents',
    });

    this.register({
      id: 'sledgehammer',
      name: 'Masse',
      category: 'melee',
      factory: (scene: GameScene, player: Player) => new Sledgehammer(scene, player),
      rarity: 'epic',
      tier: 3,
      unlockCondition: { type: 'boss', description: 'Vaincre un boss' },
      description: 'Knockback massif, stun garanti',
    });

    // === ARMES À DISTANCE - FIREARMS ===

    this.register({
      id: 'pistol',
      name: 'Pistolet',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new Pistol(scene, player),
      rarity: 'common',
      tier: 1,
      description: 'Arme de base, précise et fiable',
    });

    this.register({
      id: 'shotgun',
      name: 'Fusil à Pompe',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new Shotgun(scene, player),
      rarity: 'common',
      tier: 1,
      unlockCondition: { type: 'wave', value: 2, description: 'Atteindre la vague 2' },
      description: 'Dégâts de zone à courte portée',
    });

    this.register({
      id: 'smg',
      name: 'SMG',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new SMG(scene, player),
      rarity: 'common',
      tier: 1,
      unlockCondition: { type: 'wave', value: 3, description: 'Atteindre la vague 3' },
      description: 'Tir rapide, faible précision',
    });

    this.register({
      id: 'revolver',
      name: 'Revolver',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new Revolver(scene, player),
      rarity: 'rare',
      tier: 2,
      unlockCondition: { type: 'wave', value: 5, description: 'Atteindre la vague 5' },
      description: 'Dégâts élevés, rechargement lent',
    });

    this.register({
      id: 'sniperRifle',
      name: 'Sniper',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new SniperRifle(scene, player),
      rarity: 'rare',
      tier: 2,
      unlockCondition: { type: 'purchase', value: 300, description: 'Acheter pour 300 points' },
      description: 'Précision parfaite, pénétration',
    });

    this.register({
      id: 'assaultRifle',
      name: 'Fusil d\'Assaut',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new AssaultRifle(scene, player),
      rarity: 'rare',
      tier: 2,
      unlockCondition: { type: 'wave', value: 7, description: 'Atteindre la vague 7' },
      description: 'Mode rafale, polyvalent',
    });

    this.register({
      id: 'doubleBarrel',
      name: 'Double Canon',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new DoubleBarrel(scene, player),
      rarity: 'epic',
      tier: 3,
      unlockCondition: { type: 'wave', value: 10, description: 'Atteindre la vague 10' },
      description: 'Deux coups dévastateurs',
    });

    // === ARMES À DISTANCE - EXPLOSIVES ===

    this.register({
      id: 'grenadeLauncher',
      name: 'Lance-Grenades',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new GrenadeLauncher(scene, player),
      rarity: 'epic',
      tier: 3,
      unlockCondition: { type: 'wave', value: 12, description: 'Atteindre la vague 12' },
      description: 'Dégâts de zone explosifs',
    });

    // === ARMES À DISTANCE - SPECIAL ===

    this.register({
      id: 'flamethrower',
      name: 'Lance-Flammes',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new Flamethrower(scene, player),
      rarity: 'rare',
      tier: 2,
      unlockCondition: { type: 'purchase', value: 600, description: 'Acheter pour 600 points' },
      description: 'Dégâts de feu continus',
    });

    this.register({
      id: 'teslaCannon',
      name: 'Canon Tesla',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new TeslaCannon(scene, player),
      rarity: 'epic',
      tier: 3,
      unlockCondition: { type: 'wave', value: 15, description: 'Atteindre la vague 15' },
      description: 'Chaîne d\'éclairs entre ennemis',
    });

    this.register({
      id: 'nailGun',
      name: 'Cloueuse',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new NailGun(scene, player),
      rarity: 'rare',
      tier: 2,
      unlockCondition: { type: 'wave', value: 8, description: 'Atteindre la vague 8' },
      description: 'Tir rapide, clous qui rebondissent',
    });

    this.register({
      id: 'compositeBow',
      name: 'Arc Composite',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new CompositeBow(scene, player),
      rarity: 'rare',
      tier: 2,
      unlockCondition: { type: 'wave', value: 6, description: 'Atteindre la vague 6' },
      description: 'Silencieux, munitions infinies',
    });

    this.register({
      id: 'microwaveCannon',
      name: 'Canon Micro-Ondes',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new MicrowaveCannon(scene, player),
      rarity: 'epic',
      tier: 3,
      unlockCondition: { type: 'boss', description: 'Vaincre un boss' },
      description: 'Cuit les zombies de l\'intérieur',
    });

    // === ARMES À DISTANCE - EXPERIMENTAL ===

    this.register({
      id: 'freezeRay',
      name: 'Rayon Givrant',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new FreezeRay(scene, player),
      rarity: 'legendary',
      tier: 4,
      unlockCondition: { type: 'wave', value: 20, description: 'Atteindre la vague 20' },
      description: 'Gèle et ralentit les ennemis',
    });

    this.register({
      id: 'gravityGun',
      name: 'Canon à Gravité',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new GravityGun(scene, player),
      rarity: 'legendary',
      tier: 4,
      unlockCondition: { type: 'wave', value: 20, description: 'Atteindre la vague 20' },
      description: 'Manipule la gravité des zombies',
    });

    this.register({
      id: 'blackHoleGenerator',
      name: 'Générateur de Trou Noir',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new BlackHoleGenerator(scene, player),
      rarity: 'legendary',
      tier: 4,
      unlockCondition: { type: 'boss', description: 'Drop de boss majeur' },
      description: 'Aspire et détruit tout',
    });

    this.register({
      id: 'laserMinigun',
      name: 'Minigun Laser',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new LaserMinigun(scene, player),
      rarity: 'legendary',
      tier: 4,
      unlockCondition: { type: 'purchase', value: 10000, description: 'Acheter pour 10 000 points' },
      description: 'Déferlement de lasers',
    });

    this.register({
      id: 'zombieConverter',
      name: 'Convertisseur de Zombies',
      category: 'ranged',
      factory: (scene: GameScene, player: Player) => new ZombieConverter(scene, player),
      rarity: 'legendary',
      tier: 4,
      unlockCondition: { type: 'secret', description: 'Convertir 100 zombies au total' },
      description: 'Transforme les zombies en alliés',
    });

    this.initialized = true;
  }

  /**
   * Enregistre une arme dans le registre
   */
  static register(definition: WeaponDefinition): void {
    this.weapons.set(definition.id, definition);
  }

  /**
   * Récupère une définition d'arme par son ID
   */
  static get(id: string): WeaponDefinition | undefined {
    this.initialize();
    return this.weapons.get(id);
  }

  /**
   * Récupère toutes les armes d'une catégorie
   */
  static getByCategory(category: WeaponCategory): WeaponDefinition[] {
    this.initialize();
    return Array.from(this.weapons.values())
      .filter(w => w.category === category);
  }

  /**
   * Récupère toutes les armes du registre
   */
  static getAll(): WeaponDefinition[] {
    this.initialize();
    return Array.from(this.weapons.values());
  }

  /**
   * Récupère les armes mêlée
   */
  static getMeleeWeapons(): WeaponDefinition[] {
    return this.getByCategory('melee');
  }

  /**
   * Récupère les armes à distance
   */
  static getRangedWeapons(): WeaponDefinition[] {
    return this.getByCategory('ranged');
  }

  /**
   * Récupère les armes par tier
   */
  static getByTier(tier: number): WeaponDefinition[] {
    this.initialize();
    return Array.from(this.weapons.values())
      .filter(w => w.tier === tier);
  }

  /**
   * Retourne le loadout par défaut
   */
  static getDefaultLoadout(): LoadoutConfig {
    return { ...DEFAULT_LOADOUT };
  }

  /**
   * Vérifie si un ID d'arme existe
   */
  static exists(id: string): boolean {
    this.initialize();
    return this.weapons.has(id);
  }

  /**
   * Retourne le nombre total d'armes enregistrées
   */
  static count(): number {
    this.initialize();
    return this.weapons.size;
  }

  /**
   * Crée une instance d'arme à partir de son ID
   * @returns L'instance de l'arme ou null si l'ID est inconnu
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static createWeapon(id: string, scene: GameScene, player: Player): any {
    const definition = this.get(id);
    if (!definition) {
      console.warn(`WeaponRegistry: Unknown weapon ID "${id}"`);
      return null;
    }
    return definition.factory(scene, player);
  }
}
