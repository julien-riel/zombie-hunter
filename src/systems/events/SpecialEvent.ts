/**
 * Phase 7.4 - Événements Spéciaux
 * Interface et types de base pour le système d'événements
 */

import type { GameScene } from '@scenes/GameScene';
import type { WaveConfig } from '../WaveSystem';

/**
 * Types d'événements spéciaux disponibles
 */
export enum SpecialEventType {
  BLACKOUT = 'blackout',
  HORDE = 'horde',
  OVERHEATED_DOOR = 'overheated_door',
  BOSS_RUSH = 'boss_rush',
}

/**
 * Durée d'un événement
 */
export type EventDuration = 'wave' | 'timed' | 'instant' | 'condition';

/**
 * État d'un événement
 */
export enum EventState {
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ACTIVE = 'active',
  ENDING = 'ending',
}

/**
 * Configuration de base pour les événements
 */
export interface SpecialEventConfig {
  /** Type de l'événement */
  type: SpecialEventType;
  /** Vague minimum pour déclencher l'événement */
  minWave: number;
  /** Probabilité de déclenchement (0-1) */
  probability: number;
  /** Cooldown entre deux occurrences de cet événement (en vagues) */
  cooldownWaves: number;
  /** Priorité (les événements de haute priorité peuvent bloquer les autres) */
  priority: number;
  /** Peut se combiner avec d'autres événements */
  canStack: boolean;
}

/**
 * Interface de base pour tous les événements spéciaux
 */
export interface SpecialEvent {
  /** Nom affiché de l'événement */
  readonly name: string;
  /** Description courte */
  readonly description: string;
  /** Type de l'événement */
  readonly type: SpecialEventType;
  /** Type de durée de l'événement */
  readonly duration: EventDuration;
  /** Configuration de l'événement */
  readonly config: SpecialEventConfig;

  /** État actuel de l'événement */
  state: EventState;

  /**
   * Vérifie si l'événement peut être déclenché
   * @param scene La scène de jeu
   * @param waveNumber Le numéro de vague actuel
   * @returns true si l'événement peut se déclencher
   */
  canActivate(scene: GameScene, waveNumber: number): boolean;

  /**
   * Active l'événement
   * @param scene La scène de jeu
   */
  activate(scene: GameScene): void;

  /**
   * Désactive l'événement
   * @param scene La scène de jeu
   */
  deactivate(scene: GameScene): void;

  /**
   * Mise à jour de l'événement (appelé chaque frame si actif)
   * @param scene La scène de jeu
   * @param delta Le temps écoulé depuis la dernière frame
   */
  update?(scene: GameScene, delta: number): void;

  /**
   * Modifie la configuration de la vague (pour les événements qui changent les spawns)
   * @param config La configuration de vague à modifier
   * @returns La configuration modifiée
   */
  modifyWaveConfig?(config: WaveConfig): WaveConfig;

  /**
   * Callback quand un zombie meurt pendant l'événement
   * @param scene La scène de jeu
   */
  onZombieDeath?(scene: GameScene): void;

  /**
   * Callback quand la vague est terminée
   * @param scene La scène de jeu
   */
  onWaveComplete?(scene: GameScene): void;

  /**
   * Réinitialise l'événement à son état initial
   */
  reset(): void;
}

/**
 * Classe de base abstraite pour les événements spéciaux
 * Fournit une implémentation par défaut des méthodes communes
 */
export abstract class BaseSpecialEvent implements SpecialEvent {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly type: SpecialEventType;
  abstract readonly duration: EventDuration;
  abstract readonly config: SpecialEventConfig;

  public state: EventState = EventState.INACTIVE;

  /** Dernière vague où l'événement a été activé */
  protected lastActivationWave: number = -999;

  /**
   * Vérifie si l'événement peut être déclenché
   */
  public canActivate(_scene: GameScene, waveNumber: number): boolean {
    // Vérifier l'état
    if (this.state !== EventState.INACTIVE) return false;

    // Vérifier la vague minimum
    if (waveNumber < this.config.minWave) return false;

    // Vérifier le cooldown
    const wavesSinceLastActivation = waveNumber - this.lastActivationWave;
    if (wavesSinceLastActivation < this.config.cooldownWaves) return false;

    return true;
  }

  /**
   * Active l'événement
   */
  public activate(scene: GameScene): void {
    this.state = EventState.ACTIVE;
    this.lastActivationWave = scene.getWaveSystem().getCurrentWave();

    // Émettre l'événement d'annonce UI
    scene.events.emit('ui:announcement', {
      text: this.name.toUpperCase(),
      subtext: this.description,
      style: 'event',
      duration: 3000,
    });

    // Log de debug
    console.log(`[EventSystem] Event activated: ${this.name}`);
  }

  /**
   * Désactive l'événement
   */
  public deactivate(_scene: GameScene): void {
    this.state = EventState.INACTIVE;
    console.log(`[EventSystem] Event deactivated: ${this.name}`);
  }

  /**
   * Réinitialise l'événement
   */
  public reset(): void {
    this.state = EventState.INACTIVE;
    this.lastActivationWave = -999;
  }
}
