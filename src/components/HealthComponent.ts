import type { Entity } from '@entities/Entity';

/**
 * Composant de gestion de la santé
 * Gère les points de vie, les dégâts et la régénération
 */
export class HealthComponent {
  private entity: Entity;
  private health: number;
  private maxHealth: number;
  private invulnerable: boolean = false;

  constructor(entity: Entity, maxHealth: number) {
    this.entity = entity;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
  }

  /**
   * Inflige des dégâts
   * @returns Les dégâts réellement infligés
   */
  public takeDamage(amount: number): number {
    if (this.invulnerable || this.health <= 0) {
      return 0;
    }

    const actualDamage = Math.min(amount, this.health);
    this.health -= actualDamage;

    return actualDamage;
  }

  /**
   * Soigne l'entité
   * @returns Le montant réellement soigné
   */
  public heal(amount: number): number {
    if (this.health >= this.maxHealth) {
      return 0;
    }

    const actualHeal = Math.min(amount, this.maxHealth - this.health);
    this.health += actualHeal;

    return actualHeal;
  }

  /**
   * Vérifie si l'entité est morte
   */
  public isDead(): boolean {
    return this.health <= 0;
  }

  /**
   * Récupère la santé actuelle
   */
  public getHealth(): number {
    return this.health;
  }

  /**
   * Récupère la santé maximum
   */
  public getMaxHealth(): number {
    return this.maxHealth;
  }

  /**
   * Récupère le pourcentage de santé
   */
  public getHealthPercentage(): number {
    return this.health / this.maxHealth;
  }

  /**
   * Définit la santé maximum
   */
  public setMaxHealth(value: number): void {
    this.maxHealth = value;
    if (this.health > this.maxHealth) {
      this.health = this.maxHealth;
    }
  }

  /**
   * Active l'invulnérabilité temporaire
   */
  public setInvulnerable(duration: number): void {
    this.invulnerable = true;

    this.entity.scene.time.delayedCall(duration, () => {
      this.invulnerable = false;
    });
  }

  /**
   * Vérifie si l'entité est invulnérable
   */
  public isInvulnerable(): boolean {
    return this.invulnerable;
  }

  /**
   * Réinitialise la santé au maximum
   */
  public reset(): void {
    this.health = this.maxHealth;
    this.invulnerable = false;
  }
}
