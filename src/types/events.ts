/**
 * Types d'événements du jeu
 */

// Événements du cycle de vie
export type LifecycleEvent = 'game:start' | 'game:pause' | 'game:resume' | 'game:over';

// Événements de combat
export type CombatEvent =
  | 'player:shoot'
  | 'player:hit'
  | 'player:heal'
  | 'player:death'
  | 'zombie:spawn'
  | 'zombie:hit'
  | 'zombie:death'
  | 'boss:spawn'
  | 'boss:phase'
  | 'boss:death';

// Événements de progression
export type ProgressionEvent =
  | 'wave:start'
  | 'wave:clear'
  | 'wave:boss'
  | 'combo:increase'
  | 'combo:break'
  | 'upgrade:offered'
  | 'upgrade:selected'
  | 'item:drop'
  | 'item:pickup'
  | 'powerup:activate'
  | 'powerup:expire';

// Événements d'environnement
export type EnvironmentEvent =
  | 'door:activate'
  | 'door:barricade'
  | 'door:destroy'
  | 'cover:damage'
  | 'cover:destroy'
  | 'interactive:trigger';

export type GameEvent = LifecycleEvent | CombatEvent | ProgressionEvent | EnvironmentEvent;

/**
 * Payload des événements
 */
export interface GameEventPayloads {
  'zombie:death': { zombieId: string; position: { x: number; y: number }; points: number };
  'wave:start': { waveNumber: number };
  'wave:clear': { waveNumber: number; score: number };
  'combo:increase': { multiplier: number };
  'player:hit': { damage: number; currentHealth: number };
}
