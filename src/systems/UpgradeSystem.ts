import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import {
  UPGRADES,
  RARITY_CONFIG,
  DEFAULT_PLAYER_STATS,
  UPGRADE_SYSTEM_CONFIG,
  getUpgradeById,
  type UpgradeDefinition,
  type UpgradeRarity,
  type PlayerUpgradeStats,
} from '@config/upgrades';

/**
 * Information sur un upgrade appliqué
 */
export interface AppliedUpgrade {
  upgrade: UpgradeDefinition;
  stacks: number;
}

/**
 * Système de gestion des upgrades roguelite (Phase 6.5)
 *
 * Gère:
 * - Le pool d'upgrades disponibles
 * - La génération de choix aléatoires
 * - L'application des upgrades au joueur
 * - Le suivi des upgrades appliqués
 */
export class UpgradeSystem {
  private scene: GameScene;
  private player: Player;

  /** Pool d'upgrades disponibles (filtrés par prérequis et stacks) */
  private availablePool: UpgradeDefinition[];

  /** Upgrades appliqués au joueur (id → stacks) */
  private appliedUpgrades: Map<string, number>;

  /** Stats modifiées par les upgrades */
  private playerStats: PlayerUpgradeStats;

  /** Historique des choix proposés */
  private selectionHistory: UpgradeDefinition[][];

  constructor(scene: GameScene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.availablePool = [...UPGRADES];
    this.appliedUpgrades = new Map();
    this.playerStats = { ...DEFAULT_PLAYER_STATS };
    this.selectionHistory = [];
  }

  /**
   * Génère un ensemble de choix d'upgrades
   * @param count Nombre de choix à générer (défaut: 3)
   * @returns Tableau d'upgrades à proposer
   */
  public generateChoices(count: number = UPGRADE_SYSTEM_CONFIG.choicesPerSelection): UpgradeDefinition[] {
    // Mettre à jour le pool disponible
    this.updateAvailablePool();

    if (this.availablePool.length === 0) {
      console.warn('[UpgradeSystem] No upgrades available');
      return [];
    }

    const choices: UpgradeDefinition[] = [];
    const poolCopy = [...this.availablePool];

    for (let i = 0; i < count && poolCopy.length > 0; i++) {
      // Sélection pondérée par rareté
      const selectedUpgrade = this.selectWeightedRandom(poolCopy);

      if (selectedUpgrade) {
        choices.push(selectedUpgrade);
        // Retirer du pool temporaire pour éviter les doublons
        const index = poolCopy.indexOf(selectedUpgrade);
        if (index > -1) {
          poolCopy.splice(index, 1);
        }
      }
    }

    // Enregistrer dans l'historique
    this.selectionHistory.push(choices);

    // Émettre l'événement
    this.scene.events.emit('upgrade:offered', {
      choices: choices.map(u => ({
        id: u.id,
        name: u.name,
        rarity: u.rarity,
      })),
    });

    return choices;
  }

  /**
   * Sélectionne un upgrade aléatoire pondéré par rareté
   */
  private selectWeightedRandom(pool: UpgradeDefinition[]): UpgradeDefinition | null {
    if (pool.length === 0) return null;

    // Calculer les poids totaux par rareté
    const weights: number[] = pool.map(upgrade => {
      return RARITY_CONFIG[upgrade.rarity].probability;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < pool.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return pool[i];
      }
    }

    // Fallback au premier
    return pool[0];
  }

  /**
   * Met à jour le pool d'upgrades disponibles
   * Filtre les upgrades déjà au max stacks ou sans prérequis
   */
  private updateAvailablePool(): void {
    this.availablePool = UPGRADES.filter(upgrade => {
      // Vérifier les stacks max
      const currentStacks = this.appliedUpgrades.get(upgrade.id) || 0;
      if (currentStacks >= upgrade.maxStacks) {
        return false;
      }

      // Vérifier les prérequis
      if (upgrade.prerequisites && upgrade.prerequisites.length > 0) {
        for (const prereq of upgrade.prerequisites) {
          if (!this.appliedUpgrades.has(prereq)) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Applique un upgrade au joueur
   * @param upgrade L'upgrade à appliquer
   * @returns true si l'upgrade a été appliqué avec succès
   */
  public applyUpgrade(upgrade: UpgradeDefinition): boolean {
    // Vérifier si l'upgrade peut être appliqué
    if (!this.canApply(upgrade)) {
      console.warn(`[UpgradeSystem] Cannot apply upgrade: ${upgrade.id}`);
      return false;
    }

    // Incrémenter le compteur de stacks
    const currentStacks = this.appliedUpgrades.get(upgrade.id) || 0;
    this.appliedUpgrades.set(upgrade.id, currentStacks + 1);

    // Appliquer l'effet
    upgrade.apply(this.playerStats);

    // Appliquer les stats au joueur
    this.applyStatsToPlayer();

    // Émettre l'événement
    this.scene.events.emit('upgrade:selected', {
      upgradeId: upgrade.id,
      upgradeName: upgrade.name,
    });

    console.log(`[UpgradeSystem] Applied upgrade: ${upgrade.name} (stack ${currentStacks + 1}/${upgrade.maxStacks})`);

    return true;
  }

  /**
   * Applique un upgrade par son ID
   */
  public applyUpgradeById(upgradeId: string): boolean {
    const upgrade = getUpgradeById(upgradeId);
    if (!upgrade) {
      console.warn(`[UpgradeSystem] Unknown upgrade ID: ${upgradeId}`);
      return false;
    }
    return this.applyUpgrade(upgrade);
  }

  /**
   * Vérifie si un upgrade peut être appliqué
   */
  public canApply(upgrade: UpgradeDefinition): boolean {
    // Vérifier les stacks max
    const currentStacks = this.appliedUpgrades.get(upgrade.id) || 0;
    if (currentStacks >= upgrade.maxStacks) {
      return false;
    }

    // Vérifier les prérequis
    if (upgrade.prerequisites && upgrade.prerequisites.length > 0) {
      for (const prereq of upgrade.prerequisites) {
        if (!this.appliedUpgrades.has(prereq)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Applique les stats modifiées au joueur
   */
  private applyStatsToPlayer(): void {
    // Mettre à jour maxHealth
    const newMaxHealth = 100 + this.playerStats.maxHealthBonus;
    if (this.player.maxHealth !== newMaxHealth) {
      const healthDiff = newMaxHealth - this.player.maxHealth;
      this.player.maxHealth = newMaxHealth;
      // Si on gagne du max HP, soigner d'autant
      if (healthDiff > 0) {
        this.player.heal(healthDiff);
      }
    }

    // Les autres stats sont consultées directement via getStats()
  }

  /**
   * Récupère les stats actuelles du joueur (modifiées par upgrades)
   */
  public getStats(): PlayerUpgradeStats {
    return { ...this.playerStats };
  }

  /**
   * Récupère un modificateur de stat spécifique
   */
  public getStat<K extends keyof PlayerUpgradeStats>(stat: K): PlayerUpgradeStats[K] {
    return this.playerStats[stat];
  }

  /**
   * Récupère tous les upgrades appliqués
   */
  public getAppliedUpgrades(): AppliedUpgrade[] {
    const result: AppliedUpgrade[] = [];

    for (const [id, stacks] of this.appliedUpgrades) {
      const upgrade = getUpgradeById(id);
      if (upgrade) {
        result.push({ upgrade, stacks });
      }
    }

    return result;
  }

  /**
   * Récupère le nombre de stacks d'un upgrade spécifique
   */
  public getUpgradeStacks(upgradeId: string): number {
    return this.appliedUpgrades.get(upgradeId) || 0;
  }

  /**
   * Vérifie si un upgrade est actif (au moins 1 stack)
   */
  public hasUpgrade(upgradeId: string): boolean {
    return this.appliedUpgrades.has(upgradeId);
  }

  /**
   * Récupère le nombre total d'upgrades appliqués
   */
  public getTotalUpgradeCount(): number {
    let total = 0;
    for (const stacks of this.appliedUpgrades.values()) {
      total += stacks;
    }
    return total;
  }

  /**
   * Récupère les upgrades par rareté
   */
  public getUpgradeCountByRarity(): Record<UpgradeRarity, number> {
    const counts: Record<UpgradeRarity, number> = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };

    for (const [id, stacks] of this.appliedUpgrades) {
      const upgrade = getUpgradeById(id);
      if (upgrade) {
        counts[upgrade.rarity] += stacks;
      }
    }

    return counts;
  }

  /**
   * Réinitialise le second wind (à chaque nouvelle vague)
   */
  public resetSecondWind(): void {
    if (this.playerStats.secondWind) {
      this.playerStats.secondWindUsed = false;
    }
  }

  /**
   * Utilise le second wind si disponible
   * @returns true si le second wind a été utilisé
   */
  public useSecondWind(): boolean {
    if (this.playerStats.secondWind && !this.playerStats.secondWindUsed) {
      this.playerStats.secondWindUsed = true;
      return true;
    }
    return false;
  }

  /**
   * Récupère l'historique des sélections
   */
  public getSelectionHistory(): UpgradeDefinition[][] {
    return [...this.selectionHistory];
  }

  /**
   * Réinitialise le système (nouvelle partie)
   */
  public reset(): void {
    this.availablePool = [...UPGRADES];
    this.appliedUpgrades.clear();
    this.playerStats = { ...DEFAULT_PLAYER_STATS };
    this.selectionHistory = [];
    this.applyStatsToPlayer();
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.reset();
  }
}
