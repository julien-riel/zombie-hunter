import { PowerUp, PowerUpType, PowerUpRarity } from './PowerUp';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Power-up Freeze
 *
 * Effet: Ralentit tous les zombies de 70% pendant 8 secondes.
 * Les boss ne sont ralentis que de 30%.
 * Rareté: Commun
 *
 * Effets visuels:
 * - Teinte bleutée sur les zombies
 * - Particules de givre (optionnel)
 */
export class FreezePowerUp extends PowerUp {
  public readonly type: PowerUpType = 'freeze';
  public readonly duration: number;
  public readonly rarity: PowerUpRarity;
  public readonly color: number;
  public readonly name: string = 'Freeze';
  public readonly description: string = 'Ralentit les ennemis';

  private readonly slowFactor: number;
  private readonly bossSlowFactor: number;
  private frozenZombies: Set<Zombie> = new Set();
  private frostOverlay: Phaser.GameObjects.Rectangle | null = null;

  constructor() {
    super();
    const config = BALANCE.powerUps.freeze;
    this.duration = config.duration;
    this.rarity = config.rarity;
    this.color = config.color;
    this.slowFactor = config.slowFactor;
    this.bossSlowFactor = config.bossSlowFactor;
  }

  protected onActivate(_player: Player, scene: GameScene): void {
    // Créer un overlay de givre sur l'écran
    this.createFrostOverlay(scene);

    // Appliquer l'effet de ralentissement à tous les zombies actifs
    this.applyFreezeToAllZombies(scene);
  }

  protected onDeactivate(_player: Player, scene: GameScene): void {
    // Retirer l'effet de ralentissement de tous les zombies
    this.removeFreezeFromAllZombies(scene);

    // Détruire l'overlay de givre
    this.destroyFrostOverlay();
  }

  protected onUpdate(_delta: number, _player: Player, scene: GameScene): void {
    // Appliquer le freeze aux nouveaux zombies qui ont spawn
    const activeZombies = scene.getActiveZombies();

    for (const zombie of activeZombies) {
      if (!this.frozenZombies.has(zombie) && zombie.active) {
        this.applyFreeze(zombie);
      }
    }
  }

  /**
   * Applique l'effet de gel à tous les zombies actifs
   */
  private applyFreezeToAllZombies(scene: GameScene): void {
    const zombies = scene.getActiveZombies();

    for (const zombie of zombies) {
      if (zombie.active) {
        this.applyFreeze(zombie);
      }
    }
  }

  /**
   * Applique l'effet de gel à un zombie
   */
  private applyFreeze(zombie: Zombie): void {
    // Déterminer le facteur de ralentissement (boss vs normal)
    const isBoss = zombie.getType() === 'tank' || zombie.getType() === 'necromancer';
    const factor = isBoss ? this.bossSlowFactor : this.slowFactor;

    // Appliquer le ralentissement via la méthode setSpeedMultiplier si elle existe
    // Sinon, on stocke l'info et le PowerUpSystem l'appliquera
    if ('setSpeedMultiplier' in zombie && typeof zombie.setSpeedMultiplier === 'function') {
      (zombie as unknown as { setSpeedMultiplier: (f: number) => void }).setSpeedMultiplier(factor);
    }

    // Effet visuel: teinte bleutée
    zombie.setTint(this.color);

    this.frozenZombies.add(zombie);
  }

  /**
   * Retire l'effet de gel de tous les zombies
   */
  private removeFreezeFromAllZombies(scene: GameScene): void {
    const zombies = scene.getActiveZombies();

    for (const zombie of zombies) {
      this.removeFreeze(zombie);
    }

    // Aussi retirer des zombies stockés (au cas où certains sont morts)
    for (const zombie of this.frozenZombies) {
      if (zombie.active) {
        this.removeFreeze(zombie);
      }
    }

    this.frozenZombies.clear();
  }

  /**
   * Retire l'effet de gel d'un zombie
   */
  private removeFreeze(zombie: Zombie): void {
    // Restaurer la vitesse normale
    if ('setSpeedMultiplier' in zombie && typeof zombie.setSpeedMultiplier === 'function') {
      (zombie as unknown as { setSpeedMultiplier: (f: number) => void }).setSpeedMultiplier(1);
    }

    // Retirer la teinte
    zombie.clearTint();
  }

  /**
   * Crée l'overlay de givre sur l'écran
   */
  private createFrostOverlay(scene: GameScene): void {
    const { width, height } = scene.scale;

    this.frostOverlay = scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      this.color,
      0.1
    );
    this.frostOverlay.setScrollFactor(0);
    this.frostOverlay.setDepth(1000);

    // Animation de pulsation subtile
    scene.tweens.add({
      targets: this.frostOverlay,
      alpha: { from: 0.1, to: 0.15 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Détruit l'overlay de givre
   */
  private destroyFrostOverlay(): void {
    if (this.frostOverlay) {
      this.frostOverlay.destroy();
      this.frostOverlay = null;
    }
  }
}
