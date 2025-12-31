import Phaser from 'phaser';
import { gameConfig } from '@config/game.config';

/**
 * Point d'entrée principal du jeu Zombie Hunter
 *
 * Le scaling est géré automatiquement par Phaser avec le mode FIT:
 * - Le jeu s'adapte à l'écran sans déborder
 * - Le ratio 16:9 est toujours préservé
 * - Le jeu est centré (bandes noires si nécessaire)
 */
const game = new Phaser.Game(gameConfig);

export default game;
