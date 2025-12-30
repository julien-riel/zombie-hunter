import Phaser from 'phaser';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { GameEventPayloads } from '@/types/events';

/**
 * Configuration du système de combo
 */
interface ComboConfig {
  timeoutMs: number;
  incrementPerKill: number;
  maxMultiplier: number;
  dropQualityBonusPerLevel: number;
  milestones: readonly number[];
}

/**
 * Système de combo
 *
 * Gère le multiplicateur de combo qui récompense les kills enchaînés.
 * - Le combo augmente de 0.1 par kill
 * - Le combo se reset après 3 secondes sans kill
 * - Le multiplicateur max est x10
 * - Bonus de qualité de drop : +5% par niveau de combo
 */
export class ComboSystem {
  private scene: GameScene;
  private config: ComboConfig;

  private multiplier: number = 1;
  private killStreak: number = 0;
  private totalPointsFromCombo: number = 0;
  private lastMilestoneReached: number = 0;

  private timeoutTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: GameScene) {
    this.scene = scene;
    this.config = BALANCE.combo;

    // Écouter les événements de mort de zombie
    this.scene.events.on('zombieDeath', this.onZombieKilled, this);
  }

  /**
   * Appelé quand un zombie est tué
   */
  public onZombieKilled(): void {
    this.killStreak++;

    // Calculer le nouveau multiplicateur
    const previousMultiplier = this.multiplier;
    this.multiplier = Math.min(
      1 + (this.killStreak - 1) * this.config.incrementPerKill,
      this.config.maxMultiplier
    );

    // Réinitialiser le timer de timeout
    this.resetTimeoutTimer();

    // Émettre l'événement d'augmentation de combo
    const payload: GameEventPayloads['combo:increase'] = {
      multiplier: this.multiplier,
      killStreak: this.killStreak,
    };
    this.scene.events.emit('combo:increase', payload);

    // Vérifier si on a atteint un nouveau milestone
    this.checkMilestone(previousMultiplier);
  }

  /**
   * Vérifie si un nouveau milestone a été atteint
   */
  private checkMilestone(previousMultiplier: number): void {
    const currentLevel = Math.floor(this.multiplier);
    const previousLevel = Math.floor(previousMultiplier);

    // Si on a atteint un nouveau niveau entier
    if (
      currentLevel > previousLevel &&
      currentLevel > this.lastMilestoneReached &&
      this.config.milestones.includes(currentLevel)
    ) {
      this.lastMilestoneReached = currentLevel;

      const payload: GameEventPayloads['combo:milestone'] = {
        level: currentLevel,
        multiplier: this.multiplier,
      };
      this.scene.events.emit('combo:milestone', payload);
    }
  }

  /**
   * Réinitialise le timer de timeout du combo
   */
  private resetTimeoutTimer(): void {
    if (this.timeoutTimer) {
      this.timeoutTimer.remove();
      this.timeoutTimer = null;
    }

    this.timeoutTimer = this.scene.time.addEvent({
      delay: this.config.timeoutMs,
      callback: this.onComboTimeout,
      callbackScope: this,
    });
  }

  /**
   * Appelé quand le combo timeout (pas de kill pendant trop longtemps)
   */
  private onComboTimeout(): void {
    if (this.multiplier > 1 || this.killStreak > 0) {
      const payload: GameEventPayloads['combo:break'] = {
        previousMultiplier: this.multiplier,
        totalPoints: this.totalPointsFromCombo,
      };
      this.scene.events.emit('combo:break', payload);
    }

    this.reset();
  }

  /**
   * Met à jour le système de combo
   */
  public update(): void {
    // Le timeout est géré par le timer Phaser
    // Cette méthode peut être utilisée pour des mises à jour visuelles
  }

  /**
   * Retourne le multiplicateur actuel
   */
  public getMultiplier(): number {
    return this.multiplier;
  }

  /**
   * Retourne le nombre de kills dans la série actuelle
   */
  public getKillStreak(): number {
    return this.killStreak;
  }

  /**
   * Retourne le bonus de qualité de drop basé sur le combo
   */
  public getDropQualityBonus(): number {
    const comboLevel = Math.floor(this.multiplier) - 1;
    return Math.max(0, comboLevel * this.config.dropQualityBonusPerLevel);
  }

  /**
   * Retourne le temps restant avant timeout du combo (0-1)
   */
  public getTimeoutProgress(): number {
    if (!this.timeoutTimer || this.killStreak === 0) {
      return 0;
    }

    const elapsed = this.timeoutTimer.getElapsed();
    const progress = 1 - elapsed / this.config.timeoutMs;
    return Math.max(0, Math.min(1, progress));
  }

  /**
   * Retourne le temps restant avant timeout en millisecondes
   */
  public getTimeRemaining(): number {
    if (!this.timeoutTimer || this.killStreak === 0) {
      return 0;
    }

    return Math.max(0, this.config.timeoutMs - this.timeoutTimer.getElapsed());
  }

  /**
   * Ajoute des points au total accumulé par le combo
   */
  public addPoints(points: number): void {
    this.totalPointsFromCombo += points * (this.multiplier - 1);
  }

  /**
   * Réinitialise le combo
   */
  public reset(): void {
    this.multiplier = 1;
    this.killStreak = 0;
    this.totalPointsFromCombo = 0;
    this.lastMilestoneReached = 0;

    if (this.timeoutTimer) {
      this.timeoutTimer.remove();
      this.timeoutTimer = null;
    }
  }

  /**
   * Nettoie les ressources du système
   */
  public destroy(): void {
    this.scene.events.off('zombieDeath', this.onZombieKilled, this);

    if (this.timeoutTimer) {
      this.timeoutTimer.remove();
      this.timeoutTimer = null;
    }
  }
}
