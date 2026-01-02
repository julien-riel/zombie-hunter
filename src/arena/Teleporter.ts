import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';

/**
 * Configuration d'un téléporteur
 */
export interface TeleporterConfig {
  x: number;
  y: number;
  id?: string;
  linkedTeleporterId?: string;
  radius?: number;
  cooldown?: number;
  bidirectional?: boolean;
}

/**
 * Système de téléportation bidirectionnel
 * - Téléporte le joueur vers un autre téléporteur lié
 * - Cooldown pour éviter les téléportations en boucle
 * - Effet visuel de portail
 */
export class Teleporter extends Phaser.GameObjects.Container {
  declare public scene: GameScene;

  public readonly id: string;
  private linkedTeleporterId: string | null;
  private radius: number;
  private cooldownTime: number;
  private bidirectional: boolean;

  private linkedTeleporter: Teleporter | null = null;
  private currentCooldown: number = 0;
  private isActive: boolean = true;

  private graphic: Phaser.GameObjects.Graphics;
  private portalEffect: Phaser.GameObjects.Graphics;
  private rotationAngle: number = 0;

  constructor(scene: GameScene, config: TeleporterConfig) {
    super(scene, config.x, config.y);

    this.id = config.id || `teleporter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.linkedTeleporterId = config.linkedTeleporterId || null;
    this.radius = config.radius ?? 32;
    this.cooldownTime = config.cooldown ?? 2000;
    this.bidirectional = config.bidirectional ?? true;

    // Créer les graphiques
    this.portalEffect = scene.add.graphics();
    this.add(this.portalEffect);

    this.graphic = scene.add.graphics();
    this.add(this.graphic);

    this.drawTeleporter();

    // Ajouter à la scène
    scene.add.existing(this);
    this.setDepth(5);
  }

  /**
   * Lie ce téléporteur à un autre
   */
  public linkTo(teleporter: Teleporter): void {
    this.linkedTeleporter = teleporter;

    // Si bidirectionnel, lier l'autre aussi
    if (this.bidirectional && teleporter.linkedTeleporter !== this) {
      teleporter.linkTo(this);
    }
  }

  /**
   * Dessine le téléporteur
   */
  private drawTeleporter(): void {
    this.graphic.clear();

    const color = this.isActive ? 0x8844ff : 0x444444;
    const alpha = this.isActive ? 1 : 0.5;

    // Cercle extérieur
    this.graphic.lineStyle(3, color, alpha);
    this.graphic.strokeCircle(0, 0, this.radius);

    // Cercle intérieur
    this.graphic.lineStyle(2, color, alpha * 0.7);
    this.graphic.strokeCircle(0, 0, this.radius * 0.7);

    // Centre avec effet de spirale
    this.graphic.fillStyle(color, alpha * 0.3);
    this.graphic.fillCircle(0, 0, this.radius * 0.5);
  }

  /**
   * Dessine l'effet de portail animé
   */
  private drawPortalEffect(): void {
    if (!this.isActive) return;

    this.portalEffect.clear();

    // Spirale animée
    const spiralSegments = 3;
    for (let i = 0; i < spiralSegments; i++) {
      const baseAngle = this.rotationAngle + (i * Math.PI * 2) / spiralSegments;

      this.portalEffect.lineStyle(2, 0xaa66ff, 0.6);
      this.portalEffect.beginPath();

      for (let t = 0; t < 1; t += 0.05) {
        const r = this.radius * 0.3 + t * this.radius * 0.5;
        const angle = baseAngle + t * Math.PI;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        if (t === 0) {
          this.portalEffect.moveTo(x, y);
        } else {
          this.portalEffect.lineTo(x, y);
        }
      }

      this.portalEffect.strokePath();
    }

    // Particules centrales
    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
      const angle = this.rotationAngle * 2 + (i * Math.PI * 2) / particleCount;
      const dist = Math.sin(this.rotationAngle * 3 + i) * this.radius * 0.3 + this.radius * 0.2;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;

      this.portalEffect.fillStyle(0xcc88ff, 0.8);
      this.portalEffect.fillCircle(x, y, 3);
    }
  }

  /**
   * Met à jour le téléporteur
   */
  public update(delta: number): void {
    // Animation de rotation
    this.rotationAngle += 0.02;
    this.drawPortalEffect();

    // Gérer le cooldown
    if (this.currentCooldown > 0) {
      this.currentCooldown -= delta;
      if (this.currentCooldown <= 0) {
        this.currentCooldown = 0;
        this.isActive = true;
        this.drawTeleporter();
      }
      return;
    }

    // Vérifier si le joueur est dans la zone
    const player = this.scene.player;
    if (player && this.linkedTeleporter && this.isActive) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

      if (distance <= this.radius * 0.7) {
        this.teleportPlayer();
      }
    }
  }

  /**
   * Téléporte le joueur
   */
  private teleportPlayer(): void {
    if (!this.linkedTeleporter || !this.isActive) return;

    const player = this.scene.player;
    if (!player) return;

    // Effet de départ
    this.createTeleportEffect(this.x, this.y);

    // Téléporter le joueur
    player.setPosition(this.linkedTeleporter.x, this.linkedTeleporter.y);

    // Effet d'arrivée
    this.createTeleportEffect(this.linkedTeleporter.x, this.linkedTeleporter.y);

    // Mettre en cooldown les deux téléporteurs
    this.startCooldown();
    this.linkedTeleporter.startCooldown();

    // Émettre un événement
    this.scene.events.emit('teleporter:used', {
      fromId: this.id,
      toId: this.linkedTeleporter.id,
      fromX: this.x,
      fromY: this.y,
      toX: this.linkedTeleporter.x,
      toY: this.linkedTeleporter.y,
    });

    console.log(`[Teleporter] Player teleported from ${this.id} to ${this.linkedTeleporter.id}`);
  }

  /**
   * Crée un effet visuel de téléportation
   */
  private createTeleportEffect(x: number, y: number): void {
    // Flash de lumière
    const flash = this.scene.add.circle(x, y, this.radius, 0xaa66ff, 0.8);
    flash.setDepth(100);

    this.scene.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // Particules
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const particle = this.scene.add.circle(
        x + Math.cos(angle) * 10,
        y + Math.sin(angle) * 10,
        4,
        0xcc88ff,
        1
      );
      particle.setDepth(100);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 60,
        y: y + Math.sin(angle) * 60,
        alpha: 0,
        scale: 0.5,
        duration: 400,
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Démarre le cooldown
   */
  public startCooldown(): void {
    this.currentCooldown = this.cooldownTime;
    this.isActive = false;
    this.drawTeleporter();
  }

  /**
   * Retourne l'ID du téléporteur lié
   */
  public getLinkedTeleporterId(): string | null {
    return this.linkedTeleporterId;
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
    this.portalEffect.destroy();
    super.destroy();
  }
}
