import Phaser from 'phaser';
import { BALANCE } from '@config/balance';
import { ASSET_KEYS } from '@config/assets.manifest';
import { Weapon } from '@weapons/Weapon';
import { Pistol } from '@weapons/firearms/Pistol';
import { Shotgun } from '@weapons/firearms/Shotgun';
import { SMG } from '@weapons/firearms/SMG';
import { SniperRifle } from '@weapons/firearms/SniperRifle';
import type { GameScene } from '@scenes/GameScene';
import { Character, CharacterFactory, AbilityManager } from '@characters/index';
import type { CharacterType } from '@/types/entities';

/** Nombre maximum d'armes que le joueur peut porter */
const MAX_WEAPONS = 4;

/**
 * Classe du joueur
 * Gère le mouvement, le tir et les capacités
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  public health: number;
  public maxHealth: number;
  public currentWeapon: Weapon | null = null;

  /** Inventaire des armes */
  private weapons: Weapon[] = [];
  /** Index de l'arme actuellement équipée */
  private currentWeaponIndex: number = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  /** Touches pour changer d'arme (1, 2, 3, 4) */
  private weaponKeys!: Phaser.Input.Keyboard.Key[];
  /** Touche R pour recharger manuellement */
  private reloadKey!: Phaser.Input.Keyboard.Key;
  /** Touche Q pour utiliser la compétence */
  private abilityKey!: Phaser.Input.Keyboard.Key;

  private isDashing: boolean = false;
  private canDash: boolean = true;
  private dashDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  /** Indique si le joueur est étourdi (stun) */
  private isStunned: boolean = false;

  /** Mode God (invincibilité + ammo infini) pour le debug */
  private godMode: boolean = false;

  /** Personnage actuel */
  private character: Character;
  /** Gestionnaire de compétence */
  private abilityManager: AbilityManager;
  /** Vitesse de déplacement (peut être modifiée temporairement) */
  private moveSpeed: number;
  /** Multiplicateur de vitesse (pour les effets temporaires) */
  public speedMultiplier: number = 1.0;

  constructor(scene: GameScene, x: number, y: number, characterType?: CharacterType) {
    super(scene, x, y, ASSET_KEYS.PLAYER);

    // Initialiser le personnage
    this.character = characterType
      ? CharacterFactory.getCharacter(characterType)
      : CharacterFactory.getDefaultCharacter();

    // Appliquer les stats du personnage
    this.maxHealth = this.character.stats.maxHealth;
    this.health = this.maxHealth;
    this.moveSpeed = this.character.stats.moveSpeed;

    // Initialiser le gestionnaire de compétence
    this.abilityManager = new AbilityManager(this);
    this.abilityManager.setAbility(this.character.ability);

    // Ajouter au jeu et à la physique
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configuration du corps physique
    this.setCollideWorldBounds(true);
    this.setDrag(1000);

    // Configuration de l'input
    this.setupInput();

    // Ajouter les armes de départ
    this.addWeapon(new Pistol(scene, this));
    this.addWeapon(new Shotgun(scene, this));
    this.addWeapon(new SMG(scene, this));
    this.addWeapon(new SniperRifle(scene, this));
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
    this.reloadKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.abilityKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    // Touches 1-4 pour changer d'arme
    this.weaponKeys = [
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
    ];

    // Molette de souris pour cycler les armes
    this.scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gx: number[], _gy: number[], deltaY: number) => {
      if (deltaY > 0) {
        this.cycleWeapon(1);
      } else if (deltaY < 0) {
        this.cycleWeapon(-1);
      }
    });
  }

  /**
   * Met à jour le joueur à chaque frame
   */
  update(_time: number, delta: number): void {
    if (!this.active) return;

    // Mettre à jour le gestionnaire de compétence
    this.abilityManager.update(delta);

    // Si étourdi, arrêter le mouvement et ignorer les inputs
    if (this.isStunned) {
      this.setVelocity(0, 0);
      return;
    }

    this.handleMovement();
    this.handleRotation();
    this.handleDash();
    this.handleShooting();
    this.handleWeaponSwitch();
    this.handleReload();
    this.handleAbility();

    // Mise à jour de l'arme
    this.currentWeapon?.update();
  }

  /**
   * Gère le mouvement du joueur
   */
  private handleMovement(): void {
    if (this.isDashing) return;

    const speed = this.moveSpeed * this.speedMultiplier;
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

    // Émettre l'événement pour la télémétrie
    (this.scene as GameScene).events.emit('playerDash');

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
      this.dashDirection.x * BALANCE.player.dashSpeed,
      this.dashDirection.y * BALANCE.player.dashSpeed
    );

    // Effet visuel de dash
    this.setAlpha(0.7);

    // Fin du dash
    this.scene.time.delayedCall(BALANCE.player.dashDuration, () => {
      this.isDashing = false;
      this.setAlpha(1);
    });

    // Cooldown du dash
    this.scene.time.delayedCall(BALANCE.player.dashCooldown, () => {
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
   * Gère le changement d'arme via les touches 1-4
   */
  private handleWeaponSwitch(): void {
    for (let i = 0; i < this.weaponKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.weaponKeys[i])) {
        this.switchWeapon(i);
        break;
      }
    }
  }

  /**
   * Gère le rechargement manuel via touche R
   */
  private handleReload(): void {
    if (Phaser.Input.Keyboard.JustDown(this.reloadKey)) {
      this.currentWeapon?.reload();
    }
  }

  /**
   * Gère l'utilisation de la compétence via touche Q
   */
  private handleAbility(): void {
    if (Phaser.Input.Keyboard.JustDown(this.abilityKey)) {
      this.useAbility();
    }
  }

  /**
   * Utilise la compétence du personnage
   * @returns true si la compétence a été activée
   */
  public useAbility(): boolean {
    return this.abilityManager.useAbility();
  }

  /**
   * Ajoute une arme à l'inventaire
   * @returns true si l'arme a été ajoutée, false si l'inventaire est plein
   */
  public addWeapon(weapon: Weapon): boolean {
    if (this.weapons.length >= MAX_WEAPONS) {
      return false;
    }

    this.weapons.push(weapon);

    // Si c'est la première arme, l'équiper automatiquement
    if (this.weapons.length === 1) {
      this.currentWeapon = weapon;
      this.currentWeaponIndex = 0;
    }

    // Émettre un événement pour le HUD
    (this.scene as GameScene).events.emit('weaponInventoryChanged', this.weapons, this.currentWeaponIndex);

    return true;
  }

  /**
   * Change d'arme par index
   */
  public switchWeapon(index: number): void {
    if (index < 0 || index >= this.weapons.length) return;
    if (index === this.currentWeaponIndex) return;

    this.currentWeaponIndex = index;
    this.currentWeapon = this.weapons[index];

    // Émettre un événement pour le HUD
    (this.scene as GameScene).events.emit('weaponChanged', this.currentWeaponIndex, this.currentWeapon);
  }

  /**
   * Cycle entre les armes (molette de souris)
   * @param direction 1 pour suivant, -1 pour précédent
   */
  public cycleWeapon(direction: 1 | -1): void {
    if (this.weapons.length <= 1) return;

    let newIndex = this.currentWeaponIndex + direction;

    // Wrap around
    if (newIndex < 0) {
      newIndex = this.weapons.length - 1;
    } else if (newIndex >= this.weapons.length) {
      newIndex = 0;
    }

    this.switchWeapon(newIndex);
  }

  /**
   * Récupère l'inventaire des armes
   */
  public getWeapons(): Weapon[] {
    return this.weapons;
  }

  /**
   * Récupère l'index de l'arme actuelle
   */
  public getCurrentWeaponIndex(): number {
    return this.currentWeaponIndex;
  }

  /**
   * Équipe une arme (ancienne méthode pour compatibilité)
   * @deprecated Utiliser addWeapon() et switchWeapon() à la place
   */
  public equipWeapon(weapon: Weapon): void {
    this.currentWeapon = weapon;
  }

  /**
   * Inflige des dégâts au joueur
   * @param amount Quantité de dégâts
   * @param source Type de source des dégâts (optionnel)
   * @param distance Distance de la source (optionnel)
   */
  public takeDamage(amount: number, source: string = 'unknown', distance: number = 0): void {
    // Ignorer les dégâts en mode God
    if (this.godMode) return;

    this.health = Math.max(0, this.health - amount);

    // Émettre l'événement pour la télémétrie
    (this.scene as GameScene).events.emit('playerHit', { damage: amount, source, distance });

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

    // Émettre l'événement de mort pour la télémétrie et le game over
    (this.scene as GameScene).events.emit('playerDeath');
  }

  /**
   * Applique un effet de stun au joueur
   * Désactive les inputs pendant la durée spécifiée
   * @param duration Durée du stun en millisecondes
   */
  public applyStun(duration: number): void {
    if (this.isStunned) return;

    this.isStunned = true;

    // Arrêter le mouvement immédiatement
    this.setVelocity(0, 0);

    // Effet visuel de stun (teinte jaune/or)
    this.setTint(0xffcc00);

    // Fin du stun après la durée
    this.scene.time.delayedCall(duration, () => {
      this.isStunned = false;
      this.clearTint();
    });
  }

  /**
   * Applique un knockback au joueur
   * Repousse le joueur dans une direction donnée
   * @param sourceX Position X de la source du knockback
   * @param sourceY Position Y de la source du knockback
   * @param force Force du knockback
   */
  public applyKnockback(sourceX: number, sourceY: number, force: number): void {
    // Calculer la direction opposée à la source
    const direction = new Phaser.Math.Vector2(
      this.x - sourceX,
      this.y - sourceY
    ).normalize();

    // Appliquer la vélocité
    this.setVelocity(direction.x * force, direction.y * force);

    // Effet visuel
    this.setTint(0xff6600);
    this.scene.time.delayedCall(150, () => {
      if (this.active && !this.isStunned) {
        this.clearTint();
      }
    });
  }

  /**
   * Vérifie si le joueur est actuellement étourdi
   */
  public getIsStunned(): boolean {
    return this.isStunned;
  }

  /**
   * Récupère la santé actuelle du joueur
   */
  public getHealth(): number {
    return this.health;
  }

  /**
   * Récupère la santé maximale du joueur
   */
  public getMaxHealth(): number {
    return this.maxHealth;
  }

  /**
   * Active ou désactive le mode God (debug)
   * En mode God: invincibilité et munitions infinies
   */
  public setGodMode(enabled: boolean): void {
    this.godMode = enabled;
    if (enabled) {
      // Soigner complètement
      this.health = this.maxHealth;
    }
  }

  /**
   * Vérifie si le mode God est actif
   */
  public isGodMode(): boolean {
    return this.godMode;
  }

  /**
   * Retire toutes les armes de l'inventaire (debug)
   */
  public clearWeapons(): void {
    this.weapons = [];
    this.currentWeapon = null;
    this.currentWeaponIndex = 0;

    // Émettre un événement pour le HUD
    (this.scene as GameScene).events.emit('weaponInventoryChanged', this.weapons, this.currentWeaponIndex);
  }

  // ==================== MÉTHODES PERSONNAGE (Phase 7.1) ====================

  /**
   * Récupère le personnage actuel
   */
  public getCharacter(): Character {
    return this.character;
  }

  /**
   * Récupère le type du personnage actuel
   */
  public getCharacterType(): CharacterType {
    return this.character.id;
  }

  /**
   * Récupère le gestionnaire de compétence
   */
  public getAbilityManager(): AbilityManager {
    return this.abilityManager;
  }

  /**
   * Vérifie si la compétence est prête
   */
  public isAbilityReady(): boolean {
    return this.abilityManager.canUseAbility();
  }

  /**
   * Récupère le ratio de cooldown de la compétence (0-1)
   */
  public getAbilityCooldownRatio(): number {
    return this.abilityManager.getCooldownRatio();
  }

  /**
   * Récupère le multiplicateur de dégâts du personnage
   */
  public getDamageMultiplier(): number {
    return this.character.stats.damageMultiplier;
  }

  /**
   * Récupère le bonus de précision du personnage
   */
  public getAccuracyBonus(): number {
    return this.character.stats.accuracyBonus;
  }

  /**
   * Récupère la chance de critique du personnage
   */
  public getCritChance(): number {
    return this.character.stats.critChance;
  }

  /**
   * Récupère le rayon de collecte du personnage
   */
  public getPickupRadius(): number {
    return this.character.stats.pickupRadius;
  }

  /**
   * Récupère la résistance au feu du personnage (0-1)
   */
  public getFireResistance(): number {
    return this.character.stats.fireResistance;
  }

  /**
   * Récupère la résistance au poison du personnage (0-1)
   */
  public getPoisonResistance(): number {
    return this.character.stats.poisonResistance;
  }

  /**
   * Change le personnage (debug uniquement)
   * @param characterType Type du nouveau personnage
   */
  public setCharacter(characterType: CharacterType): void {
    // Désactiver la compétence actuelle si active
    this.abilityManager.forceDeactivate();

    // Charger le nouveau personnage
    this.character = CharacterFactory.getCharacter(characterType);

    // Appliquer les nouvelles stats
    this.maxHealth = this.character.stats.maxHealth;
    this.health = Math.min(this.health, this.maxHealth);
    this.moveSpeed = this.character.stats.moveSpeed;

    // Configurer la nouvelle compétence
    this.abilityManager.setAbility(this.character.ability);

    // Émettre un événement pour le HUD
    (this.scene as GameScene).events.emit('characterChanged', this.character);
  }

  /**
   * Reset le cooldown de la compétence (debug)
   */
  public resetAbilityCooldown(): void {
    this.abilityManager.resetCooldown();
  }
}
