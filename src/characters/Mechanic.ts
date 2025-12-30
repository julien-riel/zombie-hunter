/**
 * The Mechanic - Frank "Gears" Morrison - Phase 7.2.3
 *
 * Expert en machines et explosifs.
 * Style défensif et territorial.
 */

import { Character } from './Character';
import type { CharacterStats, PassiveEffect } from './CharacterStats';
import { createCharacterStats } from './CharacterStats';
import type { CharacterAbility } from './CharacterAbility';
import type { Player } from '@entities/Player';
import { AutoTurret } from '@entities/AutoTurret';

/**
 * Compétence Tourelle : Pose une tourelle automatique
 */
class TurretAbility implements CharacterAbility {
  name = 'Tourelle Automatique';
  description = 'Pose une tourelle qui tire sur les zombies proches pendant 20 secondes.';
  icon = 'ability_turret';
  cooldown = 35000; // 35 secondes
  // Pas de duration car la tourelle gère son propre cycle de vie

  private activeTurret: AutoTurret | null = null;

  activate(player: Player): void {
    const scene = player.scene as any;

    // Détruire l'ancienne tourelle si elle existe
    if (this.activeTurret && this.activeTurret.active) {
      this.activeTurret.destroy();
    }

    // Créer la nouvelle tourelle à la position du joueur
    this.activeTurret = new AutoTurret(scene, player.x, player.y, {
      damage: 8,
      fireRate: 300,
      range: 250,
      lifespan: 20000,
    });

    // Ajouter la tourelle à un groupe pour les mises à jour
    if (!scene.turrets) {
      scene.turrets = scene.add.group();
    }
    scene.turrets.add(this.activeTurret);

    // Effet sonore de placement
    if (scene.sound.get('turret_deploy')) {
      scene.sound.play('turret_deploy', { volume: 0.6 });
    }

    // Feedback visuel pour le joueur
    player.setTint(0xffaa00);
    scene.time.delayedCall(200, () => {
      if (player.active) {
        player.clearTint();
      }
    });
  }

  // Pas de deactivate car la tourelle se gère elle-même
}

/**
 * Frank "Gears" Morrison - Le Mécano
 */
export class Mechanic extends Character {
  readonly id = 'mechanic' as const;
  readonly name = 'Frank "Gears" Morrison';
  readonly description = 'Expert en machines et explosifs. Style défensif et territorial.';
  readonly playstyle = 'Territorial et stratégique. Contrôle de zone.';

  readonly stats: CharacterStats = createCharacterStats({
    maxHealth: 110,
    moveSpeed: 180,
    dashCooldown: 1800,
    dashDistance: 120,
    damageMultiplier: 1.0,
    accuracyBonus: -0.05, // Légèrement moins précis
    critChance: 0,
    pickupRadius: 50,
    fireResistance: 0.2, // 20% résistance au feu
    poisonResistance: 0,
  });

  readonly ability: CharacterAbility = new TurretAbility();

  readonly passives: PassiveEffect[] = [
    {
      id: 'explosive_expert',
      name: 'Expert en Explosifs',
      description: '+25% dégâts des explosifs et armes improvisées',
    },
    {
      id: 'quick_repair',
      name: 'Réparation Rapide',
      description: 'Répare les barricades 50% plus vite',
    },
  ];

  readonly startingWeapon = 'shotgun' as const;
  readonly spriteKey = 'player'; // Utilise le sprite par défaut pour l'instant
  readonly unlockCondition = 'Atteindre la vague 15';
}
