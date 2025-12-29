import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { ZombieFactory } from '@entities/zombies/ZombieFactory';
import type { ZombieType } from '@/types/entities';
import type { Door } from '@arena/Door';
import type { WaveConfig } from './WaveSystem';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, BASE_SPAWN_DELAY } from '@config/constants';

/**
 * Point de spawn (utilisé en mode legacy sans portes)
 */
interface SpawnPoint {
  x: number;
  y: number;
}

/**
 * Système de spawn des zombies
 * Gère les points de spawn et les intervalles
 */
export class SpawnSystem {
  private scene: GameScene;
  private zombieFactory: ZombieFactory;
  private spawnPoints: SpawnPoint[] = [];
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private isSpawning: boolean = false;

  private spawnInterval: number = 2000;
  private minSpawnInterval: number = 500;
  private spawnDecrement: number = 50;

  // Configuration de vague actuelle
  private currentWaveConfig: WaveConfig | null = null;
  private spawnQueue: { type: ZombieType; door: Door | null }[] = [];
  private spawnIndex: number = 0;

  constructor(scene: GameScene, zombieFactory: ZombieFactory) {
    this.scene = scene;
    this.zombieFactory = zombieFactory;

    this.initializeSpawnPoints();
  }

  /**
   * Initialise les points de spawn aux bords de la carte (mode legacy)
   */
  private initializeSpawnPoints(): void {
    const margin = TILE_SIZE * 2;
    const spacing = TILE_SIZE * 4;

    // Points en haut
    for (let x = margin; x < GAME_WIDTH - margin; x += spacing) {
      this.spawnPoints.push({ x, y: margin });
    }

    // Points en bas
    for (let x = margin; x < GAME_WIDTH - margin; x += spacing) {
      this.spawnPoints.push({ x, y: GAME_HEIGHT - margin });
    }

    // Points à gauche
    for (let y = margin + spacing; y < GAME_HEIGHT - margin; y += spacing) {
      this.spawnPoints.push({ x: margin, y });
    }

    // Points à droite
    for (let y = margin + spacing; y < GAME_HEIGHT - margin; y += spacing) {
      this.spawnPoints.push({ x: GAME_WIDTH - margin, y });
    }
  }

  /**
   * Démarre le spawn pour une vague spécifique
   */
  public startWaveSpawning(waveConfig: WaveConfig): void {
    this.currentWaveConfig = waveConfig;
    this.spawnQueue = this.buildSpawnQueue(waveConfig);
    this.spawnIndex = 0;

    this.isSpawning = true;
    this.scheduleNextWaveSpawn();
  }

  /**
   * Construit la queue de spawn pour une vague
   */
  private buildSpawnQueue(waveConfig: WaveConfig): { type: ZombieType; door: Door | null }[] {
    const queue: { type: ZombieType; door: Door | null }[] = [];
    const activeDoors = this.getActiveDoors();

    // Créer les entrées de spawn pour chaque groupe
    for (const group of waveConfig.spawnGroups) {
      for (let i = 0; i < group.count; i++) {
        // Assigner une porte aléatoire parmi les actives
        const door =
          activeDoors.length > 0
            ? activeDoors[Math.floor(Math.random() * activeDoors.length)]
            : null;

        queue.push({ type: group.zombieType, door });
      }
    }

    // Mélanger la queue pour un spawn plus naturel
    return Phaser.Utils.Array.Shuffle(queue);
  }

  /**
   * Récupère les portes actives
   */
  private getActiveDoors(): Door[] {
    if (!this.scene.arena) return [];
    return this.scene.arena.getDoors().filter((door) => door.isActive());
  }

  /**
   * Planifie le prochain spawn de vague
   */
  private scheduleNextWaveSpawn(): void {
    if (!this.isSpawning || this.spawnIndex >= this.spawnQueue.length) {
      return;
    }

    // Calculer le délai entre les spawns
    const baseDelay = BASE_SPAWN_DELAY;
    const waveMultiplier = Math.max(0.5, 1 - (this.currentWaveConfig?.waveNumber || 1) * 0.02);
    const delay = baseDelay * waveMultiplier + Math.random() * 500;

    this.spawnTimer = this.scene.time.delayedCall(
      delay,
      () => {
        this.spawnFromQueue();
        this.scheduleNextWaveSpawn();
      },
      [],
      this
    );
  }

  /**
   * Spawn un zombie depuis la queue
   */
  private spawnFromQueue(): void {
    if (this.spawnIndex >= this.spawnQueue.length) return;

    const spawnEntry = this.spawnQueue[this.spawnIndex];
    this.spawnIndex++;

    let x: number;
    let y: number;

    if (spawnEntry.door) {
      // Spawn depuis une porte
      spawnEntry.door.open();
      const spawnPos = spawnEntry.door.getSpawnPosition();
      x = spawnPos.x;
      y = spawnPos.y;
    } else {
      // Fallback: spawn depuis un point aléatoire
      const point = this.getRandomSpawnPoint();
      if (!point) return;
      x = point.x;
      y = point.y;
    }

    this.zombieFactory.create(spawnEntry.type, x, y);

    // Notifier le WaveSystem
    this.scene.getWaveSystem()?.onZombieSpawned();
  }

  /**
   * Démarre le spawn automatique (mode legacy)
   */
  public startSpawning(): void {
    if (this.isSpawning) return;

    this.isSpawning = true;
    this.scheduleNextSpawn();
  }

  /**
   * Arrête le spawn automatique
   */
  public stopSpawning(): void {
    this.isSpawning = false;
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
      this.spawnTimer = null;
    }
  }

  /**
   * Planifie le prochain spawn (mode legacy)
   */
  private scheduleNextSpawn(): void {
    if (!this.isSpawning) return;

    this.spawnTimer = this.scene.time.delayedCall(
      this.spawnInterval,
      () => {
        this.spawnZombie();
        this.scheduleNextSpawn();
      },
      [],
      this
    );
  }

  /**
   * Spawn un zombie à un point aléatoire (mode legacy ou fallback)
   */
  public spawnZombie(type?: ZombieType): void {
    const activeDoors = this.getActiveDoors();

    let x: number;
    let y: number;

    if (activeDoors.length > 0) {
      // Spawn depuis une porte active
      const door = activeDoors[Math.floor(Math.random() * activeDoors.length)];
      door.open();
      const spawnPos = door.getSpawnPosition();
      x = spawnPos.x;
      y = spawnPos.y;
    } else {
      // Fallback vers les points de spawn
      const spawnPoint = this.getRandomSpawnPoint();
      if (!spawnPoint) return;
      x = spawnPoint.x;
      y = spawnPoint.y;
    }

    // Choisir un type de zombie
    const zombieType = type || this.getRandomZombieType();

    this.zombieFactory.create(zombieType, x, y);
  }

  /**
   * Spawn plusieurs zombies (mode legacy)
   */
  public spawnWave(count: number): void {
    for (let i = 0; i < count; i++) {
      // Délai aléatoire pour éviter un spawn simultané
      this.scene.time.delayedCall(
        i * 200,
        () => {
          this.spawnZombie();
        },
        [],
        this
      );
    }
  }

  /**
   * Récupère un type de zombie aléatoire
   */
  private getRandomZombieType(): ZombieType {
    const types: ZombieType[] = ['shambler', 'runner'];
    const weights = [0.7, 0.3];
    return this.weightedRandom(types, weights);
  }

  /**
   * Récupère un point de spawn aléatoire
   */
  private getRandomSpawnPoint(): SpawnPoint | null {
    if (this.spawnPoints.length === 0) return null;

    // Trouver un point éloigné du joueur
    const player = this.scene.getPlayer();
    const validPoints = this.spawnPoints.filter((point) => {
      const dx = point.x - player.x;
      const dy = point.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance > 150; // Au moins 150px du joueur
    });

    if (validPoints.length === 0) {
      return this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    }

    return validPoints[Math.floor(Math.random() * validPoints.length)];
  }

  /**
   * Sélection aléatoire pondérée
   */
  private weightedRandom<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  /**
   * Accélère le spawn (pour les vagues - mode legacy)
   */
  public increaseSpawnRate(): void {
    this.spawnInterval = Math.max(this.minSpawnInterval, this.spawnInterval - this.spawnDecrement);
  }

  /**
   * Définit l'intervalle de spawn
   */
  public setSpawnInterval(interval: number): void {
    this.spawnInterval = Math.max(this.minSpawnInterval, interval);
  }

  /**
   * Récupère l'intervalle de spawn actuel
   */
  public getSpawnInterval(): number {
    return this.spawnInterval;
  }

  /**
   * Réinitialise le système
   */
  public reset(): void {
    this.stopSpawning();
    this.spawnInterval = 2000;
    this.currentWaveConfig = null;
    this.spawnQueue = [];
    this.spawnIndex = 0;
    this.zombieFactory.releaseAll();
  }

  /**
   * Nettoie le système
   */
  public destroy(): void {
    this.stopSpawning();
  }
}
