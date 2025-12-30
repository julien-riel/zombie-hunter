import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import {
  ActiveItem,
  ActiveItemType,
  PortableTurret,
  ProximityMine,
  AttackDrone,
  HolographicDecoy,
  DiscoBallGrenade,
} from '@items/active';
import { BALANCE } from '@config/balance';

/**
 * Informations sur un objet actif dans l'inventaire
 */
export interface ActiveItemInventoryInfo {
  type: ActiveItemType;
  name: string;
  description: string;
  color: number;
  charges: number;
  maxCharges: number;
  isEquipped: boolean;
}

/**
 * Informations sur un objet actif déployé
 */
export interface DeployedActiveItemInfo {
  id: string;
  type: ActiveItemType;
  position: { x: number; y: number };
  timeRemaining?: number;
  health?: number;
}

/**
 * Configuration de l'inventaire d'objets actifs
 */
interface InventorySlot {
  type: ActiveItemType;
  charges: number;
  maxCharges: number;
}

/**
 * Système de gestion des objets actifs
 *
 * Responsabilités:
 * - Gérer l'inventaire d'objets actifs du joueur
 * - Permettre l'utilisation et le déploiement des objets
 * - Mettre à jour les objets déployés
 * - Gérer les limites de déploiement par type
 */
export class ActiveItemSystem {
  private scene: GameScene;
  private player: Player;

  // Inventaire du joueur (type → charges)
  private inventory: Map<ActiveItemType, InventorySlot> = new Map();

  // Objets actuellement déployés
  private deployedItems: Map<string, ActiveItem> = new Map();

  // Objet équipé actuellement
  private equippedType: ActiveItemType | null = null;

  // Limites de déploiement par type
  private deploymentLimits: Map<ActiveItemType, number> = new Map([
    ['turret', BALANCE.activeItems.turret.maxActive],
    ['mine', BALANCE.activeItems.mine.maxActive],
    ['drone', 1], // Un seul drone à la fois
    ['decoy', 2], // Jusqu'à 2 leurres
    ['discoball', 1], // Une seule disco ball à la fois
  ]);

  // Charges maximales par défaut
  private defaultMaxCharges: Map<ActiveItemType, number> = new Map([
    ['turret', 2],
    ['mine', 5],
    ['drone', 2],
    ['decoy', 3],
    ['discoball', 2],
  ]);

  constructor(scene: GameScene, player: Player) {
    this.scene = scene;
    this.player = player;

    // Écouter les événements
    this.scene.events.on('activeitem:deploy', this.onItemDeployed, this);
    this.scene.events.on('activeitem:destroy', this.onItemDestroyed, this);

    // Initialiser avec quelques objets pour les tests
    // En production, ces objets seraient obtenus via drops ou achats
  }

  /**
   * Ajoute des charges d'un objet actif à l'inventaire
   */
  public addItem(type: ActiveItemType, charges: number = 1): void {
    const maxCharges = this.defaultMaxCharges.get(type) || 3;

    if (this.inventory.has(type)) {
      const slot = this.inventory.get(type)!;
      slot.charges = Math.min(slot.charges + charges, slot.maxCharges);
    } else {
      this.inventory.set(type, {
        type,
        charges,
        maxCharges,
      });

      // Équiper automatiquement si aucun objet n'est équipé
      if (!this.equippedType) {
        this.equippedType = type;
      }
    }

    console.log(`[ActiveItemSystem] Added ${charges} ${type}(s). Total: ${this.getCharges(type)}`);

    // Émettre l'événement de mise à jour de l'inventaire
    this.scene.events.emit('activeitem:inventory_update', {
      type,
      charges: this.getCharges(type),
    });
  }

  /**
   * Récupère le nombre de charges pour un type d'objet
   */
  public getCharges(type: ActiveItemType): number {
    return this.inventory.get(type)?.charges || 0;
  }

  /**
   * Vérifie si le joueur peut utiliser un objet
   */
  public canUseItem(type: ActiveItemType): boolean {
    // Vérifier les charges
    if (this.getCharges(type) <= 0) {
      return false;
    }

    // Vérifier la limite de déploiement
    const limit = this.deploymentLimits.get(type) || 1;
    const deployed = this.getDeployedCountByType(type);

    return deployed < limit;
  }

  /**
   * Utilise l'objet équipé à la position du joueur
   */
  public useEquippedItem(): boolean {
    if (!this.equippedType) {
      console.warn('[ActiveItemSystem] No item equipped');
      return false;
    }

    return this.useItem(this.equippedType, this.player.x, this.player.y);
  }

  /**
   * Utilise un objet actif à une position spécifique
   */
  public useItem(type: ActiveItemType, x: number, y: number): boolean {
    if (!this.canUseItem(type)) {
      console.warn(`[ActiveItemSystem] Cannot use ${type}: no charges or limit reached`);
      return false;
    }

    // Créer l'objet
    const item = this.createItem(type);
    if (!item) {
      return false;
    }

    // Déployer l'objet
    const success = item.use(this.player, this.scene, x, y);

    if (success) {
      // Consommer une charge
      const slot = this.inventory.get(type)!;
      slot.charges--;

      // Ajouter à la liste des objets déployés
      this.deployedItems.set(item.getId(), item);

      console.log(`[ActiveItemSystem] Used ${type}. Remaining charges: ${slot.charges}`);
    }

    return success;
  }

  /**
   * Crée une instance d'objet actif selon le type
   */
  private createItem(type: ActiveItemType): ActiveItem | null {
    switch (type) {
      case 'turret':
        return new PortableTurret();
      case 'mine':
        return new ProximityMine();
      case 'drone':
        return new AttackDrone();
      case 'decoy':
        return new HolographicDecoy();
      case 'discoball':
        return new DiscoBallGrenade();
      default:
        console.warn(`[ActiveItemSystem] Unknown item type: ${type}`);
        return null;
    }
  }

  /**
   * Équipe un type d'objet
   */
  public equipItem(type: ActiveItemType): boolean {
    if (!this.inventory.has(type)) {
      console.warn(`[ActiveItemSystem] Cannot equip ${type}: not in inventory`);
      return false;
    }

    this.equippedType = type;
    console.log(`[ActiveItemSystem] Equipped ${type}`);

    this.scene.events.emit('activeitem:equipped', { type });
    return true;
  }

  /**
   * Récupère le type d'objet équipé
   */
  public getEquippedType(): ActiveItemType | null {
    return this.equippedType;
  }

  /**
   * Cycle vers l'objet suivant dans l'inventaire
   */
  public cycleEquipped(direction: 1 | -1 = 1): ActiveItemType | null {
    const types = Array.from(this.inventory.keys());
    if (types.length === 0) return null;

    if (!this.equippedType) {
      this.equippedType = types[0];
    } else {
      const currentIndex = types.indexOf(this.equippedType);
      const newIndex = (currentIndex + direction + types.length) % types.length;
      this.equippedType = types[newIndex];
    }

    this.scene.events.emit('activeitem:equipped', { type: this.equippedType });
    return this.equippedType;
  }

  /**
   * Met à jour tous les objets déployés
   */
  public update(delta: number): void {
    const toRemove: string[] = [];

    for (const [id, item] of this.deployedItems.entries()) {
      const stillActive = item.update(delta);
      if (!stillActive) {
        toRemove.push(id);
      }
    }

    // Retirer les objets expirés/détruits
    for (const id of toRemove) {
      const item = this.deployedItems.get(id);
      if (item) {
        // S'assurer que destroy() est appelé pour nettoyer les visuels
        item.destroy();
      }
      this.deployedItems.delete(id);
    }
  }

  /**
   * Récupère le nombre d'objets déployés d'un type
   */
  public getDeployedCountByType(type: ActiveItemType): number {
    let count = 0;
    for (const item of this.deployedItems.values()) {
      if (item.type === type) {
        count++;
      }
    }
    return count;
  }

  /**
   * Récupère les informations sur tous les objets de l'inventaire
   */
  public getInventory(): ActiveItemInventoryInfo[] {
    const result: ActiveItemInventoryInfo[] = [];

    for (const [type, slot] of this.inventory.entries()) {
      const item = this.createItem(type);
      if (item) {
        result.push({
          type,
          name: item.name,
          description: item.description,
          color: item.color,
          charges: slot.charges,
          maxCharges: slot.maxCharges,
          isEquipped: type === this.equippedType,
        });
      }
    }

    return result;
  }

  /**
   * Récupère les informations sur tous les objets déployés
   */
  public getDeployedItems(): DeployedActiveItemInfo[] {
    const result: DeployedActiveItemInfo[] = [];

    for (const item of this.deployedItems.values()) {
      const state = item.getState();
      if (state) {
        result.push(state);
      }
    }

    return result;
  }

  /**
   * Gère l'événement de déploiement d'un objet
   */
  private onItemDeployed(data: { itemType: ActiveItemType; itemId: string }): void {
    console.log(`[ActiveItemSystem] Item deployed: ${data.itemType} (${data.itemId})`);
  }

  /**
   * Gère l'événement de destruction d'un objet
   */
  private onItemDestroyed(data: { itemType: ActiveItemType; itemId: string }): void {
    this.deployedItems.delete(data.itemId);
    console.log(`[ActiveItemSystem] Item destroyed: ${data.itemType} (${data.itemId})`);
  }

  /**
   * Déploie un objet pour le debug (sans consommer de charge)
   */
  public debugSpawnItem(type: ActiveItemType, x: number, y: number): boolean {
    // Vérifier la limite de déploiement
    const limit = this.deploymentLimits.get(type) || 1;
    const deployed = this.getDeployedCountByType(type);

    if (deployed >= limit) {
      console.warn(`[ActiveItemSystem] Debug spawn failed: limit reached for ${type}`);
      return false;
    }

    const item = this.createItem(type);
    if (!item) return false;

    const success = item.use(this.player, this.scene, x, y);
    if (success) {
      this.deployedItems.set(item.getId(), item);
    }

    return success;
  }

  /**
   * Détruit tous les objets déployés
   */
  public destroyAllDeployed(): void {
    for (const item of this.deployedItems.values()) {
      item.destroy();
    }
    this.deployedItems.clear();
  }

  /**
   * Nettoie les ressources du système
   */
  public destroy(): void {
    this.destroyAllDeployed();
    this.inventory.clear();
    this.equippedType = null;

    this.scene.events.off('activeitem:deploy', this.onItemDeployed, this);
    this.scene.events.off('activeitem:destroy', this.onItemDestroyed, this);
  }
}
