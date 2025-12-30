import type { GameScene } from '@scenes/GameScene';
import type { ZombieFactory } from '@entities/zombies/ZombieFactory';
import type { Zombie } from '@entities/zombies/Zombie';
import type { ZombieType } from '@/types/entities';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '@config/constants';
import Phaser from 'phaser';
import type { DropType } from '@items/drops';
import type { PowerUpType } from '@items/powerups';
import type { ActiveItemType } from '@items/active';
import { UPGRADES, type UpgradeDefinition } from '@config/upgrades';
import { PERMANENT_UPGRADES, type PermanentUpgradeDefinition } from '@config/progression';

/**
 * Types d'items que le DebugSpawner peut créer
 */
export type DebugItemType =
  | 'health'
  | 'ammo'
  | 'speedBoost'
  | 'damageBoost'
  | 'shieldBoost'
  | 'turret'
  | 'mine'
  | 'drone'
  | 'decoy';

/**
 * Liste complète des types de zombies disponibles
 */
export const ZOMBIE_TYPES: ZombieType[] = [
  'shambler',
  'runner',
  'crawler',
  'tank',
  'spitter',
  'bomber',
  'screamer',
  'splitter',
  'invisible',
  'necromancer',
];

/**
 * Liste complète des types de power-ups disponibles
 */
export const POWERUP_TYPES: PowerUpType[] = [
  'rage',
  'freeze',
  'ghost',
  'magnet',
  'nuke',
];

/**
 * Liste complète des types d'objets actifs disponibles
 */
export const ACTIVEITEM_TYPES: ActiveItemType[] = [
  'turret',
  'mine',
  'drone',
  'decoy',
  'discoball',
];

/**
 * Système de spawn pour le mode debug
 * Permet de créer des zombies et items à la demande
 */
export class DebugSpawner {
  private gameScene: GameScene;
  private zombieFactory: ZombieFactory;

  /** Type de zombie actuellement sélectionné pour le spawn */
  private selectedZombieType: ZombieType = 'shambler';
  /** Type d'item actuellement sélectionné pour le spawn */
  private selectedItemType: DebugItemType = 'health';
  /** Type de power-up actuellement sélectionné pour le spawn */
  private selectedPowerUpType: PowerUpType = 'rage';
  /** Index du power-up sélectionné */
  private selectedPowerUpIndex: number = 0;
  /** Type d'objet actif actuellement sélectionné */
  private selectedActiveItemType: ActiveItemType = 'turret';
  /** Index de l'objet actif sélectionné */
  private selectedActiveItemIndex: number = 0;

  constructor(gameScene: GameScene) {
    this.gameScene = gameScene;
    this.zombieFactory = gameScene.getZombieFactory();
  }

  /**
   * Définit le type de zombie à spawner
   */
  public setSelectedZombieType(type: ZombieType): void {
    this.selectedZombieType = type;
  }

  /**
   * Récupère le type de zombie sélectionné
   */
  public getSelectedZombieType(): ZombieType {
    return this.selectedZombieType;
  }

  /**
   * Définit le type d'item à spawner
   */
  public setSelectedItemType(type: DebugItemType): void {
    this.selectedItemType = type;
  }

  /**
   * Récupère le type d'item sélectionné
   */
  public getSelectedItemType(): DebugItemType {
    return this.selectedItemType;
  }

  /**
   * Spawn un zombie du type spécifié à une position donnée
   */
  public spawnZombie(type: ZombieType, x: number, y: number): Zombie | null {
    return this.zombieFactory.create(type, x, y);
  }

  /**
   * Spawn un zombie du type actuellement sélectionné à une position
   */
  public spawnSelectedZombie(x: number, y: number): Zombie | null {
    return this.spawnZombie(this.selectedZombieType, x, y);
  }

  /**
   * Spawn plusieurs zombies du même type en groupe
   */
  public spawnGroup(type: ZombieType, x: number, y: number, count: number = 5): Zombie[] {
    const zombies: Zombie[] = [];
    const spacing = 40;

    for (let i = 0; i < count; i++) {
      const offsetX = (i % 3 - 1) * spacing;
      const offsetY = Math.floor(i / 3) * spacing;
      const zombie = this.spawnZombie(type, x + offsetX, y + offsetY);
      if (zombie) {
        zombies.push(zombie);
      }
    }

    return zombies;
  }

  /**
   * Spawn des shamblers aléatoires sur la carte
   */
  public spawnRandomShamblers(count: number = 10): Zombie[] {
    const zombies: Zombie[] = [];
    const margin = 100;

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      const y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
      const zombie = this.spawnZombie('shambler', x, y);
      if (zombie) {
        zombies.push(zombie);
      }
    }

    return zombies;
  }

  /**
   * Spawn une horde mixte de zombies variés
   */
  public spawnMixedHorde(count: number = 20): Zombie[] {
    const zombies: Zombie[] = [];
    const margin = 100;
    const commonTypes: ZombieType[] = ['shambler', 'runner', 'crawler', 'spitter'];

    for (let i = 0; i < count; i++) {
      const type = commonTypes[Math.floor(Math.random() * commonTypes.length)];
      const x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      const y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
      const zombie = this.spawnZombie(type, x, y);
      if (zombie) {
        zombies.push(zombie);
      }
    }

    return zombies;
  }

  /**
   * Spawn un zombie de chaque type en ligne
   */
  public spawnOneOfEach(): Zombie[] {
    const zombies: Zombie[] = [];
    let x = 200;
    const y = 200;
    const spacing = 80;

    for (const type of ZOMBIE_TYPES) {
      const zombie = this.spawnZombie(type, x, y);
      if (zombie) {
        zombies.push(zombie);
      }
      x += spacing;
    }

    return zombies;
  }

  /**
   * Tue tous les zombies actifs
   */
  public killAllZombies(): number {
    const zombies = this.gameScene.getActiveZombies();
    let killed = 0;

    for (const zombie of zombies) {
      if (zombie.active) {
        // Infliger des dégâts massifs pour tuer le zombie
        zombie.takeDamage(99999);
        killed++;
      }
    }

    return killed;
  }

  /**
   * Spawn un item à une position donnée
   * Note: Pour les drops réels, utiliser spawnDrop()
   */
  public spawnItem(type: DebugItemType, x: number, y: number): void {
    // Mapper vers le vrai système de drops si possible
    const dropMapping: Partial<Record<DebugItemType, DropType>> = {
      health: 'healthSmall',
      ammo: 'ammo',
    };

    const dropType = dropMapping[type];
    if (dropType) {
      this.spawnDrop(dropType, x, y);
      return;
    }

    // Sinon, créer un placeholder visuel
    this.createItemPlaceholder(type, x, y);
  }

  /**
   * Spawn un drop réel à une position donnée (utilise le DropSystem)
   */
  public spawnDrop(type: DropType, x: number, y: number): void {
    const dropSystem = this.gameScene.getDropSystem();

    // Créer le drop via le système
    // On utilise une méthode interne exposée pour le debug
    (dropSystem as unknown as { spawnDropDebug: (type: DropType, x: number, y: number) => void }).spawnDropDebug(type, x, y);
  }

  /**
   * Crée un placeholder visuel pour un item (en attendant le vrai système)
   */
  private createItemPlaceholder(type: DebugItemType, x: number, y: number): void {
    const colors: Record<DebugItemType, number> = {
      health: 0x00ff00,
      ammo: 0xffff00,
      speedBoost: 0x00ffff,
      damageBoost: 0xff0000,
      shieldBoost: 0x0000ff,
      turret: 0xff00ff,
      mine: 0xff8800,
      drone: 0x8800ff,
      decoy: 0x88ff00,
    };

    const color = colors[type] || 0xffffff;
    const placeholder = this.gameScene.add.circle(x, y, 15, color, 0.7);
    placeholder.setDepth(50);

    // Texte indiquant le type
    const text = this.gameScene.add.text(x, y - 25, type, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 2, y: 2 },
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(51);

    // Animation et disparition
    this.gameScene.tweens.add({
      targets: [placeholder, text],
      alpha: 0,
      y: y - 50,
      duration: 2000,
      onComplete: () => {
        placeholder.destroy();
        text.destroy();
      },
    });
  }

  /**
   * Spawn un item du type sélectionné à une position
   */
  public spawnSelectedItem(x: number, y: number): void {
    this.spawnItem(this.selectedItemType, x, y);
  }

  /**
   * Récupère le nombre de zombies actifs
   */
  public getActiveZombieCount(): number {
    return this.gameScene.getActiveZombies().length;
  }

  // ==================== POWER-UP METHODS ====================

  /**
   * Définit le type de power-up à activer
   */
  public setSelectedPowerUpType(type: PowerUpType): void {
    this.selectedPowerUpType = type;
    this.selectedPowerUpIndex = POWERUP_TYPES.indexOf(type);
  }

  /**
   * Récupère le type de power-up sélectionné
   */
  public getSelectedPowerUpType(): PowerUpType {
    return this.selectedPowerUpType;
  }

  /**
   * Cycle vers le power-up suivant
   */
  public cyclePowerUp(direction: 1 | -1 = 1): PowerUpType {
    this.selectedPowerUpIndex =
      (this.selectedPowerUpIndex + direction + POWERUP_TYPES.length) % POWERUP_TYPES.length;
    this.selectedPowerUpType = POWERUP_TYPES[this.selectedPowerUpIndex];
    return this.selectedPowerUpType;
  }

  /**
   * Active un power-up directement (sans drop)
   */
  public activatePowerUp(type: PowerUpType): void {
    const powerUpSystem = this.gameScene.getPowerUpSystem();
    if (powerUpSystem) {
      powerUpSystem.activatePowerUp(type);
    }
  }

  /**
   * Active le power-up sélectionné
   */
  public activateSelectedPowerUp(): void {
    this.activatePowerUp(this.selectedPowerUpType);
  }

  /**
   * Spawn un drop de power-up à la position du joueur
   */
  public spawnPowerUpDrop(_type?: PowerUpType): void {
    const player = this.gameScene.getPlayer();

    // Utiliser le système de drops pour spawner
    this.spawnDrop('powerUp', player.x + 50, player.y);

    // Note: Le type spécifique ne peut pas être contrôlé via le DropSystem actuel
    // Le drop aura un type aléatoire
  }

  /**
   * Désactive tous les power-ups actifs
   */
  public deactivateAllPowerUps(): void {
    const powerUpSystem = this.gameScene.getPowerUpSystem();
    if (powerUpSystem) {
      powerUpSystem.deactivateAll();
    }
  }

  // ==================== ACTIVE ITEM METHODS ====================

  /**
   * Définit le type d'objet actif sélectionné
   */
  public setSelectedActiveItemType(type: ActiveItemType): void {
    this.selectedActiveItemType = type;
    this.selectedActiveItemIndex = ACTIVEITEM_TYPES.indexOf(type);
  }

  /**
   * Récupère le type d'objet actif sélectionné
   */
  public getSelectedActiveItemType(): ActiveItemType {
    return this.selectedActiveItemType;
  }

  /**
   * Cycle vers l'objet actif suivant
   */
  public cycleActiveItem(direction: 1 | -1 = 1): ActiveItemType {
    this.selectedActiveItemIndex =
      (this.selectedActiveItemIndex + direction + ACTIVEITEM_TYPES.length) % ACTIVEITEM_TYPES.length;
    this.selectedActiveItemType = ACTIVEITEM_TYPES[this.selectedActiveItemIndex];
    return this.selectedActiveItemType;
  }

  /**
   * Ajoute un objet actif à l'inventaire du joueur
   */
  public addActiveItemToInventory(type: ActiveItemType, charges: number = 1): void {
    const activeItemSystem = this.gameScene.getActiveItemSystem();
    if (activeItemSystem) {
      activeItemSystem.addItem(type, charges);
    }
  }

  /**
   * Ajoute l'objet actif sélectionné à l'inventaire
   */
  public addSelectedActiveItemToInventory(charges: number = 1): void {
    this.addActiveItemToInventory(this.selectedActiveItemType, charges);
  }

  /**
   * Déploie un objet actif à la position du joueur (debug, sans consommer de charge)
   */
  public spawnActiveItem(type: ActiveItemType): void {
    const player = this.gameScene.getPlayer();
    const activeItemSystem = this.gameScene.getActiveItemSystem();

    if (activeItemSystem) {
      // Utiliser la position du joueur avec un petit décalage
      const spawnX = player.x + 50;
      const spawnY = player.y;
      activeItemSystem.debugSpawnItem(type, spawnX, spawnY);
    }
  }

  /**
   * Déploie l'objet actif sélectionné
   */
  public spawnSelectedActiveItem(): void {
    this.spawnActiveItem(this.selectedActiveItemType);
  }

  /**
   * Utilise l'objet actif équipé (consomme une charge)
   */
  public useEquippedActiveItem(): void {
    const activeItemSystem = this.gameScene.getActiveItemSystem();
    if (activeItemSystem) {
      activeItemSystem.useEquippedItem();
    }
  }

  /**
   * Détruit tous les objets actifs déployés
   */
  public destroyAllActiveItems(): void {
    const activeItemSystem = this.gameScene.getActiveItemSystem();
    if (activeItemSystem) {
      activeItemSystem.destroyAllDeployed();
    }
  }

  // ==================== UPGRADE METHODS (Phase 6.5) ====================

  /** Index de l'upgrade sélectionné */
  private selectedUpgradeIndex: number = 0;

  /**
   * Récupère la liste des upgrades disponibles
   */
  public getAvailableUpgrades(): UpgradeDefinition[] {
    return UPGRADES;
  }

  /**
   * Récupère l'upgrade actuellement sélectionné
   */
  public getSelectedUpgrade(): UpgradeDefinition {
    return UPGRADES[this.selectedUpgradeIndex];
  }

  /**
   * Cycle vers l'upgrade suivant
   */
  public cycleUpgrade(direction: 1 | -1 = 1): UpgradeDefinition {
    this.selectedUpgradeIndex =
      (this.selectedUpgradeIndex + direction + UPGRADES.length) % UPGRADES.length;
    return this.getSelectedUpgrade();
  }

  /**
   * Applique l'upgrade sélectionné
   */
  public applySelectedUpgrade(): boolean {
    const upgradeSystem = this.gameScene.getUpgradeSystem();
    if (upgradeSystem) {
      return upgradeSystem.applyUpgrade(this.getSelectedUpgrade());
    }
    return false;
  }

  /**
   * Applique un upgrade par son ID
   */
  public applyUpgradeById(upgradeId: string): boolean {
    const upgradeSystem = this.gameScene.getUpgradeSystem();
    if (upgradeSystem) {
      return upgradeSystem.applyUpgradeById(upgradeId);
    }
    return false;
  }

  /**
   * Ouvre la scène de sélection d'upgrade (debug)
   */
  public openUpgradeScene(): void {
    const upgradeSystem = this.gameScene.getUpgradeSystem();
    if (!upgradeSystem) return;

    const choices = upgradeSystem.generateChoices(3);
    if (choices.length === 0) {
      console.log('[Debug] No upgrades available');
      return;
    }

    this.gameScene.scene.launch(SCENE_KEYS.UPGRADE, {
      gameScene: this.gameScene,
      waveNumber: 0, // Debug wave
      choices: choices,
    });
  }

  /**
   * Réinitialise tous les upgrades
   */
  public resetUpgrades(): void {
    const upgradeSystem = this.gameScene.getUpgradeSystem();
    if (upgradeSystem) {
      upgradeSystem.reset();
    }
  }

  /**
   * Récupère les stats d'upgrade actuelles
   */
  public getUpgradeStats(): object {
    const upgradeSystem = this.gameScene.getUpgradeSystem();
    if (upgradeSystem) {
      return upgradeSystem.getStats();
    }
    return {};
  }

  // ==================== ECONOMY/TACTICAL MENU METHODS (Phase 6.6) ====================

  /**
   * Ouvre le menu tactique (debug)
   */
  public openTacticalMenu(): void {
    const waveSystem = this.gameScene.getWaveSystem();
    const currentWave = waveSystem ? waveSystem.getCurrentWave() : 0;

    this.gameScene.scene.launch(SCENE_KEYS.TACTICAL, {
      gameScene: this.gameScene,
      waveNumber: currentWave,
    });
  }

  /**
   * Ajoute des points au joueur
   * @returns Le nouveau total de points
   */
  public addPoints(amount: number): number {
    const economySystem = this.gameScene.getEconomySystem();
    if (economySystem) {
      economySystem.addPoints(amount);
      return economySystem.getPoints();
    }
    return 0;
  }

  /**
   * Définit les points du joueur
   * @returns Le nouveau total de points
   */
  public setPoints(amount: number): number {
    const economySystem = this.gameScene.getEconomySystem();
    if (economySystem) {
      economySystem.setPoints(amount);
      return economySystem.getPoints();
    }
    return 0;
  }

  /**
   * Récupère les points actuels
   */
  public getPoints(): number {
    const economySystem = this.gameScene.getEconomySystem();
    if (economySystem) {
      return economySystem.getPoints();
    }
    return 0;
  }

  /**
   * Récupère les stats économiques
   */
  public getEconomyStats(): { points: number; totalEarned: number; totalSpent: number } {
    const economySystem = this.gameScene.getEconomySystem();
    if (economySystem) {
      return economySystem.getStats();
    }
    return { points: 0, totalEarned: 0, totalSpent: 0 };
  }

  // ==================== PROGRESSION METHODS (Phase 6.7) ====================

  /** Index de l'upgrade permanent sélectionné */
  private selectedPermanentUpgradeIndex: number = 0;

  /**
   * Récupère la liste des upgrades permanents disponibles
   */
  public getAvailablePermanentUpgrades(): PermanentUpgradeDefinition[] {
    return PERMANENT_UPGRADES;
  }

  /**
   * Récupère l'upgrade permanent actuellement sélectionné
   */
  public getSelectedPermanentUpgrade(): PermanentUpgradeDefinition {
    return PERMANENT_UPGRADES[this.selectedPermanentUpgradeIndex];
  }

  /**
   * Cycle vers l'upgrade permanent suivant
   */
  public cyclePermanentUpgrade(direction: 1 | -1 = 1): PermanentUpgradeDefinition {
    this.selectedPermanentUpgradeIndex =
      (this.selectedPermanentUpgradeIndex + direction + PERMANENT_UPGRADES.length) % PERMANENT_UPGRADES.length;
    return this.getSelectedPermanentUpgrade();
  }

  /**
   * Achète l'upgrade permanent sélectionné
   */
  public purchaseSelectedPermanentUpgrade(): boolean {
    const progressionSystem = this.gameScene.getProgressionSystem();
    if (progressionSystem) {
      const upgrade = this.getSelectedPermanentUpgrade();
      return progressionSystem.purchaseUpgrade(upgrade.id);
    }
    return false;
  }

  /**
   * Ajoute de l'XP (debug)
   */
  public addXP(amount: number): number {
    const progressionSystem = this.gameScene.getProgressionSystem();
    if (progressionSystem) {
      return progressionSystem.debugAddXP(amount);
    }
    return 0;
  }

  /**
   * Récupère l'XP disponible
   */
  public getAvailableXP(): number {
    const progressionSystem = this.gameScene.getProgressionSystem();
    if (progressionSystem) {
      return progressionSystem.getAvailableXP();
    }
    return 0;
  }

  /**
   * Récupère les stats de progression
   */
  public getProgressionStats(): object {
    const progressionSystem = this.gameScene.getProgressionSystem();
    if (progressionSystem) {
      return progressionSystem.getStats();
    }
    return {};
  }

  /**
   * Ouvre la scène de progression
   */
  public openProgressionScene(): void {
    this.gameScene.scene.launch(SCENE_KEYS.PROGRESSION, {
      parentScene: this.gameScene,
    });
  }

  /**
   * Réinitialise toute la progression (debug)
   */
  public resetProgression(): void {
    const progressionSystem = this.gameScene.getProgressionSystem();
    if (progressionSystem) {
      progressionSystem.debugResetProgression();
    }
  }

  /**
   * Débloque tout (debug)
   */
  public unlockAllProgression(): void {
    const progressionSystem = this.gameScene.getProgressionSystem();
    if (progressionSystem) {
      progressionSystem.debugUnlockAll();
    }
  }

  /**
   * Max tous les upgrades permanents (debug)
   */
  public maxAllPermanentUpgrades(): void {
    const progressionSystem = this.gameScene.getProgressionSystem();
    if (progressionSystem) {
      progressionSystem.debugMaxAllUpgrades();
    }
  }
}
