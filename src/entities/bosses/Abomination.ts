/**
 * Abomination Boss - Phase 7.3
 *
 * Fusion de plusieurs corps, masse de chair immense.
 * - Phase 1 (100-60% HP): Charge lente vers le joueur
 * - Phase 2 (60-30% HP): Libère des parasites quand touché
 * - Phase 3 (30-0% HP): Rage - vitesse augmentée, spawns continus
 */

import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import { Boss, type BossConfig } from './Boss';
import { BossStateMachine, BossState } from './BossStateMachine';
import { BALANCE } from '@config/balance';

/**
 * Configuration de l'Abomination
 */
const ABOMINATION_CONFIG: BossConfig = {
  type: 'abomination',
  name: "L'Abomination",
  maxHealth: BALANCE.bosses?.abomination?.health ?? 1500,
  speed: BALANCE.bosses?.abomination?.speed ?? 80,
  damage: BALANCE.bosses?.abomination?.damage ?? 40,
  attackCooldown: BALANCE.bosses?.abomination?.attackCooldown ?? 2000,
  detectionRange: 600,
  attackRange: 60,
  scoreValue: BALANCE.bosses?.abomination?.scoreValue ?? 500,
  texture: 'boss_abomination',
  scale: 2,
  hitboxSize: { width: 64, height: 64 },
  phases: [
    {
      healthThreshold: 1.0,
      behavior: 'chase',
      speedMultiplier: 1.0,
      damageMultiplier: 1.0,
    },
    {
      healthThreshold: 0.6,
      behavior: 'chase_spawn',
      speedMultiplier: 1.0,
      damageMultiplier: 1.2,
      onEnter: undefined, // Défini dans le constructeur
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
 * L'Abomination - Premier boss du jeu
 */
export class Abomination extends Boss {
  /** Cooldown de spawn de parasites */
  private parasiteSpawnCooldown: number = 3000;

  /** Timestamp du dernier spawn de parasite */
  private lastParasiteSpawn: number = 0;

  /** Probabilité de spawn de parasites quand touché (phase 2+) */
  private parasiteSpawnChance: number = 0.3;

  /** Nombre de parasites à spawner */
  private parasiteCount: { min: number; max: number } = { min: 1, max: 3 };

  /** Timer de spawn continu en phase 3 */
  private continuousSpawnTimer: Phaser.Time.TimerEvent | null = null;

  /** Cooldown de charge */
  private chargeCooldown: number = 8000;

  /** Timestamp de la dernière charge */
  private lastChargeTime: number = 0;

  /** Indique si une charge est en cours */
  private isCharging: boolean = false;

  /** Direction de charge */
  private chargeDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  /** Vitesse de charge */
  private chargeSpeed: number = 300;

  /** Durée de la charge */
  private chargeDuration: number = 1000;

  constructor(scene: GameScene, x: number, y: number) {
    // Copier la config pour pouvoir modifier les callbacks
    const config = { ...ABOMINATION_CONFIG };
    config.phases = config.phases.map((phase, index) => ({
      ...phase,
      onEnter:
        index === 1
          ? () => this.enableParasites()
          : index === 2
            ? () => this.enterRageMode()
            : undefined,
    }));

    super(scene, x, y, config);

    // Initialiser la machine d'état
    this.initBossStateMachine();
  }

  /**
   * Initialise la machine d'état spécifique à l'Abomination
   */
  private initBossStateMachine(): void {
    const stateMachine = new BossStateMachine(this.scene, this);

    // Configurer les états
    stateMachine.configureState(BossState.CHASE, {
      onUpdate: (delta) => this.updateChase(delta),
    });

    stateMachine.configureState(BossState.ATTACK, {
      onEnter: () => this.startAttack(),
      minDuration: 800,
    });

    stateMachine.configureState(BossState.CHARGE, {
      onEnter: () => this.startCharge(),
      onExit: () => this.endCharge(),
      minDuration: this.chargeDuration,
    });

    stateMachine.configureState(BossState.SPECIAL_ABILITY, {
      onEnter: () => this.performSlam(),
      minDuration: 1500,
    });

    // Définir la logique de décision
    stateMachine.setDecisionCallback((delta) => this.makeDecision(delta));

    this.initStateMachine(stateMachine);
  }

  /**
   * Animation d'entrée de l'Abomination
   */
  protected async entranceAnimation(): Promise<void> {
    return new Promise((resolve) => {
      // Apparaître lentement
      this.setAlpha(0);

      // Shake de caméra pour annoncer l'arrivée
      this.scene.cameras.main.shake(500, 0.02);

      // Apparition progressive
      this.scene.tweens.add({
        targets: this,
        alpha: 1,
        scaleX: this.config.scale! * 1.2,
        scaleY: this.config.scale! * 1.2,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => {
          // Retour à l'échelle normale
          this.scene.tweens.add({
            targets: this,
            scaleX: this.config.scale!,
            scaleY: this.config.scale!,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
              // Rugissement
              this.playRoarEffect();
              resolve();
            },
          });
        },
      });
    });
  }

  /**
   * Effet de rugissement
   */
  private playRoarEffect(): void {
    // Shake de caméra plus fort
    this.scene.cameras.main.shake(500, 0.03);

    // Onde de choc visuelle
    const shockwave = this.scene.add.circle(this.x, this.y, 20, 0xff0000, 0.5);
    this.scene.tweens.add({
      targets: shockwave,
      radius: 200,
      alpha: 0,
      duration: 500,
      onComplete: () => shockwave.destroy(),
    });

    // Son (si disponible)
    if (this.scene.sound.get('abomination_roar')) {
      this.scene.sound.play('abomination_roar', { volume: 0.7 });
    }
  }

  /**
   * Logique de décision de l'IA
   */
  private makeDecision(_delta: number): BossState | null {
    if (!this.stateMachine) return null;

    const distance = this.stateMachine.getDistanceToTarget();
    const currentState = this.stateMachine.getCurrentState();
    const now = this.scene.time.now;

    // En phase 3, peut décider de charger
    if (this.currentPhase >= 2 && now - this.lastChargeTime >= this.chargeCooldown) {
      if (distance > 150 && distance < 400 && Math.random() < 0.3) {
        return BossState.CHARGE;
      }
    }

    // Slam si proche et cooldown prêt
    if (distance < 100 && this.canAttack()) {
      return BossState.SPECIAL_ABILITY;
    }

    // Attaque normale si à portée
    if (distance <= this.attackRange && this.canAttack()) {
      return BossState.ATTACK;
    }

    // Sinon, poursuivre
    if (currentState !== BossState.CHASE) {
      return BossState.CHASE;
    }

    return null;
  }

  /**
   * Mise à jour de la poursuite
   */
  private updateChase(_delta: number): void {
    this.stateMachine?.moveTowardsTarget(this.getCurrentSpeed());
  }

  /**
   * Démarre une attaque
   */
  private startAttack(): void {
    this.stateMachine?.stopMovement();
    this.performAttack();

    const player = this.scene.getPlayer();
    if (player && player.active) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (distance <= this.attackRange + 20) {
        player.takeDamage(this.getDamage());
        player.applyKnockback(this.x, this.y, 200);
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

    // Effet visuel de préparation
    this.setTint(0xff6600);

    // Délai avant la charge
    this.scene.time.delayedCall(300, () => {
      if (this.isCharging && this.active) {
        this.executeCharge();
      }
    });
  }

  /**
   * Exécute la charge
   */
  private executeCharge(): void {
    // Appliquer la vélocité de charge
    this.setVelocity(
      this.chargeDirection.x * this.chargeSpeed,
      this.chargeDirection.y * this.chargeSpeed
    );

    // Vérifier les collisions pendant la charge
    const checkCollision = this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        if (!this.isCharging) {
          checkCollision.destroy();
          return;
        }

        const player = this.scene.getPlayer();
        if (player && player.active) {
          const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
          if (distance < 60) {
            player.takeDamage(this.getDamage() * 1.5);
            player.applyKnockback(this.x, this.y, 400);
            this.endCharge();
          }
        }
      },
      repeat: Math.floor(this.chargeDuration / 50),
    });
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
   * Exécute un slam au sol
   */
  private performSlam(): void {
    this.stateMachine?.stopMovement();
    this.performAttack();

    // Animation de saut
    this.scene.tweens.add({
      targets: this,
      y: this.y - 30,
      duration: 300,
      yoyo: true,
      ease: 'Power2',
      onYoyo: () => {
        // Impact au sol
        this.createSlamEffect();
      },
    });
  }

  /**
   * Crée l'effet de slam
   */
  private createSlamEffect(): void {
    // Onde de choc
    const shockwave = this.scene.add.circle(this.x, this.y, 30, 0x884400, 0.6);
    this.scene.tweens.add({
      targets: shockwave,
      radius: 150,
      alpha: 0,
      duration: 400,
      onComplete: () => shockwave.destroy(),
    });

    // Shake de caméra
    this.scene.cameras.main.shake(200, 0.02);

    // Dégâts dans la zone
    const player = this.scene.getPlayer();
    if (player && player.active) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (distance <= 150) {
        const damage = this.getDamage() * (1 - distance / 200);
        player.takeDamage(Math.round(damage));
        player.applyKnockback(this.x, this.y, 250);
      }
    }
  }

  /**
   * Active les spawns de parasites (phase 2)
   */
  private enableParasites(): void {
    // Effet visuel de transition
    this.scene.cameras.main.flash(500, 100, 50, 0);

    // Message de phase
    this.scene.events.emit('ui:announcement', {
      text: 'PARASITES !',
      subtext: "L'Abomination libère ses créatures",
      style: 'warning',
    });
  }

  /**
   * Active le mode rage (phase 3)
   */
  private enterRageMode(): void {
    this.enterRage();

    // Démarrer les spawns continus
    this.continuousSpawnTimer = this.scene.time.addEvent({
      delay: this.parasiteSpawnCooldown,
      callback: () => this.spawnParasites(2),
      loop: true,
    });

    // Effet visuel
    this.scene.cameras.main.flash(500, 255, 100, 0);

    // Message de phase
    this.scene.events.emit('ui:announcement', {
      text: 'RAGE !',
      subtext: "L'Abomination devient incontrôlable",
      style: 'danger',
    });
  }

  /**
   * Spawn des parasites (mini-zombies)
   */
  private spawnParasites(count?: number): void {
    const numParasites = count ?? Phaser.Math.Between(this.parasiteCount.min, this.parasiteCount.max);
    const zombieFactory = this.scene.getZombieFactory();

    if (!zombieFactory) return;

    for (let i = 0; i < numParasites; i++) {
      // Position autour de l'Abomination
      const angle = (i / numParasites) * Math.PI * 2;
      const distance = 50 + Math.random() * 30;
      const x = this.x + Math.cos(angle) * distance;
      const y = this.y + Math.sin(angle) * distance;

      // Spawner un runner (petit et rapide) comme parasite
      const parasite = zombieFactory.create('runner', x, y);
      if (parasite) {
        // Réduire la taille et la vie des parasites
        parasite.setScale(0.6);
        parasite.healthComponent.setMaxHealth(15);
        parasite.healthComponent.heal(15);
      }
    }

    this.lastParasiteSpawn = this.scene.time.now;
  }

  /**
   * Calcul des dégâts avec zones de points faibles
   */
  protected calculateDamage(amount: number, hitZone?: string): number {
    // Double dégâts sur les têtes (points faibles)
    if (hitZone === 'head' || hitZone === 'weak') {
      return amount * 2;
    }
    return amount;
  }

  /**
   * Override de takeDamage pour spawner des parasites
   */
  public takeDamage(amount: number, hitZone?: string): void {
    super.takeDamage(amount, hitZone);

    // Phase 2+ : chance de spawner des parasites quand touché
    if (this.currentPhase >= 1 && !this.isInvulnerable) {
      const now = this.scene.time.now;
      if (
        now - this.lastParasiteSpawn >= 1000 &&
        Math.random() < this.parasiteSpawnChance
      ) {
        this.spawnParasites();
      }
    }
  }

  /**
   * Callback de changement de phase
   */
  protected onPhaseChange(newPhase: number, _previousPhase: number): void {
    // Les callbacks sont déjà gérés via onEnter des phases
    console.log(`[Abomination] Transition vers phase ${newPhase + 1}`);
  }

  /**
   * Logique de mise à jour spécifique à la phase
   */
  protected updatePhaseLogic(_delta: number): void {
    // La logique de phase est gérée par la machine d'état
  }

  /**
   * Nettoyage
   */
  protected die(): void {
    // Arrêter le timer de spawn continu
    if (this.continuousSpawnTimer) {
      this.continuousSpawnTimer.destroy();
      this.continuousSpawnTimer = null;
    }

    super.die();
  }

  /**
   * Réinitialise le boss
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);

    this.lastParasiteSpawn = 0;
    this.lastChargeTime = 0;
    this.isCharging = false;

    if (this.continuousSpawnTimer) {
      this.continuousSpawnTimer.destroy();
      this.continuousSpawnTimer = null;
    }
  }
}
