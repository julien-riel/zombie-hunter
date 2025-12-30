import { Drop } from './Drop';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Couleur du drop de munitions (jaune/or)
 */
const AMMO_COLOR = 0xffd700;

/**
 * Drop de munitions
 *
 * Recharge 30% du chargeur de l'arme actuellement équipée.
 * Si l'arme est pleine, recharge la prochaine arme dans l'inventaire.
 */
export class AmmoDrop extends Drop {
  private reloadPercent: number;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'ammo', AMMO_COLOR);
    this.reloadPercent = BALANCE.drops.ammo.reloadPercent;
  }

  /**
   * Applique l'effet du drop de munitions au joueur
   */
  protected applyEffect(player: Player): void {
    const weapon = player.currentWeapon;
    if (!weapon) return;

    // Calculer le nombre de balles à ajouter
    const magazineSize = weapon.getMagazineSize();
    const ammoToAdd = Math.ceil(magazineSize * this.reloadPercent);

    // Ajouter les munitions
    weapon.addAmmo(ammoToAdd);
  }

  /**
   * Retourne la valeur du drop (pourcentage de recharge)
   */
  protected getValue(): number {
    return this.reloadPercent;
  }
}
