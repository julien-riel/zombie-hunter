import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';

/**
 * Configuration d'une zone à défendre
 */
export interface DefendZoneConfig {
  x: number;
  y: number;
  id?: string;
  radius?: number;
  duration?: number; // Durée en millisecondes
  zombieWaves?: number; // Nombre de vagues supplémentaires
  zombiesPerWave?: number;
  waveInterval?: number; // Intervalle entre les vagues
  activateOnEnter?: boolean; // S'active quand le joueur entre
  requiredStayTime?: number; // Temps minimum à rester dans la zone
}

/**
 * Zone à défendre pendant X secondes
 * - Le joueur doit rester dans la zone
 * - Génère des vagues de zombies supplémentaires
 * - Affiche le temps restant
 * - Peut échouer si le joueur quitte la zone trop longtemps
 */
export class DefendZone extends Phaser.GameObjects.Container {
  declare public scene: GameScene;

  public readonly id: string;
  private radius: number;
  private duration: number;
  private zombieWaves: number;
  private zombiesPerWave: number;
  private waveInterval: number;
  private activateOnEnter: boolean;

  private graphic: Phaser.GameObjects.Graphics;
  private timerText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;

  private isActive: boolean = false;
  private isCompleted: boolean = false;
  private isFailed: boolean = false;
  private timeRemaining: number = 0;
  private timeOutsideZone: number = 0;
  private currentWave: number = 0;
  private waveTimer: number = 0;
  private pulseTime: number = 0;

  private readonly MAX_TIME_OUTSIDE = 3000; // 3 secondes max hors zone

  constructor(scene: GameScene, config: DefendZoneConfig) {
    super(scene, config.x, config.y);

    this.id = config.id || `defend_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    this.radius = config.radius ?? 100;
    this.duration = config.duration ?? 30000; // 30 secondes par défaut
    this.zombieWaves = config.zombieWaves ?? 3;
    this.zombiesPerWave = config.zombiesPerWave ?? 5;
    this.waveInterval = config.waveInterval ?? 10000; // 10 secondes entre vagues
    this.activateOnEnter = config.activateOnEnter ?? true;
    // requiredStayTime reserved for future implementation

    // Créer les graphiques
    this.graphic = scene.add.graphics();
    this.add(this.graphic);

    // Texte du timer
    this.timerText = scene.add.text(0, 0, '', {
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    });
    this.timerText.setOrigin(0.5, 0.5);
    this.add(this.timerText);

    // Texte de statut
    this.statusText = scene.add.text(0, 30, '', {
      fontSize: '14px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    });
    this.statusText.setOrigin(0.5, 0.5);
    this.add(this.statusText);

    this.drawZone();

    // Ajouter à la scène
    scene.add.existing(this);
    this.setDepth(5);
  }

  /**
   * Dessine la zone
   */
  private drawZone(): void {
    this.graphic.clear();

    let color = 0x888888;
    let alpha = 0.3;

    if (this.isCompleted) {
      color = 0x00ff00;
      alpha = 0.4;
    } else if (this.isFailed) {
      color = 0xff0000;
      alpha = 0.4;
    } else if (this.isActive) {
      color = 0xff6600;
      alpha = 0.4;
    }

    // Zone principale
    this.graphic.fillStyle(color, alpha);
    this.graphic.fillCircle(0, 0, this.radius);

    // Bordure
    this.graphic.lineStyle(4, color, 0.8);
    this.graphic.strokeCircle(0, 0, this.radius);

    // Cercle intérieur (zone sûre)
    if (this.isActive && !this.isCompleted && !this.isFailed) {
      this.graphic.lineStyle(2, 0xffffff, 0.5);
      this.graphic.strokeCircle(0, 0, this.radius * 0.6);
    }
  }

  /**
   * Met à jour la zone
   */
  public update(delta: number): void {
    if (this.isCompleted || this.isFailed) return;

    const player = this.scene.player;
    if (!player) return;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const playerInZone = distance <= this.radius;

    // Activation automatique
    if (!this.isActive && this.activateOnEnter && playerInZone) {
      this.activate();
    }

    if (!this.isActive) {
      // Animation d'attente
      this.timerText.setText('ENTER');
      return;
    }

    // Animation de pulsation
    this.pulseTime += 0.03;
    const pulse = Math.sin(this.pulseTime) * 0.05 + 1;
    this.graphic.setScale(pulse);

    // Gérer le temps hors zone
    if (!playerInZone) {
      this.timeOutsideZone += delta;
      const remainingOutside = Math.max(0, (this.MAX_TIME_OUTSIDE - this.timeOutsideZone) / 1000);
      this.statusText.setText(`RETURN! ${remainingOutside.toFixed(1)}s`);
      this.statusText.setColor('#ff0000');

      if (this.timeOutsideZone >= this.MAX_TIME_OUTSIDE) {
        this.fail();
        return;
      }
    } else {
      this.timeOutsideZone = 0;
      this.statusText.setText(`Wave ${this.currentWave}/${this.zombieWaves}`);
      this.statusText.setColor('#ffff00');
    }

    // Compte à rebours
    this.timeRemaining -= delta;
    if (this.timeRemaining <= 0) {
      this.complete();
      return;
    }

    // Afficher le temps restant
    const seconds = Math.ceil(this.timeRemaining / 1000);
    this.timerText.setText(`${seconds}s`);

    // Changer la couleur du texte selon le temps restant
    if (seconds <= 5) {
      this.timerText.setColor('#ff0000');
    } else if (seconds <= 10) {
      this.timerText.setColor('#ffff00');
    } else {
      this.timerText.setColor('#ffffff');
    }

    // Gérer les vagues de zombies
    this.waveTimer += delta;
    if (this.waveTimer >= this.waveInterval && this.currentWave < this.zombieWaves) {
      this.waveTimer = 0;
      this.spawnWave();
    }
  }

  /**
   * Active la zone de défense
   */
  public activate(): void {
    if (this.isActive || this.isCompleted || this.isFailed) return;

    this.isActive = true;
    this.timeRemaining = this.duration;
    this.currentWave = 0;
    this.waveTimer = this.waveInterval * 0.5; // Première vague à 50% du temps

    this.drawZone();

    // Effet d'activation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
    });

    // Émettre un événement
    this.scene.events.emit('defendzone:activated', {
      id: this.id,
      x: this.x,
      y: this.y,
      duration: this.duration,
    });
  }

  /**
   * Génère une vague de zombies
   */
  private spawnWave(): void {
    this.currentWave++;

    // Émettre un événement pour que le système de spawn gère les zombies
    this.scene.events.emit('defendzone:wave', {
      id: this.id,
      wave: this.currentWave,
      count: this.zombiesPerWave,
      x: this.x,
      y: this.y,
      radius: this.radius,
    });

    // Effet visuel de vague
    const waveEffect = this.scene.add.circle(this.x, this.y, this.radius, 0xff6600, 0.5);
    waveEffect.setDepth(100);

    this.scene.tweens.add({
      targets: waveEffect,
      scale: 1.5,
      alpha: 0,
      duration: 500,
      onComplete: () => waveEffect.destroy(),
    });

    // Message
    this.statusText.setText(`WAVE ${this.currentWave}!`);
    this.statusText.setColor('#ff6600');
  }

  /**
   * Complète la défense avec succès
   */
  private complete(): void {
    this.isCompleted = true;
    this.isActive = false;

    this.timerText.setText('CLEAR!');
    this.timerText.setColor('#00ff00');
    this.statusText.setText('');

    this.drawZone();

    // Effet de complétion
    const successEffect = this.scene.add.circle(this.x, this.y, this.radius, 0x00ff00, 0.6);
    successEffect.setDepth(100);

    this.scene.tweens.add({
      targets: successEffect,
      scale: 2,
      alpha: 0,
      duration: 800,
      onComplete: () => successEffect.destroy(),
    });

    // Émettre un événement
    this.scene.events.emit('defendzone:completed', {
      id: this.id,
      x: this.x,
      y: this.y,
      wavesCompleted: this.currentWave,
    });
  }

  /**
   * Échec de la défense
   */
  private fail(): void {
    this.isFailed = true;
    this.isActive = false;

    this.timerText.setText('FAILED');
    this.timerText.setColor('#ff0000');
    this.statusText.setText('');

    this.drawZone();

    // Effet d'échec
    const failEffect = this.scene.add.circle(this.x, this.y, this.radius, 0xff0000, 0.6);
    failEffect.setDepth(100);

    this.scene.tweens.add({
      targets: failEffect,
      scale: 0.5,
      alpha: 0,
      duration: 500,
      onComplete: () => failEffect.destroy(),
    });

    // Émettre un événement
    this.scene.events.emit('defendzone:failed', {
      id: this.id,
      x: this.x,
      y: this.y,
      timeRemaining: this.timeRemaining,
    });
  }

  /**
   * Force l'activation (pour déclencheurs externes)
   */
  public forceActivate(): void {
    this.activate();
  }

  /**
   * Vérifie si la zone est active
   */
  public isZoneActive(): boolean {
    return this.isActive;
  }

  /**
   * Vérifie si la zone est complétée
   */
  public isZoneCompleted(): boolean {
    return this.isCompleted;
  }

  /**
   * Vérifie si la zone a échoué
   */
  public isZoneFailed(): boolean {
    return this.isFailed;
  }

  /**
   * Retourne le temps restant
   */
  public getTimeRemaining(): number {
    return this.timeRemaining;
  }

  /**
   * Retourne le rayon
   */
  public getRadius(): number {
    return this.radius;
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.graphic.destroy();
    this.timerText.destroy();
    this.statusText.destroy();
    super.destroy();
  }
}
