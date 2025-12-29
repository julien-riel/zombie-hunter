import Phaser from 'phaser';
import { Interactive, InteractiveType, TriggerType, type InteractiveConfig } from './Interactive';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';

/**
 * Configuration spécifique pour un interrupteur
 */
export interface SwitchConfig extends InteractiveConfig {
  linkedTargetIds?: string[];
  defaultState?: boolean;
  toggleable?: boolean;
}

/**
 * Interrupteur
 * - Déclenché par interaction joueur (E) ou projectile
 * - États ON/OFF avec feedback visuel
 * - Peut être lié à plusieurs éléments (portes, pièges, générateurs, zones)
 * - Peut être toggleable (ON/OFF) ou one-shot
 */
export class Switch extends Interactive {
  /** État actuel (true = ON) */
  private isOn: boolean;
  /** IDs des éléments liés */
  public readonly linkedTargetIds: string[];
  /** Lumière LED */
  private ledLight: Phaser.GameObjects.Arc | null = null;

  constructor(scene: GameScene, config: SwitchConfig) {
    super(scene, InteractiveType.SWITCH, {
      ...config,
      triggerType: config.triggerType ?? TriggerType.ON_INTERACT,
      charges: config.toggleable !== false ? -1 : 1,
    });

    this.isOn = config.defaultState ?? false;
    this.linkedTargetIds = config.linkedTargetIds ?? [];

    // Dessiner l'état initial
    this.drawSprite();
  }

  /**
   * Retourne la configuration de balance
   */
  protected getBalanceConfig(): {
    health?: number;
    cooldown?: number;
    charges?: number;
  } {
    return BALANCE.interactive?.switch ?? {
      health: Infinity,
      cooldown: 500,
    };
  }

  /**
   * Dessine l'interrupteur
   */
  protected drawSprite(): void {
    this.sprite.clear();

    const w = this.interactiveWidth;
    const h = this.interactiveHeight;
    const halfW = w / 2;
    const halfH = h / 2;

    // Boîtier (gris métallique)
    this.sprite.fillStyle(0x555555);
    this.sprite.fillRoundedRect(-halfW, -halfH, w, h, 3);

    // Contour du boîtier
    this.sprite.lineStyle(2, 0x333333);
    this.sprite.strokeRoundedRect(-halfW, -halfH, w, h, 3);

    // Plaque centrale
    this.sprite.fillStyle(0x444444);
    this.sprite.fillRoundedRect(-halfW + 4, -halfH + 4, w - 8, h - 8, 2);

    // Levier
    const leverColor = this.isOn ? 0x44aa44 : 0xaa4444;
    this.sprite.fillStyle(leverColor);

    if (this.isOn) {
      // Levier en position haute
      this.sprite.fillRoundedRect(-4, -halfH + 8, 8, 12, 2);
    } else {
      // Levier en position basse
      this.sprite.fillRoundedRect(-4, halfH - 20, 8, 12, 2);
    }

    // LED indicateur
    const ledColor = this.isOn ? 0x00ff00 : 0xff0000;
    const ledAlpha = this.isOn ? 1 : 0.5;

    // Supprimer l'ancienne LED si elle existe
    if (this.ledLight) {
      this.ledLight.destroy();
    }

    this.ledLight = this.scene.add.circle(0, -halfH + 4, 3, ledColor, ledAlpha);
    this.add(this.ledLight);

    // Effet de glow si actif
    if (this.isOn) {
      this.sprite.fillStyle(0x00ff00, 0.2);
      this.sprite.fillCircle(0, -halfH + 4, 6);
    }
  }

  /**
   * Exécute l'effet de basculement
   */
  protected executeEffect(): void {
    // Basculer l'état
    this.isOn = !this.isOn;

    // Effet sonore visuel
    this.createToggleEffect();

    // Redessiner
    this.drawSprite();

    // Notifier les éléments liés
    this.notifyLinkedElements();
  }

  /**
   * Crée l'effet visuel de basculement
   */
  private createToggleEffect(): void {
    // Flash de la LED
    const flashColor = this.isOn ? 0x00ff00 : 0xff0000;
    const flash = this.scene.add.circle(this.x, this.y - this.interactiveHeight / 2 + 4, 8, flashColor, 0.8);
    flash.setDepth(this.depth + 2);

    this.scene.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });

    // Feedback sur le boîtier
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 50,
      yoyo: true,
    });
  }

  /**
   * Notifie les éléments liés du changement d'état
   */
  private notifyLinkedElements(): void {
    // Émettre l'événement d'activation de switch
    this.scene.events.emit('switch:activated', {
      switchId: this.id,
      isOn: this.isOn,
      linkedTargetIds: this.linkedTargetIds,
    });

    // Émettre des événements spécifiques pour les générateurs
    for (const targetId of this.linkedTargetIds) {
      if (targetId.startsWith('generator')) {
        this.scene.events.emit('generator:toggle', {
          generatorId: targetId,
          active: this.isOn,
        });
      }
    }
  }

  /**
   * Override pour permettre l'activation par projectile aussi
   */
  public override takeDamage(_amount: number, source?: string): boolean {
    // Les interrupteurs ne prennent pas de dégâts mais peuvent être activés
    if (source === 'bullet' || source === 'explosion') {
      this.trigger(source);
    }
    return false;
  }

  /**
   * Retourne l'état actuel
   */
  public getSwitchState(): boolean {
    return this.isOn;
  }

  /**
   * Force l'état de l'interrupteur
   */
  public setSwitchState(on: boolean): void {
    if (this.isOn !== on) {
      this.isOn = on;
      this.drawSprite();
      this.notifyLinkedElements();
    }
  }

  /**
   * Retourne si le switch est interactable
   */
  public override isInteractable(): boolean {
    return !this.destroyed && this.canTrigger();
  }

  /**
   * Retourne les dimensions par défaut
   */
  protected override getDefaultWidth(): number {
    return 24;
  }

  protected override getDefaultHeight(): number {
    return 32;
  }

  /**
   * Nettoie les ressources
   */
  public override destroy(fromScene?: boolean): void {
    if (this.ledLight) {
      this.ledLight.destroy();
      this.ledLight = null;
    }
    super.destroy(fromScene);
  }
}
