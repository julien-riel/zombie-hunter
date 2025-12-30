import type { GameScene } from '@scenes/GameScene';
import type { ZombieFactory } from '@entities/zombies/ZombieFactory';
import type { Zombie } from '@entities/zombies/Zombie';
import type { ZombieType } from '@/types/entities';
import { GAME_WIDTH, GAME_HEIGHT } from '@config/constants';

/**
 * Types d'items que le DebugSpawner peut créer
 */
export type DebugItemType =
  | 'health'
  | 'ammo'
  | 'speedBoost'
  | 'damageBoost'
  | 'shieldBoost'
  | 'turret'
  | 'mine'
  | 'drone'
  | 'decoy';

/**
 * Liste complète des types de zombies disponibles
 */
export const ZOMBIE_TYPES: ZombieType[] = [
  'shambler',
  'runner',
  'crawler',
  'tank',
  'spitter',
  'bomber',
  'screamer',
  'splitter',
  'invisible',
  'necromancer',
];

/**
 * Système de spawn pour le mode debug
 * Permet de créer des zombies et items à la demande
 */
export class DebugSpawner {
  private gameScene: GameScene;
  private zombieFactory: ZombieFactory;

  /** Type de zombie actuellement sélectionné pour le spawn */
  private selectedZombieType: ZombieType = 'shambler';
  /** Type d'item actuellement sélectionné pour le spawn */
  private selectedItemType: DebugItemType = 'health';

  constructor(gameScene: GameScene) {
    this.gameScene = gameScene;
    this.zombieFactory = gameScene.getZombieFactory();
  }

  /**
   * Définit le type de zombie à spawner
   */
  public setSelectedZombieType(type: ZombieType): void {
    this.selectedZombieType = type;
  }

  /**
   * Récupère le type de zombie sélectionné
   */
  public getSelectedZombieType(): ZombieType {
    return this.selectedZombieType;
  }

  /**
   * Définit le type d'item à spawner
   */
  public setSelectedItemType(type: DebugItemType): void {
    this.selectedItemType = type;
  }

  /**
   * Récupère le type d'item sélectionné
   */
  public getSelectedItemType(): DebugItemType {
    return this.selectedItemType;
  }

  /**
   * Spawn un zombie du type spécifié à une position donnée
   */
  public spawnZombie(type: ZombieType, x: number, y: number): Zombie | null {
    return this.zombieFactory.create(type, x, y);
  }

  /**
   * Spawn un zombie du type actuellement sélectionné à une position
   */
  public spawnSelectedZombie(x: number, y: number): Zombie | null {
    return this.spawnZombie(this.selectedZombieType, x, y);
  }

  /**
   * Spawn plusieurs zombies du même type en groupe
   */
  public spawnGroup(type: ZombieType, x: number, y: number, count: number = 5): Zombie[] {
    const zombies: Zombie[] = [];
    const spacing = 40;

    for (let i = 0; i < count; i++) {
      const offsetX = (i % 3 - 1) * spacing;
      const offsetY = Math.floor(i / 3) * spacing;
      const zombie = this.spawnZombie(type, x + offsetX, y + offsetY);
      if (zombie) {
        zombies.push(zombie);
      }
    }

    return zombies;
  }

  /**
   * Spawn des shamblers aléatoires sur la carte
   */
  public spawnRandomShamblers(count: number = 10): Zombie[] {
    const zombies: Zombie[] = [];
    const margin = 100;

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      const y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
      const zombie = this.spawnZombie('shambler', x, y);
      if (zombie) {
        zombies.push(zombie);
      }
    }

    return zombies;
  }

  /**
   * Spawn une horde mixte de zombies variés
   */
  public spawnMixedHorde(count: number = 20): Zombie[] {
    const zombies: Zombie[] = [];
    const margin = 100;
    const commonTypes: ZombieType[] = ['shambler', 'runner', 'crawler', 'spitter'];

    for (let i = 0; i < count; i++) {
      const type = commonTypes[Math.floor(Math.random() * commonTypes.length)];
      const x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      const y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
      const zombie = this.spawnZombie(type, x, y);
      if (zombie) {
        zombies.push(zombie);
      }
    }

    return zombies;
  }

  /**
   * Spawn un zombie de chaque type en ligne
   */
  public spawnOneOfEach(): Zombie[] {
    const zombies: Zombie[] = [];
    let x = 200;
    const y = 200;
    const spacing = 80;

    for (const type of ZOMBIE_TYPES) {
      const zombie = this.spawnZombie(type, x, y);
      if (zombie) {
        zombies.push(zombie);
      }
      x += spacing;
    }

    return zombies;
  }

  /**
   * Tue tous les zombies actifs
   */
  public killAllZombies(): number {
    const zombies = this.gameScene.getActiveZombies();
    let killed = 0;

    for (const zombie of zombies) {
      if (zombie.active) {
        // Infliger des dégâts massifs pour tuer le zombie
        zombie.takeDamage(99999);
        killed++;
      }
    }

    return killed;
  }

  /**
   * Spawn un item à une position donnée
   * Note: Le système d'items n'est pas encore implémenté complètement
   */
  public spawnItem(type: DebugItemType, x: number, y: number): void {
    // Émettre un événement pour le système d'items (quand il sera implémenté)
    this.gameScene.events.emit('item:drop', {
      itemType: type,
      position: { x, y },
      source: 'debug',
    });

    // Effet visuel temporaire pour montrer où l'item a été placé
    this.createItemPlaceholder(type, x, y);
  }

  /**
   * Crée un placeholder visuel pour un item (en attendant le vrai système)
   */
  private createItemPlaceholder(type: DebugItemType, x: number, y: number): void {
    const colors: Record<DebugItemType, number> = {
      health: 0x00ff00,
      ammo: 0xffff00,
      speedBoost: 0x00ffff,
      damageBoost: 0xff0000,
      shieldBoost: 0x0000ff,
      turret: 0xff00ff,
      mine: 0xff8800,
      drone: 0x8800ff,
      decoy: 0x88ff00,
    };

    const color = colors[type] || 0xffffff;
    const placeholder = this.gameScene.add.circle(x, y, 15, color, 0.7);
    placeholder.setDepth(50);

    // Texte indiquant le type
    const text = this.gameScene.add.text(x, y - 25, type, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 2, y: 2 },
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(51);

    // Animation et disparition
    this.gameScene.tweens.add({
      targets: [placeholder, text],
      alpha: 0,
      y: y - 50,
      duration: 2000,
      onComplete: () => {
        placeholder.destroy();
        text.destroy();
      },
    });
  }

  /**
   * Spawn un item du type sélectionné à une position
   */
  public spawnSelectedItem(x: number, y: number): void {
    this.spawnItem(this.selectedItemType, x, y);
  }

  /**
   * Récupère le nombre de zombies actifs
   */
  public getActiveZombieCount(): number {
    return this.gameScene.getActiveZombies().length;
  }
}
