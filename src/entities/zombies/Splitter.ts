import type { GameScene } from '@scenes/GameScene';
import { Zombie, ZombieConfig } from './Zombie';
import { ASSET_KEYS } from '@config/assets.manifest';
import { BALANCE } from '@config/balance';
import { MiniZombie } from './MiniZombie';

/**
 * Configuration du Splitter depuis balance.ts
 */
const SPLITTER_CONFIG: ZombieConfig = {
  type: 'splitter',
  texture: ASSET_KEYS.SPLITTER,
  maxHealth: BALANCE.zombies.splitter.health,
  speed: BALANCE.zombies.splitter.speed,
  damage: BALANCE.zombies.splitter.damage,
  detectionRange: BALANCE.zombies.splitter.detectionRange,
  attackRange: BALANCE.zombies.splitter.attackRange,
  attackCooldown: BALANCE.zombies.splitter.attackCooldown,
  scoreValue: BALANCE.zombies.splitter.scoreValue,
};

/**
 * Splitter - Zombie qui se divise à la mort
 *
 * Caractéristiques selon le GDD:
 * - HP moyen (35), vitesse moyenne (70)
 * - Se divise en 2 mini-zombies quand il meurt
 * - Les minis sont plus rapides mais moins résistants
 */
export class Splitter extends Zombie {
  /** Nombre de mini-zombies à spawner */
  private readonly splitCount: number = BALANCE.zombies.splitter.splitCount;
  /** Indique si la division a déjà eu lieu */
  private hasSplit: boolean = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, SPLITTER_CONFIG);
    this.onSpawn();
  }

  /**
   * Comportement lors du spawn
   */
  protected onSpawn(): void {
    // Le Splitter a une teinte cyan
    this.setTint(0x00ffff);
    // Légèrement plus gros
    this.setScale(1.1);
  }

  /**
   * Override de la mort pour spawner les minis
   */
  protected die(): void {
    if (this.hasSplit) return;

    this.hasSplit = true;
    this.stateMachine.setDead();

    // Spawner les mini-zombies
    this.spawnMinis();

    // Effet visuel de division
    this.createSplitEffect();

    // Émettre un événement de mort
    this.scene.events.emit('zombieDeath', this);

    // Animation de mort
    this.playDeathAnimation();
  }

  /**
   * Spawn les mini-zombies
   */
  private spawnMinis(): void {
    const spawnRadius = 20;

    for (let i = 0; i < this.splitCount; i++) {
      // Position légèrement décalée
      const angle = (Math.PI * 2 * i) / this.splitCount + Math.random() * 0.5;
      const offsetX = Math.cos(angle) * spawnRadius;
      const offsetY = Math.sin(angle) * spawnRadius;

      const x = this.x + offsetX;
      const y = this.y + offsetY;

      // Créer le mini-zombie
      const mini = new MiniZombie(this.scene, x, y);

      // Ajouter au groupe de zombies pour les collisions
      const zombieFactory = this.scene.getZombieFactory();
      if (zombieFactory) {
        // Le mini-zombie doit être enregistré dans le système de combat
        this.scene.events.emit('miniZombieSpawned', mini);
      }

      // Animation d'apparition
      mini.setAlpha(0);
      mini.setScale(0);

      this.scene.tweens.add({
        targets: mini,
        alpha: 1,
        scale: 0.5,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }
  }

  /**
   * Crée l'effet visuel de division
   */
  private createSplitEffect(): void {
    // Explosion de particules cyan
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const particle = this.scene.add.circle(
        this.x,
        this.y,
        4,
        0x00ffff,
        1
      );

      const distance = 40;
      const targetX = this.x + Math.cos(angle) * distance;
      const targetY = this.y + Math.sin(angle) * distance;

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => {
          particle.destroy();
        },
      });
    }

    // Flash central
    const flash = this.scene.add.circle(this.x, this.y, 15, 0x00ffff, 0.8);

    this.scene.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  /**
   * Réinitialise le Splitter pour réutilisation (pooling)
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);
    this.hasSplit = false;
    this.setTint(0x00ffff);
    this.setScale(1.1);
  }
}
