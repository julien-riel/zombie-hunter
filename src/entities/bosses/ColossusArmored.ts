/**
 * Colossus Armored Boss - Phase 7.3
 *
 * Géant portant des débris comme armure.
 * - 4 pièces d'armure (torse, épaule gauche, épaule droite, tête)
 * - Seules les armes perforantes/explosives endommagent l'armure efficacement
 * - Une fois armure détruite, le point faible prend ×1.5 dégâts
 */

import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import { Boss, type BossConfig } from './Boss';
import { BossStateMachine, BossState } from './BossStateMachine';
import { BALANCE } from '@config/balance';

/**
 * Pièce d'armure
 */
interface ArmorPiece {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  destroyed: boolean;
  visual?: Phaser.GameObjects.Rectangle;
}

/**
 * Configuration du Colosse
 */
const COLOSSUS_CONFIG: BossConfig = {
  type: 'colossus',
  name: 'Colosse Blindé',
  maxHealth: BALANCE.bosses?.colossus?.health ?? 2000,
  speed: BALANCE.bosses?.colossus?.speed ?? 60,
  damage: BALANCE.bosses?.colossus?.damage ?? 60,
  attackCooldown: BALANCE.bosses?.colossus?.attackCooldown ?? 3000,
  detectionRange: 500,
  attackRange: 70,
  scoreValue: BALANCE.bosses?.colossus?.scoreValue ?? 800,
  texture: 'boss_colossus',
  scale: 2.5,
  hitboxSize: { width: 80, height: 80 },
  phases: [
    {
      healthThreshold: 1.0,
      behavior: 'armored',
      speedMultiplier: 0.8,
      damageMultiplier: 1.0,
    },
    {
      healthThreshold: 0.6,
      behavior: 'aggressive',
      speedMultiplier: 1.0,
      damageMultiplier: 1.2,
    },
    {
      healthThreshold: 0.3,
      behavior: 'rage',
      speedMultiplier: 1.5,
      damageMultiplier: 1.5,
      onEnter: undefined, // Défini dans le constructeur
    },
  ],
};

/**
 * Colosse Blindé - Boss avec système d'armure
 */
export class ColossusArmored extends Boss {
  /** Pièces d'armure */
  private armorPieces: Map<string, ArmorPiece> = new Map();

  /** Container pour les visuels d'armure */
  private armorContainer!: Phaser.GameObjects.Container;

  /** Cooldown de charge */
  private chargeCooldown: number = 6000;

  /** Timestamp de la dernière charge */
  private lastChargeTime: number = 0;

  /** Indique si une charge est en cours */
  private isCharging: boolean = false;

  /** Vitesse de charge */
  private chargeSpeed: number = 250;

  /** Direction de charge */
  private chargeDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  /** Cooldown de slam */
  private slamCooldown: number = 4000;

  /** Timestamp du dernier slam */
  private lastSlamTime: number = 0;

  constructor(scene: GameScene, x: number, y: number) {
    const config = { ...COLOSSUS_CONFIG };
    config.phases = config.phases.map((phase, index) => ({
      ...phase,
      onEnter: index === 2 ? () => this.enterRagePhase() : undefined,
    }));

    super(scene, x, y, config);

    this.initArmor();
    this.initBossStateMachine();
  }

  /**
   * Initialise les pièces d'armure
   */
  private initArmor(): void {
    // Container pour les visuels d'armure
    this.armorContainer = this.scene.add.container(this.x, this.y);
    this.armorContainer.setDepth(this.depth + 1);

    // Créer les pièces d'armure
    const armorConfig: { id: string; name: string; health: number; offsetX: number; offsetY: number }[] = [
      { id: 'torso', name: 'Torse', health: 600, offsetX: 0, offsetY: 0 },
      { id: 'left_shoulder', name: 'Épaule Gauche', health: 400, offsetX: -30, offsetY: -15 },
      { id: 'right_shoulder', name: 'Épaule Droite', health: 400, offsetX: 30, offsetY: -15 },
      { id: 'head', name: 'Casque', health: 300, offsetX: 0, offsetY: -30 },
    ];

    for (const armor of armorConfig) {
      // Créer le visuel de l'armure
      const visual = this.scene.add.rectangle(
        armor.offsetX,
        armor.offsetY,
        armor.id === 'torso' ? 50 : 25,
        armor.id === 'torso' ? 40 : 20,
        0x666666
      );
      visual.setStrokeStyle(2, 0x888888);
      this.armorContainer.add(visual);

      // Enregistrer la pièce
      this.armorPieces.set(armor.id, {
        id: armor.id,
        name: armor.name,
        health: armor.health,
        maxHealth: armor.health,
        destroyed: false,
        visual,
      });
    }
  }

  /**
   * Initialise la machine d'état
   */
  private initBossStateMachine(): void {
    const stateMachine = new BossStateMachine(this.scene, this);

    stateMachine.configureState(BossState.CHASE, {
      onUpdate: (delta) => this.updateChase(delta),
    });

    stateMachine.configureState(BossState.ATTACK, {
      onEnter: () => this.performAttack(),
      minDuration: 1000,
    });

    stateMachine.configureState(BossState.CHARGE, {
      onEnter: () => this.startCharge(),
      onUpdate: (delta) => this.updateCharge(delta),
      onExit: () => this.endCharge(),
      minDuration: 1500,
    });

    stateMachine.configureState(BossState.SPECIAL_ABILITY, {
      onEnter: () => this.performGroundSlam(),
      minDuration: 2000,
    });

    stateMachine.setDecisionCallback((delta) => this.makeDecision(delta));

    this.initStateMachine(stateMachine);
  }

  /**
   * Animation d'entrée
   */
  protected async entranceAnimation(): Promise<void> {
    return new Promise((resolve) => {
      // Positionnement initial hors écran
      const startY = this.y - 100;
      this.setY(startY);
      this.setAlpha(0);

      // Arrivée massive
      this.scene.tweens.add({
        targets: this,
        y: this.y + 100,
        alpha: 1,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => {
          // Impact au sol
          this.createGroundImpact();
          this.scene.cameras.main.shake(600, 0.04);

          this.scene.time.delayedCall(500, () => {
            resolve();
          });
        },
      });
    });
  }

  /**
   * Crée l'impact au sol
   */
  private createGroundImpact(): void {
    // Onde de choc
    const shockwave = this.scene.add.circle(this.x, this.y, 30, 0x884400, 0.5);
    this.scene.tweens.add({
      targets: shockwave,
      radius: 150,
      alpha: 0,
      duration: 500,
      onComplete: () => shockwave.destroy(),
    });

    // Particules de débris
    const particles = this.scene.add.particles(this.x, this.y, 'pixel', {
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 2, end: 0 },
      lifespan: 800,
      quantity: 30,
      tint: [0x666666, 0x888888, 0x444444],
    });

    this.scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  /**
   * Logique de décision
   */
  private makeDecision(_delta: number): BossState | null {
    if (!this.stateMachine) return null;

    const distance = this.stateMachine.getDistanceToTarget();
    const currentState = this.stateMachine.getCurrentState();
    const now = this.scene.time.now;

    // Charge si assez loin et cooldown prêt
    if (distance > 200 && distance < 500 && now - this.lastChargeTime >= this.chargeCooldown) {
      if (Math.random() < 0.4) {
        return BossState.CHARGE;
      }
    }

    // Slam si proche
    if (distance < 120 && now - this.lastSlamTime >= this.slamCooldown) {
      return BossState.SPECIAL_ABILITY;
    }

    // Attaque si à portée
    if (distance <= this.attackRange && this.canAttack()) {
      return BossState.ATTACK;
    }

    // Poursuivre
    if (currentState !== BossState.CHASE) {
      return BossState.CHASE;
    }

    return null;
  }

  /**
   * Mise à jour de la poursuite
   */
  private updateChase(_delta: number): void {
    if (this.isCharging) return;
    this.stateMachine?.moveTowardsTarget(this.getCurrentSpeed());

    // Mettre à jour la position du container d'armure
    this.updateArmorPosition();
  }

  /**
   * Met à jour la position du container d'armure
   */
  private updateArmorPosition(): void {
    if (this.armorContainer) {
      this.armorContainer.setPosition(this.x, this.y);
    }
  }

  /**
   * Attaque de base
   */
  protected performAttack(): void {
    super.performAttack();
    this.stateMachine?.stopMovement();

    const player = this.scene.getPlayer();
    if (player && player.active) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (distance <= this.attackRange + 30) {
        player.takeDamage(this.getDamage());
        player.applyKnockback(this.x, this.y, 400);
      }
    }
  }

  /**
   * Démarre une charge
   */
  private startCharge(): void {
    this.isCharging = true;
    this.lastChargeTime = this.scene.time.now;

    const target = this.stateMachine?.getTarget();
    if (target) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      this.chargeDirection.set(Math.cos(angle), Math.sin(angle));
    }

    // Préparation visuelle
    this.setTint(0xff6600);

    // Délai avant la charge
    this.scene.time.delayedCall(500, () => {
      if (this.isCharging && this.active) {
        this.setVelocity(
          this.chargeDirection.x * this.chargeSpeed,
          this.chargeDirection.y * this.chargeSpeed
        );
      }
    });
  }

  /**
   * Mise à jour pendant la charge
   */
  private updateCharge(_delta: number): void {
    if (!this.isCharging) return;

    this.updateArmorPosition();

    // Vérifier collision avec le joueur
    const player = this.scene.getPlayer();
    if (player && player.active) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (distance < 60) {
        player.takeDamage(this.getDamage() * 1.5);
        player.applyKnockback(this.x, this.y, 500);
        this.endCharge();
        this.stateMachine?.stun(1000);
      }
    }
  }

  /**
   * Termine la charge
   */
  private endCharge(): void {
    this.isCharging = false;
    this.setVelocity(0, 0);
    this.clearTint();
  }

  /**
   * Effectue un slam au sol
   */
  private performGroundSlam(): void {
    this.lastSlamTime = this.scene.time.now;
    this.stateMachine?.stopMovement();

    // Animation de saut
    const originalY = this.y;

    this.scene.tweens.add({
      targets: this,
      y: originalY - 50,
      duration: 400,
      ease: 'Power2.easeOut',
      yoyo: true,
      onYoyo: () => {
        // Impact au sol
        this.createSlamWave();
      },
    });
  }

  /**
   * Crée l'onde de choc du slam
   */
  private createSlamWave(): void {
    // Onde de choc
    const shockwave = this.scene.add.circle(this.x, this.y, 30, 0x884400, 0.6);
    this.scene.tweens.add({
      targets: shockwave,
      radius: 200,
      alpha: 0,
      duration: 500,
      onComplete: () => shockwave.destroy(),
    });

    // Shake de caméra
    this.scene.cameras.main.shake(400, 0.03);

    // Dégâts dans la zone
    const player = this.scene.getPlayer();
    if (player && player.active) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (distance <= 200) {
        const damageMultiplier = 1 - distance / 250;
        const damage = Math.round(this.getDamage() * damageMultiplier);
        player.takeDamage(damage);
        player.applyKnockback(this.x, this.y, 300);
      }
    }

    this.updateArmorPosition();
  }

  /**
   * Gère les dégâts avec le système d'armure
   */
  public takeDamage(amount: number, hitZone?: string): void {
    if (this.isInvulnerable) return;

    // Déterminer la zone touchée
    const zone = hitZone ?? this.getRandomArmorZone();
    const armorPiece = this.armorPieces.get(zone);

    if (armorPiece && !armorPiece.destroyed) {
      // L'armure absorbe les dégâts
      const armorDamage = this.calculateArmorDamage(amount, zone);
      armorPiece.health -= armorDamage;

      // Effet visuel sur l'armure
      if (armorPiece.visual) {
        armorPiece.visual.setFillStyle(0xffff00);
        this.scene.time.delayedCall(100, () => {
          if (armorPiece.visual && !armorPiece.destroyed) {
            armorPiece.visual.setFillStyle(0x666666);
          }
        });
      }

      if (armorPiece.health <= 0) {
        this.destroyArmorPiece(zone);
      }

      // Dégâts réduits passent au boss
      const passthrough = amount * 0.1;
      super.takeDamage(passthrough);
    } else {
      // Pas d'armure = dégâts amplifiés
      const multiplier = armorPiece?.destroyed ? 1.5 : 1.0;
      super.takeDamage(amount * multiplier, zone);
    }
  }

  /**
   * Calcule les dégâts à l'armure selon le type d'arme
   */
  private calculateArmorDamage(amount: number, _zone: string): number {
    // TODO: Vérifier si l'arme est perforante ou explosive
    // Pour l'instant, appliquer des dégâts réduits à l'armure
    return amount * 0.5;
  }

  /**
   * Récupère une zone d'armure aléatoire
   */
  private getRandomArmorZone(): string {
    const zones = ['torso', 'left_shoulder', 'right_shoulder', 'head'];
    const intactZones = zones.filter((z) => !this.armorPieces.get(z)?.destroyed);

    if (intactZones.length === 0) {
      return zones[Math.floor(Math.random() * zones.length)];
    }

    return intactZones[Math.floor(Math.random() * intactZones.length)];
  }

  /**
   * Détruit une pièce d'armure
   */
  private destroyArmorPiece(zone: string): void {
    const armorPiece = this.armorPieces.get(zone);
    if (!armorPiece || armorPiece.destroyed) return;

    armorPiece.destroyed = true;

    // Effet visuel de destruction
    if (armorPiece.visual) {
      // Particules de débris
      const particles = this.scene.add.particles(
        this.x + (armorPiece.visual.x || 0),
        this.y + (armorPiece.visual.y || 0),
        'pixel',
        {
          speed: { min: 50, max: 150 },
          angle: { min: 0, max: 360 },
          scale: { start: 1.5, end: 0 },
          lifespan: 600,
          quantity: 20,
          tint: [0x666666, 0x888888, 0x444444],
        }
      );

      this.scene.time.delayedCall(700, () => {
        particles.destroy();
      });

      // Faire disparaître le visuel
      this.scene.tweens.add({
        targets: armorPiece.visual,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 300,
        onComplete: () => {
          armorPiece.visual?.destroy();
          armorPiece.visual = undefined;
        },
      });
    }

    // Son de métal qui casse
    if (this.scene.sound.get('armor_break')) {
      this.scene.sound.play('armor_break', { volume: 0.6 });
    }

    // Émettre l'événement
    this.scene.events.emit('bossArmorDestroyed', {
      boss: this,
      zone,
      armorPiece: armorPiece.name,
    });

    // Vérifier si toute l'armure est détruite
    this.checkAllArmorDestroyed();
  }

  /**
   * Vérifie si toute l'armure est détruite
   */
  private checkAllArmorDestroyed(): void {
    const allDestroyed = Array.from(this.armorPieces.values()).every((piece) => piece.destroyed);

    if (allDestroyed && !this.isEnraged) {
      this.enterRagePhase();
    }
  }

  /**
   * Entre en phase de rage
   */
  private enterRagePhase(): void {
    this.enterRage();

    // Effet de transition
    this.scene.cameras.main.flash(500, 255, 0, 0);

    // Message
    this.scene.events.emit('ui:announcement', {
      text: 'VULNÉRABLE !',
      subtext: "L'armure du Colosse est détruite",
      style: 'danger',
    });
  }

  /**
   * Callback de changement de phase
   */
  protected onPhaseChange(newPhase: number, _previousPhase: number): void {
    console.log(`[Colossus] Transition vers phase ${newPhase + 1}`);
  }

  /**
   * Logique de mise à jour
   */
  protected updatePhaseLogic(_delta: number): void {
    // Mise à jour position armure
    this.updateArmorPosition();
  }

  /**
   * Récupère l'état des pièces d'armure
   */
  public getArmorStatus(): { zone: string; name: string; percent: number; destroyed: boolean }[] {
    return Array.from(this.armorPieces.values()).map((piece) => ({
      zone: piece.id,
      name: piece.name,
      percent: piece.health / piece.maxHealth,
      destroyed: piece.destroyed,
    }));
  }

  /**
   * Nettoyage
   */
  protected die(): void {
    // Détruire le container d'armure
    if (this.armorContainer) {
      this.armorContainer.destroy();
    }

    super.die();
  }

  /**
   * Réinitialisation
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);

    this.isCharging = false;
    this.lastChargeTime = 0;
    this.lastSlamTime = 0;

    // Réinitialiser l'armure
    for (const piece of this.armorPieces.values()) {
      piece.health = piece.maxHealth;
      piece.destroyed = false;
      // Recréer le visuel si nécessaire
    }
  }
}
