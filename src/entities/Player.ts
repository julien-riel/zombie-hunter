import Phaser from 'phaser';
import { BALANCE } from '@config/balance';
import { ASSET_KEYS } from '@config/assets.manifest';
import { Weapon } from '@weapons/Weapon';
import { MeleeWeapon } from '@weapons/melee/MeleeWeapon';
import { BaseballBat } from '@weapons/melee/BaseballBat';
import { Pistol } from '@weapons/firearms/Pistol';
import type { GameScene } from '@scenes/GameScene';
import { Character, CharacterFactory, AbilityManager } from '@characters/index';
import type { CharacterType } from '@/types/entities';
import type { InputManager } from '@/managers/InputManager';
import type { LoadoutConfig } from '@/types/inventory';
import { WeaponRegistry } from '@/systems/WeaponRegistry';

/** Nombre de slots de mêlée */
const MELEE_SLOTS = 2;

/**
 * Classe du joueur
 * Gère le mouvement, le tir et les capacités
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  public health: number;
  public maxHealth: number;

  // ==================== SYSTÈME D'ARMES (Phase 2 Inventaire) ====================

  /** Slots d'armes de mêlée [slot1, slot2] - touches 1-2 */
  private meleeWeapons: [MeleeWeapon | null, MeleeWeapon | null] = [null, null];
  /** Index de l'arme de mêlée active (0 ou 1) */
  private currentMeleeIndex: 0 | 1 = 0;

  /** Slots d'armes à distance [slot3, slot4] - touches 3-4 */
  private rangedWeapons: [Weapon | null, Weapon | null] = [null, null];
  /** Index de l'arme à distance active (0 ou 1) */
  private currentRangedIndex: 0 | 1 = 0;

  /** Arme à distance actuellement équipée (raccourci vers rangedWeapons[currentRangedIndex]) */
  public currentWeapon: Weapon | null = null;
  /** Arme de mêlée actuellement équipée (raccourci vers meleeWeapons[currentMeleeIndex]) */
  private currentMeleeWeapon: MeleeWeapon | null = null;

  /** Auto-mêlée activée (attaque automatique quand ennemi au contact) */
  private autoMeleeEnabled: boolean = true;
  /** Distance pour déclencher l'auto-mêlée */
  private autoMeleeDistance: number = 40;

  /** Gestionnaire d'entrées abstrait (support mobile) */
  private inputManager: InputManager | null = null;

  // Contrôles clavier legacy (utilisés uniquement si inputManager n'est pas fourni)
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  } | null = null;
  private spaceKey: Phaser.Input.Keyboard.Key | null = null;
  /** Touches pour changer d'arme (1, 2, 3, 4) */
  private weaponKeys: Phaser.Input.Keyboard.Key[] = [];
  /** Touche R pour recharger manuellement */
  private reloadKey: Phaser.Input.Keyboard.Key | null = null;
  /** Touche Q pour utiliser la compétence */
  private abilityKey: Phaser.Input.Keyboard.Key | null = null;

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

  constructor(scene: GameScene, x: number, y: number, characterType?: CharacterType, inputManager?: InputManager) {
    super(scene, x, y, ASSET_KEYS.PLAYER);

    // Stocker l'InputManager s'il est fourni
    this.inputManager = inputManager || null;

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

    // Équiper le loadout par défaut (Batte + Pistol)
    this.equipDefaultLoadout();
  }

  /**
   * Équipe le loadout par défaut (wave 1)
   * Batte de Baseball en slot mêlée 1, Pistol en slot distance 1
   */
  private equipDefaultLoadout(): void {
    const scene = this.scene as GameScene;

    // Slot mêlée 1: Batte de Baseball
    this.meleeWeapons[0] = new BaseballBat(scene, this);
    this.currentMeleeIndex = 0;
    this.currentMeleeWeapon = this.meleeWeapons[0];

    // Slot distance 1: Pistol
    this.rangedWeapons[0] = new Pistol(scene, this);
    this.currentRangedIndex = 0;
    this.currentWeapon = this.rangedWeapons[0];

    // Notifier le HUD
    this.emitLoadoutChanged();
  }

  /**
   * Configure les contrôles du joueur
   */
  private setupInput(): void {
    // Si on utilise l'InputManager, configurer les callbacks pour les actions
    if (this.inputManager) {
      this.setupInputManagerCallbacks();
      return;
    }

    // Mode legacy : contrôles clavier directs
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

    // Molette de souris pour cycler les armes à distance (géré par InputManager sinon)
    this.scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gx: number[], _gy: number[], deltaY: number) => {
      if (deltaY > 0) {
        this.cycleRangedWeapon(1);
      } else if (deltaY < 0) {
        this.cycleRangedWeapon(-1);
      }
    });
  }

  /**
   * Configure les callbacks pour l'InputManager
   */
  private setupInputManagerCallbacks(): void {
    if (!this.inputManager) return;

    // Callbacks pour les changements d'armes
    // Touches 1-2: mêlée, Touches 3-4: distance
    this.inputManager.onActionTriggered('weapon1', () => this.switchMeleeSlot(0));
    this.inputManager.onActionTriggered('weapon2', () => this.switchMeleeSlot(1));
    this.inputManager.onActionTriggered('weapon3', () => this.switchRangedSlot(0));
    this.inputManager.onActionTriggered('weapon4', () => this.switchRangedSlot(1));
    this.inputManager.onActionTriggered('weaponNext', () => this.cycleRangedWeapon(1));
    this.inputManager.onActionTriggered('weaponPrev', () => this.cycleRangedWeapon(-1));
    this.inputManager.onActionTriggered('meleeNext', () => this.cycleMeleeWeapon());

    // Callback pour la mêlée
    this.inputManager.onActionTriggered('melee', () => this.meleeAttack());
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
    this.handleMelee();
    this.checkAutoMelee();
    this.handleWeaponSwitch();
    this.handleReload();
    this.handleAbility();

    // Mise à jour des armes
    this.currentWeapon?.update();
    this.currentMeleeWeapon?.update();
  }

  /**
   * Gère le mouvement du joueur
   */
  private handleMovement(): void {
    if (this.isDashing) return;

    const speed = this.moveSpeed * this.speedMultiplier;

    // Utiliser l'InputManager si disponible
    if (this.inputManager) {
      const movement = this.inputManager.getMovementVector();
      this.setVelocity(movement.x * speed, movement.y * speed);
      return;
    }

    // Mode legacy : contrôles clavier directs
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors && this.wasd) {
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
    }

    this.setVelocity(velocityX, velocityY);
  }

  /**
   * Gère la rotation du joueur vers la souris ou la direction de visée tactile
   */
  private handleRotation(): void {
    // Utiliser l'InputManager si disponible
    if (this.inputManager) {
      const angle = this.inputManager.getAimAngle(this.x, this.y);
      this.setRotation(angle);
      return;
    }

    // Mode legacy : rotation vers la souris
    const pointer = this.scene.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
    this.setRotation(angle);
  }

  /**
   * Gère le dash du joueur
   */
  private handleDash(): void {
    if (!this.canDash || this.isDashing) return;

    // Utiliser l'InputManager si disponible
    if (this.inputManager) {
      if (this.inputManager.isActionJustPressed('dash') || this.inputManager.isActionPressed('dash')) {
        this.performDash();
      }
      return;
    }

    // Mode legacy : touche espace
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.performDash();
    }
  }

  /**
   * Gère le tir du joueur
   */
  private handleShooting(): void {
    // Utiliser l'InputManager si disponible
    if (this.inputManager) {
      if (this.inputManager.isShooting()) {
        this.shoot();
      }
      return;
    }

    // Mode legacy : clic souris
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

    // Direction du dash basée sur le mouvement actuel ou la direction de visée
    let dashX = 0;
    let dashY = 0;

    // Utiliser l'InputManager si disponible
    if (this.inputManager) {
      const movement = this.inputManager.getMovementVector();
      dashX = movement.x;
      dashY = movement.y;

      // Si pas de direction de mouvement, dash vers la direction de visée
      if (dashX === 0 && dashY === 0) {
        const aimDir = this.inputManager.getAimDirection(this.x, this.y);
        dashX = aimDir.x;
        dashY = aimDir.y;
      }
    } else if (this.cursors && this.wasd) {
      // Mode legacy : contrôles clavier directs
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

    let direction: Phaser.Math.Vector2;

    // Utiliser l'InputManager si disponible
    if (this.inputManager) {
      const aimDir = this.inputManager.getAimDirection(this.x, this.y);
      direction = new Phaser.Math.Vector2(aimDir.x, aimDir.y);
    } else {
      // Mode legacy : direction vers la souris
      const pointer = this.scene.input.activePointer;
      direction = new Phaser.Math.Vector2(
        pointer.worldX - this.x,
        pointer.worldY - this.y
      ).normalize();
    }

    this.currentWeapon.fire(direction);
  }

  /**
   * Gère l'attaque de mêlée via touche V
   */
  private handleMelee(): void {
    // Utiliser l'InputManager si disponible
    if (this.inputManager) {
      if (this.inputManager.isActionJustPressed('melee') || this.inputManager.isActionPressed('melee')) {
        this.meleeAttack();
      }
      return;
    }

    // Mode legacy : géré dans setupInput via callback
  }

  /**
   * Vérifie et exécute l'auto-mêlée quand un zombie est au contact
   * Ne s'active que si le joueur tire et un ennemi est très proche
   */
  private checkAutoMelee(): void {
    if (!this.autoMeleeEnabled || !this.currentMeleeWeapon) return;

    // Vérifier si le joueur est en train de tirer
    const isShooting = this.inputManager
      ? this.inputManager.isShooting()
      : this.scene.input.activePointer.isDown;

    if (!isShooting) return;

    // Vérifier si un zombie est au contact
    const zombies = (this.scene as GameScene).getActiveZombies();
    for (const zombie of zombies) {
      if (!zombie.active) continue;

      const distance = Phaser.Math.Distance.Between(this.x, this.y, zombie.x, zombie.y);
      if (distance <= this.autoMeleeDistance) {
        // Zombie au contact, déclencher l'auto-mêlée
        this.meleeAttack();
        break;
      }
    }
  }

  /**
   * Effectue une attaque de mêlée
   */
  public meleeAttack(): void {
    if (!this.currentMeleeWeapon) return;

    let direction: Phaser.Math.Vector2;

    // Utiliser l'InputManager si disponible
    if (this.inputManager) {
      const aimDir = this.inputManager.getAimDirection(this.x, this.y);
      direction = new Phaser.Math.Vector2(aimDir.x, aimDir.y);
    } else {
      // Mode legacy : direction vers la souris
      const pointer = this.scene.input.activePointer;
      direction = new Phaser.Math.Vector2(
        pointer.worldX - this.x,
        pointer.worldY - this.y
      ).normalize();
    }

    this.currentMeleeWeapon.swing(direction);
  }

  /**
   * Gère le changement d'arme via les touches 1-4
   * Touches 1-2: armes de mêlée
   * Touches 3-4: armes à distance
   */
  private handleWeaponSwitch(): void {
    // Si InputManager, vérifier les touches
    if (this.inputManager) {
      // Touches 1-2 pour la mêlée
      if (this.inputManager.isActionJustPressed('weapon1')) this.switchMeleeSlot(0);
      else if (this.inputManager.isActionJustPressed('weapon2')) this.switchMeleeSlot(1);
      // Touches 3-4 pour les armes à distance
      else if (this.inputManager.isActionJustPressed('weapon3')) this.switchRangedSlot(0);
      else if (this.inputManager.isActionJustPressed('weapon4')) this.switchRangedSlot(1);
      return;
    }

    // Mode legacy : touches 1-4
    for (let i = 0; i < this.weaponKeys.length; i++) {
      if (this.weaponKeys[i] && Phaser.Input.Keyboard.JustDown(this.weaponKeys[i])) {
        if (i < MELEE_SLOTS) {
          this.switchMeleeSlot(i as 0 | 1);
        } else {
          this.switchRangedSlot((i - MELEE_SLOTS) as 0 | 1);
        }
        break;
      }
    }
  }

  /**
   * Gère le rechargement manuel via touche R
   */
  private handleReload(): void {
    // Utiliser l'InputManager si disponible
    if (this.inputManager) {
      if (this.inputManager.isActionJustPressed('reload') || this.inputManager.isActionPressed('reload')) {
        this.currentWeapon?.reload();
      }
      return;
    }

    // Mode legacy : touche R
    if (this.reloadKey && Phaser.Input.Keyboard.JustDown(this.reloadKey)) {
      this.currentWeapon?.reload();
    }
  }

  /**
   * Gère l'utilisation de la compétence via touche Q
   */
  private handleAbility(): void {
    // Utiliser l'InputManager si disponible
    if (this.inputManager) {
      if (this.inputManager.isActionJustPressed('ability') || this.inputManager.isActionPressed('ability')) {
        this.useAbility();
      }
      return;
    }

    // Mode legacy : touche Q
    if (this.abilityKey && Phaser.Input.Keyboard.JustDown(this.abilityKey)) {
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

  // ==================== SYSTÈME D'ARMES 2+2 (Phase 2 Inventaire) ====================

  /**
   * Équipe un loadout complet (appelé avant chaque wave)
   * Détruit les anciennes armes et crée les nouvelles depuis le WeaponRegistry
   */
  public equipLoadout(loadout: LoadoutConfig): void {
    const scene = this.scene as GameScene;

    // Détruire les anciennes armes de mêlée
    for (const weapon of this.meleeWeapons) {
      if (weapon) weapon.destroy();
    }

    // Détruire les anciennes armes à distance
    for (const weapon of this.rangedWeapons) {
      if (weapon) weapon.destroy();
    }

    // Créer les nouvelles armes de mêlée
    this.meleeWeapons = [
      loadout.meleeSlots[0] ? WeaponRegistry.createWeapon(loadout.meleeSlots[0], scene, this) : null,
      loadout.meleeSlots[1] ? WeaponRegistry.createWeapon(loadout.meleeSlots[1], scene, this) : null,
    ];

    // Créer les nouvelles armes à distance
    this.rangedWeapons = [
      loadout.rangedSlots[0] ? WeaponRegistry.createWeapon(loadout.rangedSlots[0], scene, this) : null,
      loadout.rangedSlots[1] ? WeaponRegistry.createWeapon(loadout.rangedSlots[1], scene, this) : null,
    ];

    // Sélectionner la première arme disponible dans chaque catégorie
    this.currentMeleeIndex = this.meleeWeapons[0] ? 0 : 1;
    this.currentMeleeWeapon = this.meleeWeapons[this.currentMeleeIndex];

    this.currentRangedIndex = this.rangedWeapons[0] ? 0 : 1;
    this.currentWeapon = this.rangedWeapons[this.currentRangedIndex];

    // Notifier le HUD
    this.emitLoadoutChanged();
  }

  /**
   * Émet les événements de changement de loadout pour le HUD
   */
  private emitLoadoutChanged(): void {
    const scene = this.scene as GameScene;
    scene.events.emit('loadoutChanged', {
      meleeWeapons: this.meleeWeapons,
      rangedWeapons: this.rangedWeapons,
      currentMeleeIndex: this.currentMeleeIndex,
      currentRangedIndex: this.currentRangedIndex,
    });
  }

  /**
   * Change de slot d'arme de mêlée (touches 1-2)
   */
  public switchMeleeSlot(index: 0 | 1): void {
    const weapon = this.meleeWeapons[index];
    if (!weapon) return; // Slot vide
    if (index === this.currentMeleeIndex) return; // Déjà sélectionné

    this.currentMeleeIndex = index;
    this.currentMeleeWeapon = weapon;

    // Émettre un événement pour le HUD
    (this.scene as GameScene).events.emit('meleeSlotChanged', index, this.currentMeleeWeapon);
  }

  /**
   * Change de slot d'arme à distance (touches 3-4)
   */
  public switchRangedSlot(index: 0 | 1): void {
    const weapon = this.rangedWeapons[index];
    if (!weapon) return; // Slot vide
    if (index === this.currentRangedIndex) return; // Déjà sélectionné

    this.currentRangedIndex = index;
    this.currentWeapon = weapon;

    // Émettre un événement pour le HUD
    (this.scene as GameScene).events.emit('rangedSlotChanged', index, this.currentWeapon);
  }

  /**
   * Cycle entre les armes à distance (molette de souris)
   * @param _direction 1 pour suivant, -1 pour précédent (non utilisé car seulement 2 slots)
   */
  public cycleRangedWeapon(_direction: 1 | -1): void {
    const otherIndex = this.currentRangedIndex === 0 ? 1 : 0;
    if (this.rangedWeapons[otherIndex]) {
      this.switchRangedSlot(otherIndex as 0 | 1);
    }
  }

  /**
   * Cycle entre les armes de mêlée (pour contrôles tactiles)
   */
  public cycleMeleeWeapon(): void {
    const otherIndex = this.currentMeleeIndex === 0 ? 1 : 0;
    if (this.meleeWeapons[otherIndex]) {
      this.switchMeleeSlot(otherIndex as 0 | 1);
    }
  }

  /**
   * Récupère les armes de mêlée
   */
  public getMeleeWeapons(): [MeleeWeapon | null, MeleeWeapon | null] {
    return [...this.meleeWeapons] as [MeleeWeapon | null, MeleeWeapon | null];
  }

  /**
   * Récupère les armes à distance
   */
  public getRangedWeapons(): [Weapon | null, Weapon | null] {
    return [...this.rangedWeapons] as [Weapon | null, Weapon | null];
  }

  /**
   * Récupère l'arme de mêlée actuelle
   */
  public getMeleeWeapon(): MeleeWeapon | null {
    return this.currentMeleeWeapon;
  }

  /**
   * Récupère l'index du slot mêlée actif
   */
  public getCurrentMeleeIndex(): 0 | 1 {
    return this.currentMeleeIndex;
  }

  /**
   * Récupère l'index du slot distance actif
   */
  public getCurrentRangedIndex(): 0 | 1 {
    return this.currentRangedIndex;
  }

  /**
   * Équipe directement une arme de mêlée dans un slot
   * Utilisé pour le debug et les drops
   */
  public equipMeleeInSlot(weapon: MeleeWeapon, slotIndex: 0 | 1 = this.currentMeleeIndex): void {
    // Détruire l'ancienne arme si elle existe
    if (this.meleeWeapons[slotIndex]) {
      this.meleeWeapons[slotIndex]!.destroy();
    }

    this.meleeWeapons[slotIndex] = weapon;

    // Mettre à jour l'arme courante si c'est le slot actif
    if (slotIndex === this.currentMeleeIndex) {
      this.currentMeleeWeapon = weapon;
    }

    // Émettre un événement pour le HUD
    (this.scene as GameScene).events.emit('meleeSlotEquipped', slotIndex, weapon);
  }

  /**
   * Équipe directement une arme à distance dans un slot
   * Utilisé pour le debug et les drops
   */
  public equipRangedInSlot(weapon: Weapon, slotIndex: 0 | 1 = this.currentRangedIndex): void {
    // Détruire l'ancienne arme si elle existe
    if (this.rangedWeapons[slotIndex]) {
      this.rangedWeapons[slotIndex]!.destroy();
    }

    this.rangedWeapons[slotIndex] = weapon;

    // Mettre à jour l'arme courante si c'est le slot actif
    if (slotIndex === this.currentRangedIndex) {
      this.currentWeapon = weapon;
    }

    // Émettre un événement pour le HUD
    (this.scene as GameScene).events.emit('rangedSlotEquipped', slotIndex, weapon);
  }

  // ==================== COMPATIBILITÉ LEGACY ====================

  /**
   * @deprecated Utiliser getRangedWeapons() à la place
   */
  public getWeapons(): Weapon[] {
    return this.rangedWeapons.filter((w): w is Weapon => w !== null);
  }

  /**
   * @deprecated Utiliser getCurrentRangedIndex() à la place
   */
  public getCurrentWeaponIndex(): number {
    return this.currentRangedIndex;
  }

  /**
   * @deprecated Utiliser equipMeleeInSlot() à la place
   */
  public equipMeleeWeapon(weapon: MeleeWeapon): void {
    this.equipMeleeInSlot(weapon, this.currentMeleeIndex);
  }

  /**
   * Active/désactive l'auto-mêlée
   */
  public setAutoMelee(enabled: boolean): void {
    this.autoMeleeEnabled = enabled;
  }

  /**
   * Vérifie si l'auto-mêlée est activée
   */
  public isAutoMeleeEnabled(): boolean {
    return this.autoMeleeEnabled;
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
    // Détruire les armes de mêlée
    for (const weapon of this.meleeWeapons) {
      if (weapon) weapon.destroy();
    }
    this.meleeWeapons = [null, null];
    this.currentMeleeWeapon = null;
    this.currentMeleeIndex = 0;

    // Détruire les armes à distance
    for (const weapon of this.rangedWeapons) {
      if (weapon) weapon.destroy();
    }
    this.rangedWeapons = [null, null];
    this.currentWeapon = null;
    this.currentRangedIndex = 0;

    // Émettre un événement pour le HUD
    this.emitLoadoutChanged();
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

  // ==================== MÉTHODES INPUT MANAGER (Phase 3 Mobile) ====================

  /**
   * Définit l'InputManager pour les contrôles
   * Permet l'injection après la création du Player
   */
  public setInputManager(inputManager: InputManager): void {
    this.inputManager = inputManager;
    this.setupInputManagerCallbacks();
  }

  /**
   * Récupère l'InputManager actuel
   */
  public getInputManager(): InputManager | null {
    return this.inputManager;
  }

  /**
   * Vérifie si le Player utilise l'InputManager
   */
  public hasInputManager(): boolean {
    return this.inputManager !== null;
  }
}
