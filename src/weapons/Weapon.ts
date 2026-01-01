import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';

/**
 * Configuration d'une arme
 */
export interface WeaponConfig {
  name: string;
  damage: number;
  fireRate: number; // Temps entre les tirs en ms
  maxAmmo: number;
  reloadTime: number; // Temps de rechargement en ms
  bulletSpeed: number;
  spread?: number; // Angle de dispersion en radians
}

/**
 * Classe de base pour toutes les armes
 */
export abstract class Weapon {
  protected scene: GameScene;
  protected owner: Player;
  protected config: WeaponConfig;

  public currentAmmo: number;
  public maxAmmo: number;
  public isReloading: boolean = false;

  protected lastFireTime: number = 0;
  protected canFire: boolean = true;

  constructor(scene: GameScene, owner: Player, config: WeaponConfig) {
    this.scene = scene;
    this.owner = owner;
    this.config = config;
    this.maxAmmo = config.maxAmmo;
    this.currentAmmo = this.maxAmmo;
  }

  /**
   * Tire avec l'arme
   */
  public fire(direction: Phaser.Math.Vector2): boolean {
    const now = this.scene.time.now;

    if (!this.canFire || this.isReloading) return false;
    if (this.currentAmmo <= 0) {
      this.reload();
      return false;
    }
    if (now - this.lastFireTime < this.config.fireRate) return false;

    this.lastFireTime = now;
    this.currentAmmo--;

    // Émettre l'événement de tir pour la télémétrie
    this.scene.events.emit('weaponFired', { weapon: this.config.name });

    // Appliquer le spread si configuré
    let finalDirection = direction.clone();
    if (this.config.spread) {
      const spreadAngle = (Math.random() - 0.5) * this.config.spread;
      finalDirection = finalDirection.rotate(spreadAngle);
    }

    // Créer le projectile via la méthode spécifique de l'arme
    this.createProjectile(finalDirection);

    return true;
  }

  /**
   * Crée le projectile spécifique à l'arme
   */
  protected abstract createProjectile(direction: Phaser.Math.Vector2): void;

  /**
   * Recharge l'arme
   */
  public reload(): void {
    if (this.isReloading || this.currentAmmo === this.maxAmmo) return;

    this.isReloading = true;
    this.canFire = false;

    this.scene.time.delayedCall(this.config.reloadTime, () => {
      this.currentAmmo = this.maxAmmo;
      this.isReloading = false;
      this.canFire = true;
    });
  }

  /**
   * Met à jour l'arme
   */
  public update(): void {
    // Override dans les sous-classes si nécessaire
  }

  /**
   * Retourne les dégâts de l'arme
   */
  public getDamage(): number {
    return this.config.damage;
  }

  /**
   * Retourne le nom de l'arme
   */
  public getName(): string {
    return this.config.name;
  }

  /**
   * Retourne la taille du chargeur
   */
  public getMagazineSize(): number {
    return this.maxAmmo;
  }

  /**
   * Ajoute des munitions à l'arme
   * @param amount Nombre de munitions à ajouter
   * @returns Le nombre de munitions effectivement ajoutées
   */
  public addAmmo(amount: number): number {
    const previousAmmo = this.currentAmmo;
    this.currentAmmo = Math.min(this.maxAmmo, this.currentAmmo + amount);
    return this.currentAmmo - previousAmmo;
  }

  /**
   * Vérifie si le chargeur est plein
   */
  public isFullAmmo(): boolean {
    return this.currentAmmo >= this.maxAmmo;
  }

  /**
   * Détruit l'arme et libère les ressources
   * Override dans les sous-classes si nécessaire
   */
  public destroy(): void {
    // Implémentation par défaut vide
    // Les sous-classes peuvent override pour libérer des ressources
  }
}
