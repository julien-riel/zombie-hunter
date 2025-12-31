import Phaser from 'phaser';
import type { ActiveItemInventoryInfo } from '@systems/ActiveItemSystem';

/**
 * Configuration du display d'objets actifs
 */
interface ActiveItemDisplayConfig {
  x: number;
  y: number;
  slotSize: number;
  slotSpacing: number;
  maxSlots: number;
}

/**
 * Élément d'affichage pour un slot d'objet actif
 */
interface ActiveItemSlot {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Graphics;
  chargesText: Phaser.GameObjects.Text;
  selectionBorder: Phaser.GameObjects.Rectangle;
}

/**
 * Affichage des objets actifs dans le HUD
 *
 * Affiche l'inventaire d'objets actifs avec:
 * - Icône représentant chaque type d'objet
 * - Nombre de charges restantes
 * - Indicateur de sélection pour l'objet équipé
 * - Raccourci clavier associé
 */
export class ActiveItemDisplay extends Phaser.GameObjects.Container {
  private config: ActiveItemDisplayConfig;
  private slots: ActiveItemSlot[] = [];

  constructor(scene: Phaser.Scene, config: Partial<ActiveItemDisplayConfig> = {}) {
    super(scene, config.x ?? 20, config.y ?? 400);

    this.config = {
      x: config.x ?? 20,
      y: config.y ?? 400,
      slotSize: config.slotSize ?? 40,
      slotSpacing: config.slotSpacing ?? 5,
      maxSlots: config.maxSlots ?? 5,
    };

    // Ajouter à la scène
    scene.add.existing(this);

    // Créer le titre
    this.createTitle();

    // Créer les slots
    for (let i = 0; i < this.config.maxSlots; i++) {
      this.createSlot(i);
    }
  }

  /**
   * Crée le titre de la section
   */
  private createTitle(): void {
    const title = this.scene.add.text(0, -20, 'OBJETS [F=Utiliser, Tab=Cycler]', {
      fontSize: '10px',
      color: '#888888',
    });
    this.add(title);
  }

  /**
   * Crée un slot d'objet actif
   */
  private createSlot(index: number): void {
    const x = index * (this.config.slotSize + this.config.slotSpacing);
    const y = 0;

    // Container pour le slot
    const container = this.scene.add.container(x, y);

    // Background du slot
    const background = this.scene.add.rectangle(
      0,
      0,
      this.config.slotSize,
      this.config.slotSize,
      0x222222,
      0.8
    );
    background.setOrigin(0, 0);
    background.setStrokeStyle(1, 0x444444);

    // Bordure de sélection (invisible par défaut)
    const selectionBorder = this.scene.add.rectangle(
      0,
      0,
      this.config.slotSize,
      this.config.slotSize,
      0x000000,
      0
    );
    selectionBorder.setOrigin(0, 0);
    selectionBorder.setStrokeStyle(2, 0xffff00);
    selectionBorder.setVisible(false);

    // Icône (graphics)
    const icon = this.scene.add.graphics();
    icon.setPosition(this.config.slotSize / 2, this.config.slotSize / 2);

    // Texte des charges
    const chargesText = this.scene.add.text(
      this.config.slotSize - 5,
      this.config.slotSize - 5,
      '',
      {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }
    );
    chargesText.setOrigin(1, 1);

    // Ajouter tous les éléments au container
    container.add([background, selectionBorder, icon, chargesText]);

    // Cacher initialement
    container.setVisible(false);

    // Ajouter au display principal
    this.add(container);

    // Stocker la référence
    this.slots.push({
      container,
      background,
      icon,
      chargesText,
      selectionBorder,
    });
  }

  /**
   * Met à jour l'affichage avec l'inventaire actuel
   */
  public update(inventory: ActiveItemInventoryInfo[]): void {
    // Mettre à jour chaque slot
    for (let i = 0; i < this.config.maxSlots; i++) {
      const slot = this.slots[i];
      const itemInfo = inventory[i];

      if (itemInfo) {
        // Afficher et mettre à jour
        slot.container.setVisible(true);
        this.updateSlot(slot, itemInfo, i);
      } else {
        // Cacher
        slot.container.setVisible(false);
      }
    }
  }

  /**
   * Met à jour un slot avec les infos d'un objet
   */
  private updateSlot(
    slot: ActiveItemSlot,
    itemInfo: ActiveItemInventoryInfo,
    _index: number
  ): void {
    // Dessiner l'icône selon le type
    this.drawItemIcon(slot.icon, itemInfo.type, itemInfo.color);

    // Charges restantes
    slot.chargesText.setText(`${itemInfo.charges}`);
    slot.chargesText.setColor(itemInfo.charges > 0 ? '#ffffff' : '#ff4444');

    // Bordure de sélection
    slot.selectionBorder.setVisible(itemInfo.isEquipped);

    // Couleur du background selon l'état
    if (itemInfo.isEquipped) {
      slot.background.setFillStyle(0x333333, 0.9);
      slot.background.setStrokeStyle(2, itemInfo.color);
    } else if (itemInfo.charges > 0) {
      slot.background.setFillStyle(0x222222, 0.8);
      slot.background.setStrokeStyle(1, 0x444444);
    } else {
      slot.background.setFillStyle(0x111111, 0.6);
      slot.background.setStrokeStyle(1, 0x333333);
    }
  }

  /**
   * Dessine l'icône d'un objet selon son type
   */
  private drawItemIcon(
    graphics: Phaser.GameObjects.Graphics,
    type: string,
    color: number
  ): void {
    graphics.clear();

    const size = 12;

    switch (type) {
      case 'turret':
        // Icône de tourelle (carré avec canon)
        graphics.fillStyle(color, 1);
        graphics.fillRect(-size / 2, -size / 2, size, size);
        graphics.fillRect(size / 2, -2, 8, 4);
        break;

      case 'mine':
        // Icône de mine (octogone)
        graphics.fillStyle(color, 1);
        graphics.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
          const px = Math.cos(angle) * size;
          const py = Math.sin(angle) * size;
          if (i === 0) graphics.moveTo(px, py);
          else graphics.lineTo(px, py);
        }
        graphics.closePath();
        graphics.fillPath();
        break;

      case 'drone':
        // Icône de drone (X avec cercle central)
        graphics.lineStyle(2, color, 1);
        graphics.beginPath();
        graphics.moveTo(-size, -size);
        graphics.lineTo(size, size);
        graphics.moveTo(size, -size);
        graphics.lineTo(-size, size);
        graphics.strokePath();
        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, 4);
        break;

      case 'decoy':
        // Icône de leurre (silhouette humaine)
        graphics.lineStyle(2, color, 1);
        graphics.strokeCircle(0, -8, 4); // Tête
        graphics.beginPath();
        graphics.moveTo(0, -4);
        graphics.lineTo(0, 6); // Corps
        graphics.moveTo(-6, 0);
        graphics.lineTo(6, 0); // Bras
        graphics.moveTo(0, 6);
        graphics.lineTo(-4, 12); // Jambe gauche
        graphics.moveTo(0, 6);
        graphics.lineTo(4, 12); // Jambe droite
        graphics.strokePath();
        break;

      case 'discoball':
        // Icône de disco ball (cercle avec facettes)
        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, size);
        graphics.fillStyle(0xffffff, 0.5);
        graphics.fillRect(-3, -3, 3, 3);
        graphics.fillRect(2, -6, 3, 3);
        graphics.fillRect(-6, 2, 3, 3);
        graphics.fillRect(4, 4, 3, 3);
        break;

      default:
        // Icône par défaut (carré)
        graphics.fillStyle(color, 1);
        graphics.fillRect(-size / 2, -size / 2, size, size);
    }
  }

  /**
   * Animation quand un objet est utilisé
   */
  public animateItemUsed(_type: string): void {
    // Trouver le slot correspondant
    const slotIndex = this.slots.findIndex((slot) => {
      if (!slot.container.visible) return false;
      // On devrait stocker le type mais pour l'instant on utilise juste l'animation sur tous
      return true;
    });

    if (slotIndex === -1) return;

    const slot = this.slots[slotIndex];

    // Animation de flash
    this.scene.tweens.add({
      targets: slot.container,
      scaleX: { from: 0.8, to: 1 },
      scaleY: { from: 0.8, to: 1 },
      duration: 150,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Animation quand un objet est ajouté
   */
  public animateItemAdded(slotIndex: number): void {
    if (slotIndex >= this.slots.length) return;

    const slot = this.slots[slotIndex];

    this.scene.tweens.add({
      targets: slot.container,
      scaleX: { from: 1.2, to: 1 },
      scaleY: { from: 1.2, to: 1 },
      alpha: { from: 0.5, to: 1 },
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Nettoie les ressources
   */
  public destroy(fromScene?: boolean): void {
    for (const slot of this.slots) {
      slot.container.destroy();
    }
    this.slots = [];
    super.destroy(fromScene);
  }
}
