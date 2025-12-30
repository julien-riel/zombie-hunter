/**
 * Phase 7.4 - OverheatedDoorEvent
 * Événement où une porte ignorée libère un mini-boss
 */

import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Door } from '@arena/Door';
import {
  BaseSpecialEvent,
  SpecialEventType,
  EventState,
  type SpecialEventConfig,
  type EventDuration,
} from './SpecialEvent';

/**
 * Configuration spécifique à la Porte Surchauffée
 */
interface OverheatedDoorConfig {
  /** Nombre de vagues d'inactivité avant surchauffe */
  inactiveWavesThreshold: number;
  /** Temps d'avertissement avant explosion (ms) */
  warningDuration: number;
  /** Bonus de stats pour le Tank enragé */
  enragedTankBonus: {
    speedMultiplier: number;
    damageMultiplier: number;
    healthMultiplier: number;
  };
  /** Couleur de l'effet de surchauffe */
  overheatColor: number;
}

const OVERHEATED_DOOR_CONFIG: OverheatedDoorConfig = {
  inactiveWavesThreshold: 3,
  warningDuration: 10000,
  enragedTankBonus: {
    speedMultiplier: 1.5,
    damageMultiplier: 1.25,
    healthMultiplier: 1.2,
  },
  overheatColor: 0xff4400,
};

/**
 * Suivi de l'état d'une porte pour la surchauffe
 */
interface DoorHeatState {
  doorId: string;
  inactiveWaves: number;
  isOverheating: boolean;
  warningStartTime: number;
  warningTween: Phaser.Tweens.Tween | null;
  warningGraphics: Phaser.GameObjects.Graphics | null;
}

/**
 * Événement Porte Surchauffée
 * Se déclenche si une porte reste inactive trop longtemps
 * Libère un Tank enragé si non barricadée à temps
 */
export class OverheatedDoorEvent extends BaseSpecialEvent {
  public readonly name = 'Porte Surchauffée';
  public readonly description = 'Une porte négligée menace d\'exploser';
  public readonly type = SpecialEventType.OVERHEATED_DOOR;
  public readonly duration: EventDuration = 'condition';

  public readonly config: SpecialEventConfig = {
    type: SpecialEventType.OVERHEATED_DOOR,
    minWave: 6,
    probability: 0.15,
    cooldownWaves: 6,
    priority: 1,
    canStack: false,
  };

  /** État de surchauffe de chaque porte */
  private doorStates: Map<string, DoorHeatState> = new Map();
  /** Porte actuellement en surchauffe */
  private overheatingDoor: Door | null = null;
  /** Timer d'explosion */
  private explosionTimer: Phaser.Time.TimerEvent | null = null;

  /**
   * Vérifie si l'événement peut être activé
   * Surcharge pour vérifier s'il y a une porte éligible
   */
  public canActivate(scene: GameScene, waveNumber: number): boolean {
    if (!super.canActivate(scene, waveNumber)) return false;

    // Vérifier s'il y a une porte éligible
    const eligibleDoor = this.findOverheatedDoor(scene);
    return eligibleDoor !== null;
  }

  /**
   * Active l'événement Porte Surchauffée
   */
  public activate(scene: GameScene): void {
    super.activate(scene);

    // Trouver la porte à surchauffer
    const door = this.findOverheatedDoor(scene);
    if (!door) {
      console.warn('[OverheatedDoorEvent] No eligible door found');
      this.state = EventState.INACTIVE;
      return;
    }

    this.overheatingDoor = door;

    // Initialiser l'état de la porte
    const state: DoorHeatState = {
      doorId: door.id,
      inactiveWaves: OVERHEATED_DOOR_CONFIG.inactiveWavesThreshold,
      isOverheating: true,
      warningStartTime: scene.time.now,
      warningTween: null,
      warningGraphics: null,
    };
    this.doorStates.set(door.id, state);

    // Démarrer l'effet visuel d'avertissement
    this.startOverheatWarning(scene, door, state);

    // Programmer l'explosion
    this.explosionTimer = scene.time.delayedCall(
      OVERHEATED_DOOR_CONFIG.warningDuration,
      () => this.checkExplosion(scene, door),
      [],
      this
    );

    // Écouter si la porte est barricadée
    scene.events.on('door:barricade', this.onDoorBarricade, this);
  }

  /**
   * Désactive l'événement
   */
  public deactivate(scene: GameScene): void {
    // Nettoyer les effets visuels
    for (const state of this.doorStates.values()) {
      if (state.warningTween) {
        state.warningTween.stop();
      }
      if (state.warningGraphics) {
        state.warningGraphics.destroy();
      }
    }
    this.doorStates.clear();

    // Annuler le timer d'explosion
    if (this.explosionTimer) {
      this.explosionTimer.destroy();
      this.explosionTimer = null;
    }

    this.overheatingDoor = null;

    // Retirer les listeners
    scene.events.off('door:barricade', this.onDoorBarricade, this);

    super.deactivate(scene);
  }

  /**
   * Mise à jour de l'événement
   */
  public update(scene: GameScene, _delta: number): void {
    if (this.state !== EventState.ACTIVE) return;
    if (!this.overheatingDoor) return;

    const state = this.doorStates.get(this.overheatingDoor.id);
    if (!state) return;

    // Mettre à jour l'intensité de l'avertissement
    const elapsed = scene.time.now - state.warningStartTime;
    const progress = Math.min(elapsed / OVERHEATED_DOOR_CONFIG.warningDuration, 1);

    // Intensifier l'effet visuel
    this.updateOverheatIntensity(scene, this.overheatingDoor, state, progress);
  }

  /**
   * Trouve une porte éligible pour la surchauffe
   */
  private findOverheatedDoor(scene: GameScene): Door | null {
    const doors = scene.getArena().getDoors();

    // Chercher une porte inactive et non barricadée
    for (const door of doors) {
      if (!door.isActive() && !door.hasBarricade() && !door.isDoorDestroyed()) {
        return door;
      }
    }

    // Sinon, chercher une porte active mais non barricadée
    for (const door of doors) {
      if (door.isActive() && !door.hasBarricade() && !door.isDoorDestroyed()) {
        return door;
      }
    }

    return null;
  }

  /**
   * Démarre l'avertissement de surchauffe
   */
  private startOverheatWarning(scene: GameScene, door: Door, state: DoorHeatState): void {
    // Créer les graphiques d'avertissement
    state.warningGraphics = scene.add.graphics();
    state.warningGraphics.setDepth(100);

    // Animation de pulsation
    state.warningTween = scene.tweens.add({
      targets: { alpha: 0.3 },
      alpha: 0.8,
      duration: 500,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        if (!state.warningGraphics) return;
        const alpha = tween.getValue() as number;
        state.warningGraphics.clear();
        state.warningGraphics.fillStyle(OVERHEATED_DOOR_CONFIG.overheatColor, alpha);
        state.warningGraphics.fillCircle(door.x, door.y, 40);
      },
    });

    // Son d'avertissement
    if (scene.sound.get('door_overheat_warning')) {
      scene.sound.play('door_overheat_warning', { loop: true });
    }

    // Notification au joueur
    scene.events.emit('ui:notification', {
      text: '⚠ PORTE EN SURCHAUFFE',
      subtext: 'Barricadez-la rapidement!',
      style: 'danger',
      duration: 5000,
    });
  }

  /**
   * Met à jour l'intensité de l'effet de surchauffe
   */
  private updateOverheatIntensity(
    scene: GameScene,
    door: Door,
    state: DoorHeatState,
    progress: number
  ): void {
    if (!state.warningGraphics) return;

    // Augmenter la taille et l'intensité du cercle
    const baseRadius = 40;
    const maxRadius = 80;
    const currentRadius = baseRadius + (maxRadius - baseRadius) * progress;

    // Changer la couleur (orange -> rouge vif)
    const g = Math.floor(68 * (1 - progress));
    const dynamicColor = (255 << 16) | (g << 8) | 0;

    // Dessiner l'effet de surchauffe dynamique
    state.warningGraphics.clear();
    state.warningGraphics.fillStyle(dynamicColor, 0.5 + progress * 0.3);
    state.warningGraphics.fillCircle(door.x, door.y, currentRadius);

    // Ajouter des particules à haute intensité
    if (progress > 0.8) {
      this.emitHeatParticles(scene, door.x, door.y);
    }
  }

  /**
   * Émet des particules de chaleur
   */
  private emitHeatParticles(scene: GameScene, x: number, y: number): void {
    // Créer des particules simples
    const particle = scene.add.circle(
      x + Phaser.Math.Between(-20, 20),
      y + Phaser.Math.Between(-20, 20),
      Phaser.Math.Between(2, 5),
      OVERHEATED_DOOR_CONFIG.overheatColor,
      0.8
    );
    particle.setDepth(101);

    scene.tweens.add({
      targets: particle,
      y: particle.y - 30,
      alpha: 0,
      duration: 500,
      onComplete: () => particle.destroy(),
    });
  }

  /**
   * Vérifie si la porte doit exploser
   */
  private checkExplosion(scene: GameScene, door: Door): void {
    // Vérifier si la porte a été barricadée entre temps
    if (door.hasBarricade()) {
      console.log('[OverheatedDoorEvent] Door was barricaded in time!');
      this.preventExplosion(scene);
      return;
    }

    // Exploser et libérer le mini-boss
    this.releaseMiniBoss(scene, door);
  }

  /**
   * Empêche l'explosion (porte barricadée à temps)
   */
  private preventExplosion(scene: GameScene): void {
    scene.events.emit('ui:announcement', {
      text: 'SURCHAUFFE ÉVITÉE',
      subtext: 'Barricade installée à temps',
      style: 'success',
      duration: 2000,
    });

    // Terminer l'événement
    this.state = EventState.ENDING;
  }

  /**
   * Libère le Tank enragé
   */
  private releaseMiniBoss(scene: GameScene, door: Door): void {
    console.log('[OverheatedDoorEvent] Releasing enraged Tank!');

    // Effet d'explosion
    scene.cameras.main.shake(500, 0.02);
    scene.cameras.main.flash(200, 255, 100, 0);

    // Forcer l'ouverture de la porte
    door.activate();

    // Créer un Tank enragé
    const spawnPos = door.getSpawnPosition();
    const zombieFactory = scene.getZombieFactory();

    // Créer le Tank
    const tank = zombieFactory.create('tank', spawnPos.x, spawnPos.y);
    if (tank) {
      // Modifier les stats (si le zombie a ces méthodes)
      // Note: bonus de OVERHEATED_DOOR_CONFIG.enragedTankBonus appliqué via setEnraged
      if ('setEnraged' in tank && typeof tank.setEnraged === 'function') {
        (tank as { setEnraged: (enraged: boolean) => void }).setEnraged(true);
      }

      // Teinte rouge pour indiquer l'enragement
      tank.setTint(0xff4444);

      // Notification
      scene.events.emit('ui:announcement', {
        text: 'TANK ENRAGÉ',
        subtext: 'La porte a explosé!',
        style: 'danger',
        duration: 3000,
      });
    }

    // Terminer l'événement
    this.state = EventState.ENDING;
  }

  /**
   * Callback quand une porte est barricadée
   */
  private onDoorBarricade = (data: { doorId: string }): void => {
    if (!this.overheatingDoor) return;

    // Vérifier si c'est la porte en surchauffe
    if (data.doorId === this.overheatingDoor.id) {
      this.preventExplosion(this.overheatingDoor.scene as GameScene);
    }
  };

  /**
   * Callback quand la vague est terminée
   */
  public onWaveComplete(_scene: GameScene): void {
    // L'événement continue jusqu'à ce que la porte soit barricadée ou explose
    // Ne rien faire ici
  }

  /**
   * Réinitialise l'événement
   */
  public reset(): void {
    this.doorStates.clear();
    this.overheatingDoor = null;
    this.explosionTimer = null;
    super.reset();
  }
}
