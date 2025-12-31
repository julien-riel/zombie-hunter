import Phaser from 'phaser';
import { gameConfig } from '@config/game.config';

/**
 * Point d'entrée principal du jeu Zombie Hunter
 */
const game = new Phaser.Game(gameConfig);

/**
 * Recalcule le mode de scale optimal et l'applique si nécessaire
 * Appelé lors des changements de taille de fenêtre/orientation
 */
function updateScaleMode(): void {
  const gameRatio = 1280 / 720;
  const screenRatio = window.innerWidth / window.innerHeight;

  const optimalMode =
    screenRatio >= gameRatio
      ? Phaser.Scale.HEIGHT_CONTROLS_WIDTH
      : Phaser.Scale.FIT;

  // Changer le mode seulement s'il est différent
  if (game.scale.scaleMode !== optimalMode) {
    game.scale.setGameSize(1280, 720);
    game.scale.scaleMode = optimalMode;
    game.scale.refresh();
  }
}

// Écouter les changements de taille/orientation
window.addEventListener('resize', updateScaleMode);
window.addEventListener('orientationchange', () => {
  // Petit délai pour laisser le navigateur se stabiliser
  setTimeout(updateScaleMode, 100);
});

// Appliquer au démarrage après un court délai (pour mode standalone)
setTimeout(updateScaleMode, 50);

export default game;
