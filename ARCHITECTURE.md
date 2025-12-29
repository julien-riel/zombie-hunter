# Zombie Hunter — Architecture Technique

## Stack Technologique

### Core
- **TypeScript** — Typage strict pour un code maintenable
- **Phaser 3** — Framework de jeu 2D mature et performant
- **Vite** — Bundler rapide avec HMR

### Qualité
- **ESLint** + **Prettier** — Linting et formatage
- **Vitest** — Tests unitaires
- **Playwright** — Tests E2E (optionnel)

### Assets
- **TexturePacker** — Sprite sheets (optionnel)
- **Tiled** — Éditeur de niveaux (export JSON)

---

## Structure du Projet

```
zombie-hunter/
├── src/
│   ├── main.ts                 # Point d'entrée
│   ├── config/
│   │   ├── game.config.ts      # Configuration Phaser
│   │   ├── constants.ts        # Constantes globales
│   │   ├── assets.manifest.ts  # Liste des assets
│   │   ├── balance.ts          # Stats brutes (HP, speed, damage...)
│   │   └── derivedBalance.ts   # Métriques calculées (DPS, TTK, TTC, threat)
│   │
│   ├── scenes/
│   │   ├── BootScene.ts        # Chargement initial
│   │   ├── PreloadScene.ts     # Chargement des assets
│   │   ├── MenuScene.ts        # Menu principal
│   │   ├── GameScene.ts        # Scène de jeu principale
│   │   ├── HUDScene.ts         # Interface utilisateur (overlay)
│   │   ├── PauseScene.ts       # Menu pause
│   │   ├── UpgradeScene.ts     # Choix d'améliorations entre vagues
│   │   └── GameOverScene.ts    # Écran de fin
│   │
│   ├── entities/
│   │   ├── Entity.ts           # Classe de base
│   │   ├── Player.ts           # Joueur
│   │   ├── zombies/
│   │   │   ├── Zombie.ts       # Classe de base zombie
│   │   │   ├── Shambler.ts
│   │   │   ├── Runner.ts
│   │   │   ├── Crawler.ts
│   │   │   ├── Tank.ts
│   │   │   ├── Spitter.ts
│   │   │   ├── Bomber.ts
│   │   │   ├── Screamer.ts
│   │   │   ├── Splitter.ts
│   │   │   ├── Invisible.ts
│   │   │   └── Necromancer.ts
│   │   ├── bosses/
│   │   │   ├── Boss.ts         # Classe de base boss
│   │   │   ├── Abomination.ts
│   │   │   ├── PatientZero.ts
│   │   │   └── ColossusArmored.ts
│   │   └── projectiles/
│   │       ├── Projectile.ts
│   │       ├── Bullet.ts
│   │       ├── Pellet.ts       # Shotgun
│   │       ├── Flame.ts
│   │       └── AcidSpit.ts
│   │
│   ├── components/
│   │   ├── HealthComponent.ts
│   │   ├── MovementComponent.ts
│   │   ├── WeaponComponent.ts
│   │   ├── AIComponent.ts
│   │   ├── StatusEffectComponent.ts
│   │   └── AnimationComponent.ts
│   │
│   ├── systems/
│   │   ├── WaveSystem.ts       # Gestion des vagues
│   │   ├── SpawnSystem.ts      # Spawn des zombies
│   │   ├── CombatSystem.ts     # Calcul des dégâts
│   │   ├── ComboSystem.ts      # Multiplicateur de combo
│   │   ├── DropSystem.ts       # Loot et drops
│   │   ├── UpgradeSystem.ts    # Améliorations roguelite
│   │   ├── DoorSystem.ts       # Gestion des portes
│   │   ├── EnvironmentSystem.ts # Zones de terrain
│   │   ├── ThreatSystem.ts     # Budget de menace et coûts zombies
│   │   └── DDASystem.ts        # Difficulté adaptative
│   │
│   ├── weapons/
│   │   ├── Weapon.ts           # Classe de base
│   │   ├── firearms/
│   │   │   ├── Pistol.ts
│   │   │   ├── Shotgun.ts
│   │   │   ├── SMG.ts
│   │   │   └── SniperRifle.ts
│   │   ├── special/
│   │   │   ├── Flamethrower.ts
│   │   │   ├── TeslaCannon.ts
│   │   │   ├── NailGun.ts
│   │   │   ├── CompositeBow.ts
│   │   │   └── MicrowaveCannon.ts
│   │   └── melee/
│   │       ├── MeleeWeapon.ts
│   │       ├── BaseballBat.ts
│   │       ├── Machete.ts
│   │       └── Chainsaw.ts
│   │
│   ├── characters/
│   │   ├── Character.ts        # Classe de base personnage
│   │   ├── Cop.ts              # Marcus Webb
│   │   ├── Doctor.ts           # Dr. Elena Vasquez
│   │   ├── Mechanic.ts         # Frank "Gears" Morrison
│   │   ├── Athlete.ts          # Jade Chen
│   │   ├── Pyromaniac.ts       # Victor Ash
│   │   └── Kid.ts              # Lily + Max
│   │
│   ├── arena/
│   │   ├── Arena.ts            # Gestionnaire d'arène
│   │   ├── Door.ts             # Porte de spawn
│   │   ├── Cover.ts            # Couvertures
│   │   ├── TerrainZone.ts      # Zones de terrain
│   │   ├── Destructible.ts     # Objets destructibles
│   │   └── Interactive.ts      # Éléments interactifs
│   │
│   ├── items/
│   │   ├── Item.ts
│   │   ├── drops/
│   │   │   ├── AmmoDrop.ts
│   │   │   ├── HealthDrop.ts
│   │   │   └── PowerUp.ts
│   │   └── active/
│   │       ├── PortableTurret.ts
│   │       ├── ProximityMine.ts
│   │       ├── AttackDrone.ts
│   │       ├── HolographicDecoy.ts
│   │       └── DiscoBallGrenade.ts
│   │
│   ├── ui/
│   │   ├── HealthBar.ts
│   │   ├── AmmoCounter.ts
│   │   ├── ComboMeter.ts
│   │   ├── WaveIndicator.ts
│   │   ├── MiniMap.ts
│   │   └── UpgradeCard.ts
│   │
│   ├── managers/
│   │   ├── GameManager.ts      # État global du jeu
│   │   ├── InputManager.ts     # Clavier/souris/manette
│   │   ├── AudioManager.ts     # Sons et musique
│   │   ├── ProgressionManager.ts # Progression permanente
│   │   ├── SaveManager.ts      # Sauvegarde locale
│   │   ├── PoolManager.ts      # Object pooling
│   │   └── TelemetryManager.ts # Collecte de métriques gameplay
│   │
│   ├── utils/
│   │   ├── math.ts             # Fonctions mathématiques
│   │   ├── collision.ts        # Helpers de collision
│   │   ├── pathfinding.ts      # A* pour l'IA
│   │   └── random.ts           # RNG seedé
│   │
│   └── types/
│       ├── index.ts
│       ├── entities.ts
│       ├── weapons.ts
│       ├── arena.ts
│       └── events.ts
│
├── public/
│   └── assets/
│       ├── sprites/
│       │   ├── player/
│       │   ├── zombies/
│       │   ├── bosses/
│       │   ├── weapons/
│       │   ├── items/
│       │   └── effects/
│       ├── tilemaps/
│       │   ├── hospital.json
│       │   ├── mall.json
│       │   ├── metro.json
│       │   ├── lab.json
│       │   └── prison.json
│       ├── audio/
│       │   ├── sfx/
│       │   └── music/
│       └── ui/
│
├── tests/
│   ├── unit/
│   └── e2e/
│
├── tools/
│   └── placeholder-generator.ts  # Génère des placeholders
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Architecture des Systèmes

### Pattern Principal : ECS Simplifié

Le jeu utilise une architecture Entity-Component-System allégée, adaptée à Phaser :

```
┌─────────────────────────────────────────────────────────────┐
│                        GameManager                          │
│  (État global, transitions, persistance)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         GameScene                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ WaveSystem  │  │ SpawnSystem │  │ CombatSystem│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ ComboSystem │  │ DropSystem  │  │ DoorSystem  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Entities                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Player  │  │ Zombies │  │ Bullets │  │ Items   │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│       │            │            │            │              │
│       ▼            ▼            ▼            ▼              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Components                        │  │
│  │  Health │ Movement │ Weapon │ AI │ StatusEffect     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Flux de Données

```
Input (clavier/souris)
        │
        ▼
┌───────────────┐
│ InputManager  │───────────────────────────────┐
└───────────────┘                               │
        │                                       │
        ▼                                       ▼
┌───────────────┐    ┌───────────────┐   ┌───────────────┐
│    Player     │───▶│ WeaponSystem  │──▶│  Projectiles  │
└───────────────┘    └───────────────┘   └───────────────┘
        │                                       │
        │                                       ▼
        │                              ┌───────────────┐
        │                              │ CombatSystem  │
        │                              └───────────────┘
        │                                       │
        ▼                                       ▼
┌───────────────┐                      ┌───────────────┐
│   Collision   │◀────────────────────▶│    Zombies    │
└───────────────┘                      └───────────────┘
        │                                       │
        ▼                                       ▼
┌───────────────┐                      ┌───────────────┐
│  DropSystem   │                      │  ComboSystem  │
└───────────────┘                      └───────────────┘
        │                                       │
        ▼                                       ▼
┌───────────────┐                      ┌───────────────┐
│   HUDScene    │◀─────────────────────│  WaveSystem   │
└───────────────┘                      └───────────────┘
```

---

## Patterns de Conception

### 1. Object Pooling

Pour les entités fréquemment créées/détruites (projectiles, zombies) :

```typescript
class PoolManager {
  private pools: Map<string, Phaser.GameObjects.Group>;

  get<T extends Entity>(type: string): T | null {
    const pool = this.pools.get(type);
    return pool?.getFirstDead(true) as T;
  }

  release(entity: Entity): void {
    entity.setActive(false);
    entity.setVisible(false);
  }
}
```

### 2. State Machine pour l'IA

```typescript
interface ZombieState {
  enter(zombie: Zombie): void;
  update(zombie: Zombie, delta: number): void;
  exit(zombie: Zombie): void;
}

class ZombieStateMachine {
  private currentState: ZombieState;
  private states: Map<string, ZombieState>;

  transition(stateName: string): void;
  update(delta: number): void;
}
```

États typiques : `Idle`, `Chase`, `Attack`, `Stunned`, `Dying`

### 3. Observer pour les Événements

```typescript
// EventBus global
const GameEvents = new Phaser.Events.EventEmitter();

// Événements typés
interface GameEventMap {
  'zombie:killed': { zombie: Zombie; killer: Player };
  'wave:start': { waveNumber: number };
  'wave:complete': { waveNumber: number };
  'player:damaged': { damage: number; source: Entity };
  'combo:updated': { multiplier: number };
  'door:activated': { door: Door };
}
```

### 4. Factory pour les Entités

```typescript
class ZombieFactory {
  static create(
    scene: GameScene,
    type: ZombieType,
    x: number,
    y: number
  ): Zombie {
    const config = ZOMBIE_CONFIGS[type];
    const zombie = scene.poolManager.get<Zombie>(type)
      || new ZombieClasses[type](scene, x, y);

    zombie.reset(x, y, config);
    return zombie;
  }
}
```

### 5. Strategy pour les Armes

```typescript
interface FiringStrategy {
  fire(weapon: Weapon, direction: Phaser.Math.Vector2): void;
}

class SingleShotStrategy implements FiringStrategy { }
class SpreadShotStrategy implements FiringStrategy { }
class BeamStrategy implements FiringStrategy { }
class ProjectileStrategy implements FiringStrategy { }
```

---

## Collision et Physique

### Groupes de Collision

```typescript
const COLLISION_CATEGORIES = {
  PLAYER: 0x0001,
  ZOMBIE: 0x0002,
  PLAYER_PROJECTILE: 0x0004,
  ZOMBIE_PROJECTILE: 0x0008,
  WALL: 0x0010,
  COVER: 0x0020,
  ITEM: 0x0040,
  TERRAIN_ZONE: 0x0080,
};
```

### Matrice de Collision

|                    | Player | Zombie | P.Proj | Z.Proj | Wall | Cover | Item |
|--------------------|--------|--------|--------|--------|------|-------|------|
| Player             | -      | ✓      | -      | ✓      | ✓    | ✓     | ✓    |
| Zombie             | ✓      | -      | ✓      | -      | ✓    | ✓     | -    |
| Player Projectile  | -      | ✓      | -      | -      | ✓    | ~     | -    |
| Zombie Projectile  | ✓      | -      | -      | -      | ✓    | ~     | -    |

`~` = dépend du type de couverture

---

## IA des Zombies

### Comportements de Base

```typescript
abstract class ZombieAI {
  protected zombie: Zombie;
  protected target: Player;

  abstract update(delta: number): void;

  protected pathfind(): Phaser.Math.Vector2[];
  protected lineOfSight(): boolean;
  protected getDistanceToTarget(): number;
}

class ShamblerAI extends ZombieAI {
  // Marche directement vers le joueur
  // Contourne les obstacles basiques
}

class RunnerAI extends ZombieAI {
  // Charge en ligne droite
  // Ignore les petits obstacles
}

class SpitterAI extends ZombieAI {
  // Maintient une distance
  // Attaque à distance
  // Fuit si le joueur s'approche
}

class NecromancerAI extends ZombieAI {
  // Reste en retrait
  // Fuit activement le joueur
  // Cherche les cadavres à ressusciter
}
```

### Pathfinding

- A* avec grille de navigation précalculée
- Mise à jour partielle quand le terrain change
- Flow field pour les hordes (optimisation)

---

## Système de Vagues

```typescript
interface WaveConfig {
  waveNumber: number;
  activeDoors: number;
  spawnGroups: SpawnGroup[];
  specialEvents?: SpecialEvent[];
  boss?: BossType;
}

interface SpawnGroup {
  zombieType: ZombieType;
  count: number;
  spawnDelay: number;
  door?: number; // Porte spécifique ou aléatoire
}

class WaveSystem {
  private currentWave: number = 0;
  private activeSpawns: number = 0;
  private zombiesRemaining: number = 0;

  startWave(config: WaveConfig): void;
  onZombieKilled(): void;
  checkWaveComplete(): boolean;
  generateNextWave(): WaveConfig;
}
```

### Progression de Difficulté

```
Vague 1-5:   Shamblers, Runners
Vague 6-10:  + Crawlers, Spitters
Vague 11-15: + Tanks, Bombers
Vague 16-20: + Screamers, Splitters
Vague 21+:   + Invisibles, Necromancers
Boss:        Toutes les 5 vagues
```

---

## Système d'Amélioration Roguelite

```typescript
interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  apply(player: Player): void;
  stackable: boolean;
  maxStacks?: number;
}

class UpgradeSystem {
  private upgradePool: Upgrade[];
  private playerUpgrades: Map<string, number>;

  generateChoices(count: number): Upgrade[];
  applyUpgrade(upgrade: Upgrade): void;
  getWeightedRandom(): Upgrade;
}
```

### Catégories d'Améliorations

1. **Armes** : Dégâts, cadence, capacité, rechargement
2. **Défense** : Santé max, armure, régénération
3. **Mobilité** : Vitesse, dash cooldown, esquive
4. **Utilitaire** : Portée de ramassage, durée power-ups
5. **Spécial** : Effets uniques (balles rebondissantes, etc.)

---

## Système de Balance Dérivée

Le fichier `derivedBalance.ts` calcule automatiquement les métriques dérivées à partir des stats brutes de `balance.ts`.

```typescript
interface DerivedWeaponStats {
  rawDPS: number;           // damage / (fireRate / 1000)
  sustainedDPS: number;     // Avec reload pris en compte
  timeToEmpty: number;      // magazineSize * fireRate
  cycleTime: number;        // timeToEmpty + reloadTime
  damagePerCycle: number;   // magazineSize * damage (pellets inclus)
}

interface DerivedZombieStats {
  TTKByWeapon: Record<WeaponType, number>;  // HP / sustainedDPS
  TTC: Record<Distance, number>;            // distance / speed
  receivedDPS: number;                      // damage / attackCooldown
  threatScore: number;                      // (receivedDPS) * (1 / TTC_standard)
  cost: number;                             // Score pour le budget de menace
}

// Distances de référence pour les calculs
const REFERENCE_DISTANCES = {
  close: 150,
  medium: 300,
  door: 500,    // Distance typique porte → centre
  far: 640,     // Distance maximale arène
};

// Table de vérité pour validation
const BALANCE_VALIDATION = {
  // TTK cibles (en secondes)
  shamblerWithPistol: { min: 0.5, max: 1.5 },
  tankWithPistol: { min: 4, max: 7 },
  runnerWithSMG: { min: 0.2, max: 0.5 },

  // TTC cibles (en secondes)
  shamblerFromDoor: { min: 8, max: 12 },
  runnerFromDoor: { min: 3, max: 5 },
};
```

---

## Système de Budget de Menace (ThreatSystem)

Remplace le système de comptage fixe par une gestion dynamique basée sur le coût.

```typescript
interface ThreatConfig {
  baseBudget: number;          // Budget initial (wave 1)
  budgetPerWave: number;       // Augmentation par vague
  budgetCurve: 'linear' | 'exponential' | 'logarithmic';

  // Caps par rôle (maximum simultané)
  roleCaps: {
    tank: number;       // ex: 1
    spitter: number;    // ex: 2
    runner: number;     // ex: 4
    special: number;    // ex: 2 (invisible, necro, screamer)
  };

  // Pacing
  minSpawnGap: number;         // Délai min entre spawns
  breathingRatio: number;      // Ratio pic/respiration (ex: 0.3)
}

class ThreatSystem {
  private currentBudget: number;
  private spentBudget: number;
  private activeByRole: Map<string, number>;

  // Calcule le coût d'un zombie
  calculateCost(type: ZombieType): number {
    const derived = getDerivedZombieStats(type);
    // Formule : TTK inverse × TTC inverse × difficulté
    return derived.threatScore * DIFFICULTY_MULTIPLIER[type];
  }

  // Génère la composition d'une vague
  generateWaveComposition(waveNumber: number): SpawnPlan[] {
    const budget = this.getBudget(waveNumber);
    const plan: SpawnPlan[] = [];

    while (this.spentBudget < budget) {
      const available = this.getAvailableTypes(); // Respecte les caps
      const type = this.weightedRandom(available);
      const cost = this.calculateCost(type);

      if (this.spentBudget + cost <= budget) {
        plan.push({ type, delay: this.calculateDelay(plan) });
        this.spentBudget += cost;
      }
    }

    return this.applyPacing(plan); // Alternance pic/respiration
  }
}
```

---

## Système de Difficulté Adaptative (DDASystem)

Ajuste dynamiquement la difficulté sans que le joueur ne perçoive de "rubber banding".

```typescript
interface DDAMetrics {
  accuracy: number;           // hits / shots (fenêtre glissante)
  damageTakenPerMin: number;
  timeToClearWave: number;
  nearDeaths: number;         // Passages sous 15% HP
  dashUsage: number;          // Actions par minute
  survivalTime: number;
}

interface DDAConfig {
  enabled: boolean;
  windowSize: number;         // Fenêtre d'observation (ms)

  // Seuils de performance
  performanceThresholds: {
    struggling: { accuracy: number; damagePerMin: number };
    dominating: { accuracy: number; damagePerMin: number };
  };

  // Bornes strictes
  bounds: {
    spawnDelay: { min: 300; max: 1300 };
    compositionWeight: { min: 0.5; max: 1.5 };
  };

  // Hysteresis
  cooldown: number;           // Temps min entre ajustements
  adjustmentStep: number;     // Taille des ajustements
}

class DDASystem {
  private metrics: DDAMetrics;
  private lastAdjustment: number;
  private currentModifiers: DDAModifiers;

  update(delta: number): void {
    this.updateMetrics(delta);

    if (this.canAdjust()) {
      const performance = this.evaluatePerformance();

      if (performance === 'struggling') {
        this.easeUp();  // Augmente spawnDelay, réduit weights agressifs
      } else if (performance === 'dominating') {
        this.rampUp();  // Réduit spawnDelay, augmente weights
      }
    }
  }

  // Retourne les modificateurs pour le WaveSystem
  getModifiers(): DDAModifiers {
    return {
      spawnDelayMultiplier: this.currentModifiers.spawnDelay,
      weightMultipliers: this.currentModifiers.weights,
    };
  }
}
```

### Flux DDA

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ TelemetryMgr│────▶│  DDASystem  │────▶│ WaveSystem  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │ Métriques         │ Évaluation        │ Modificateurs
      │ brutes            │ performance       │ appliqués
      ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  accuracy   │     │ struggling? │     │ spawnDelay  │
│  damage/min │     │ dominating? │     │ weights     │
│  nearDeaths │     │ neutral?    │     │ composition │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Télémétrie (TelemetryManager)

Collecte les données de gameplay pour l'analyse et le fine-tuning.

```typescript
interface TelemetryEvent {
  timestamp: number;
  type: TelemetryEventType;
  data: Record<string, unknown>;
}

type TelemetryEventType =
  | 'zombie:killed'
  | 'player:hit'
  | 'player:death'
  | 'wave:start'
  | 'wave:clear'
  | 'weapon:fired'
  | 'weapon:hit'
  | 'dash:used'
  | 'powerup:collected';

interface RunSummary {
  duration: number;
  wavesCleared: number;
  zombiesKilled: Record<ZombieType, number>;
  damageDealt: number;
  damageTaken: number;
  accuracy: number;
  weaponUsage: Record<WeaponType, number>;
  causeOfDeath: { type: ZombieType; distance: number } | null;

  // Métriques dérivées
  avgTTKByType: Record<ZombieType, number>;
  damagePerMinute: number;
  avgWaveClearTime: number;
}

class TelemetryManager {
  private events: TelemetryEvent[] = [];
  private windowMetrics: SlidingWindowMetrics;

  log(type: TelemetryEventType, data: Record<string, unknown>): void;

  // Métriques temps réel (pour DDA)
  getRealtimeMetrics(): DDAMetrics;

  // Résumé de fin de run (pour analyse)
  generateRunSummary(): RunSummary;

  // Export pour analyse externe
  exportToJSON(): string;
}
```

### Events de Télémétrie

```typescript
// Ajout aux events existants
interface GameEventMap {
  // ... events existants ...

  // Télémétrie
  'telemetry:zombie_killed': { type: ZombieType; ttk: number; weapon: WeaponType };
  'telemetry:damage_taken': { amount: number; source: ZombieType; distance: number };
  'telemetry:shot_fired': { weapon: WeaponType; hit: boolean };
  'telemetry:wave_metrics': { wave: number; clearTime: number; damageReceived: number };
}
```

---

## Persistance

### Sauvegarde Locale (LocalStorage)

```typescript
interface SaveData {
  version: string;
  progression: {
    unlockedCharacters: string[];
    unlockedWeapons: string[];
    permanentUpgrades: Record<string, number>;
    totalKills: number;
    highScores: Record<string, number>;
  };
  settings: {
    audio: { music: number; sfx: number };
    controls: Record<string, string>;
  };
}
```

---

## Optimisations Prévues

### Rendering
- Sprite batching automatique (Phaser)
- Culling des entités hors écran
- Texture atlases pour réduire les draw calls

### Mémoire
- Object pooling pour projectiles et zombies
- Lazy loading des assets par niveau
- Destruction explicite des entités

### CPU
- Spatial hashing pour les collisions
- Throttling de l'IA (pas tous les zombies chaque frame)
- Flow fields précalculés pour le pathfinding de masse

---

## Placeholder Assets

Le jeu démarre avec des placeholders générés :

```typescript
// tools/placeholder-generator.ts
// Génère des sprites colorés basiques pour prototypage

Placeholders:
- Player: Carré bleu 32x32
- Shambler: Carré vert 32x32
- Runner: Carré vert clair 28x28
- Tank: Carré vert foncé 48x48
- Bullet: Cercle jaune 8x8
- Wall: Rectangle gris
- Door: Rectangle rouge
```

---

## API et Events Principaux

### Events de Jeu

```typescript
// Lifecycle
'game:start' | 'game:pause' | 'game:resume' | 'game:over'

// Combat
'player:shoot' | 'player:hit' | 'player:heal' | 'player:death'
'zombie:spawn' | 'zombie:hit' | 'zombie:death'
'boss:spawn' | 'boss:phase' | 'boss:death'

// Progression
'wave:start' | 'wave:clear' | 'wave:boss'
'combo:increase' | 'combo:break'
'upgrade:offered' | 'upgrade:selected'
'item:drop' | 'item:pickup' | 'powerup:activate' | 'powerup:expire'

// Environnement
'door:activate' | 'door:barricade' | 'door:destroy'
'cover:damage' | 'cover:destroy'
'interactive:trigger'
```
