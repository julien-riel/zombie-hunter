import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Types de power-ups disponibles
 */
export type PowerUpType = 'rage' | 'freeze' | 'ghost' | 'magnet' | 'nuke';

/**
 * Raretés des power-ups
 */
export type PowerUpRarity = 'common' | 'rare' | 'legendary';

/**
 * Configuration de base d'un power-up
 */
export interface PowerUpConfig {
  type: PowerUpType;
  duration: number;
  rarity: PowerUpRarity;
  color: number;
  name: string;
  description: string;
}

/**
 * Classe abstraite de base pour tous les power-ups
 *
 * Les power-ups sont des effets temporaires qui modifient
 * le gameplay pendant une durée limitée.
 *
 * Chaque power-up doit implémenter:
 * - activate(): Applique l'effet au joueur/jeu
 * - deactivate(): Retire l'effet
 * - update() (optionnel): Met à jour l'effet chaque frame
 */
export abstract class PowerUp {
  /** Type du power-up */
  public abstract readonly type: PowerUpType;

  /** Durée du power-up en ms (0 = instantané) */
  public abstract readonly duration: number;

  /** Rareté du power-up */
  public abstract readonly rarity: PowerUpRarity;

  /** Couleur associée au power-up */
  public abstract readonly color: number;

  /** Nom affiché */
  public abstract readonly name: string;

  /** Description de l'effet */
  public abstract readonly description: string;

  /** Temps restant avant expiration (ms) */
  protected timeRemaining: number = 0;

  /** Indique si le power-up est actif */
  protected isActive: boolean = false;

  /** Référence à la scène de jeu */
  protected scene: GameScene | null = null;

  /** Référence au joueur */
  protected player: Player | null = null;

  /**
   * Active le power-up
   * @param player Le joueur affecté
   * @param scene La scène de jeu
   */
  public activate(player: Player, scene: GameScene): void {
    if (this.isActive) return;

    this.player = player;
    this.scene = scene;
    this.isActive = true;
    this.timeRemaining = this.duration;

    // Appliquer l'effet spécifique
    this.onActivate(player, scene);

    // Émettre l'événement d'activation
    scene.events.emit('powerup:activate', {
      powerupType: this.type,
      duration: this.duration,
    });
  }

  /**
   * Désactive le power-up
   */
  public deactivate(): void {
    if (!this.isActive) return;

    // Retirer l'effet spécifique
    if (this.player && this.scene) {
      this.onDeactivate(this.player, this.scene);

      // Émettre l'événement d'expiration
      this.scene.events.emit('powerup:expire', {
        powerupType: this.type,
      });
    }

    this.isActive = false;
    this.timeRemaining = 0;
    this.player = null;
    this.scene = null;
  }

  /**
   * Met à jour le power-up
   * @param delta Temps écoulé depuis la dernière frame (ms)
   * @returns true si le power-up est encore actif, false s'il a expiré
   */
  public update(delta: number): boolean {
    if (!this.isActive) return false;

    // Les power-ups instantanés (duration = 0) expirent immédiatement après activation
    if (this.duration === 0) {
      this.deactivate();
      return false;
    }

    this.timeRemaining -= delta;

    // Mise à jour spécifique au power-up
    if (this.player && this.scene) {
      this.onUpdate(delta, this.player, this.scene);
    }

    // Vérifier si expiré
    if (this.timeRemaining <= 0) {
      this.deactivate();
      return false;
    }

    return true;
  }

  /**
   * Vérifie si le power-up est actif
   */
  public getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Récupère le temps restant en ms
   */
  public getTimeRemaining(): number {
    return this.timeRemaining;
  }

  /**
   * Récupère le pourcentage de temps restant (0-1)
   */
  public getTimeRemainingPercent(): number {
    if (this.duration === 0) return 0;
    return Math.max(0, this.timeRemaining / this.duration);
  }

  /**
   * Méthode appelée lors de l'activation du power-up
   * À implémenter dans les classes dérivées
   */
  protected abstract onActivate(player: Player, scene: GameScene): void;

  /**
   * Méthode appelée lors de la désactivation du power-up
   * À implémenter dans les classes dérivées
   */
  protected abstract onDeactivate(player: Player, scene: GameScene): void;

  /**
   * Méthode appelée à chaque frame pendant que le power-up est actif
   * Optionnel - implémentation par défaut vide
   */
  protected onUpdate(_delta: number, _player: Player, _scene: GameScene): void {
    // Par défaut, rien à faire
  }
}
