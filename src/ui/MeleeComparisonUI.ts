import Phaser from 'phaser';
import type { MeleeWeaponInfo, MeleeWeaponDrop } from '@items/drops/MeleeWeaponDrop';
import { GAME_WIDTH, GAME_HEIGHT } from '@config/constants';

/**
 * Interface pour les données de comparaison
 */
interface ComparisonData {
  currentWeapon: MeleeWeaponInfo | null;
  newWeapon: MeleeWeaponInfo;
  dropId: MeleeWeaponDrop;
}

/**
 * UI de comparaison pour les armes de mêlée
 * Affiche les stats de l'arme actuelle vs la nouvelle arme trouvée
 * Permet au joueur de choisir d'accepter ou refuser
 */
export class MeleeComparisonUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isVisible: boolean = false;
  private currentDrop: MeleeWeaponDrop | null = null;

  // Éléments UI
  private background!: Phaser.GameObjects.Rectangle;
  private title!: Phaser.GameObjects.Text;
  private currentPanel!: Phaser.GameObjects.Container;
  private newPanel!: Phaser.GameObjects.Container;
  private acceptButton!: Phaser.GameObjects.Container;
  private declineButton!: Phaser.GameObjects.Container;
  private hintText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Créer le container principal
    this.container = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.container.setDepth(1000);
    this.container.setVisible(false);

    this.createUI();
  }

  /**
   * Crée les éléments de l'UI
   */
  private createUI(): void {
    const panelWidth = 320;
    const panelHeight = 220;

    // Fond semi-transparent
    this.background = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x000000, 0.85);
    this.background.setStrokeStyle(3, 0xffffff);

    // Titre
    this.title = this.scene.add.text(0, -panelHeight / 2 + 20, 'NOUVELLE ARME TROUVEE', {
      fontSize: '16px',
      color: '#ffcc00',
      fontStyle: 'bold',
    });
    this.title.setOrigin(0.5);

    // Panels de comparaison
    this.currentPanel = this.createWeaponPanel(-70, 10, 'ACTUELLE', 0x666666);
    this.newPanel = this.createWeaponPanel(70, 10, 'NOUVELLE', 0x44aa44);

    // Boutons
    this.acceptButton = this.createButton(-60, panelHeight / 2 - 35, 'E: PRENDRE', 0x44aa44, () => this.accept());
    this.declineButton = this.createButton(60, panelHeight / 2 - 35, 'Q: GARDER', 0xaa4444, () => this.decline());

    // Hint pour mobile
    this.hintText = this.scene.add.text(0, panelHeight / 2 - 60, 'Approchez-vous pour comparer', {
      fontSize: '10px',
      color: '#aaaaaa',
    });
    this.hintText.setOrigin(0.5);

    // Ajouter tout au container
    this.container.add([
      this.background,
      this.title,
      this.currentPanel,
      this.newPanel,
      this.acceptButton,
      this.declineButton,
      this.hintText,
    ]);

    // Écouter les touches clavier
    this.setupKeyboardInput();
  }

  /**
   * Crée un panel d'arme
   */
  private createWeaponPanel(x: number, y: number, label: string, color: number): Phaser.GameObjects.Container {
    const panel = this.scene.add.container(x, y);
    const width = 120;
    const height = 130;

    // Fond
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x222222, 0.9);
    bg.setStrokeStyle(2, color);

    // Label
    const labelText = this.scene.add.text(0, -height / 2 + 12, label, {
      fontSize: '10px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    });
    labelText.setOrigin(0.5);

    // Nom de l'arme (sera mis à jour)
    const nameText = this.scene.add.text(0, -30, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5);
    nameText.setData('type', 'name');

    // Stats (seront mises à jour)
    const statsText = this.scene.add.text(0, 15, '', {
      fontSize: '11px',
      color: '#aaaaaa',
      align: 'center',
    });
    statsText.setOrigin(0.5);
    statsText.setData('type', 'stats');

    // Special
    const specialText = this.scene.add.text(0, height / 2 - 15, '', {
      fontSize: '10px',
      color: '#ffcc00',
    });
    specialText.setOrigin(0.5);
    specialText.setData('type', 'special');

    panel.add([bg, labelText, nameText, statsText, specialText]);
    return panel;
  }

  /**
   * Crée un bouton
   */
  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);
    const width = 100;
    const height = 30;

    const bg = this.scene.add.rectangle(0, 0, width, height, color, 0.8);
    bg.setStrokeStyle(2, 0xffffff);
    bg.setInteractive({ useHandCursor: true });

    const label = this.scene.add.text(0, 0, text, {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    label.setOrigin(0.5);

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(color, 1);
      bg.setScale(1.05);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(color, 0.8);
      bg.setScale(1);
    });

    bg.on('pointerdown', callback);

    button.add([bg, label]);
    return button;
  }

  /**
   * Configure les entrées clavier
   */
  private setupKeyboardInput(): void {
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.on('keydown-E', () => {
        if (this.isVisible) {
          this.accept();
        }
      });

      this.scene.input.keyboard.on('keydown-Q', () => {
        if (this.isVisible) {
          this.decline();
        }
      });
    }
  }

  /**
   * Affiche la comparaison
   */
  public show(data: ComparisonData): void {
    this.currentDrop = data.dropId;
    this.updatePanels(data);
    this.container.setVisible(true);
    this.isVisible = true;

    // Animation d'apparition
    this.container.setScale(0.8);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Cache l'UI
   */
  public hide(): void {
    if (!this.isVisible) return;

    this.scene.tweens.add({
      targets: this.container,
      scale: 0.8,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.container.setVisible(false);
        this.isVisible = false;
        this.currentDrop = null;
      },
    });
  }

  /**
   * Met à jour les panels avec les données
   */
  private updatePanels(data: ComparisonData): void {
    // Panel arme actuelle
    if (data.currentWeapon) {
      this.updatePanel(this.currentPanel, data.currentWeapon, data.newWeapon);
    } else {
      this.updatePanelEmpty(this.currentPanel);
    }

    // Panel nouvelle arme
    this.updatePanel(this.newPanel, data.newWeapon, data.currentWeapon);
  }

  /**
   * Met à jour un panel avec les infos d'une arme
   */
  private updatePanel(
    panel: Phaser.GameObjects.Container,
    weapon: MeleeWeaponInfo,
    compareWith: MeleeWeaponInfo | null
  ): void {
    const tierSymbols = ['', '★', '★★', '★★★'];

    // Trouver les éléments du panel
    const nameText = panel.getAll().find((obj) => obj.getData('type') === 'name') as Phaser.GameObjects.Text;
    const statsText = panel.getAll().find((obj) => obj.getData('type') === 'stats') as Phaser.GameObjects.Text;
    const specialText = panel.getAll().find((obj) => obj.getData('type') === 'special') as Phaser.GameObjects.Text;

    // Nom avec tier
    if (nameText) {
      nameText.setText(`${weapon.name} ${tierSymbols[weapon.tier]}`);
    }

    // Stats avec comparaison
    if (statsText) {
      const lines: string[] = [];

      // Dégâts
      const dmgDiff = compareWith ? weapon.damage - compareWith.damage : 0;
      const dmgColor = dmgDiff > 0 ? '+' : dmgDiff < 0 ? '' : '';
      lines.push(`Degats: ${weapon.damage}${dmgDiff !== 0 ? ` (${dmgColor}${dmgDiff})` : ''}`);

      // Vitesse (inversé car plus petit = plus rapide)
      const speedMs = weapon.swingSpeed;
      const speedDiff = compareWith ? compareWith.swingSpeed - speedMs : 0; // Inversé
      const speedLabel = speedMs <= 250 ? 'Rapide' : speedMs <= 400 ? 'Normal' : speedMs <= 600 ? 'Lent' : 'Tres lent';
      lines.push(`Vitesse: ${speedLabel}`);

      // Portée
      const rangeDiff = compareWith ? weapon.range - compareWith.range : 0;
      lines.push(`Portee: ${weapon.range}px`);

      // Knockback
      if (weapon.knockback > 0) {
        lines.push(`Recul: ${weapon.knockback}`);
      }

      statsText.setText(lines.join('\n'));
    }

    // Special
    if (specialText && weapon.special) {
      specialText.setText(weapon.special);
    }
  }

  /**
   * Met à jour un panel pour afficher "Aucune arme"
   */
  private updatePanelEmpty(panel: Phaser.GameObjects.Container): void {
    const nameText = panel.getAll().find((obj) => obj.getData('type') === 'name') as Phaser.GameObjects.Text;
    const statsText = panel.getAll().find((obj) => obj.getData('type') === 'stats') as Phaser.GameObjects.Text;
    const specialText = panel.getAll().find((obj) => obj.getData('type') === 'special') as Phaser.GameObjects.Text;

    if (nameText) nameText.setText('Aucune');
    if (statsText) statsText.setText('');
    if (specialText) specialText.setText('');
  }

  /**
   * Accepte la nouvelle arme
   */
  private accept(): void {
    if (this.currentDrop) {
      // Émettre l'événement d'acceptation
      this.scene.events.emit('meleeWeaponDrop:accept', this.currentDrop);
    }
    this.hide();
  }

  /**
   * Refuse la nouvelle arme
   */
  private decline(): void {
    if (this.currentDrop) {
      this.currentDrop.decline();
    }
    this.hide();
  }

  /**
   * Vérifie si l'UI est visible
   */
  public getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Détruit l'UI
   */
  public destroy(): void {
    this.container.destroy();
  }
}
