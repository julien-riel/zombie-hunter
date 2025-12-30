/**
 * Système d'événements du jeu Zombie Hunter
 *
 * Ce fichier définit tous les événements émis et écoutés dans le jeu.
 * Les événements permettent une communication découplée entre les systèmes.
 *
 * Usage:
 *   // Émettre un événement
 *   scene.events.emit('zombie:death', { zombieId: '123', position: { x: 100, y: 200 }, points: 10 });
 *
 *   // Écouter un événement
 *   scene.events.on('zombie:death', (payload: GameEventPayloads['zombie:death']) => { ... });
 */

// ============================================================================
// ÉVÉNEMENTS DU CYCLE DE VIE
// ============================================================================

/**
 * Événements liés au cycle de vie du jeu (démarrage, pause, fin)
 */
export type LifecycleEvent = 'game:start' | 'game:pause' | 'game:resume' | 'game:over';

// ============================================================================
// ÉVÉNEMENTS DE COMBAT
// ============================================================================

/**
 * Événements liés aux actions de combat (tirs, dégâts, morts)
 */
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

// ============================================================================
// ÉVÉNEMENTS DE PROGRESSION
// ============================================================================

/**
 * Événements liés à la progression du joueur (vagues, combo, upgrades)
 */
export type ProgressionEvent =
  | 'wave:start'
  | 'wave:clear'
  | 'wave:boss'
  | 'combo:increase'
  | 'combo:break'
  | 'combo:milestone'
  | 'upgrade:offered'
  | 'upgrade:selected'
  | 'item:drop'
  | 'item:pickup'
  | 'powerup:activate'
  | 'powerup:expire';

// ============================================================================
// ÉVÉNEMENTS D'ENVIRONNEMENT
// ============================================================================

/**
 * Événements liés aux éléments de l'environnement (portes, couvertures, interactifs)
 */
export type EnvironmentEvent =
  | 'door:activate'
  | 'door:barricade'
  | 'door:barricade_damage'
  | 'door:barricade_destroyed'
  | 'door:barricade_repaired'
  | 'door:trap_set'
  | 'door:trap_triggered'
  | 'door:destroy'
  | 'cover:damage'
  | 'cover:destroy'
  | 'interactive:trigger'
  | 'interactive:damage'
  | 'interactive:destroy'
  | 'interactive:explosion'
  | 'interactive:fire_created'
  | 'interactive:blade_hit'
  | 'switch:activated'
  | 'generator:toggle'
  | 'generator:breakdown'
  | 'generator:repaired';

/**
 * Union de tous les types d'événements du jeu
 */
export type GameEvent = LifecycleEvent | CombatEvent | ProgressionEvent | EnvironmentEvent;

// ============================================================================
// PAYLOADS DES ÉVÉNEMENTS
// ============================================================================

/**
 * Définition des payloads pour chaque événement.
 * Permet un typage strict lors de l'émission et de l'écoute des événements.
 */
export interface GameEventPayloads {
  // --- Lifecycle Events ---
  /** Émis au démarrage d'une nouvelle partie */
  'game:start': { mode: 'survival' | 'campaign' | 'challenge' };
  /** Émis quand le jeu est mis en pause */
  'game:pause': Record<string, never>;
  /** Émis quand le jeu reprend après une pause */
  'game:resume': Record<string, never>;
  /** Émis à la fin de la partie */
  'game:over': { score: number; wave: number; kills: number; survivalTime: number };

  // --- Combat Events (Player) ---
  /** Émis quand le joueur tire */
  'player:shoot': { weaponType: string; direction: { x: number; y: number } };
  /** Émis quand le joueur subit des dégâts */
  'player:hit': { damage: number; currentHealth: number; source?: string };
  /** Émis quand le joueur se soigne */
  'player:heal': { amount: number; currentHealth: number; source: string };
  /** Émis quand le joueur meurt */
  'player:death': { position: { x: number; y: number }; killedBy?: string };

  // --- Combat Events (Zombies) ---
  /** Émis quand un zombie spawn */
  'zombie:spawn': { zombieType: string; position: { x: number; y: number }; doorId?: string };
  /** Émis quand un zombie est touché */
  'zombie:hit': { zombieId: string; damage: number; remainingHealth: number };
  /** Émis quand un zombie meurt */
  'zombie:death': { zombieId: string; position: { x: number; y: number }; points: number };

  // --- Combat Events (Bosses) ---
  /** Émis quand un boss spawn */
  'boss:spawn': { bossType: string; position: { x: number; y: number } };
  /** Émis quand un boss change de phase */
  'boss:phase': { bossId: string; phase: number; totalPhases: number };
  /** Émis quand un boss meurt */
  'boss:death': { bossId: string; points: number; loot?: string[] };

  // --- Progression Events (Waves) ---
  /** Émis au début d'une nouvelle vague */
  'wave:start': { waveNumber: number; totalZombies?: number; activeDoors?: number };
  /** Émis quand une vague est terminée */
  'wave:clear': { waveNumber: number; score: number; timeElapsed?: number };
  /** Émis quand une vague de boss commence */
  'wave:boss': { waveNumber: number; bossType: string };

  // --- Progression Events (Combo) ---
  /** Émis quand le multiplicateur de combo augmente */
  'combo:increase': { multiplier: number; killStreak: number };
  /** Émis quand le combo est perdu */
  'combo:break': { previousMultiplier: number; totalPoints: number };
  /** Émis quand le combo atteint un milestone (x2, x3, etc.) */
  'combo:milestone': { level: number; multiplier: number };

  // --- Progression Events (Upgrades) ---
  /** Émis quand des choix d'upgrade sont proposés */
  'upgrade:offered': { choices: { id: string; name: string; rarity: string }[] };
  /** Émis quand le joueur sélectionne une upgrade */
  'upgrade:selected': { upgradeId: string; upgradeName: string };

  // --- Progression Events (Items) ---
  /** Émis quand un item drop */
  'item:drop': { itemType: string; position: { x: number; y: number }; source?: string };
  /** Émis quand le joueur ramasse un item */
  'item:pickup': { itemType: string; value?: number };
  /** Émis quand un power-up est activé */
  'powerup:activate': { powerupType: string; duration: number };
  /** Émis quand un power-up expire */
  'powerup:expire': { powerupType: string };

  // --- Environment Events ---
  /** Émis quand une porte est activée */
  'door:activate': { doorId: string; position: { x: number; y: number } };
  /** Émis quand une porte est barricadée */
  'door:barricade': { doorId: string; barricadeType: string; health: number };
  /** Émis quand une barricade subit des dégâts */
  'door:barricade_damage': { doorId: string; damage: number; remainingHealth: number; source?: string };
  /** Émis quand une barricade est détruite */
  'door:barricade_destroyed': { doorId: string; destroyedBy?: string };
  /** Émis quand une barricade est réparée */
  'door:barricade_repaired': { doorId: string; healAmount: number; currentHealth: number };
  /** Émis quand un piège est placé sur une porte */
  'door:trap_set': { doorId: string; trapType: string; charges: number };
  /** Émis quand un piège de porte se déclenche */
  'door:trap_triggered': { doorId: string; trapType: string; chargesRemaining: number };
  /** Émis quand une porte est détruite (par un boss) */
  'door:destroy': { doorId: string; destroyedBy?: string };
  /** Émis quand une couverture subit des dégâts */
  'cover:damage': { coverId: string; damage: number; remainingHealth: number };
  /** Émis quand une couverture est détruite */
  'cover:destroy': { coverId: string; position: { x: number; y: number } };

  // --- Interactive Events ---
  /** Émis quand un élément interactif est déclenché */
  'interactive:trigger': {
    elementId: string;
    elementType: string;
    source?: string;
    position: { x: number; y: number };
  };
  /** Émis quand un élément interactif subit des dégâts */
  'interactive:damage': {
    elementId: string;
    elementType: string;
    damage: number;
    source?: string;
    remainingHealth: number;
  };
  /** Émis quand un élément interactif est détruit */
  'interactive:destroy': {
    elementId: string;
    elementType: string;
    position: { x: number; y: number };
  };
  /** Émis quand un baril explose */
  'interactive:explosion': {
    elementId: string;
    position: { x: number; y: number };
    damage: number;
    radius: number;
    kills: number;
  };
  /** Émis quand un baril de feu crée une zone */
  'interactive:fire_created': {
    elementId: string;
    position: { x: number; y: number };
    radius: number;
    duration: number;
  };
  /** Émis quand un piège à lames touche une entité */
  'interactive:blade_hit': {
    elementId: string;
    entityId?: string;
    damage: number;
  };
  /** Émis quand un switch est activé */
  'switch:activated': {
    switchId: string;
    isOn: boolean;
    linkedTargetIds: string[];
  };
  /** Émis quand un générateur change d'état */
  'generator:toggle': {
    generatorId: string;
    active: boolean;
  };
  /** Émis quand un générateur tombe en panne */
  'generator:breakdown': {
    generatorId: string;
  };
  /** Émis quand un générateur est réparé */
  'generator:repaired': {
    generatorId: string;
  };
}

// ============================================================================
// HELPERS DE TYPAGE
// ============================================================================

/**
 * Helper pour créer un listener d'événement typé
 */
export type EventListener<T extends GameEvent> = T extends keyof GameEventPayloads
  ? (payload: GameEventPayloads[T]) => void
  : () => void;

/**
 * Helper pour vérifier si un événement a un payload défini
 */
export type HasPayload<T extends GameEvent> = T extends keyof GameEventPayloads ? true : false;
