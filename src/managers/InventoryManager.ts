import Phaser from 'phaser';
import type {
  WeaponCategory,
  WeaponDefinition,
  LoadoutConfig,
  InventoryState,
  InventorySaveData,
} from '@/types/inventory';
import {
  DEFAULT_LOADOUT,
  DEFAULT_UNLOCKED_WEAPONS,
} from '@/types/inventory';
import { WeaponRegistry } from '@/systems/WeaponRegistry';

const STORAGE_KEY = 'zombie-hunter-inventory';

/**
 * Gestionnaire de l'inventaire du joueur
 * Gère les armes débloquées et le loadout actif
 */
export class InventoryManager extends Phaser.Events.EventEmitter {
  private state: InventoryState;

  constructor() {
    super();
    this.state = this.createInitialState();
  }

  /**
   * Crée l'état initial de l'inventaire
   */
  private createInitialState(): InventoryState {
    return {
      unlockedWeapons: [...DEFAULT_UNLOCKED_WEAPONS],
      currentLoadout: { ...DEFAULT_LOADOUT },
      defaultLoadout: { ...DEFAULT_LOADOUT },
    };
  }

  /**
   * Charge l'inventaire depuis le localStorage
   */
  load(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: InventorySaveData = JSON.parse(saved);
        this.state.unlockedWeapons = data.unlockedWeapons || [...DEFAULT_UNLOCKED_WEAPONS];
        this.state.currentLoadout = data.lastLoadout || { ...DEFAULT_LOADOUT };

        // Valider que les armes du loadout sont bien débloquées
        this.validateLoadout();
      }
    } catch (error) {
      console.warn('InventoryManager: Failed to load inventory, using defaults', error);
      this.state = this.createInitialState();
    }
  }

  /**
   * Sauvegarde l'inventaire dans le localStorage
   */
  save(): void {
    try {
      const data: InventorySaveData = {
        unlockedWeapons: this.state.unlockedWeapons,
        lastLoadout: this.state.currentLoadout,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('InventoryManager: Failed to save inventory', error);
    }
  }

  /**
   * Réinitialise l'inventaire aux valeurs par défaut
   */
  reset(): void {
    this.state = this.createInitialState();
    this.save();
    this.emit('inventory:reset');
  }

  // === GESTION DES ARMES DÉBLOQUÉES ===

  /**
   * Débloque une arme
   */
  unlockWeapon(weaponId: string): boolean {
    if (!WeaponRegistry.exists(weaponId)) {
      console.warn(`InventoryManager: Unknown weapon "${weaponId}"`);
      return false;
    }

    if (this.isUnlocked(weaponId)) {
      return false; // Déjà débloquée
    }

    this.state.unlockedWeapons.push(weaponId);
    this.save();

    const definition = WeaponRegistry.get(weaponId);
    this.emit('weapon:unlocked', { weaponId, definition });

    return true;
  }

  /**
   * Vérifie si une arme est débloquée
   */
  isUnlocked(weaponId: string): boolean {
    return this.state.unlockedWeapons.includes(weaponId);
  }

  /**
   * Retourne toutes les armes débloquées
   */
  getUnlockedWeapons(): WeaponDefinition[] {
    return this.state.unlockedWeapons
      .map(id => WeaponRegistry.get(id))
      .filter((w): w is WeaponDefinition => w !== undefined);
  }

  /**
   * Retourne les armes débloquées d'une catégorie
   */
  getUnlockedByCategory(category: WeaponCategory): WeaponDefinition[] {
    return this.getUnlockedWeapons().filter(w => w.category === category);
  }

  /**
   * Retourne les armes de mêlée débloquées
   */
  getUnlockedMeleeWeapons(): WeaponDefinition[] {
    return this.getUnlockedByCategory('melee');
  }

  /**
   * Retourne les armes à distance débloquées
   */
  getUnlockedRangedWeapons(): WeaponDefinition[] {
    return this.getUnlockedByCategory('ranged');
  }

  /**
   * Retourne le nombre d'armes débloquées
   */
  getUnlockedCount(): number {
    return this.state.unlockedWeapons.length;
  }

  // === GESTION DU LOADOUT ===

  /**
   * Définit le loadout complet
   */
  setLoadout(loadout: LoadoutConfig): boolean {
    if (!this.isLoadoutValid(loadout)) {
      console.warn('InventoryManager: Invalid loadout configuration');
      return false;
    }

    this.state.currentLoadout = { ...loadout };
    this.save();
    this.emit('loadout:changed', { loadout: this.state.currentLoadout });

    return true;
  }

  /**
   * Retourne le loadout actuel
   */
  getLoadout(): LoadoutConfig {
    return { ...this.state.currentLoadout };
  }

  /**
   * Définit une arme dans un slot spécifique
   */
  setSlot(category: WeaponCategory, slotIndex: 0 | 1, weaponId: string | null): boolean {
    // Vérifier que l'arme est débloquée (si non null)
    if (weaponId !== null && !this.isUnlocked(weaponId)) {
      console.warn(`InventoryManager: Weapon "${weaponId}" is not unlocked`);
      return false;
    }

    // Vérifier que l'arme correspond à la catégorie
    if (weaponId !== null) {
      const definition = WeaponRegistry.get(weaponId);
      if (!definition || definition.category !== category) {
        console.warn(`InventoryManager: Weapon "${weaponId}" is not a ${category} weapon`);
        return false;
      }
    }

    // Mettre à jour le slot
    if (category === 'melee') {
      this.state.currentLoadout.meleeSlots[slotIndex] = weaponId;
    } else {
      this.state.currentLoadout.rangedSlots[slotIndex] = weaponId;
    }

    this.save();
    this.emit('slot:changed', { category, slotIndex, weaponId });

    return true;
  }

  /**
   * Retourne l'arme d'un slot spécifique
   */
  getSlot(category: WeaponCategory, slotIndex: 0 | 1): string | null {
    if (category === 'melee') {
      return this.state.currentLoadout.meleeSlots[slotIndex];
    }
    return this.state.currentLoadout.rangedSlots[slotIndex];
  }

  /**
   * Retourne la définition de l'arme d'un slot
   */
  getSlotDefinition(category: WeaponCategory, slotIndex: 0 | 1): WeaponDefinition | null {
    const weaponId = this.getSlot(category, slotIndex);
    if (!weaponId) return null;
    return WeaponRegistry.get(weaponId) || null;
  }

  /**
   * Échange deux slots de la même catégorie
   */
  swapSlots(category: WeaponCategory): void {
    if (category === 'melee') {
      const [slot0, slot1] = this.state.currentLoadout.meleeSlots;
      this.state.currentLoadout.meleeSlots = [slot1, slot0];
    } else {
      const [slot0, slot1] = this.state.currentLoadout.rangedSlots;
      this.state.currentLoadout.rangedSlots = [slot1, slot0];
    }
    this.save();
    this.emit('loadout:changed', { loadout: this.state.currentLoadout });
  }

  /**
   * Réinitialise le loadout aux valeurs par défaut
   */
  resetLoadout(): void {
    this.state.currentLoadout = { ...this.state.defaultLoadout };
    this.save();
    this.emit('loadout:changed', { loadout: this.state.currentLoadout });
  }

  // === VALIDATION ===

  /**
   * Vérifie si un loadout est valide
   */
  isLoadoutValid(loadout: LoadoutConfig): boolean {
    // Vérifier les armes de mêlée
    for (const weaponId of loadout.meleeSlots) {
      if (weaponId !== null) {
        if (!this.isUnlocked(weaponId)) return false;
        const def = WeaponRegistry.get(weaponId);
        if (!def || def.category !== 'melee') return false;
      }
    }

    // Vérifier les armes à distance
    for (const weaponId of loadout.rangedSlots) {
      if (weaponId !== null) {
        if (!this.isUnlocked(weaponId)) return false;
        const def = WeaponRegistry.get(weaponId);
        if (!def || def.category !== 'ranged') return false;
      }
    }

    // Au moins une arme doit être équipée
    const hasWeapon = loadout.meleeSlots.some(w => w !== null) ||
                      loadout.rangedSlots.some(w => w !== null);
    return hasWeapon;
  }

  /**
   * Valide le loadout actuel et corrige si nécessaire
   */
  private validateLoadout(): void {
    let needsFix = false;

    // Vérifier chaque slot de mêlée
    for (let i = 0; i < 2; i++) {
      const weaponId = this.state.currentLoadout.meleeSlots[i as 0 | 1];
      if (weaponId !== null && !this.isUnlocked(weaponId)) {
        this.state.currentLoadout.meleeSlots[i as 0 | 1] = null;
        needsFix = true;
      }
    }

    // Vérifier chaque slot à distance
    for (let i = 0; i < 2; i++) {
      const weaponId = this.state.currentLoadout.rangedSlots[i as 0 | 1];
      if (weaponId !== null && !this.isUnlocked(weaponId)) {
        this.state.currentLoadout.rangedSlots[i as 0 | 1] = null;
        needsFix = true;
      }
    }

    // Si le loadout est vide, utiliser le défaut
    if (!this.isLoadoutValid(this.state.currentLoadout)) {
      this.state.currentLoadout = { ...DEFAULT_LOADOUT };
      needsFix = true;
    }

    if (needsFix) {
      this.save();
    }
  }

  // === DEBUG ===

  /**
   * Débloque toutes les armes (debug)
   */
  unlockAllWeapons(): void {
    const allWeapons = WeaponRegistry.getAll();
    for (const weapon of allWeapons) {
      if (!this.isUnlocked(weapon.id)) {
        this.state.unlockedWeapons.push(weapon.id);
      }
    }
    this.save();
    this.emit('inventory:unlockAll');
  }

  /**
   * Retourne l'état complet (debug)
   */
  getState(): InventoryState {
    return {
      unlockedWeapons: [...this.state.unlockedWeapons],
      currentLoadout: { ...this.state.currentLoadout },
      defaultLoadout: { ...this.state.defaultLoadout },
    };
  }
}
