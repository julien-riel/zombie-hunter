import Phaser from 'phaser';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';
import type { ComboSystem } from './ComboSystem';
import { Drop, DropType } from '@items/drops';
import { AmmoDrop } from '@items/drops/AmmoDrop';
import { HealthDrop } from '@items/drops/HealthDrop';
import { PowerUpDrop } from '@items/drops/PowerUpDrop';
import { MeleeWeaponDrop, selectRandomMeleeWeapon } from '@items/drops/MeleeWeaponDrop';
import type { ZombieBalanceType } from '@config/balance';

/**
 * Interface pour une entrée de la table de loot
 */
interface LootTableEntry {
  ammo: number;
  healthSmall: number;
  healthMedium: number;
  powerUp: number;
  meleeWeapon: number;
}

/**
 * Système de gestion des drops
 *
 * Gère la création, le suivi et la collecte des drops dans le jeu.
 *
 * Responsabilités:
 * - Écouter les morts de zombies et générer des drops
 * - Gérer le pooling des objets drop
 * - Détecter les collisions avec le joueur
 * - Appliquer le bonus de qualité du combo
 */
export class DropSystem {
  private scene: GameScene;
  private player: Player;
  private comboSystem: ComboSystem;
  private config: typeof BALANCE.drops;

  // Pools de drops par type
  private ammoDropPool: Phaser.GameObjects.Group;
  private healthSmallDropPool: Phaser.GameObjects.Group;
  private healthMediumDropPool: Phaser.GameObjects.Group;
  private powerUpDropPool: Phaser.GameObjects.Group;
  private meleeWeaponDropPool: Phaser.GameObjects.Group;

  // Tous les drops actifs (pour l'update)
  private activeDrops: Set<Drop> = new Set();
  // Drops d'armes de mêlée actifs (géré séparément car classe différente)
  private activeMeleeDrops: Set<MeleeWeaponDrop> = new Set();

  constructor(scene: GameScene, player: Player, comboSystem: ComboSystem) {
    this.scene = scene;
    this.player = player;
    this.comboSystem = comboSystem;
    this.config = BALANCE.drops;

    // Initialiser les pools
    this.ammoDropPool = this.scene.add.group({
      classType: AmmoDrop,
      maxSize: 30,
      runChildUpdate: false,
    });

    this.healthSmallDropPool = this.scene.add.group({
      classType: HealthDrop,
      maxSize: 20,
      runChildUpdate: false,
    });

    this.healthMediumDropPool = this.scene.add.group({
      classType: HealthDrop,
      maxSize: 10,
      runChildUpdate: false,
    });

    this.powerUpDropPool = this.scene.add.group({
      classType: PowerUpDrop,
      maxSize: 10,
      runChildUpdate: false,
    });

    this.meleeWeaponDropPool = this.scene.add.group({
      classType: MeleeWeaponDrop,
      maxSize: 5,
      runChildUpdate: false,
    });

    // Écouter les événements de mort de zombie
    this.scene.events.on('zombieDeath', this.onZombieDeath, this);
  }

  /**
   * Appelé quand un zombie meurt
   */
  private onZombieDeath(zombie: Zombie): void {
    const zombieType = zombie.getType() as ZombieBalanceType;
    const position = { x: zombie.x, y: zombie.y };

    // Récupérer la table de loot pour ce type de zombie
    const lootTable = this.getLootTable(zombieType);
    if (!lootTable) return;

    // Calculer le bonus de qualité du combo
    const comboBonus = this.comboSystem.getDropQualityBonus();

    // Générer les drops
    this.generateDrops(lootTable, position, comboBonus);
  }

  /**
   * Récupère la table de loot pour un type de zombie
   */
  private getLootTable(zombieType: ZombieBalanceType): LootTableEntry | null {
    const tables = this.config.lootTables as Record<ZombieBalanceType, LootTableEntry>;
    return tables[zombieType] || null;
  }

  /**
   * Génère les drops basés sur la table de loot
   */
  private generateDrops(
    lootTable: LootTableEntry,
    position: { x: number; y: number },
    comboBonus: number
  ): void {
    // Vérifier chaque type de drop
    if (this.rollDrop(lootTable.ammo, comboBonus)) {
      this.spawnDrop('ammo', position.x, position.y);
    }

    if (this.rollDrop(lootTable.healthSmall, comboBonus)) {
      this.spawnDrop('healthSmall', position.x, position.y);
    }

    if (this.rollDrop(lootTable.healthMedium, comboBonus)) {
      this.spawnDrop('healthMedium', position.x, position.y);
    }

    if (this.rollDrop(lootTable.powerUp, comboBonus)) {
      this.spawnDrop('powerUp', position.x, position.y);
    }

    if (this.rollDrop(lootTable.meleeWeapon, comboBonus)) {
      this.spawnMeleeWeaponDrop(position.x, position.y);
    }
  }

  /**
   * Effectue un jet de dés pour savoir si un drop doit apparaître
   */
  private rollDrop(baseProbability: number, comboBonus: number): boolean {
    if (baseProbability <= 0) return false;

    // Appliquer le bonus de combo
    const adjustedProbability = baseProbability * (1 + comboBonus);
    return Math.random() < adjustedProbability;
  }

  /**
   * Fait apparaître un drop
   */
  private spawnDrop(type: DropType, x: number, y: number): Drop | null {
    // Vérifier la limite de drops au sol
    if (this.activeDrops.size >= this.config.maxDropsOnGround) {
      // Supprimer le drop le plus ancien
      const oldestDrop = this.activeDrops.values().next().value;
      if (oldestDrop) {
        this.releaseDrop(oldestDrop);
      }
    }

    let drop: Drop | null = null;

    switch (type) {
      case 'ammo':
        drop = this.getOrCreateDrop(this.ammoDropPool, x, y, () => new AmmoDrop(this.scene, x, y));
        break;

      case 'healthSmall':
        drop = this.getOrCreateDrop(
          this.healthSmallDropPool,
          x,
          y,
          () => new HealthDrop(this.scene, x, y, 'small')
        );
        break;

      case 'healthMedium':
        drop = this.getOrCreateDrop(
          this.healthMediumDropPool,
          x,
          y,
          () => new HealthDrop(this.scene, x, y, 'medium')
        );
        break;

      case 'powerUp':
        drop = this.getOrCreateDrop(
          this.powerUpDropPool,
          x,
          y,
          () => new PowerUpDrop(this.scene, x, y)
        );
        break;
    }

    if (drop) {
      this.activeDrops.add(drop);

      // Émettre l'événement de drop
      this.scene.events.emit('item:drop', {
        itemType: type,
        position: { x, y },
        source: 'zombie',
      });
    }

    return drop;
  }

  /**
   * Récupère un drop du pool ou en crée un nouveau
   */
  private getOrCreateDrop(
    pool: Phaser.GameObjects.Group,
    x: number,
    y: number,
    factory: () => Drop
  ): Drop | null {
    // Chercher un drop inactif dans le pool
    const inactiveDrop = pool.getFirstDead(false) as Drop | null;

    if (inactiveDrop) {
      inactiveDrop.reset(x, y);
      return inactiveDrop;
    }

    // Si le pool n'est pas plein, créer un nouveau drop
    if (pool.getLength() < (pool.maxSize ?? 50)) {
      const newDrop = factory();
      pool.add(newDrop);
      return newDrop;
    }

    return null;
  }

  /**
   * Libère un drop (retour au pool)
   */
  private releaseDrop(drop: Drop): void {
    drop.deactivate();
    this.activeDrops.delete(drop);
  }

  /**
   * Fait apparaître un drop d'arme de mêlée
   */
  private spawnMeleeWeaponDrop(x: number, y: number): MeleeWeaponDrop | null {
    // Obtenir la vague actuelle pour déterminer le tier
    const currentWave = this.scene.getWaveSystem()?.getCurrentWave() ?? 1;

    // Vérifier si la vague est assez avancée pour les drops de mêlée
    const minWave = this.config.meleeWeapon?.waveModifier?.minWaveForTier2 ?? 3;
    if (currentWave < minWave) {
      return null;
    }

    // Sélectionner une arme aléatoire
    const weaponType = selectRandomMeleeWeapon(currentWave);

    // Chercher un drop inactif dans le pool
    const inactiveDrop = this.meleeWeaponDropPool.getFirstDead(false) as MeleeWeaponDrop | null;

    let meleeDrop: MeleeWeaponDrop;

    if (inactiveDrop) {
      inactiveDrop.reset(x, y, weaponType);
      meleeDrop = inactiveDrop;
    } else if (this.meleeWeaponDropPool.getLength() < (this.meleeWeaponDropPool.maxSize ?? 5)) {
      meleeDrop = new MeleeWeaponDrop(this.scene, x, y, weaponType);
      this.meleeWeaponDropPool.add(meleeDrop);
    } else {
      return null;
    }

    this.activeMeleeDrops.add(meleeDrop);

    // Émettre l'événement de drop
    this.scene.events.emit('item:drop', {
      itemType: 'meleeWeapon',
      weaponType,
      position: { x, y },
      source: 'zombie',
    });

    return meleeDrop;
  }

  /**
   * Met à jour le système de drops
   */
  public update(): void {
    // Mettre à jour tous les drops actifs
    for (const drop of this.activeDrops) {
      if (drop.active) {
        drop.update(this.player);

        // Vérifier la collecte
        const distance = Phaser.Math.Distance.Between(drop.x, drop.y, this.player.x, this.player.y);
        if (distance <= this.config.collectionRadius) {
          this.collectDrop(drop);
        }
      } else {
        // Supprimer les drops inactifs du set
        this.activeDrops.delete(drop);
      }
    }

    // Mettre à jour les drops d'armes de mêlée
    for (const meleeDrop of this.activeMeleeDrops) {
      if (meleeDrop.active) {
        meleeDrop.update(this.player);
      } else {
        this.activeMeleeDrops.delete(meleeDrop);
      }
    }
  }

  /**
   * Collecte un drop
   */
  private collectDrop(drop: Drop): void {
    if (!drop.active) return;

    drop.collect(this.player);
    this.activeDrops.delete(drop);
  }

  /**
   * Retourne le nombre de drops actifs
   */
  public getActiveDropCount(): number {
    return this.activeDrops.size + this.activeMeleeDrops.size;
  }

  /**
   * Spawn un drop manuellement (pour debug)
   */
  public spawnDropDebug(type: DropType, x: number, y: number): Drop | MeleeWeaponDrop | null {
    if (type === 'meleeWeapon') {
      return this.spawnMeleeWeaponDrop(x, y);
    }
    return this.spawnDrop(type, x, y);
  }

  /**
   * Supprime tous les drops actifs
   */
  public clearAllDrops(): void {
    for (const drop of this.activeDrops) {
      drop.deactivate();
    }
    this.activeDrops.clear();

    for (const meleeDrop of this.activeMeleeDrops) {
      meleeDrop.deactivate();
    }
    this.activeMeleeDrops.clear();
  }

  /**
   * Nettoie les ressources du système
   */
  public destroy(): void {
    this.scene.events.off('zombieDeath', this.onZombieDeath, this);

    this.clearAllDrops();

    this.ammoDropPool.destroy(true);
    this.healthSmallDropPool.destroy(true);
    this.healthMediumDropPool.destroy(true);
    this.powerUpDropPool.destroy(true);
    this.meleeWeaponDropPool.destroy(true);
  }
}
