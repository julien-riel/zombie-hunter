import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';

/**
 * Types d'objectifs possibles
 */
export type ObjectiveType = 'defend' | 'collect' | 'reach' | 'eliminate' | 'escort' | 'activate';

/**
 * Configuration d'un marqueur d'objectif
 */
export interface ObjectiveMarkerConfig {
  x: number;
  y: number;
  objectiveId?: string;
  type?: ObjectiveType;
  label?: string;
  radius?: number;
  color?: number;
  showOnMinimap?: boolean;
  pulseEffect?: boolean;
  arrowIndicator?: boolean;
}

/**
 * Marqueur visuel d'objectif
 * - Indique visuellement les objectifs sur la carte
 * - Peut afficher une flèche directionnelle quand hors écran
 * - Animation de pulsation pour attirer l'attention
 * - Différentes couleurs selon le type d'objectif
 */
export class ObjectiveMarker extends Phaser.GameObjects.Container {
  declare public scene: GameScene;

  public readonly objectiveId: string;
  private objectiveType: ObjectiveType;
  private label: string;
  private radius: number;
  private color: number;
  private pulseEffect: boolean;
  private arrowIndicator: boolean;

  private graphic: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text | null = null;
  private arrowGraphic: Phaser.GameObjects.Graphics | null = null;
  private pulseTime: number = 0;
  private isCompleted: boolean = false;
  private isActive: boolean = true;

  // Couleurs par défaut selon le type
  private static readonly TYPE_COLORS: Record<ObjectiveType, number> = {
    defend: 0xff6600, // Orange
    collect: 0xffff00, // Jaune
    reach: 0x00ff00, // Vert
    eliminate: 0xff0000, // Rouge
    escort: 0x00ffff, // Cyan
    activate: 0xff00ff, // Magenta
  };

  constructor(scene: GameScene, config: ObjectiveMarkerConfig) {
    super(scene, config.x, config.y);

    this.objectiveId =
      config.objectiveId || `objective_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    this.objectiveType = config.type ?? 'reach';
    this.label = config.label ?? '';
    this.radius = config.radius ?? 40;
    this.color = config.color ?? ObjectiveMarker.TYPE_COLORS[this.objectiveType];
    // showOnMinimap reserved for future minimap integration
    this.pulseEffect = config.pulseEffect ?? true;
    this.arrowIndicator = config.arrowIndicator ?? true;

    // Créer les graphiques
    this.graphic = scene.add.graphics();
    this.add(this.graphic);

    // Créer le label si défini
    if (this.label) {
      this.labelText = scene.add.text(0, -this.radius - 20, this.label, {
        fontSize: '14px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center',
      });
      this.labelText.setOrigin(0.5, 0.5);
      this.add(this.labelText);
    }

    // Créer la flèche directionnelle (ne fait pas partie du container car position absolue)
    if (this.arrowIndicator) {
      this.arrowGraphic = scene.add.graphics();
      this.arrowGraphic.setDepth(1000); // Toujours visible au-dessus
    }

    this.drawMarker();

    // Ajouter à la scène
    scene.add.existing(this);
    this.setDepth(10);
  }

  /**
   * Dessine le marqueur
   */
  private drawMarker(): void {
    this.graphic.clear();

    if (this.isCompleted) {
      // Marqueur complété - gris avec coche
      this.drawCompletedMarker();
      return;
    }

    if (!this.isActive) {
      // Marqueur inactif - semi-transparent
      this.graphic.fillStyle(0x888888, 0.3);
      this.graphic.fillCircle(0, 0, this.radius);
      return;
    }

    const alpha = 0.6;

    // Cercle extérieur
    this.graphic.lineStyle(3, this.color, alpha);
    this.graphic.strokeCircle(0, 0, this.radius);

    // Cercle intérieur
    this.graphic.lineStyle(2, this.color, alpha * 0.7);
    this.graphic.strokeCircle(0, 0, this.radius * 0.6);

    // Centre - icône selon le type
    this.drawTypeIcon();
  }

  /**
   * Dessine l'icône selon le type d'objectif
   */
  private drawTypeIcon(): void {
    this.graphic.fillStyle(this.color, 0.8);

    switch (this.objectiveType) {
      case 'defend':
        // Bouclier
        this.drawShieldIcon();
        break;
      case 'collect':
        // Étoile
        this.drawStarIcon();
        break;
      case 'reach':
        // Drapeau
        this.drawFlagIcon();
        break;
      case 'eliminate':
        // Crâne simplifié (cercle avec X)
        this.drawSkullIcon();
        break;
      case 'escort':
        // Personnage simplifié
        this.drawPersonIcon();
        break;
      case 'activate':
        // Éclair
        this.drawLightningIcon();
        break;
    }
  }

  private drawShieldIcon(): void {
    const size = 12;
    this.graphic.beginPath();
    this.graphic.moveTo(0, -size);
    this.graphic.lineTo(size, -size * 0.5);
    this.graphic.lineTo(size, size * 0.3);
    this.graphic.lineTo(0, size);
    this.graphic.lineTo(-size, size * 0.3);
    this.graphic.lineTo(-size, -size * 0.5);
    this.graphic.closePath();
    this.graphic.fillPath();
  }

  private drawStarIcon(): void {
    const outerRadius = 12;
    const innerRadius = 5;
    const points = 5;

    this.graphic.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        this.graphic.moveTo(x, y);
      } else {
        this.graphic.lineTo(x, y);
      }
    }
    this.graphic.closePath();
    this.graphic.fillPath();
  }

  private drawFlagIcon(): void {
    // Mât
    this.graphic.lineStyle(2, this.color, 1);
    this.graphic.beginPath();
    this.graphic.moveTo(-5, -12);
    this.graphic.lineTo(-5, 12);
    this.graphic.strokePath();

    // Drapeau
    this.graphic.fillStyle(this.color, 1);
    this.graphic.fillTriangle(-3, -12, -3, 0, 12, -6);
  }

  private drawSkullIcon(): void {
    // Cercle
    this.graphic.fillCircle(0, 0, 10);
    // X
    this.graphic.lineStyle(3, 0x000000, 1);
    this.graphic.beginPath();
    this.graphic.moveTo(-5, -5);
    this.graphic.lineTo(5, 5);
    this.graphic.moveTo(5, -5);
    this.graphic.lineTo(-5, 5);
    this.graphic.strokePath();
  }

  private drawPersonIcon(): void {
    // Tête
    this.graphic.fillCircle(0, -8, 5);
    // Corps
    this.graphic.lineStyle(3, this.color, 1);
    this.graphic.beginPath();
    this.graphic.moveTo(0, -3);
    this.graphic.lineTo(0, 5);
    this.graphic.strokePath();
    // Bras
    this.graphic.beginPath();
    this.graphic.moveTo(-7, 0);
    this.graphic.lineTo(7, 0);
    this.graphic.strokePath();
    // Jambes
    this.graphic.beginPath();
    this.graphic.moveTo(0, 5);
    this.graphic.lineTo(-5, 12);
    this.graphic.moveTo(0, 5);
    this.graphic.lineTo(5, 12);
    this.graphic.strokePath();
  }

  private drawLightningIcon(): void {
    this.graphic.beginPath();
    this.graphic.moveTo(4, -12);
    this.graphic.lineTo(-2, -2);
    this.graphic.lineTo(4, -2);
    this.graphic.lineTo(-4, 12);
    this.graphic.lineTo(2, 2);
    this.graphic.lineTo(-4, 2);
    this.graphic.closePath();
    this.graphic.fillPath();
  }

  /**
   * Dessine le marqueur complété
   */
  private drawCompletedMarker(): void {
    // Cercle gris
    this.graphic.fillStyle(0x00ff00, 0.3);
    this.graphic.fillCircle(0, 0, this.radius * 0.8);

    // Coche
    this.graphic.lineStyle(4, 0x00ff00, 1);
    this.graphic.beginPath();
    this.graphic.moveTo(-10, 0);
    this.graphic.lineTo(-3, 8);
    this.graphic.lineTo(12, -8);
    this.graphic.strokePath();
  }

  /**
   * Met à jour le marqueur
   */
  public update(): void {
    if (this.isCompleted) return;

    // Animation de pulsation
    if (this.pulseEffect && this.isActive) {
      this.pulseTime += 0.05;
      const pulse = Math.sin(this.pulseTime) * 0.15 + 1;
      this.setScale(pulse);
    }

    // Mettre à jour la flèche directionnelle
    if (this.arrowIndicator && this.arrowGraphic) {
      this.updateArrowIndicator();
    }
  }

  /**
   * Met à jour la flèche directionnelle quand le marqueur est hors écran
   */
  private updateArrowIndicator(): void {
    if (!this.arrowGraphic) return;

    const camera = this.scene.cameras.main;
    const screenX = this.x - camera.scrollX;
    const screenY = this.y - camera.scrollY;

    const margin = 50;
    const isOnScreen =
      screenX >= margin &&
      screenX <= camera.width - margin &&
      screenY >= margin &&
      screenY <= camera.height - margin;

    if (isOnScreen || this.isCompleted || !this.isActive) {
      this.arrowGraphic.clear();
      return;
    }

    // Calculer la position de la flèche sur le bord de l'écran
    const centerX = camera.width / 2;
    const centerY = camera.height / 2;
    const angle = Math.atan2(screenY - centerY, screenX - centerX);

    // Position sur le bord
    let arrowX = centerX + Math.cos(angle) * (camera.width / 2 - margin);
    let arrowY = centerY + Math.sin(angle) * (camera.height / 2 - margin);

    // Contraindre aux bords
    arrowX = Phaser.Math.Clamp(arrowX, margin, camera.width - margin);
    arrowY = Phaser.Math.Clamp(arrowY, margin, camera.height - margin);

    // Dessiner la flèche
    this.arrowGraphic.clear();
    this.arrowGraphic.setPosition(camera.scrollX, camera.scrollY);

    // Triangle pointant vers l'objectif
    const arrowSize = 15;
    this.arrowGraphic.fillStyle(this.color, 0.9);
    this.arrowGraphic.lineStyle(2, 0xffffff, 0.8);

    const x1 = arrowX + Math.cos(angle) * arrowSize;
    const y1 = arrowY + Math.sin(angle) * arrowSize;
    const x2 = arrowX + Math.cos(angle + (2.5 * Math.PI) / 3) * arrowSize;
    const y2 = arrowY + Math.sin(angle + (2.5 * Math.PI) / 3) * arrowSize;
    const x3 = arrowX + Math.cos(angle - (2.5 * Math.PI) / 3) * arrowSize;
    const y3 = arrowY + Math.sin(angle - (2.5 * Math.PI) / 3) * arrowSize;

    this.arrowGraphic.fillTriangle(x1, y1, x2, y2, x3, y3);
    this.arrowGraphic.strokeTriangle(x1, y1, x2, y2, x3, y3);

    // Distance indicator could be added here with a separate Text object
  }

  /**
   * Marque l'objectif comme complété
   */
  public complete(): void {
    if (this.isCompleted) return;

    this.isCompleted = true;
    this.drawMarker();

    // Effet de complétion
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.setVisible(false);
      },
    });

    // Émettre un événement
    this.scene.events.emit('objective:completed', {
      objectiveId: this.objectiveId,
      type: this.objectiveType,
      x: this.x,
      y: this.y,
    });

    // Nettoyer la flèche
    if (this.arrowGraphic) {
      this.arrowGraphic.clear();
    }

  }

  /**
   * Active le marqueur
   */
  public activate(): void {
    this.isActive = true;
    this.drawMarker();

    this.scene.events.emit('objective:activated', {
      objectiveId: this.objectiveId,
      type: this.objectiveType,
      x: this.x,
      y: this.y,
    });
  }

  /**
   * Désactive le marqueur
   */
  public deactivate(): void {
    this.isActive = false;
    this.drawMarker();

    if (this.arrowGraphic) {
      this.arrowGraphic.clear();
    }
  }

  /**
   * Change la couleur du marqueur
   */
  public setColor(color: number): void {
    this.color = color;
    this.drawMarker();
  }

  /**
   * Retourne le type d'objectif
   */
  public getType(): ObjectiveType {
    return this.objectiveType;
  }

  /**
   * Vérifie si l'objectif est complété
   */
  public isObjectiveCompleted(): boolean {
    return this.isCompleted;
  }

  /**
   * Vérifie si l'objectif est actif
   */
  public isObjectiveActive(): boolean {
    return this.isActive;
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
    if (this.labelText) {
      this.labelText.destroy();
    }
    if (this.arrowGraphic) {
      this.arrowGraphic.destroy();
    }
    super.destroy();
  }
}
