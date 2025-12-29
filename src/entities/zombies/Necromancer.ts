import type { GameScene } from '@scenes/GameScene';
import { Zombie, ZombieConfig } from './Zombie';
import { ASSET_KEYS } from '@config/assets.manifest';
import { BALANCE } from '@config/balance';

/**
 * Configuration du Necromancer depuis balance.ts
 */
const NECROMANCER_CONFIG: ZombieConfig = {
  type: 'necromancer',
  texture: ASSET_KEYS.NECROMANCER,
  maxHealth: BALANCE.zombies.necromancer.health,
  speed: BALANCE.zombies.necromancer.speed,
  damage: BALANCE.zombies.necromancer.damage,
  detectionRange: BALANCE.zombies.necromancer.detectionRange,
  attackRange: BALANCE.zombies.necromancer.attackRange,
  attackCooldown: BALANCE.zombies.necromancer.attackCooldown,
  scoreValue: BALANCE.zombies.necromancer.scoreValue,
};

/** Cooldown entre deux résurrections (ms) */
const RESURRECT_COOLDOWN = 5000;
/** Durée de l'animation de résurrection (ms) */
const RESURRECT_DURATION = 1000;

/**
 * Interface pour les données de cadavre
 */
export interface CorpseData {
  id: string;
  x: number;
  y: number;
  type: string;
  createdAt: number;
}

/**
 * Necromancer - Zombie nécromancien
 *
 * Caractéristiques selon le GDD:
 * - HP moyen (30), vitesse lente (45)
 * - Fuit activement le joueur
 * - Peut ressusciter les zombies morts
 * - Distance de fuite: 250px
 */
export class Necromancer extends Zombie {
  /** Distance à laquelle le Necromancer fuit le joueur */
  private readonly fleeDistance: number = BALANCE.zombies.necromancer.fleeDistance;
  /** Rayon de recherche des cadavres */
  private readonly resurrectRadius: number = BALANCE.zombies.necromancer.resurrectRadius;
  /** Dernière résurrection */
  private lastResurrectTime: number = 0;
  /** Indique si une résurrection est en cours */
  private isResurrecting: boolean = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, NECROMANCER_CONFIG);
    this.onSpawn();
  }

  /**
   * Comportement lors du spawn
   */
  protected onSpawn(): void {
    // Le Necromancer a une teinte violette foncée
    this.setTint(0x8800ff);
  }

  /**
   * Mise à jour du Necromancer avec comportement de fuite
   */
  update(time: number, delta: number): void {
    if (!this.active) return;

    // Ne pas se déplacer pendant la résurrection
    if (this.isResurrecting) return;

    const player = this.scene.getPlayer();
    if (!player || !player.active) {
      super.update(time, delta);
      return;
    }

    const distance = this.movementComponent.distanceTo(player.x, player.y);

    // Comportement basé sur la distance au joueur
    if (distance < this.fleeDistance) {
      // Trop proche - fuir
      this.fleeFromPlayer(player);
    } else if (distance <= this.config.detectionRange) {
      // À distance sûre - chercher des cadavres à ressusciter
      if (time - this.lastResurrectTime >= RESURRECT_COOLDOWN) {
        this.tryResurrect(time);
      } else {
        // Patrouiller doucement
        this.patrol();
      }
    } else {
      // Hors de portée - patrouiller
      this.patrol();
    }

    // Mise à jour du mouvement
    this.movementComponent.update(delta);

    // Rotation vers le joueur (ou direction de fuite)
    const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.setRotation(targetAngle);
  }

  /**
   * Fuit le joueur
   */
  private fleeFromPlayer(player: Phaser.GameObjects.Sprite): void {
    // Calculer la direction opposée au joueur
    const fleeAngle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
    const fleeDistance = this.fleeDistance * 1.5;

    const targetX = this.x + Math.cos(fleeAngle) * fleeDistance;
    const targetY = this.y + Math.sin(fleeAngle) * fleeDistance;

    this.movementComponent.setTarget(targetX, targetY);
  }

  /**
   * Patrouille autour de la position actuelle
   */
  private patrol(): void {
    // Mouvement aléatoire léger
    if (!this.movementComponent.isMoving()) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 50;
      const targetX = this.x + Math.cos(angle) * distance;
      const targetY = this.y + Math.sin(angle) * distance;

      this.movementComponent.setTarget(targetX, targetY);
    }
  }

  /**
   * Tente de ressusciter un cadavre proche
   */
  private tryResurrect(time: number): void {
    // Récupérer les cadavres depuis le gestionnaire de corpses
    const corpseManager = (this.scene as GameScene & { corpseManager?: CorpseManager }).corpseManager;
    if (!corpseManager) return;

    const nearbyCorpses = corpseManager.getCorpsesInRadius(
      this.x,
      this.y,
      this.resurrectRadius
    );

    if (nearbyCorpses.length === 0) return;

    // Prendre le premier cadavre disponible
    const corpse = nearbyCorpses[0];
    this.performResurrection(corpse, time);
  }

  /**
   * Effectue la résurrection d'un cadavre
   */
  private performResurrection(corpse: CorpseData, time: number): void {
    this.isResurrecting = true;
    this.lastResurrectTime = time;

    // Arrêter le mouvement
    this.movementComponent.stop();

    // Animation de canalisation
    this.setTint(0x00ff00);

    // Effet visuel de lien entre le Necromancer et le cadavre
    this.createResurrectionEffect(corpse);

    // Après la durée, ressusciter le zombie
    this.scene.time.delayedCall(RESURRECT_DURATION, () => {
      if (this.active) {
        this.completeResurrection(corpse);
        this.isResurrecting = false;
        this.setTint(0x8800ff);
      }
    });
  }

  /**
   * Crée l'effet visuel de résurrection
   */
  private createResurrectionEffect(corpse: CorpseData): void {
    // Ligne d'énergie vers le cadavre
    const graphics = this.scene.add.graphics();

    // Animation de la ligne
    let progress = 0;

    const updateLine = this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        progress += 0.05;
        graphics.clear();

        if (progress >= 1) {
          graphics.destroy();
          updateLine.destroy();
          return;
        }

        // Dessiner la ligne
        graphics.lineStyle(2, 0x00ff00, 1 - progress * 0.5);
        graphics.beginPath();
        graphics.moveTo(this.x, this.y);

        // Ligne ondulée
        const midX = (this.x + corpse.x) / 2 + Math.sin(Date.now() * 0.01) * 10;
        const midY = (this.y + corpse.y) / 2 + Math.cos(Date.now() * 0.01) * 10;

        graphics.lineTo(midX, midY);
        graphics.lineTo(corpse.x, corpse.y);
        graphics.strokePath();
      },
      repeat: 20,
    });

    // Cercle autour du cadavre
    const circle = this.scene.add.circle(corpse.x, corpse.y, 5, 0x00ff00, 0.5);

    this.scene.tweens.add({
      targets: circle,
      radius: 30,
      alpha: 0,
      duration: RESURRECT_DURATION,
      onComplete: () => {
        circle.destroy();
      },
    });
  }

  /**
   * Termine la résurrection et spawn le zombie
   */
  private completeResurrection(corpse: CorpseData): void {
    // Retirer le cadavre du gestionnaire
    const corpseManager = (this.scene as GameScene & { corpseManager?: CorpseManager }).corpseManager;
    if (corpseManager) {
      corpseManager.removeCorpse(corpse.id);
    }

    // Créer un nouveau zombie à la position du cadavre
    const zombieFactory = this.scene.getZombieFactory();
    if (zombieFactory) {
      // Créer un Shambler ressuscité (plus faible)
      const zombie = zombieFactory.createShambler(corpse.x, corpse.y);
      if (zombie) {
        // Le zombie ressuscité a moins de HP
        zombie.takeDamage(zombie.getHealth() * 0.3);

        // Effet visuel de résurrection
        zombie.setTint(0x00ff00);
        zombie.setAlpha(0);

        this.scene.tweens.add({
          targets: zombie,
          alpha: 1,
          duration: 300,
          onComplete: () => {
            if (zombie.active) {
              zombie.clearTint();
            }
          },
        });
      }
    }

    // Émettre un événement
    this.scene.events.emit('corpse:removed', corpse.id);
  }

  /**
   * Réinitialise le Necromancer pour réutilisation (pooling)
   */
  public reset(x: number, y: number): void {
    super.reset(x, y);
    this.lastResurrectTime = 0;
    this.isResurrecting = false;
    this.setTint(0x8800ff);
  }
}

/**
 * Interface du gestionnaire de cadavres (pour le typage)
 */
interface CorpseManager {
  getCorpsesInRadius(x: number, y: number, radius: number): CorpseData[];
  removeCorpse(id: string): void;
}
