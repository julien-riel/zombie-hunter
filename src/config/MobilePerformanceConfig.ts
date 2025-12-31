import { DeviceDetector } from '@utils/DeviceDetector';

/**
 * Configuration des paramètres de performance pour mobile
 *
 * Phase 5 - Optimisations:
 * - Réduction du nombre de zombies simultanés
 * - Réduction de la taille des pools
 * - Réduction des effets visuels
 */
export interface PerformanceSettings {
  // Pools
  maxZombies: number;
  bulletPoolSize: number;
  bulletPoolPrewarm: number;
  acidSpitPoolSize: number;
  flamePoolSize: number;

  // Effets visuels
  particleQuality: 'high' | 'medium' | 'low';
  enableShadows: boolean;
  enableScreenShake: boolean;
  maxCorpses: number;

  // Flow Field
  flowFieldUpdateInterval: number;
  flowFieldMaxIterations: number;

  // HUD
  showDetailedStats: boolean;
}

/**
 * Paramètres desktop (haute performance)
 */
const DESKTOP_SETTINGS: PerformanceSettings = {
  maxZombies: 100,
  bulletPoolSize: 100,
  bulletPoolPrewarm: 50,
  acidSpitPoolSize: 50,
  flamePoolSize: 30,

  particleQuality: 'high',
  enableShadows: true,
  enableScreenShake: true,
  maxCorpses: 50,

  flowFieldUpdateInterval: 200,
  flowFieldMaxIterations: 150,

  showDetailedStats: true,
};

/**
 * Paramètres tablette (performance moyenne)
 */
const TABLET_SETTINGS: PerformanceSettings = {
  maxZombies: 70,
  bulletPoolSize: 70,
  bulletPoolPrewarm: 35,
  acidSpitPoolSize: 35,
  flamePoolSize: 20,

  particleQuality: 'medium',
  enableShadows: true,
  enableScreenShake: true,
  maxCorpses: 30,

  flowFieldUpdateInterval: 300,
  flowFieldMaxIterations: 100,

  showDetailedStats: false,
};

/**
 * Paramètres mobile (basse consommation)
 */
const MOBILE_SETTINGS: PerformanceSettings = {
  maxZombies: 50,
  bulletPoolSize: 30,
  bulletPoolPrewarm: 15,
  acidSpitPoolSize: 20,
  flamePoolSize: 15,

  particleQuality: 'low',
  enableShadows: false,
  enableScreenShake: false,
  maxCorpses: 15,

  flowFieldUpdateInterval: 400,
  flowFieldMaxIterations: 75,

  showDetailedStats: false,
};

/**
 * Configuration des contrôles tactiles
 */
export interface TouchControlSettings {
  // Joysticks
  joystickSize: number;
  stickSize: number;
  joystickDeadZone: number;

  // Boutons
  buttonSize: number;
  smallButtonSize: number;

  // Marges et espacement
  margin: number;

  // Opacité
  idleAlpha: number;
  activeAlpha: number;

  // Haptic feedback
  enableHaptic: boolean;
  hapticIntensityMs: number;
}

/**
 * Paramètres des contrôles tactiles desktop (non utilisés mais pour référence)
 */
const DESKTOP_TOUCH_SETTINGS: TouchControlSettings = {
  joystickSize: 75,
  stickSize: 30,
  joystickDeadZone: 0.15,

  buttonSize: 35,
  smallButtonSize: 25,

  margin: 20,

  idleAlpha: 0.6,
  activeAlpha: 1.0,

  enableHaptic: false,
  hapticIntensityMs: 0,
};

/**
 * Paramètres des contrôles tactiles tablette
 */
const TABLET_TOUCH_SETTINGS: TouchControlSettings = {
  joystickSize: 90,
  stickSize: 36,
  joystickDeadZone: 0.12,

  buttonSize: 45,
  smallButtonSize: 32,

  margin: 25,

  idleAlpha: 0.5,
  activeAlpha: 1.0,

  enableHaptic: true,
  hapticIntensityMs: 40,
};

/**
 * Paramètres des contrôles tactiles mobile
 * Valeurs optimisées pour les écrans tactiles petits
 */
const MOBILE_TOUCH_SETTINGS: TouchControlSettings = {
  joystickSize: 100,
  stickSize: 40,
  joystickDeadZone: 0.12,

  buttonSize: 50,
  smallButtonSize: 35,

  margin: 15,

  idleAlpha: 0.5,
  activeAlpha: 1.0,

  enableHaptic: true,
  hapticIntensityMs: 30,
};

/**
 * Classe singleton pour la configuration de performance mobile
 */
export class MobilePerformanceConfig {
  private static instance: MobilePerformanceConfig;
  private performanceSettings: PerformanceSettings;
  private touchSettings: TouchControlSettings;
  private deviceType: 'desktop' | 'tablet' | 'mobile';

  private constructor() {
    this.deviceType = this.detectDeviceType();
    this.performanceSettings = this.getSettingsForDevice();
    this.touchSettings = this.getTouchSettingsForDevice();

    // Log uniquement en mode développement
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(
        `[MobilePerformanceConfig] Device: ${this.deviceType}, ` +
          `Zombies: ${this.performanceSettings.maxZombies}, ` +
          `Particles: ${this.performanceSettings.particleQuality}`
      );
    }
  }

  /**
   * Retourne l'instance singleton
   */
  public static getInstance(): MobilePerformanceConfig {
    if (!MobilePerformanceConfig.instance) {
      MobilePerformanceConfig.instance = new MobilePerformanceConfig();
    }
    return MobilePerformanceConfig.instance;
  }

  /**
   * Détecte le type d'appareil
   */
  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    if (DeviceDetector.isMobile()) return 'mobile';
    if (DeviceDetector.isTablet()) return 'tablet';
    return 'desktop';
  }

  /**
   * Retourne les paramètres de performance pour le type d'appareil
   */
  private getSettingsForDevice(): PerformanceSettings {
    switch (this.deviceType) {
      case 'mobile':
        return { ...MOBILE_SETTINGS };
      case 'tablet':
        return { ...TABLET_SETTINGS };
      default:
        return { ...DESKTOP_SETTINGS };
    }
  }

  /**
   * Retourne les paramètres des contrôles tactiles pour le type d'appareil
   */
  private getTouchSettingsForDevice(): TouchControlSettings {
    switch (this.deviceType) {
      case 'mobile':
        return { ...MOBILE_TOUCH_SETTINGS };
      case 'tablet':
        return { ...TABLET_TOUCH_SETTINGS };
      default:
        return { ...DESKTOP_TOUCH_SETTINGS };
    }
  }

  /**
   * Retourne le type d'appareil détecté
   */
  public getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    return this.deviceType;
  }

  /**
   * Vérifie si on est sur mobile ou tablette
   */
  public isTouchDevice(): boolean {
    return this.deviceType !== 'desktop';
  }

  /**
   * Retourne les paramètres de performance
   */
  public getPerformanceSettings(): PerformanceSettings {
    return { ...this.performanceSettings };
  }

  /**
   * Retourne les paramètres des contrôles tactiles
   */
  public getTouchControlSettings(): TouchControlSettings {
    return { ...this.touchSettings };
  }

  /**
   * Retourne le nombre max de zombies
   */
  public getMaxZombies(): number {
    return this.performanceSettings.maxZombies;
  }

  /**
   * Retourne la taille du pool de balles
   */
  public getBulletPoolSize(): number {
    return this.performanceSettings.bulletPoolSize;
  }

  /**
   * Retourne la qualité des particules
   */
  public getParticleQuality(): 'high' | 'medium' | 'low' {
    return this.performanceSettings.particleQuality;
  }

  /**
   * Vérifie si les ombres sont activées
   */
  public areShadowsEnabled(): boolean {
    return this.performanceSettings.enableShadows;
  }

  /**
   * Vérifie si le screen shake est activé
   */
  public isScreenShakeEnabled(): boolean {
    return this.performanceSettings.enableScreenShake;
  }

  /**
   * Retourne l'intervalle de mise à jour du flow field
   */
  public getFlowFieldUpdateInterval(): number {
    return this.performanceSettings.flowFieldUpdateInterval;
  }

  /**
   * Retourne le nombre max d'itérations du flow field par frame
   */
  public getFlowFieldMaxIterations(): number {
    return this.performanceSettings.flowFieldMaxIterations;
  }

  /**
   * Retourne le nombre max de cadavres à afficher
   */
  public getMaxCorpses(): number {
    return this.performanceSettings.maxCorpses;
  }

  /**
   * Permet de modifier la qualité des particules (depuis les options)
   */
  public setParticleQuality(quality: 'high' | 'medium' | 'low'): void {
    this.performanceSettings.particleQuality = quality;
  }

  /**
   * Permet d'activer/désactiver le screen shake (depuis les options)
   */
  public setScreenShakeEnabled(enabled: boolean): void {
    this.performanceSettings.enableScreenShake = enabled;
  }

  /**
   * Force la recréation de l'instance (utile pour les tests)
   */
  public static reset(): void {
    MobilePerformanceConfig.instance = undefined as unknown as MobilePerformanceConfig;
  }
}

/**
 * Raccourci pour obtenir la configuration de performance
 */
export function getPerformanceConfig(): MobilePerformanceConfig {
  return MobilePerformanceConfig.getInstance();
}
