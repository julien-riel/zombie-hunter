import type { GameScene } from '@scenes/GameScene';
import type { ZombieType } from '@/types/entities';
import type { Zombie } from './Zombie';
import { Shambler } from './Shambler';
import { Runner } from './Runner';
import { PoolManager } from '@managers/PoolManager';

/**
 * Type de constructeur pour les zombies concrets
 */
type ZombieConstructor = new (scene: GameScene, x: number, y: number) => Zombie;

/**
 * Mapping des types de zombies vers leurs classes
 */
const ZOMBIE_CLASSES: Partial<Record<ZombieType, ZombieConstructor>> = {
  shambler: Shambler,
  runner: Runner,
};

/**
 * Factory pour créer des zombies
 * Utilise le PoolManager pour optimiser les performances
 */
export class ZombieFactory {
  private poolManager: PoolManager;

  constructor(_scene: GameScene, poolManager: PoolManager) {
    this.poolManager = poolManager;

    // Pré-enregistrer les pools pour chaque type de zombie
    this.initializePools();
  }

  /**
   * Initialise les pools de zombies
   */
  private initializePools(): void {
    for (const [type, classType] of Object.entries(ZOMBIE_CLASSES)) {
      if (classType) {
        this.poolManager.registerZombiePool(
          type as ZombieType,
          classType,
          10
        );
      }
    }
  }

  /**
   * Crée un zombie du type spécifié
   */
  public create(type: ZombieType, x: number, y: number): Zombie | null {
    const classType = ZOMBIE_CLASSES[type];
    if (!classType) {
      console.warn(`Type de zombie non supporté: ${type}`);
      return null;
    }

    const zombie = this.poolManager.getZombie<Zombie>(type, x, y, classType);
    return zombie;
  }

  /**
   * Crée un Shambler
   */
  public createShambler(x: number, y: number): Shambler | null {
    return this.create('shambler', x, y) as Shambler | null;
  }

  /**
   * Crée un Runner
   */
  public createRunner(x: number, y: number): Runner | null {
    return this.create('runner', x, y) as Runner | null;
  }

  /**
   * Crée plusieurs zombies à des positions aléatoires
   */
  public createMultiple(
    type: ZombieType,
    count: number,
    spawnArea: { minX: number; maxX: number; minY: number; maxY: number }
  ): Zombie[] {
    const zombies: Zombie[] = [];

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(spawnArea.minX, spawnArea.maxX);
      const y = Phaser.Math.Between(spawnArea.minY, spawnArea.maxY);

      const zombie = this.create(type, x, y);
      if (zombie) {
        zombies.push(zombie);
      }
    }

    return zombies;
  }

  /**
   * Crée un zombie aléatoire parmi les types disponibles
   */
  public createRandom(x: number, y: number): Zombie | null {
    const types = Object.keys(ZOMBIE_CLASSES) as ZombieType[];
    const randomType = types[Math.floor(Math.random() * types.length)];
    return this.create(randomType, x, y);
  }

  /**
   * Libère un zombie (retour au pool)
   */
  public release(zombie: Zombie): void {
    this.poolManager.releaseZombie(zombie);
  }

  /**
   * Récupère le nombre de zombies actifs
   */
  public getActiveCount(): number {
    return this.poolManager.getActiveZombieCount();
  }

  /**
   * Récupère tous les zombies actifs
   */
  public getActiveZombies(): Zombie[] {
    return this.poolManager.getActiveZombies();
  }

  /**
   * Libère tous les zombies
   */
  public releaseAll(): void {
    this.poolManager.releaseAllZombies();
  }
}
