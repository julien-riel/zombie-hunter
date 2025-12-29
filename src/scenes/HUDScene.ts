import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import type { GameScene } from './GameScene';
import type { WaveConfig } from '@systems/WaveSystem';

/**
 * Scène d'interface utilisateur (overlay)
 * Affiche la santé, les munitions, le score, les vagues, etc.
 */
export class HUDScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private healthText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Rectangle;
  private healthBarBg!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;

  // Éléments de vague
  private waveText!: Phaser.GameObjects.Text;
  private waveProgressText!: Phaser.GameObjects.Text;
  private waveAnnouncement!: Phaser.GameObjects.Container;
  private waveAnnouncementText!: Phaser.GameObjects.Text;
  private waveAnnouncementSubtext!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.HUD });
  }

  /**
   * Initialise les données de la scène
   */
  init(data: { gameScene: GameScene }): void {
    this.gameScene = data.gameScene;
  }

  /**
   * Crée les éléments d'interface
   */
  create(): void {
    this.createHealthBar();
    this.createAmmoCounter();
    this.createScoreDisplay();
    this.createWaveDisplay();
    this.createWaveAnnouncement();
    this.createControls();

    // Écouter les événements de score
    this.gameScene.events.on('scoreUpdate', this.onScoreUpdate, this);

    // Écouter les événements de vague
    this.gameScene.events.on('wavePreparing', this.onWavePreparing, this);
    this.gameScene.events.on('waveStart', this.onWaveStart, this);
    this.gameScene.events.on('waveProgress', this.onWaveProgress, this);
    this.gameScene.events.on('waveComplete', this.onWaveComplete, this);
  }

  /**
   * Met à jour l'interface
   */
  update(): void {
    if (this.gameScene?.player) {
      this.updateHealthBar();
      this.updateAmmoCounter();
    }
  }

  /**
   * Crée la barre de santé
   */
  private createHealthBar(): void {
    const x = 20;
    const y = 20;
    const width = 200;
    const height = 20;

    // Fond de la barre
    this.healthBarBg = this.add.rectangle(x, y, width, height, 0x333333);
    this.healthBarBg.setOrigin(0, 0);
    this.healthBarBg.setStrokeStyle(2, 0x000000);

    // Barre de vie
    this.healthBar = this.add.rectangle(x + 2, y + 2, width - 4, height - 4, 0xe74c3c);
    this.healthBar.setOrigin(0, 0);

    // Texte de santé
    this.healthText = this.add.text(x + width / 2, y + height / 2, '100/100', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.healthText.setOrigin(0.5);
  }

  /**
   * Crée le compteur de munitions
   */
  private createAmmoCounter(): void {
    this.ammoText = this.add.text(20, 50, 'Munitions: --/--', {
      fontSize: '16px',
      color: '#ffffff',
    });
  }

  /**
   * Crée l'affichage du score et des kills
   */
  private createScoreDisplay(): void {
    this.scoreText = this.add.text(20, 80, 'Score: 0', {
      fontSize: '20px',
      color: '#ffff00',
      fontStyle: 'bold',
    });

    this.killsText = this.add.text(20, 105, 'Kills: 0', {
      fontSize: '16px',
      color: '#ff6666',
    });
  }

  /**
   * Crée l'affichage de la vague
   */
  private createWaveDisplay(): void {
    // Numéro de vague (en haut au centre)
    this.waveText = this.add.text(GAME_WIDTH / 2, 20, 'Vague 1', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.waveText.setOrigin(0.5, 0);

    // Progression de la vague
    this.waveProgressText = this.add.text(GAME_WIDTH / 2, 50, '', {
      fontSize: '14px',
      color: '#aaaaaa',
    });
    this.waveProgressText.setOrigin(0.5, 0);
  }

  /**
   * Crée l'annonce de vague (grand texte au centre)
   */
  private createWaveAnnouncement(): void {
    this.waveAnnouncement = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.waveAnnouncement.setAlpha(0);

    // Fond semi-transparent
    const bg = this.add.rectangle(0, 0, 400, 120, 0x000000, 0.7);
    bg.setStrokeStyle(2, 0xe74c3c);

    // Texte principal
    this.waveAnnouncementText = this.add.text(0, -20, '', {
      fontSize: '48px',
      color: '#e74c3c',
      fontStyle: 'bold',
    });
    this.waveAnnouncementText.setOrigin(0.5);

    // Sous-texte
    this.waveAnnouncementSubtext = this.add.text(0, 30, '', {
      fontSize: '18px',
      color: '#ffffff',
    });
    this.waveAnnouncementSubtext.setOrigin(0.5);

    this.waveAnnouncement.add([bg, this.waveAnnouncementText, this.waveAnnouncementSubtext]);
  }

  /**
   * Crée l'affichage des contrôles
   */
  private createControls(): void {
    const controlsText = [
      'Contrôles:',
      'WASD/Flèches - Déplacement',
      'Souris - Viser',
      'Clic gauche - Tirer',
      'Espace - Dash',
    ].join('\n');

    this.add
      .text(GAME_WIDTH - 20, 20, controlsText, {
        fontSize: '12px',
        color: '#888888',
        align: 'right',
      })
      .setOrigin(1, 0);
  }

  /**
   * Gère la mise à jour du score
   */
  private onScoreUpdate(score: number, kills: number): void {
    this.scoreText.setText(`Score: ${score}`);
    this.killsText.setText(`Kills: ${kills}`);
  }

  /**
   * Gère la préparation d'une vague
   */
  private onWavePreparing(waveNumber: number, config: WaveConfig): void {
    this.waveText.setText(`Vague ${waveNumber}`);
    this.waveProgressText.setText('Préparation...');

    // Afficher l'annonce de vague
    this.showWaveAnnouncement(waveNumber, config);
  }

  /**
   * Gère le début d'une vague
   */
  private onWaveStart(waveNumber: number, config: WaveConfig): void {
    this.waveText.setText(`Vague ${waveNumber}`);
    this.waveProgressText.setText(`Zombies: 0/${config.totalZombies}`);
  }

  /**
   * Gère la progression d'une vague
   */
  private onWaveProgress(data: {
    wave: number;
    killed: number;
    remaining: number;
    total: number;
  }): void {
    this.waveProgressText.setText(`Zombies: ${data.killed}/${data.total}`);
  }

  /**
   * Gère la fin d'une vague
   */
  private onWaveComplete(_waveNumber: number): void {
    this.waveProgressText.setText('Vague terminée!');

    // Animation de victoire
    this.tweens.add({
      targets: this.waveText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      ease: 'Power2',
    });
  }

  /**
   * Affiche l'annonce de vague
   */
  private showWaveAnnouncement(waveNumber: number, config: WaveConfig): void {
    this.waveAnnouncementText.setText(`VAGUE ${waveNumber}`);
    this.waveAnnouncementSubtext.setText(
      `${config.totalZombies} zombies - ${config.activeDoors} portes actives`
    );

    // Animation d'apparition
    this.waveAnnouncement.setScale(0.5);
    this.waveAnnouncement.setAlpha(0);

    this.tweens.add({
      targets: this.waveAnnouncement,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Disparition après 2 secondes
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: this.waveAnnouncement,
            alpha: 0,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 300,
            ease: 'Power2',
          });
        });
      },
    });
  }

  /**
   * Met à jour la barre de santé
   */
  private updateHealthBar(): void {
    const player = this.gameScene.player;
    const healthPercent = player.health / player.maxHealth;

    this.healthBar.width = (200 - 4) * healthPercent;
    this.healthText.setText(`${Math.ceil(player.health)}/${player.maxHealth}`);

    // Change la couleur selon la santé
    if (healthPercent > 0.6) {
      this.healthBar.setFillStyle(0x2ecc71); // Vert
    } else if (healthPercent > 0.3) {
      this.healthBar.setFillStyle(0xf39c12); // Orange
    } else {
      this.healthBar.setFillStyle(0xe74c3c); // Rouge
    }
  }

  /**
   * Met à jour le compteur de munitions
   */
  private updateAmmoCounter(): void {
    const weapon = this.gameScene.player.currentWeapon;
    if (weapon) {
      this.ammoText.setText(`Munitions: ${weapon.currentAmmo}/${weapon.maxAmmo}`);
    }
  }

  /**
   * Nettoyage lors de la destruction de la scène
   */
  shutdown(): void {
    // Retirer les listeners
    this.gameScene.events.off('scoreUpdate', this.onScoreUpdate, this);
    this.gameScene.events.off('wavePreparing', this.onWavePreparing, this);
    this.gameScene.events.off('waveStart', this.onWaveStart, this);
    this.gameScene.events.off('waveProgress', this.onWaveProgress, this);
    this.gameScene.events.off('waveComplete', this.onWaveComplete, this);
  }
}
