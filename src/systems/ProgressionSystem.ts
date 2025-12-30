/**
 * Système de progression permanente (Phase 6.7)
 *
 * Gère la progression long terme entre les parties:
 * - XP gagnée à la fin de chaque partie
 * - Upgrades permanents (arbre de compétences)
 * - Déblocages (personnages, armes, succès)
 * - Bonus permanents appliqués au joueur
 */

import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import {
  PROGRESSION,
  PERMANENT_UPGRADES,
  UNLOCKS,
  getPermanentUpgradeById,
  getUpgradeCost,
  type PermanentUpgradeDefinition,
  type PermanentUpgradeCategory,
  type UnlockDefinition,
} from '@config/progression';
import { SaveManager } from '@managers/SaveManager';

/**
 * Modificateurs permanents appliqués au joueur
 */
export interface PermanentModifiers {
  damageMultiplier: number;
  fireRateMultiplier: number;
  critChance: number;
  maxHealthBonus: number;
  healthRegen: number;
  armorMultiplier: number;
  pickupRangeMultiplier: number;
  powerUpDurationMultiplier: number;
  pointsMultiplier: number;
}

/**
 * Résumé de fin de partie pour calcul d'XP
 */
export interface GameEndSummary {
  waveReached: number;
  killCount: number;
  score: number;
  survivalTime: number; // en secondes
  weaponUsed?: string;
}

/**
 * Résultat du calcul d'XP
 */
export interface XPCalculationResult {
  total: number;
  breakdown: {
    waves: number;
    kills: number;
    score: number;
    bonus: number;
  };
}

/**
 * Nouveau déblocage obtenu
 */
export interface NewUnlock {
  unlock: UnlockDefinition;
  isNew: boolean;
}

/**
 * Statistiques de progression pour l'affichage
 */
export interface ProgressionStats {
  totalXP: number;
  availableXP: number;
  spentXP: number;
  upgradesUnlocked: number;
  totalUpgrades: number;
  unlocksObtained: number;
  totalUnlocks: number;
  highestWave: number;
  gamesPlayed: number;
}

/**
 * Système de progression permanente
 */
export class ProgressionSystem {
  private scene: GameScene;
  private saveManager: SaveManager;

  /** Modificateurs permanents calculés */
  private modifiers: PermanentModifiers;

  /** Partie en cours - statistiques temporaires */
  private currentGameKills: number = 0;
  private currentGameStartTime: number = 0;

  constructor(scene: GameScene, _player: Player) {
    this.scene = scene;
    this.saveManager = SaveManager.getInstance();

    // Calculer et appliquer les modificateurs permanents
    this.modifiers = this.calculateModifiers();
    this.applyModifiersToPlayer();

    // Démarrer le suivi de la partie
    this.startGame();

    // Écouter les événements
    this.scene.events.on('zombieDeath', this.onZombieDeath, this);
    this.scene.events.on('game:over', this.onGameOver, this);

    // Démarrer l'auto-sauvegarde
    this.saveManager.startAutoSave(60000); // Toutes les 60 secondes

    console.log('[ProgressionSystem] Initialized', {
      availableXP: this.saveManager.getAvailableXP(),
      modifiers: this.modifiers,
    });
  }

  /**
   * Démarre le suivi d'une nouvelle partie
   */
  private startGame(): void {
    this.currentGameKills = 0;
    this.currentGameStartTime = Date.now();
  }

  /**
   * Comptabilise un kill pendant la partie
   */
  private onZombieDeath(zombie: { zombieType?: string }): void {
    this.currentGameKills++;

    // Tracker pour les stats
    if (zombie.zombieType) {
      // Note: Les stats seront sauvegardées à la fin de la partie
    }
  }

  /**
   * Gère la fin de partie
   */
  private onGameOver(data: { score: number; wave: number; kills: number }): void {
    const survivalTime = (Date.now() - this.currentGameStartTime) / 1000;

    const summary: GameEndSummary = {
      waveReached: data.wave,
      killCount: data.kills || this.currentGameKills,
      score: data.score,
      survivalTime,
    };

    // Calculer et ajouter l'XP
    const xpResult = this.processGameEnd(summary);

    // Émettre un événement pour afficher les résultats
    this.scene.events.emit('progression:game_end', {
      summary,
      xpResult,
      newUnlocks: this.checkNewUnlocks(summary),
    });
  }

  /**
   * Traite la fin de partie: XP, stats, déblocages
   */
  public processGameEnd(summary: GameEndSummary): XPCalculationResult {
    const xpResult = this.calculateXP(summary);

    // Ajouter l'XP
    this.saveManager.addXP(xpResult.total);

    // Mettre à jour les stats
    this.saveManager.addKills(summary.killCount, undefined, summary.weaponUsed);
    this.saveManager.addDeath();
    this.saveManager.updateHighestWave(summary.waveReached);
    this.saveManager.addPlayTime(summary.survivalTime);
    this.saveManager.incrementGamesPlayed();

    // Sauvegarder
    this.saveManager.save();

    console.log('[ProgressionSystem] Game ended', {
      xpEarned: xpResult.total,
      totalXP: this.saveManager.getProgression().totalXP,
    });

    return xpResult;
  }

  /**
   * Calcule l'XP gagnée pour une partie
   */
  public calculateXP(summary: GameEndSummary): XPCalculationResult {
    const config = PROGRESSION.xp;

    // XP des vagues
    const waveXP = Math.floor(config.basePerWave * summary.waveReached * config.waveMultiplier);

    // XP des kills
    const killsXP = summary.killCount * config.perKill;

    // XP du score
    const scoreThresholds = Math.floor(summary.score / config.scoreThreshold);
    const scoreXP = scoreThresholds * config.perScoreThreshold;

    // Bonus (multiplicateur basé sur la performance)
    let bonusMultiplier = 1.0;
    if (summary.waveReached >= 20) bonusMultiplier += 0.5;
    else if (summary.waveReached >= 10) bonusMultiplier += 0.25;

    if (summary.killCount >= 200) bonusMultiplier += 0.5;
    else if (summary.killCount >= 100) bonusMultiplier += 0.25;

    const baseXP = waveXP + killsXP + scoreXP;
    const bonusXP = Math.floor(baseXP * (bonusMultiplier - 1));

    const total = Math.max(config.minPerGame, baseXP + bonusXP);

    return {
      total,
      breakdown: {
        waves: waveXP,
        kills: killsXP,
        score: scoreXP,
        bonus: bonusXP,
      },
    };
  }

  /**
   * Vérifie les nouveaux déblocages
   */
  public checkNewUnlocks(summary?: GameEndSummary): NewUnlock[] {
    const newUnlocks: NewUnlock[] = [];
    const stats = this.saveManager.getStats();

    for (const unlock of UNLOCKS) {
      if (this.saveManager.isUnlocked(unlock.id)) continue;

      let condition = false;
      const cond = unlock.condition;

      switch (cond.type) {
        case 'wave':
          condition = (summary?.waveReached || stats.highestWave) >= cond.value;
          break;
        case 'kills':
          condition = (summary?.killCount || 0) >= cond.value;
          break;
        case 'totalKills':
          condition = stats.totalKills >= cond.value;
          break;
        case 'gamesPlayed':
          condition = stats.gamesPlayed >= cond.value;
          break;
        case 'killsWithWeapon':
          if (cond.weaponType) {
            condition = (stats.killsByWeaponType[cond.weaponType] || 0) >= cond.value;
          }
          break;
        case 'surviveTime':
          condition = stats.totalPlayTime >= cond.value;
          break;
      }

      if (condition) {
        // Débloquer selon le type
        let unlocked = false;
        switch (unlock.type) {
          case 'character':
            unlocked = this.saveManager.unlockCharacter(unlock.id);
            break;
          case 'weapon':
            unlocked = this.saveManager.unlockWeapon(unlock.id);
            break;
          case 'activeItem':
            unlocked = this.saveManager.unlockActiveItem(unlock.id);
            break;
          case 'achievement':
            unlocked = this.saveManager.unlockAchievement(unlock.id);
            break;
        }

        if (unlocked) {
          newUnlocks.push({ unlock, isNew: true });
          console.log('[ProgressionSystem] New unlock:', unlock.name);

          this.scene.events.emit('progression:unlock', {
            unlock,
          });
        }
      }
    }

    return newUnlocks;
  }

  /**
   * Calcule les modificateurs permanents basés sur les upgrades achetés
   */
  private calculateModifiers(): PermanentModifiers {
    const mods: PermanentModifiers = {
      damageMultiplier: 1.0,
      fireRateMultiplier: 1.0,
      critChance: 0,
      maxHealthBonus: 0,
      healthRegen: 0,
      armorMultiplier: 1.0,
      pickupRangeMultiplier: 1.0,
      powerUpDurationMultiplier: 1.0,
      pointsMultiplier: 1.0,
    };

    for (const upgrade of PERMANENT_UPGRADES) {
      const level = this.saveManager.getUpgradeLevel(upgrade.id);
      if (level === 0) continue;

      const totalEffect = upgrade.effectPerLevel * level;

      switch (upgrade.id) {
        case 'perm_damage':
          mods.damageMultiplier += totalEffect;
          break;
        case 'perm_fire_rate':
          mods.fireRateMultiplier += totalEffect;
          break;
        case 'perm_crit':
          mods.critChance += totalEffect;
          break;
        case 'perm_health':
          mods.maxHealthBonus += totalEffect;
          break;
        case 'perm_regen':
          mods.healthRegen += totalEffect;
          break;
        case 'perm_armor':
          mods.armorMultiplier += totalEffect;
          break;
        case 'perm_pickup':
          mods.pickupRangeMultiplier += totalEffect;
          break;
        case 'perm_powerup_duration':
          mods.powerUpDurationMultiplier += totalEffect;
          break;
        case 'perm_points':
          mods.pointsMultiplier += totalEffect;
          break;
      }
    }

    return mods;
  }

  /**
   * Applique les modificateurs permanents au joueur
   */
  private applyModifiersToPlayer(): void {
    // Note: L'intégration avec le Player sera faite via des getters
    // Le joueur appellera getModifiers() pour obtenir les bonus
    // Exemple: player.getMaxHealth() + progressionSystem.getModifiers().maxHealthBonus

    this.scene.events.emit('progression:modifiers_applied', {
      modifiers: this.modifiers,
    });
  }

  /**
   * Achète un upgrade permanent
   */
  public purchaseUpgrade(upgradeId: string): boolean {
    const upgrade = getPermanentUpgradeById(upgradeId);
    if (!upgrade) {
      console.warn(`[ProgressionSystem] Unknown upgrade: ${upgradeId}`);
      return false;
    }

    const currentLevel = this.saveManager.getUpgradeLevel(upgradeId);

    // Vérifier le niveau max
    if (currentLevel >= upgrade.maxLevel) {
      console.log(`[ProgressionSystem] Upgrade ${upgradeId} is already maxed`);
      return false;
    }

    // Vérifier les prérequis
    if (upgrade.prerequisite) {
      const prereqUpgrade = getPermanentUpgradeById(upgrade.prerequisite);
      if (prereqUpgrade) {
        const prereqLevel = this.saveManager.getUpgradeLevel(upgrade.prerequisite);
        if (prereqLevel < prereqUpgrade.maxLevel) {
          console.log(
            `[ProgressionSystem] Prerequisite ${upgrade.prerequisite} not met for ${upgradeId}`
          );
          return false;
        }
      }
    }

    // Vérifier le coût
    const cost = getUpgradeCost(upgrade, currentLevel);
    if (!this.saveManager.spendXP(cost)) {
      console.log(`[ProgressionSystem] Not enough XP for ${upgradeId}`);
      return false;
    }

    // Appliquer l'upgrade
    this.saveManager.setUpgradeLevel(upgradeId, currentLevel + 1);

    // Recalculer les modificateurs
    this.modifiers = this.calculateModifiers();

    // Sauvegarder
    this.saveManager.save();

    this.scene.events.emit('progression:upgrade_purchased', {
      upgradeId,
      newLevel: currentLevel + 1,
      cost,
    });

    console.log(`[ProgressionSystem] Purchased upgrade: ${upgrade.name} (level ${currentLevel + 1})`);
    return true;
  }

  /**
   * Vérifie si un upgrade peut être acheté
   */
  public canPurchaseUpgrade(upgradeId: string): boolean {
    const upgrade = getPermanentUpgradeById(upgradeId);
    if (!upgrade) return false;

    const currentLevel = this.saveManager.getUpgradeLevel(upgradeId);

    // Niveau max atteint
    if (currentLevel >= upgrade.maxLevel) return false;

    // Prérequis non rempli
    if (upgrade.prerequisite) {
      const prereqUpgrade = getPermanentUpgradeById(upgrade.prerequisite);
      if (prereqUpgrade) {
        const prereqLevel = this.saveManager.getUpgradeLevel(upgrade.prerequisite);
        if (prereqLevel < prereqUpgrade.maxLevel) return false;
      }
    }

    // XP insuffisante
    const cost = getUpgradeCost(upgrade, currentLevel);
    if (this.saveManager.getAvailableXP() < cost) return false;

    return true;
  }

  /**
   * Vérifie si un prérequis d'upgrade est rempli
   */
  public isPrerequisiteMet(upgradeId: string): boolean {
    const upgrade = getPermanentUpgradeById(upgradeId);
    if (!upgrade || !upgrade.prerequisite) return true;

    const prereqUpgrade = getPermanentUpgradeById(upgrade.prerequisite);
    if (!prereqUpgrade) return true;

    const prereqLevel = this.saveManager.getUpgradeLevel(upgrade.prerequisite);
    return prereqLevel >= prereqUpgrade.maxLevel;
  }

  // ==================== GETTERS ====================

  /**
   * Obtient les modificateurs permanents
   */
  public getModifiers(): PermanentModifiers {
    return { ...this.modifiers };
  }

  /**
   * Obtient l'XP disponible
   */
  public getAvailableXP(): number {
    return this.saveManager.getAvailableXP();
  }

  /**
   * Obtient le niveau d'un upgrade
   */
  public getUpgradeLevel(upgradeId: string): number {
    return this.saveManager.getUpgradeLevel(upgradeId);
  }

  /**
   * Obtient tous les upgrades avec leur état actuel
   */
  public getAllUpgrades(): Array<PermanentUpgradeDefinition & { currentLevel: number; cost: number; canPurchase: boolean }> {
    return PERMANENT_UPGRADES.map((upgrade) => {
      const currentLevel = this.saveManager.getUpgradeLevel(upgrade.id);
      return {
        ...upgrade,
        currentLevel,
        cost: getUpgradeCost(upgrade, currentLevel),
        canPurchase: this.canPurchaseUpgrade(upgrade.id),
      };
    });
  }

  /**
   * Obtient les upgrades par catégorie
   */
  public getUpgradesByCategory(category: PermanentUpgradeCategory): Array<PermanentUpgradeDefinition & { currentLevel: number; cost: number; canPurchase: boolean }> {
    return this.getAllUpgrades().filter((u) => u.category === category);
  }

  /**
   * Obtient tous les déblocages avec leur état
   */
  public getAllUnlocks(): Array<UnlockDefinition & { isUnlocked: boolean }> {
    return UNLOCKS.map((unlock) => ({
      ...unlock,
      isUnlocked: this.saveManager.isUnlocked(unlock.id),
    }));
  }

  /**
   * Vérifie si un élément est débloqué
   */
  public isUnlocked(id: string): boolean {
    return this.saveManager.isUnlocked(id);
  }

  /**
   * Obtient les statistiques de progression
   */
  public getStats(): ProgressionStats {
    const progression = this.saveManager.getProgression();
    const stats = this.saveManager.getStats();

    let upgradesUnlocked = 0;
    let totalUpgradeLevels = 0;
    for (const upgrade of PERMANENT_UPGRADES) {
      const level = this.saveManager.getUpgradeLevel(upgrade.id);
      if (level > 0) upgradesUnlocked++;
      totalUpgradeLevels += upgrade.maxLevel;
    }

    const unlocksObtained = UNLOCKS.filter((u) => this.saveManager.isUnlocked(u.id)).length;

    return {
      totalXP: progression.totalXP,
      availableXP: this.saveManager.getAvailableXP(),
      spentXP: progression.spentXP,
      upgradesUnlocked,
      totalUpgrades: PERMANENT_UPGRADES.length,
      unlocksObtained,
      totalUnlocks: UNLOCKS.length,
      highestWave: stats.highestWave,
      gamesPlayed: stats.gamesPlayed,
    };
  }

  // ==================== DEBUG ====================

  /**
   * Ajoute de l'XP (debug)
   */
  public debugAddXP(amount: number): number {
    this.saveManager.addXP(amount);
    this.saveManager.save();
    return this.saveManager.getProgression().totalXP;
  }

  /**
   * Réinitialise la progression (debug)
   */
  public debugResetProgression(): void {
    this.saveManager.reset();
    this.modifiers = this.calculateModifiers();
    console.log('[ProgressionSystem] Progression reset');
  }

  /**
   * Débloque tout (debug)
   */
  public debugUnlockAll(): void {
    for (const unlock of UNLOCKS) {
      switch (unlock.type) {
        case 'character':
          this.saveManager.unlockCharacter(unlock.id);
          break;
        case 'weapon':
          this.saveManager.unlockWeapon(unlock.id);
          break;
        case 'activeItem':
          this.saveManager.unlockActiveItem(unlock.id);
          break;
        case 'achievement':
          this.saveManager.unlockAchievement(unlock.id);
          break;
      }
    }
    this.saveManager.save();
    console.log('[ProgressionSystem] All unlocks granted');
  }

  /**
   * Max tous les upgrades (debug)
   */
  public debugMaxAllUpgrades(): void {
    for (const upgrade of PERMANENT_UPGRADES) {
      this.saveManager.setUpgradeLevel(upgrade.id, upgrade.maxLevel);
    }
    this.modifiers = this.calculateModifiers();
    this.saveManager.save();
    console.log('[ProgressionSystem] All upgrades maxed');
  }

  // ==================== LIFECYCLE ====================

  /**
   * Réinitialise pour une nouvelle partie
   */
  public reset(): void {
    // Recalculer les modificateurs (ils persistent)
    this.modifiers = this.calculateModifiers();
    this.startGame();
    this.applyModifiersToPlayer();
  }

  /**
   * Nettoie le système
   */
  public destroy(): void {
    this.scene.events.off('zombieDeath', this.onZombieDeath, this);
    this.scene.events.off('game:over', this.onGameOver, this);

    // Sauvegarder avant de quitter
    this.saveManager.saveIfDirty();
    this.saveManager.stopAutoSave();
  }
}
