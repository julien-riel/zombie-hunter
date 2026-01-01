import type { GameScene } from '@scenes/GameScene';
import type { ComboSystem } from './ComboSystem';
import type { ZombieType } from '@/types/entities';
import { BALANCE } from '@config/balance';
import { WeaponRegistry } from '@/systems/WeaponRegistry';

/**
 * Configuration de l'économie (depuis balance.ts)
 */
const ECONOMY = BALANCE.economy;

/**
 * Types d'achats disponibles dans le menu tactique
 */
export type PurchaseType = 'ammo' | 'healthSmall' | 'healthLarge' | 'mine' | 'turret';

/**
 * Information sur un achat
 */
export interface PurchaseInfo {
  type: PurchaseType;
  cost: number;
  description: string;
  canAfford: boolean;
  canUse: boolean;
}

/**
 * Système de gestion de l'économie du jeu (Phase 6.6)
 *
 * Gère les points gagnés en tuant des zombies et les dépenses
 * pour les avantages tactiques entre les vagues.
 */
export class EconomySystem {
  private scene: GameScene;
  private comboSystem: ComboSystem | null = null;

  /** Points actuels du joueur */
  private points: number = 0;

  /** Total des points gagnés (pour les stats) */
  private totalPointsEarned: number = 0;

  /** Total des points dépensés (pour les stats) */
  private totalPointsSpent: number = 0;

  constructor(scene: GameScene) {
    this.scene = scene;

    // Écouter les événements de mort des zombies
    this.scene.events.on('zombieDeath', this.onZombieDeath, this);
  }

  /**
   * Configure le système de combo (pour le multiplicateur de points)
   */
  public setComboSystem(comboSystem: ComboSystem): void {
    this.comboSystem = comboSystem;
  }

  /**
   * Appelé quand un zombie est tué
   */
  private onZombieDeath(zombie: { zombieType?: ZombieType }): void {
    if (!zombie.zombieType) return;

    const pointsEarned = this.calculatePoints(zombie.zombieType);
    this.addPoints(pointsEarned);

    // Émettre un événement pour les effets visuels
    this.scene.events.emit('economy:points_earned', {
      amount: pointsEarned,
      total: this.points,
      zombieType: zombie.zombieType,
    });
  }

  /**
   * Calcule les points gagnés pour un type de zombie
   */
  private calculatePoints(zombieType: ZombieType): number {
    const basePoints = ECONOMY.basePointsPerKill;
    const typeMultiplier = ECONOMY.zombiePointMultipliers[zombieType] || 1.0;

    let points = basePoints * typeMultiplier;

    // Appliquer le multiplicateur de combo si activé
    if (ECONOMY.comboMultiplierEnabled && this.comboSystem) {
      const comboMultiplier = this.comboSystem.getMultiplier();
      points *= comboMultiplier;
    }

    return Math.floor(points);
  }

  /**
   * Ajoute des points au joueur
   */
  public addPoints(amount: number): void {
    const actualAmount = Math.max(0, Math.floor(amount));
    this.points += actualAmount;
    this.totalPointsEarned += actualAmount;

    // Émettre un événement pour le HUD
    this.scene.events.emit('economy:update', {
      points: this.points,
      earned: actualAmount,
    });
  }

  /**
   * Dépense des points
   * @returns true si les points ont été dépensés, false si pas assez de points
   */
  public spendPoints(amount: number): boolean {
    if (amount <= 0) return false;
    if (!this.canAfford(amount)) return false;

    this.points -= amount;
    this.totalPointsSpent += amount;

    // Émettre un événement pour le HUD
    this.scene.events.emit('economy:update', {
      points: this.points,
      spent: amount,
    });

    return true;
  }

  /**
   * Vérifie si le joueur peut se permettre un achat
   */
  public canAfford(cost: number): boolean {
    return this.points >= cost;
  }

  /**
   * Récupère le nombre de points actuels
   */
  public getPoints(): number {
    return this.points;
  }

  /**
   * Récupère les statistiques d'économie
   */
  public getStats(): { points: number; totalEarned: number; totalSpent: number } {
    return {
      points: this.points,
      totalEarned: this.totalPointsEarned,
      totalSpent: this.totalPointsSpent,
    };
  }

  /**
   * Effectue un achat du menu tactique
   * @returns true si l'achat a réussi
   */
  public purchase(type: PurchaseType): boolean {
    const purchaseConfig = ECONOMY.purchases[type];
    if (!purchaseConfig) {
      console.warn(`[EconomySystem] Unknown purchase type: ${type}`);
      return false;
    }

    const cost = purchaseConfig.cost;
    if (!this.canAfford(cost)) {
      this.scene.events.emit('economy:purchase_failed', {
        type,
        cost,
        points: this.points,
        reason: 'insufficient_funds',
      });
      return false;
    }

    // Vérifier si l'achat est utilisable
    const canUse = this.canUsePurchase(type);
    if (!canUse) {
      this.scene.events.emit('economy:purchase_failed', {
        type,
        cost,
        points: this.points,
        reason: 'not_usable',
      });
      return false;
    }

    // Effectuer l'achat
    this.spendPoints(cost);
    this.applyPurchase(type);

    this.scene.events.emit('economy:purchase_success', {
      type,
      cost,
      remainingPoints: this.points,
    });

    return true;
  }

  /**
   * Vérifie si un achat peut être utilisé
   */
  private canUsePurchase(type: PurchaseType): boolean {
    const player = this.scene.getPlayer();

    switch (type) {
      case 'ammo': {
        // Vérifier si l'arme actuelle n'est pas pleine
        const weapon = player.currentWeapon;
        return weapon !== null && !weapon.isFullAmmo();
      }
      case 'healthSmall':
      case 'healthLarge': {
        // Vérifier si le joueur n'a pas la vie pleine
        return player.getHealth() < player.getMaxHealth();
      }
      case 'mine':
      case 'turret': {
        // Toujours utilisable si on peut l'acheter
        return true;
      }
      default:
        return true;
    }
  }

  /**
   * Applique l'effet d'un achat
   */
  private applyPurchase(type: PurchaseType): void {
    const player = this.scene.getPlayer();

    switch (type) {
      case 'ammo': {
        const weapon = player.currentWeapon;
        if (weapon) {
          // Recharge complète
          weapon.addAmmo(weapon.getMagazineSize());
        }
        break;
      }
      case 'healthSmall': {
        const smallConfig = ECONOMY.purchases.healthSmall;
        player.heal(smallConfig.healAmount);
        break;
      }
      case 'healthLarge': {
        const largeConfig = ECONOMY.purchases.healthLarge;
        player.heal(largeConfig.healAmount);
        break;
      }
      case 'mine': {
        const mineConfig = ECONOMY.purchases.mine;
        const activeItemSystem = this.scene.getActiveItemSystem();
        if (activeItemSystem) {
          activeItemSystem.addItem('mine', mineConfig.charges);
        }
        break;
      }
      case 'turret': {
        const turretConfig = ECONOMY.purchases.turret;
        const activeItemSystem = this.scene.getActiveItemSystem();
        if (activeItemSystem) {
          activeItemSystem.addItem('turret', turretConfig.charges);
        }
        break;
      }
    }
  }

  /**
   * Tente d'acheter une arme
   * @returns true si l'achat a réussi
   */
  public purchaseWeapon(weaponId: string): boolean {
    const definition = WeaponRegistry.get(weaponId);
    if (!definition) {
      console.warn(`[EconomySystem] Unknown weapon: ${weaponId}`);
      return false;
    }

    // Vérifier que c'est une arme achetable
    const unlockCondition = definition.unlockCondition;
    if (!unlockCondition || unlockCondition.type !== 'purchase') {
      console.warn(`[EconomySystem] Weapon ${weaponId} is not purchasable`);
      return false;
    }

    const cost = unlockCondition.value || 0;

    // Vérifier si l'arme est déjà débloquée
    const inventoryManager = this.scene.getInventoryManager?.();
    if (inventoryManager && inventoryManager.isUnlocked(weaponId)) {
      this.scene.events.emit('economy:weapon_purchase_failed', {
        weaponId,
        reason: 'already_unlocked',
      });
      return false;
    }

    // Vérifier les points
    if (!this.canAfford(cost)) {
      this.scene.events.emit('economy:weapon_purchase_failed', {
        weaponId,
        cost,
        points: this.points,
        reason: 'insufficient_funds',
      });
      return false;
    }

    // Effectuer l'achat
    this.spendPoints(cost);

    // Débloquer l'arme dans l'inventaire
    if (inventoryManager) {
      inventoryManager.unlockWeapon(weaponId);
    }

    this.scene.events.emit('economy:weapon_purchased', {
      weaponId,
      cost,
      remainingPoints: this.points,
      definition,
    });

    return true;
  }

  /**
   * Récupère les armes achetables avec leur état
   */
  public getPurchasableWeapons(): Array<{
    weaponId: string;
    name: string;
    cost: number;
    canAfford: boolean;
    isUnlocked: boolean;
    category: 'melee' | 'ranged';
    description?: string;
  }> {
    const allWeapons = WeaponRegistry.getAll();
    const inventoryManager = this.scene.getInventoryManager?.();

    return allWeapons
      .filter(w => w.unlockCondition?.type === 'purchase')
      .map(w => ({
        weaponId: w.id,
        name: w.name,
        cost: w.unlockCondition?.value || 0,
        canAfford: this.canAfford(w.unlockCondition?.value || 0),
        isUnlocked: inventoryManager?.isUnlocked(w.id) || false,
        category: w.category,
        description: w.description,
      }));
  }

  /**
   * Récupère les informations sur tous les achats disponibles
   */
  public getAvailablePurchases(): PurchaseInfo[] {
    const purchases: PurchaseInfo[] = [];

    const types: PurchaseType[] = ['ammo', 'healthSmall', 'healthLarge', 'mine', 'turret'];
    const descriptions: Record<PurchaseType, string> = {
      ammo: 'Recharge arme actuelle',
      healthSmall: '+25 HP',
      healthLarge: '+50 HP',
      mine: '+1 Mine de proximité',
      turret: '+1 Tourelle portable',
    };

    for (const type of types) {
      const config = ECONOMY.purchases[type];
      purchases.push({
        type,
        cost: config.cost,
        description: descriptions[type],
        canAfford: this.canAfford(config.cost),
        canUse: this.canUsePurchase(type),
      });
    }

    return purchases;
  }

  /**
   * Récupère le coût d'une barricade
   */
  public getBarricadeCost(type: 'light' | 'reinforced'): number {
    return BALANCE.doors.barricades[type].cost;
  }

  /**
   * Récupère le coût d'un piège
   */
  public getTrapCost(type: 'spike' | 'slow' | 'fire'): number {
    return BALANCE.doors.traps[type].cost;
  }

  /**
   * Récupère le coût de réparation
   */
  public getRepairCost(): number {
    return BALANCE.doors.repairCost;
  }

  /**
   * Réinitialise le système économique (nouvelle partie)
   */
  public reset(): void {
    this.points = 0;
    this.totalPointsEarned = 0;
    this.totalPointsSpent = 0;

    this.scene.events.emit('economy:update', {
      points: this.points,
      reset: true,
    });
  }

  /**
   * Définit les points directement (pour debug)
   */
  public setPoints(amount: number): void {
    this.points = Math.max(0, Math.floor(amount));
    this.scene.events.emit('economy:update', {
      points: this.points,
      debug: true,
    });
  }

  /**
   * Nettoie le système
   */
  public destroy(): void {
    this.scene.events.off('zombieDeath', this.onZombieDeath, this);
  }
}
