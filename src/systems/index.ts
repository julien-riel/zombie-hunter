export { CombatSystem } from './CombatSystem';
export { ComboSystem } from './ComboSystem';
export { DropSystem } from './DropSystem';
export { PowerUpSystem } from './PowerUpSystem';
export type { ActivePowerUpInfo } from './PowerUpSystem';
export { ActiveItemSystem } from './ActiveItemSystem';
export type { ActiveItemInventoryInfo, DeployedActiveItemInfo } from './ActiveItemSystem';
export { UpgradeSystem } from './UpgradeSystem';
export type { AppliedUpgrade } from './UpgradeSystem';
export { EconomySystem } from './EconomySystem';
export type { PurchaseType, PurchaseInfo } from './EconomySystem';
export { ProgressionSystem } from './ProgressionSystem';
export type { PermanentModifiers, GameEndSummary, XPCalculationResult, ProgressionStats } from './ProgressionSystem';
export { SpawnSystem } from './SpawnSystem';
export { WaveSystem } from './WaveSystem';
export type { WaveConfig, SpawnGroup, WaveState } from './WaveSystem';

// Phase 7.4 - Événements Spéciaux
export {
  EventSystem,
  type EventSystemConfig,
  SpecialEventType,
  EventState,
  type SpecialEvent,
  type SpecialEventConfig,
} from './events';

// Phase 4 - Armes Expérimentales
export { WeaponUnlockSystem } from './WeaponUnlockSystem';
export type { WeaponUnlockState, WeaponUnlockEvent } from './WeaponUnlockSystem';
export { WeaponAchievementSystem } from './WeaponAchievementSystem';
export type { Achievement, AchievementProgress } from './WeaponAchievementSystem';

// Système d'Inventaire
export { WeaponRegistry } from './WeaponRegistry';
