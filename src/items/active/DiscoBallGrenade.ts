import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';
import { ActiveItem, ActiveItemType, ActiveItemRarity } from './ActiveItem';
import { BALANCE } from '@config/balance';

const CONFIG = BALANCE.activeItems.discoball;

/**
 * Grenade Disco Ball
 *
 * Une grenade qui attire les zombies avec un effet disco,
 * puis explose avec des dégâts bonus basés sur le nombre de zombies attirés.
 *
 * - Phase 1 (3s): Attire les zombies avec effet disco
 * - Phase 2: Explosion massive
 * - Dégâts: base + bonus par zombie attiré
 */
export class DiscoBallGrenade extends ActiveItem {
  public readonly type: ActiveItemType = 'discoball';
  public readonly rarity: ActiveItemRarity = CONFIG.rarity;
  public readonly color: number = CONFIG.color;
  public readonly name: string = 'Grenade Disco Ball';
  public readonly description: string = 'Attire les zombies puis explose!';

  // Configuration
  private readonly attractDuration: number = CONFIG.attractDuration;
  private readonly attractRadius: number = CONFIG.attractRadius;
  private readonly explosionRadius: number = CONFIG.explosionRadius;
  private readonly baseDamage: number = CONFIG.baseDamage;
  private readonly damagePerZombie: number = CONFIG.damagePerZombie;
  private readonly maxBonusDamage: number = CONFIG.maxBonusDamage;

  // État
  private phase: 'attract' | 'explode' | 'done' = 'attract';
  private attractTimer: number = 0;
  private attractedZombies: Set<Zombie> = new Set();
  private rotationAngle: number = 0;

  // Visuels
  private container: Phaser.GameObjects.Container | null = null;
  private ballGraphics: Phaser.GameObjects.Graphics | null = null;
  private lightBeams: Phaser.GameObjects.Graphics | null = null;
  private discoColors: number[] = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];

  constructor() {
    super();
    // La durée totale inclut l'attraction + explosion instantanée
    this.duration = 0; // Géré manuellement via phases
  }

  /**
   * Déploie la grenade
   */
  protected onDeploy(
    _player: Player,
    scene: GameScene,
    x: number,
    y: number
  ): boolean {
    // Créer le conteneur
    this.container = scene.add.container(x, y);
    this.container.setDepth(50);

    // Rayons de lumière disco
    this.lightBeams = scene.add.graphics();
    this.container.add(this.lightBeams);

    // Boule disco
    this.ballGraphics = scene.add.graphics();
    this.drawDiscoBall();
    this.container.add(this.ballGraphics);

    // Animation d'apparition (lancer en arc)
    // Pour l'instant, apparition directe avec effet de rebond
    this.container.setScale(0);
    scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 200,
      ease: 'Bounce.easeOut',
    });

    return true;
  }

  /**
   * Met à jour la grenade
   */
  protected onUpdate(
    delta: number,
    _player: Player,
    scene: GameScene
  ): boolean {
    if (!this.container || this.phase === 'done') return false;

    if (this.phase === 'attract') {
      // Phase d'attraction
      this.attractTimer += delta;

      // Rotation de la boule disco
      this.rotationAngle += delta * 0.005;
      this.drawDiscoBall();
      this.drawLightBeams(scene);

      // Attirer les zombies
      this.attractZombies(scene);

      // Vérifier si la phase d'attraction est terminée
      if (this.attractTimer >= this.attractDuration) {
        this.explode(scene);
        this.phase = 'done';
        return false;
      }
    }

    return true;
  }

  /**
   * Détruit la grenade
   */
  protected onDestroy(_player: Player, _scene: GameScene): void {
    this.cleanup();
  }

  /**
   * Dessine la boule disco
   */
  private drawDiscoBall(): void {
    if (!this.ballGraphics) return;

    this.ballGraphics.clear();

    const radius = 12;

    // Cercle de base
    this.ballGraphics.fillStyle(0x888888, 1);
    this.ballGraphics.fillCircle(0, 0, radius);

    // Facettes (carrés colorés)
    const facetSize = 5;
    const numFacets = 8;

    for (let i = 0; i < numFacets; i++) {
      const angle = (i / numFacets) * Math.PI * 2 + this.rotationAngle;
      const colorIndex = i % this.discoColors.length;
      const color = this.discoColors[colorIndex];

      const fx = Math.cos(angle) * (radius - facetSize / 2);
      const fy = Math.sin(angle) * (radius - facetSize / 2);

      this.ballGraphics.fillStyle(color, 0.8);
      this.ballGraphics.fillRect(fx - facetSize / 2, fy - facetSize / 2, facetSize, facetSize);
    }

    // Reflet brillant
    this.ballGraphics.fillStyle(0xffffff, 0.5);
    this.ballGraphics.fillCircle(-4, -4, 3);
  }

  /**
   * Dessine les rayons de lumière disco
   */
  private drawLightBeams(_scene: GameScene): void {
    if (!this.lightBeams) return;

    this.lightBeams.clear();

    const numBeams = 8;
    const beamLength = this.attractRadius;

    for (let i = 0; i < numBeams; i++) {
      const angle = (i / numBeams) * Math.PI * 2 + this.rotationAngle * 0.5;
      const colorIndex = (i + Math.floor(this.rotationAngle)) % this.discoColors.length;
      const color = this.discoColors[colorIndex];

      // Rayon principal
      this.lightBeams.lineStyle(3, color, 0.3);
      this.lightBeams.beginPath();
      this.lightBeams.moveTo(0, 0);
      this.lightBeams.lineTo(
        Math.cos(angle) * beamLength,
        Math.sin(angle) * beamLength
      );
      this.lightBeams.strokePath();

      // Particule au bout du rayon
      const particleX = Math.cos(angle) * beamLength * 0.8;
      const particleY = Math.sin(angle) * beamLength * 0.8;
      this.lightBeams.fillStyle(color, 0.5);
      this.lightBeams.fillCircle(particleX, particleY, 4);
    }

    // Cercle d'attraction
    this.lightBeams.lineStyle(2, this.color, 0.2);
    this.lightBeams.strokeCircle(0, 0, this.attractRadius);

    // Particules flottantes aléatoires
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * this.attractRadius * 0.8;
      const color = this.discoColors[Math.floor(Math.random() * this.discoColors.length)];

      this.lightBeams.fillStyle(color, 0.6);
      this.lightBeams.fillCircle(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        2
      );
    }
  }

  /**
   * Attire les zombies vers la boule disco
   */
  private attractZombies(scene: GameScene): void {
    const zombies = scene.getActiveZombies();
    const attractForce = 100; // Pixels par seconde

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

      if (dist <= this.attractRadius && dist > 20) {
        // Ajouter à la liste des zombies attirés
        this.attractedZombies.add(zombie);

        // Calculer la direction vers la boule
        const angle = Phaser.Math.Angle.Between(zombie.x, zombie.y, this.position.x, this.position.y);

        // Appliquer une force d'attraction (via déplacement direct)
        const pullStrength = (1 - dist / this.attractRadius) * attractForce * 0.02;
        zombie.x += Math.cos(angle) * pullStrength;
        zombie.y += Math.sin(angle) * pullStrength;

        // Marquer le zombie comme "dansant" (pour effet visuel optionnel)
        zombie.setData('dancing', true);
      }
    }
  }

  /**
   * Fait exploser la grenade
   */
  private explode(scene: GameScene): void {
    // Calculer les dégâts bonus
    const zombiesAttracted = this.attractedZombies.size;
    const bonusDamage = Math.min(
      zombiesAttracted * this.damagePerZombie,
      this.maxBonusDamage
    );
    const totalDamage = this.baseDamage + bonusDamage;

    console.log(
      `[DiscoBallGrenade] Exploding! ${zombiesAttracted} zombies attracted, ` +
      `${totalDamage} total damage (${this.baseDamage} base + ${bonusDamage} bonus)`
    );

    // Créer l'effet d'explosion disco
    this.createDiscoExplosion(scene);

    // Infliger des dégâts aux zombies dans le rayon d'explosion
    const zombies = scene.getActiveZombies();
    let zombiesHit = 0;

    for (const zombie of zombies) {
      if (!zombie.active || zombie.getHealth() <= 0) continue;

      const dist = Phaser.Math.Distance.Between(
        this.position.x,
        this.position.y,
        zombie.x,
        zombie.y
      );

      if (dist <= this.explosionRadius) {
        // Dégâts décroissants avec la distance
        const damageMultiplier = 1 - (dist / this.explosionRadius) * 0.3;
        const actualDamage = Math.floor(totalDamage * damageMultiplier);
        zombie.takeDamage(actualDamage);
        zombiesHit++;

        // Retirer le marqueur "dancing"
        zombie.setData('dancing', false);

        // Knockback
        this.applyKnockback(zombie, scene);
      }
    }

    // Libérer les zombies attirés
    for (const zombie of this.attractedZombies) {
      if (zombie.active) {
        zombie.setData('dancing', false);
      }
    }
    this.attractedZombies.clear();

    // Émettre l'événement
    scene.events.emit('activeitem:discoball_explode', {
      itemId: this.id,
      position: this.position,
      zombiesHit,
      totalDamage,
    });
  }

  /**
   * Crée l'effet d'explosion disco
   */
  private createDiscoExplosion(scene: GameScene): void {
    // Flash principal multicolore
    for (let i = 0; i < 6; i++) {
      const color = this.discoColors[i];
      const delay = i * 30;

      scene.time.delayedCall(delay, () => {
        const ring = scene.add.circle(
          this.position.x,
          this.position.y,
          20,
          color,
          0.6
        );

        scene.tweens.add({
          targets: ring,
          scale: this.explosionRadius / 20,
          alpha: 0,
          duration: 300,
          onComplete: () => ring.destroy(),
        });
      });
    }

    // Explosion centrale blanche
    const flash = scene.add.circle(
      this.position.x,
      this.position.y,
      this.explosionRadius * 0.5,
      0xffffff,
      0.8
    );

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => flash.destroy(),
    });

    // Particules colorées
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const speed = 60 + Math.random() * 80;
      const color = this.discoColors[i % this.discoColors.length];

      const particle = scene.add.rectangle(
        this.position.x,
        this.position.y,
        6,
        6,
        color
      );

      scene.tweens.add({
        targets: particle,
        x: this.position.x + Math.cos(angle) * speed,
        y: this.position.y + Math.sin(angle) * speed,
        alpha: 0,
        rotation: Math.random() * 6,
        duration: 400 + Math.random() * 200,
        onComplete: () => particle.destroy(),
      });
    }

    // Confettis
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * this.explosionRadius;
      const color = this.discoColors[Math.floor(Math.random() * this.discoColors.length)];

      const confetti = scene.add.rectangle(
        this.position.x + Math.cos(angle) * dist * 0.3,
        this.position.y + Math.sin(angle) * dist * 0.3,
        4,
        8,
        color
      );
      confetti.setRotation(Math.random() * Math.PI);

      scene.tweens.add({
        targets: confetti,
        x: this.position.x + Math.cos(angle) * dist,
        y: this.position.y + Math.sin(angle) * dist + 50,
        rotation: confetti.rotation + Math.PI * 2,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Quad.easeOut',
        onComplete: () => confetti.destroy(),
      });
    }

    // Shake de la caméra
    scene.cameras.main.shake(200, 0.015);
  }

  /**
   * Applique un knockback à un zombie
   */
  private applyKnockback(zombie: Zombie, scene: GameScene): void {
    const angle = Phaser.Math.Angle.Between(
      this.position.x,
      this.position.y,
      zombie.x,
      zombie.y
    );

    const knockbackDistance = 60;

    scene.tweens.add({
      targets: zombie,
      x: zombie.x + Math.cos(angle) * knockbackDistance,
      y: zombie.y + Math.sin(angle) * knockbackDistance,
      duration: 200,
      ease: 'Power2',
    });
  }

  /**
   * Récupère le nombre de zombies attirés
   */
  public getAttractedCount(): number {
    return this.attractedZombies.size;
  }

  /**
   * Récupère la phase actuelle
   */
  public getPhase(): 'attract' | 'explode' | 'done' {
    return this.phase;
  }

  /**
   * Récupère le temps restant avant explosion
   */
  public getTimeUntilExplosion(): number {
    return Math.max(0, this.attractDuration - this.attractTimer);
  }

  /**
   * Nettoie les ressources
   */
  private cleanup(): void {
    // Libérer les zombies
    for (const zombie of this.attractedZombies) {
      if (zombie.active) {
        zombie.setData('dancing', false);
      }
    }
    this.attractedZombies.clear();

    if (this.lightBeams) {
      this.lightBeams.destroy();
      this.lightBeams = null;
    }
    if (this.ballGraphics) {
      this.ballGraphics.destroy();
      this.ballGraphics = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
