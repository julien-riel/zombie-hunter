import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';
import { ActiveItem, ActiveItemType, ActiveItemRarity } from './ActiveItem';
import { BALANCE } from '@config/balance';

const CONFIG = BALANCE.activeItems.decoy;

/**
 * Leurre holographique
 *
 * Clone visuel du joueur qui attire les zombies.
 * - Durée: 8 secondes
 * - Les zombies le ciblent en priorité
 * - Disparaît après 3 coups ou fin de durée
 * - Permet de repositionner ou regrouper les ennemis
 */
export class HolographicDecoy extends ActiveItem {
  public readonly type: ActiveItemType = 'decoy';
  public readonly rarity: ActiveItemRarity = CONFIG.rarity;
  public readonly color: number = CONFIG.color;
  public readonly name: string = 'Leurre Holographique';
  public readonly description: string = 'Attire les zombies pendant 8s (3 coups max)';

  // Configuration
  private readonly maxHits: number = CONFIG.maxHits;
  private readonly attractionRadius: number = CONFIG.attractionRadius;

  // État
  private hitsRemaining: number = CONFIG.maxHits;
  private attractedZombies: Set<Zombie> = new Set();

  // Visuels
  private container: Phaser.GameObjects.Container | null = null;
  private hologramGraphics: Phaser.GameObjects.Graphics | null = null;
  private glitchTween: Phaser.Tweens.Tween | null = null;
  private pulseTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super();
    this.duration = CONFIG.duration;
    this.timeRemaining = this.duration;
  }

  /**
   * Déploie le leurre
   */
  protected onDeploy(
    player: Player,
    scene: GameScene,
    x: number,
    y: number
  ): boolean {
    // Créer le conteneur
    this.container = scene.add.container(x, y);

    // Dessiner l'hologramme (silhouette du joueur)
    this.hologramGraphics = scene.add.graphics();
    this.drawHologram(player);
    this.container.add(this.hologramGraphics);

    // Animation d'apparition (effet de téléportation)
    this.container.setScale(0);
    this.container.setAlpha(0);

    scene.tweens.add({
      targets: this.container,
      scale: 1,
      alpha: 0.7,
      duration: 200,
      ease: 'Cubic.easeOut',
    });

    // Animation de pulsation continue
    this.pulseTween = scene.tweens.add({
      targets: this.container,
      alpha: { from: 0.7, to: 0.5 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Animation de glitch périodique
    this.startGlitchEffect(scene);

    return true;
  }

  /**
   * Met à jour le leurre
   */
  protected onUpdate(
    _delta: number,
    _player: Player,
    scene: GameScene
  ): boolean {
    if (!this.container || this.hitsRemaining <= 0) return false;

    // Attirer les zombies proches
    this.attractZombies(scene);

    // Vérifier les collisions avec les zombies
    this.checkZombieCollisions(scene);

    return this.hitsRemaining > 0;
  }

  /**
   * Détruit le leurre
   */
  protected onDestroy(_player: Player, scene: GameScene): void {
    // Libérer les zombies attirés
    this.releaseZombies();

    // Animation de disparition
    if (this.container) {
      // Arrêter les animations
      if (this.pulseTween) this.pulseTween.stop();
      if (this.glitchTween) this.glitchTween.stop();

      // Effet de disparition
      this.createDisappearEffect(scene);

      scene.tweens.add({
        targets: this.container,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          this.cleanup();
        },
      });
    } else {
      this.cleanup();
    }
  }

  /**
   * Dessine l'hologramme (silhouette stylisée)
   */
  private drawHologram(_player: Player): void {
    if (!this.hologramGraphics) return;

    this.hologramGraphics.clear();

    // Couleur holographique violette avec transparence
    const color = this.color;

    // Corps simplifié (silhouette humanoïde)
    this.hologramGraphics.lineStyle(2, color, 1);

    // Tête
    this.hologramGraphics.strokeCircle(0, -25, 8);

    // Corps
    this.hologramGraphics.beginPath();
    this.hologramGraphics.moveTo(0, -17);
    this.hologramGraphics.lineTo(0, 5);
    this.hologramGraphics.strokePath();

    // Bras
    this.hologramGraphics.beginPath();
    this.hologramGraphics.moveTo(-12, -10);
    this.hologramGraphics.lineTo(0, -12);
    this.hologramGraphics.lineTo(12, -10);
    this.hologramGraphics.strokePath();

    // Jambes
    this.hologramGraphics.beginPath();
    this.hologramGraphics.moveTo(0, 5);
    this.hologramGraphics.lineTo(-8, 20);
    this.hologramGraphics.moveTo(0, 5);
    this.hologramGraphics.lineTo(8, 20);
    this.hologramGraphics.strokePath();

    // Effet de scanline
    this.hologramGraphics.lineStyle(1, color, 0.3);
    for (let y = -30; y < 25; y += 4) {
      this.hologramGraphics.beginPath();
      this.hologramGraphics.moveTo(-15, y);
      this.hologramGraphics.lineTo(15, y);
      this.hologramGraphics.strokePath();
    }

    // Aura d'attraction
    this.hologramGraphics.lineStyle(1, color, 0.2);
    this.hologramGraphics.strokeCircle(0, 0, 30);
  }

  /**
   * Démarre l'effet de glitch
   */
  private startGlitchEffect(scene: GameScene): void {
    // Glitch toutes les 1-2 secondes
    const scheduleGlitch = () => {
      if (!this.container || !this.isDeployed) return;

      const delay = 1000 + Math.random() * 1000;
      scene.time.delayedCall(delay, () => {
        this.doGlitch(scene);
        scheduleGlitch();
      });
    };

    scheduleGlitch();
  }

  /**
   * Exécute un effet de glitch
   */
  private doGlitch(scene: GameScene): void {
    if (!this.container || !this.hologramGraphics) return;

    // Décalage horizontal rapide
    const originalX = 0;

    scene.tweens.add({
      targets: this.hologramGraphics,
      x: [5, -5, 3, -3, 0],
      duration: 100,
      onComplete: () => {
        if (this.hologramGraphics) {
          this.hologramGraphics.x = originalX;
        }
      },
    });

    // Flash de couleur
    if (this.container) {
      const flash = scene.add.rectangle(
        this.position.x,
        this.position.y,
        30,
        50,
        this.color,
        0.5
      );

      scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 100,
        onComplete: () => flash.destroy(),
      });
    }
  }

  /**
   * Attire les zombies vers le leurre
   */
  private attractZombies(scene: GameScene): void {
    const zombies = scene.getActiveZombies();

    for (const zombie of zombies) {
      if (!zombie.active || zombie.getHealth() <= 0) {
        this.attractedZombies.delete(zombie);
        continue;
      }

      const dist = Phaser.Math.Distance.Between(
        this.position.x,
        this.position.y,
        zombie.x,
        zombie.y
      );

      if (dist <= this.attractionRadius) {
        // Marquer le zombie comme attiré
        if (!this.attractedZombies.has(zombie)) {
          this.attractedZombies.add(zombie);
          // Définir le leurre comme cible prioritaire
          zombie.setData('decoyTarget', this.position);
        }
      } else if (this.attractedZombies.has(zombie)) {
        // Le zombie est sorti du rayon, le libérer
        this.attractedZombies.delete(zombie);
        zombie.setData('decoyTarget', null);
      }
    }
  }

  /**
   * Vérifie les collisions avec les zombies
   */
  private checkZombieCollisions(scene: GameScene): void {
    const zombies = scene.getActiveZombies();
    const hitRadius = 25; // Rayon de collision

    for (const zombie of zombies) {
      if (!zombie.active || zombie.getHealth() <= 0) continue;

      const dist = Phaser.Math.Distance.Between(
        this.position.x,
        this.position.y,
        zombie.x,
        zombie.y
      );

      if (dist <= hitRadius) {
        this.onHit(scene);
        if (this.hitsRemaining <= 0) break;
      }
    }
  }

  /**
   * Gère quand le leurre est touché
   */
  private onHit(scene: GameScene): void {
    this.hitsRemaining--;

    // Effet visuel de dégât
    this.createHitEffect(scene);

    // Intensifier le glitch
    this.doGlitch(scene);

    console.log(`[HolographicDecoy] Hit! ${this.hitsRemaining} hits remaining`);

    // Si plus de vie, le leurre est détruit
    if (this.hitsRemaining <= 0) {
      this.destroy();
    }
  }

  /**
   * Libère tous les zombies attirés
   */
  private releaseZombies(): void {
    for (const zombie of this.attractedZombies) {
      if (zombie.active) {
        zombie.setData('decoyTarget', null);
      }
    }
    this.attractedZombies.clear();
  }

  /**
   * Crée un effet quand le leurre est touché
   */
  private createHitEffect(scene: GameScene): void {
    // Flash d'impact
    const flash = scene.add.circle(
      this.position.x,
      this.position.y,
      30,
      this.color,
      0.5
    );

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 150,
      onComplete: () => flash.destroy(),
    });

    // Réduire l'opacité progressivement
    if (this.container) {
      const newAlpha = 0.3 + (this.hitsRemaining / this.maxHits) * 0.4;
      scene.tweens.add({
        targets: this.container,
        alpha: newAlpha,
        duration: 100,
      });
    }
  }

  /**
   * Crée l'effet de disparition
   */
  private createDisappearEffect(scene: GameScene): void {
    // Particules de dissolution
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 30;
      const particle = scene.add.rectangle(
        this.position.x + Math.cos(angle) * dist,
        this.position.y + Math.sin(angle) * dist,
        4,
        4,
        this.color,
        0.8
      );

      scene.tweens.add({
        targets: particle,
        y: particle.y - 30 - Math.random() * 20,
        alpha: 0,
        duration: 400 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Récupère le nombre de coups restants
   */
  public getHitsRemaining(): number {
    return this.hitsRemaining;
  }

  /**
   * Récupère le rayon d'attraction
   */
  public getAttractionRadius(): number {
    return this.attractionRadius;
  }

  /**
   * Nettoie les ressources
   */
  private cleanup(): void {
    this.releaseZombies();

    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
    if (this.glitchTween) {
      this.glitchTween.stop();
      this.glitchTween = null;
    }
    if (this.hologramGraphics) {
      this.hologramGraphics.destroy();
      this.hologramGraphics = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
