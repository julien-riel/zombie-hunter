import Phaser from 'phaser';
import { TILE_SIZE } from '@config/constants';
import type { GameScene } from '@scenes/GameScene';

/**
 * États possibles d'une porte
 */
export enum DoorState {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  OPEN = 'open',
}

/**
 * Configuration d'une porte
 */
export interface DoorConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  side: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Classe représentant une porte de spawn
 * Les zombies émergent des portes actives
 */
export class Door extends Phaser.GameObjects.Container {
  public scene: GameScene;
  public state: DoorState = DoorState.INACTIVE;
  public side: 'top' | 'bottom' | 'left' | 'right';

  private doorFrame: Phaser.GameObjects.Rectangle;
  private doorGlow: Phaser.GameObjects.Rectangle;
  private pulseTween: Phaser.Tweens.Tween | null = null;

  private readonly doorWidth: number;
  private readonly doorHeight: number;

  constructor(scene: GameScene, config: DoorConfig) {
    super(scene, config.x, config.y);

    this.scene = scene;
    this.side = config.side;

    // Dimensions de la porte
    if (config.side === 'top' || config.side === 'bottom') {
      this.doorWidth = config.width || TILE_SIZE * 2;
      this.doorHeight = config.height || TILE_SIZE;
    } else {
      this.doorWidth = config.width || TILE_SIZE;
      this.doorHeight = config.height || TILE_SIZE * 2;
    }

    // Créer le cadre de la porte (fond sombre)
    this.doorFrame = scene.add.rectangle(0, 0, this.doorWidth, this.doorHeight, 0x2c3e50);
    this.doorFrame.setStrokeStyle(2, 0x1a252f);
    this.add(this.doorFrame);

    // Créer le glow (lueur rouge pour l'animation)
    this.doorGlow = scene.add.rectangle(0, 0, this.doorWidth - 4, this.doorHeight - 4, 0xe74c3c, 0);
    this.add(this.doorGlow);

    // Ajouter au monde
    scene.add.existing(this);

    // Profondeur pour être sous le joueur mais au-dessus du sol
    this.setDepth(0);
  }

  /**
   * Active la porte - elle commence à pulser et peut spawner des zombies
   */
  public activate(): void {
    if (this.state === DoorState.ACTIVE) return;

    this.state = DoorState.ACTIVE;
    this.startPulseAnimation();

    // Émettre un événement pour notifier le système
    this.scene.events.emit('doorActivated', this);
  }

  /**
   * Désactive la porte
   */
  public deactivate(): void {
    if (this.state === DoorState.INACTIVE) return;

    this.state = DoorState.INACTIVE;
    this.stopPulseAnimation();
    this.doorGlow.setAlpha(0);

    this.scene.events.emit('doorDeactivated', this);
  }

  /**
   * Ouvre la porte (pour le spawn)
   */
  public open(): void {
    if (this.state !== DoorState.ACTIVE) return;

    this.state = DoorState.OPEN;

    // Animation d'ouverture
    this.scene.tweens.add({
      targets: this.doorGlow,
      alpha: 0.8,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.state = DoorState.ACTIVE;
      },
    });
  }

  /**
   * Démarre l'animation de pulsation
   */
  private startPulseAnimation(): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
    }

    this.pulseTween = this.scene.tweens.add({
      targets: this.doorGlow,
      alpha: { from: 0.2, to: 0.6 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Arrête l'animation de pulsation
   */
  private stopPulseAnimation(): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
  }

  /**
   * Récupère la position de spawn (légèrement à l'intérieur de l'arène)
   */
  public getSpawnPosition(): { x: number; y: number } {
    const offset = TILE_SIZE;

    switch (this.side) {
      case 'top':
        return { x: this.x, y: this.y + offset };
      case 'bottom':
        return { x: this.x, y: this.y - offset };
      case 'left':
        return { x: this.x + offset, y: this.y };
      case 'right':
        return { x: this.x - offset, y: this.y };
    }
  }

  /**
   * Vérifie si la porte est active
   */
  public isActive(): boolean {
    return this.state === DoorState.ACTIVE;
  }

  /**
   * Nettoie la porte
   */
  public destroy(fromScene?: boolean): void {
    this.stopPulseAnimation();
    super.destroy(fromScene);
  }
}
