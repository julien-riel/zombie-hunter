import Phaser from 'phaser';
import { DeviceDetector } from '@utils/DeviceDetector';

/**
 * Overlay affiché quand l'appareil mobile est en mode portrait
 * Demande à l'utilisateur de tourner son appareil en mode paysage
 *
 * Phase 5 - Polish mobile
 */
export class OrientationOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private isVisible: boolean = false;
  private checkInterval: number | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
    this.setupOrientationListener();
    this.checkOrientation();
  }

  /**
   * Crée les éléments visuels de l'overlay
   */
  private create(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(10000); // Au-dessus de tout
    this.container.setVisible(false);

    // Fond noir semi-transparent
    const background = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.95
    );
    this.container.add(background);

    // Icône de rotation (téléphone avec flèche)
    const phoneIcon = this.createRotateIcon(width / 2, height / 2 - 50);
    this.container.add(phoneIcon);

    // Message principal
    const mainText = this.scene.add.text(width / 2, height / 2 + 60, 'Tournez votre appareil', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    mainText.setOrigin(0.5);
    this.container.add(mainText);

    // Message secondaire
    const subText = this.scene.add.text(
      width / 2,
      height / 2 + 100,
      'Pour une meilleure expérience, jouez en mode paysage',
      {
        fontSize: '18px',
        color: '#aaaaaa',
        wordWrap: { width: width - 60 },
        align: 'center',
      }
    );
    subText.setOrigin(0.5);
    this.container.add(subText);

    // Animation de pulsation sur le texte principal
    this.scene.tweens.add({
      targets: mainText,
      alpha: 0.7,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Crée l'icône de rotation du téléphone
   */
  private createRotateIcon(x: number, y: number): Phaser.GameObjects.Container {
    const iconContainer = this.scene.add.container(x, y);

    // Téléphone (rectangle vertical)
    const phone = this.scene.add.rectangle(0, 0, 50, 80, 0x444444);
    phone.setStrokeStyle(3, 0x888888);
    iconContainer.add(phone);

    // Écran du téléphone
    const screen = this.scene.add.rectangle(0, 0, 40, 60, 0x222222);
    iconContainer.add(screen);

    // Flèche de rotation (arc)
    const arrow = this.scene.add.graphics();
    arrow.lineStyle(3, 0x00ff00, 1);
    arrow.beginPath();
    arrow.arc(0, 0, 60, -Math.PI / 4, Math.PI / 4, false);
    arrow.strokePath();

    // Pointe de la flèche
    arrow.fillStyle(0x00ff00, 1);
    arrow.beginPath();
    arrow.moveTo(42, 42);
    arrow.lineTo(55, 35);
    arrow.lineTo(48, 48);
    arrow.closePath();
    arrow.fillPath();

    iconContainer.add(arrow);

    // Animation de rotation du téléphone
    this.scene.tweens.add({
      targets: phone,
      angle: 90,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.scene.tweens.add({
      targets: screen,
      angle: 90,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return iconContainer;
  }

  /**
   * Configure l'écouteur d'orientation
   */
  private setupOrientationListener(): void {
    // Écouter les changements d'orientation
    window.addEventListener('orientationchange', () => {
      this.checkOrientation();
    });

    // Écouter aussi les redimensionnements (backup)
    window.addEventListener('resize', () => {
      this.checkOrientation();
    });

    // Vérifier périodiquement (au cas où les événements ne fonctionnent pas)
    this.checkInterval = window.setInterval(() => {
      this.checkOrientation();
    }, 1000);
  }

  /**
   * Vérifie l'orientation et affiche/masque l'overlay
   */
  private checkOrientation(): void {
    // Ne vérifier que sur mobile/tablette
    if (DeviceDetector.isDesktop()) {
      this.hide();
      return;
    }

    // Vérifier si on est en portrait
    if (DeviceDetector.isPortrait()) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Affiche l'overlay
   */
  public show(): void {
    if (this.isVisible || !this.container) return;
    this.isVisible = true;

    // Mettre à jour les dimensions
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    const background = this.container.getAt(0) as Phaser.GameObjects.Rectangle;
    background.setPosition(width / 2, height / 2);
    background.setSize(width, height);

    this.container.setVisible(true);
    this.container.setAlpha(0);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 300,
    });

    // Mettre le jeu en pause si possible
    if (this.scene.scene.isPaused(this.scene.scene.key)) {
      return;
    }

    // Optionnel: pauser la scène de jeu
    // this.scene.scene.pause();
  }

  /**
   * Masque l'overlay
   */
  public hide(): void {
    if (!this.isVisible || !this.container) return;
    this.isVisible = false;

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.container) {
          this.container.setVisible(false);
        }
      },
    });
  }

  /**
   * Vérifie si l'overlay est visible
   */
  public getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Essaie de verrouiller l'orientation en paysage
   */
  public async tryLockLandscape(): Promise<boolean> {
    return await DeviceDetector.lockLandscape();
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    window.removeEventListener('orientationchange', () => this.checkOrientation());
    window.removeEventListener('resize', () => this.checkOrientation());

    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
