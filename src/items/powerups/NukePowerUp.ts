import { PowerUp, PowerUpType, PowerUpRarity } from './PowerUp';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Power-up Nuke
 *
 * Effet: Tue instantanément tous les zombies visibles à l'écran.
 * Les boss reçoivent 50% de leurs HP max en dégâts.
 * Ne peut pas drop avant la vague 3.
 * Rareté: Légendaire
 *
 * Effets visuels:
 * - Flash blanc sur tout l'écran
 * - Onde de choc depuis le joueur
 * - Explosion massive
 */
export class NukePowerUp extends PowerUp {
  public readonly type: PowerUpType = 'nuke';
  public readonly duration: number = 0; // Instantané
  public readonly rarity: PowerUpRarity;
  public readonly color: number;
  public readonly name: string = 'Nuke';
  public readonly description: string = 'Annihilation totale';

  private readonly bossDamagePercent: number;

  constructor() {
    super();
    const config = BALANCE.powerUps.nuke;
    this.rarity = config.rarity;
    this.color = config.color;
    this.bossDamagePercent = config.bossDamagePercent;
  }

  protected onActivate(player: Player, scene: GameScene): void {
    // Effets visuels
    this.createNukeEffect(player, scene);

    // Tuer tous les zombies (avec délai pour synchroniser avec l'effet visuel)
    scene.time.delayedCall(300, () => {
      this.executeNuke(scene);
    });
  }

  protected onDeactivate(_player: Player, _scene: GameScene): void {
    // Rien à désactiver pour un effet instantané
  }

  /**
   * Exécute l'effet de nuke sur tous les zombies
   */
  private executeNuke(scene: GameScene): void {
    const zombies = scene.getActiveZombies();
    let killCount = 0;

    for (const zombie of zombies) {
      if (zombie.active) {
        const isBoss = this.isBoss(zombie);

        if (isBoss) {
          // Les boss reçoivent un pourcentage de dégâts
          const damage = zombie.getMaxHealth() * this.bossDamagePercent;
          zombie.takeDamage(damage);
        } else {
          // Les zombies normaux meurent instantanément
          zombie.takeDamage(zombie.getHealth() + 1000);
          killCount++;
        }
      }
    }

    // Log pour debug
    console.log(`[NukePowerUp] Killed ${killCount} zombies`);
  }

  /**
   * Vérifie si un zombie est un boss
   */
  private isBoss(zombie: Zombie): boolean {
    const bossTypes = ['tank', 'necromancer'];
    return bossTypes.includes(zombie.getType());
  }

  /**
   * Crée les effets visuels de l'explosion nucléaire
   */
  private createNukeEffect(player: Player, scene: GameScene): void {
    const { width, height } = scene.scale;
    const centerX = player.x;
    const centerY = player.y;

    // Flash blanc sur tout l'écran
    const flash = scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0xffffff,
      1
    );
    flash.setScrollFactor(0);
    flash.setDepth(2000);

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // Onde de choc
    const shockwave = scene.add.graphics();
    shockwave.setDepth(1999);

    let shockwaveRadius = 0;
    const maxRadius = Math.max(width, height);
    const shockwaveTarget = { radius: 0 };

    scene.tweens.add({
      targets: shockwaveTarget,
      radius: maxRadius,
      duration: 600,
      ease: 'Power2',
      onUpdate: () => {
        shockwaveRadius = shockwaveTarget.radius;
        shockwave.clear();

        // Cercle d'onde de choc
        const alpha = 1 - shockwaveRadius / maxRadius;
        shockwave.lineStyle(8, this.color, alpha);
        shockwave.strokeCircle(centerX, centerY, shockwaveRadius);

        // Cercle secondaire
        shockwave.lineStyle(4, 0xffffff, alpha * 0.5);
        shockwave.strokeCircle(centerX, centerY, shockwaveRadius * 0.8);
      },
      onComplete: () => shockwave.destroy(),
    });

    // Cercle d'explosion central
    const explosion = scene.add.circle(centerX, centerY, 10, this.color, 1);
    explosion.setDepth(1998);

    scene.tweens.add({
      targets: explosion,
      scaleX: 15,
      scaleY: 15,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => explosion.destroy(),
    });

    // Shake de la caméra
    scene.cameras.main.shake(400, 0.02);

    // Particules d'explosion (simulation simple avec des cercles)
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const distance = 50 + Math.random() * 100;

      const particle = scene.add.circle(
        centerX + Math.cos(angle) * 20,
        centerY + Math.sin(angle) * 20,
        5 + Math.random() * 10,
        this.color,
        0.8
      );
      particle.setDepth(1997);

      scene.tweens.add({
        targets: particle,
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 400 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }
}
