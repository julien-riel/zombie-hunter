/**
 * Types liés à l'arène et au terrain
 */

export type ArenaType = 'hospital' | 'mall' | 'metro' | 'lab' | 'prison';

export type DoorState = 'inactive' | 'active' | 'open' | 'barricaded' | 'destroyed';

export type TerrainEffectType = 'slow' | 'damage' | 'electric';

export type CoverType = 'pillar' | 'wall' | 'furniture';

export interface DoorConfig {
  id: string;
  x: number;
  y: number;
  direction: 'north' | 'south' | 'east' | 'west';
}

export interface TerrainZoneConfig {
  type: TerrainEffectType;
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
}

export interface ArenaConfig {
  type: ArenaType;
  width: number;
  height: number;
  doors: DoorConfig[];
  terrainZones: TerrainZoneConfig[];
}
