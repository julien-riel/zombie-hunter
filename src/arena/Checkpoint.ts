import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';

/**
 * Configuration d'un checkpoint
 */
export interface CheckpointConfig {
  x: number;
  y: number;
  id?: string;
  radius?: number;
  isRespawnPoint?: boolean;
}

/**
 * Point de sauvegarde/respawn
 * - Sauvegarde automatique quand le joueur entre
 * - Peut servir de point de respawn en mode campagne
 * - Effet visuel distinctif
 */
export class Checkpoint extends Phaser.GameObjects.Container {
  declare public scene: GameScene;

  public readonly id: string;
  private radius: number;
  private isRespawnPoint: boolean;
  private activated: boolean = false;

  private graphic: Phaser.GameObjects.Graphics;
  private glowEffect: Phaser.GameObjects.Graphics;
  private pulseTime: number = 0;

  constructor(scene: GameScene, config: CheckpointConfig) {
    super(scene, config.x, config.y);

    this.id = config.id || `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.radius = config.radius ?? 48;
    this.isRespawnPoint = config.isRespawnPoint ?? true;

    // Créer les graphiques
    this.glowEffect = scene.add.graphics();
    this.add(this.glowEffect);

    this.graphic = scene.add.graphics();
    this.add(this.graphic);

    this.drawCheckpoint();

    // Ajouter à la scène
    scene.add.existing(this);
    this.setDepth(5);
  }

  /**
   * Dessine le checkpoint
   */
  private drawCheckpoint(): void {
    this.graphic.clear();

    // Couleur selon l'état
    const color = this.activated ? 0x00ff00 : 0x888888;
    const alpha = this.activated ? 0.8 : 0.5;

    // Cercle extérieur
    this.graphic.lineStyle(3, color, alpha);
    this.graphic.strokeCircle(0, 0, this.radius);

    // Cercle intérieur
    this.graphic.lineStyle(2, color, alpha * 0.7);
    this.graphic.strokeCircle(0, 0, this.radius * 0.6);

    // Point central
    this.graphic.fillStyle(color, alpha);
    this.graphic.fillCircle(0, 0, 8);

    // Icône de flag/checkpoint
    this.graphic.lineStyle(2, color, 1);
    this.graphic.beginPath();
    this.graphic.moveTo(0, -20);
    this.graphic.lineTo(0, 10);
    this.graphic.strokePath();

    this.graphic.fillStyle(color, 1);
    this.graphic.fillTriangle(2, -20, 2, -8, 18, -14);
  }

  /**
   * Met à jour le checkpoint
   */
  public update(): void {
    // Animation de pulsation si activé
    if (this.activated) {
      this.pulseTime += 0.05;
      const pulse = Math.sin(this.pulseTime) * 0.3 + 0.7;

      this.glowEffect.clear();
      this.glowEffect.fillStyle(0x00ff00, 0.1 * pulse);
      this.glowEffect.fillCircle(0, 0, this.radius * (1 + pulse * 0.2));
    }

    // Vérifier si le joueur est dans la zone
    const player = this.scene.player;
    if (player) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (distance <= this.radius && !this.activated) {
        this.activate();
      }
    }
  }

  /**
   * Active le checkpoint
   */
  public activate(): void {
    if (this.activated) return;

    this.activated = true;
    this.drawCheckpoint();

    // Effet d'activation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
    });

    // Émettre un événement
    this.scene.events.emit('checkpoint:activated', {
      id: this.id,
      x: this.x,
      y: this.y,
      isRespawnPoint: this.isRespawnPoint,
    });

    console.log(`[Checkpoint] Activated: ${this.id}`);
  }

  /**
   * Vérifie si le checkpoint est activé
   */
  public isActivated(): boolean {
    return this.activated;
  }

  /**
   * Vérifie si c'est un point de respawn
   */
  public canRespawn(): boolean {
    return this.isRespawnPoint && this.activated;
  }

  /**
   * Retourne le rayon
   */
  public getRadius(): number {
    return this.radius;
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.graphic.destroy();
    this.glowEffect.destroy();
    super.destroy();
  }
}
