import type { GameScene } from '@scenes/GameScene';
import { Entity } from '@entities/Entity';
import { ZombieStateMachine, ZombieState } from './ZombieStateMachine';
import type { ZombieType } from '@/types/entities';
import type { HordeManager } from '@ai/HordeManager';
import type { TacticalBehaviors } from '@ai/TacticalBehaviors';

/**
 * Configuration d'un type de zombie
 */
export interface ZombieConfig {
  type: ZombieType;
  texture: string;
  maxHealth: number;
  speed: number;
  damage: number;
  detectionRange: number;
  attackRange: number;
  attackCooldown: number;
  scoreValue: number;
}

/**
 * Classe de base pour tous les zombies
 * Gère le comportement commun et l'IA
 */
export abstract class Zombie extends Entity {
  protected config: ZombieConfig;
  protected stateMachine: ZombieStateMachine;
  protected damage: number;
  protected scoreValue: number;

  constructor(scene: GameScene, x: number, y: number, config: ZombieConfig) {
    super(scene, x, y, config.texture, config.maxHealth, config.speed);

    this.config = config;
    this.damage = config.damage;
    this.scoreValue = config.scoreValue;

    // Initialiser la machine à états
    this.stateMachine = new ZombieStateMachine(
      this,
      config.detectionRange,
      config.attackRange,
      config.attackCooldown
    );

    // Configuration du corps physique
    this.setDrag(500);
    this.setCollideWorldBounds(true);
  }

  /**
   * Met à jour le zombie à chaque frame
   */
  update(time: number, delta: number): void {
    if (!this.active) return;

    super.update(time, delta);
    this.stateMachine.update(time);
  }

  /**
   * Récupère les dégâts du zombie
   */
  public getDamage(): number {
    return this.damage;
  }

  /**
   * Récupère le type de zombie
   */
  public getType(): ZombieType {
    return this.config.type;
  }

  /**
   * Propriété de commodité pour accéder au type de zombie
   */
  public get zombieType(): ZombieType {
    return this.config.type;
  }

  /**
   * Récupère la valeur en points
   */
  public getScoreValue(): number {
    return this.scoreValue;
  }

  /**
   * Récupère l'état actuel de l'IA
   */
  public getState(): ZombieState {
    return this.stateMachine.getState();
  }

  /**
   * Immobilise le zombie (cloué au sol par le NailGun)
   * @param duration Durée de l'immobilisation en ms
   */
  public setPinned(duration: number): void {
    this.stateMachine.setPinned(duration);
  }

  /**
   * Étourdit le zombie
   * @param duration Durée de l'étourdissement en ms
   */
  public setStunned(duration: number): void {
    this.stateMachine.setStunned(duration);
  }

  /**
   * Définit le multiplicateur de vitesse (pour les power-ups comme Freeze)
   * @param multiplier Multiplicateur (0.3 = 30% de la vitesse normale)
   */
  public setSpeedMultiplier(multiplier: number): void {
    this.movementComponent.setSpeedMultiplier(multiplier);
  }

  /**
   * Récupère le multiplicateur de vitesse actuel
   */
  public getSpeedMultiplier(): number {
    return this.movementComponent.getSpeedMultiplier();
  }

  /**
   * Configure le mode horde pour ce zombie
   * @param hordeManager Gestionnaire de horde
   * @param tacticalBehaviors Comportements tactiques
   */
  public configureHordeMode(
    hordeManager: HordeManager,
    tacticalBehaviors: TacticalBehaviors
  ): void {
    this.stateMachine.setHordeManager(hordeManager);
    this.stateMachine.setTacticalBehaviors(tacticalBehaviors);
    this.stateMachine.setHordeMode(true);
  }

  /**
   * Désactive le mode horde pour ce zombie
   */
  public disableHordeMode(): void {
    this.stateMachine.setHordeMode(false);
  }

  /**
   * Réinitialise le zombie pour réutilisation
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);
    this.stateMachine.reset();
    this.damage = this.config.damage;
  }

  /**
   * Gère la mort du zombie
   */
  protected die(): void {
    this.stateMachine.setDead();

    // Émettre un événement de mort
    this.scene.events.emit('zombieDeath', this);

    // Animation de mort
    this.playDeathAnimation();
  }

  /**
   * Joue l'animation de mort
   */
  protected playDeathAnimation(): void {
    // Désactiver le corps physique immédiatement
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    // Animation de fondu
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      onComplete: () => {
        this.deactivate();
      },
    });
  }

  /**
   * Comportement spécifique au type de zombie
   * À implémenter dans les sous-classes
   */
  protected abstract onSpawn(): void;
}
