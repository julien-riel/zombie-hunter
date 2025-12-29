import type { GameScene } from '@scenes/GameScene';
import type { Zombie } from '@entities/zombies/Zombie';

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

/** Durée avant qu'un cadavre disparaisse (ms) */
const CORPSE_LIFETIME = 30000;
/** Nombre maximum de cadavres */
const MAX_CORPSES = 20;

/**
 * Gestionnaire des cadavres de zombies
 * Permet au Necromancer de ressusciter les morts
 */
export class CorpseManager {
  private scene: GameScene;
  private corpses: Map<string, CorpseData> = new Map();
  private corpseIdCounter: number = 0;

  constructor(scene: GameScene) {
    this.scene = scene;

    // Écouter les événements de mort de zombie
    this.scene.events.on('zombieDeath', this.onZombieDeath, this);
    this.scene.events.on('corpse:removed', this.onCorpseRemoved, this);
  }

  /**
   * Appelé quand un zombie meurt
   */
  private onZombieDeath(zombie: Zombie): void {
    // Ne pas créer de cadavre pour certains types de zombies
    const type = zombie.getType();
    if (type === 'bomber') return; // Les Bombers explosent
    if (type === 'splitter') return; // Les Splitters se divisent

    this.createCorpse(zombie);
  }

  /**
   * Crée un cadavre à partir d'un zombie mort
   */
  private createCorpse(zombie: Zombie): void {
    // Limiter le nombre de cadavres
    if (this.corpses.size >= MAX_CORPSES) {
      // Supprimer le plus ancien
      const oldestId = this.getOldestCorpseId();
      if (oldestId) {
        this.removeCorpse(oldestId);
      }
    }

    const id = `corpse_${this.corpseIdCounter++}`;
    const corpse: CorpseData = {
      id,
      x: zombie.x,
      y: zombie.y,
      type: zombie.getType(),
      createdAt: Date.now(),
    };

    this.corpses.set(id, corpse);

    // Créer un marqueur visuel (optionnel)
    this.createCorpseVisual(corpse);

    // Programmer la suppression automatique
    this.scene.time.delayedCall(CORPSE_LIFETIME, () => {
      this.removeCorpse(id);
    });

    // Émettre un événement
    this.scene.events.emit('corpse:created', corpse);
  }

  /**
   * Crée l'indicateur visuel du cadavre
   */
  private createCorpseVisual(corpse: CorpseData): void {
    // Petit cercle rouge qui s'estompe lentement
    const visual = this.scene.add.circle(corpse.x, corpse.y, 8, 0x990000, 0.4);

    // Stocker la référence dans les données du cadavre
    (corpse as CorpseData & { visual?: Phaser.GameObjects.Arc }).visual = visual;

    // Fade out progressif
    this.scene.tweens.add({
      targets: visual,
      alpha: 0.1,
      duration: CORPSE_LIFETIME * 0.8,
    });
  }

  /**
   * Récupère l'ID du cadavre le plus ancien
   */
  private getOldestCorpseId(): string | null {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, corpse] of this.corpses) {
      if (corpse.createdAt < oldestTime) {
        oldestTime = corpse.createdAt;
        oldestId = id;
      }
    }

    return oldestId;
  }

  /**
   * Appelé quand un cadavre est supprimé
   */
  private onCorpseRemoved(id: string): void {
    this.removeCorpse(id);
  }

  /**
   * Supprime un cadavre
   */
  public removeCorpse(id: string): void {
    const corpse = this.corpses.get(id) as CorpseData & { visual?: Phaser.GameObjects.Arc };
    if (!corpse) return;

    // Supprimer le visuel
    if (corpse.visual) {
      corpse.visual.destroy();
    }

    this.corpses.delete(id);
  }

  /**
   * Récupère les cadavres dans un rayon donné
   */
  public getCorpsesInRadius(x: number, y: number, radius: number): CorpseData[] {
    const result: CorpseData[] = [];

    for (const corpse of this.corpses.values()) {
      const distance = Phaser.Math.Distance.Between(x, y, corpse.x, corpse.y);
      if (distance <= radius) {
        result.push(corpse);
      }
    }

    // Trier par distance (plus proche en premier)
    result.sort((a, b) => {
      const distA = Phaser.Math.Distance.Between(x, y, a.x, a.y);
      const distB = Phaser.Math.Distance.Between(x, y, b.x, b.y);
      return distA - distB;
    });

    return result;
  }

  /**
   * Récupère tous les cadavres
   */
  public getAllCorpses(): CorpseData[] {
    return Array.from(this.corpses.values());
  }

  /**
   * Récupère le nombre de cadavres
   */
  public getCorpseCount(): number {
    return this.corpses.size;
  }

  /**
   * Nettoie tous les cadavres
   */
  public clear(): void {
    for (const id of this.corpses.keys()) {
      this.removeCorpse(id);
    }
  }

  /**
   * Nettoie le gestionnaire
   */
  public destroy(): void {
    this.scene.events.off('zombieDeath', this.onZombieDeath, this);
    this.scene.events.off('corpse:removed', this.onCorpseRemoved, this);
    this.clear();
  }
}
