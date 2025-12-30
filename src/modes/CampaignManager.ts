/**
 * Gestionnaire du mode Campagne (Phase 8.2)
 *
 * Gère la progression des niveaux de campagne,
 * les objectifs et les conditions de victoire.
 */

import Phaser from 'phaser';
import type { CampaignLevel, Objective, ObjectiveType } from '@/types/modes';
import { getCampaignLevel, calculateStars, getNextLevel } from '@config/campaign';
import { SaveManager } from '@managers/SaveManager';

/**
 * État d'un objectif en cours
 */
interface ObjectiveState extends Objective {
  current: number;
  completed: boolean;
}

/**
 * Configuration d'initialisation du CampaignManager
 */
export interface CampaignManagerConfig {
  levelId: string;
}

/**
 * Gestionnaire du mode campagne
 */
export class CampaignManager {
  private scene: Phaser.Scene;
  private level: CampaignLevel | null = null;
  private objectives: ObjectiveState[] = [];
  private isActive: boolean = false;
  private startTime: number = 0;
  private totalScore: number = 0;
  private totalKills: number = 0;
  private collectibles: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Initialise le manager avec un niveau
   */
  public initialize(config: CampaignManagerConfig): boolean {
    const level = getCampaignLevel(config.levelId);
    if (!level) {
      console.error(`[CampaignManager] Level ${config.levelId} not found`);
      return false;
    }

    this.level = level;
    this.objectives = level.objectives.map((obj) => ({
      ...obj,
      current: 0,
      completed: false,
    }));
    this.isActive = true;
    this.startTime = Date.now();
    this.totalScore = 0;
    this.totalKills = 0;
    this.collectibles = 0;

    console.log(`[CampaignManager] Initialized level: ${level.name}`);
    this.setupEventListeners();

    return true;
  }

  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Écouter les kills de zombies
    this.scene.events.on('zombieDeath', this.onZombieKilled, this);

    // Écouter les collectibles ramassés
    this.scene.events.on('collectiblePickup', this.onCollectiblePickup, this);

    // Écouter la défaite d'un boss
    this.scene.events.on('bossDefeated', this.onBossDefeated, this);

    // Écouter les mises à jour de score
    this.scene.events.on('scoreUpdate', this.onScoreUpdate, this);

    // Écouter la fin de vague
    this.scene.events.on('waveComplete', this.onWaveComplete, this);

    // Écouter la fin de toutes les vagues (Phase 8.2)
    this.scene.events.on('allWavesCompleted', this.onAllWavesCompleted, this);
  }

  /**
   * Nettoie les écouteurs d'événements
   */
  private cleanupEventListeners(): void {
    this.scene.events.off('zombieDeath', this.onZombieKilled, this);
    this.scene.events.off('collectiblePickup', this.onCollectiblePickup, this);
    this.scene.events.off('bossDefeated', this.onBossDefeated, this);
    this.scene.events.off('scoreUpdate', this.onScoreUpdate, this);
    this.scene.events.off('waveComplete', this.onWaveComplete, this);
    this.scene.events.off('allWavesCompleted', this.onAllWavesCompleted, this);
  }

  /**
   * Obtient le niveau actuel
   */
  public getLevel(): CampaignLevel | null {
    return this.level;
  }

  /**
   * Obtient les objectifs avec leur état
   */
  public getObjectives(): ObjectiveState[] {
    return this.objectives;
  }

  /**
   * Obtient le nombre de vagues maximum pour ce niveau
   */
  public getMaxWaves(): number {
    return this.level?.waves || 0;
  }

  /**
   * Obtient le texte narratif du début
   */
  public getNarrative(): string {
    return this.level?.narrative || '';
  }

  /**
   * Obtient le texte narratif de fin
   */
  public getNarrativeEnd(): string {
    return this.level?.narrativeEnd || '';
  }

  /**
   * Gestion d'un zombie tué
   */
  private onZombieKilled = (): void => {
    this.totalKills++;
    this.updateObjective('kill', 1);
  };

  /**
   * Gestion d'un collectible ramassé
   */
  private onCollectiblePickup = (): void => {
    this.collectibles++;
    this.updateObjective('collect', 1);
  };

  /**
   * Gestion de la défaite d'un boss
   */
  private onBossDefeated = (): void => {
    this.updateObjective('boss', 1);
  };

  /**
   * Gestion de la mise à jour du score
   */
  private onScoreUpdate = (score: number): void => {
    this.totalScore = score;
  };

  /**
   * Gestion de la fin d'une vague
   */
  private onWaveComplete = (wave: number): void => {
    this.updateObjective('survive', wave);

    // Note: la vérification de victoire est faite par onAllWavesCompleted
  };

  /**
   * Gestion de la fin de toutes les vagues (Phase 8.2)
   * Appelé par WaveSystem quand maxWaves est atteint
   */
  private onAllWavesCompleted = (wave: number): void => {
    console.log(`[CampaignManager] All waves completed (wave ${wave})`);

    // Marquer l'objectif de survie comme complet
    this.updateObjective('survive', wave);

    // Forcer la vérification de victoire
    this.checkVictory();
  };

  /**
   * Met à jour un objectif
   */
  private updateObjective(type: ObjectiveType, value: number): void {
    for (const objective of this.objectives) {
      if (objective.type === type && !objective.completed) {
        if (type === 'survive') {
          // Pour survie, on met la valeur directement (c'est le numéro de vague)
          objective.current = value;
        } else {
          // Pour les autres, on incrémente
          objective.current += value;
        }

        // Vérifier si l'objectif est atteint
        if (objective.current >= objective.target) {
          objective.completed = true;
          this.scene.events.emit('objectiveCompleted', objective);
          console.log(`[CampaignManager] Objective completed: ${objective.description}`);
        }

        // Émettre une mise à jour
        this.scene.events.emit('objectiveProgress', objective);
      }
    }

    // Vérifier la victoire après chaque mise à jour
    this.checkVictory();
  }

  /**
   * Vérifie les conditions de victoire
   */
  private checkVictory(): void {
    if (!this.isActive) return;

    // Vérifier si tous les objectifs sont complétés
    const allCompleted = this.objectives.every((obj) => obj.completed);

    if (allCompleted) {
      this.onVictory();
    }
  }

  /**
   * Vérifie la condition de temps (pour les objectifs de temps)
   */
  public checkTimeObjective(): void {
    const elapsed = this.getElapsedTime();

    for (const objective of this.objectives) {
      if (objective.type === 'time' && !objective.completed) {
        // Pour les objectifs de temps, current = temps écoulé
        objective.current = elapsed;

        // L'objectif de temps est échoué si on dépasse le temps
        if (elapsed > objective.target) {
          // Cet objectif ne peut plus être complété
          this.scene.events.emit('objectiveFailed', objective);
        }
      }
    }
  }

  /**
   * Gestion de la victoire
   */
  private onVictory(): void {
    if (!this.isActive || !this.level) return;
    this.isActive = false;

    const elapsed = this.getElapsedTime();
    const stars = calculateStars(this.level.id, this.totalScore);

    // Sauvegarder la progression
    const saveManager = SaveManager.getInstance();
    saveManager.completeLevel(this.level.id, stars);
    saveManager.updateCampaignLevelResult(this.level.id, {
      stars,
      score: this.totalScore,
      completed: true,
    });

    // Appliquer les récompenses
    if (this.level.rewards) {
      saveManager.addXP(this.level.rewards.xp);

      if (this.level.rewards.unlocks) {
        for (const unlock of this.level.rewards.unlocks) {
          if (unlock.includes('weapon') || unlock === 'shotgun' || unlock === 'smg' || unlock === 'plasma_rifle') {
            saveManager.unlockWeapon(unlock);
          } else {
            saveManager.unlockCharacter(unlock);
          }
        }
      }
    }

    saveManager.save();

    // Émettre l'événement de victoire
    this.scene.events.emit('campaignVictory', {
      levelId: this.level.id,
      score: this.totalScore,
      stars,
      time: elapsed,
      kills: this.totalKills,
      xpEarned: this.level.rewards?.xp || 0,
      nextLevel: getNextLevel(this.level.id),
    });

    console.log(`[CampaignManager] Victory! Stars: ${stars}, Score: ${this.totalScore}`);
  }

  /**
   * Gestion de la défaite
   */
  public onDefeat(): void {
    if (!this.isActive || !this.level) return;
    this.isActive = false;

    const elapsed = this.getElapsedTime();

    // Émettre l'événement de défaite
    this.scene.events.emit('campaignDefeat', {
      levelId: this.level.id,
      score: this.totalScore,
      time: elapsed,
      kills: this.totalKills,
      objectivesCompleted: this.objectives.filter((o) => o.completed).length,
    });

    console.log(`[CampaignManager] Defeat. Score: ${this.totalScore}`);
  }

  /**
   * Obtient le temps écoulé en secondes
   */
  public getElapsedTime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Vérifie si le mode campagne est actif
   */
  public isActiveCampaign(): boolean {
    return this.isActive;
  }

  /**
   * Obtient le score actuel
   */
  public getScore(): number {
    return this.totalScore;
  }

  /**
   * Obtient le nombre de kills
   */
  public getKills(): number {
    return this.totalKills;
  }

  /**
   * Détruit le manager
   */
  public destroy(): void {
    this.cleanupEventListeners();
    this.isActive = false;
    this.level = null;
    this.objectives = [];
  }
}
