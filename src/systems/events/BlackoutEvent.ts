/**
 * Phase 7.4 - BlackoutEvent
 * Événement qui réduit drastiquement la visibilité
 */

import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import {
  BaseSpecialEvent,
  SpecialEventType,
  EventState,
  type SpecialEventConfig,
  type EventDuration,
} from './SpecialEvent';

/**
 * Configuration spécifique au Blackout
 */
interface BlackoutConfig {
  /** Rayon de lumière autour du joueur (px) */
  playerLightRadius: number;
  /** Intensité de l'obscurité (0-1) */
  darknessAlpha: number;
  /** Activer les yeux lumineux des zombies */
  glowingEyes: boolean;
  /** Rayon de lumière temporaire du lance-flammes */
  flamethrowerLightRadius: number;
  /** Durée de la lumière temporaire (ms) */
  temporaryLightDuration: number;
}

const BLACKOUT_CONFIG: BlackoutConfig = {
  playerLightRadius: 150,
  darknessAlpha: 0.92,
  glowingEyes: true,
  flamethrowerLightRadius: 200,
  temporaryLightDuration: 500,
};

/**
 * Événement Blackout
 * Réduit la visibilité avec un cercle de lumière autour du joueur
 * Les yeux des zombies brillent dans l'obscurité
 */
export class BlackoutEvent extends BaseSpecialEvent {
  public readonly name = 'Blackout';
  public readonly description = 'Visibilité réduite - Les yeux brillent dans le noir';
  public readonly type = SpecialEventType.BLACKOUT;
  public readonly duration: EventDuration = 'wave';

  public readonly config: SpecialEventConfig = {
    type: SpecialEventType.BLACKOUT,
    minWave: 4,
    probability: 0.25,
    cooldownWaves: 4,
    priority: 2,
    canStack: false,
  };

  /** Masque d'obscurité */
  private darkness: Phaser.GameObjects.Graphics | null = null;
  /** Masque de lumière (render texture) */
  private lightMask: Phaser.GameObjects.RenderTexture | null = null;
  /** Cercle de lumière du joueur */
  private playerLight: Phaser.GameObjects.Graphics | null = null;
  /** Yeux lumineux des zombies */
  private glowingEyesMap: Map<string, Phaser.GameObjects.Graphics> = new Map();
  /** Lumières temporaires (lance-flammes, tesla) */
  private temporaryLights: Phaser.GameObjects.Graphics[] = [];

  /**
   * Active l'événement Blackout
   */
  public activate(scene: GameScene): void {
    super.activate(scene);

    // Créer le système d'éclairage
    this.createDarknessOverlay(scene);
    this.createPlayerLight(scene);

    // Activer les yeux lumineux pour les zombies existants
    if (BLACKOUT_CONFIG.glowingEyes) {
      this.enableGlowingEyes(scene);
    }

    // Écouter les armes qui créent de la lumière
    scene.events.on('weaponFired', this.onWeaponFired, this);

    // Écouter les nouveaux zombies pour ajouter les yeux lumineux
    scene.events.on('zombieSpawned', this.onZombieSpawned, this);
  }

  /**
   * Désactive l'événement Blackout
   */
  public deactivate(scene: GameScene): void {
    // Nettoyer les graphiques
    this.darkness?.destroy();
    this.darkness = null;

    this.lightMask?.destroy();
    this.lightMask = null;

    this.playerLight?.destroy();
    this.playerLight = null;

    // Nettoyer les yeux lumineux
    for (const eyes of this.glowingEyesMap.values()) {
      eyes.destroy();
    }
    this.glowingEyesMap.clear();

    // Nettoyer les lumières temporaires
    for (const light of this.temporaryLights) {
      light.destroy();
    }
    this.temporaryLights = [];

    // Retirer les listeners
    scene.events.off('weaponFired', this.onWeaponFired, this);
    scene.events.off('zombieSpawned', this.onZombieSpawned, this);

    super.deactivate(scene);
  }

  /**
   * Mise à jour du blackout
   */
  public update(scene: GameScene, _delta: number): void {
    if (this.state !== EventState.ACTIVE) return;

    const player = scene.getPlayer();
    if (!player) return;

    // Mettre à jour la position de la lumière du joueur
    this.updatePlayerLight(scene, player.x, player.y);

    // Mettre à jour les yeux lumineux des zombies
    this.updateGlowingEyes(scene);

    // Redessiner le masque d'obscurité
    this.redrawDarkness(scene);
  }

  /**
   * Crée l'overlay d'obscurité
   */
  private createDarknessOverlay(scene: GameScene): void {
    // Créer un graphics pour l'obscurité
    this.darkness = scene.add.graphics();
    this.darkness.setScrollFactor(0);
    this.darkness.setDepth(900); // Sous le HUD mais au-dessus du jeu
  }

  /**
   * Crée la lumière du joueur
   */
  private createPlayerLight(scene: GameScene): void {
    this.playerLight = scene.add.graphics();
    this.playerLight.setDepth(901);
  }

  /**
   * Met à jour la position de la lumière du joueur
   */
  private updatePlayerLight(_scene: GameScene, x: number, y: number): void {
    if (!this.playerLight) return;

    this.playerLight.clear();

    // Dessiner un gradient de lumière
    const radius = BLACKOUT_CONFIG.playerLightRadius;
    const steps = 10;

    for (let i = steps; i >= 0; i--) {
      const r = (radius * i) / steps;
      const alpha = 1 - (i / steps) * 0.8;
      this.playerLight.fillStyle(0xffffcc, alpha * 0.1);
      this.playerLight.fillCircle(x, y, r);
    }
  }

  /**
   * Redessine le masque d'obscurité
   */
  private redrawDarkness(scene: GameScene): void {
    if (!this.darkness) return;

    const camera = scene.cameras.main;
    const player = scene.getPlayer();

    this.darkness.clear();

    // Remplir tout l'écran d'obscurité
    this.darkness.fillStyle(0x000000, BLACKOUT_CONFIG.darknessAlpha);
    this.darkness.fillRect(0, 0, camera.width, camera.height);

    // Découper les zones de lumière (blend mode)
    this.darkness.setBlendMode(Phaser.BlendModes.ERASE);

    // Lumière du joueur
    if (player) {
      const screenX = player.x - camera.scrollX;
      const screenY = player.y - camera.scrollY;

      // Gradient de lumière
      const radius = BLACKOUT_CONFIG.playerLightRadius;
      for (let i = 0; i < 5; i++) {
        const r = radius * (1 - i * 0.15);
        const alpha = 0.3 - i * 0.05;
        this.darkness.fillStyle(0xffffff, alpha);
        this.darkness.fillCircle(screenX, screenY, r);
      }
    }

    // Lumières temporaires
    for (const light of this.temporaryLights) {
      if (light.active) {
        const screenX = light.x - camera.scrollX;
        const screenY = light.y - camera.scrollY;
        this.darkness.fillStyle(0xffffff, 0.4);
        this.darkness.fillCircle(screenX, screenY, BLACKOUT_CONFIG.flamethrowerLightRadius);
      }
    }

    // Réinitialiser le blend mode
    this.darkness.setBlendMode(Phaser.BlendModes.NORMAL);
  }

  /**
   * Active les yeux lumineux pour tous les zombies
   */
  private enableGlowingEyes(scene: GameScene): void {
    const zombies = scene.getActiveZombies();
    for (const zombie of zombies) {
      this.addGlowingEyes(scene, zombie);
    }
  }

  /**
   * Ajoute des yeux lumineux à un zombie
   */
  private addGlowingEyes(scene: GameScene, zombie: { x: number; y: number; name?: string; zombieType?: string }): void {
    const id = zombie.name || `zombie_${zombie.x}_${zombie.y}`;
    if (this.glowingEyesMap.has(id)) return;

    const eyes = scene.add.graphics();
    eyes.setDepth(902);
    this.glowingEyesMap.set(id, eyes);
  }

  /**
   * Met à jour les yeux lumineux des zombies
   */
  private updateGlowingEyes(scene: GameScene): void {
    const zombies = scene.getActiveZombies();
    const activeIds = new Set<string>();

    for (const zombie of zombies) {
      const id = zombie.name || `zombie_${zombie.x}_${zombie.y}`;
      activeIds.add(id);

      // Ajouter si nouveau
      if (!this.glowingEyesMap.has(id)) {
        this.addGlowingEyes(scene, zombie);
      }

      // Mettre à jour la position
      const eyes = this.glowingEyesMap.get(id);
      if (eyes) {
        eyes.clear();

        // Déterminer la couleur selon le type de zombie
        let eyeColor = 0xff0000; // Rouge par défaut
        if (zombie.zombieType === 'spitter') eyeColor = 0x00ff00; // Vert
        else if (zombie.zombieType === 'necromancer') eyeColor = 0x9900ff; // Violet
        else if (zombie.zombieType === 'invisible') eyeColor = 0x00ffff; // Cyan

        // Dessiner les yeux
        const eyeSpacing = 6;
        const eyeSize = 3;

        eyes.fillStyle(eyeColor, 0.9);
        eyes.fillCircle(zombie.x - eyeSpacing / 2, zombie.y - 8, eyeSize);
        eyes.fillCircle(zombie.x + eyeSpacing / 2, zombie.y - 8, eyeSize);

        // Glow effect
        eyes.fillStyle(eyeColor, 0.3);
        eyes.fillCircle(zombie.x - eyeSpacing / 2, zombie.y - 8, eyeSize * 2);
        eyes.fillCircle(zombie.x + eyeSpacing / 2, zombie.y - 8, eyeSize * 2);
      }
    }

    // Supprimer les yeux des zombies morts
    for (const [id, eyes] of this.glowingEyesMap.entries()) {
      if (!activeIds.has(id)) {
        eyes.destroy();
        this.glowingEyesMap.delete(id);
      }
    }
  }

  /**
   * Callback quand une arme est tirée
   */
  private onWeaponFired = (data: { weapon: string; x?: number; y?: number }): void => {
    // Le lance-flammes et le tesla créent de la lumière temporaire
    if (data.weapon === 'flamethrower' || data.weapon === 'tesla') {
      this.createTemporaryLight(data.x ?? 0, data.y ?? 0);
    }
  };

  /**
   * Callback quand un zombie spawn
   */
  private onZombieSpawned = (_zombie: { x: number; y: number; name?: string }): void => {
    // Les yeux lumineux seront ajoutés au prochain update
  };

  /**
   * Crée une lumière temporaire
   */
  private createTemporaryLight(_x: number, _y: number): void {
    // Limiter le nombre de lumières temporaires
    if (this.temporaryLights.length > 10) {
      const oldLight = this.temporaryLights.shift();
      oldLight?.destroy();
    }

    // Note: Les lumières sont utilisées dans redrawDarkness
    // On pourrait ajouter un effet visuel ici si nécessaire
  }

  /**
   * Réinitialise l'événement
   */
  public reset(): void {
    this.glowingEyesMap.clear();
    this.temporaryLights = [];
    super.reset();
  }
}
