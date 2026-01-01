# Plan d'intégration Tiled pour Zombie Hunter

## Vue d'ensemble

Remplacement du système de niveaux hardcodés par un système basé sur Tiled.
Tous les niveaux (survival et campagne) seront définis via Tiled.

---

## PARTIE A: Setup Tiled

### Phase 1: Génération du tileset placeholder

**Objectif:** Créer un tileset fonctionnel pour concevoir les niveaux dans Tiled.

**Fichiers à créer:**
- `public/assets/tilemaps/zombie_tileset.png` (512x384 pixels, 16x12 tuiles de 32x32)
- `public/assets/tilemaps/zombie_tileset.tsx`

**Organisation du tileset (192 tuiles):**

| Ligne | Tuiles | Description |
|-------|--------|-------------|
| 0-1 | 0-31 | Sol (béton, carrelage, sang, grille) |
| 2-3 | 32-63 | Murs (solide, endommagé, renforcé, coins) |
| 4 | 64-79 | Portes (active, inactive, ouverte, détruite) |
| 5 | 80-95 | Covers (pilier, mur, table, caisse, étagère, barricade) |
| 6 | 96-111 | Zones terrain (flaque, débris, électrique, feu, acide) |
| 7 | 112-127 | Interactifs (barils, switches, générateurs, pièges) |
| 8-9 | 128-159 | Spawns et marqueurs (joueur, portes zombies, objectifs) |
| 10-11 | 160-191 | Décoration et futurs éléments |

**Couleurs par catégorie:**
- Sol: Gris foncé (#2c3e50, #34495e)
- Murs: Gris clair (#7f8c8d)
- Portes: Bleu (#3498db)
- Covers: Marron (#8b4513)
- Zones danger: Rouge/Orange/Jaune
- Interactifs: Vert (#27ae60)
- Spawns: Cyan (#00bcd4)

---

### Phase 2: Création des maps Tiled

**Objectif:** Créer 6 maps fonctionnelles testables dans Tiled.

#### 2.1 Configuration du projet Tiled

**Fichier:** `public/assets/tilemaps/project.tiled-project`

```json
{
  "automappingRulesFile": "",
  "commands": [],
  "extensionsPath": "extensions",
  "folders": ["."],
  "objectTypesFile": "objecttypes.json",
  "propertyTypes": []
}
```

**Fichier:** `public/assets/tilemaps/objecttypes.json`

Définit tous les types d'objets avec leurs propriétés par défaut.

#### 2.2 Structure des layers (pour chaque map)

```
Map (40x22 tuiles, 1280x704 pixels)
├── Tile Layers
│   ├── ground (sol de base)
│   ├── walls (murs avec collision)
│   └── decoration (éléments visuels non-collisionnables)
├── Object Layers
│   ├── spawns
│   │   ├── player_spawn (point)
│   │   └── zombie_door (rectangle, propriété: side)
│   ├── covers
│   │   ├── pillar (rectangle)
│   │   ├── halfWall (rectangle)
│   │   ├── table (rectangle)
│   │   ├── crate (rectangle)
│   │   ├── shelf (rectangle)
│   │   └── barricade (rectangle)
│   ├── terrain_zones
│   │   ├── puddle (ellipse)
│   │   ├── debris (ellipse)
│   │   ├── electric (ellipse)
│   │   ├── fire (ellipse)
│   │   └── acid (ellipse)
│   ├── interactive
│   │   ├── barrel_explosive (rectangle)
│   │   ├── barrel_fire (rectangle)
│   │   ├── switch (rectangle)
│   │   ├── generator (rectangle)
│   │   ├── flame_trap (rectangle)
│   │   └── blade_trap (rectangle)
│   └── pickups
│       ├── health_drop (point)
│       ├── ammo_drop (point)
│       ├── powerup_drop (point)
│       └── weapon_drop (point)
```

#### 2.3 Maps à créer

| Fichier | Description | Thème |
|---------|-------------|-------|
| `default_arena.json` | Arène survival (reproduction du layout actuel) | Entrepôt |
| `hospital.json` | Niveau campagne 1 | Hôpital abandonné |
| `hall.json` | Niveau campagne 2 | Hall de gare |
| `warehouse.json` | Niveau campagne 3 | Entrepôt |
| `subway.json` | Niveau campagne 4 | Station de métro |
| `laboratory.json` | Niveau campagne 5 | Laboratoire secret |

#### 2.4 Layout de default_arena.json (équivalent Arena.ts actuel)

```
Dimensions: 1280x720 (40x22.5 tuiles)

Murs: Périmètre complet avec gaps pour portes
  - Épaisseur: 32px
  - Gaps aux positions:
    - Top: 25% et 75% de la largeur
    - Bottom: 25% et 75% de la largeur
    - Left: 33% et 67% de la hauteur
    - Right: 33% et 67% de la hauteur

Portes zombies (8):
  - Top-left door: (320, 16)
  - Top-right door: (960, 16)
  - Bottom-left door: (320, 704)
  - Bottom-right door: (960, 704)
  - Left-top door: (16, 240)
  - Left-bottom door: (16, 480)
  - Right-top door: (1264, 240)
  - Right-bottom door: (1264, 480)

Player spawn: (640, 360) - centre de l'arène

Covers (11):
  - 6 pilliers (coins et centre)
  - 2 half-walls (gauche et droite)
  - 2 tables (centre)
  - 1 shelf (centre-haut)

Terrain zones (5):
  - 2 puddles (aléatoires)
  - 1 debris (centre-bas)
  - 1 electric zone (optionnel)
  - 1 acid zone (optionnel)
```

#### 2.5 Templates d'objets

**Dossier:** `public/assets/tilemaps/templates/`

Créer des templates réutilisables pour chaque type d'objet:

```
templates/
├── spawns/
│   ├── player_spawn.tx
│   └── zombie_door.tx
├── covers/
│   ├── pillar_64x64.tx
│   ├── halfWall_128x32.tx
│   ├── table_64x48.tx
│   └── ...
├── terrain/
│   ├── puddle.tx
│   └── ...
└── interactive/
    ├── barrel_explosive.tx
    └── ...
```

---

## PARTIE B: Intégration dans le jeu

### Phase 3: TiledLevelLoader

**Fichier:** `src/arena/TiledLevelLoader.ts`

```typescript
export interface TiledLevelData {
  tilemap: Phaser.Tilemaps.Tilemap;
  groundLayer: Phaser.Tilemaps.TilemapLayer | null;
  wallsLayer: Phaser.Tilemaps.TilemapLayer | null;
  playerSpawn: { x: number; y: number };
  doorConfigs: DoorConfig[];
  coverConfigs: CoverConfig[];
  terrainZoneConfigs: TerrainZoneConfig[];
  interactiveConfigs: InteractiveConfig[];
}

export class TiledLevelLoader {
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  public load(mapKey: string): TiledLevelData {
    // 1. Créer le tilemap
    const tilemap = this.scene.make.tilemap({ key: mapKey });

    // 2. Ajouter le tileset
    const tileset = tilemap.addTilesetImage('zombie_tileset', 'zombie_tileset');

    // 3. Créer les tile layers
    const groundLayer = tilemap.createLayer('ground', tileset, 0, 0);
    const wallsLayer = tilemap.createLayer('walls', tileset, 0, 0);

    // 4. Configurer les collisions sur walls
    if (wallsLayer) {
      wallsLayer.setCollisionByProperty({ collision: true });
    }

    // 5. Parser les object layers
    return {
      tilemap,
      groundLayer,
      wallsLayer,
      playerSpawn: this.parsePlayerSpawn(tilemap),
      doorConfigs: this.parseDoors(tilemap),
      coverConfigs: this.parseCovers(tilemap),
      terrainZoneConfigs: this.parseTerrainZones(tilemap),
      interactiveConfigs: this.parseInteractives(tilemap),
    };
  }

  private parsePlayerSpawn(tilemap: Phaser.Tilemaps.Tilemap): { x: number; y: number } {
    const layer = tilemap.getObjectLayer('spawns');
    if (!layer) return { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };

    const spawn = layer.objects.find(obj => obj.name === 'player_spawn');
    return spawn ? { x: spawn.x!, y: spawn.y! } : { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  }

  private parseDoors(tilemap: Phaser.Tilemaps.Tilemap): DoorConfig[] {
    const layer = tilemap.getObjectLayer('spawns');
    if (!layer) return [];

    return layer.objects
      .filter(obj => obj.type === 'zombie_door')
      .map(obj => ({
        x: obj.x! + (obj.width || 0) / 2,
        y: obj.y! + (obj.height || 0) / 2,
        side: this.getProperty(obj, 'side', 'top'),
      }));
  }

  private parseCovers(tilemap: Phaser.Tilemaps.Tilemap): CoverConfig[] {
    const layer = tilemap.getObjectLayer('covers');
    if (!layer) return [];

    return layer.objects.map(obj => ({
      type: obj.type as CoverType,
      x: obj.x! + (obj.width || 32) / 2,
      y: obj.y! + (obj.height || 32) / 2,
      width: obj.width,
      height: obj.height,
    }));
  }

  private parseTerrainZones(tilemap: Phaser.Tilemaps.Tilemap): TerrainZoneConfig[] {
    const layer = tilemap.getObjectLayer('terrain_zones');
    if (!layer) return [];

    return layer.objects.map(obj => ({
      type: obj.type as TerrainType,
      x: obj.x! + (obj.width || 64) / 2,
      y: obj.y! + (obj.height || 64) / 2,
      radius: Math.max(obj.width || 64, obj.height || 64) / 2,
      ...this.extractTerrainProperties(obj),
    }));
  }

  private parseInteractives(tilemap: Phaser.Tilemaps.Tilemap): InteractiveConfig[] {
    const layer = tilemap.getObjectLayer('interactive');
    if (!layer) return [];

    return layer.objects.map(obj => ({
      type: obj.type as InteractiveType,
      x: obj.x! + (obj.width || 32) / 2,
      y: obj.y! + (obj.height || 32) / 2,
      ...this.extractInteractiveProperties(obj),
    }));
  }

  private getProperty<T>(obj: Phaser.Types.Tilemaps.TiledObject, name: string, defaultValue: T): T {
    if (!obj.properties) return defaultValue;
    const prop = obj.properties.find((p: any) => p.name === name);
    return prop ? prop.value : defaultValue;
  }
}
```

---

### Phase 4: TiledArena

**Fichier:** `src/arena/TiledArena.ts`

```typescript
import { Arena, ObstacleData } from './Arena';
import { TiledLevelLoader, TiledLevelData } from './TiledLevelLoader';
import type { GameScene } from '@scenes/GameScene';

export class TiledArena extends Arena {
  private tiledData: TiledLevelData;
  private levelLoader: TiledLevelLoader;
  private mapKey: string;

  constructor(scene: GameScene, mapKey: string) {
    super(scene, true); // true = skip default creation

    this.mapKey = mapKey;
    this.levelLoader = new TiledLevelLoader(scene);
    this.tiledData = this.levelLoader.load(mapKey);

    this.createFromTiled();
  }

  private createFromTiled(): void {
    // 1. Créer les murs depuis le tile layer (collision automatique)
    this.setupWallCollisions();

    // 2. Créer les portes
    for (const config of this.tiledData.doorConfigs) {
      const door = new Door(this.scene, config);
      this.doors.push(door);
    }

    // 3. Créer les covers
    for (const config of this.tiledData.coverConfigs) {
      this.createCover(config);
    }

    // 4. Créer les zones de terrain
    for (const config of this.tiledData.terrainZoneConfigs) {
      this.createTerrainZone(config);
    }

    // 5. Créer les éléments interactifs
    for (const config of this.tiledData.interactiveConfigs) {
      this.createInteractive(config);
    }
  }

  private setupWallCollisions(): void {
    if (this.tiledData.wallsLayer) {
      // Les collisions sont déjà configurées dans TiledLevelLoader
      // Ajouter le layer au système de collision
      this.scene.physics.add.collider(
        this.scene.player,
        this.tiledData.wallsLayer
      );
    }
  }

  public getPlayerSpawn(): { x: number; y: number } {
    return this.tiledData.playerSpawn;
  }

  public getObstacles(): ObstacleData[] {
    const obstacles = super.getObstacles();

    // Ajouter les tuiles de mur pour le pathfinding
    if (this.tiledData.wallsLayer) {
      const layer = this.tiledData.tilemap.getLayer('walls');
      if (layer) {
        layer.data.forEach((row, y) => {
          row.forEach((tile, x) => {
            if (tile.index !== -1 && tile.properties?.collision) {
              obstacles.push({
                x: x * TILE_SIZE + TILE_SIZE / 2,
                y: y * TILE_SIZE + TILE_SIZE / 2,
                width: TILE_SIZE,
                height: TILE_SIZE,
              });
            }
          });
        });
      }
    }

    return obstacles;
  }
}
```

---

### Phase 5: Intégration PreloadScene

**Fichier:** `src/scenes/PreloadScene.ts`

Ajouter dans la méthode `preload()`:

```typescript
preload(): void {
  this.createLoadingBar();
  this.generatePlaceholderAssets();
  this.loadTilemapAssets(); // NOUVEAU
}

private loadTilemapAssets(): void {
  // Charger le tileset
  this.load.image('zombie_tileset', 'assets/tilemaps/zombie_tileset.png');

  // Charger les maps (format JSON exporté depuis Tiled)
  const maps = [
    'default_arena',
    'hospital',
    'hall',
    'warehouse',
    'subway',
    'laboratory'
  ];

  for (const mapName of maps) {
    this.load.tilemapTiledJSON(mapName, `assets/tilemaps/${mapName}.json`);
  }
}
```

---

### Phase 6: Intégration GameScene

**Fichier:** `src/scenes/GameScene.ts`

Modifier la méthode `create()`:

```typescript
import { TiledArena } from '@arena/TiledArena';

create(): void {
  // Déterminer quelle map charger
  const mapKey = this.getMapKey();

  // Créer l'arène depuis Tiled
  this.arena = new TiledArena(this, mapKey);
  this.walls = this.arena.getWalls();

  // Récupérer le spawn point depuis Tiled
  const spawn = this.arena.getPlayerSpawn();

  // Créer le joueur au spawn
  this.player = new Player(this, spawn.x, spawn.y, undefined, this.inputManager);

  // ... reste du code
}

private getMapKey(): string {
  if (this.gameMode === 'campaign' && this.modeConfig) {
    const config = this.modeConfig as CampaignModeConfig;
    return config.level.arena; // 'hospital', 'hall', etc.
  }
  return 'default_arena'; // Mode survival
}
```

---

### Phase 7: Nettoyage

1. **Supprimer le code hardcodé dans Arena.ts:**
   - Méthodes `createWalls()`, `createCovers()`, etc.
   - Garder uniquement les méthodes de base réutilisées par TiledArena

2. **Mettre à jour les imports:**
   - Vérifier que tous les fichiers importent `TiledArena` au lieu de `Arena`

3. **Nettoyer les assets:**
   - Supprimer l'ancien tileset `owlishmedia_pixel_tiles.png`
   - Supprimer `carte.tmx` et `jeu_tuile.tsx`

---

### Phase 8: Tests intégration

**Checklist de validation:**

- [ ] La map default_arena se charge correctement
- [ ] Le joueur spawn au bon endroit
- [ ] Les collisions avec les murs fonctionnent
- [ ] Les portes zombies apparaissent aux bonnes positions
- [ ] Les covers ont les bonnes propriétés (destructible ou non)
- [ ] Les zones de terrain appliquent leurs effets
- [ ] Les éléments interactifs fonctionnent
- [ ] Le pathfinding évite correctement les obstacles
- [ ] Les 5 maps de campagne se chargent

---

## PARTIE C: Nouveaux éléments (après validation)

### Phase 9: Nouveaux éléments de gameplay

**Fichiers à créer:**

| Fichier | Description |
|---------|-------------|
| `src/arena/Checkpoint.ts` | Point de respawn activable |
| `src/arena/Saferoom.ts` | Zone de repos (heal, clear zombies) |
| `src/arena/Teleporter.ts` | Téléportation entre deux points |
| `src/arena/ObjectiveMarker.ts` | Marqueur visuel d'objectif |
| `src/arena/DefendZone.ts` | Zone à défendre X secondes |
| `src/arena/AutoDoor.ts` | Porte qui s'ouvre automatiquement |
| `src/arena/Elevator.ts` | Ascenseur entre niveaux |
| `src/arena/InteractiveDecor.ts` | Lumières, alarmes, fenêtres, vents |

**Propriétés Tiled pour chaque type:**

```
checkpoint:
  - respawnPoint: bool (true = point de respawn actif)

saferoom:
  - healOnEnter: bool
  - clearZombies: bool
  - healAmount: number (pourcentage)

teleporter:
  - linkedTeleporterId: string
  - bidirectional: bool
  - cooldown: number (ms)

objective_marker:
  - objectiveId: string
  - type: "defend" | "collect" | "reach"

defend_zone:
  - duration: number (secondes)
  - radius: number

auto_door:
  - openDirection: "up" | "down" | "left" | "right"
  - openDelay: number (ms)
  - stayOpenDuration: number (ms)

elevator:
  - destinationMapKey: string
  - destinationSpawnId: string
  - linkedSwitchId: string

light:
  - flickering: bool
  - linkedSwitchId: string
  - color: hex

alarm:
  - triggerRadius: number
  - alertsZombies: bool
  - alertRadius: number

breakable_window:
  - health: number

vent:
  - spawnPoint: bool
  - spawnTypes: string[] (zombie types)
```

---

## Propriétés Tiled - Référence complète

### Objets existants

| Type | Properties |
|------|------------|
| `player_spawn` | - |
| `zombie_door` | side: top/bottom/left/right |
| `pillar` | - |
| `halfWall` | health: number (default: 100) |
| `table` | health: number (default: 50) |
| `crate` | health: number (default: 30) |
| `shelf` | health: number (default: 40) |
| `barricade` | health: number (default: 60) |
| `puddle` | isBlood: bool |
| `debris` | slowFactor: number (0-1) |
| `electric` | active: bool, damagePerSecond: number |
| `fire` | duration: number, damagePerSecond: number |
| `acid` | duration: number, damagePerSecond: number, slowFactor: number |
| `barrel_explosive` | damage: number, radius: number |
| `barrel_fire` | fireDuration: number, fireRadius: number |
| `switch` | linkedTargetIds: string, defaultState: bool |
| `generator` | linkedZoneIds: string, defaultActive: bool |
| `flame_trap` | direction: up/down/left/right, linkedSwitchId: string |
| `blade_trap` | alwaysActive: bool, damage: number |
| `health_drop` | size: small/medium, amount: number |
| `ammo_drop` | amount: number |
| `powerup_drop` | type: rage/freeze/ghost/magnet/nuke |
| `weapon_drop` | weaponType: string |

---

## Résumé des fichiers

### À créer (Phase 1-2)
- `public/assets/tilemaps/zombie_tileset.png`
- `public/assets/tilemaps/zombie_tileset.tsx`
- `public/assets/tilemaps/objecttypes.json`
- `public/assets/tilemaps/default_arena.json`
- `public/assets/tilemaps/hospital.json`
- `public/assets/tilemaps/hall.json`
- `public/assets/tilemaps/warehouse.json`
- `public/assets/tilemaps/subway.json`
- `public/assets/tilemaps/laboratory.json`

### À créer (Phase 3-4)
- `src/arena/TiledLevelLoader.ts`
- `src/arena/TiledArena.ts`

### À modifier (Phase 5-7)
- `src/scenes/PreloadScene.ts`
- `src/scenes/GameScene.ts`
- `src/arena/Arena.ts`
- `src/config/constants.ts`

### À créer (Phase 9 - optionnel)
- `src/arena/Checkpoint.ts`
- `src/arena/Saferoom.ts`
- `src/arena/Teleporter.ts`
- `src/arena/ObjectiveMarker.ts`
- `src/arena/DefendZone.ts`
- `src/arena/AutoDoor.ts`
- `src/arena/Elevator.ts`
- `src/arena/InteractiveDecor.ts`
