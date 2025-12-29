import Phaser from 'phaser';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import type { Zombie } from '@entities/zombies/Zombie';
import type { BulletPool } from '@entities/projectiles/BulletPool';

/**
 * Système de combat
 * Gère les collisions et les dégâts entre entités
 */
export class CombatSystem {
  private scene: GameScene;
  private player: Player;
  private bulletPool: BulletPool;
  private zombieGroups: Phaser.GameObjects.Group[] = [];

  private score: number = 0;
  private killCount: number = 0;

  constructor(scene: GameScene, player: Player, bulletPool: BulletPool) {
    this.scene = scene;
    this.player = player;
    this.bulletPool = bulletPool;

    // Écouter les événements de mort de zombie
    this.scene.events.on('zombieDeath', this.onZombieDeath, this);
  }

  /**
   * Enregistre un groupe de zombies pour les collisions
   */
  public registerZombieGroup(group: Phaser.GameObjects.Group): void {
    this.zombieGroups.push(group);
    this.setupCollisions(group);
  }

  /**
   * Configure les collisions pour un groupe de zombies
   */
  private setupCollisions(zombieGroup: Phaser.GameObjects.Group): void {
    // Collision bullets → zombies
    this.scene.physics.add.overlap(
      this.bulletPool.getGroup(),
      zombieGroup,
      this.handleBulletZombieCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // Collision zombies → player
    this.scene.physics.add.overlap(
      this.player,
      zombieGroup,
      this.handleZombiePlayerCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  /**
   * Gère la collision entre une balle et un zombie
   */
  private handleBulletZombieCollision(
    obj1: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    obj2: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    // Identifier quel objet est la balle et quel objet est le zombie
    // Phaser peut inverser l'ordre des paramètres
    let bullet: Phaser.Physics.Arcade.Sprite;
    let zombie: Zombie;

    if ('takeDamage' in obj1) {
      zombie = obj1 as unknown as Zombie;
      bullet = obj2 as Phaser.Physics.Arcade.Sprite;
    } else {
      bullet = obj1 as Phaser.Physics.Arcade.Sprite;
      zombie = obj2 as unknown as Zombie;
    }

    if (!bullet.active || !zombie.active) return;

    // Vérifier si c'est une balle perforante qui a déjà touché ce zombie
    const isPiercing = this.bulletPool.isPiercing(bullet);
    const zombieId = (zombie as unknown as Phaser.GameObjects.GameObject)
      .getData('instanceId') || Date.now() + Math.random();

    // Assigner un ID unique au zombie s'il n'en a pas
    if (!(zombie as unknown as Phaser.GameObjects.GameObject).getData('instanceId')) {
      (zombie as unknown as Phaser.GameObjects.GameObject).setData('instanceId', zombieId);
    }

    if (isPiercing && this.bulletPool.hasHitTarget(bullet, zombieId)) {
      return; // Cette balle a déjà touché ce zombie
    }

    // Récupérer les dégâts de la balle
    const damage = this.bulletPool.getDamage(bullet);

    // Infliger les dégâts au zombie
    zombie.takeDamage(damage);

    // Effet d'impact
    this.createImpactEffect(bullet.x, bullet.y);

    // Gérer la balle selon son type
    if (isPiercing) {
      // Balle perforante : marquer le zombie comme touché mais ne pas libérer la balle
      this.bulletPool.markTargetHit(bullet, zombieId);
    } else {
      // Balle normale : libérer la balle
      this.bulletPool.release(bullet);
    }
  }

  /**
   * Gère la collision entre un zombie et le joueur
   * Note: Les dégâts sont gérés par la state machine du zombie
   */
  private handleZombiePlayerCollision(
    _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    _zombieObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    // Les dégâts sont gérés par la ZombieStateMachine
    // Cette collision sert à la détection de proximité
  }

  /**
   * Gère la mort d'un zombie
   */
  private onZombieDeath(zombie: Zombie): void {
    this.killCount++;
    this.score += zombie.getScoreValue();

    // Émettre un événement de mise à jour du score
    this.scene.events.emit('scoreUpdate', this.score, this.killCount);
  }

  /**
   * Crée un effet d'impact
   */
  private createImpactEffect(x: number, y: number): void {
    // Effet de particules simple (flash)
    const flash = this.scene.add.circle(x, y, 8, 0xffff00, 1);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 100,
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  /**
   * Récupère le score actuel
   */
  public getScore(): number {
    return this.score;
  }

  /**
   * Récupère le nombre de kills
   */
  public getKillCount(): number {
    return this.killCount;
  }

  /**
   * Réinitialise les statistiques
   */
  public resetStats(): void {
    this.score = 0;
    this.killCount = 0;
  }

  /**
   * Met à jour le système de combat
   */
  public update(_time: number, _delta: number): void {
    // Mise à jour si nécessaire
  }

  /**
   * Nettoie le système
   */
  public destroy(): void {
    this.scene.events.off('zombieDeath', this.onZombieDeath, this);
    this.zombieGroups = [];
  }
}
