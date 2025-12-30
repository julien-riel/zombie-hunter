import Phaser from 'phaser';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Types de drops disponibles
 */
export type DropType = 'ammo' | 'healthSmall' | 'healthMedium' | 'powerUp';

/**
 * Configuration d'un drop
 */
export interface DropConfig {
  type: DropType;
  color: number;
  size: number;
}

/**
 * Classe de base pour tous les drops
 *
 * Les drops sont des objets qui apparaissent quand un zombie est tué.
 * Ils sont collectés par le joueur quand il passe à proximité.
 *
 * Comportement:
 * - Animation de "pop" à l'apparition
 * - Restent au sol pendant 15 secondes
 * - Clignotent pendant les 3 dernières secondes
 * - Sont attirés vers le joueur quand il est proche (effet magnétique)
 * - Collectés au contact avec le joueur
 */
export abstract class Drop extends Phaser.Physics.Arcade.Sprite {
  protected gameScene: GameScene;
  protected dropType: DropType;
  protected dropConfig: typeof BALANCE.drops;

  private lifetimeTimer: Phaser.Time.TimerEvent | null = null;
  private blinkTimer: Phaser.Time.TimerEvent | null = null;
  private blinkTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: GameScene, x: number, y: number, type: DropType, color: number) {
    // Créer un placeholder graphique (cercle coloré)
    super(scene, x, y, '__WHITE');

    this.gameScene = scene;
    this.dropType = type;
    this.dropConfig = BALANCE.drops;

    // Ajouter au jeu et à la physique
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configuration visuelle
    this.setTint(color);
    this.setDisplaySize(16, 16);
    this.setDepth(5);

    // Configuration du corps physique
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(8);
    body.setDrag(300);
    body.setBounce(0.5);

    // Démarrer les timers de lifetime
    this.startLifetimeTimers();

    // Animation de "pop" à l'apparition
    this.playPopAnimation();
  }

  /**
   * Joue l'animation de "pop" à la création
   */
  private playPopAnimation(): void {
    // Position initiale légèrement décalée avec vélocité aléatoire
    const angle = Math.random() * Math.PI * 2;
    const velocity = this.dropConfig.popVelocity;

    (this.body as Phaser.Physics.Arcade.Body).setVelocity(
      Math.cos(angle) * velocity,
      Math.sin(angle) * velocity
    );

    // Animation de scale
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Démarre les timers de lifetime et de clignotement
   */
  private startLifetimeTimers(): void {
    const lifetime = this.dropConfig.lifetime;
    const blinkStart = this.dropConfig.blinkStartTime;

    // Timer pour commencer à clignoter
    this.blinkTimer = this.scene.time.addEvent({
      delay: lifetime - blinkStart,
      callback: this.startBlinking,
      callbackScope: this,
    });

    // Timer pour disparaître
    this.lifetimeTimer = this.scene.time.addEvent({
      delay: lifetime,
      callback: this.expire,
      callbackScope: this,
    });
  }

  /**
   * Commence l'effet de clignotement
   */
  private startBlinking(): void {
    this.blinkTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 150,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Appelé quand le drop expire (temps écoulé)
   */
  private expire(): void {
    this.deactivate();
  }

  /**
   * Met à jour le drop
   * Gère l'attraction magnétique vers le joueur
   */
  public update(player: Player): void {
    if (!this.active) return;

    // Calculer la distance au joueur
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Effet magnétique si le joueur est assez proche
    if (distance <= this.dropConfig.magnetRadius && distance > this.dropConfig.collectionRadius) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      const speed = this.dropConfig.magnetSpeed;

      (this.body as Phaser.Physics.Arcade.Body).setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      );
    }
  }

  /**
   * Collecte le drop par le joueur
   */
  public collect(player: Player): void {
    if (!this.active) return;

    // Appliquer l'effet du drop
    this.applyEffect(player);

    // Émettre l'événement de collecte
    this.gameScene.events.emit('item:pickup', {
      itemType: this.dropType,
      value: this.getValue(),
    });

    // Animation de collecte
    this.playCollectAnimation();
  }

  /**
   * Joue l'animation de collecte
   */
  private playCollectAnimation(): void {
    // Arrêter le clignotement si actif
    if (this.blinkTween) {
      this.blinkTween.stop();
    }

    // Animation de disparition vers le haut
    this.scene.tweens.add({
      targets: this,
      y: this.y - 30,
      alpha: 0,
      scale: 0.5,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.deactivate();
      },
    });
  }

  /**
   * Réinitialise le drop pour le pooling
   */
  public reset(x: number, y: number): void {
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setAlpha(1);
    this.setScale(0);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setVelocity(0, 0);

    // Redémarrer les timers
    this.startLifetimeTimers();
    this.playPopAnimation();
  }

  /**
   * Désactive le drop (pour le pooling)
   */
  public deactivate(): void {
    this.setActive(false);
    this.setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    body.setVelocity(0, 0);

    // Nettoyer les timers
    if (this.lifetimeTimer) {
      this.lifetimeTimer.remove();
      this.lifetimeTimer = null;
    }

    if (this.blinkTimer) {
      this.blinkTimer.remove();
      this.blinkTimer = null;
    }

    if (this.blinkTween) {
      this.blinkTween.stop();
      this.blinkTween = null;
    }
  }

  /**
   * Retourne le type du drop
   */
  public getType(): DropType {
    return this.dropType;
  }

  /**
   * Applique l'effet du drop au joueur
   * À implémenter dans les classes dérivées
   */
  protected abstract applyEffect(player: Player): void;

  /**
   * Retourne la valeur du drop (pour les événements)
   */
  protected abstract getValue(): number;

  /**
   * Nettoie les ressources
   */
  public destroy(fromScene?: boolean): void {
    this.deactivate();
    super.destroy(fromScene);
  }
}
