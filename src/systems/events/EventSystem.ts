/**
 * Phase 7.4 - EventSystem
 * Gestionnaire central des événements spéciaux
 */

import type { GameScene } from '@scenes/GameScene';
import type { WaveConfig } from '../WaveSystem';
import {
  type SpecialEvent,
  SpecialEventType,
  EventState,
} from './SpecialEvent';
import { BlackoutEvent } from './BlackoutEvent';
import { HordeEvent } from './HordeEvent';
import { OverheatedDoorEvent } from './OverheatedDoorEvent';
import { BossRushEvent } from './BossRushEvent';

/**
 * Configuration du système d'événements
 */
export interface EventSystemConfig {
  /** Probabilité de base qu'un événement se déclenche par vague */
  baseEventChance: number;
  /** Vague minimum avant que les événements puissent se déclencher */
  minWaveForEvents: number;
  /** Nombre maximum d'événements simultanés */
  maxConcurrentEvents: number;
  /** Activer/désactiver le système */
  enabled: boolean;
}

/**
 * Configuration par défaut du système d'événements
 */
const DEFAULT_CONFIG: EventSystemConfig = {
  baseEventChance: 0.15, // 15% de chance par vague
  minWaveForEvents: 3,
  maxConcurrentEvents: 1,
  enabled: true,
};

/**
 * Système de gestion des événements spéciaux
 * Coordonne le déclenchement, l'activation et la désactivation des événements
 */
export class EventSystem {
  private scene: GameScene;
  private config: EventSystemConfig;

  /** Tous les événements disponibles */
  private events: Map<SpecialEventType, SpecialEvent> = new Map();

  /** Événements actuellement actifs */
  private activeEvents: SpecialEvent[] = [];

  /** Événement programmé pour la prochaine vague */
  private pendingEvent: SpecialEvent | null = null;

  /** Flag pour savoir si un événement est forcé (debug) */
  private forcedEvent: SpecialEventType | null = null;

  constructor(scene: GameScene, config: Partial<EventSystemConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialiser les événements
    this.initializeEvents();

    // Écouter les événements de jeu
    this.setupEventListeners();
  }

  /**
   * Initialise tous les événements disponibles
   */
  private initializeEvents(): void {
    // Créer les instances de chaque événement
    this.events.set(SpecialEventType.BLACKOUT, new BlackoutEvent());
    this.events.set(SpecialEventType.HORDE, new HordeEvent());
    this.events.set(SpecialEventType.OVERHEATED_DOOR, new OverheatedDoorEvent());
    this.events.set(SpecialEventType.BOSS_RUSH, new BossRushEvent());

    console.log(`[EventSystem] Initialized ${this.events.size} events`);
  }

  /**
   * Configure les listeners d'événements
   */
  private setupEventListeners(): void {
    // Écouter la fin de vague pour désactiver les événements
    this.scene.events.on('waveComplete', this.onWaveComplete, this);

    // Écouter la mort des zombies
    this.scene.events.on('zombieDeath', this.onZombieDeath, this);

    // Écouter la mort des boss
    this.scene.events.on('bossDefeated', this.onBossDefeated, this);
  }

  /**
   * Vérifie et déclenche un événement pour une vague
   * Appelé par WaveSystem avant le début d'une vague
   * @param waveNumber Le numéro de vague
   * @returns L'événement déclenché ou null
   */
  public checkForEvent(waveNumber: number): SpecialEvent | null {
    if (!this.config.enabled) return null;

    // Vérifier si on est au-dessus du seuil minimum
    if (waveNumber < this.config.minWaveForEvents) return null;

    // Vérifier si un événement est forcé (debug)
    if (this.forcedEvent) {
      const event = this.events.get(this.forcedEvent);
      this.forcedEvent = null;
      if (event) {
        this.pendingEvent = event;
        return event;
      }
    }

    // Vérifier le nombre d'événements actifs
    if (this.activeEvents.length >= this.config.maxConcurrentEvents) return null;

    // Ne pas déclencher d'événement pendant une vague de boss
    const waveSystem = this.scene.getWaveSystem();
    if (waveSystem.isBossWave(waveNumber)) {
      // Exception: Boss Rush peut se déclencher sur certaines vagues spéciales
      const bossRush = this.events.get(SpecialEventType.BOSS_RUSH);
      if (bossRush && this.shouldTriggerBossRush(waveNumber)) {
        this.pendingEvent = bossRush;
        return bossRush;
      }
      return null;
    }

    // Roll pour voir si un événement se déclenche
    if (Math.random() > this.config.baseEventChance) return null;

    // Sélectionner un événement éligible
    const eligibleEvents = this.getEligibleEvents(waveNumber);
    if (eligibleEvents.length === 0) return null;

    // Sélectionner aléatoirement selon les poids de probabilité
    const selectedEvent = this.selectWeightedEvent(eligibleEvents, waveNumber);
    if (selectedEvent) {
      this.pendingEvent = selectedEvent;
      return selectedEvent;
    }

    return null;
  }

  /**
   * Vérifie si Boss Rush doit se déclencher
   */
  private shouldTriggerBossRush(waveNumber: number): boolean {
    // Boss Rush se déclenche aux vagues spéciales (15, 25, 35...)
    const bossRushWaves = [15, 25, 35, 45];
    return bossRushWaves.includes(waveNumber);
  }

  /**
   * Récupère les événements éligibles pour une vague
   */
  private getEligibleEvents(waveNumber: number): SpecialEvent[] {
    const eligible: SpecialEvent[] = [];

    for (const event of this.events.values()) {
      // Vérifier si l'événement peut s'activer
      if (event.canActivate(this.scene, waveNumber)) {
        // Vérifier la compatibilité avec les événements actifs
        if (this.isCompatibleWithActiveEvents(event)) {
          eligible.push(event);
        }
      }
    }

    return eligible;
  }

  /**
   * Vérifie si un événement est compatible avec les événements actifs
   */
  private isCompatibleWithActiveEvents(event: SpecialEvent): boolean {
    if (!event.config.canStack) {
      // Vérifier si le même type est déjà actif
      for (const active of this.activeEvents) {
        if (active.type === event.type) return false;
      }
    }
    return true;
  }

  /**
   * Sélectionne un événement pondéré par probabilité
   */
  private selectWeightedEvent(events: SpecialEvent[], _waveNumber: number): SpecialEvent | null {
    if (events.length === 0) return null;

    // Calculer le poids total
    let totalWeight = 0;
    for (const event of events) {
      totalWeight += event.config.probability;
    }

    // Sélection pondérée
    let roll = Math.random() * totalWeight;
    for (const event of events) {
      roll -= event.config.probability;
      if (roll <= 0) {
        return event;
      }
    }

    // Fallback au dernier événement
    return events[events.length - 1];
  }

  /**
   * Active l'événement en attente
   * Appelé par WaveSystem au début de la vague
   */
  public activatePendingEvent(): void {
    if (!this.pendingEvent) return;

    const event = this.pendingEvent;
    this.pendingEvent = null;

    // Activer l'événement
    event.activate(this.scene);
    this.activeEvents.push(event);

    // Émettre un événement pour informer les autres systèmes
    this.scene.events.emit('specialEvent:activated', {
      type: event.type,
      name: event.name,
    });
  }

  /**
   * Modifie la configuration de vague selon les événements actifs
   */
  public modifyWaveConfig(config: WaveConfig): WaveConfig {
    let modifiedConfig = { ...config };

    for (const event of this.activeEvents) {
      if (event.modifyWaveConfig) {
        modifiedConfig = event.modifyWaveConfig(modifiedConfig);
      }
    }

    return modifiedConfig;
  }

  /**
   * Mise à jour des événements actifs
   */
  public update(delta: number): void {
    for (const event of this.activeEvents) {
      if (event.update) {
        event.update(this.scene, delta);
      }
    }

    // Vérifier les événements à désactiver
    const eventsToRemove: SpecialEvent[] = [];
    for (const event of this.activeEvents) {
      if (event.state === EventState.ENDING || event.state === EventState.INACTIVE) {
        eventsToRemove.push(event);
      }
    }

    // Retirer les événements terminés
    for (const event of eventsToRemove) {
      this.deactivateEvent(event);
    }
  }

  /**
   * Callback quand un zombie meurt
   */
  private onZombieDeath = (): void => {
    for (const event of this.activeEvents) {
      if (event.onZombieDeath) {
        event.onZombieDeath(this.scene);
      }
    }
  };

  /**
   * Callback quand une vague est terminée
   */
  private onWaveComplete = (_waveNumber: number): void => {
    // Notifier les événements
    for (const event of this.activeEvents) {
      if (event.onWaveComplete) {
        event.onWaveComplete(this.scene);
      }
    }

    // Désactiver les événements de durée "wave"
    const eventsToDeactivate = this.activeEvents.filter(
      (event) => event.duration === 'wave'
    );

    for (const event of eventsToDeactivate) {
      this.deactivateEvent(event);
    }
  };

  /**
   * Callback quand un boss est vaincu
   */
  private onBossDefeated = (): void => {
    // Notifier Boss Rush s'il est actif
    const bossRush = this.activeEvents.find(
      (e) => e.type === SpecialEventType.BOSS_RUSH
    );
    if (bossRush && bossRush instanceof BossRushEvent) {
      bossRush.onBossDefeated(this.scene);
    }
  };

  /**
   * Désactive un événement
   */
  private deactivateEvent(event: SpecialEvent): void {
    event.deactivate(this.scene);

    const index = this.activeEvents.indexOf(event);
    if (index > -1) {
      this.activeEvents.splice(index, 1);
    }

    // Émettre un événement pour informer les autres systèmes
    this.scene.events.emit('specialEvent:deactivated', {
      type: event.type,
      name: event.name,
    });
  }

  /**
   * Force l'activation d'un événement spécifique (debug)
   */
  public forceEvent(type: SpecialEventType): void {
    this.forcedEvent = type;
    console.log(`[EventSystem] Event forced: ${type}`);
  }

  /**
   * Active manuellement un événement (debug)
   */
  public triggerEvent(type: SpecialEventType): void {
    const event = this.events.get(type);
    if (!event) {
      console.warn(`[EventSystem] Unknown event type: ${type}`);
      return;
    }

    // Activer immédiatement
    event.activate(this.scene);
    this.activeEvents.push(event);

    this.scene.events.emit('specialEvent:activated', {
      type: event.type,
      name: event.name,
    });
  }

  /**
   * Arrête manuellement un événement actif (debug)
   */
  public stopEvent(type: SpecialEventType): void {
    const event = this.activeEvents.find((e) => e.type === type);
    if (event) {
      this.deactivateEvent(event);
    }
  }

  /**
   * Arrête tous les événements actifs
   */
  public stopAllEvents(): void {
    for (const event of [...this.activeEvents]) {
      this.deactivateEvent(event);
    }
  }

  /**
   * Récupère les événements actifs
   */
  public getActiveEvents(): SpecialEvent[] {
    return [...this.activeEvents];
  }

  /**
   * Récupère un événement par son type
   */
  public getEvent(type: SpecialEventType): SpecialEvent | undefined {
    return this.events.get(type);
  }

  /**
   * Vérifie si un type d'événement est actif
   */
  public isEventActive(type: SpecialEventType): boolean {
    return this.activeEvents.some((e) => e.type === type);
  }

  /**
   * Récupère la configuration du système
   */
  public getConfig(): EventSystemConfig {
    return { ...this.config };
  }

  /**
   * Met à jour la configuration du système
   */
  public updateConfig(config: Partial<EventSystemConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Active ou désactive le système
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.stopAllEvents();
    }
  }

  /**
   * Réinitialise le système
   */
  public reset(): void {
    this.stopAllEvents();
    this.pendingEvent = null;
    this.forcedEvent = null;

    for (const event of this.events.values()) {
      event.reset();
    }
  }

  /**
   * Nettoie le système
   */
  public destroy(): void {
    this.reset();
    this.scene.events.off('waveComplete', this.onWaveComplete, this);
    this.scene.events.off('zombieDeath', this.onZombieDeath, this);
    this.scene.events.off('bossDefeated', this.onBossDefeated, this);
    this.events.clear();
  }
}
