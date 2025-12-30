/**
 * Phase 7.4 - BossRushEvent
 * Événement qui enchaîne plusieurs boss sans pause
 */

import type { GameScene } from '@scenes/GameScene';
import type { BossType } from '@/types/entities';
import {
  BaseSpecialEvent,
  SpecialEventType,
  EventState,
  type SpecialEventConfig,
  type EventDuration,
} from './SpecialEvent';

/**
 * Configuration spécifique au Boss Rush
 */
interface BossRushConfig {
  /** Nombre minimum de boss */
  minBosses: number;
  /** Nombre maximum de boss */
  maxBosses: number;
  /** Délai entre les boss (ms) */
  delayBetweenBosses: number;
  /** Multiplicateur de récompenses à la fin */
  rewardMultiplier: number;
  /** Réduction de HP des boss (pour équilibrer) */
  bossHealthMultiplier: number;
  /** Vagues spéciales où Boss Rush peut se déclencher */
  specialWaves: number[];
}

const BOSS_RUSH_CONFIG: BossRushConfig = {
  minBosses: 2,
  maxBosses: 3,
  delayBetweenBosses: 3000,
  rewardMultiplier: 3.0,
  bossHealthMultiplier: 0.7, // 30% de HP en moins
  specialWaves: [15, 25, 35, 45, 55],
};

/**
 * Types de boss disponibles pour le Boss Rush
 */
const AVAILABLE_BOSSES: BossType[] = ['abomination', 'patient_zero', 'colossus'];

/**
 * Événement Boss Rush
 * Enchaîne plusieurs boss successivement
 * Récompenses exceptionnelles à la fin
 */
export class BossRushEvent extends BaseSpecialEvent {
  public readonly name = 'Boss Rush';
  public readonly description = 'Plusieurs boss à vaincre - Récompenses exceptionnelles';
  public readonly type = SpecialEventType.BOSS_RUSH;
  public readonly duration: EventDuration = 'condition';

  public readonly config: SpecialEventConfig = {
    type: SpecialEventType.BOSS_RUSH,
    minWave: 15,
    probability: 1.0, // Se déclenche toujours sur les vagues spéciales
    cooldownWaves: 10,
    priority: 5, // Haute priorité
    canStack: false,
  };

  /** File d'attente des boss */
  private bossQueue: BossType[] = [];
  /** Boss actuellement actif */
  private currentBossIndex: number = 0;
  /** Nombre de boss vaincus */
  private bossesDefeated: number = 0;
  /** Total de boss pour cet événement */
  private totalBosses: number = 0;
  /** Timer pour le prochain boss */
  private nextBossTimer: Phaser.Time.TimerEvent | null = null;

  /**
   * Vérifie si l'événement peut être activé
   */
  public canActivate(scene: GameScene, waveNumber: number): boolean {
    // Boss Rush ne se déclenche que sur les vagues spéciales
    if (!BOSS_RUSH_CONFIG.specialWaves.includes(waveNumber)) {
      return false;
    }

    return super.canActivate(scene, waveNumber);
  }

  /**
   * Active l'événement Boss Rush
   */
  public activate(scene: GameScene): void {
    super.activate(scene);

    // Déterminer le nombre de boss
    this.totalBosses = Phaser.Math.Between(
      BOSS_RUSH_CONFIG.minBosses,
      BOSS_RUSH_CONFIG.maxBosses
    );

    // Sélectionner les boss
    this.bossQueue = this.selectBosses(this.totalBosses);
    this.currentBossIndex = 0;
    this.bossesDefeated = 0;

    console.log(`[BossRushEvent] Starting with ${this.totalBosses} bosses: ${this.bossQueue.join(', ')}`);

    // Annonce spéciale
    scene.events.emit('ui:announcement', {
      text: 'BOSS RUSH',
      subtext: `${this.totalBosses} boss à vaincre`,
      style: 'danger',
      duration: 4000,
    });

    // Effet dramatique
    scene.cameras.main.shake(500, 0.01);

    // Spawner le premier boss après un court délai
    scene.time.delayedCall(2000, () => {
      this.spawnNextBoss(scene);
    });
  }

  /**
   * Désactive l'événement
   */
  public deactivate(scene: GameScene): void {
    // Annuler le timer
    if (this.nextBossTimer) {
      this.nextBossTimer.destroy();
      this.nextBossTimer = null;
    }

    super.deactivate(scene);
  }

  /**
   * Sélectionne les boss pour le rush
   */
  private selectBosses(count: number): BossType[] {
    const selected: BossType[] = [];
    const available = [...AVAILABLE_BOSSES];

    // Mélanger la liste
    Phaser.Utils.Array.Shuffle(available);

    for (let i = 0; i < count && available.length > 0; i++) {
      // Prendre un boss de la liste mélangée
      const index = i % available.length;
      selected.push(available[index]);
    }

    return selected;
  }

  /**
   * Spawne le prochain boss
   */
  private spawnNextBoss(scene: GameScene): void {
    if (this.currentBossIndex >= this.bossQueue.length) {
      this.completeRush(scene);
      return;
    }

    const bossType = this.bossQueue[this.currentBossIndex];
    const bossFactory = scene.getBossFactory();

    // Déterminer la position de spawn
    const camera = scene.cameras.main;
    const spawnX = camera.centerX + Phaser.Math.Between(-100, 100);
    const spawnY = camera.centerY + Phaser.Math.Between(-100, 100);

    // Créer le boss
    const boss = bossFactory.create(bossType, spawnX, spawnY);

    if (boss) {
      // Appliquer la réduction de HP via le composant de santé
      const reducedHealth = Math.floor(boss.getMaxHealth() * BOSS_RUSH_CONFIG.bossHealthMultiplier);
      boss.healthComponent.setMaxHealth(reducedHealth);

      // Annonce du boss
      const bossNumber = this.currentBossIndex + 1;
      scene.events.emit('ui:announcement', {
        text: `BOSS ${bossNumber}/${this.totalBosses}`,
        subtext: boss.name,
        style: 'boss',
        duration: 2000,
      });

      // Démarrer l'animation d'entrée
      bossFactory.startBossEntrance();
    }
  }

  /**
   * Callback quand un boss est vaincu
   */
  public onBossDefeated(scene: GameScene): void {
    if (this.state !== EventState.ACTIVE) return;

    this.bossesDefeated++;
    this.currentBossIndex++;

    console.log(`[BossRushEvent] Boss defeated: ${this.bossesDefeated}/${this.totalBosses}`);

    // Vérifier si tous les boss sont vaincus
    if (this.bossesDefeated >= this.totalBosses) {
      this.completeRush(scene);
      return;
    }

    // Notification de progression
    const remaining = this.totalBosses - this.bossesDefeated;
    scene.events.emit('ui:notification', {
      text: `${remaining} BOSS RESTANT${remaining > 1 ? 'S' : ''}`,
      style: 'info',
      duration: 2000,
    });

    // Programmer le prochain boss
    this.nextBossTimer = scene.time.delayedCall(
      BOSS_RUSH_CONFIG.delayBetweenBosses,
      () => this.spawnNextBoss(scene),
      [],
      this
    );
  }

  /**
   * Termine le Boss Rush avec succès
   */
  private completeRush(scene: GameScene): void {
    console.log('[BossRushEvent] Boss Rush completed!');

    // Annonce de victoire
    scene.events.emit('ui:announcement', {
      text: 'BOSS RUSH COMPLÉTÉ!',
      subtext: 'Récompenses exceptionnelles',
      style: 'legendary',
      duration: 4000,
    });

    // Effet de victoire
    scene.cameras.main.flash(1000, 255, 215, 0); // Flash doré

    // Distribuer les récompenses
    this.giveRewards(scene);

    // Terminer l'événement
    this.state = EventState.ENDING;
  }

  /**
   * Distribue les récompenses du Boss Rush
   */
  private giveRewards(scene: GameScene): void {
    const dropSystem = scene.getDropSystem();
    const economySystem = scene.getEconomySystem();
    const player = scene.getPlayer();

    if (!player) return;

    // Bonus de points
    if (economySystem) {
      const baseBonus = 500 * this.totalBosses;
      const totalBonus = Math.floor(baseBonus * BOSS_RUSH_CONFIG.rewardMultiplier);
      economySystem.addPoints(totalBonus);

      scene.events.emit('ui:notification', {
        text: `+${totalBonus} POINTS`,
        style: 'economy',
        duration: 2000,
      });
    }

    // Drops multiples
    if (dropSystem) {
      const playerX = player.x;
      const playerY = player.y;

      // Spawner plusieurs drops de haute qualité
      for (let i = 0; i < this.totalBosses; i++) {
        const offsetX = Phaser.Math.Between(-50, 50);
        const offsetY = Phaser.Math.Between(-50, 50);

        // Chance de power-up pour chaque boss vaincu
        if (Math.random() < 0.5) {
          dropSystem.spawnDropDebug('powerUp', playerX + offsetX, playerY + offsetY);
        }

        // Soin garanti
        dropSystem.spawnDropDebug('healthMedium', playerX + offsetX * 2, playerY + offsetY * 2);
      }
    }

    // Soin partiel du joueur
    const healAmount = Math.floor(player.getMaxHealth() * 0.3);
    player.heal(healAmount);
  }

  /**
   * Callback quand la vague est terminée
   * Note: Boss Rush gère ses propres conditions de fin
   */
  public onWaveComplete(_scene: GameScene): void {
    // Ne pas terminer l'événement à la fin de vague
    // L'événement se termine quand tous les boss sont vaincus
  }

  /**
   * Récupère la progression du Boss Rush
   */
  public getProgress(): { defeated: number; total: number; current: BossType | null } {
    return {
      defeated: this.bossesDefeated,
      total: this.totalBosses,
      current: this.bossQueue[this.currentBossIndex] || null,
    };
  }

  /**
   * Réinitialise l'événement
   */
  public reset(): void {
    this.bossQueue = [];
    this.currentBossIndex = 0;
    this.bossesDefeated = 0;
    this.totalBosses = 0;
    this.nextBossTimer = null;
    super.reset();
  }
}
