import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '@config/constants';
import type { GameScene } from './GameScene';
import type { WaveConfig } from '@systems/WaveSystem';
import type { Weapon } from '@weapons/Weapon';
import type { MeleeWeapon } from '@weapons/melee/MeleeWeapon';
import { ComboMeter } from '@ui/ComboMeter';
import { PowerUpDisplay } from '@ui/PowerUpDisplay';
import { ActiveItemDisplay } from '@ui/ActiveItemDisplay';
import { MeleeComparisonUI } from '@ui/MeleeComparisonUI';
import type { GameEventPayloads } from '@/types/events';
import type { MeleeWeaponInfo, MeleeWeaponDrop } from '@items/drops/MeleeWeaponDrop';
import { DeviceDetector } from '@utils/DeviceDetector';

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
  private pointsText!: Phaser.GameObjects.Text;

  // Éléments de vague
  private waveText!: Phaser.GameObjects.Text;
  private waveProgressText!: Phaser.GameObjects.Text;
  private waveAnnouncement!: Phaser.GameObjects.Container;
  private waveAnnouncementText!: Phaser.GameObjects.Text;
  private waveAnnouncementSubtext!: Phaser.GameObjects.Text;

  // ==================== SYSTÈME 2+2 (Phase 4 Inventaire) ====================

  // Slots d'armes de mêlée (touches 1-2)
  private meleeSlots: Phaser.GameObjects.Container[] = [];
  private meleeSlotBgs: Phaser.GameObjects.Rectangle[] = [];
  private meleeNames: Phaser.GameObjects.Text[] = [];
  private meleeKeyHints: Phaser.GameObjects.Text[] = [];

  // Slots d'armes à distance (touches 3-4)
  private rangedSlots: Phaser.GameObjects.Container[] = [];
  private rangedSlotBgs: Phaser.GameObjects.Rectangle[] = [];
  private rangedNames: Phaser.GameObjects.Text[] = [];
  private rangedAmmoTexts: Phaser.GameObjects.Text[] = [];
  private rangedKeyHints: Phaser.GameObjects.Text[] = [];

  // Index actifs
  private currentMeleeIndex: 0 | 1 = 0;
  private currentRangedIndex: 0 | 1 = 0;

  // Compteur de combo (Phase 6.1)
  private comboMeter!: ComboMeter;

  // Affichage des power-ups actifs (Phase 6.3)
  private powerUpDisplay!: PowerUpDisplay;

  // Affichage des objets actifs (Phase 6.4)
  private activeItemDisplay!: ActiveItemDisplay;

  // UI de comparaison d'armes de mêlée (Phase 2 Armes)
  private meleeComparisonUI!: MeleeComparisonUI;

  // Détection mobile
  private isMobile: boolean = false;

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
    // Détecter le mode mobile
    this.isMobile = !DeviceDetector.isDesktop();

    this.createHealthBar();
    this.createAmmoCounter();
    this.createScoreDisplay();
    this.createPointsDisplay();
    this.createWaveDisplay();
    this.createWaveAnnouncement();
    this.createControls();
    this.createWeaponSlots();
    this.createComboMeter();
    this.createPowerUpDisplay();
    this.createActiveItemDisplay();
    this.createMeleeComparisonUI();

    // Écouter les événements de score
    this.gameScene.events.on('scoreUpdate', this.onScoreUpdate, this);

    // Écouter les événements de vague
    this.gameScene.events.on('wavePreparing', this.onWavePreparing, this);
    this.gameScene.events.on('waveStart', this.onWaveStart, this);
    this.gameScene.events.on('waveProgress', this.onWaveProgress, this);
    this.gameScene.events.on('waveComplete', this.onWaveComplete, this);

    // Écouter les événements d'armes (système 2+2)
    this.gameScene.events.on('loadoutChanged', this.onLoadoutChanged, this);
    this.gameScene.events.on('meleeSlotChanged', this.onMeleeSlotChanged, this);
    this.gameScene.events.on('rangedSlotChanged', this.onRangedSlotChanged, this);
    this.gameScene.events.on('meleeSlotEquipped', this.onMeleeSlotEquipped, this);
    this.gameScene.events.on('rangedSlotEquipped', this.onRangedSlotEquipped, this);

    // Écouter les événements de combo (Phase 6.1)
    this.gameScene.events.on('combo:increase', this.onComboIncrease, this);
    this.gameScene.events.on('combo:break', this.onComboBreak, this);
    this.gameScene.events.on('combo:milestone', this.onComboMilestone, this);

    // Écouter les événements de power-up (Phase 6.3)
    this.gameScene.events.on('powerup:activate', this.onPowerUpActivate, this);
    this.gameScene.events.on('powerup:expire', this.onPowerUpExpire, this);

    // Écouter les événements d'objets actifs (Phase 6.4)
    this.gameScene.events.on('activeitem:inventory_update', this.onActiveItemInventoryUpdate, this);
    this.gameScene.events.on('activeitem:equipped', this.onActiveItemEquipped, this);

    // Écouter les événements d'économie (Phase 6.6)
    this.gameScene.events.on('economy:update', this.onEconomyUpdate, this);
    this.gameScene.events.on('economy:points_earned', this.onPointsEarned, this);

    // Écouter les événements de drop d'armes de mêlée (Phase 2 Armes)
    this.gameScene.events.on('meleeWeaponDrop:showComparison', this.onMeleeWeaponDropShowComparison, this);
    this.gameScene.events.on('meleeWeaponDrop:hideComparison', this.onMeleeWeaponDropHideComparison, this);
    this.gameScene.events.on('meleeWeaponDrop:accept', this.onMeleeWeaponDropAccept, this);
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
      this.updateActiveItemDisplay();
    }
  }

  /**
   * Crée la barre de santé
   */
  private createHealthBar(): void {
    const x = 20;
    const y = 20;
    // Barre plus grande sur mobile pour meilleure visibilité
    const width = this.isMobile ? 250 : 200;
    const height = this.isMobile ? 28 : 20;

    // Fond de la barre
    this.healthBarBg = this.add.rectangle(x, y, width, height, 0x333333);
    this.healthBarBg.setOrigin(0, 0);
    this.healthBarBg.setStrokeStyle(2, 0x000000);

    // Barre de vie
    this.healthBar = this.add.rectangle(x + 2, y + 2, width - 4, height - 4, 0xe74c3c);
    this.healthBar.setOrigin(0, 0);

    // Texte de santé (masqué sur mobile pour simplifier)
    this.healthText = this.add.text(x + width / 2, y + height / 2, '100/100', {
      fontSize: this.isMobile ? '16px' : '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.healthText.setOrigin(0.5);
    // Sur mobile, on ne montre pas les valeurs numériques
    this.healthText.setVisible(!this.isMobile);
  }

  /**
   * Crée le compteur de munitions
   */
  private createAmmoCounter(): void {
    // Position et taille adaptées pour mobile
    const y = this.isMobile ? 55 : 50;
    const fontSize = this.isMobile ? '20px' : '16px';

    this.ammoText = this.add.text(20, y, 'Munitions: --/--', {
      fontSize,
      color: '#ffffff',
    });
  }

  /**
   * Crée l'affichage du score et des kills
   */
  private createScoreDisplay(): void {
    // Positions et tailles adaptées pour mobile
    const baseY = this.isMobile ? 85 : 80;
    const scoreFontSize = this.isMobile ? '24px' : '20px';
    const killsFontSize = this.isMobile ? '20px' : '16px';

    this.scoreText = this.add.text(20, baseY, 'Score: 0', {
      fontSize: scoreFontSize,
      color: '#ffff00',
      fontStyle: 'bold',
    });

    this.killsText = this.add.text(20, baseY + 30, 'Kills: 0', {
      fontSize: killsFontSize,
      color: '#ff6666',
    });
  }

  /**
   * Crée l'affichage des points (Phase 6.6)
   */
  private createPointsDisplay(): void {
    const economySystem = this.gameScene.getEconomySystem();
    const points = economySystem ? economySystem.getPoints() : 0;

    // Sur mobile, positionnement différent (en haut à droite, avant la zone des contrôles)
    const fontSize = this.isMobile ? '24px' : '20px';

    this.pointsText = this.add.text(GAME_WIDTH - 20, this.isMobile ? 20 : 80, `Points: ${points}`, {
      fontSize,
      color: '#ffdd00',
      fontStyle: 'bold',
    });
    this.pointsText.setOrigin(1, 0);
  }

  /**
   * Crée l'affichage de la vague
   */
  private createWaveDisplay(): void {
    // Textes plus grands sur mobile pour meilleure lisibilité
    const waveFontSize = this.isMobile ? '28px' : '24px';
    const progressFontSize = this.isMobile ? '18px' : '14px';

    // Numéro de vague (en haut au centre)
    this.waveText = this.add.text(GAME_WIDTH / 2, 20, 'Vague 1', {
      fontSize: waveFontSize,
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.waveText.setOrigin(0.5, 0);

    // Progression de la vague
    this.waveProgressText = this.add.text(GAME_WIDTH / 2, this.isMobile ? 55 : 50, '', {
      fontSize: progressFontSize,
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
   * Masqué sur mobile car les contrôles sont tactiles
   */
  private createControls(): void {
    // Ne pas afficher les contrôles clavier sur mobile
    if (this.isMobile) {
      return;
    }

    const controlsText = [
      'Contrôles:',
      'WASD/Flèches - Déplacement',
      'Souris - Viser',
      'Clic gauche - Tirer',
      'V - Attaque mêlée',
      'Espace - Dash',
      '1-2 - Armes mêlée',
      '3-4/Molette - Armes distance',
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

  // ==================== SYSTÈME 2+2 (Phase 4 Inventaire) ====================

  /**
   * Crée les slots d'armes (2 mêlée + 2 distance)
   * Layout: [Mêlée 1][Mêlée 2] --- [Distance 3][Distance 4]
   */
  private createWeaponSlots(): void {
    // Sur mobile, on masque les slots car il y a des boutons dédiés
    if (this.isMobile) {
      return;
    }

    const slotWidth = 90;
    const slotHeight = 50;
    const slotSpacing = 8;
    const groupSpacing = 20; // Espace entre mêlée et distance
    const y = GAME_HEIGHT - slotHeight - 20;

    // Calcul du positionnement centré
    // 2 slots mêlée + 2 slots distance + espaces
    const meleeGroupWidth = 2 * slotWidth + slotSpacing;
    const rangedGroupWidth = 2 * slotWidth + slotSpacing;
    const totalWidth = meleeGroupWidth + groupSpacing + rangedGroupWidth;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    // Créer les slots de mêlée (touches 1-2)
    for (let i = 0; i < 2; i++) {
      const x = startX + i * (slotWidth + slotSpacing);
      this.createMeleeSlot(i, x, y, slotWidth, slotHeight);
    }

    // Créer les slots d'armes à distance (touches 3-4)
    const rangedStartX = startX + meleeGroupWidth + groupSpacing;
    for (let i = 0; i < 2; i++) {
      const x = rangedStartX + i * (slotWidth + slotSpacing);
      this.createRangedSlot(i, x, y, slotWidth, slotHeight);
    }

    // Initialiser avec les armes du joueur si disponibles
    this.initializeWeaponSlots();
  }

  /**
   * Crée un slot d'arme de mêlée
   */
  private createMeleeSlot(index: number, x: number, y: number, width: number, height: number): void {
    const container = this.add.container(x, y);

    // Fond du slot (couleur distincte pour mêlée)
    const bg = this.add.rectangle(0, 0, width, height, 0x442222, 0.8);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x664444);
    this.meleeSlotBgs.push(bg);

    // Indicateur de touche (1, 2)
    const keyHint = this.add.text(5, 3, `${index + 1}`, {
      fontSize: '10px',
      color: '#aa6644',
    });
    this.meleeKeyHints.push(keyHint);

    // Icône mêlée
    const meleeIcon = this.add.text(width - 15, 5, '⚔', {
      fontSize: '10px',
      color: '#aa6644',
    });
    meleeIcon.setOrigin(0.5, 0);

    // Nom de l'arme
    const name = this.add.text(width / 2, height / 2, '', {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    name.setOrigin(0.5);
    this.meleeNames.push(name);

    container.add([bg, keyHint, meleeIcon, name]);
    this.meleeSlots.push(container);
  }

  /**
   * Crée un slot d'arme à distance
   */
  private createRangedSlot(index: number, x: number, y: number, width: number, height: number): void {
    const container = this.add.container(x, y);

    // Fond du slot
    const bg = this.add.rectangle(0, 0, width, height, 0x222244, 0.8);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x444466);
    this.rangedSlotBgs.push(bg);

    // Indicateur de touche (3, 4)
    const keyHint = this.add.text(5, 3, `${index + 3}`, {
      fontSize: '10px',
      color: '#6666aa',
    });
    this.rangedKeyHints.push(keyHint);

    // Icône distance
    const rangedIcon = this.add.text(width - 15, 5, '🔫', {
      fontSize: '10px',
    });
    rangedIcon.setOrigin(0.5, 0);

    // Nom de l'arme
    const name = this.add.text(width / 2, height / 2 - 8, '', {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    name.setOrigin(0.5);
    this.rangedNames.push(name);

    // Munitions
    const ammo = this.add.text(width / 2, height / 2 + 10, '', {
      fontSize: '10px',
      color: '#aaaaaa',
    });
    ammo.setOrigin(0.5);
    this.rangedAmmoTexts.push(ammo);

    container.add([bg, keyHint, rangedIcon, name, ammo]);
    this.rangedSlots.push(container);
  }

  /**
   * Initialise les slots avec les armes du joueur
   */
  private initializeWeaponSlots(): void {
    if (!this.gameScene?.player) return;

    const meleeWeapons = this.gameScene.player.getMeleeWeapons();
    const rangedWeapons = this.gameScene.player.getRangedWeapons();
    this.currentMeleeIndex = this.gameScene.player.getCurrentMeleeIndex();
    this.currentRangedIndex = this.gameScene.player.getCurrentRangedIndex();

    this.updateMeleeSlots(meleeWeapons, this.currentMeleeIndex);
    this.updateRangedSlots(rangedWeapons, this.currentRangedIndex);
  }

  /**
   * Met à jour les slots de mêlée
   */
  private updateMeleeSlots(weapons: [MeleeWeapon | null, MeleeWeapon | null], activeIndex: 0 | 1): void {
    for (let i = 0; i < 2; i++) {
      const weapon = weapons[i];
      const bg = this.meleeSlotBgs[i];
      const name = this.meleeNames[i];
      const keyHint = this.meleeKeyHints[i];

      if (!bg || !name || !keyHint) continue;

      if (weapon) {
        name.setText(weapon.getName());
        name.setVisible(true);

        // Highlight pour l'arme sélectionnée
        if (i === activeIndex) {
          bg.setStrokeStyle(3, 0xff6644);
          bg.setFillStyle(0x442222, 0.95);
          keyHint.setColor('#ff6644');
        } else {
          bg.setStrokeStyle(2, 0x664444);
          bg.setFillStyle(0x442222, 0.8);
          keyHint.setColor('#aa6644');
        }
      } else {
        name.setText('Vide');
        name.setVisible(true);
        bg.setStrokeStyle(1, 0x443333);
        bg.setFillStyle(0x221111, 0.5);
        keyHint.setColor('#553333');
      }
    }
  }

  /**
   * Met à jour les slots d'armes à distance
   */
  private updateRangedSlots(weapons: [Weapon | null, Weapon | null], activeIndex: 0 | 1): void {
    for (let i = 0; i < 2; i++) {
      const weapon = weapons[i];
      const bg = this.rangedSlotBgs[i];
      const name = this.rangedNames[i];
      const ammo = this.rangedAmmoTexts[i];
      const keyHint = this.rangedKeyHints[i];

      if (!bg || !name || !ammo || !keyHint) continue;

      if (weapon) {
        name.setText(weapon.getName());
        ammo.setText(`${weapon.currentAmmo}/${weapon.maxAmmo}`);
        name.setVisible(true);
        ammo.setVisible(true);

        // Highlight pour l'arme sélectionnée
        if (i === activeIndex) {
          bg.setStrokeStyle(3, 0x6666ff);
          bg.setFillStyle(0x222244, 0.95);
          keyHint.setColor('#6666ff');
        } else {
          bg.setStrokeStyle(2, 0x444466);
          bg.setFillStyle(0x222244, 0.8);
          keyHint.setColor('#6666aa');
        }
      } else {
        name.setText('Vide');
        name.setVisible(true);
        ammo.setVisible(false);
        bg.setStrokeStyle(1, 0x333344);
        bg.setFillStyle(0x111122, 0.5);
        keyHint.setColor('#333355');
      }
    }
  }

  // ==================== ÉVÉNEMENTS SYSTÈME 2+2 ====================

  /**
   * Gère le changement complet de loadout
   */
  private onLoadoutChanged(data: {
    meleeWeapons: [MeleeWeapon | null, MeleeWeapon | null];
    rangedWeapons: [Weapon | null, Weapon | null];
    currentMeleeIndex: 0 | 1;
    currentRangedIndex: 0 | 1;
  }): void {
    this.currentMeleeIndex = data.currentMeleeIndex;
    this.currentRangedIndex = data.currentRangedIndex;
    this.updateMeleeSlots(data.meleeWeapons, data.currentMeleeIndex);
    this.updateRangedSlots(data.rangedWeapons, data.currentRangedIndex);
  }

  /**
   * Gère le changement de slot mêlée actif
   */
  private onMeleeSlotChanged(index: 0 | 1, _weapon: MeleeWeapon): void {
    if (!this.gameScene?.player) return;
    this.currentMeleeIndex = index;
    const meleeWeapons = this.gameScene.player.getMeleeWeapons();
    this.updateMeleeSlots(meleeWeapons, index);
  }

  /**
   * Gère le changement de slot distance actif
   */
  private onRangedSlotChanged(index: 0 | 1, _weapon: Weapon): void {
    if (!this.gameScene?.player) return;
    this.currentRangedIndex = index;
    const rangedWeapons = this.gameScene.player.getRangedWeapons();
    this.updateRangedSlots(rangedWeapons, index);
  }

  /**
   * Gère l'équipement d'une nouvelle arme de mêlée dans un slot
   */
  private onMeleeSlotEquipped(_slotIndex: 0 | 1, _weapon: MeleeWeapon): void {
    if (!this.gameScene?.player) return;
    const meleeWeapons = this.gameScene.player.getMeleeWeapons();
    this.updateMeleeSlots(meleeWeapons, this.currentMeleeIndex);
  }

  /**
   * Gère l'équipement d'une nouvelle arme à distance dans un slot
   */
  private onRangedSlotEquipped(_slotIndex: 0 | 1, _weapon: Weapon): void {
    if (!this.gameScene?.player) return;
    const rangedWeapons = this.gameScene.player.getRangedWeapons();
    this.updateRangedSlots(rangedWeapons, this.currentRangedIndex);
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

    // Mettre à jour aussi les slots d'armes à distance
    this.updateRangedSlotsAmmo();
  }

  /**
   * Met à jour les munitions dans les slots d'armes à distance
   */
  private updateRangedSlotsAmmo(): void {
    const rangedWeapons = this.gameScene.player.getRangedWeapons();
    for (let i = 0; i < 2; i++) {
      const weapon = rangedWeapons[i];
      const ammoText = this.rangedAmmoTexts[i];
      if (!ammoText) continue;

      if (weapon) {
        const reloadingIndicator = weapon.isReloading ? '*' : '';
        ammoText.setText(`${weapon.currentAmmo}/${weapon.maxAmmo}${reloadingIndicator}`);

        // Changer la couleur si les munitions sont basses
        const ammoPercent = weapon.currentAmmo / weapon.maxAmmo;
        if (ammoPercent <= 0) {
          ammoText.setColor('#ff0000');
        } else if (ammoPercent <= 0.3) {
          ammoText.setColor('#ff6600');
        } else {
          ammoText.setColor('#aaaaaa');
        }
      }
    }
  }

  /**
   * Crée le compteur de combo (Phase 6.1)
   */
  private createComboMeter(): void {
    // Sur mobile, le combo meter est positionné différemment
    // pour ne pas gêner les contrôles tactiles
    const meterX = this.isMobile ? GAME_WIDTH - 80 : GAME_WIDTH - 100;
    const meterY = this.isMobile ? 60 : 150;
    const meterWidth = this.isMobile ? 100 : 120;
    const meterHeight = this.isMobile ? 50 : 60;

    this.comboMeter = new ComboMeter(this, {
      x: meterX,
      y: meterY,
      width: meterWidth,
      height: meterHeight,
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
    // Sur mobile, position adaptée pour ne pas gêner les contrôles
    const displayY = this.isMobile ? 150 : 140;
    const displayHeight = this.isMobile ? 100 : 120;
    const maxDisplayed = this.isMobile ? 3 : 4;

    this.powerUpDisplay = new PowerUpDisplay(this, {
      x: 20,
      y: displayY,
      width: 150,
      height: displayHeight,
      maxDisplayed,
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
   * Crée l'affichage des objets actifs (Phase 6.4)
   */
  private createActiveItemDisplay(): void {
    // Sur mobile, l'affichage est adapté pour ne pas gêner les contrôles
    const displayY = this.isMobile ? 260 : 280;
    const slotSize = this.isMobile ? 35 : 40;
    const maxSlots = this.isMobile ? 4 : 5;

    this.activeItemDisplay = new ActiveItemDisplay(this, {
      x: 20,
      y: displayY,
      slotSize,
      slotSpacing: 5,
      maxSlots,
    });
    this.activeItemDisplay.setDepth(100);
  }

  /**
   * Met à jour l'affichage des objets actifs
   */
  private updateActiveItemDisplay(): void {
    const activeItemSystem = this.gameScene.getActiveItemSystem();
    if (activeItemSystem) {
      const inventory = activeItemSystem.getInventory();
      this.activeItemDisplay.update(inventory);
    }
  }

  /**
   * Gère la mise à jour de l'inventaire d'objets actifs
   */
  private onActiveItemInventoryUpdate(_data: { type: string; charges: number }): void {
    // L'affichage sera mis à jour automatiquement via updateActiveItemDisplay
  }

  /**
   * Gère l'équipement d'un objet actif
   */
  private onActiveItemEquipped(_data: { type: string }): void {
    // L'affichage sera mis à jour automatiquement via updateActiveItemDisplay
  }

  /**
   * Gère la mise à jour de l'économie (Phase 6.6)
   */
  private onEconomyUpdate(data: { points: number; earned?: number; spent?: number }): void {
    if (this.pointsText) {
      this.pointsText.setText(`Points: ${data.points}`);
    }
  }

  /**
   * Gère les points gagnés (Phase 6.6)
   */
  private onPointsEarned(data: { amount: number; total: number }): void {
    if (this.pointsText) {
      this.pointsText.setText(`Points: ${data.total}`);

      // Animation de gain de points
      const earnedText = this.add.text(
        this.pointsText.x - this.pointsText.width / 2,
        this.pointsText.y + 25,
        `+${data.amount}`,
        {
          fontSize: '14px',
          color: '#00ff00',
          fontStyle: 'bold',
        }
      );
      earnedText.setOrigin(0.5, 0);

      this.tweens.add({
        targets: earnedText,
        y: earnedText.y - 20,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => earnedText.destroy(),
      });
    }
  }

  // ==================== UI COMPARAISON MELEE (Phase 2 Armes) ====================

  /**
   * Crée l'UI de comparaison d'armes de mêlée
   */
  private createMeleeComparisonUI(): void {
    this.meleeComparisonUI = new MeleeComparisonUI(this);
  }

  /**
   * Affiche l'UI de comparaison d'armes de mêlée
   */
  private onMeleeWeaponDropShowComparison(data: {
    currentWeapon: MeleeWeaponInfo | null;
    newWeapon: MeleeWeaponInfo;
    dropId: MeleeWeaponDrop;
  }): void {
    this.meleeComparisonUI.show(data);
  }

  /**
   * Cache l'UI de comparaison d'armes de mêlée
   */
  private onMeleeWeaponDropHideComparison(): void {
    this.meleeComparisonUI.hide();
  }

  /**
   * Gère l'acceptation d'une nouvelle arme de mêlée
   */
  private onMeleeWeaponDropAccept(drop: MeleeWeaponDrop): void {
    // Le joueur accepte la nouvelle arme
    if (this.gameScene?.player) {
      drop.accept(this.gameScene.player);
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

    // Retirer les listeners d'armes (système 2+2)
    this.gameScene.events.off('loadoutChanged', this.onLoadoutChanged, this);
    this.gameScene.events.off('meleeSlotChanged', this.onMeleeSlotChanged, this);
    this.gameScene.events.off('rangedSlotChanged', this.onRangedSlotChanged, this);
    this.gameScene.events.off('meleeSlotEquipped', this.onMeleeSlotEquipped, this);
    this.gameScene.events.off('rangedSlotEquipped', this.onRangedSlotEquipped, this);

    // Retirer les listeners de combo (Phase 6.1)
    this.gameScene.events.off('combo:increase', this.onComboIncrease, this);
    this.gameScene.events.off('combo:break', this.onComboBreak, this);
    this.gameScene.events.off('combo:milestone', this.onComboMilestone, this);

    // Retirer les listeners de power-up (Phase 6.3)
    this.gameScene.events.off('powerup:activate', this.onPowerUpActivate, this);
    this.gameScene.events.off('powerup:expire', this.onPowerUpExpire, this);

    // Retirer les listeners d'objets actifs (Phase 6.4)
    this.gameScene.events.off('activeitem:inventory_update', this.onActiveItemInventoryUpdate, this);
    this.gameScene.events.off('activeitem:equipped', this.onActiveItemEquipped, this);

    // Retirer les listeners d'économie (Phase 6.6)
    this.gameScene.events.off('economy:update', this.onEconomyUpdate, this);
    this.gameScene.events.off('economy:points_earned', this.onPointsEarned, this);

    // Retirer les listeners de drop d'armes de mêlée (Phase 2 Armes)
    this.gameScene.events.off('meleeWeaponDrop:showComparison', this.onMeleeWeaponDropShowComparison, this);
    this.gameScene.events.off('meleeWeaponDrop:hideComparison', this.onMeleeWeaponDropHideComparison, this);
    this.gameScene.events.off('meleeWeaponDrop:accept', this.onMeleeWeaponDropAccept, this);

    // Détruire l'UI de comparaison
    if (this.meleeComparisonUI) {
      this.meleeComparisonUI.destroy();
    }
  }
}
