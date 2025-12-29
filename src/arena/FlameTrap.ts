import Phaser from 'phaser';
import { Interactive, InteractiveType, TriggerType, type InteractiveConfig } from './Interactive';
import { FireZone } from './FireZone';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';

/**
 * Direction du jet de flamme
 */
export enum FlameDirection {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

/**
 * Configuration spécifique pour un piège à flamme
 */
export interface FlameTrapConfig extends InteractiveConfig {
  direction?: FlameDirection;
  flameLength?: number;
  flameDuration?: number;
  damagePerSecond?: number;
  linkedSwitchId?: string;
}

/**
 * Piège à flamme
 * - Activé par interrupteur
 * - Jet de flamme dans une direction pendant X secondes
 * - Crée une ligne de FireZone temporaire
 * - Dégâts importants (30 DPS)
 */
export class FlameTrap extends Interactive {
  /** Direction du jet de flamme */
  private direction: FlameDirection;
  /** Longueur du jet en pixels */
  private flameLength: number;
  /** Durée d'activation en ms */
  private flameDuration: number;
  /** Dégâts par seconde */
  private damagePerSecond: number;
  /** ID de l'interrupteur lié */
  private linkedSwitchId: string | null;

  /** État d'activation */
  private isFiring: boolean = false;
  /** Timer de fin */
  private fireEndTime: number = 0;

  /** Zones de feu créées */
  private fireZones: FireZone[] = [];
  /** Graphics pour le jet de flamme */
  private flameGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: GameScene, config: FlameTrapConfig) {
    super(scene, InteractiveType.FLAME_TRAP, {
      ...config,
      triggerType: TriggerType.ON_SWITCH,
      charges: -1,
    });

    const balanceConfig = BALANCE.interactive?.flameTrap ?? {
      health: Infinity,
      cooldown: 10000,
      flameLength: 150,
      flameDuration: 3000,
      damagePerSecond: 30,
    };

    this.direction = config.direction ?? FlameDirection.UP;
    this.flameLength = config.flameLength ?? balanceConfig.flameLength ?? 150;
    this.flameDuration = config.flameDuration ?? balanceConfig.flameDuration ?? 3000;
    this.damagePerSecond = config.damagePerSecond ?? balanceConfig.damagePerSecond ?? 30;
    this.linkedSwitchId = config.linkedSwitchId ?? null;

    // Dessiner le sprite après initialisation
    this.drawSprite();

    // Écouter les événements de switch
    scene.events.on('switch:activated', this.handleSwitchActivation, this);
  }

  /**
   * Retourne la configuration de balance
   */
  protected getBalanceConfig(): {
    health?: number;
    cooldown?: number;
    charges?: number;
  } {
    return BALANCE.interactive?.flameTrap ?? {
      health: Infinity,
      cooldown: 10000,
    };
  }

  /**
   * Dessine le piège à flamme
   */
  protected drawSprite(): void {
    this.sprite.clear();

    const w = this.interactiveWidth;
    const h = this.interactiveHeight;
    const halfW = w / 2;
    const halfH = h / 2;

    // Base du piège (métal)
    this.sprite.fillStyle(0x555555);
    this.sprite.fillRoundedRect(-halfW, -halfH, w, h, 4);

    // Grille de sortie de flamme (noire)
    this.sprite.fillStyle(0x222222);
    const gridOffset = this.getGridOffset();
    this.sprite.fillRoundedRect(
      gridOffset.x - 6,
      gridOffset.y - 6,
      12,
      12,
      2
    );

    // Trous de la grille
    this.sprite.fillStyle(0x111111);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.sprite.fillCircle(
          gridOffset.x - 4 + i * 4,
          gridOffset.y - 4 + j * 4,
          1
        );
      }
    }

    // Indicateur de direction (flèche)
    const arrowColor = this.isFiring ? 0xff4500 : 0x666666;
    this.sprite.fillStyle(arrowColor);
    this.drawDirectionArrow();

    // Contour
    this.sprite.lineStyle(2, 0x333333);
    this.sprite.strokeRoundedRect(-halfW, -halfH, w, h, 4);

    // Effet de chaleur si actif
    if (this.isFiring) {
      this.sprite.fillStyle(0xff4500, 0.3);
      this.sprite.fillCircle(gridOffset.x, gridOffset.y, 8);
    }
  }

  /**
   * Retourne l'offset de la grille selon la direction
   */
  private getGridOffset(): { x: number; y: number } {
    const offset = this.interactiveWidth / 2 - 8;
    switch (this.direction) {
      case FlameDirection.UP:
        return { x: 0, y: -offset };
      case FlameDirection.DOWN:
        return { x: 0, y: offset };
      case FlameDirection.LEFT:
        return { x: -offset, y: 0 };
      case FlameDirection.RIGHT:
        return { x: offset, y: 0 };
    }
  }

  /**
   * Dessine la flèche directionnelle
   */
  private drawDirectionArrow(): void {
    const size = 6;
    const centerOffset = 4;

    switch (this.direction) {
      case FlameDirection.UP:
        this.sprite.fillTriangle(0, -centerOffset - size, -size, -centerOffset, size, -centerOffset);
        break;
      case FlameDirection.DOWN:
        this.sprite.fillTriangle(0, centerOffset + size, -size, centerOffset, size, centerOffset);
        break;
      case FlameDirection.LEFT:
        this.sprite.fillTriangle(-centerOffset - size, 0, -centerOffset, -size, -centerOffset, size);
        break;
      case FlameDirection.RIGHT:
        this.sprite.fillTriangle(centerOffset + size, 0, centerOffset, -size, centerOffset, size);
        break;
    }
  }

  /**
   * Gère l'événement d'activation de switch
   */
  private handleSwitchActivation(event: { switchId: string; isOn: boolean }): void {
    if (this.linkedSwitchId && event.switchId === this.linkedSwitchId && event.isOn) {
      this.trigger(`switch:${event.switchId}`);
    }
  }

  /**
   * Exécute l'effet du piège
   */
  protected executeEffect(): void {
    if (this.isFiring) return;

    this.isFiring = true;
    this.fireEndTime = this.scene.time.now + this.flameDuration;

    // Créer le jet de flamme
    this.createFlameJet();

    // Redessiner avec l'état actif
    this.drawSprite();
  }

  /**
   * Crée le jet de flamme
   */
  private createFlameJet(): void {
    // Direction en radians
    const dirVector = this.getDirectionVector();

    // Créer plusieurs zones de feu le long du jet
    const zoneCount = Math.ceil(this.flameLength / 40);
    const zoneSpacing = this.flameLength / zoneCount;

    for (let i = 0; i < zoneCount; i++) {
      const distance = zoneSpacing * (i + 0.5);
      const zoneX = this.x + dirVector.x * distance;
      const zoneY = this.y + dirVector.y * distance;

      const fireZone = new FireZone(this.scene, {
        x: zoneX,
        y: zoneY,
        radius: 20,
        damage: this.damagePerSecond,
        duration: this.flameDuration,
      });

      this.fireZones.push(fireZone);

      // Ajouter à l'arena
      const arena = (this.scene as GameScene & { arena: { addTerrainZone(zone: FireZone): void } }).arena;
      if (arena?.addTerrainZone) {
        arena.addTerrainZone(fireZone);
      }
    }

    // Créer les graphics pour le jet de flamme
    this.createFlameVisuals();
  }

  /**
   * Retourne le vecteur de direction
   */
  private getDirectionVector(): { x: number; y: number } {
    switch (this.direction) {
      case FlameDirection.UP:
        return { x: 0, y: -1 };
      case FlameDirection.DOWN:
        return { x: 0, y: 1 };
      case FlameDirection.LEFT:
        return { x: -1, y: 0 };
      case FlameDirection.RIGHT:
        return { x: 1, y: 0 };
    }
  }

  /**
   * Crée les visuels du jet de flamme
   */
  private createFlameVisuals(): void {
    this.flameGraphics = this.scene.add.graphics();
    this.flameGraphics.setDepth(this.depth + 2);
    this.updateFlameVisuals();
  }

  /**
   * Met à jour les visuels du jet de flamme
   */
  private updateFlameVisuals(): void {
    if (!this.flameGraphics) return;

    this.flameGraphics.clear();

    const dir = this.getDirectionVector();
    const gridOffset = this.getGridOffset();
    const startX = this.x + gridOffset.x;
    const startY = this.y + gridOffset.y;

    // Dessiner le jet de flamme avec variation
    const flicker = 0.8 + Math.random() * 0.4;
    const width = 30 * flicker;

    // Dégradé de couleurs (orange -> jaune -> blanc au centre)
    const colors = [
      { color: 0xff4500, alpha: 0.6 },
      { color: 0xff6600, alpha: 0.7 },
      { color: 0xffcc00, alpha: 0.5 },
    ];

    for (let i = colors.length - 1; i >= 0; i--) {
      const { color, alpha } = colors[i];
      const layerWidth = width * ((i + 1) / colors.length);

      this.flameGraphics.fillStyle(color, alpha * flicker);

      // Dessiner le jet comme un triangle
      if (this.direction === FlameDirection.UP || this.direction === FlameDirection.DOWN) {
        const endX = startX;
        const endY = startY + dir.y * this.flameLength * flicker;

        this.flameGraphics.beginPath();
        this.flameGraphics.moveTo(startX - layerWidth / 4, startY);
        this.flameGraphics.lineTo(startX + layerWidth / 4, startY);
        this.flameGraphics.lineTo(endX + (Math.random() - 0.5) * 10, endY);
        this.flameGraphics.closePath();
        this.flameGraphics.fillPath();
      } else {
        const endX = startX + dir.x * this.flameLength * flicker;
        const endY = startY;

        this.flameGraphics.beginPath();
        this.flameGraphics.moveTo(startX, startY - layerWidth / 4);
        this.flameGraphics.lineTo(startX, startY + layerWidth / 4);
        this.flameGraphics.lineTo(endX, endY + (Math.random() - 0.5) * 10);
        this.flameGraphics.closePath();
        this.flameGraphics.fillPath();
      }
    }

    // Ajouter des particules
    if (Math.random() > 0.5) {
      this.createFlameParticle();
    }
  }

  /**
   * Crée une particule de flamme
   */
  private createFlameParticle(): void {
    const dir = this.getDirectionVector();
    const distance = Math.random() * this.flameLength;
    const perpOffset = (Math.random() - 0.5) * 30;

    let particleX: number;
    let particleY: number;

    if (this.direction === FlameDirection.UP || this.direction === FlameDirection.DOWN) {
      particleX = this.x + perpOffset;
      particleY = this.y + dir.y * distance;
    } else {
      particleX = this.x + dir.x * distance;
      particleY = this.y + perpOffset;
    }

    const colors = [0xff4500, 0xff6600, 0xffcc00];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle = this.scene.add.circle(particleX, particleY, 2 + Math.random() * 3, color, 0.8);
    particle.setDepth(this.depth + 3);

    this.scene.tweens.add({
      targets: particle,
      y: particle.y - 20,
      alpha: 0,
      scale: 0.5,
      duration: 200 + Math.random() * 100,
      onComplete: () => particle.destroy(),
    });
  }

  /**
   * Met à jour le piège
   */
  public override update(): void {
    if (!this.isFiring) return;

    const now = this.scene.time.now;

    // Mettre à jour les visuels de la flamme
    this.updateFlameVisuals();

    // Vérifier si le temps est écoulé
    if (now >= this.fireEndTime) {
      this.stopFiring();
    }
  }

  /**
   * Arrête le jet de flamme
   */
  private stopFiring(): void {
    this.isFiring = false;

    // Nettoyer les visuels
    if (this.flameGraphics) {
      this.flameGraphics.destroy();
      this.flameGraphics = null;
    }

    // Les FireZones se détruiront automatiquement via leur duration
    this.fireZones = [];

    // Redessiner
    this.drawSprite();
  }

  /**
   * Retourne si le piège est en train de tirer
   */
  public isTrapFiring(): boolean {
    return this.isFiring;
  }

  /**
   * Retourne les dimensions par défaut
   */
  protected override getDefaultWidth(): number {
    return 32;
  }

  protected override getDefaultHeight(): number {
    return 32;
  }

  /**
   * Nettoie les ressources
   */
  public override destroy(fromScene?: boolean): void {
    this.scene.events.off('switch:activated', this.handleSwitchActivation, this);

    if (this.flameGraphics) {
      this.flameGraphics.destroy();
      this.flameGraphics = null;
    }

    // Les FireZones seront nettoyées par l'arena
    this.fireZones = [];

    super.destroy(fromScene);
  }
}
