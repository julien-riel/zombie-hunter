import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import {
  PowerUp,
  PowerUpType,
  RagePowerUp,
  FreezePowerUp,
  GhostPowerUp,
  MagnetPowerUp,
  NukePowerUp,
} from '@items/powerups';
import { BALANCE } from '@config/balance';

/**
 * Informations sur un power-up actif
 */
export interface ActivePowerUpInfo {
  type: PowerUpType;
  name: string;
  color: number;
  timeRemaining: number;
  timeRemainingPercent: number;
}

/**
 * Système de gestion des power-ups
 *
 * Responsabilités:
 * - Gérer l'activation et la désactivation des power-ups
 * - Appliquer les effets des power-ups au jeu
 * - Fournir les modificateurs aux autres systèmes
 * - Afficher les power-ups actifs dans le HUD
 */
export class PowerUpSystem {
  private scene: GameScene;
  private player: Player;

  // Power-ups actifs
  private activePowerUps: Map<PowerUpType, PowerUp> = new Map();

  // Modificateurs de jeu
  private damageMultiplier: number = 1;
  private ghostMode: boolean = false;
  private magnetMode: boolean = false;
  private magnetRadius: number = 0;
  private magnetSpeed: number = 0;

  constructor(scene: GameScene, player: Player) {
    this.scene = scene;
    this.player = player;

    // Écouter l'événement d'activation de power-up
    this.scene.events.on('powerup:collect', this.onPowerUpCollect, this);
  }

  /**
   * Active un power-up par son type
   */
  public activatePowerUp(type: PowerUpType): void {
    // Si un power-up du même type est déjà actif, le remplacer
    if (this.activePowerUps.has(type)) {
      const existingPowerUp = this.activePowerUps.get(type)!;
      existingPowerUp.deactivate();
      this.activePowerUps.delete(type);
    }

    // Créer le power-up approprié
    const powerUp = this.createPowerUp(type);
    if (!powerUp) return;

    // Activer le power-up
    powerUp.activate(this.player, this.scene);
    this.activePowerUps.set(type, powerUp);

    // Log pour debug
    console.log(`[PowerUpSystem] Activated ${type} power-up`);
  }

  /**
   * Crée une instance de power-up selon le type
   */
  private createPowerUp(type: PowerUpType): PowerUp | null {
    switch (type) {
      case 'rage':
        return new RagePowerUp();
      case 'freeze':
        return new FreezePowerUp();
      case 'ghost':
        return new GhostPowerUp();
      case 'magnet':
        return new MagnetPowerUp();
      case 'nuke':
        return new NukePowerUp();
      default:
        console.warn(`[PowerUpSystem] Unknown power-up type: ${type}`);
        return null;
    }
  }

  /**
   * Gère la collecte d'un power-up
   */
  private onPowerUpCollect(data: { powerupType: PowerUpType }): void {
    this.activatePowerUp(data.powerupType);
  }

  /**
   * Met à jour les power-ups actifs
   * @param delta Temps écoulé depuis la dernière frame (ms)
   */
  public update(delta: number): void {
    // Mettre à jour chaque power-up actif
    for (const [type, powerUp] of this.activePowerUps.entries()) {
      const stillActive = powerUp.update(delta);

      // Retirer le power-up s'il a expiré
      if (!stillActive) {
        this.activePowerUps.delete(type);
        console.log(`[PowerUpSystem] ${type} power-up expired`);
      }
    }
  }

  /**
   * Définit le multiplicateur de dégâts (pour RagePowerUp)
   */
  public setDamageMultiplier(multiplier: number): void {
    this.damageMultiplier = multiplier;
  }

  /**
   * Récupère le multiplicateur de dégâts actuel
   */
  public getDamageMultiplier(): number {
    return this.damageMultiplier;
  }

  /**
   * Active/désactive le mode ghost (pour GhostPowerUp)
   */
  public setGhostMode(enabled: boolean): void {
    this.ghostMode = enabled;

    // Désactiver/réactiver les collisions avec les zombies
    if (enabled) {
      this.disableZombieCollisions();
    } else {
      this.enableZombieCollisions();
    }
  }

  /**
   * Vérifie si le mode ghost est actif
   */
  public isGhostMode(): boolean {
    return this.ghostMode;
  }

  /**
   * Désactive les collisions joueur/zombies
   */
  private disableZombieCollisions(): void {
    // Le mode ghost empêche les dégâts des zombies
    // mais pas les projectiles (géré dans le ZombieStateMachine)
  }

  /**
   * Réactive les collisions joueur/zombies
   */
  private enableZombieCollisions(): void {
    // Restaurer les collisions normales
  }

  /**
   * Active/désactive le mode magnet (pour MagnetPowerUp)
   */
  public setMagnetMode(enabled: boolean, radius: number, speed: number): void {
    this.magnetMode = enabled;
    this.magnetRadius = radius;
    this.magnetSpeed = speed;
  }

  /**
   * Vérifie si le mode magnet est actif
   */
  public isMagnetMode(): boolean {
    return this.magnetMode;
  }

  /**
   * Récupère le rayon d'attraction magnétique
   */
  public getMagnetRadius(): number {
    if (!this.magnetMode) {
      return BALANCE.drops.magnetRadius;
    }
    return this.magnetRadius;
  }

  /**
   * Récupère la vitesse d'attraction magnétique
   */
  public getMagnetSpeed(): number {
    if (!this.magnetMode) {
      return BALANCE.drops.magnetSpeed;
    }
    return this.magnetSpeed;
  }

  /**
   * Vérifie si un type de power-up est actif
   */
  public isPowerUpActive(type: PowerUpType): boolean {
    return this.activePowerUps.has(type);
  }

  /**
   * Récupère les informations sur tous les power-ups actifs
   */
  public getActivePowerUps(): ActivePowerUpInfo[] {
    const result: ActivePowerUpInfo[] = [];

    for (const powerUp of this.activePowerUps.values()) {
      result.push({
        type: powerUp.type,
        name: powerUp.name,
        color: powerUp.color,
        timeRemaining: powerUp.getTimeRemaining(),
        timeRemainingPercent: powerUp.getTimeRemainingPercent(),
      });
    }

    return result;
  }

  /**
   * Récupère le nombre de power-ups actifs
   */
  public getActivePowerUpCount(): number {
    return this.activePowerUps.size;
  }

  /**
   * Désactive tous les power-ups actifs
   */
  public deactivateAll(): void {
    for (const powerUp of this.activePowerUps.values()) {
      powerUp.deactivate();
    }
    this.activePowerUps.clear();

    // Reset des modificateurs
    this.damageMultiplier = 1;
    this.ghostMode = false;
    this.magnetMode = false;
  }

  /**
   * Sélectionne un type de power-up aléatoire basé sur les poids
   */
  public static selectRandomPowerUpType(currentWave: number): PowerUpType {
    const config = BALANCE.powerUps;
    const types: PowerUpType[] = ['rage', 'freeze', 'ghost', 'magnet', 'nuke'];
    const weights: number[] = [];

    for (const type of types) {
      const powerUpConfig = config[type];

      // Vérifier si le power-up peut spawn à cette vague
      if (type === 'nuke' && currentWave < config.nuke.minWaveToSpawn) {
        weights.push(0);
      } else {
        weights.push(powerUpConfig.weight);
      }
    }

    // Normaliser les poids
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const random = Math.random() * totalWeight;

    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return types[i];
      }
    }

    return 'rage'; // Fallback
  }

  /**
   * Nettoie les ressources du système
   */
  public destroy(): void {
    this.deactivateAll();
    this.scene.events.off('powerup:collect', this.onPowerUpCollect, this);
  }
}
