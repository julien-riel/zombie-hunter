/**
 * BossFactory - Phase 7.3
 *
 * Factory pour créer et gérer les boss.
 * Gère le spawn, l'entrée en scène et la coordination avec le système de vagues.
 */

import type { GameScene } from '@scenes/GameScene';
import type { BossType } from '@/types/entities';
import { Boss } from './Boss';
import { BossHealthBar } from './BossHealthBar';
import { Abomination } from './Abomination';
import { PatientZero } from './PatientZero';
import { ColossusArmored } from './ColossusArmored';

/**
 * Constructeur de boss
 */
type BossConstructor = new (scene: GameScene, x: number, y: number) => Boss;

/**
 * Mapping des types de boss vers leurs classes
 */
const BOSS_CLASSES: Record<BossType, BossConstructor> = {
  abomination: Abomination,
  patient_zero: PatientZero,
  colossus: ColossusArmored,
};

/**
 * Ordre de spawn des boss par vague
 */
const BOSS_WAVE_ORDER: BossType[] = ['abomination', 'patient_zero', 'colossus'];

/**
 * Factory pour créer les boss
 */
export class BossFactory {
  private scene: GameScene;

  /** Boss actif actuel */
  private activeBoss: Boss | null = null;

  /** Barre de vie du boss actif */
  private healthBar: BossHealthBar | null = null;

  /** Compteur de boss tués */
  private bossesKilled: number = 0;

  constructor(scene: GameScene) {
    this.scene = scene;

    // Écouter les événements de boss
    this.scene.events.on('bossDeath', this.onBossDeath, this);
  }

  /**
   * Crée un boss d'un type spécifique
   */
  public create(type: BossType, x: number, y: number): Boss | null {
    const BossClass = BOSS_CLASSES[type];

    if (!BossClass) {
      console.warn(`[BossFactory] Type de boss inconnu: ${type}`);
      return null;
    }

    // Désactiver le boss actif s'il existe
    if (this.activeBoss) {
      console.warn('[BossFactory] Un boss est déjà actif');
      return null;
    }

    // Créer le boss
    const boss = new BossClass(this.scene, x, y);
    this.activeBoss = boss;

    // Créer la barre de vie
    this.healthBar = new BossHealthBar(this.scene, boss);

    console.log(`[BossFactory] Boss créé: ${type} à (${x}, ${y})`);

    return boss;
  }

  /**
   * Crée un boss pour une vague spécifique
   */
  public createForWave(waveNumber: number, x: number, y: number): Boss | null {
    // Déterminer le type de boss pour cette vague
    const bossType = this.getBossTypeForWave(waveNumber);

    if (!bossType) {
      return null;
    }

    return this.create(bossType, x, y);
  }

  /**
   * Détermine le type de boss pour une vague donnée
   */
  public getBossTypeForWave(waveNumber: number): BossType | null {
    // Les boss apparaissent toutes les 5 vagues
    if (waveNumber % 5 !== 0 || waveNumber === 0) {
      return null;
    }

    // Calculer l'index du boss
    const bossIndex = Math.floor(waveNumber / 5) - 1;
    const cycledIndex = bossIndex % BOSS_WAVE_ORDER.length;

    return BOSS_WAVE_ORDER[cycledIndex];
  }

  /**
   * Vérifie si une vague devrait avoir un boss
   */
  public isBossWave(waveNumber: number): boolean {
    return waveNumber % 5 === 0 && waveNumber > 0;
  }

  /**
   * Démarre la séquence d'entrée du boss
   */
  public async startBossEntrance(): Promise<void> {
    if (!this.activeBoss) return;

    // Annoncer l'arrivée du boss
    this.scene.events.emit('ui:announcement', {
      text: 'BOSS !',
      subtext: this.activeBoss.bossName,
      style: 'danger',
      duration: 2000,
    });

    // Attendre un moment puis démarrer l'entrée
    await new Promise<void>((resolve) => {
      this.scene.time.delayedCall(1000, async () => {
        if (this.activeBoss) {
          await this.activeBoss.startEntrance();
        }
        resolve();
      });
    });
  }

  /**
   * Callback quand un boss meurt
   */
  private onBossDeath = (data: { boss: Boss; scoreValue: number }): void => {
    if (data.boss === this.activeBoss) {
      this.bossesKilled++;

      // Nettoyer la barre de vie
      if (this.healthBar) {
        this.healthBar.destroy();
        this.healthBar = null;
      }

      // Libérer le boss actif
      this.activeBoss = null;

      // Émettre l'événement de victoire contre le boss
      this.scene.events.emit('bossDefeated', {
        type: data.boss.bossType,
        scoreValue: data.scoreValue,
        totalBossesKilled: this.bossesKilled,
      });
    }
  };

  /**
   * Récupère le boss actif
   */
  public getActiveBoss(): Boss | null {
    return this.activeBoss;
  }

  /**
   * Vérifie s'il y a un boss actif
   */
  public hasBoss(): boolean {
    return this.activeBoss !== null && this.activeBoss.active;
  }

  /**
   * Récupère le nombre de boss tués
   */
  public getBossesKilled(): number {
    return this.bossesKilled;
  }

  /**
   * Force la mort du boss actif (debug)
   */
  public killActiveBoss(): void {
    if (this.activeBoss && this.activeBoss.active) {
      (this.activeBoss as any).die();
    }
  }

  /**
   * Inflige des dégâts au boss actif (debug)
   */
  public damageActiveBoss(amount: number): void {
    if (this.activeBoss && this.activeBoss.active) {
      this.activeBoss.takeDamage(amount);
    }
  }

  /**
   * Met à jour le boss actif
   */
  public update(time: number, delta: number): void {
    if (this.activeBoss && this.activeBoss.active) {
      this.activeBoss.update(time, delta);
    }

    if (this.healthBar) {
      this.healthBar.update(delta);
    }
  }

  /**
   * Réinitialise la factory
   */
  public reset(): void {
    if (this.activeBoss) {
      this.activeBoss.deactivate();
      this.activeBoss.destroy();
      this.activeBoss = null;
    }

    if (this.healthBar) {
      this.healthBar.destroy();
      this.healthBar = null;
    }

    this.bossesKilled = 0;
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.scene.events.off('bossDeath', this.onBossDeath, this);
    this.reset();
  }
}
