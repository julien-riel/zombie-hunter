import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { ZombieFactory } from '@entities/zombies/ZombieFactory';
import type { ZombieType } from '@/types/entities';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '@config/constants';

/**
 * Point de spawn
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

  constructor(scene: GameScene, zombieFactory: ZombieFactory) {
    this.scene = scene;
    this.zombieFactory = zombieFactory;

    this.initializeSpawnPoints();
  }

  /**
   * Initialise les points de spawn aux bords de la carte
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
   * Démarre le spawn automatique
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
   * Planifie le prochain spawn
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
   * Spawn un zombie à un point aléatoire
   */
  public spawnZombie(): void {
    const spawnPoint = this.getRandomSpawnPoint();
    if (!spawnPoint) return;

    // Choisir un type de zombie aléatoire
    const types: ZombieType[] = ['shambler', 'runner'];
    const weights = [0.7, 0.3]; // 70% shambler, 30% runner
    const type = this.weightedRandom(types, weights);

    this.zombieFactory.create(type, spawnPoint.x, spawnPoint.y);
  }

  /**
   * Spawn plusieurs zombies
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
   * Accélère le spawn (pour les vagues)
   */
  public increaseSpawnRate(): void {
    this.spawnInterval = Math.max(
      this.minSpawnInterval,
      this.spawnInterval - this.spawnDecrement
    );
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
    this.zombieFactory.releaseAll();
  }

  /**
   * Nettoie le système
   */
  public destroy(): void {
    this.stopSpawning();
  }
}
