import Phaser from 'phaser';
import { TILE_SIZE } from '@config/constants';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';

/**
 * États possibles d'une porte
 */
export enum DoorState {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  OPEN = 'open',
  DESTROYED = 'destroyed',
}

/**
 * Types de pièges pour les portes
 */
export enum DoorTrapType {
  SPIKE = 'spike',       // Dégâts directs
  SLOW = 'slow',         // Ralentissement
  FIRE = 'fire',         // Zone de feu
}

/**
 * Types de barricade
 */
export enum BarricadeType {
  LIGHT = 'light',       // Barricade légère (100 HP)
  REINFORCED = 'reinforced', // Barricade renforcée (250 HP)
}

/**
 * Configuration d'un piège de porte
 */
export interface DoorTrapConfig {
  type: DoorTrapType;
  damage?: number;         // Pour SPIKE
  slowFactor?: number;     // Pour SLOW
  fireDuration?: number;   // Pour FIRE
  charges: number;         // Nombre d'utilisations
}

/**
 * Configuration d'une porte
 */
export interface DoorConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  side: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Classe représentant une porte de spawn
 * Les zombies émergent des portes actives
 * Peut être barricadée, piégée, ou détruite par un boss
 */
export class Door extends Phaser.GameObjects.Container {
  public scene: GameScene;
  public state: DoorState = DoorState.INACTIVE;
  public side: 'top' | 'bottom' | 'left' | 'right';
  public readonly id: string;

  private doorFrame: Phaser.GameObjects.Rectangle;
  private doorGlow: Phaser.GameObjects.Rectangle;
  private pulseTween: Phaser.Tweens.Tween | null = null;

  private readonly doorWidth: number;
  private readonly doorHeight: number;

  // Barricade system
  private barricadeHealth: number = 0;
  private maxBarricadeHealth: number = 0;
  private barricadeType: BarricadeType | null = null;
  private barricadeVisual: Phaser.GameObjects.Rectangle | null = null;
  private barricadePlanks: Phaser.GameObjects.Rectangle[] = [];

  // Trap system
  private trap: DoorTrapConfig | null = null;
  private trapVisual: Phaser.GameObjects.Rectangle | null = null;
  private trapChargesRemaining: number = 0;

  // Destruction state
  private isDestroyed: boolean = false;
  private destroyedVisual: Phaser.GameObjects.Rectangle | null = null;
  private spawnSpeedMultiplier: number = 1.0;

  constructor(scene: GameScene, config: DoorConfig) {
    super(scene, config.x, config.y);

    this.scene = scene;
    this.side = config.side;
    this.id = `door_${config.side}_${config.x}_${config.y}`;

    // Dimensions de la porte
    if (config.side === 'top' || config.side === 'bottom') {
      this.doorWidth = config.width || TILE_SIZE * 2;
      this.doorHeight = config.height || TILE_SIZE;
    } else {
      this.doorWidth = config.width || TILE_SIZE;
      this.doorHeight = config.height || TILE_SIZE * 2;
    }

    // Créer le cadre de la porte (fond sombre)
    this.doorFrame = scene.add.rectangle(0, 0, this.doorWidth, this.doorHeight, 0x2c3e50);
    this.doorFrame.setStrokeStyle(2, 0x1a252f);
    this.add(this.doorFrame);

    // Créer le glow (lueur rouge pour l'animation)
    this.doorGlow = scene.add.rectangle(0, 0, this.doorWidth - 4, this.doorHeight - 4, 0xe74c3c, 0);
    this.add(this.doorGlow);

    // Ajouter au monde
    scene.add.existing(this);

    // Profondeur pour être sous le joueur mais au-dessus du sol
    this.setDepth(0);
  }

  /**
   * Active la porte - elle commence à pulser et peut spawner des zombies
   */
  public activate(): void {
    if (this.state === DoorState.ACTIVE) return;

    this.state = DoorState.ACTIVE;
    this.startPulseAnimation();

    // Émettre un événement pour notifier le système
    this.scene.events.emit('doorActivated', this);
  }

  /**
   * Désactive la porte
   */
  public deactivate(): void {
    if (this.state === DoorState.INACTIVE) return;

    this.state = DoorState.INACTIVE;
    this.stopPulseAnimation();
    this.doorGlow.setAlpha(0);

    this.scene.events.emit('doorDeactivated', this);
  }

  /**
   * Ouvre la porte (pour le spawn)
   */
  public open(): void {
    if (this.state !== DoorState.ACTIVE) return;

    this.state = DoorState.OPEN;

    // Animation d'ouverture
    this.scene.tweens.add({
      targets: this.doorGlow,
      alpha: 0.8,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.state = DoorState.ACTIVE;
      },
    });
  }

  /**
   * Démarre l'animation de pulsation
   */
  private startPulseAnimation(): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
    }

    this.pulseTween = this.scene.tweens.add({
      targets: this.doorGlow,
      alpha: { from: 0.2, to: 0.6 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Arrête l'animation de pulsation
   */
  private stopPulseAnimation(): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
  }

  /**
   * Récupère la position de spawn (légèrement à l'intérieur de l'arène)
   */
  public getSpawnPosition(): { x: number; y: number } {
    const offset = TILE_SIZE;

    switch (this.side) {
      case 'top':
        return { x: this.x, y: this.y + offset };
      case 'bottom':
        return { x: this.x, y: this.y - offset };
      case 'left':
        return { x: this.x + offset, y: this.y };
      case 'right':
        return { x: this.x - offset, y: this.y };
    }
  }

  /**
   * Vérifie si la porte est active
   */
  public isActive(): boolean {
    return this.state === DoorState.ACTIVE;
  }

  // ============================================================================
  // BARRICADE SYSTEM (5.5.1)
  // ============================================================================

  /**
   * Barricade la porte avec un type spécifique
   * @returns true si la barricade a été placée avec succès
   */
  public barricade(type: BarricadeType): boolean {
    if (this.isDestroyed) return false;
    if (this.hasBarricade()) return false;

    const config = BALANCE.doors.barricades[type];
    this.barricadeType = type;
    this.maxBarricadeHealth = config.health;
    this.barricadeHealth = config.health;

    this.createBarricadeVisual();

    // Émettre l'événement
    this.scene.events.emit('door:barricade', {
      doorId: this.id,
      barricadeType: type,
      health: this.barricadeHealth,
    });

    return true;
  }

  /**
   * Vérifie si la porte a une barricade
   */
  public hasBarricade(): boolean {
    return this.barricadeHealth > 0 && this.barricadeType !== null;
  }

  /**
   * Inflige des dégâts à la barricade
   * @returns true si la barricade a été détruite
   */
  public damageBarricade(damage: number, source?: string): boolean {
    if (!this.hasBarricade()) return false;

    this.barricadeHealth = Math.max(0, this.barricadeHealth - damage);

    // Émettre l'événement de dégâts
    this.scene.events.emit('door:barricade_damage', {
      doorId: this.id,
      damage,
      remainingHealth: this.barricadeHealth,
      source,
    });

    // Mettre à jour le visuel
    this.updateBarricadeVisual();

    if (this.barricadeHealth <= 0) {
      this.destroyBarricade(source);
      return true;
    }

    return false;
  }

  /**
   * Répare la barricade
   * @param amount Quantité de HP à restaurer
   * @returns true si la réparation a été effectuée
   */
  public repairBarricade(amount: number): boolean {
    if (!this.hasBarricade()) return false;
    if (this.barricadeHealth >= this.maxBarricadeHealth) return false;

    this.barricadeHealth = Math.min(this.maxBarricadeHealth, this.barricadeHealth + amount);
    this.updateBarricadeVisual();

    this.scene.events.emit('door:barricade_repaired', {
      doorId: this.id,
      healAmount: amount,
      currentHealth: this.barricadeHealth,
    });

    return true;
  }

  /**
   * Détruit la barricade
   */
  private destroyBarricade(destroyedBy?: string): void {
    this.scene.events.emit('door:barricade_destroyed', {
      doorId: this.id,
      destroyedBy,
    });

    // Nettoyer les visuels
    this.clearBarricadeVisual();
    this.barricadeType = null;
    this.barricadeHealth = 0;
    this.maxBarricadeHealth = 0;
  }

  /**
   * Crée le visuel de la barricade (planches clouées)
   */
  private createBarricadeVisual(): void {
    this.clearBarricadeVisual();

    // Créer le fond de barricade
    const barricadeColor = this.barricadeType === BarricadeType.REINFORCED ? 0x8b4513 : 0xa0522d;
    this.barricadeVisual = this.scene.add.rectangle(
      0, 0,
      this.doorWidth - 2,
      this.doorHeight - 2,
      barricadeColor,
      0.8
    );
    this.add(this.barricadeVisual);

    // Créer les planches
    const plankCount = this.barricadeType === BarricadeType.REINFORCED ? 4 : 2;
    const isHorizontal = this.side === 'top' || this.side === 'bottom';

    for (let i = 0; i < plankCount; i++) {
      const plank = this.scene.add.rectangle(
        0, 0,
        isHorizontal ? this.doorWidth * 0.8 : 8,
        isHorizontal ? 6 : this.doorHeight * 0.8,
        0x654321,
        1
      );

      // Positionner les planches
      if (isHorizontal) {
        plank.y = (i - (plankCount - 1) / 2) * 10;
      } else {
        plank.x = (i - (plankCount - 1) / 2) * 10;
      }

      plank.setStrokeStyle(1, 0x3d2817);
      this.barricadePlanks.push(plank);
      this.add(plank);
    }
  }

  /**
   * Met à jour le visuel de la barricade selon les dégâts
   */
  private updateBarricadeVisual(): void {
    if (!this.barricadeVisual) return;

    const healthRatio = this.barricadeHealth / this.maxBarricadeHealth;

    // Réduire l'opacité selon les dégâts
    this.barricadeVisual.setAlpha(0.4 + healthRatio * 0.4);

    // Masquer les planches progressivement
    const plankThreshold = 1 / this.barricadePlanks.length;
    this.barricadePlanks.forEach((plank, index) => {
      const minHealth = (this.barricadePlanks.length - 1 - index) * plankThreshold;
      plank.setVisible(healthRatio > minHealth);
    });
  }

  /**
   * Nettoie les visuels de barricade
   */
  private clearBarricadeVisual(): void {
    if (this.barricadeVisual) {
      this.barricadeVisual.destroy();
      this.barricadeVisual = null;
    }

    this.barricadePlanks.forEach((plank) => plank.destroy());
    this.barricadePlanks = [];
  }

  /**
   * Récupère les informations de la barricade
   */
  public getBarricadeInfo(): { type: BarricadeType | null; health: number; maxHealth: number } {
    return {
      type: this.barricadeType,
      health: this.barricadeHealth,
      maxHealth: this.maxBarricadeHealth,
    };
  }

  // ============================================================================
  // TRAP SYSTEM (5.5.2)
  // ============================================================================

  /**
   * Place un piège sur la porte
   * @returns true si le piège a été placé avec succès
   */
  public setTrap(trapConfig: DoorTrapConfig): boolean {
    if (this.isDestroyed) return false;
    if (this.trap !== null) return false;

    this.trap = { ...trapConfig };
    this.trapChargesRemaining = trapConfig.charges;

    this.createTrapVisual();

    this.scene.events.emit('door:trap_set', {
      doorId: this.id,
      trapType: trapConfig.type,
      charges: trapConfig.charges,
    });

    return true;
  }

  /**
   * Vérifie si la porte a un piège
   */
  public hasTrap(): boolean {
    return this.trap !== null && this.trapChargesRemaining > 0;
  }

  /**
   * Déclenche le piège (appelé quand un zombie spawn)
   * @returns Les effets du piège à appliquer
   */
  public triggerTrap(): {
    triggered: boolean;
    type?: DoorTrapType;
    damage?: number;
    slowFactor?: number;
    fireDuration?: number;
    position?: { x: number; y: number };
  } {
    if (!this.hasTrap()) {
      return { triggered: false };
    }

    this.trapChargesRemaining--;

    const result = {
      triggered: true,
      type: this.trap!.type,
      damage: this.trap!.damage,
      slowFactor: this.trap!.slowFactor,
      fireDuration: this.trap!.fireDuration,
      position: this.getSpawnPosition(),
    };

    this.scene.events.emit('door:trap_triggered', {
      doorId: this.id,
      trapType: this.trap!.type,
      chargesRemaining: this.trapChargesRemaining,
    });

    // Mettre à jour le visuel
    this.updateTrapVisual();

    // Supprimer le piège si plus de charges
    if (this.trapChargesRemaining <= 0) {
      this.removeTrap();
    }

    return result;
  }

  /**
   * Supprime le piège
   */
  public removeTrap(): void {
    this.trap = null;
    this.trapChargesRemaining = 0;
    this.clearTrapVisual();
  }

  /**
   * Crée le visuel du piège
   */
  private createTrapVisual(): void {
    this.clearTrapVisual();

    if (!this.trap) return;

    // Couleur selon le type de piège
    let trapColor: number;
    switch (this.trap.type) {
      case DoorTrapType.SPIKE:
        trapColor = 0x7f8c8d; // Gris métallique
        break;
      case DoorTrapType.SLOW:
        trapColor = 0x3498db; // Bleu
        break;
      case DoorTrapType.FIRE:
        trapColor = 0xe67e22; // Orange
        break;
    }

    // Indicateur de piège au coin de la porte
    const trapSize = 12;
    this.trapVisual = this.scene.add.rectangle(
      this.doorWidth / 2 - trapSize / 2 - 2,
      -this.doorHeight / 2 + trapSize / 2 + 2,
      trapSize,
      trapSize,
      trapColor,
      0.9
    );
    this.trapVisual.setStrokeStyle(1, 0x000000);
    this.add(this.trapVisual);
  }

  /**
   * Met à jour le visuel du piège selon les charges restantes
   */
  private updateTrapVisual(): void {
    if (!this.trapVisual || !this.trap) return;

    const chargeRatio = this.trapChargesRemaining / this.trap.charges;
    this.trapVisual.setAlpha(0.4 + chargeRatio * 0.5);
  }

  /**
   * Nettoie le visuel du piège
   */
  private clearTrapVisual(): void {
    if (this.trapVisual) {
      this.trapVisual.destroy();
      this.trapVisual = null;
    }
  }

  /**
   * Récupère les informations du piège
   */
  public getTrapInfo(): { trap: DoorTrapConfig | null; chargesRemaining: number } {
    return {
      trap: this.trap ? { ...this.trap } : null,
      chargesRemaining: this.trapChargesRemaining,
    };
  }

  // ============================================================================
  // DESTRUCTION SYSTEM (5.5.3)
  // ============================================================================

  /**
   * Détruit la porte (appelé par un boss)
   * Une porte détruite spawne plus rapidement et ne peut pas être réparée
   */
  public destroyDoor(destroyedBy?: string): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    this.state = DoorState.DESTROYED;
    this.spawnSpeedMultiplier = BALANCE.doors.destroyedSpawnMultiplier;

    // Nettoyer les systèmes existants
    this.stopPulseAnimation();
    this.clearBarricadeVisual();
    this.clearTrapVisual();
    this.barricadeType = null;
    this.barricadeHealth = 0;
    this.trap = null;

    // Créer le visuel de destruction
    this.createDestroyedVisual();

    // Émettre l'événement
    this.scene.events.emit('door:destroy', {
      doorId: this.id,
      destroyedBy,
    });

    // Screen shake pour l'effet dramatique
    this.scene.cameras.main.shake(300, 0.01);
  }

  /**
   * Crée le visuel de la porte détruite
   */
  private createDestroyedVisual(): void {
    // Modifier le cadre pour paraître endommagé
    this.doorFrame.setFillStyle(0x1a1a1a, 1);
    this.doorFrame.setStrokeStyle(3, 0x8b0000);

    // Ajouter des débris visuels
    this.destroyedVisual = this.scene.add.rectangle(
      0, 0,
      this.doorWidth,
      this.doorHeight,
      0x000000,
      0.5
    );
    this.add(this.destroyedVisual);

    // Animation de lueur rouge permanente (danger)
    this.doorGlow.setAlpha(0.4);
    this.pulseTween = this.scene.tweens.add({
      targets: this.doorGlow,
      alpha: { from: 0.3, to: 0.7 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Vérifie si la porte est détruite
   */
  public isDoorDestroyed(): boolean {
    return this.isDestroyed;
  }

  /**
   * Récupère le multiplicateur de vitesse de spawn
   */
  public getSpawnSpeedMultiplier(): number {
    return this.spawnSpeedMultiplier;
  }

  /**
   * Vérifie si la porte peut spawner (active ou détruite, pas barricadée)
   */
  public canSpawn(): boolean {
    if (this.hasBarricade()) return false;
    return this.state === DoorState.ACTIVE || this.isDestroyed;
  }

  // ============================================================================
  // TACTICAL MENU INTEGRATION (5.5.4)
  // ============================================================================

  /**
   * Récupère le coût pour barricader la porte
   */
  public getBarricadeCost(type: BarricadeType): number {
    return BALANCE.doors.barricades[type].cost;
  }

  /**
   * Récupère le coût pour placer un piège
   */
  public getTrapCost(type: DoorTrapType): number {
    return BALANCE.doors.traps[type].cost;
  }

  /**
   * Récupère le coût pour réparer la barricade
   */
  public getRepairCost(): number {
    if (!this.hasBarricade()) return 0;
    return BALANCE.doors.repairCost;
  }

  /**
   * Vérifie si la porte peut être barricadée
   */
  public canBarricade(): boolean {
    return !this.isDestroyed && !this.hasBarricade();
  }

  /**
   * Vérifie si la porte peut recevoir un piège
   */
  public canTrap(): boolean {
    return !this.isDestroyed && !this.hasTrap();
  }

  /**
   * Vérifie si la barricade peut être réparée
   */
  public canRepair(): boolean {
    return this.hasBarricade() && this.barricadeHealth < this.maxBarricadeHealth;
  }

  /**
   * Récupère toutes les informations de la porte pour le menu tactique
   */
  public getDoorStatus(): {
    id: string;
    state: DoorState;
    side: 'top' | 'bottom' | 'left' | 'right';
    position: { x: number; y: number };
    isDestroyed: boolean;
    barricade: { type: BarricadeType | null; health: number; maxHealth: number };
    trap: { type: DoorTrapType | null; chargesRemaining: number };
    canBarricade: boolean;
    canTrap: boolean;
    canRepair: boolean;
  } {
    return {
      id: this.id,
      state: this.state,
      side: this.side,
      position: { x: this.x, y: this.y },
      isDestroyed: this.isDestroyed,
      barricade: this.getBarricadeInfo(),
      trap: {
        type: this.trap?.type || null,
        chargesRemaining: this.trapChargesRemaining,
      },
      canBarricade: this.canBarricade(),
      canTrap: this.canTrap(),
      canRepair: this.canRepair(),
    };
  }

  /**
   * Nettoie la porte
   */
  public destroy(fromScene?: boolean): void {
    this.stopPulseAnimation();
    this.clearBarricadeVisual();
    this.clearTrapVisual();
    if (this.destroyedVisual) {
      this.destroyedVisual.destroy();
    }
    super.destroy(fromScene);
  }
}
