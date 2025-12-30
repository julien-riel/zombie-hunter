/**
 * Phase 7.4 - Événements Spéciaux
 * Barrel exports pour le système d'événements
 */

// Types et interfaces
export {
  SpecialEventType,
  EventState,
  type EventDuration,
  type SpecialEvent,
  type SpecialEventConfig,
  BaseSpecialEvent,
} from './SpecialEvent';

// Système principal
export { EventSystem, type EventSystemConfig } from './EventSystem';

// Événements individuels
export { BlackoutEvent } from './BlackoutEvent';
export { HordeEvent } from './HordeEvent';
export { OverheatedDoorEvent } from './OverheatedDoorEvent';
export { BossRushEvent } from './BossRushEvent';
