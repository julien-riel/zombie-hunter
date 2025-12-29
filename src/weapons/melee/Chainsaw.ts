import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';
import { BALANCE } from '@config/balance';

/**
 * Tronçonneuse
 * - DPS continu (pas de coups discrets)
 * - Consomme du carburant
 * - Ralentit le joueur pendant utilisation
 * - Effet sonore distinctif (visuel pour l'instant)
 */
export class Chainsaw {
  protected scene: GameScene;
  protected owner: Player;

  private damage: number;
  private range: number;
  private tickRate: number;
  private fuelConsumption: number;

  private _currentFuel: number;
  private _maxFuel: number;

  private isActive: boolean = false;
  private lastTickTime: number = 0;

  /** Graphique pour visualiser la zone d'effet */
  private effectGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: GameScene, owner: Player) {
    this.scene = scene;
    this.owner = owner;

    this.damage = BALANCE.weapons.chainsaw.damage;
    this.range = BALANCE.weapons.chainsaw.range;
    this.tickRate = BALANCE.weapons.chainsaw.tickRate;
    this.fuelConsumption = BALANCE.weapons.chainsaw.fuelConsumption;
    this._maxFuel = BALANCE.weapons.chainsaw.maxFuel;
    this._currentFuel = this._maxFuel;

    // Créer le graphique pour l'effet
    this.effectGraphics = scene.add.graphics();
    this.effectGraphics.setDepth(10);
  }

  /**
   * Active la tronçonneuse
   */
  public fire(direction: Phaser.Math.Vector2): boolean {
    if (this._currentFuel <= 0) return false;

    if (!this.isActive) {
      this.isActive = true;
      // Sauvegarder et réduire la vitesse du joueur
      // Note: Pour l'instant, on ne modifie pas directement la vitesse
      // car le système de mouvement est dans Player
    }

    // La direction est stockée pour le ticking
    this.owner.setData('chainsawDirection', direction);

    return true;
  }

  /**
   * Met à jour la tronçonneuse (appelé chaque frame)
   */
  public update(): void {
    // Vérifier si le bouton de tir est maintenu
    const pointer = this.scene.input.activePointer;
    const isHeld = pointer.isDown && pointer.leftButtonDown();

    if (!isHeld || this._currentFuel <= 0) {
      this.deactivate();
      return;
    }

    // Mettre à jour la direction
    const direction = new Phaser.Math.Vector2(
      pointer.worldX - this.owner.x,
      pointer.worldY - this.owner.y
    ).normalize();

    this.owner.setData('chainsawDirection', direction);

    // Effectuer le tick si assez de temps s'est écoulé
    const now = this.scene.time.now;
    if (now - this.lastTickTime >= this.tickRate) {
      this.performTick(direction);
      this.lastTickTime = now;
    }

    // Dessiner l'effet visuel
    this.drawEffect(direction);
  }

  /**
   * Effectue un tick de dégâts
   */
  private performTick(direction: Phaser.Math.Vector2): void {
    // Consommer le carburant
    this._currentFuel = Math.max(0, this._currentFuel - this.fuelConsumption);

    // Détecter les zombies devant le joueur
    const hitZombies = this.detectZombiesInFront(direction);

    // Infliger les dégâts
    for (const zombie of hitZombies) {
      zombie.takeDamage(this.damage);
      this.createDamageEffect(zombie.x, zombie.y);
    }
  }

  /**
   * Détecte les zombies dans un cône devant le joueur
   */
  private detectZombiesInFront(direction: Phaser.Math.Vector2): Zombie[] {
    const hitZombies: Zombie[] = [];
    const centerAngle = Math.atan2(direction.y, direction.x);
    const halfArc = Phaser.Math.DegToRad(60); // 120° de cône
    const activeZombies = this.scene.getActiveZombies();

    for (const zombie of activeZombies) {
      if (!zombie.active) continue;

      const dx = zombie.x - this.owner.x;
      const dy = zombie.y - this.owner.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.range) continue;

      const angleToZombie = Math.atan2(dy, dx);
      let angleDiff = angleToZombie - centerAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= halfArc) {
        hitZombies.push(zombie);
      }
    }

    return hitZombies;
  }

  /**
   * Dessine l'effet visuel de la tronçonneuse active
   */
  private drawEffect(direction: Phaser.Math.Vector2): void {
    if (!this.effectGraphics) return;

    this.effectGraphics.clear();

    const centerAngle = Math.atan2(direction.y, direction.x);
    const halfArc = Phaser.Math.DegToRad(60);

    // Effet de vibration
    const vibration = (Math.random() - 0.5) * 5;

    // Zone d'effet
    this.effectGraphics.lineStyle(2, 0xff6600, 0.7);
    this.effectGraphics.fillStyle(0xff3300, 0.2);

    this.effectGraphics.beginPath();
    this.effectGraphics.moveTo(this.owner.x + vibration, this.owner.y + vibration);
    this.effectGraphics.arc(
      this.owner.x + vibration,
      this.owner.y + vibration,
      this.range,
      centerAngle - halfArc,
      centerAngle + halfArc,
      false
    );
    this.effectGraphics.closePath();
    this.effectGraphics.fillPath();
    this.effectGraphics.strokePath();

    // Lignes de "dents" (effet visuel)
    this.effectGraphics.lineStyle(1, 0xff9900, 0.8);
    const teethCount = 8;
    for (let i = 0; i < teethCount; i++) {
      const angle = centerAngle - halfArc + (i / teethCount) * halfArc * 2;
      const r1 = this.range * 0.3;
      const r2 = this.range * (0.8 + Math.random() * 0.2);

      this.effectGraphics.beginPath();
      this.effectGraphics.moveTo(
        this.owner.x + Math.cos(angle) * r1,
        this.owner.y + Math.sin(angle) * r1
      );
      this.effectGraphics.lineTo(
        this.owner.x + Math.cos(angle) * r2,
        this.owner.y + Math.sin(angle) * r2
      );
      this.effectGraphics.strokePath();
    }
  }

  /**
   * Crée un effet de dégâts
   */
  private createDamageEffect(x: number, y: number): void {
    // Particules de sang
    for (let i = 0; i < 2; i++) {
      const blood = this.scene.add.circle(
        x + (Math.random() - 0.5) * 15,
        y + (Math.random() - 0.5) * 15,
        3 + Math.random() * 3,
        0xff0000,
        0.8
      );

      this.scene.tweens.add({
        targets: blood,
        x: blood.x + (Math.random() - 0.5) * 30,
        y: blood.y + (Math.random() - 0.5) * 30,
        alpha: 0,
        scale: 0.3,
        duration: 200,
        onComplete: () => {
          blood.destroy();
        },
      });
    }
  }

  /**
   * Désactive la tronçonneuse
   */
  private deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    if (this.effectGraphics) {
      this.effectGraphics.clear();
    }
  }

  /**
   * Recharge le carburant
   */
  public refuel(amount: number): void {
    this._currentFuel = Math.min(this._maxFuel, this._currentFuel + amount);
  }

  /**
   * Recharge complète (simule un rechargement)
   */
  public reload(): void {
    // La tronçonneuse ne se recharge pas, elle consomme du carburant
    // Pour obtenir plus de carburant, le joueur doit ramasser des jerrycans
  }

  // === Propriétés pour compatibilité avec le système d'armes ===

  public get currentAmmo(): number {
    return Math.ceil(this._currentFuel);
  }

  public get maxAmmo(): number {
    return this._maxFuel;
  }

  public get isReloading(): boolean {
    return false;
  }

  public getDamage(): number {
    return this.damage;
  }

  public getName(): string {
    return 'Tronçonneuse';
  }

  public isMelee(): boolean {
    return true;
  }

  /**
   * Retourne le carburant actuel
   */
  public getFuel(): number {
    return this._currentFuel;
  }

  /**
   * Retourne le carburant maximum
   */
  public getMaxFuel(): number {
    return this._maxFuel;
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    if (this.effectGraphics) {
      this.effectGraphics.destroy();
      this.effectGraphics = null;
    }
  }
}
