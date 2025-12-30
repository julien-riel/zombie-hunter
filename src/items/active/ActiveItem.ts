import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Types d'objets actifs disponibles
 */
export type ActiveItemType = 'turret' | 'mine' | 'drone' | 'decoy' | 'discoball';

/**
 * Raretés des objets actifs
 */
export type ActiveItemRarity = 'common' | 'rare' | 'legendary';

/**
 * Configuration de base d'un objet actif
 */
export interface ActiveItemConfig {
  type: ActiveItemType;
  rarity: ActiveItemRarity;
  color: number;
  name: string;
  description: string;
}

/**
 * État d'un objet actif déployé
 */
export interface DeployedItemState {
  id: string;
  type: ActiveItemType;
  position: { x: number; y: number };
  health?: number;
  timeRemaining?: number;
}

/**
 * Classe abstraite de base pour tous les objets actifs
 *
 * Les objets actifs sont des outils tactiques que le joueur
 * peut déployer manuellement pour obtenir un avantage temporaire.
 *
 * Contrairement aux power-ups (effets passifs), les objets actifs
 * créent des entités physiques dans le monde de jeu.
 *
 * Chaque objet actif doit implémenter:
 * - use(): Déploie l'objet à une position
 * - update(): Met à jour l'objet chaque frame
 * - destroy(): Retire l'objet du jeu
 */
export abstract class ActiveItem {
  /** Type de l'objet actif */
  public abstract readonly type: ActiveItemType;

  /** Rareté de l'objet */
  public abstract readonly rarity: ActiveItemRarity;

  /** Couleur associée à l'objet */
  public abstract readonly color: number;

  /** Nom affiché */
  public abstract readonly name: string;

  /** Description de l'effet */
  public abstract readonly description: string;

  /** Identifiant unique de l'instance */
  protected id: string;

  /** Référence à la scène de jeu */
  protected scene: GameScene | null = null;

  /** Référence au joueur */
  protected player: Player | null = null;

  /** Position de déploiement */
  protected position: { x: number; y: number } = { x: 0, y: 0 };

  /** Indique si l'objet est actif/déployé */
  protected isDeployed: boolean = false;

  /** Temps restant avant expiration (pour objets à durée limitée) */
  protected timeRemaining: number = 0;

  /** Durée totale (pour calcul du pourcentage restant) */
  protected duration: number = 0;

  constructor() {
    this.id = this.generateId();
  }

  /**
   * Génère un identifiant unique
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Récupère l'identifiant de l'objet
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Déploie l'objet actif à une position
   * @param player Le joueur qui utilise l'objet
   * @param scene La scène de jeu
   * @param x Position X de déploiement
   * @param y Position Y de déploiement
   * @returns true si le déploiement a réussi
   */
  public use(player: Player, scene: GameScene, x: number, y: number): boolean {
    if (this.isDeployed) {
      console.warn(`[ActiveItem] ${this.type} is already deployed`);
      return false;
    }

    this.player = player;
    this.scene = scene;
    this.position = { x, y };
    this.isDeployed = true;

    // Appliquer le déploiement spécifique
    const success = this.onDeploy(player, scene, x, y);

    if (success) {
      // Émettre l'événement de déploiement
      scene.events.emit('activeitem:deploy', {
        itemType: this.type,
        itemId: this.id,
        position: { x, y },
      });

      console.log(`[ActiveItem] Deployed ${this.type} at (${x}, ${y})`);
    } else {
      this.isDeployed = false;
    }

    return success;
  }

  /**
   * Met à jour l'objet actif
   * @param delta Temps écoulé depuis la dernière frame (ms)
   * @returns true si l'objet est encore actif, false s'il doit être retiré
   */
  public update(delta: number): boolean {
    if (!this.isDeployed) return false;

    // Gérer la durée de vie si applicable
    if (this.duration > 0) {
      this.timeRemaining -= delta;
      if (this.timeRemaining <= 0) {
        this.destroy();
        return false;
      }
    }

    // Mise à jour spécifique à l'objet
    if (this.scene && this.player) {
      return this.onUpdate(delta, this.player, this.scene);
    }

    return true;
  }

  /**
   * Détruit l'objet actif et le retire du jeu
   */
  public destroy(): void {
    if (!this.isDeployed) return;

    // Retirer l'objet spécifique
    if (this.player && this.scene) {
      this.onDestroy(this.player, this.scene);

      // Émettre l'événement de destruction
      this.scene.events.emit('activeitem:destroy', {
        itemType: this.type,
        itemId: this.id,
        position: this.position,
      });
    }

    this.isDeployed = false;
    this.timeRemaining = 0;
    this.player = null;
    this.scene = null;

    console.log(`[ActiveItem] Destroyed ${this.type}`);
  }

  /**
   * Vérifie si l'objet est déployé
   */
  public getIsDeployed(): boolean {
    return this.isDeployed;
  }

  /**
   * Récupère la position de l'objet
   */
  public getPosition(): { x: number; y: number } {
    return { ...this.position };
  }

  /**
   * Récupère le temps restant en ms
   */
  public getTimeRemaining(): number {
    return this.timeRemaining;
  }

  /**
   * Récupère le pourcentage de temps restant (0-1)
   */
  public getTimeRemainingPercent(): number {
    if (this.duration === 0) return 1;
    return Math.max(0, this.timeRemaining / this.duration);
  }

  /**
   * Récupère l'état de l'objet déployé
   */
  public getState(): DeployedItemState | null {
    if (!this.isDeployed) return null;

    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      timeRemaining: this.timeRemaining > 0 ? this.timeRemaining : undefined,
    };
  }

  /**
   * Méthode appelée lors du déploiement de l'objet
   * À implémenter dans les classes dérivées
   * @returns true si le déploiement a réussi
   */
  protected abstract onDeploy(
    player: Player,
    scene: GameScene,
    x: number,
    y: number
  ): boolean;

  /**
   * Méthode appelée à chaque frame pendant que l'objet est actif
   * À implémenter dans les classes dérivées
   * @returns true si l'objet doit rester actif, false pour le détruire
   */
  protected abstract onUpdate(
    delta: number,
    player: Player,
    scene: GameScene
  ): boolean;

  /**
   * Méthode appelée lors de la destruction de l'objet
   * À implémenter dans les classes dérivées
   */
  protected abstract onDestroy(player: Player, scene: GameScene): void;
}
