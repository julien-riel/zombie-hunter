import Phaser from 'phaser';
import {
  PLAYER_SPEED,
  PLAYER_DASH_SPEED,
  PLAYER_DASH_DURATION,
  PLAYER_DASH_COOLDOWN,
  PLAYER_MAX_HEALTH,
} from '@config/constants';
import { ASSET_KEYS } from '@config/assets.manifest';
import { Weapon } from '@weapons/Weapon';
import { Pistol } from '@weapons/firearms/Pistol';
import type { GameScene } from '@scenes/GameScene';

/**
 * Classe du joueur
 * Gère le mouvement, le tir et les capacités
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  public health: number;
  public maxHealth: number;
  public currentWeapon: Weapon | null = null;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private spaceKey!: Phaser.Input.Keyboard.Key;

  private isDashing: boolean = false;
  private canDash: boolean = true;
  private dashDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, ASSET_KEYS.PLAYER);
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.health = this.maxHealth;

    // Ajouter au jeu et à la physique
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configuration du corps physique
    this.setCollideWorldBounds(true);
    this.setDrag(1000);

    // Configuration de l'input
    this.setupInput();

    // Équiper l'arme de départ
    this.equipWeapon(new Pistol(scene, this));
  }

  /**
   * Configure les contrôles du joueur
   */
  private setupInput(): void {
    if (!this.scene.input.keyboard) return;

    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasd = {
      W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  /**
   * Met à jour le joueur à chaque frame
   */
  update(_time: number, _delta: number): void {
    if (!this.active) return;

    this.handleMovement();
    this.handleRotation();
    this.handleDash();
    this.handleShooting();

    // Mise à jour de l'arme
    this.currentWeapon?.update();
  }

  /**
   * Gère le mouvement du joueur
   */
  private handleMovement(): void {
    if (this.isDashing) return;

    const speed = PLAYER_SPEED;
    let velocityX = 0;
    let velocityY = 0;

    // Mouvement horizontal
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocityX = -speed;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocityX = speed;
    }

    // Mouvement vertical
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocityY = -speed;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocityY = speed;
    }

    // Normaliser pour le mouvement diagonal
    if (velocityX !== 0 && velocityY !== 0) {
      const factor = Math.SQRT1_2; // 1/sqrt(2)
      velocityX *= factor;
      velocityY *= factor;
    }

    this.setVelocity(velocityX, velocityY);
  }

  /**
   * Gère la rotation du joueur vers la souris
   */
  private handleRotation(): void {
    const pointer = this.scene.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
    this.setRotation(angle);
  }

  /**
   * Gère le dash du joueur
   */
  private handleDash(): void {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.canDash && !this.isDashing) {
      this.performDash();
    }
  }

  /**
   * Gère le tir du joueur
   */
  private handleShooting(): void {
    const pointer = this.scene.input.activePointer;
    if (pointer.isDown && pointer.leftButtonDown()) {
      this.shoot();
    }
  }

  /**
   * Effectue un dash
   */
  private performDash(): void {
    this.isDashing = true;
    this.canDash = false;

    // Direction du dash basée sur le mouvement actuel ou la direction de la souris
    let dashX = 0;
    let dashY = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) dashX = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dashX = 1;

    if (this.cursors.up.isDown || this.wasd.W.isDown) dashY = -1;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) dashY = 1;

    // Si pas de direction, dash vers la souris
    if (dashX === 0 && dashY === 0) {
      const pointer = this.scene.input.activePointer;
      const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
      dashX = Math.cos(angle);
      dashY = Math.sin(angle);
    }

    // Normaliser
    this.dashDirection.set(dashX, dashY).normalize();

    // Appliquer la vitesse de dash
    this.setVelocity(
      this.dashDirection.x * PLAYER_DASH_SPEED,
      this.dashDirection.y * PLAYER_DASH_SPEED
    );

    // Effet visuel de dash
    this.setAlpha(0.7);

    // Fin du dash
    this.scene.time.delayedCall(PLAYER_DASH_DURATION, () => {
      this.isDashing = false;
      this.setAlpha(1);
    });

    // Cooldown du dash
    this.scene.time.delayedCall(PLAYER_DASH_COOLDOWN, () => {
      this.canDash = true;
    });
  }

  /**
   * Tire avec l'arme actuelle
   */
  public shoot(): void {
    if (!this.currentWeapon) return;

    const pointer = this.scene.input.activePointer;
    const direction = new Phaser.Math.Vector2(
      pointer.worldX - this.x,
      pointer.worldY - this.y
    ).normalize();

    this.currentWeapon.fire(direction);
  }

  /**
   * Équipe une arme
   */
  public equipWeapon(weapon: Weapon): void {
    this.currentWeapon = weapon;
  }

  /**
   * Inflige des dégâts au joueur
   */
  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);

    // Flash de dégâts
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.clearTint();
    });

    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * Soigne le joueur
   */
  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
   * Mort du joueur
   */
  private die(): void {
    this.setActive(false);
    this.setVisible(false);
    // TODO: Déclencher l'écran de game over
  }
}
