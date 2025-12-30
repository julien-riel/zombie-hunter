import { Drop } from './Drop';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Couleur des drops de soins
 */
const HEALTH_SMALL_COLOR = 0x00ff00; // Vert clair
const HEALTH_MEDIUM_COLOR = 0x00cc00; // Vert plus foncé

/**
 * Type de drop de soins
 */
export type HealthDropSize = 'small' | 'medium';

/**
 * Drop de soins
 *
 * Deux variantes:
 * - Petit: +15 HP
 * - Moyen: +30 HP
 */
export class HealthDrop extends Drop {
  private healAmount: number;
  private size: HealthDropSize;

  constructor(scene: GameScene, x: number, y: number, size: HealthDropSize = 'small') {
    const color = size === 'small' ? HEALTH_SMALL_COLOR : HEALTH_MEDIUM_COLOR;
    const dropType = size === 'small' ? 'healthSmall' : 'healthMedium';

    super(scene, x, y, dropType, color);

    this.size = size;

    // Récupérer le montant de soin depuis la config
    if (size === 'small') {
      this.healAmount = BALANCE.drops.healthSmall.healAmount;
    } else {
      this.healAmount = BALANCE.drops.healthMedium.healAmount;
    }

    // Les drops moyens sont légèrement plus grands
    if (size === 'medium') {
      this.setDisplaySize(20, 20);
    }
  }

  /**
   * Applique l'effet de soin au joueur
   */
  protected applyEffect(player: Player): void {
    player.heal(this.healAmount);

    // Émettre l'événement de soin
    this.gameScene.events.emit('player:heal', {
      amount: this.healAmount,
      currentHealth: player.getHealth(),
      source: 'drop',
    });
  }

  /**
   * Retourne la valeur du drop (points de vie soignés)
   */
  protected getValue(): number {
    return this.healAmount;
  }

  /**
   * Retourne la taille du drop
   */
  public getSize(): HealthDropSize {
    return this.size;
  }
}
