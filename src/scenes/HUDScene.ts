import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import type { GameScene } from './GameScene';
import type { WaveConfig } from '@systems/WaveSystem';
import type { Weapon } from '@weapons/Weapon';
import { ComboMeter } from '@ui/ComboMeter';
import { PowerUpDisplay } from '@ui/PowerUpDisplay';
import type { GameEventPayloads } from '@/types/events';

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

  // Éléments d'inventaire d'armes
  private weaponSlots: Phaser.GameObjects.Container[] = [];
  private weaponSlotBgs: Phaser.GameObjects.Rectangle[] = [];
  private weaponNames: Phaser.GameObjects.Text[] = [];
  private weaponAmmoTexts: Phaser.GameObjects.Text[] = [];
  private weaponKeyHints: Phaser.GameObjects.Text[] = [];

  // Compteur de combo (Phase 6.1)
  private comboMeter!: ComboMeter;

  // Affichage des power-ups actifs (Phase 6.3)
  private powerUpDisplay!: PowerUpDisplay;

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
    this.createWeaponInventory();
    this.createComboMeter();
    this.createPowerUpDisplay();

    // Écouter les événements de score
    this.gameScene.events.on('scoreUpdate', this.onScoreUpdate, this);

    // Écouter les événements de vague
    this.gameScene.events.on('wavePreparing', this.onWavePreparing, this);
    this.gameScene.events.on('waveStart', this.onWaveStart, this);
    this.gameScene.events.on('waveProgress', this.onWaveProgress, this);
    this.gameScene.events.on('waveComplete', this.onWaveComplete, this);

    // Écouter les événements d'armes
    this.gameScene.events.on('weaponInventoryChanged', this.onWeaponInventoryChanged, this);
    this.gameScene.events.on('weaponChanged', this.onWeaponChanged, this);

    // Écouter les événements de combo (Phase 6.1)
    this.gameScene.events.on('combo:increase', this.onComboIncrease, this);
    this.gameScene.events.on('combo:break', this.onComboBreak, this);
    this.gameScene.events.on('combo:milestone', this.onComboMilestone, this);

    // Écouter les événements de power-up (Phase 6.3)
    this.gameScene.events.on('powerup:activate', this.onPowerUpActivate, this);
    this.gameScene.events.on('powerup:expire', this.onPowerUpExpire, this);
  }

  /**
   * Met à jour l'interface
   */
  update(): void {
    if (this.gameScene?.player) {
      this.updateHealthBar();
      this.updateAmmoCounter();
      this.updateComboMeter();
      this.updatePowerUpDisplay();
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
      '1-4/Molette - Arme',
      'R - Recharger',
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
   * Crée l'affichage de l'inventaire d'armes
   */
  private createWeaponInventory(): void {
    const slotWidth = 100;
    const slotHeight = 50;
    const slotSpacing = 10;
    const maxSlots = 4;
    const totalWidth = maxSlots * slotWidth + (maxSlots - 1) * slotSpacing;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const y = GAME_HEIGHT - slotHeight - 20;

    for (let i = 0; i < maxSlots; i++) {
      const x = startX + i * (slotWidth + slotSpacing);
      this.createWeaponSlot(i, x, y, slotWidth, slotHeight);
    }

    // Initialiser avec les armes du joueur si disponibles
    if (this.gameScene?.player) {
      const weapons = this.gameScene.player.getWeapons();
      const currentIndex = this.gameScene.player.getCurrentWeaponIndex();
      this.updateWeaponSlots(weapons, currentIndex);
    }
  }

  /**
   * Crée un slot d'arme individuel
   */
  private createWeaponSlot(index: number, x: number, y: number, width: number, height: number): void {
    const container = this.add.container(x, y);

    // Fond du slot
    const bg = this.add.rectangle(0, 0, width, height, 0x222222, 0.8);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x444444);
    this.weaponSlotBgs.push(bg);

    // Indicateur de touche (1, 2, 3, 4)
    const keyHint = this.add.text(5, 3, `${index + 1}`, {
      fontSize: '10px',
      color: '#666666',
    });
    this.weaponKeyHints.push(keyHint);

    // Nom de l'arme
    const name = this.add.text(width / 2, height / 2 - 8, '', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    name.setOrigin(0.5);
    this.weaponNames.push(name);

    // Munitions
    const ammo = this.add.text(width / 2, height / 2 + 10, '', {
      fontSize: '10px',
      color: '#aaaaaa',
    });
    ammo.setOrigin(0.5);
    this.weaponAmmoTexts.push(ammo);

    container.add([bg, keyHint, name, ammo]);
    this.weaponSlots.push(container);
  }

  /**
   * Met à jour les slots d'armes
   */
  private updateWeaponSlots(weapons: Weapon[], currentIndex: number): void {
    for (let i = 0; i < this.weaponSlots.length; i++) {
      const weapon = weapons[i];
      const bg = this.weaponSlotBgs[i];
      const name = this.weaponNames[i];
      const ammo = this.weaponAmmoTexts[i];
      const keyHint = this.weaponKeyHints[i];

      if (weapon) {
        name.setText(weapon.getName());
        ammo.setText(`${weapon.currentAmmo}/${weapon.maxAmmo}`);
        name.setVisible(true);
        ammo.setVisible(true);

        // Highlight pour l'arme sélectionnée
        if (i === currentIndex) {
          bg.setStrokeStyle(3, 0x00ff00);
          bg.setFillStyle(0x003300, 0.9);
          keyHint.setColor('#00ff00');
        } else {
          bg.setStrokeStyle(2, 0x444444);
          bg.setFillStyle(0x222222, 0.8);
          keyHint.setColor('#666666');
        }
      } else {
        name.setVisible(false);
        ammo.setVisible(false);
        bg.setStrokeStyle(1, 0x333333);
        bg.setFillStyle(0x111111, 0.5);
        keyHint.setColor('#333333');
      }
    }
  }

  /**
   * Gère le changement d'inventaire d'armes
   */
  private onWeaponInventoryChanged(weapons: Weapon[], currentIndex: number): void {
    this.updateWeaponSlots(weapons, currentIndex);
  }

  /**
   * Gère le changement d'arme
   */
  private onWeaponChanged(index: number, _weapon: Weapon): void {
    const weapons = this.gameScene.player.getWeapons();
    this.updateWeaponSlots(weapons, index);
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
      const reloadingText = weapon.isReloading ? ' (Rechargement...)' : '';
      this.ammoText.setText(`${weapon.getName()}: ${weapon.currentAmmo}/${weapon.maxAmmo}${reloadingText}`);
    }

    // Mettre à jour aussi les slots d'armes
    this.updateWeaponSlotsAmmo();
  }

  /**
   * Met à jour les munitions dans les slots d'armes
   */
  private updateWeaponSlotsAmmo(): void {
    const weapons = this.gameScene.player.getWeapons();
    for (let i = 0; i < weapons.length && i < this.weaponAmmoTexts.length; i++) {
      const weapon = weapons[i];
      if (weapon) {
        const reloadingIndicator = weapon.isReloading ? '*' : '';
        this.weaponAmmoTexts[i].setText(`${weapon.currentAmmo}/${weapon.maxAmmo}${reloadingIndicator}`);

        // Changer la couleur si les munitions sont basses
        const ammoPercent = weapon.currentAmmo / weapon.maxAmmo;
        if (ammoPercent <= 0) {
          this.weaponAmmoTexts[i].setColor('#ff0000');
        } else if (ammoPercent <= 0.3) {
          this.weaponAmmoTexts[i].setColor('#ff6600');
        } else {
          this.weaponAmmoTexts[i].setColor('#aaaaaa');
        }
      }
    }
  }

  /**
   * Crée le compteur de combo (Phase 6.1)
   */
  private createComboMeter(): void {
    this.comboMeter = new ComboMeter(this, {
      x: GAME_WIDTH - 100,
      y: 150,
      width: 120,
      height: 60,
    });
    this.comboMeter.setDepth(100);
  }

  /**
   * Met à jour le compteur de combo
   */
  private updateComboMeter(): void {
    const comboSystem = this.gameScene.getComboSystem();
    if (comboSystem) {
      const multiplier = comboSystem.getMultiplier();
      const streak = comboSystem.getKillStreak();
      const timeoutProgress = comboSystem.getTimeoutProgress();
      this.comboMeter.updateCombo(multiplier, streak, timeoutProgress);
    }
  }

  /**
   * Gère l'augmentation du combo
   */
  private onComboIncrease(payload: GameEventPayloads['combo:increase']): void {
    this.comboMeter.onComboIncrease(payload);
  }

  /**
   * Gère la rupture du combo
   */
  private onComboBreak(payload: GameEventPayloads['combo:break']): void {
    this.comboMeter.onComboBreak(payload);
  }

  /**
   * Gère les milestones de combo
   */
  private onComboMilestone(payload: GameEventPayloads['combo:milestone']): void {
    this.comboMeter.onComboMilestone(payload);
  }

  /**
   * Crée l'affichage des power-ups actifs (Phase 6.3)
   */
  private createPowerUpDisplay(): void {
    this.powerUpDisplay = new PowerUpDisplay(this, {
      x: 20,
      y: 140,
      width: 150,
      height: 120,
      maxDisplayed: 4,
    });
    this.powerUpDisplay.setDepth(100);
  }

  /**
   * Met à jour l'affichage des power-ups actifs
   */
  private updatePowerUpDisplay(): void {
    const powerUpSystem = this.gameScene.getPowerUpSystem();
    if (powerUpSystem) {
      const activePowerUps = powerUpSystem.getActivePowerUps();
      this.powerUpDisplay.update(activePowerUps);
    }
  }

  /**
   * Gère l'activation d'un power-up
   */
  private onPowerUpActivate(payload: GameEventPayloads['powerup:activate']): void {
    // Animer l'apparition du power-up dans le HUD
    this.powerUpDisplay.animateNewPowerUp(payload.powerupType);
  }

  /**
   * Gère l'expiration d'un power-up
   */
  private onPowerUpExpire(_payload: GameEventPayloads['powerup:expire']): void {
    // L'affichage sera mis à jour automatiquement via updatePowerUpDisplay
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
    this.gameScene.events.off('weaponInventoryChanged', this.onWeaponInventoryChanged, this);
    this.gameScene.events.off('weaponChanged', this.onWeaponChanged, this);

    // Retirer les listeners de combo (Phase 6.1)
    this.gameScene.events.off('combo:increase', this.onComboIncrease, this);
    this.gameScene.events.off('combo:break', this.onComboBreak, this);
    this.gameScene.events.off('combo:milestone', this.onComboMilestone, this);

    // Retirer les listeners de power-up (Phase 6.3)
    this.gameScene.events.off('powerup:activate', this.onPowerUpActivate, this);
    this.gameScene.events.off('powerup:expire', this.onPowerUpExpire, this);
  }
}
