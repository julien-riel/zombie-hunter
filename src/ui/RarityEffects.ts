import Phaser from 'phaser';
import { WEAPON_RARITY, type WeaponRarityType } from '@weapons/WeaponRarity';

/**
 * Effets visuels pour les armes selon leur rareté
 */
export class RarityEffects {
  /**
   * Crée un effet de glow autour d'un objet selon sa rareté
   */
  public static createGlow(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rarity: WeaponRarityType,
    radius: number = 30
  ): Phaser.GameObjects.Arc {
    const config = WEAPON_RARITY[rarity];

    const glow = scene.add.circle(x, y, radius, config.glowColor, 0.3);
    glow.setDepth(1);

    // Animation de pulsation pour les raretés élevées
    if (rarity !== 'common') {
      scene.tweens.add({
        targets: glow,
        alpha: { from: 0.2, to: 0.5 },
        scale: { from: 0.9, to: 1.1 },
        duration: rarity === 'legendary' ? 500 : rarity === 'epic' ? 700 : 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    return glow;
  }

  /**
   * Crée des particules selon la rareté
   */
  public static createParticles(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rarity: WeaponRarityType
  ): void {
    if (rarity === 'common') return;

    const config = WEAPON_RARITY[rarity];
    const particleCount = rarity === 'legendary' ? 8 : rarity === 'epic' ? 5 : 3;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 20 + Math.random() * 10;

      const particle = scene.add.circle(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        rarity === 'legendary' ? 3 : 2,
        config.color,
        0.8
      );
      particle.setDepth(2);

      // Animation orbitale pour legendary
      if (rarity === 'legendary') {
        scene.tweens.add({
          targets: particle,
          x: { value: `+=${Math.cos(angle + Math.PI / 2) * 5}`, duration: 800 },
          y: { value: `+=${Math.sin(angle + Math.PI / 2) * 5}`, duration: 800 },
          alpha: { from: 0.8, to: 0.3 },
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else {
        // Animation simple pour les autres
        scene.tweens.add({
          targets: particle,
          alpha: { from: 0.8, to: 0.2 },
          scale: { from: 1, to: 0.5 },
          duration: 1000 + Math.random() * 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  /**
   * Crée une bordure colorée selon la rareté pour un slot d'arme
   */
  public static getSlotBorderStyle(rarity: WeaponRarityType): {
    color: number;
    width: number;
    alpha: number;
  } {
    const config = WEAPON_RARITY[rarity];

    return {
      color: config.borderColor,
      width: rarity === 'legendary' ? 4 : rarity === 'epic' ? 3 : 2,
      alpha: rarity === 'common' ? 0.5 : 1,
    };
  }

  /**
   * Crée un effet de pickup selon la rareté
   */
  public static createPickupEffect(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rarity: WeaponRarityType
  ): void {
    const config = WEAPON_RARITY[rarity];

    // Flash central
    const flash = scene.add.circle(x, y, 20, config.color, 0.9);
    flash.setDepth(100);

    scene.tweens.add({
      targets: flash,
      scale: 3,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // Étoiles montantes pour raretés élevées
    if (rarity !== 'common') {
      const starCount = rarity === 'legendary' ? 6 : rarity === 'epic' ? 4 : 2;

      for (let i = 0; i < starCount; i++) {
        const offsetX = (Math.random() - 0.5) * 40;
        const star = scene.add.text(x + offsetX, y, '★', {
          fontSize: rarity === 'legendary' ? '20px' : '16px',
          color: `#${config.color.toString(16).padStart(6, '0')}`,
        });
        star.setOrigin(0.5);
        star.setDepth(101);

        scene.tweens.add({
          targets: star,
          y: y - 60 - Math.random() * 30,
          alpha: 0,
          scale: 0.5,
          duration: 600 + Math.random() * 300,
          delay: i * 50,
          ease: 'Quad.easeOut',
          onComplete: () => star.destroy(),
        });
      }
    }

    // Anneau pour legendary
    if (rarity === 'legendary') {
      const ring = scene.add.circle(x, y, 10, 0x000000, 0);
      ring.setStrokeStyle(3, config.color, 1);
      ring.setDepth(99);

      scene.tweens.add({
        targets: ring,
        scale: 5,
        alpha: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
  }

  /**
   * Applique un effet de teinte selon la rareté à un sprite
   */
  public static applyRarityTint(
    sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    rarity: WeaponRarityType
  ): void {
    if (rarity !== 'common') {
      const config = WEAPON_RARITY[rarity];
      sprite.setTint(config.color);
    }
  }

  /**
   * Crée le texte du nom avec la couleur de rareté
   */
  public static createRarityText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    rarity: WeaponRarityType,
    fontSize: string = '14px'
  ): Phaser.GameObjects.Text {
    const config = WEAPON_RARITY[rarity];
    const colorHex = '#' + config.color.toString(16).padStart(6, '0');

    const textObj = scene.add.text(x, y, text, {
      fontSize,
      color: colorHex,
      fontStyle: rarity === 'legendary' || rarity === 'epic' ? 'bold' : 'normal',
    });

    // Effet de brillance pour legendary
    if (rarity === 'legendary') {
      scene.tweens.add({
        targets: textObj,
        alpha: { from: 1, to: 0.7 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    return textObj;
  }
}
