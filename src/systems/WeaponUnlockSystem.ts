import type { GameScene } from '@scenes/GameScene';
import { BALANCE } from '@config/balance';
import {
  ExperimentalWeaponType,
  EXPERIMENTAL_UNLOCK_CONDITIONS,
} from '@weapons/experimental';
import { WeaponRegistry } from '@/systems/WeaponRegistry';

/**
 * État de déblocage des armes
 */
export interface WeaponUnlockState {
  /** Armes débloquées de manière permanente */
  permanentlyUnlocked: Set<string>;
  /** Armes disponibles cette session */
  sessionUnlocked: Set<string>;
  /** Progression vers le déblocage secret */
  totalZombiesConverted: number;
  /** Boss vaincus cette session */
  bossesDefeated: string[];
}

/**
 * Événement de déblocage d'arme
 */
export interface WeaponUnlockEvent {
  weaponType: ExperimentalWeaponType;
  unlockMethod: 'wave' | 'bossDrop' | 'purchase' | 'secret';
  permanent: boolean;
}

/**
 * WeaponUnlockSystem - Gère le déblocage des armes expérimentales
 *
 * Conditions de déblocage :
 * - Freeze Ray : Atteindre la vague 20
 * - Gravity Gun : Atteindre la vague 20
 * - Black Hole Generator : Drop de boss
 * - Laser Minigun : Achat 10 000 points
 * - Zombie Converter : Secret (convertir 100 zombies au total)
 */
export class WeaponUnlockSystem {
  private scene: GameScene;
  private state: WeaponUnlockState;

  /** Storage key pour les données persistantes */
  private static readonly STORAGE_KEY = 'zombieHunter_weaponUnlocks';

  constructor(scene: GameScene) {
    this.scene = scene;

    // Charger l'état depuis le localStorage
    this.state = this.loadState();

    // Écouter les événements
    this.setupEventListeners();
  }

  /**
   * Charge l'état de déblocage depuis le localStorage
   */
  private loadState(): WeaponUnlockState {
    const defaultState: WeaponUnlockState = {
      permanentlyUnlocked: new Set(),
      sessionUnlocked: new Set(),
      totalZombiesConverted: 0,
      bossesDefeated: [],
    };

    try {
      const saved = localStorage.getItem(WeaponUnlockSystem.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          permanentlyUnlocked: new Set(parsed.permanentlyUnlocked || []),
          sessionUnlocked: new Set(),
          totalZombiesConverted: parsed.totalZombiesConverted || 0,
          bossesDefeated: [],
        };
      }
    } catch (e) {
      console.warn('Erreur lors du chargement des déblocages:', e);
    }

    return defaultState;
  }

  /**
   * Sauvegarde l'état dans le localStorage
   */
  private saveState(): void {
    try {
      const toSave = {
        permanentlyUnlocked: Array.from(this.state.permanentlyUnlocked),
        totalZombiesConverted: this.state.totalZombiesConverted,
      };
      localStorage.setItem(WeaponUnlockSystem.STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Erreur lors de la sauvegarde des déblocages:', e);
    }
  }

  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Écouter les changements de vague
    this.scene.events.on('waveStarted', this.onWaveStarted, this);

    // Écouter les morts de boss
    this.scene.events.on('bossDefeated', this.onBossDefeated, this);

    // Écouter les conversions de zombies
    this.scene.events.on('zombieConverted', this.onZombieConverted, this);
  }

  /**
   * Appelé quand une nouvelle vague commence
   */
  private onWaveStarted(waveNumber: number): void {
    // Vérifier les déblocages liés aux vagues
    this.checkWaveUnlocks(waveNumber);
  }

  /**
   * Vérifie les déblocages basés sur la vague
   */
  private checkWaveUnlocks(waveNumber: number): void {
    // Vérifier les armes expérimentales
    const waveUnlocks: ExperimentalWeaponType[] = ['freezeRay', 'gravityGun'];

    for (const weaponType of waveUnlocks) {
      if (this.isUnlocked(weaponType)) continue;

      const condition = EXPERIMENTAL_UNLOCK_CONDITIONS[weaponType];
      if (condition.type === 'wave' && waveNumber >= (condition.value || 0)) {
        this.unlockWeapon(weaponType, 'wave', false);
      }
    }

    // Vérifier les armes standard (non-expérimentales) basées sur la vague
    this.checkStandardWaveUnlocks(waveNumber);
  }

  /**
   * Vérifie les déblocages d'armes standard basés sur la vague
   */
  private checkStandardWaveUnlocks(waveNumber: number): void {
    const inventoryManager = this.scene.getInventoryManager?.();
    if (!inventoryManager) return;

    const allWeapons = WeaponRegistry.getAll();

    for (const weapon of allWeapons) {
      // Ignorer si déjà débloquée
      if (inventoryManager.isUnlocked(weapon.id)) continue;

      // Vérifier si c'est un déblocage par wave
      const condition = weapon.unlockCondition;
      if (condition?.type === 'wave' && condition.value) {
        if (waveNumber >= condition.value) {
          inventoryManager.unlockWeapon(weapon.id);

          // Notification pour les armes standards
          this.showStandardUnlockNotification(weapon.name);
        }
      }
    }
  }

  /**
   * Affiche une notification de déblocage pour une arme standard
   */
  private showStandardUnlockNotification(weaponName: string): void {
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY - 50;

    // Fond de notification
    const bg = this.scene.add.rectangle(centerX, centerY, 300, 60, 0x000000, 0.8);
    bg.setStrokeStyle(2, 0x00ff00, 1);
    bg.setDepth(100);

    // Titre
    const title = this.scene.add.text(centerX, centerY - 12, '🔓 ARME DÉBLOQUÉE!', {
      fontSize: '14px',
      color: '#00ff00',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    title.setDepth(101);

    // Nom de l'arme
    const name = this.scene.add.text(centerX, centerY + 10, weaponName, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    name.setOrigin(0.5);
    name.setDepth(101);

    // Animation
    bg.setScale(0);
    title.setAlpha(0);
    name.setAlpha(0);

    this.scene.tweens.add({
      targets: bg,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: [title, name],
      alpha: 1,
      duration: 300,
      delay: 200,
    });

    // Disparition après 2 secondes
    this.scene.time.delayedCall(2000, () => {
      this.scene.tweens.add({
        targets: [bg, title, name],
        alpha: 0,
        y: centerY - 30,
        duration: 400,
        onComplete: () => {
          bg.destroy();
          title.destroy();
          name.destroy();
        },
      });
    });
  }

  /**
   * Appelé quand un boss est vaincu
   */
  private onBossDefeated(bossType: string): void {
    this.state.bossesDefeated.push(bossType);

    // Vérifier le déblocage du Black Hole Generator
    if (!this.isUnlocked('blackHoleGenerator')) {
      this.unlockWeapon('blackHoleGenerator', 'bossDrop', false);

      // Drop l'arme
      this.dropExperimentalWeapon('blackHoleGenerator');
    }

    // Vérifier les armes standard avec condition 'boss'
    this.checkBossUnlocks();
  }

  /**
   * Vérifie les déblocages d'armes basés sur la défaite de boss
   */
  private checkBossUnlocks(): void {
    const inventoryManager = this.scene.getInventoryManager?.();
    if (!inventoryManager) return;

    const allWeapons = WeaponRegistry.getAll();

    for (const weapon of allWeapons) {
      // Ignorer si déjà débloquée
      if (inventoryManager.isUnlocked(weapon.id)) continue;

      // Vérifier si c'est un déblocage par boss
      const condition = weapon.unlockCondition;
      if (condition?.type === 'boss') {
        inventoryManager.unlockWeapon(weapon.id);

        // Notification pour les armes standards
        this.showStandardUnlockNotification(weapon.name);
      }
    }
  }

  /**
   * Appelé quand un zombie est converti
   */
  private onZombieConverted(): void {
    this.state.totalZombiesConverted++;
    this.saveState();

    // Vérifier le déblocage secret
    if (!this.isUnlocked('zombieConverter')) {
      const requirement = BALANCE.weapons.zombieConverter.unlockRequirement;
      if (this.state.totalZombiesConverted >= requirement) {
        this.unlockWeapon('zombieConverter', 'secret', true);
      }
    }
  }

  /**
   * Tente d'acheter une arme
   */
  public tryPurchaseWeapon(weaponType: ExperimentalWeaponType): boolean {
    if (this.isUnlocked(weaponType)) {
      return true; // Déjà débloqué
    }

    const condition = EXPERIMENTAL_UNLOCK_CONDITIONS[weaponType];
    if (condition.type !== 'purchase') {
      return false;
    }

    const cost = condition.value || 0;
    const economySystem = this.scene.getEconomySystem?.();

    if (economySystem && economySystem.getPoints() >= cost) {
      economySystem.spendPoints(cost);
      this.unlockWeapon(weaponType, 'purchase', false);
      return true;
    }

    return false;
  }

  /**
   * Débloque une arme
   */
  private unlockWeapon(
    weaponType: ExperimentalWeaponType,
    method: 'wave' | 'bossDrop' | 'purchase' | 'secret',
    permanent: boolean
  ): void {
    // Ajouter aux déblocages
    if (permanent) {
      this.state.permanentlyUnlocked.add(weaponType);
      this.saveState();
    }
    this.state.sessionUnlocked.add(weaponType);

    // Débloquer dans l'inventaire du joueur
    const inventoryManager = this.scene.getInventoryManager?.();
    if (inventoryManager) {
      inventoryManager.unlockWeapon(weaponType);
    }

    // Émettre l'événement
    const event: WeaponUnlockEvent = {
      weaponType,
      unlockMethod: method,
      permanent,
    };
    this.scene.events.emit('weaponUnlocked', event);

    // Afficher la notification
    this.showUnlockNotification(weaponType, method, permanent);
  }

  /**
   * Affiche la notification de déblocage
   */
  private showUnlockNotification(
    weaponType: ExperimentalWeaponType,
    _method: string,
    permanent: boolean
  ): void {
    const names: Record<ExperimentalWeaponType, string> = {
      freezeRay: 'Rayon Glacial',
      gravityGun: 'Canon Gravitique',
      blackHoleGenerator: 'Générateur de Trou Noir',
      laserMinigun: 'Laser Minigun',
      zombieConverter: 'Convertisseur de Zombies',
    };

    const weaponName = names[weaponType];
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY - 100;

    // Fond de notification
    const bg = this.scene.add.rectangle(centerX, centerY, 350, 80, 0x000000, 0.8);
    bg.setStrokeStyle(3, 0xffaa00, 1);
    bg.setDepth(100);

    // Titre
    const titleText = permanent ? '🏆 DÉBLOCAGE PERMANENT!' : '⚡ ARME DÉBLOQUÉE!';
    const title = this.scene.add.text(centerX, centerY - 20, titleText, {
      fontSize: '18px',
      color: '#ffaa00',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    title.setDepth(101);

    // Nom de l'arme
    const name = this.scene.add.text(centerX, centerY + 10, weaponName, {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    name.setOrigin(0.5);
    name.setDepth(101);

    // Animation
    bg.setScale(0);
    title.setAlpha(0);
    name.setAlpha(0);

    this.scene.tweens.add({
      targets: bg,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: [title, name],
      alpha: 1,
      duration: 300,
      delay: 200,
    });

    // Disparition après 3 secondes
    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: [bg, title, name],
        alpha: 0,
        y: centerY - 50,
        duration: 500,
        onComplete: () => {
          bg.destroy();
          title.destroy();
          name.destroy();
        },
      });
    });
  }

  /**
   * Drop une arme expérimentale au sol
   */
  private dropExperimentalWeapon(weaponType: ExperimentalWeaponType): void {
    // Créer un drop spécial pour l'arme expérimentale
    const player = this.scene.getPlayer();
    if (!player) return;

    // Position près du joueur
    const dropX = player.x + (Math.random() - 0.5) * 100;
    const dropY = player.y + (Math.random() - 0.5) * 100;

    // Émettre l'événement pour créer le drop
    this.scene.events.emit('experimentalWeaponDrop', {
      weaponType,
      x: dropX,
      y: dropY,
    });
  }

  /**
   * Vérifie si une arme est débloquée
   */
  public isUnlocked(weaponType: ExperimentalWeaponType): boolean {
    return (
      this.state.permanentlyUnlocked.has(weaponType) ||
      this.state.sessionUnlocked.has(weaponType)
    );
  }

  /**
   * Retourne la liste des armes débloquées
   */
  public getUnlockedWeapons(): ExperimentalWeaponType[] {
    const allUnlocked = new Set([
      ...this.state.permanentlyUnlocked,
      ...this.state.sessionUnlocked,
    ]);
    return Array.from(allUnlocked) as ExperimentalWeaponType[];
  }

  /**
   * Retourne la progression vers le déblocage secret
   */
  public getSecretProgress(): { current: number; required: number } {
    return {
      current: this.state.totalZombiesConverted,
      required: BALANCE.weapons.zombieConverter.unlockRequirement,
    };
  }

  /**
   * Retourne les boss vaincus cette session
   */
  public getDefeatedBosses(): string[] {
    return [...this.state.bossesDefeated];
  }

  /**
   * Nettoie le système
   */
  public destroy(): void {
    this.scene.events.off('waveStarted', this.onWaveStarted, this);
    this.scene.events.off('bossDefeated', this.onBossDefeated, this);
    this.scene.events.off('zombieConverted', this.onZombieConverted, this);
  }
}
