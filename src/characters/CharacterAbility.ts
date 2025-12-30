/**
 * Character Ability System - Phase 7.1
 *
 * Système de compétences actives pour les personnages.
 * Chaque personnage a une compétence unique avec cooldown.
 */

import type { Player } from '@entities/Player';

/**
 * Interface pour une compétence de personnage
 */
export interface CharacterAbility {
  /** Nom de la compétence */
  name: string;
  /** Description de l'effet */
  description: string;
  /** Icône de la compétence (clé d'asset) */
  icon?: string;
  /** Temps de recharge en ms */
  cooldown: number;
  /** Durée de l'effet en ms (optionnel pour les effets instantanés) */
  duration?: number;

  /**
   * Active la compétence
   * @param player Référence au joueur
   */
  activate(player: Player): void;

  /**
   * Désactive la compétence (appelé à la fin de la durée)
   * @param player Référence au joueur
   */
  deactivate?(player: Player): void;
}

/**
 * Gestionnaire de compétence pour un joueur
 * Gère le cooldown et l'état actif de la compétence
 */
export class AbilityManager {
  private player: Player;
  private ability: CharacterAbility | null = null;

  /** Temps restant avant prochaine utilisation (ms) */
  private cooldownRemaining: number = 0;
  /** Temps restant de l'effet actif (ms) */
  private activeRemaining: number = 0;
  /** La compétence est-elle actuellement active */
  private isActive: boolean = false;

  constructor(player: Player) {
    this.player = player;
  }

  /**
   * Définit la compétence à gérer
   */
  setAbility(ability: CharacterAbility | null): void {
    // Désactiver la compétence précédente si active
    if (this.isActive && this.ability?.deactivate) {
      this.ability.deactivate(this.player);
    }

    this.ability = ability;
    this.cooldownRemaining = 0;
    this.activeRemaining = 0;
    this.isActive = false;
  }

  /**
   * Récupère la compétence actuelle
   */
  getAbility(): CharacterAbility | null {
    return this.ability;
  }

  /**
   * Tente d'utiliser la compétence
   * @returns true si la compétence a été activée
   */
  useAbility(): boolean {
    if (!this.ability || !this.canUseAbility()) {
      return false;
    }

    // Activer la compétence
    this.ability.activate(this.player);
    this.isActive = true;

    // Gérer la durée si définie
    if (this.ability.duration && this.ability.duration > 0) {
      this.activeRemaining = this.ability.duration;
    } else {
      // Compétence instantanée
      this.isActive = false;
    }

    // Démarrer le cooldown
    this.cooldownRemaining = this.ability.cooldown;

    return true;
  }

  /**
   * Vérifie si la compétence peut être utilisée
   */
  canUseAbility(): boolean {
    return this.ability !== null && this.cooldownRemaining <= 0 && !this.isActive;
  }

  /**
   * Met à jour le gestionnaire (appelé chaque frame)
   * @param delta Temps écoulé en ms
   */
  update(delta: number): void {
    // Réduire le cooldown
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining = Math.max(0, this.cooldownRemaining - delta);
    }

    // Gérer la fin de la durée active
    if (this.isActive && this.activeRemaining > 0) {
      this.activeRemaining -= delta;

      if (this.activeRemaining <= 0) {
        this.activeRemaining = 0;
        this.isActive = false;

        // Appeler deactivate si défini
        if (this.ability?.deactivate) {
          this.ability.deactivate(this.player);
        }
      }
    }
  }

  /**
   * Récupère le temps de cooldown restant
   */
  getCooldownRemaining(): number {
    return this.cooldownRemaining;
  }

  /**
   * Récupère le temps de cooldown total
   */
  getCooldownTotal(): number {
    return this.ability?.cooldown ?? 0;
  }

  /**
   * Récupère le ratio de cooldown (0-1, où 0 = prêt)
   */
  getCooldownRatio(): number {
    if (!this.ability || this.ability.cooldown === 0) {
      return 0;
    }
    return this.cooldownRemaining / this.ability.cooldown;
  }

  /**
   * Récupère le temps actif restant
   */
  getActiveRemaining(): number {
    return this.activeRemaining;
  }

  /**
   * Vérifie si la compétence est active
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Force le reset du cooldown (debug)
   */
  resetCooldown(): void {
    this.cooldownRemaining = 0;
  }

  /**
   * Force la fin de l'effet actif (debug)
   */
  forceDeactivate(): void {
    if (this.isActive && this.ability?.deactivate) {
      this.ability.deactivate(this.player);
    }
    this.isActive = false;
    this.activeRemaining = 0;
  }
}
