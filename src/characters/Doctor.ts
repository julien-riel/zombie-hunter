/**
 * The Doctor - Dr. Elena Vasquez - Phase 7.2.2
 *
 * Chercheuse du laboratoire originel.
 * Survit par la régénération et les soins.
 */

import { Character } from './Character';
import type { CharacterStats, PassiveEffect } from './CharacterStats';
import { createCharacterStats } from './CharacterStats';
import type { CharacterAbility } from './CharacterAbility';
import type { Player } from '@entities/Player';

/**
 * Compétence Vaccination : Immunité temporaire aux effets de statut
 */
class VaccinationAbility implements CharacterAbility {
  name = 'Vaccination';
  description = 'Immunité aux infections et effets de statut pendant 8 secondes. Annule les effets en cours.';
  icon = 'ability_vaccination';
  cooldown = 25000; // 25 secondes
  duration = 8000; // 8 secondes

  activate(player: Player): void {
    // Annuler les effets de statut en cours (si le système existe)
    if ('statusEffects' in player && typeof (player as any).statusEffects?.clearAll === 'function') {
      (player as any).statusEffects.clearAll();
    }

    // Marquer le joueur comme immunisé
    (player as any).isStatusImmune = true;

    // Effet visuel (teinte verte)
    player.setTint(0x88ff88);

    // Effet de particules de guérison (si disponible)
    const scene = player.scene as any;
    if (scene.particles?.createEmitter) {
      const emitter = scene.particles.createEmitter({
        x: player.x,
        y: player.y,
        speed: { min: 20, max: 50 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        lifespan: 500,
        frequency: 100,
        tint: 0x88ff88,
      });
      // Stocker l'emitter pour le nettoyer à la désactivation
      (player as any)._vaccinationEmitter = emitter;
    }
  }

  deactivate(player: Player): void {
    // Retirer l'immunité
    (player as any).isStatusImmune = false;

    // Retirer l'effet visuel
    player.clearTint();

    // Nettoyer l'emitter de particules
    if ((player as any)._vaccinationEmitter) {
      (player as any)._vaccinationEmitter.stop();
      delete (player as any)._vaccinationEmitter;
    }
  }
}

/**
 * Dr. Elena Vasquez - La Médecin
 */
export class Doctor extends Character {
  readonly id = 'doctor' as const;
  readonly name = 'Dr. Elena Vasquez';
  readonly description = 'Chercheuse du laboratoire originel. Survit par la régénération.';
  readonly playstyle = 'Défensif et résilient. Se soigne et résiste aux effets.';

  readonly stats: CharacterStats = createCharacterStats({
    maxHealth: 90,
    moveSpeed: 190,
    dashCooldown: 1600,
    dashDistance: 140,
    damageMultiplier: 0.9, // Légèrement moins de dégâts
    accuracyBonus: 0,
    critChance: 0,
    pickupRadius: 60,
    fireResistance: 0,
    poisonResistance: 0.5, // 50% résistance au poison
  });

  readonly ability: CharacterAbility = new VaccinationAbility();

  readonly passives: PassiveEffect[] = [
    {
      id: 'regeneration',
      name: 'Régénération',
      description: 'Régénère 1 HP toutes les 5 secondes',
    },
    {
      id: 'medical_expertise',
      name: 'Expertise Médicale',
      description: 'Tous les soins sont 50% plus efficaces',
    },
  ];

  readonly startingWeapon = 'pistol' as const;
  readonly spriteKey = 'player'; // Utilise le sprite par défaut pour l'instant
  readonly unlockCondition = 'Jouer 5 parties';
}
