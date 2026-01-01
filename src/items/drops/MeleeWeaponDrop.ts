import Phaser from 'phaser';
import { BALANCE } from '@config/balance';
import type { GameScene } from '@scenes/GameScene';
import type { Player } from '@entities/Player';
import { MeleeWeapon } from '@weapons/melee/MeleeWeapon';
import { BaseballBat } from '@weapons/melee/BaseballBat';
import { Machete } from '@weapons/melee/Machete';
import { Chainsaw } from '@weapons/melee/Chainsaw';
import { FireAxe } from '@weapons/melee/FireAxe';
import { Katana } from '@weapons/melee/Katana';
import { Sledgehammer } from '@weapons/melee/Sledgehammer';

/**
 * Type d'arme de mêlée
 */
export type MeleeWeaponType = 'baseballBat' | 'machete' | 'chainsaw' | 'fireAxe' | 'katana' | 'sledgehammer';

/**
 * Info sur une arme de mêlée pour l'affichage
 */
export interface MeleeWeaponInfo {
  type: MeleeWeaponType;
  name: string;
  damage: number;
  swingSpeed: number;
  range: number;
  knockback: number;
  tier: number;
  special?: string;
}

/**
 * Map des factories d'armes de mêlée
 */
const MELEE_WEAPON_FACTORIES: Record<MeleeWeaponType, (scene: GameScene, player: Player) => MeleeWeapon | Chainsaw> = {
  baseballBat: (scene, player) => new BaseballBat(scene, player),
  machete: (scene, player) => new Machete(scene, player),
  chainsaw: (scene, player) => new Chainsaw(scene, player),
  fireAxe: (scene, player) => new FireAxe(scene, player),
  katana: (scene, player) => new Katana(scene, player),
  sledgehammer: (scene, player) => new Sledgehammer(scene, player),
};

/**
 * Récupère les infos d'une arme de mêlée
 */
export function getMeleeWeaponInfo(type: MeleeWeaponType): MeleeWeaponInfo {
  const stats = BALANCE.weapons[type] as {
    damage: number;
    swingSpeed?: number;
    tickRate?: number;
    range: number;
    knockback: number;
    tier: number;
    stunChance?: number;
    critChance?: number;
    stunDuration?: number;
    maxFuel?: number;
  };

  const names: Record<MeleeWeaponType, string> = {
    baseballBat: 'Batte',
    machete: 'Machette',
    chainsaw: 'Tronçonneuse',
    fireAxe: 'Hache',
    katana: 'Katana',
    sledgehammer: 'Marteau',
  };

  const specials: Record<MeleeWeaponType, string> = {
    baseballBat: 'Chance de stun',
    machete: 'Très rapide',
    chainsaw: 'DPS continu',
    fireAxe: 'Coup critique',
    katana: 'Crit fréquent',
    sledgehammer: 'Stun garanti',
  };

  return {
    type,
    name: names[type],
    damage: stats.damage,
    swingSpeed: stats.swingSpeed ?? stats.tickRate ?? 0,
    range: stats.range,
    knockback: stats.knockback,
    tier: stats.tier,
    special: specials[type],
  };
}

/**
 * Drop d'une arme de mêlée
 *
 * Quand le joueur s'en approche, affiche une UI de comparaison
 * permettant de choisir entre garder l'arme actuelle ou prendre la nouvelle.
 */
export class MeleeWeaponDrop extends Phaser.Physics.Arcade.Sprite {
  private gameScene: GameScene;
  private weaponType: MeleeWeaponType;
  private weaponInfo: MeleeWeaponInfo;
  private dropConfig: typeof BALANCE.drops;

  private lifetimeTimer: Phaser.Time.TimerEvent | null = null;
  private blinkTimer: Phaser.Time.TimerEvent | null = null;
  private blinkTween: Phaser.Tweens.Tween | null = null;

  /** Label flottant au-dessus du drop */
  private label: Phaser.GameObjects.Text | null = null;
  /** Indicateur de tier */
  private tierIndicator: Phaser.GameObjects.Graphics | null = null;

  /** Le joueur est-il à portée pour ramasser? */
  private playerInRange: boolean = false;
  /** UI de comparaison actuellement affichée? */
  private comparisonUIShown: boolean = false;

  constructor(scene: GameScene, x: number, y: number, weaponType: MeleeWeaponType) {
    super(scene, x, y, '__WHITE');

    this.gameScene = scene;
    this.weaponType = weaponType;
    this.weaponInfo = getMeleeWeaponInfo(weaponType);
    this.dropConfig = BALANCE.drops;

    // Ajouter au jeu et à la physique
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configuration visuelle - couleur selon le tier
    const tierColors: Record<number, number> = {
      1: 0x888888, // Gris (tier 1)
      2: 0x44aa44, // Vert (tier 2)
      3: 0xaa44ff, // Violet (tier 3)
    };
    this.setTint(tierColors[this.weaponInfo.tier] ?? 0xffffff);
    this.setDisplaySize(24, 24);
    this.setDepth(5);

    // Configuration du corps physique
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(12);
    body.setDrag(300);
    body.setBounce(0.5);

    // Créer le label flottant
    this.createLabel();

    // Créer l'indicateur de tier
    this.createTierIndicator();

    // Démarrer les timers
    this.startLifetimeTimers();

    // Animation de "pop"
    this.playPopAnimation();
  }

  /**
   * Crée le label flottant au-dessus du drop
   */
  private createLabel(): void {
    const tierSymbols = ['', '★', '★★', '★★★'];
    this.label = this.scene.add.text(this.x, this.y - 25, `${this.weaponInfo.name} ${tierSymbols[this.weaponInfo.tier]}`, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 },
    });
    this.label.setOrigin(0.5);
    this.label.setDepth(6);
  }

  /**
   * Crée l'indicateur visuel de tier
   */
  private createTierIndicator(): void {
    this.tierIndicator = this.scene.add.graphics();
    this.tierIndicator.setDepth(5);
    this.updateTierIndicator();
  }

  /**
   * Met à jour l'indicateur de tier
   */
  private updateTierIndicator(): void {
    if (!this.tierIndicator) return;

    this.tierIndicator.clear();

    // Cercle pulsant autour du drop
    const tierColors: Record<number, number> = {
      1: 0x888888,
      2: 0x44aa44,
      3: 0xaa44ff,
    };

    this.tierIndicator.lineStyle(2, tierColors[this.weaponInfo.tier] ?? 0xffffff, 0.5);
    this.tierIndicator.strokeCircle(this.x, this.y, 18);
  }

  /**
   * Animation de pop à l'apparition
   */
  private playPopAnimation(): void {
    const angle = Math.random() * Math.PI * 2;
    const velocity = this.dropConfig.popVelocity * 1.5;

    (this.body as Phaser.Physics.Arcade.Body).setVelocity(
      Math.cos(angle) * velocity,
      Math.sin(angle) * velocity
    );

    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Démarre les timers de lifetime
   */
  private startLifetimeTimers(): void {
    const lifetime = this.dropConfig.lifetime * 1.5; // Les armes restent plus longtemps
    const blinkStart = this.dropConfig.blinkStartTime;

    this.blinkTimer = this.scene.time.addEvent({
      delay: lifetime - blinkStart,
      callback: this.startBlinking,
      callbackScope: this,
    });

    this.lifetimeTimer = this.scene.time.addEvent({
      delay: lifetime,
      callback: this.expire,
      callbackScope: this,
    });
  }

  /**
   * Commence le clignotement
   */
  private startBlinking(): void {
    this.blinkTween = this.scene.tweens.add({
      targets: [this, this.label],
      alpha: 0.3,
      duration: 150,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Le drop expire
   */
  private expire(): void {
    this.deactivate();
  }

  /**
   * Met à jour le drop
   */
  public update(player: Player): void {
    if (!this.active) return;

    // Mettre à jour la position du label et de l'indicateur
    if (this.label) {
      this.label.setPosition(this.x, this.y - 25);
    }
    this.updateTierIndicator();

    // Vérifier la distance au joueur
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const pickupRange = 50;

    if (distance <= pickupRange) {
      if (!this.playerInRange) {
        this.playerInRange = true;
        this.onPlayerEnterRange(player);
      }
    } else {
      if (this.playerInRange) {
        this.playerInRange = false;
        this.onPlayerExitRange();
      }
    }
  }

  /**
   * Le joueur entre à portée
   */
  private onPlayerEnterRange(player: Player): void {
    // Afficher l'UI de comparaison
    if (!this.comparisonUIShown) {
      this.showComparisonUI(player);
    }
  }

  /**
   * Le joueur sort de portée
   */
  private onPlayerExitRange(): void {
    // Masquer l'UI de comparaison
    if (this.comparisonUIShown) {
      this.hideComparisonUI();
    }
  }

  /**
   * Affiche l'UI de comparaison
   */
  private showComparisonUI(player: Player): void {
    this.comparisonUIShown = true;

    // Émettre un événement pour que le HUD affiche la comparaison
    const currentMelee = player.getMeleeWeapon();
    let currentWeaponInfo: MeleeWeaponInfo | null = null;

    if (currentMelee) {
      // Trouver le type de l'arme actuelle
      const weaponName = currentMelee.getName();
      const typeMap: Record<string, MeleeWeaponType> = {
        'Batte': 'baseballBat',
        'Machette': 'machete',
        'Tronçonneuse': 'chainsaw',
        'Hache': 'fireAxe',
        'Katana': 'katana',
        'Marteau': 'sledgehammer',
      };
      const currentType = typeMap[weaponName];
      if (currentType) {
        currentWeaponInfo = getMeleeWeaponInfo(currentType);
      }
    }

    this.gameScene.events.emit('meleeWeaponDrop:showComparison', {
      currentWeapon: currentWeaponInfo,
      newWeapon: this.weaponInfo,
      dropId: this,
    });
  }

  /**
   * Masque l'UI de comparaison
   */
  private hideComparisonUI(): void {
    this.comparisonUIShown = false;
    this.gameScene.events.emit('meleeWeaponDrop:hideComparison');
  }

  /**
   * Le joueur accepte la nouvelle arme
   */
  public accept(player: Player): void {
    if (!this.active) return;

    // Créer la nouvelle arme
    const factory = MELEE_WEAPON_FACTORIES[this.weaponType];
    const newWeapon = factory(this.gameScene, player);

    // Équiper la nouvelle arme
    player.equipMeleeWeapon(newWeapon as MeleeWeapon);

    // Émettre l'événement
    this.gameScene.events.emit('item:pickup', {
      itemType: 'meleeWeapon',
      weaponType: this.weaponType,
      tier: this.weaponInfo.tier,
    });

    // Animation de collecte
    this.playCollectAnimation();
  }

  /**
   * Le joueur refuse la nouvelle arme
   */
  public decline(): void {
    this.hideComparisonUI();
    // Le drop reste au sol
  }

  /**
   * Animation de collecte
   */
  private playCollectAnimation(): void {
    if (this.blinkTween) {
      this.blinkTween.stop();
    }

    this.scene.tweens.add({
      targets: [this, this.label],
      y: this.y - 30,
      alpha: 0,
      scale: 0.5,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.deactivate();
      },
    });
  }

  /**
   * Réinitialise le drop
   */
  public reset(x: number, y: number, weaponType: MeleeWeaponType): void {
    this.setPosition(x, y);
    this.weaponType = weaponType;
    this.weaponInfo = getMeleeWeaponInfo(weaponType);

    this.setActive(true);
    this.setVisible(true);
    this.setAlpha(1);
    this.setScale(0);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setVelocity(0, 0);

    // Mettre à jour la couleur
    const tierColors: Record<number, number> = {
      1: 0x888888,
      2: 0x44aa44,
      3: 0xaa44ff,
    };
    this.setTint(tierColors[this.weaponInfo.tier] ?? 0xffffff);

    // Mettre à jour le label
    if (this.label) {
      const tierSymbols = ['', '★', '★★', '★★★'];
      this.label.setText(`${this.weaponInfo.name} ${tierSymbols[this.weaponInfo.tier]}`);
      this.label.setActive(true);
      this.label.setVisible(true);
      this.label.setAlpha(1);
    }

    this.playerInRange = false;
    this.comparisonUIShown = false;

    this.startLifetimeTimers();
    this.playPopAnimation();
  }

  /**
   * Désactive le drop
   */
  public deactivate(): void {
    this.hideComparisonUI();

    this.setActive(false);
    this.setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    body.setVelocity(0, 0);

    if (this.label) {
      this.label.setActive(false);
      this.label.setVisible(false);
    }

    if (this.tierIndicator) {
      this.tierIndicator.clear();
    }

    if (this.lifetimeTimer) {
      this.lifetimeTimer.remove();
      this.lifetimeTimer = null;
    }

    if (this.blinkTimer) {
      this.blinkTimer.remove();
      this.blinkTimer = null;
    }

    if (this.blinkTween) {
      this.blinkTween.stop();
      this.blinkTween = null;
    }
  }

  /**
   * Retourne le type d'arme
   */
  public getWeaponType(): MeleeWeaponType {
    return this.weaponType;
  }

  /**
   * Retourne les infos de l'arme
   */
  public getWeaponInfo(): MeleeWeaponInfo {
    return this.weaponInfo;
  }

  /**
   * Nettoie les ressources
   */
  public destroy(fromScene?: boolean): void {
    this.deactivate();

    if (this.label) {
      this.label.destroy();
      this.label = null;
    }

    if (this.tierIndicator) {
      this.tierIndicator.destroy();
      this.tierIndicator = null;
    }

    super.destroy(fromScene);
  }
}

/**
 * Sélectionne une arme de mêlée aléatoire basée sur la vague actuelle
 */
export function selectRandomMeleeWeapon(currentWave: number): MeleeWeaponType {
  const config = BALANCE.drops.meleeWeapon;

  // Déterminer les tiers disponibles
  const availableTiers: number[] = [];
  if (currentWave >= config.waveModifier.minWaveForTier2) {
    availableTiers.push(2);
  }
  if (currentWave >= config.waveModifier.minWaveForTier3) {
    availableTiers.push(3);
  }

  // Si aucun tier n'est disponible, ne pas drop (trop tôt)
  if (availableTiers.length === 0) {
    // Retourne machete comme fallback (tier 2 le plus basique)
    return 'machete';
  }

  // Sélectionner un tier
  let selectedTier: number;
  if (availableTiers.length === 1) {
    selectedTier = availableTiers[0];
  } else {
    // Pondérer par les poids
    const roll = Math.random();
    if (roll < config.tierWeights[2]) {
      selectedTier = 2;
    } else {
      selectedTier = 3;
    }
  }

  // Sélectionner une arme du tier
  const weaponsOfTier: MeleeWeaponType[] = [];
  const allWeapons: MeleeWeaponType[] = ['machete', 'fireAxe', 'katana', 'sledgehammer', 'chainsaw'];

  for (const weapon of allWeapons) {
    const stats = BALANCE.weapons[weapon] as { tier: number };
    if (stats.tier === selectedTier) {
      weaponsOfTier.push(weapon);
    }
  }

  if (weaponsOfTier.length === 0) {
    return 'machete';
  }

  return weaponsOfTier[Math.floor(Math.random() * weaponsOfTier.length)];
}
