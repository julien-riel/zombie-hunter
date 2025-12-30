/**
 * The Kid - Lily + Max - Phase 7.2.6
 *
 * Enfant de 12 ans avec son chien.
 * Petite cible, DPS passif via le compagnon.
 */

import { Character } from './Character';
import type { CharacterStats, PassiveEffect } from './CharacterStats';
import { createCharacterStats } from './CharacterStats';
import type { CharacterAbility } from './CharacterAbility';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';
import { CompanionDog } from '@entities/CompanionDog';

/**
 * Compétence Flair : Révèle tous les ennemis et drops cachés
 */
class FlairAbility implements CharacterAbility {
  name = 'Flair';
  description = 'Max révèle tous les ennemis et drops cachés pendant 5 secondes.';
  icon = 'ability_flair';
  cooldown = 20000; // 20 secondes
  duration = 5000; // 5 secondes

  private revealedZombies: Set<Zombie> = new Set();

  activate(player: Player): void {
    const scene = player.scene as any;

    // Effet visuel de détection
    this.createDetectionWave(player);

    // Faire aboyer Max
    const companion = (player as any)._companionDog as CompanionDog;
    if (companion) {
      // Animation spéciale de Max
      scene.tweens.add({
        targets: companion,
        scaleY: 1.3,
        yoyo: true,
        duration: 150,
        repeat: 3,
      });
    }

    // Révéler tous les zombies
    const zombies = scene.zombies?.getChildren() as Zombie[];
    if (zombies) {
      for (const zombie of zombies) {
        if (!zombie.active) continue;

        // Révéler le zombie
        if (typeof (zombie as any).setRevealed === 'function') {
          (zombie as any).setRevealed(true);
        }

        // Ajouter un contour
        this.addOutline(zombie);
        this.revealedZombies.add(zombie);
      }
    }

    // Révéler les drops cachés (si le système existe)
    if (scene.hiddenDrops?.getChildren) {
      const drops = scene.hiddenDrops.getChildren();
      for (const drop of drops) {
        if (typeof (drop as any).showIndicator === 'function') {
          (drop as any).showIndicator();
        }
        // Effet visuel
        (drop as any).setTint?.(0xffff00);
      }
    }

    // Son de détection
    if (scene.sound.get('flair_activate')) {
      scene.sound.play('flair_activate', { volume: 0.5 });
    }
  }

  deactivate(player: Player): void {
    const scene = player.scene as any;

    // Cacher les zombies révélés
    for (const zombie of this.revealedZombies) {
      if (!zombie.active) continue;

      if (typeof (zombie as any).setRevealed === 'function') {
        (zombie as any).setRevealed(false);
      }

      // Retirer le contour
      this.removeOutline(zombie);
    }

    this.revealedZombies.clear();

    // Cacher les drops
    if (scene.hiddenDrops?.getChildren) {
      const drops = scene.hiddenDrops.getChildren();
      for (const drop of drops) {
        (drop as any).clearTint?.();
      }
    }
  }

  /**
   * Crée une onde de détection visuelle
   */
  private createDetectionWave(player: Player): void {
    const scene = player.scene as any;

    // Onde circulaire qui s'étend
    const wave = scene.add.circle(player.x, player.y, 20, 0xffff00, 0.3);
    wave.setStrokeStyle(3, 0xffff00, 0.8);

    scene.tweens.add({
      targets: wave,
      radius: 400,
      alpha: 0,
      duration: 800,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        wave.setRadius(wave.radius);
      },
      onComplete: () => wave.destroy(),
    });

    // Particules en forme de nez/patte
    const particles = scene.add.particles(player.x, player.y, 'pixel', {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      lifespan: 600,
      quantity: 20,
      tint: [0xffff00, 0xffaa00],
    });

    scene.time.delayedCall(700, () => {
      particles.destroy();
    });
  }

  /**
   * Ajoute un contour lumineux à un zombie
   */
  private addOutline(zombie: Zombie): void {
    zombie.setTint(0xffff00);

    // Effet de pulsation
    const scene = zombie.scene;
    (zombie as any)._flairTween = scene.tweens.add({
      targets: zombie,
      alpha: { from: 1, to: 0.7 },
      yoyo: true,
      repeat: -1,
      duration: 500,
    });
  }

  /**
   * Retire le contour d'un zombie
   */
  private removeOutline(zombie: Zombie): void {
    zombie.clearTint();
    zombie.setAlpha(1);

    // Arrêter la pulsation
    if ((zombie as any)._flairTween) {
      (zombie as any)._flairTween.stop();
      delete (zombie as any)._flairTween;
    }
  }
}

/**
 * Lily + Max - La Gamine
 */
export class Kid extends Character {
  readonly id = 'kid' as const;
  readonly name = 'Lily + Max';
  readonly description = 'Enfant de 12 ans avec son chien fidèle. Petite mais maligne.';
  readonly playstyle = 'Agile et soutenu. Max attaque et détecte les menaces.';

  readonly stats: CharacterStats = createCharacterStats({
    maxHealth: 70, // Fragile
    moveSpeed: 210, // Assez rapide
    dashCooldown: 1400,
    dashDistance: 160,
    damageMultiplier: 0.85, // Moins de dégâts
    accuracyBonus: 0,
    critChance: 0,
    pickupRadius: 80, // Ramasse de plus loin
    fireResistance: 0,
    poisonResistance: 0,
  });

  readonly ability: CharacterAbility = new FlairAbility();

  readonly passives: PassiveEffect[] = [
    {
      id: 'small_target',
      name: 'Petite Cible',
      description: 'Hitbox réduite de 30%',
    },
    {
      id: 'loyal_companion',
      name: 'Compagnon Fidèle',
      description: 'Max attaque automatiquement les zombies proches (5 dégâts/s)',
    },
    {
      id: 'danger_sense',
      name: 'Sens du Danger',
      description: 'Max aboie quand un Crawler ou Invisible est proche',
    },
  ];

  readonly startingWeapon = 'pistol' as const;
  readonly spriteKey = 'player'; // Utilise le sprite par défaut pour l'instant
  readonly unlockCondition = 'Atteindre la vague 20';

  /**
   * Initialise le compagnon quand le personnage est sélectionné
   * Cette méthode devrait être appelée par le Player lors de l'initialisation
   */
  static initializeCompanion(player: Player): CompanionDog {
    const scene = player.scene as any;
    const companion = new CompanionDog(scene, player);

    // Stocker la référence sur le joueur
    (player as any)._companionDog = companion;

    // Ajouter au groupe pour les updates
    if (!scene.companions) {
      scene.companions = scene.add.group();
    }
    scene.companions.add(companion);

    return companion;
  }

  /**
   * Nettoie le compagnon
   */
  static cleanupCompanion(player: Player): void {
    const companion = (player as any)._companionDog as CompanionDog;
    if (companion) {
      companion.destroy();
      delete (player as any)._companionDog;
    }
  }
}
