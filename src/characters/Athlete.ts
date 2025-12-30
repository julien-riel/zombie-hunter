/**
 * The Athlete - Jade Chen - Phase 7.2.4
 *
 * Coureuse professionnelle.
 * Mobilité maximale, kiting expert.
 */

import { Character } from './Character';
import type { CharacterStats, PassiveEffect } from './CharacterStats';
import { createCharacterStats } from './CharacterStats';
import type { CharacterAbility } from './CharacterAbility';
import type { Player } from '@entities/Player';

/**
 * Compétence Sprint : Boost de vitesse avec invincibilité initiale
 */
class SprintAbility implements CharacterAbility {
  name = 'Sprint';
  description = 'Boost de vitesse ×2 pendant 3 secondes. Intangible les 0.5 premières secondes.';
  icon = 'ability_sprint';
  cooldown = 20000; // 20 secondes
  duration = 3000; // 3 secondes

  private intangibleDuration = 500; // 0.5 secondes d'intangibilité

  activate(player: Player): void {
    const scene = player.scene as any;

    // Doubler la vitesse
    player.speedMultiplier = 2.0;

    // Rendre intangible temporairement
    (player as any).isIntangible = true;

    // Effet visuel de sprint (traînée)
    player.setTint(0x00ffff);
    player.setAlpha(0.7);

    // Effet de motion blur / traînée
    this.createSprintTrail(player);

    // Retirer l'intangibilité après le délai
    scene.time.delayedCall(this.intangibleDuration, () => {
      if (player.active) {
        (player as any).isIntangible = false;
        player.setAlpha(1);
      }
    });

    // Son de sprint
    if (scene.sound.get('sprint_start')) {
      scene.sound.play('sprint_start', { volume: 0.5 });
    }
  }

  deactivate(player: Player): void {
    // Restaurer la vitesse normale
    player.speedMultiplier = 1.0;

    // S'assurer que l'intangibilité est retirée
    (player as any).isIntangible = false;

    // Retirer les effets visuels
    player.clearTint();
    player.setAlpha(1);

    // Son de fin de sprint
    const scene = player.scene as any;
    if (scene.sound.get('sprint_end')) {
      scene.sound.play('sprint_end', { volume: 0.3 });
    }
  }

  /**
   * Crée un effet de traînée pendant le sprint
   */
  private createSprintTrail(player: Player): void {
    const scene = player.scene as any;

    // Créer des images fantômes périodiquement
    const trailEvent = scene.time.addEvent({
      delay: 50,
      repeat: (this.duration - this.intangibleDuration) / 50,
      callback: () => {
        if (!player.active) return;

        // Créer une image fantôme
        const ghost = scene.add.sprite(player.x, player.y, player.texture.key);
        ghost.setTint(0x00ffff);
        ghost.setAlpha(0.4);
        ghost.setScale(player.scaleX, player.scaleY);

        // Disparition progressive
        scene.tweens.add({
          targets: ghost,
          alpha: 0,
          scale: 0.5,
          duration: 200,
          onComplete: () => ghost.destroy(),
        });
      },
    });

    // Stocker l'event pour le nettoyer si nécessaire
    (player as any)._sprintTrailEvent = trailEvent;
  }
}

/**
 * Jade Chen - L'Athlète
 */
export class Athlete extends Character {
  readonly id = 'athlete' as const;
  readonly name = 'Jade Chen';
  readonly description = 'Coureuse professionnelle. Mobilité maximale.';
  readonly playstyle = 'Agile et rapide. Expert du kiting et du repositionnement.';

  readonly stats: CharacterStats = createCharacterStats({
    maxHealth: 85,
    moveSpeed: 240, // +20% vitesse de base
    dashCooldown: 1200, // Dash plus fréquent
    dashDistance: 180, // Dash plus long
    damageMultiplier: 0.95,
    accuracyBonus: 0,
    critChance: 0,
    pickupRadius: 70,
    fireResistance: 0,
    poisonResistance: 0,
  });

  readonly ability: CharacterAbility = new SprintAbility();

  readonly passives: PassiveEffect[] = [
    {
      id: 'swift_strike',
      name: 'Frappe Rapide',
      description: 'Attaques de mêlée 30% plus rapides',
    },
    {
      id: 'evasion',
      name: 'Évasion',
      description: '10% de chance d\'esquiver les attaques',
    },
  ];

  readonly startingWeapon = 'pistol' as const;
  readonly spriteKey = 'player'; // Utilise le sprite par défaut pour l'instant
  readonly unlockCondition = 'Atteindre la vague 10';
}
