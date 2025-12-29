import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH } from '@config/constants';
import type { GameScene } from './GameScene';

/**
 * Scène d'interface utilisateur (overlay)
 * Affiche la santé, les munitions, le score, etc.
 */
export class HUDScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private healthText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Rectangle;
  private healthBarBg!: Phaser.GameObjects.Rectangle;

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
    this.createControls();
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
}
