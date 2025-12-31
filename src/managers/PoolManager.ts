import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Zombie } from '@entities/zombies/Zombie';
import type { ZombieType } from '@/types/entities';
import { getPerformanceConfig } from '@config/MobilePerformanceConfig';

/**
 * Type de constructeur pour les zombies concrets
 */
type ZombieConstructor = new (scene: GameScene, x: number, y: number) => Zombie;

/**
 * Gestionnaire d'object pooling pour les entités
 * Optimise les performances en réutilisant les objets au lieu de les créer/détruire
 */
export class PoolManager {
  private scene: GameScene;
  private zombiePools: Map<ZombieType, Phaser.GameObjects.Group>;
  private zombieConstructors: Map<ZombieType, ZombieConstructor>;
  private maxPoolSize: number;

  constructor(scene: GameScene, maxPoolSize?: number) {
    this.scene = scene;
    this.zombiePools = new Map();
    this.zombieConstructors = new Map();

    // Utiliser la limite optimisée pour l'appareil si non spécifiée
    this.maxPoolSize = maxPoolSize ?? getPerformanceConfig().getMaxZombies();
  }

  /**
   * Enregistre un nouveau pool pour un type de zombie
   */
  public registerZombiePool(
    zombieType: ZombieType,
    classType: ZombieConstructor,
    initialSize: number = 10
  ): void {
    if (this.zombiePools.has(zombieType)) {
      return;
    }

    // Sauvegarder le constructeur
    this.zombieConstructors.set(zombieType, classType);

    const pool = this.scene.add.group({
      maxSize: this.maxPoolSize,
      runChildUpdate: false,
    });

    // Pré-remplir le pool
    for (let i = 0; i < initialSize; i++) {
      const zombie = new classType(this.scene, 0, 0);
      zombie.deactivate();
      pool.add(zombie);
    }

    this.zombiePools.set(zombieType, pool);
  }

  /**
   * Récupère un zombie du pool ou en crée un nouveau
   */
  public getZombie<T extends Zombie>(
    zombieType: ZombieType,
    x: number,
    y: number,
    classType: ZombieConstructor
  ): T | null {
    let pool = this.zombiePools.get(zombieType);

    // Créer le pool s'il n'existe pas
    if (!pool) {
      this.registerZombiePool(zombieType, classType, 5);
      pool = this.zombiePools.get(zombieType)!;
    }

    // Chercher un zombie inactif
    const zombie = pool.getFirstDead(false) as T | null;

    if (zombie) {
      zombie.reset(x, y);
      return zombie;
    }

    // Créer un nouveau zombie si le pool n'est pas plein
    if (pool.getLength() < this.maxPoolSize) {
      const constructor = this.zombieConstructors.get(zombieType);
      if (constructor) {
        const newZombie = new constructor(this.scene, x, y) as T;
        pool.add(newZombie);
        return newZombie;
      }
    }

    return null;
  }

  /**
   * Retourne un zombie au pool
   */
  public releaseZombie(zombie: Zombie): void {
    zombie.deactivate();
  }

  /**
   * Récupère le groupe physique pour un type de zombie
   */
  public getZombieGroup(zombieType: ZombieType): Phaser.GameObjects.Group | undefined {
    return this.zombiePools.get(zombieType);
  }

  /**
   * Récupère tous les groupes de zombies
   */
  public getAllZombieGroups(): Phaser.GameObjects.Group[] {
    return Array.from(this.zombiePools.values());
  }

  /**
   * Compte le nombre de zombies actifs
   */
  public getActiveZombieCount(): number {
    let count = 0;
    for (const pool of this.zombiePools.values()) {
      count += pool.countActive(true);
    }
    return count;
  }

  /**
   * Récupère tous les zombies actifs
   */
  public getActiveZombies(): Zombie[] {
    const activeZombies: Zombie[] = [];
    for (const pool of this.zombiePools.values()) {
      const children = pool.getChildren() as Zombie[];
      for (const zombie of children) {
        if (zombie.active) {
          activeZombies.push(zombie);
        }
      }
    }
    return activeZombies;
  }

  /**
   * Désactive tous les zombies
   */
  public releaseAllZombies(): void {
    for (const pool of this.zombiePools.values()) {
      const children = pool.getChildren() as Zombie[];
      for (const zombie of children) {
        if (zombie.active) {
          zombie.deactivate();
        }
      }
    }
  }

  /**
   * Nettoie les pools
   */
  public destroy(): void {
    for (const pool of this.zombiePools.values()) {
      pool.destroy(true);
    }
    this.zombiePools.clear();
    this.zombieConstructors.clear();
  }
}
