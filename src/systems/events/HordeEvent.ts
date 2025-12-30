/**
 * Phase 7.4 - HordeEvent
 * Événement qui triple le nombre de spawns pour une vague
 */

import type { GameScene } from '@scenes/GameScene';
import type { WaveConfig } from '../WaveSystem';
import {
  BaseSpecialEvent,
  SpecialEventType,
  EventState,
  type SpecialEventConfig,
  type EventDuration,
} from './SpecialEvent';

/**
 * Configuration spécifique à la Horde
 */
interface HordeConfig {
  /** Multiplicateur du budget de menace */
  budgetMultiplier: number;
  /** Types de zombies autorisés (pour éviter le chaos) */
  allowedTypes: string[];
  /** Bonus de drop pour compenser la difficulté */
  dropRateBonus: number;
  /** Multiplicateur de vitesse de spawn */
  spawnSpeedMultiplier: number;
}

const HORDE_CONFIG: HordeConfig = {
  budgetMultiplier: 3.0,
  allowedTypes: ['shambler', 'runner', 'crawler'],
  dropRateBonus: 0.5, // +50% de drops
  spawnSpeedMultiplier: 0.6, // Spawns 40% plus rapides
};

/**
 * Événement Horde
 * Triple le nombre de zombies mais limite les types
 * Récompenses améliorées en compensation
 */
export class HordeEvent extends BaseSpecialEvent {
  public readonly name = 'Horde';
  public readonly description = 'Vague massive de zombies - Drops améliorés';
  public readonly type = SpecialEventType.HORDE;
  public readonly duration: EventDuration = 'wave';

  public readonly config: SpecialEventConfig = {
    type: SpecialEventType.HORDE,
    minWave: 5,
    probability: 0.20,
    cooldownWaves: 5,
    priority: 3,
    canStack: false,
  };

  /** Nombre de zombies tués pendant l'événement */
  private killCount: number = 0;

  /**
   * Active l'événement Horde
   */
  public activate(scene: GameScene): void {
    super.activate(scene);
    this.killCount = 0;

    // Appliquer le bonus de drop
    this.applyDropBonus(scene, true);

    // Effet visuel d'avertissement
    this.playWarningEffect(scene);
  }

  /**
   * Désactive l'événement Horde
   */
  public deactivate(scene: GameScene): void {
    // Retirer le bonus de drop
    this.applyDropBonus(scene, false);

    // Afficher les stats de la horde
    this.showHordeStats(scene);

    super.deactivate(scene);
  }

  /**
   * Modifie la configuration de la vague
   */
  public modifyWaveConfig(config: WaveConfig): WaveConfig {
    // Tripler le nombre de zombies
    const modifiedConfig: WaveConfig = {
      ...config,
      totalZombies: Math.floor(config.totalZombies * HORDE_CONFIG.budgetMultiplier),
    };

    // Modifier les groupes de spawn pour ne garder que les types autorisés
    if (config.spawnGroups) {
      modifiedConfig.spawnGroups = config.spawnGroups
        .filter((group) => HORDE_CONFIG.allowedTypes.includes(group.zombieType))
        .map((group) => ({
          ...group,
          count: Math.floor(group.count * HORDE_CONFIG.budgetMultiplier),
        }));

      // Si aucun groupe valide, créer un groupe de shamblers par défaut
      if (modifiedConfig.spawnGroups.length === 0) {
        modifiedConfig.spawnGroups = [
          { zombieType: 'shambler', count: Math.floor(config.totalZombies * 2) },
          { zombieType: 'runner', count: Math.floor(config.totalZombies) },
        ];
      }
    }

    // Modifier les spawn plans si présents
    if (config.spawnPlans) {
      modifiedConfig.spawnPlans = config.spawnPlans
        .filter((plan) => HORDE_CONFIG.allowedTypes.includes(plan.type))
        .map((plan) => ({
          ...plan,
          delay: Math.floor(plan.delay * HORDE_CONFIG.spawnSpeedMultiplier),
        }));

      // Dupliquer les plans pour atteindre le multiplicateur
      const originalPlans = [...modifiedConfig.spawnPlans];
      for (let i = 1; i < HORDE_CONFIG.budgetMultiplier; i++) {
        const duplicatedPlans = originalPlans.map((plan) => ({
          ...plan,
          delay: plan.delay + (i * 500), // Décaler les spawns supplémentaires
        }));
        modifiedConfig.spawnPlans.push(...duplicatedPlans);
      }

      // Trier par délai
      modifiedConfig.spawnPlans.sort((a, b) => a.delay - b.delay);
      modifiedConfig.totalZombies = modifiedConfig.spawnPlans.length;
    }

    console.log(`[HordeEvent] Wave modified: ${config.totalZombies} -> ${modifiedConfig.totalZombies} zombies`);

    return modifiedConfig;
  }

  /**
   * Callback quand un zombie meurt
   */
  public onZombieDeath(scene: GameScene): void {
    if (this.state !== EventState.ACTIVE) return;

    this.killCount++;

    // Effets visuels pour les paliers de kills
    if (this.killCount % 25 === 0) {
      this.showKillMilestone(scene, this.killCount);
    }
  }

  /**
   * Applique ou retire le bonus de drop
   */
  private applyDropBonus(scene: GameScene, apply: boolean): void {
    const dropSystem = scene.getDropSystem();
    if (!dropSystem) return;

    // Note: Le DropSystem devrait avoir une méthode pour modifier le taux de drop
    // Pour l'instant, on peut émettre un événement que le système écoute
    scene.events.emit('dropRateModifier', {
      modifier: apply ? HORDE_CONFIG.dropRateBonus : 0,
      source: 'horde_event',
    });
  }

  /**
   * Joue un effet d'avertissement au début de la horde
   */
  private playWarningEffect(scene: GameScene): void {
    const camera = scene.cameras.main;

    // Flash rouge
    camera.flash(500, 100, 0, 0);

    // Shake léger
    camera.shake(300, 0.005);

    // Son d'avertissement (si disponible)
    if (scene.sound.get('horde_warning')) {
      scene.sound.play('horde_warning');
    }
  }

  /**
   * Affiche un palier de kills
   */
  private showKillMilestone(scene: GameScene, kills: number): void {
    scene.events.emit('ui:notification', {
      text: `${kills} KILLS!`,
      style: 'combo',
      duration: 1500,
    });

    // Petit shake pour le feedback
    scene.cameras.main.shake(100, 0.002);
  }

  /**
   * Affiche les statistiques de la horde à la fin
   */
  private showHordeStats(scene: GameScene): void {
    scene.events.emit('ui:announcement', {
      text: 'HORDE SURVÉCUE',
      subtext: `${this.killCount} zombies éliminés`,
      style: 'success',
      duration: 3000,
    });
  }

  /**
   * Réinitialise l'événement
   */
  public reset(): void {
    this.killCount = 0;
    super.reset();
  }
}
