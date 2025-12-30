/**
 * The Pyromaniac - Victor Ash - Phase 7.2.5
 *
 * Pompier obsédé par le feu.
 * Dégâts de zone et propagation.
 */

import Phaser from 'phaser';
import { Character } from './Character';
import type { CharacterStats, PassiveEffect } from './CharacterStats';
import { createCharacterStats } from './CharacterStats';
import type { CharacterAbility } from './CharacterAbility';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

/**
 * Compétence Nova : Explosion de flammes autour du joueur
 */
class NovaAbility implements CharacterAbility {
  name = 'Nova';
  description = 'Explosion de flammes dans un rayon de 150px. Inflige 50 dégâts + brûlure.';
  icon = 'ability_nova';
  cooldown = 25000; // 25 secondes
  // Effet instantané, pas de duration

  private radius = 150;
  private damage = 50;
  private burnDuration = 3000;

  activate(player: Player): void {
    const scene = player.scene as any;

    // Effet visuel de l'explosion
    this.createNovaEffect(player);

    // Son de l'explosion
    if (scene.sound.get('nova_explosion')) {
      scene.sound.play('nova_explosion', { volume: 0.7 });
    }

    // Dégâts aux zombies dans le rayon
    const zombies = scene.zombies?.getChildren() as Zombie[];
    if (zombies) {
      for (const zombie of zombies) {
        if (!zombie.active) continue;

        const distance = Phaser.Math.Distance.Between(
          player.x, player.y,
          zombie.x, zombie.y
        );

        if (distance <= this.radius) {
          // Infliger les dégâts
          zombie.takeDamage(this.damage);

          // Appliquer la brûlure si le zombie supporte les effets de statut
          if (typeof (zombie as any).applyStatusEffect === 'function') {
            (zombie as any).applyStatusEffect('burning', this.burnDuration);
          }

          // Effet visuel de brûlure sur le zombie
          this.applyBurnEffect(zombie);
        }
      }
    }

    // Shake de caméra
    if (scene.cameras?.main) {
      scene.cameras.main.shake(200, 0.01);
    }
  }

  /**
   * Crée l'effet visuel de Nova
   */
  private createNovaEffect(player: Player): void {
    const scene = player.scene as any;

    // Cercle de feu qui s'étend
    const nova = scene.add.circle(player.x, player.y, 10, 0xff6600, 0.8);

    scene.tweens.add({
      targets: nova,
      radius: this.radius,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        // Mettre à jour la taille du cercle
        nova.setRadius(nova.radius);
      },
      onComplete: () => nova.destroy(),
    });

    // Cercle intérieur plus lumineux
    const innerNova = scene.add.circle(player.x, player.y, 5, 0xffff00, 0.9);
    scene.tweens.add({
      targets: innerNova,
      radius: this.radius * 0.7,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        innerNova.setRadius(innerNova.radius);
      },
      onComplete: () => innerNova.destroy(),
    });

    // Particules de feu
    const particles = scene.add.particles(player.x, player.y, 'pixel', {
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      lifespan: 500,
      quantity: 30,
      tint: [0xff6600, 0xff9900, 0xffcc00],
      blendMode: 'ADD',
    });

    // Auto-destruction des particules
    scene.time.delayedCall(600, () => {
      particles.destroy();
    });
  }

  /**
   * Applique un effet visuel de brûlure sur un zombie
   */
  private applyBurnEffect(zombie: Zombie): void {
    const scene = zombie.scene as any;

    // Teinte orange sur le zombie
    zombie.setTint(0xff6600);

    // Particules de flamme sur le zombie
    const burnParticles = scene.add.particles(zombie.x, zombie.y, 'pixel', {
      follow: zombie,
      speed: { min: 20, max: 40 },
      angle: { min: -120, max: -60 }, // Vers le haut
      scale: { start: 0.8, end: 0 },
      lifespan: 300,
      frequency: 100,
      tint: [0xff6600, 0xff9900],
      blendMode: 'ADD',
    });

    // Nettoyer après la durée de brûlure
    scene.time.delayedCall(this.burnDuration, () => {
      burnParticles.destroy();
      if (zombie.active) {
        zombie.clearTint();
      }
    });
  }

  // Pas de deactivate car l'effet est instantané
}

/**
 * Victor Ash - Le Pyromane
 */
export class Pyromaniac extends Character {
  readonly id = 'pyromaniac' as const;
  readonly name = 'Victor Ash';
  readonly description = 'Pompier obsédé par le feu. Dégâts de zone et propagation.';
  readonly playstyle = 'Agressif et destructeur. Contrôle de foule par le feu.';

  readonly stats: CharacterStats = createCharacterStats({
    maxHealth: 100,
    moveSpeed: 195,
    dashCooldown: 1500,
    dashDistance: 140,
    damageMultiplier: 1.0,
    accuracyBonus: 0,
    critChance: 0,
    pickupRadius: 50,
    fireResistance: 0.8, // 80% résistance au feu
    poisonResistance: 0,
  });

  readonly ability: CharacterAbility = new NovaAbility();

  readonly passives: PassiveEffect[] = [
    {
      id: 'pyromania',
      name: 'Pyromanie',
      description: '+30% dégâts avec les armes incendiaires',
    },
    {
      id: 'contagion',
      name: 'Contagion',
      description: '20% de chance que les zombies tués propagent le feu',
    },
  ];

  readonly startingWeapon = 'shotgun' as const;
  readonly spriteKey = 'player'; // Utilise le sprite par défaut pour l'instant
  readonly unlockCondition = 'Tuer 500 zombies au total';
}
