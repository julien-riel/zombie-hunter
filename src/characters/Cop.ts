/**
 * The Cop - Marcus Webb - Phase 7.2.1
 *
 * Officier de police, calme sous pression.
 * Style de jeu précis et méthodique.
 */

import { Character } from './Character';
import type { CharacterStats, PassiveEffect } from './CharacterStats';
import { createCharacterStats } from './CharacterStats';
import type { CharacterAbility } from './CharacterAbility';
import type { Player } from '@entities/Player';

/**
 * Compétence Concentration : Ralentit le temps perçu
 */
class ConcentrationAbility implements CharacterAbility {
  name = 'Concentration';
  description = 'Ralentit le temps à 30% pendant 4 secondes. Permet un repositionnement tactique.';
  icon = 'ability_concentration';
  cooldown = 30000; // 30 secondes
  duration = 4000; // 4 secondes

  activate(player: Player): void {
    const scene = player.scene;

    // Ralentir le temps
    scene.time.timeScale = 0.3;

    // Effet visuel (teinte bleue légère)
    player.setTint(0x8888ff);

    // Effet sur la caméra si disponible
    if (scene.cameras?.main) {
      scene.cameras.main.setZoom(1.05);
    }
  }

  deactivate(player: Player): void {
    const scene = player.scene;

    // Restaurer le temps normal
    scene.time.timeScale = 1.0;

    // Retirer l'effet visuel
    player.clearTint();

    // Restaurer le zoom
    if (scene.cameras?.main) {
      scene.cameras.main.setZoom(1.0);
    }
  }
}

/**
 * Marcus Webb - Le Flic
 */
export class Cop extends Character {
  readonly id = 'cop' as const;
  readonly name = 'Marcus Webb';
  readonly description = 'Officier de police expérimenté. Calme sous pression.';
  readonly playstyle = 'Précis et méthodique. Vise les points faibles.';

  readonly stats: CharacterStats = createCharacterStats({
    maxHealth: 100,
    moveSpeed: 200,
    dashCooldown: 1500,
    dashDistance: 150,
    damageMultiplier: 1.0,
    accuracyBonus: 0.15, // +15% précision
    critChance: 0.1, // 10% chance critique
    pickupRadius: 50,
    fireResistance: 0,
    poisonResistance: 0,
  });

  readonly ability: CharacterAbility = new ConcentrationAbility();

  readonly passives: PassiveEffect[] = [
    {
      id: 'steady_aim',
      name: 'Tir Stable',
      description: '+15% précision sur toutes les armes',
    },
    {
      id: 'critical_training',
      name: 'Entraînement Critique',
      description: '10% chance de coup critique (×2 dégâts)',
    },
  ];

  readonly startingWeapon = 'pistol' as const;
  readonly spriteKey = 'player'; // Utilise le sprite par défaut pour l'instant
  readonly unlockCondition = 'Disponible dès le départ';
}
