/**
 * CompanionDog Entity - Phase 7.2.6
 *
 * Max, le chien compagnon de Lily.
 * Suit le joueur, attaque les zombies et détecte les menaces.
 */

import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';

export interface CompanionDogConfig {
  attackDamage: number;
  attackCooldown: number;
  detectionRadius: number;
  followDistance: number;
  moveSpeed: number;
}

const DEFAULT_DOG_CONFIG: CompanionDogConfig = {
  attackDamage: 5,
  attackCooldown: 1000,
  detectionRadius: 100,
  followDistance: 60,
  moveSpeed: 220,
};

/**
 * Max - Le chien compagnon
 */
export class CompanionDog extends Phaser.GameObjects.Container {
  declare public scene: GameScene;

  private owner: Player;
  private config: CompanionDogConfig;
  private lastAttackTime: number = 0;
  private lastBarkTime: number = 0;

  // Visuels
  private dogBody!: Phaser.GameObjects.Ellipse;
  private dogHead!: Phaser.GameObjects.Ellipse;
  private dogTail!: Phaser.GameObjects.Arc;
  private eyeLeft!: Phaser.GameObjects.Arc;
  private eyeRight!: Phaser.GameObjects.Arc;

  // État
  private targetZombie: Zombie | null = null;
  private isBarking: boolean = false;

  constructor(
    scene: GameScene,
    owner: Player,
    config: Partial<CompanionDogConfig> = {}
  ) {
    super(scene, owner.x + 30, owner.y + 30);

    this.owner = owner;
    this.config = { ...DEFAULT_DOG_CONFIG, ...config };

    // Créer les visuels du chien
    this.createVisuals();

    // Ajouter au jeu
    scene.add.existing(this);
  }

  /**
   * Crée les éléments visuels du chien
   */
  private createVisuals(): void {
    // Corps (ellipse horizontale)
    this.dogBody = this.scene.add.ellipse(0, 0, 20, 12, 0x8B4513);
    this.add(this.dogBody);

    // Tête
    this.dogHead = this.scene.add.ellipse(12, -2, 10, 8, 0x8B4513);
    this.add(this.dogHead);

    // Oreilles
    const earLeft = this.scene.add.triangle(10, -8, 0, 6, 3, 0, 6, 6, 0x6B3513);
    const earRight = this.scene.add.triangle(14, -8, 0, 6, 3, 0, 6, 6, 0x6B3513);
    this.add(earLeft);
    this.add(earRight);

    // Yeux
    this.eyeLeft = this.scene.add.arc(10, -3, 2, 0, 360, false, 0x000000);
    this.eyeRight = this.scene.add.arc(14, -3, 2, 0, 360, false, 0x000000);
    this.add(this.eyeLeft);
    this.add(this.eyeRight);

    // Queue
    this.dogTail = this.scene.add.arc(-12, 0, 6, -90, 90, false, 0x8B4513);
    this.add(this.dogTail);
  }

  /**
   * Mise à jour du chien
   */
  update(_time: number, delta: number): void {
    if (!this.active || !this.owner.active) return;

    // Suivre le joueur
    this.followOwner(delta);

    // Attaquer les zombies proches
    this.attackNearbyZombies();

    // Détecter les menaces cachées
    this.detectHiddenThreats();

    // Animer la queue
    this.animateTail();
  }

  /**
   * Suit le propriétaire
   */
  private followOwner(delta: number): void {
    const distance = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.owner.x, this.owner.y
    );

    // Si trop loin, se rapprocher
    if (distance > this.config.followDistance) {
      const angle = Phaser.Math.Angle.Between(
        this.x, this.y,
        this.owner.x, this.owner.y
      );

      const speed = this.config.moveSpeed * (delta / 1000);
      this.x += Math.cos(angle) * speed;
      this.y += Math.sin(angle) * speed;

      // Orienter le chien
      this.setScale(angle > Math.PI / 2 || angle < -Math.PI / 2 ? -1 : 1, 1);
    }

    // Position cible légèrement décalée
    if (distance < 30) {
      // Position aléatoire proche du joueur
      const offsetAngle = Math.sin(this.scene.time.now * 0.002) * 0.5;
      const targetX = this.owner.x + Math.cos(offsetAngle) * this.config.followDistance;
      const targetY = this.owner.y + Math.sin(offsetAngle) * this.config.followDistance * 0.5;

      this.x = Phaser.Math.Linear(this.x, targetX, 0.05);
      this.y = Phaser.Math.Linear(this.y, targetY, 0.05);
    }
  }

  /**
   * Attaque les zombies proches
   */
  private attackNearbyZombies(): void {
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastAttackTime < this.config.attackCooldown) {
      return;
    }

    // Trouver le zombie le plus proche
    const zombies = (this.scene as any).zombies?.getChildren() as Zombie[];
    if (!zombies || zombies.length === 0) {
      this.targetZombie = null;
      return;
    }

    let nearest: Zombie | null = null;
    let nearestDistance = this.config.detectionRadius;

    for (const zombie of zombies) {
      if (!zombie.active) continue;

      const distance = Phaser.Math.Distance.Between(
        this.x, this.y,
        zombie.x, zombie.y
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = zombie;
      }
    }

    if (nearest) {
      this.targetZombie = nearest;
      this.attack(nearest);
      this.lastAttackTime = currentTime;
    } else {
      this.targetZombie = null;
    }
  }

  /**
   * Attaque un zombie
   */
  private attack(zombie: Zombie): void {
    // Infliger des dégâts
    zombie.takeDamage(this.config.attackDamage);

    // Animation d'attaque
    this.playAttackAnimation(zombie);

    // Son d'attaque
    if (this.scene.sound.get('dog_bite')) {
      this.scene.sound.play('dog_bite', { volume: 0.4 });
    }
  }

  /**
   * Animation d'attaque
   */
  private playAttackAnimation(target: Zombie): void {
    // Dash rapide vers la cible
    const startX = this.x;
    const startY = this.y;

    this.scene.tweens.add({
      targets: this,
      x: target.x,
      y: target.y,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.x = startX;
        this.y = startY;
      },
    });

    // Effet visuel de morsure
    const bite = this.scene.add.text(target.x, target.y - 20, '🦴', {
      fontSize: '12px',
    });
    this.scene.tweens.add({
      targets: bite,
      y: bite.y - 20,
      alpha: 0,
      duration: 500,
      onComplete: () => bite.destroy(),
    });
  }

  /**
   * Détecte les menaces cachées (Crawlers, Invisibles)
   */
  private detectHiddenThreats(): void {
    const currentTime = this.scene.time.now;
    const barkCooldown = 5000; // Aboyer toutes les 5 secondes max

    if (currentTime - this.lastBarkTime < barkCooldown) {
      return;
    }

    const zombies = (this.scene as any).zombies?.getChildren() as Zombie[];
    if (!zombies) return;

    const detectionRange = this.config.detectionRadius * 2;

    for (const zombie of zombies) {
      if (!zombie.active) continue;

      // Vérifier si c'est un type menaçant
      const zombieType = (zombie as any).zombieType || '';
      const isHiddenThreat = ['crawler', 'invisible'].includes(zombieType);

      if (!isHiddenThreat) continue;

      const distance = Phaser.Math.Distance.Between(
        this.x, this.y,
        zombie.x, zombie.y
      );

      if (distance < detectionRange) {
        this.bark();
        this.lastBarkTime = currentTime;

        // Révéler le zombie temporairement
        if (typeof (zombie as any).setRevealed === 'function') {
          (zombie as any).setRevealed(true);
          this.scene.time.delayedCall(3000, () => {
            if (zombie.active && typeof (zombie as any).setRevealed === 'function') {
              (zombie as any).setRevealed(false);
            }
          });
        }

        break;
      }
    }
  }

  /**
   * Fait aboyer le chien
   */
  private bark(): void {
    if (this.isBarking) return;

    this.isBarking = true;

    // Effet visuel d'aboiement
    const barkText = this.scene.add.text(this.x, this.y - 25, '!', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ff0000',
    });
    barkText.setOrigin(0.5);

    this.scene.tweens.add({
      targets: barkText,
      y: barkText.y - 15,
      alpha: 0,
      scale: 1.5,
      duration: 800,
      onComplete: () => barkText.destroy(),
    });

    // Son d'aboiement
    if (this.scene.sound.get('dog_bark')) {
      this.scene.sound.play('dog_bark', { volume: 0.5 });
    }

    // Secouer le chien
    this.scene.tweens.add({
      targets: this,
      scaleY: 1.2,
      yoyo: true,
      duration: 100,
      repeat: 2,
      onComplete: () => {
        this.isBarking = false;
      },
    });
  }

  /**
   * Anime la queue du chien
   */
  private animateTail(): void {
    // Remuer la queue si près du joueur ou d'une cible
    const isHappy = !this.targetZombie && Phaser.Math.Distance.Between(
      this.x, this.y,
      this.owner.x, this.owner.y
    ) < this.config.followDistance * 1.5;

    if (isHappy) {
      const wagAngle = Math.sin(this.scene.time.now * 0.015) * 30;
      this.dogTail.setAngle(wagAngle);
    } else {
      // Queue droite en mode alerte
      this.dogTail.setAngle(0);
    }
  }

  /**
   * Récupère le propriétaire
   */
  getOwner(): Player {
    return this.owner;
  }

  /**
   * Téléporte le chien près du joueur
   */
  teleportToOwner(): void {
    this.x = this.owner.x + Phaser.Math.Between(-30, 30);
    this.y = this.owner.y + Phaser.Math.Between(-30, 30);
  }

  /**
   * Destruction du chien
   */
  destroy(fromScene?: boolean): void {
    // Effet de disparition triste
    if (this.scene && this.active) {
      const hearts = this.scene.add.text(this.x, this.y, '💔', {
        fontSize: '20px',
      });
      this.scene.tweens.add({
        targets: hearts,
        y: hearts.y - 30,
        alpha: 0,
        duration: 1000,
        onComplete: () => hearts.destroy(),
      });
    }

    super.destroy(fromScene);
  }
}
