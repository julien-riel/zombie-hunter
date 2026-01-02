import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';

/**
 * Direction d'ouverture de la porte
 */
export type DoorDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Configuration d'une porte automatique
 */
export interface AutoDoorConfig {
  x: number;
  y: number;
  id?: string;
  width?: number;
  height?: number;
  openDirection?: DoorDirection;
  openDistance?: number;
  triggerRadius?: number;
  openSpeed?: number;
  closeDelay?: number;
  stayOpen?: boolean;
  requiresKey?: boolean;
  keyId?: string;
  blocksZombies?: boolean;
  blocksProjectiles?: boolean;
}

/**
 * Porte automatique
 * - S'ouvre quand le joueur s'approche
 * - Peut bloquer les zombies/projectiles selon config
 * - Animation d'ouverture/fermeture fluide
 * - Peut nécessiter une clé pour s'ouvrir
 */
export class AutoDoor extends Phaser.GameObjects.Container {
  declare public scene: GameScene;

  public readonly id: string;
  private doorWidth: number;
  private doorHeight: number;
  private openDirection: DoorDirection;
  private openDistance: number;
  private triggerRadius: number;
  private openSpeed: number;
  private closeDelay: number;
  private stayOpen: boolean;
  private requiresKey: boolean;
  private keyId: string | null;
  private blocksZombies: boolean;
  private blocksProjectiles: boolean;

  private graphic: Phaser.GameObjects.Graphics;
  private collider: Phaser.GameObjects.Rectangle;

  private isOpen: boolean = false;
  private isOpening: boolean = false;
  private isClosing: boolean = false;
  private openAmount: number = 0; // 0 = fermé, 1 = ouvert
  private closeTimer: number = 0;
  private hasKey: boolean = false;

  constructor(scene: GameScene, config: AutoDoorConfig) {
    super(scene, config.x, config.y);

    this.id = config.id || `autodoor_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    this.doorWidth = config.width ?? 64;
    this.doorHeight = config.height ?? 16;
    this.openDirection = config.openDirection ?? 'up';
    this.openDistance = config.openDistance ?? this.doorWidth;
    this.triggerRadius = config.triggerRadius ?? 80;
    this.openSpeed = config.openSpeed ?? 0.05;
    this.closeDelay = config.closeDelay ?? 1500;
    this.stayOpen = config.stayOpen ?? false;
    this.requiresKey = config.requiresKey ?? false;
    this.keyId = config.keyId ?? null;
    this.blocksZombies = config.blocksZombies ?? true;
    this.blocksProjectiles = config.blocksProjectiles ?? false;

    // Créer le graphique
    this.graphic = scene.add.graphics();
    this.add(this.graphic);

    // Créer le collider invisible pour la physique
    this.collider = scene.add.rectangle(0, 0, this.doorWidth, this.doorHeight, 0x000000, 0);
    scene.physics.add.existing(this.collider, true); // true = static body
    this.add(this.collider);

    this.drawDoor();

    // Ajouter à la scène
    scene.add.existing(this);
    this.setDepth(10);
  }

  /**
   * Dessine la porte
   */
  private drawDoor(): void {
    this.graphic.clear();

    // Position de la porte selon l'ouverture
    let offsetX = 0;
    let offsetY = 0;

    switch (this.openDirection) {
      case 'up':
        offsetY = -this.openAmount * this.openDistance;
        break;
      case 'down':
        offsetY = this.openAmount * this.openDistance;
        break;
      case 'left':
        offsetX = -this.openAmount * this.openDistance;
        break;
      case 'right':
        offsetX = this.openAmount * this.openDistance;
        break;
    }

    const halfW = this.doorWidth / 2;
    const halfH = this.doorHeight / 2;

    // Couleur selon l'état
    let color = 0x666666;
    if (this.requiresKey && !this.hasKey) {
      color = 0xaa4400; // Orange - verrouillé
    } else if (this.isOpen) {
      color = 0x44aa44; // Vert - ouvert
    }

    // Corps de la porte
    this.graphic.fillStyle(color, 0.9);
    this.graphic.fillRect(-halfW + offsetX, -halfH + offsetY, this.doorWidth, this.doorHeight);

    // Bordure
    this.graphic.lineStyle(2, 0x888888, 1);
    this.graphic.strokeRect(-halfW + offsetX, -halfH + offsetY, this.doorWidth, this.doorHeight);

    // Lignes de détail
    this.graphic.lineStyle(1, 0x444444, 0.5);
    const segments = 4;
    for (let i = 1; i < segments; i++) {
      const segX = -halfW + (this.doorWidth / segments) * i + offsetX;
      this.graphic.beginPath();
      this.graphic.moveTo(segX, -halfH + offsetY);
      this.graphic.lineTo(segX, halfH + offsetY);
      this.graphic.strokePath();
    }

    // Indicateur de verrouillage
    if (this.requiresKey && !this.hasKey) {
      this.graphic.fillStyle(0xff0000, 0.8);
      this.graphic.fillCircle(offsetX, offsetY, 6);
      // Icône cadenas simplifié
      this.graphic.lineStyle(2, 0xffff00, 1);
      this.graphic.strokeRect(offsetX - 4, offsetY - 2, 8, 6);
      this.graphic.beginPath();
      this.graphic.arc(offsetX, offsetY - 4, 4, Math.PI, 0);
      this.graphic.strokePath();
    }

    // Mettre à jour le collider (désactivé si ouvert)
    const body = this.collider.body as Phaser.Physics.Arcade.StaticBody;
    if (body) {
      if (this.openAmount >= 0.9) {
        body.enable = false;
      } else {
        body.enable = true;
        // Repositionner le collider
        this.collider.setPosition(offsetX, offsetY);
        body.updateFromGameObject();
      }
    }
  }

  /**
   * Met à jour la porte
   */
  public update(delta: number): void {
    const player = this.scene.player;
    if (!player) return;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const playerNear = distance <= this.triggerRadius;

    // Vérifier si on peut ouvrir
    const canOpen = !this.requiresKey || this.hasKey;

    // Logique d'ouverture/fermeture
    if (playerNear && canOpen && !this.isOpen && !this.isOpening) {
      this.startOpening();
    } else if (!playerNear && this.isOpen && !this.stayOpen && !this.isClosing) {
      // Délai avant fermeture
      this.closeTimer += delta;
      if (this.closeTimer >= this.closeDelay) {
        this.startClosing();
      }
    } else if (playerNear) {
      this.closeTimer = 0;
    }

    // Animation d'ouverture
    if (this.isOpening) {
      this.openAmount += this.openSpeed;
      if (this.openAmount >= 1) {
        this.openAmount = 1;
        this.isOpening = false;
        this.isOpen = true;

        this.scene.events.emit('autodoor:opened', {
          id: this.id,
          x: this.x,
          y: this.y,
        });
      }
      this.drawDoor();
    }

    // Animation de fermeture
    if (this.isClosing) {
      this.openAmount -= this.openSpeed;
      if (this.openAmount <= 0) {
        this.openAmount = 0;
        this.isClosing = false;
        this.isOpen = false;

        this.scene.events.emit('autodoor:closed', {
          id: this.id,
          x: this.x,
          y: this.y,
        });
      }
      this.drawDoor();
    }
  }

  /**
   * Commence l'ouverture
   */
  private startOpening(): void {
    if (this.isOpening) return;

    this.isOpening = true;
    this.isClosing = false;
    this.closeTimer = 0;

    this.scene.events.emit('autodoor:opening', {
      id: this.id,
      x: this.x,
      y: this.y,
    });
  }

  /**
   * Commence la fermeture
   */
  private startClosing(): void {
    if (this.isClosing) return;

    // Vérifier qu'aucune entité n'est dans la porte
    const player = this.scene.player;
    if (player) {
      const halfW = this.doorWidth / 2;
      const halfH = this.doorHeight / 2;
      if (
        player.x >= this.x - halfW &&
        player.x <= this.x + halfW &&
        player.y >= this.y - halfH &&
        player.y <= this.y + halfH
      ) {
        // Joueur dans la porte, reporter la fermeture
        this.closeTimer = 0;
        return;
      }
    }

    this.isClosing = true;
    this.isOpening = false;

    this.scene.events.emit('autodoor:closing', {
      id: this.id,
      x: this.x,
      y: this.y,
    });
  }

  /**
   * Déverrouille la porte avec une clé
   */
  public unlock(keyId?: string): boolean {
    if (!this.requiresKey) return true;

    if (this.keyId && keyId !== this.keyId) {
      // Mauvaise clé
      this.scene.events.emit('autodoor:wrongkey', {
        id: this.id,
        requiredKey: this.keyId,
        providedKey: keyId,
      });
      return false;
    }

    this.hasKey = true;
    this.drawDoor();

    this.scene.events.emit('autodoor:unlocked', {
      id: this.id,
      x: this.x,
      y: this.y,
    });

    return true;
  }

  /**
   * Force l'ouverture de la porte
   */
  public forceOpen(): void {
    if (this.requiresKey && !this.hasKey) {
      this.hasKey = true;
    }
    this.openAmount = 1;
    this.isOpen = true;
    this.isOpening = false;
    this.isClosing = false;
    this.drawDoor();
  }

  /**
   * Force la fermeture de la porte
   */
  public forceClose(): void {
    this.openAmount = 0;
    this.isOpen = false;
    this.isOpening = false;
    this.isClosing = false;
    this.drawDoor();
  }

  /**
   * Retourne le collider pour les collisions
   */
  public getCollider(): Phaser.GameObjects.Rectangle {
    return this.collider;
  }

  /**
   * Vérifie si la porte est ouverte
   */
  public isDoorOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Vérifie si la porte bloque les zombies
   */
  public doesBlockZombies(): boolean {
    return this.blocksZombies && !this.isOpen;
  }

  /**
   * Vérifie si la porte bloque les projectiles
   */
  public doesBlockProjectiles(): boolean {
    return this.blocksProjectiles && !this.isOpen;
  }

  /**
   * Retourne les dimensions
   */
  public getDimensions(): { width: number; height: number } {
    return { width: this.doorWidth, height: this.doorHeight };
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.graphic.destroy();
    this.collider.destroy();
    super.destroy();
  }
}
