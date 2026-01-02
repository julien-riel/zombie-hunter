export {
  Door,
  DoorState,
  DoorTrapType,
  BarricadeType,
} from './Door';
export type { DoorConfig, DoorTrapConfig } from './Door';
export { Cover, CoverType } from './Cover';
export type { CoverConfig, CoverData } from './Cover';

// Terrain Zones (Phase 5.2)
export { TerrainZone, TerrainType } from './TerrainZone';
export type { TerrainZoneConfig, TerrainZoneData } from './TerrainZone';
export { PuddleZone } from './PuddleZone';
export type { PuddleConfig } from './PuddleZone';
export { DebrisZone } from './DebrisZone';
export type { DebrisConfig } from './DebrisZone';
export { ElectricZone } from './ElectricZone';
export type { ElectricZoneConfig } from './ElectricZone';
export { FireZone } from './FireZone';
export type { FireZoneConfig } from './FireZone';
export { AcidZone } from './AcidZone';
export type { AcidZoneConfig } from './AcidZone';

// Interactive Elements (Phase 5.3)
export { Interactive, InteractiveType, TriggerType } from './Interactive';
export type { InteractiveConfig, InteractiveData } from './Interactive';
export { BarrelExplosive } from './BarrelExplosive';
export type { BarrelExplosiveConfig } from './BarrelExplosive';
export { BarrelFire } from './BarrelFire';
export type { BarrelFireConfig } from './BarrelFire';
export { Switch } from './Switch';
export type { SwitchConfig } from './Switch';
export { Generator } from './Generator';
export type { GeneratorConfig } from './Generator';
export { FlameTrap, FlameDirection } from './FlameTrap';
export type { FlameTrapConfig } from './FlameTrap';
export { BladeTrap } from './BladeTrap';
export type { BladeTrapConfig } from './BladeTrap';

// Tiled Level Loader & Arena
export { TiledLevelLoader } from './TiledLevelLoader';
export { TiledArena } from './TiledArena';
export type { ObstacleData } from './TiledArena';
export type {
  TiledProperty,
  TiledObject,
  TiledLayer,
  TiledTilesetRef,
  TiledMapData,
  PlayerSpawnConfig,
  ZombieDoorConfig,
  TiledCoverConfig,
  TiledPuddleConfig,
  TiledDebrisConfig,
  TiledElectricConfig,
  TiledFireConfig,
  TiledAcidConfig,
  TiledBarrelExplosiveConfig,
  TiledBarrelFireConfig,
  TiledSwitchConfig,
  TiledGeneratorConfig,
  TiledFlameTrapConfig,
  TiledBladeTrapConfig,
  TiledZombieConfig,
  TiledBossConfig,
  TiledPickupConfig,
  TiledLevelData,
  TiledCheckpointConfig,
  TiledSaferoomConfig,
  TiledTeleporterConfig,
  TiledObjectiveType,
  TiledObjectiveMarkerConfig,
  TiledDefendZoneConfig,
  TiledDoorDirection,
  TiledAutoDoorConfig,
} from './TiledLevelLoader';

// New Gameplay Elements
export { Checkpoint } from './Checkpoint';
export type { CheckpointConfig } from './Checkpoint';
export { Saferoom } from './Saferoom';
export type { SaferoomConfig } from './Saferoom';
export { Teleporter } from './Teleporter';
export type { TeleporterConfig } from './Teleporter';
export { ObjectiveMarker } from './ObjectiveMarker';
export type { ObjectiveMarkerConfig, ObjectiveType } from './ObjectiveMarker';
export { DefendZone } from './DefendZone';
export type { DefendZoneConfig } from './DefendZone';
export { AutoDoor } from './AutoDoor';
export type { AutoDoorConfig, DoorDirection } from './AutoDoor';
