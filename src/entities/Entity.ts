import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import { HealthComponent } from '@components/HealthComponent';
import { MovementComponent } from '@components/MovementComponent';

/**
 * Classe de base pour toutes les entités du jeu
 * Fournit les fonctionnalités communes (santé, mouvement, etc.)
 */
export abstract class Entity extends Phaser.Physics.Arcade.Sprite {
  declare public scene: GameScene;
  public healthComponent: HealthComponent;
  public movementComponent: MovementComponent;

  protected entitySpeed: number;
  protected entityMaxHealth: number;

  constructor(
    scene: GameScene,
    x: number,
    y: number,
    texture: string,
    maxHealth: number,
    speed: number
  ) {
    super(scene, x, y, texture);

    this.entityMaxHealth = maxHealth;
    this.entitySpeed = speed;

    // Ajouter au jeu et à la physique
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialiser les composants
    this.healthComponent = new HealthComponent(this, maxHealth);
    this.movementComponent = new MovementComponent(this, speed);

    // Configuration de base du corps physique
    this.setCollideWorldBounds(true);
  }

  /**
   * Met à jour l'entité à chaque frame
   */
  update(_time: number, delta: number): void {
    if (!this.active) return;
    this.movementComponent.update(delta);
  }

  /**
   * Inflige des dégâts à l'entité
   */
  public takeDamage(amount: number): void {
    this.healthComponent.takeDamage(amount);

    // Flash de dégâts
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.active) {
        this.clearTint();
      }
    });

    if (this.healthComponent.isDead()) {
      this.die();
    }
  }

  /**
   * Soigne l'entité
   */
  public heal(amount: number): void {
    this.healthComponent.heal(amount);
  }

  /**
   * Récupère la santé actuelle
   */
  public getHealth(): number {
    return this.healthComponent.getHealth();
  }

  /**
   * Récupère la santé maximum
   */
  public getMaxHealth(): number {
    return this.healthComponent.getMaxHealth();
  }

  /**
   * Récupère la vitesse de l'entité
   */
  public getSpeed(): number {
    return this.entitySpeed;
  }

  /**
   * Réinitialise l'entité pour réutilisation (object pooling)
   */
  public reset(x: number, y: number): void {
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.healthComponent.reset();
    this.clearTint();
    this.setAlpha(1);

    // Réactiver le corps physique
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = true;
    }
  }

  /**
   * Désactive l'entité (pour object pooling)
   */
  public deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);

    // Désactiver le corps physique
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
    }
  }

  /**
   * Gère la mort de l'entité
   */
  protected abstract die(): void;
}
