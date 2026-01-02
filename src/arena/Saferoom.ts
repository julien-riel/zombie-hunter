import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';

/**
 * Configuration d'une saferoom
 */
export interface SaferoomConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  healOnEnter?: boolean;
  healAmount?: number;
  clearZombies?: boolean;
  clearRadius?: number;
}

/**
 * Zone de repos sécurisée
 * - Soigne le joueur à l'entrée
 * - Peut repousser/tuer les zombies proches
 * - Zone visuellement distincte
 */
export class Saferoom extends Phaser.GameObjects.Container {
  declare public scene: GameScene;

  private zoneWidth: number;
  private zoneHeight: number;
  private healOnEnter: boolean;
  private healAmount: number;
  private clearZombies: boolean;
  private clearRadius: number;

  private graphic: Phaser.GameObjects.Graphics;
  private playerInside: boolean = false;
  private healCooldown: number = 0;
  private readonly HEAL_INTERVAL = 1000; // Heal every second while inside

  constructor(scene: GameScene, config: SaferoomConfig) {
    super(scene, config.x, config.y);

    this.zoneWidth = config.width ?? 128;
    this.zoneHeight = config.height ?? 128;
    this.healOnEnter = config.healOnEnter ?? true;
    this.healAmount = config.healAmount ?? 25;
    this.clearZombies = config.clearZombies ?? true;
    this.clearRadius = config.clearRadius ?? 150;

    // Créer le graphique
    this.graphic = scene.add.graphics();
    this.add(this.graphic);

    this.drawSaferoom();

    // Ajouter à la scène
    scene.add.existing(this);
    this.setDepth(-0.5); // Juste au-dessus du sol
  }

  /**
   * Dessine la saferoom
   */
  private drawSaferoom(): void {
    this.graphic.clear();

    const halfW = this.zoneWidth / 2;
    const halfH = this.zoneHeight / 2;

    // Fond vert translucide
    this.graphic.fillStyle(0x00aa00, 0.15);
    this.graphic.fillRect(-halfW, -halfH, this.zoneWidth, this.zoneHeight);

    // Bordure
    this.graphic.lineStyle(3, 0x00ff00, 0.6);
    this.graphic.strokeRect(-halfW, -halfH, this.zoneWidth, this.zoneHeight);

    // Croix de santé au centre
    const crossSize = 20;
    this.graphic.fillStyle(0x00ff00, 0.8);
    this.graphic.fillRect(-crossSize / 4, -crossSize, crossSize / 2, crossSize * 2);
    this.graphic.fillRect(-crossSize, -crossSize / 4, crossSize * 2, crossSize / 2);

    // Coins décoratifs
    const cornerSize = 15;
    this.graphic.lineStyle(2, 0x00ff00, 0.8);

    // Coin NW
    this.graphic.beginPath();
    this.graphic.moveTo(-halfW, -halfH + cornerSize);
    this.graphic.lineTo(-halfW, -halfH);
    this.graphic.lineTo(-halfW + cornerSize, -halfH);
    this.graphic.strokePath();

    // Coin NE
    this.graphic.beginPath();
    this.graphic.moveTo(halfW - cornerSize, -halfH);
    this.graphic.lineTo(halfW, -halfH);
    this.graphic.lineTo(halfW, -halfH + cornerSize);
    this.graphic.strokePath();

    // Coin SW
    this.graphic.beginPath();
    this.graphic.moveTo(-halfW, halfH - cornerSize);
    this.graphic.lineTo(-halfW, halfH);
    this.graphic.lineTo(-halfW + cornerSize, halfH);
    this.graphic.strokePath();

    // Coin SE
    this.graphic.beginPath();
    this.graphic.moveTo(halfW - cornerSize, halfH);
    this.graphic.lineTo(halfW, halfH);
    this.graphic.lineTo(halfW, halfH - cornerSize);
    this.graphic.strokePath();
  }

  /**
   * Met à jour la saferoom
   */
  public update(delta: number): void {
    const player = this.scene.player;
    if (!player) return;

    const wasInside = this.playerInside;
    this.playerInside = this.isPointInside(player.x, player.y);

    // Le joueur vient d'entrer
    if (this.playerInside && !wasInside) {
      this.onPlayerEnter();
    }

    // Heal continu pendant que le joueur est à l'intérieur
    if (this.playerInside && this.healOnEnter) {
      this.healCooldown -= delta;
      if (this.healCooldown <= 0) {
        this.healCooldown = this.HEAL_INTERVAL;
        this.healPlayer();
      }
    }

    // Repousser les zombies
    if (this.clearZombies) {
      this.pushBackZombies();
    }
  }

  /**
   * Vérifie si un point est dans la zone
   */
  private isPointInside(px: number, py: number): boolean {
    const halfW = this.zoneWidth / 2;
    const halfH = this.zoneHeight / 2;

    return (
      px >= this.x - halfW &&
      px <= this.x + halfW &&
      py >= this.y - halfH &&
      py <= this.y + halfH
    );
  }

  /**
   * Appelé quand le joueur entre dans la zone
   */
  private onPlayerEnter(): void {
    // Effet visuel d'entrée
    this.scene.tweens.add({
      targets: this.graphic,
      alpha: 0.5,
      duration: 200,
      yoyo: true,
    });

    // Heal initial
    if (this.healOnEnter) {
      this.healPlayer();
    }

    // Émettre un événement
    this.scene.events.emit('saferoom:enter', { x: this.x, y: this.y });
  }

  /**
   * Soigne le joueur
   */
  private healPlayer(): void {
    const player = this.scene.player;
    if (!player) return;

    const currentHealth = player.getHealth();
    const maxHealth = player.getMaxHealth();

    if (currentHealth < maxHealth) {
      player.heal(this.healAmount);

      // Effet visuel de soin
      const healEffect = this.scene.add.circle(player.x, player.y, 20, 0x00ff00, 0.5);
      healEffect.setDepth(100);

      this.scene.tweens.add({
        targets: healEffect,
        scale: 2,
        alpha: 0,
        duration: 500,
        onComplete: () => healEffect.destroy(),
      });
    }
  }

  /**
   * Repousse les zombies hors de la zone
   */
  private pushBackZombies(): void {
    const zombies = this.scene.getActiveZombies();

    for (const zombie of zombies) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, zombie.x, zombie.y);

      if (distance < this.clearRadius) {
        // Calculer la direction de répulsion
        const angle = Phaser.Math.Angle.Between(this.x, this.y, zombie.x, zombie.y);
        const pushForce = (this.clearRadius - distance) * 2;

        // Appliquer une force de répulsion
        const body = zombie.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.velocity.x += Math.cos(angle) * pushForce;
          body.velocity.y += Math.sin(angle) * pushForce;
        }
      }
    }
  }

  /**
   * Vérifie si le joueur est à l'intérieur
   */
  public isPlayerInside(): boolean {
    return this.playerInside;
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.graphic.destroy();
    super.destroy();
  }
}
