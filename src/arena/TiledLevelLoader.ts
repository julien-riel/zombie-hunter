import { CoverType } from './Cover';
import { FlameDirection } from './FlameTrap';
import type { GameScene } from '@scenes/GameScene';

// ===========================================================================
// INTERFACES TILED (structure JSON)
// ===========================================================================

/**
 * Propriété d'un objet Tiled
 */
export interface TiledProperty {
  name: string;
  type: 'string' | 'int' | 'float' | 'bool' | 'color' | 'file' | 'object';
  value: string | number | boolean;
}

/**
 * Objet Tiled (dans un object layer)
 */
export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  rotation?: number;
  ellipse?: boolean;
  point?: boolean;
  properties?: TiledProperty[];
}

/**
 * Layer Tiled (tile layer ou object layer)
 */
export interface TiledLayer {
  id: number;
  name: string;
  type: 'tilelayer' | 'objectgroup';
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  data?: number[];
  objects?: TiledObject[];
}

/**
 * Tileset reference Tiled
 */
export interface TiledTilesetRef {
  firstgid: number;
  source: string;
}

/**
 * Structure complète d'une map Tiled
 */
export interface TiledMapData {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTilesetRef[];
  orientation: string;
  renderorder: string;
}

// ===========================================================================
// INTERFACES DE CONFIGURATION (output du loader)
// ===========================================================================

/**
 * Configuration du spawn joueur
 */
export interface PlayerSpawnConfig {
  x: number;
  y: number;
}

/**
 * Configuration d'une porte zombie
 */
export interface ZombieDoorConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  side: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Configuration d'une couverture
 */
export interface TiledCoverConfig {
  type: CoverType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  health?: number;
}

/**
 * Configuration d'une flaque (eau ou sang)
 */
export interface TiledPuddleConfig {
  x: number;
  y: number;
  radius?: number;
  isBlood: boolean;
}

/**
 * Configuration d'une zone de gravats
 */
export interface TiledDebrisConfig {
  x: number;
  y: number;
  radius?: number;
  slowFactor?: number;
}

/**
 * Configuration d'une zone électrique
 */
export interface TiledElectricConfig {
  x: number;
  y: number;
  radius?: number;
  active: boolean;
  damagePerSecond?: number;
  linkedGeneratorId?: string;
}

/**
 * Configuration d'une zone de feu
 */
export interface TiledFireConfig {
  x: number;
  y: number;
  radius?: number;
  duration?: number;
  damagePerSecond?: number;
}

/**
 * Configuration d'une zone d'acide
 */
export interface TiledAcidConfig {
  x: number;
  y: number;
  radius?: number;
  duration?: number;
  damagePerSecond?: number;
  slowFactor?: number;
}

/**
 * Configuration d'un baril explosif
 */
export interface TiledBarrelExplosiveConfig {
  x: number;
  y: number;
  damage?: number;
  radius?: number;
}

/**
 * Configuration d'un baril incendiaire
 */
export interface TiledBarrelFireConfig {
  x: number;
  y: number;
  fireDuration?: number;
  fireRadius?: number;
}

/**
 * Configuration d'un interrupteur
 */
export interface TiledSwitchConfig {
  id: string;
  x: number;
  y: number;
  linkedTargetIds: string[];
  defaultState: boolean;
}

/**
 * Configuration d'un générateur
 */
export interface TiledGeneratorConfig {
  id: string;
  x: number;
  y: number;
  linkedZoneIds: string[];
  defaultActive: boolean;
}

/**
 * Configuration d'un piège à flamme
 */
export interface TiledFlameTrapConfig {
  id: string;
  x: number;
  y: number;
  direction: FlameDirection;
  linkedSwitchId?: string;
  flameLength?: number;
  flameDuration?: number;
  damagePerSecond?: number;
}

/**
 * Configuration d'un piège à lame
 */
export interface TiledBladeTrapConfig {
  x: number;
  y: number;
  alwaysActive: boolean;
  damage?: number;
}

/**
 * Configuration d'un zombie pré-placé
 */
export interface TiledZombieConfig {
  type: string;
  x: number;
  y: number;
  waveSpawn?: number;
}

/**
 * Configuration d'un boss
 */
export interface TiledBossConfig {
  type: string;
  x: number;
  y: number;
  triggerWave?: number;
}

/**
 * Configuration d'un pickup
 */
export interface TiledPickupConfig {
  type: 'health' | 'ammo' | 'powerup' | 'melee_weapon';
  x: number;
  y: number;
  size?: 'small' | 'medium';
  powerupType?: string;
  weaponType?: string;
}

// ===========================================================================
// NOUVEAUX ÉLÉMENTS DE GAMEPLAY
// ===========================================================================

/**
 * Configuration d'un checkpoint
 */
export interface TiledCheckpointConfig {
  id: string;
  x: number;
  y: number;
  radius?: number;
  isRespawnPoint?: boolean;
}

/**
 * Configuration d'une saferoom
 */
export interface TiledSaferoomConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  healOnEnter?: boolean;
  healAmount?: number;
  clearZombies?: boolean;
  clearRadius?: number;
}

/**
 * Configuration d'un téléporteur
 */
export interface TiledTeleporterConfig {
  id: string;
  x: number;
  y: number;
  linkedTeleporterId?: string;
  radius?: number;
  cooldown?: number;
  bidirectional?: boolean;
}

/**
 * Type d'objectif
 */
export type TiledObjectiveType = 'defend' | 'collect' | 'reach' | 'eliminate' | 'escort' | 'activate';

/**
 * Configuration d'un marqueur d'objectif
 */
export interface TiledObjectiveMarkerConfig {
  id: string;
  x: number;
  y: number;
  type?: TiledObjectiveType;
  label?: string;
  radius?: number;
  color?: number;
  showOnMinimap?: boolean;
  pulseEffect?: boolean;
  arrowIndicator?: boolean;
}

/**
 * Configuration d'une zone à défendre
 */
export interface TiledDefendZoneConfig {
  id: string;
  x: number;
  y: number;
  radius?: number;
  duration?: number;
  zombieWaves?: number;
  zombiesPerWave?: number;
  waveInterval?: number;
  activateOnEnter?: boolean;
  requiredStayTime?: number;
}

/**
 * Direction d'ouverture d'une porte
 */
export type TiledDoorDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Configuration d'une porte automatique
 */
export interface TiledAutoDoorConfig {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  openDirection?: TiledDoorDirection;
  openDistance?: number;
  triggerRadius?: number;
  openSpeed?: number;
  closeDelay?: number;
  stayOpen?: boolean;
  requiresKey?: boolean;
  keyId?: string;
  blocksZombies?: boolean;
  blocksProjectiles?: boolean;
}

/**
 * Données complètes d'un niveau Tiled
 */
export interface TiledLevelData {
  /** Dimensions de la map en pixels */
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;

  /** Spawn du joueur */
  playerSpawn: PlayerSpawnConfig;

  /** Portes zombies */
  zombieDoors: ZombieDoorConfig[];

  /** Couvertures */
  covers: TiledCoverConfig[];

  /** Zones de terrain */
  puddles: TiledPuddleConfig[];
  debris: TiledDebrisConfig[];
  electricZones: TiledElectricConfig[];
  fireZones: TiledFireConfig[];
  acidZones: TiledAcidConfig[];

  /** Éléments interactifs */
  barrelExplosives: TiledBarrelExplosiveConfig[];
  barrelFires: TiledBarrelFireConfig[];
  switches: TiledSwitchConfig[];
  generators: TiledGeneratorConfig[];
  flameTraps: TiledFlameTrapConfig[];
  bladeTraps: TiledBladeTrapConfig[];

  /** Entités */
  zombies: TiledZombieConfig[];
  bosses: TiledBossConfig[];
  pickups: TiledPickupConfig[];

  /** Nouveaux éléments de gameplay */
  checkpoints: TiledCheckpointConfig[];
  saferooms: TiledSaferoomConfig[];
  teleporters: TiledTeleporterConfig[];
  objectiveMarkers: TiledObjectiveMarkerConfig[];
  defendZones: TiledDefendZoneConfig[];
  autoDoors: TiledAutoDoorConfig[];

  /** Tile layers pour le rendu */
  groundLayer: number[] | null;
  wallsLayer: number[] | null;
  decorationLayer: number[] | null;

  /** Données de collision des murs (tile-based) */
  wallCollisionTiles: { x: number; y: number }[];
}

// ===========================================================================
// CLASSE TILED LEVEL LOADER
// ===========================================================================

/**
 * Parse les fichiers Tiled JSON et extrait les configurations
 * pour créer une arène
 */
export class TiledLevelLoader {
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  /**
   * Charge et parse une map Tiled
   * @param mapKey Clé du tilemap dans le cache Phaser
   */
  public load(mapKey: string): TiledLevelData {
    // Les tilemaps chargés avec tilemapTiledJSON sont dans le cache tilemap
    const tilemapCache = this.scene.cache.tilemap.get(mapKey);

    if (!tilemapCache) {
      throw new Error(`Tilemap "${mapKey}" not found in cache`);
    }

    const mapData = tilemapCache.data as TiledMapData;

    const pixelWidth = mapData.width * mapData.tilewidth;
    const pixelHeight = mapData.height * mapData.tileheight;

    // Initialiser les données de niveau
    const levelData: TiledLevelData = {
      width: pixelWidth,
      height: pixelHeight,
      tileWidth: mapData.tilewidth,
      tileHeight: mapData.tileheight,
      playerSpawn: { x: pixelWidth / 2, y: pixelHeight / 2 },
      zombieDoors: [],
      covers: [],
      puddles: [],
      debris: [],
      electricZones: [],
      fireZones: [],
      acidZones: [],
      barrelExplosives: [],
      barrelFires: [],
      switches: [],
      generators: [],
      flameTraps: [],
      bladeTraps: [],
      zombies: [],
      bosses: [],
      pickups: [],
      checkpoints: [],
      saferooms: [],
      teleporters: [],
      objectiveMarkers: [],
      defendZones: [],
      autoDoors: [],
      groundLayer: null,
      wallsLayer: null,
      decorationLayer: null,
      wallCollisionTiles: [],
    };

    // Parser chaque layer
    for (const layer of mapData.layers) {
      if (layer.type === 'tilelayer') {
        this.parseTileLayer(layer, mapData, levelData);
      } else if (layer.type === 'objectgroup') {
        this.parseObjectLayer(layer, levelData);
      }
    }

    return levelData;
  }

  /**
   * Parse un tile layer
   */
  private parseTileLayer(
    layer: TiledLayer,
    mapData: TiledMapData,
    levelData: TiledLevelData
  ): void {
    const name = layer.name.toLowerCase();

    if (name === 'ground' || name === 'floor' || name === 'sol') {
      levelData.groundLayer = layer.data ?? null;
    } else if (name === 'walls' || name === 'murs' || name === 'collision') {
      levelData.wallsLayer = layer.data ?? null;
      // Extraire les positions de collision
      if (layer.data) {
        this.extractWallCollisions(layer.data, mapData, levelData);
      }
    } else if (name === 'decoration' || name === 'decor' || name === 'deco') {
      levelData.decorationLayer = layer.data ?? null;
    }
  }

  /**
   * Extrait les positions des tiles de collision
   */
  private extractWallCollisions(
    data: number[],
    mapData: TiledMapData,
    levelData: TiledLevelData
  ): void {
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== 0) {
        const x = (i % mapData.width) * mapData.tilewidth + mapData.tilewidth / 2;
        const y = Math.floor(i / mapData.width) * mapData.tileheight + mapData.tileheight / 2;
        levelData.wallCollisionTiles.push({ x, y });
      }
    }
  }

  /**
   * Parse un object layer
   */
  private parseObjectLayer(layer: TiledLayer, levelData: TiledLevelData): void {
    const name = layer.name.toLowerCase();
    const objects = layer.objects ?? [];

    if (name === 'spawns' || name === 'spawn') {
      this.parseSpawnsLayer(objects, levelData);
    } else if (name === 'covers' || name === 'obstacles') {
      this.parseCoversLayer(objects, levelData);
    } else if (name === 'terrain_zones' || name === 'terrain' || name === 'zones') {
      this.parseTerrainLayer(objects, levelData);
    } else if (name === 'interactive' || name === 'interactifs') {
      this.parseInteractiveLayer(objects, levelData);
    } else if (name === 'zombies' || name === 'enemies') {
      this.parseZombiesLayer(objects, levelData);
    } else if (name === 'bosses' || name === 'boss') {
      this.parseBossesLayer(objects, levelData);
    } else if (name === 'pickups' || name === 'items') {
      this.parsePickupsLayer(objects, levelData);
    } else if (name === 'objectives' || name === 'campaign') {
      this.parseObjectivesLayer(objects, levelData);
    } else if (name === 'doors' || name === 'auto_doors') {
      this.parseAutoDoorLayer(objects, levelData);
    }
  }

  /**
   * Parse le layer des spawns
   */
  private parseSpawnsLayer(objects: TiledObject[], levelData: TiledLevelData): void {
    for (const obj of objects) {
      const type = obj.type.toLowerCase();

      if (type === 'player_spawn' || type === 'playerspawn') {
        levelData.playerSpawn = {
          x: obj.point ? obj.x : obj.x + obj.width / 2,
          y: obj.point ? obj.y : obj.y + obj.height / 2,
        };
      } else if (type === 'zombie_door' || type === 'zombiedoor') {
        const side = this.getStringProperty(obj, 'side', 'top') as
          | 'top'
          | 'bottom'
          | 'left'
          | 'right';
        levelData.zombieDoors.push({
          x: obj.x + obj.width / 2,
          y: obj.y + obj.height / 2,
          width: obj.width,
          height: obj.height,
          side,
        });
      }
    }
  }

  /**
   * Parse le layer des couvertures
   */
  private parseCoversLayer(objects: TiledObject[], levelData: TiledLevelData): void {
    for (const obj of objects) {
      const type = obj.type.toLowerCase();
      let coverType: CoverType;

      switch (type) {
        case 'pillar':
          coverType = CoverType.PILLAR;
          break;
        case 'halfwall':
        case 'half_wall':
          coverType = CoverType.HALF_WALL;
          break;
        case 'table':
          coverType = CoverType.TABLE;
          break;
        case 'crate':
          coverType = CoverType.CRATE;
          break;
        case 'shelf':
          coverType = CoverType.SHELF;
          break;
        case 'barricade':
          coverType = CoverType.BARRICADE;
          break;
        default:
          console.warn(`Unknown cover type: ${type}`);
          continue;
      }

      levelData.covers.push({
        type: coverType,
        x: obj.x + obj.width / 2,
        y: obj.y + obj.height / 2,
        width: obj.width,
        height: obj.height,
        health: this.getIntProperty(obj, 'health'),
      });
    }
  }

  /**
   * Parse le layer des zones de terrain
   */
  private parseTerrainLayer(objects: TiledObject[], levelData: TiledLevelData): void {
    for (const obj of objects) {
      const type = obj.type.toLowerCase();
      const centerX = obj.x + obj.width / 2;
      const centerY = obj.y + obj.height / 2;
      const radius = Math.max(obj.width, obj.height) / 2;

      switch (type) {
        case 'puddle':
          levelData.puddles.push({
            x: centerX,
            y: centerY,
            radius,
            isBlood: this.getBoolProperty(obj, 'isBlood', false),
          });
          break;

        case 'debris':
          levelData.debris.push({
            x: centerX,
            y: centerY,
            radius,
            slowFactor: this.getFloatProperty(obj, 'slowFactor'),
          });
          break;

        case 'electric':
          levelData.electricZones.push({
            x: centerX,
            y: centerY,
            radius,
            active: this.getBoolProperty(obj, 'active', false),
            damagePerSecond: this.getIntProperty(obj, 'damagePerSecond'),
            linkedGeneratorId: this.getStringProperty(obj, 'linkedGeneratorId'),
          });
          break;

        case 'fire':
          levelData.fireZones.push({
            x: centerX,
            y: centerY,
            radius,
            duration: this.getIntProperty(obj, 'duration'),
            damagePerSecond: this.getIntProperty(obj, 'damagePerSecond'),
          });
          break;

        case 'acid':
          levelData.acidZones.push({
            x: centerX,
            y: centerY,
            radius,
            duration: this.getIntProperty(obj, 'duration'),
            damagePerSecond: this.getIntProperty(obj, 'damagePerSecond'),
            slowFactor: this.getFloatProperty(obj, 'slowFactor'),
          });
          break;

        default:
          console.warn(`Unknown terrain type: ${type}`);
      }
    }
  }

  /**
   * Parse le layer des éléments interactifs
   */
  private parseInteractiveLayer(objects: TiledObject[], levelData: TiledLevelData): void {
    for (const obj of objects) {
      const type = obj.type.toLowerCase();
      const centerX = obj.x + obj.width / 2;
      const centerY = obj.y + obj.height / 2;

      switch (type) {
        case 'barrel_explosive':
        case 'barrelexplosive':
          levelData.barrelExplosives.push({
            x: centerX,
            y: centerY,
            damage: this.getIntProperty(obj, 'damage'),
            radius: this.getIntProperty(obj, 'radius'),
          });
          break;

        case 'barrel_fire':
        case 'barrelfire':
          levelData.barrelFires.push({
            x: centerX,
            y: centerY,
            fireDuration: this.getIntProperty(obj, 'fireDuration'),
            fireRadius: this.getIntProperty(obj, 'fireRadius'),
          });
          break;

        case 'switch': {
          const linkedTargets = this.getStringProperty(obj, 'linkedTargetIds', '');
          levelData.switches.push({
            id: obj.name,
            x: centerX,
            y: centerY,
            linkedTargetIds: linkedTargets ? linkedTargets.split(',').map((s) => s.trim()) : [],
            defaultState: this.getBoolProperty(obj, 'defaultState', false),
          });
          break;
        }

        case 'generator': {
          const linkedZones = this.getStringProperty(obj, 'linkedZoneIds', '');
          levelData.generators.push({
            id: obj.name,
            x: centerX,
            y: centerY,
            linkedZoneIds: linkedZones ? linkedZones.split(',').map((s) => s.trim()) : [],
            defaultActive: this.getBoolProperty(obj, 'defaultActive', false),
          });
          break;
        }

        case 'flame_trap':
        case 'flametrap': {
          const dirStr = this.getStringProperty(obj, 'direction', 'right')?.toLowerCase();
          let direction: FlameDirection;
          switch (dirStr) {
            case 'up':
              direction = FlameDirection.UP;
              break;
            case 'down':
              direction = FlameDirection.DOWN;
              break;
            case 'left':
              direction = FlameDirection.LEFT;
              break;
            default:
              direction = FlameDirection.RIGHT;
          }
          levelData.flameTraps.push({
            id: obj.name,
            x: centerX,
            y: centerY,
            direction,
            linkedSwitchId: this.getStringProperty(obj, 'linkedSwitchId'),
            flameLength: this.getIntProperty(obj, 'flameLength'),
            flameDuration: this.getIntProperty(obj, 'flameDuration'),
            damagePerSecond: this.getIntProperty(obj, 'damagePerSecond'),
          });
          break;
        }

        case 'blade_trap':
        case 'bladetrap':
          levelData.bladeTraps.push({
            x: centerX,
            y: centerY,
            alwaysActive: this.getBoolProperty(obj, 'alwaysActive', true),
            damage: this.getIntProperty(obj, 'damage'),
          });
          break;

        default:
          console.warn(`Unknown interactive type: ${type}`);
      }
    }
  }

  /**
   * Parse le layer des zombies
   */
  private parseZombiesLayer(objects: TiledObject[], levelData: TiledLevelData): void {
    for (const obj of objects) {
      levelData.zombies.push({
        type: obj.type,
        x: obj.point ? obj.x : obj.x + obj.width / 2,
        y: obj.point ? obj.y : obj.y + obj.height / 2,
        waveSpawn: this.getIntProperty(obj, 'waveSpawn'),
      });
    }
  }

  /**
   * Parse le layer des boss
   */
  private parseBossesLayer(objects: TiledObject[], levelData: TiledLevelData): void {
    for (const obj of objects) {
      levelData.bosses.push({
        type: obj.type,
        x: obj.point ? obj.x : obj.x + obj.width / 2,
        y: obj.point ? obj.y : obj.y + obj.height / 2,
        triggerWave: this.getIntProperty(obj, 'triggerWave'),
      });
    }
  }

  /**
   * Parse le layer des pickups
   */
  private parsePickupsLayer(objects: TiledObject[], levelData: TiledLevelData): void {
    for (const obj of objects) {
      const type = obj.type.toLowerCase();
      let pickupType: 'health' | 'ammo' | 'powerup' | 'melee_weapon';

      switch (type) {
        case 'health_drop':
        case 'healthdrop':
          pickupType = 'health';
          break;
        case 'ammo_drop':
        case 'ammodrop':
          pickupType = 'ammo';
          break;
        case 'powerup_drop':
        case 'powerupdrop':
          pickupType = 'powerup';
          break;
        case 'melee_weapon_drop':
        case 'meleeweapondrop':
          pickupType = 'melee_weapon';
          break;
        default:
          console.warn(`Unknown pickup type: ${type}`);
          continue;
      }

      levelData.pickups.push({
        type: pickupType,
        x: obj.point ? obj.x : obj.x + obj.width / 2,
        y: obj.point ? obj.y : obj.y + obj.height / 2,
        size: this.getStringProperty(obj, 'size') as 'small' | 'medium' | undefined,
        powerupType: this.getStringProperty(obj, 'type'),
        weaponType: this.getStringProperty(obj, 'weaponType'),
      });
    }
  }

  // ===========================================================================
  // NOUVEAUX LAYERS DE GAMEPLAY
  // ===========================================================================

  /**
   * Parse le layer des objectifs (checkpoints, saferooms, teleporters, etc.)
   */
  private parseObjectivesLayer(objects: TiledObject[], levelData: TiledLevelData): void {
    for (const obj of objects) {
      const type = obj.type.toLowerCase();
      const centerX = obj.x + obj.width / 2;
      const centerY = obj.y + obj.height / 2;

      switch (type) {
        case 'checkpoint':
          levelData.checkpoints.push({
            id: obj.name || `checkpoint_${obj.id}`,
            x: centerX,
            y: centerY,
            radius: this.getIntProperty(obj, 'radius'),
            isRespawnPoint: this.getBoolProperty(obj, 'isRespawnPoint', true),
          });
          break;

        case 'saferoom':
        case 'safe_room':
          levelData.saferooms.push({
            x: centerX,
            y: centerY,
            width: obj.width,
            height: obj.height,
            healOnEnter: this.getBoolProperty(obj, 'healOnEnter', true),
            healAmount: this.getIntProperty(obj, 'healAmount'),
            clearZombies: this.getBoolProperty(obj, 'clearZombies', true),
            clearRadius: this.getIntProperty(obj, 'clearRadius'),
          });
          break;

        case 'teleporter':
        case 'portal':
          levelData.teleporters.push({
            id: obj.name || `teleporter_${obj.id}`,
            x: centerX,
            y: centerY,
            linkedTeleporterId: this.getStringProperty(obj, 'linkedTeleporterId'),
            radius: this.getIntProperty(obj, 'radius'),
            cooldown: this.getIntProperty(obj, 'cooldown'),
            bidirectional: this.getBoolProperty(obj, 'bidirectional', true),
          });
          break;

        case 'objective_marker':
        case 'objectivemarker':
        case 'objective': {
          const objType = this.getStringProperty(obj, 'objectiveType', 'reach');
          levelData.objectiveMarkers.push({
            id: obj.name || `objective_${obj.id}`,
            x: centerX,
            y: centerY,
            type: objType as TiledObjectiveType,
            label: this.getStringProperty(obj, 'label'),
            radius: this.getIntProperty(obj, 'radius'),
            color: this.getIntProperty(obj, 'color'),
            showOnMinimap: this.getBoolProperty(obj, 'showOnMinimap', true),
            pulseEffect: this.getBoolProperty(obj, 'pulseEffect', true),
            arrowIndicator: this.getBoolProperty(obj, 'arrowIndicator', true),
          });
          break;
        }

        case 'defend_zone':
        case 'defendzone':
        case 'defend':
          levelData.defendZones.push({
            id: obj.name || `defend_${obj.id}`,
            x: centerX,
            y: centerY,
            radius: this.getIntProperty(obj, 'radius') ?? Math.max(obj.width, obj.height) / 2,
            duration: this.getIntProperty(obj, 'duration'),
            zombieWaves: this.getIntProperty(obj, 'zombieWaves'),
            zombiesPerWave: this.getIntProperty(obj, 'zombiesPerWave'),
            waveInterval: this.getIntProperty(obj, 'waveInterval'),
            activateOnEnter: this.getBoolProperty(obj, 'activateOnEnter', true),
            requiredStayTime: this.getIntProperty(obj, 'requiredStayTime'),
          });
          break;

        default:
          // Ignore unknown types in objectives layer
          break;
      }
    }
  }

  /**
   * Parse le layer des portes automatiques
   */
  private parseAutoDoorLayer(objects: TiledObject[], levelData: TiledLevelData): void {
    for (const obj of objects) {
      const type = obj.type.toLowerCase();

      if (type === 'auto_door' || type === 'autodoor' || type === 'door') {
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        const dirStr = this.getStringProperty(obj, 'openDirection', 'up')?.toLowerCase();

        levelData.autoDoors.push({
          id: obj.name || `door_${obj.id}`,
          x: centerX,
          y: centerY,
          width: obj.width,
          height: obj.height,
          openDirection: dirStr as TiledDoorDirection,
          openDistance: this.getIntProperty(obj, 'openDistance'),
          triggerRadius: this.getIntProperty(obj, 'triggerRadius'),
          openSpeed: this.getFloatProperty(obj, 'openSpeed'),
          closeDelay: this.getIntProperty(obj, 'closeDelay'),
          stayOpen: this.getBoolProperty(obj, 'stayOpen', false),
          requiresKey: this.getBoolProperty(obj, 'requiresKey', false),
          keyId: this.getStringProperty(obj, 'keyId'),
          blocksZombies: this.getBoolProperty(obj, 'blocksZombies', true),
          blocksProjectiles: this.getBoolProperty(obj, 'blocksProjectiles', false),
        });
      }
    }
  }

  // ===========================================================================
  // HELPERS POUR LES PROPRIÉTÉS
  // ===========================================================================

  /**
   * Récupère une propriété string
   */
  private getStringProperty(
    obj: TiledObject,
    name: string,
    defaultValue?: string
  ): string | undefined {
    const prop = obj.properties?.find((p) => p.name === name);
    if (prop && typeof prop.value === 'string') {
      return prop.value;
    }
    return defaultValue;
  }

  /**
   * Récupère une propriété int
   */
  private getIntProperty(
    obj: TiledObject,
    name: string,
    defaultValue?: number
  ): number | undefined {
    const prop = obj.properties?.find((p) => p.name === name);
    if (prop && typeof prop.value === 'number') {
      return Math.floor(prop.value);
    }
    return defaultValue;
  }

  /**
   * Récupère une propriété float
   */
  private getFloatProperty(
    obj: TiledObject,
    name: string,
    defaultValue?: number
  ): number | undefined {
    const prop = obj.properties?.find((p) => p.name === name);
    if (prop && typeof prop.value === 'number') {
      return prop.value;
    }
    return defaultValue;
  }

  /**
   * Récupère une propriété bool
   */
  private getBoolProperty(obj: TiledObject, name: string, defaultValue: boolean = false): boolean {
    const prop = obj.properties?.find((p) => p.name === name);
    if (prop && typeof prop.value === 'boolean') {
      return prop.value;
    }
    return defaultValue;
  }
}
