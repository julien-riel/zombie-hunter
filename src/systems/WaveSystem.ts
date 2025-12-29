import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { ZombieType } from '@/types/entities';
import { BALANCE } from '@config/balance';

/**
 * Configuration d'un groupe de spawn dans une vague
 */
export interface SpawnGroup {
  zombieType: ZombieType;
  count: number;
  spawnDelay?: number;
}

/**
 * Configuration d'une vague
 */
export interface WaveConfig {
  waveNumber: number;
  activeDoors: number;
  spawnGroups: SpawnGroup[];
  totalZombies: number;
}

/**
 * État de la vague
 */
export enum WaveState {
  IDLE = 'idle',
  PREPARING = 'preparing',
  ACTIVE = 'active',
  CLEARING = 'clearing',
  COMPLETED = 'completed',
}

/**
 * Alias pour accéder plus facilement aux constantes de vagues
 */
const WAVES = BALANCE.waves;

/**
 * Système de gestion des vagues
 * Coordonne la progression des vagues, les spawns et la difficulté
 */
export class WaveSystem {
  private scene: GameScene;
  private currentWave: number = 0;
  private state: WaveState = WaveState.IDLE;
  private zombiesRemaining: number = 0;
  private zombiesSpawned: number = 0;
  private zombiesKilled: number = 0;
  private waveConfig: WaveConfig | null = null;

  private transitionTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: GameScene) {
    this.scene = scene;

    // Écouter les événements de mort des zombies
    this.scene.events.on('zombieDeath', this.onZombieDeath, this);
  }

  /**
   * Démarre le système de vagues
   */
  public start(): void {
    this.currentWave = 0;
    this.state = WaveState.IDLE;
    this.startNextWave();
  }

  /**
   * Démarre la prochaine vague
   */
  public startNextWave(): void {
    this.currentWave++;
    this.state = WaveState.PREPARING;

    // Générer la configuration de la vague
    this.waveConfig = this.generateWaveConfig(this.currentWave);

    // Émettre l'événement de préparation de vague
    this.scene.events.emit('wavePreparing', this.currentWave, this.waveConfig);

    // Activer les portes nécessaires
    this.activateDoors(this.waveConfig.activeDoors);

    // Court délai avant le début de la vague
    this.transitionTimer = this.scene.time.delayedCall(
      WAVES.transitionDelay,
      () => {
        this.beginWave();
      },
      [],
      this
    );
  }

  /**
   * Commence effectivement la vague
   */
  private beginWave(): void {
    if (!this.waveConfig) return;

    this.state = WaveState.ACTIVE;
    this.zombiesSpawned = 0;
    this.zombiesKilled = 0;
    this.zombiesRemaining = this.waveConfig.totalZombies;

    // Émettre l'événement de début de vague
    this.scene.events.emit('waveStart', this.currentWave, this.waveConfig);

    // Démarrer le spawn
    this.scene.getSpawnSystem().startWaveSpawning(this.waveConfig);
  }

  /**
   * Appelé quand un zombie est tué
   */
  private onZombieDeath(): void {
    if (this.state !== WaveState.ACTIVE && this.state !== WaveState.CLEARING) return;

    this.zombiesKilled++;
    this.zombiesRemaining = Math.max(0, this.zombiesRemaining - 1);

    // Émettre l'événement de progression
    this.scene.events.emit('waveProgress', {
      wave: this.currentWave,
      killed: this.zombiesKilled,
      remaining: this.zombiesRemaining,
      total: this.waveConfig?.totalZombies || 0,
    });

    // Vérifier si la vague est terminée
    this.checkWaveComplete();
  }

  /**
   * Notifie le système qu'un zombie a été spawné.
   * Met à jour le compteur de zombies spawnés et passe en mode CLEARING
   * lorsque tous les zombies de la vague ont été créés.
   * @emits Passe en état CLEARING quand totalZombies atteint
   */
  public onZombieSpawned(): void {
    this.zombiesSpawned++;

    // Vérifier si tous les zombies ont été spawnés
    if (this.waveConfig && this.zombiesSpawned >= this.waveConfig.totalZombies) {
      this.state = WaveState.CLEARING;
      this.scene.getSpawnSystem().stopSpawning();
    }
  }

  /**
   * Vérifie si la vague est terminée
   */
  private checkWaveComplete(): void {
    if (this.zombiesRemaining <= 0 && this.state === WaveState.CLEARING) {
      this.completeWave();
    }
  }

  /**
   * Termine la vague
   */
  private completeWave(): void {
    this.state = WaveState.COMPLETED;

    // Émettre l'événement de fin de vague
    this.scene.events.emit('waveComplete', this.currentWave);

    // Transition vers la prochaine vague après un délai
    this.transitionTimer = this.scene.time.delayedCall(
      WAVES.transitionDelay,
      () => {
        this.startNextWave();
      },
      [],
      this
    );
  }

  /**
   * Génère la configuration d'une vague
   */
  private generateWaveConfig(waveNumber: number): WaveConfig {
    // Calculer le nombre de zombies
    const totalZombies = Math.min(
      WAVES.maxZombiesPerWave,
      WAVES.baseZombieCount + (waveNumber - 1) * WAVES.zombiesPerWave
    );

    // Calculer le nombre de portes actives
    const activeDoors = Math.min(
      WAVES.maxDoors,
      WAVES.initialDoors + Math.floor((waveNumber - 1) / WAVES.doorsPerWaves)
    );

    // Obtenir les types de zombies disponibles pour cette vague
    const availableTypes = this.getAvailableZombieTypes(waveNumber);

    // Générer les groupes de spawn
    const spawnGroups = this.generateSpawnGroups(totalZombies, availableTypes);

    return {
      waveNumber,
      activeDoors,
      spawnGroups,
      totalZombies,
    };
  }

  /**
   * Récupère les types de zombies disponibles pour une vague
   */
  private getAvailableZombieTypes(waveNumber: number): { type: ZombieType; weight: number }[] {
    return WAVES.zombieTypeUnlocks
      .filter((unlock) => waveNumber >= unlock.wave)
      .map((unlock) => ({ type: unlock.type, weight: unlock.weight }));
  }

  /**
   * Génère les groupes de spawn pour une vague
   */
  private generateSpawnGroups(
    totalZombies: number,
    availableTypes: { type: ZombieType; weight: number }[]
  ): SpawnGroup[] {
    // Normaliser les poids
    const totalWeight = availableTypes.reduce((sum, t) => sum + t.weight, 0);
    const spawnGroups: SpawnGroup[] = [];

    let remaining = totalZombies;

    for (const typeConfig of availableTypes) {
      const normalizedWeight = typeConfig.weight / totalWeight;
      const count = Math.round(totalZombies * normalizedWeight);

      if (count > 0) {
        spawnGroups.push({
          zombieType: typeConfig.type,
          count: Math.min(count, remaining),
        });
        remaining -= count;
      }
    }

    // Ajuster si nécessaire pour atteindre le total
    if (remaining > 0 && spawnGroups.length > 0) {
      spawnGroups[0].count += remaining;
    }

    return spawnGroups;
  }

  /**
   * Active un nombre spécifique de portes
   */
  private activateDoors(count: number): void {
    const doors = this.scene.arena.getDoors();
    const inactiveDoors = doors.filter((door) => !door.isActive());

    // Si toutes les portes nécessaires sont déjà actives, ne rien faire
    const activeDoors = doors.filter((door) => door.isActive());
    if (activeDoors.length >= count) return;

    // Activer les portes manquantes
    const toActivate = count - activeDoors.length;
    const shuffled = Phaser.Utils.Array.Shuffle([...inactiveDoors]);

    for (let i = 0; i < Math.min(toActivate, shuffled.length); i++) {
      shuffled[i].activate();
    }
  }

  /**
   * Récupère le numéro de vague actuel.
   * @returns Le numéro de la vague en cours (1-indexed), 0 si pas encore démarré
   */
  public getCurrentWave(): number {
    return this.currentWave;
  }

  /**
   * Récupère l'état actuel du système de vagues.
   * @returns L'état de la vague (IDLE, PREPARING, ACTIVE, CLEARING, COMPLETED)
   */
  public getState(): WaveState {
    return this.state;
  }

  /**
   * Récupère le nombre de zombies restants à éliminer dans la vague.
   * @returns Le nombre de zombies encore vivants ou non spawnés
   */
  public getZombiesRemaining(): number {
    return this.zombiesRemaining;
  }

  /**
   * Récupère la configuration de la vague actuelle.
   * Contient le nombre de zombies, les portes actives et les groupes de spawn.
   * @returns La configuration de la vague ou null si aucune vague active
   */
  public getWaveConfig(): WaveConfig | null {
    return this.waveConfig;
  }

  /**
   * Met en pause le système de vagues.
   * Les timers de transition sont suspendus mais les zombies restent actifs.
   */
  public pause(): void {
    if (this.transitionTimer) {
      this.transitionTimer.paused = true;
    }
  }

  /**
   * Reprend le système de vagues après une pause.
   * Les timers de transition reprennent là où ils s'étaient arrêtés.
   */
  public resume(): void {
    if (this.transitionTimer) {
      this.transitionTimer.paused = false;
    }
  }

  /**
   * Réinitialise le système de vagues à son état initial.
   * Annule les timers, remet les compteurs à zéro et retourne à l'état IDLE.
   * Utilisé lors d'un game over ou d'un restart.
   */
  public reset(): void {
    if (this.transitionTimer) {
      this.transitionTimer.destroy();
      this.transitionTimer = null;
    }

    this.currentWave = 0;
    this.state = WaveState.IDLE;
    this.zombiesRemaining = 0;
    this.zombiesSpawned = 0;
    this.zombiesKilled = 0;
    this.waveConfig = null;
  }

  /**
   * Nettoie le système et libère les ressources.
   * Désinscrit les listeners d'événements et réinitialise l'état.
   * Doit être appelé lors de la destruction de la scène.
   */
  public destroy(): void {
    this.scene.events.off('zombieDeath', this.onZombieDeath, this);
    this.reset();
  }
}
