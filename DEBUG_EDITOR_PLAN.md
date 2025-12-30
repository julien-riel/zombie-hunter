# Plan: Éditeur/Testeur de Niveau Debug

## Objectif
Créer un système de debug permettant de tester des armes, items et batailles contre zombies sans jouer la partie complète.

## Architecture Proposée

### Approche: Interface Hybride (Clavier + Panneau Minimal)

Créer une scène de debug qui se superpose à GameScene avec:
1. **Raccourcis clavier** pour actions rapides (priorité)
2. **Petit panneau UI** pour sélection d'éléments à spawner
3. **Mode God** pour tests sans risque de mort
4. **Contrôle des vagues** pour sauter/pause/resume
5. **Gestion des items** pour tester drops et power-ups

---

## Fichiers à Créer/Modifier

### 1. Nouveaux Fichiers

| Fichier | Description |
|---------|-------------|
| `src/scenes/DebugScene.ts` | Scène overlay avec UI de debug |
| `src/debug/DebugControls.ts` | Gestion des raccourcis clavier |
| `src/debug/DebugSpawner.ts` | Logique de spawn zombies/items |
| `src/debug/DebugPanel.ts` | Panneau UI minimal avec sélecteurs |

### 2. Fichiers à Modifier

| Fichier | Modification |
|---------|--------------|
| `src/config/constants.ts` | Ajouter `DEBUG: 'DebugScene'` aux SCENE_KEYS |
| `src/config/game.config.ts` | Ajouter DebugScene à la liste des scènes |
| `src/scenes/GameScene.ts` | Lancer DebugScene en mode dev + exposer méthodes |
| `src/entities/Player.ts` | Ajouter mode god + méthodes debug |
| `src/systems/WaveSystem.ts` | Exposer méthodes pour contrôle debug (skip, pause) |

---

## Fonctionnalités Détaillées

### A. Raccourcis Clavier Debug

| Touche | Action |
|--------|--------|
| `F1` | Toggle panneau debug ON/OFF |
| `F2` | Toggle mode God (invincibilité + ammo infini) |
| `F3` | Toggle visualisation Flow Field (existe déjà) |
| `F4` | Toggle visualisation collisions/hitbox |
| `F5` | Tuer tous les zombies actifs |
| `F6` | Recharger toutes les armes |
| `F7` | Soigner le joueur à 100% |
| `F8` | Toggle pause des spawns |
| `F9` | Passer à la vague suivante |
| `F10` | Spawner item aléatoire à la position joueur |
| `+`/`-` | Ajuster numéro de vague (+1/-1) |

### B. Spawn de Zombies (Panneau + Click)

1. **Sélection du type** via menu déroulant ou touches numériques:
   - `1-0` = Types de zombie (shambler, runner, crawler, tank, spitter, bomber, screamer, splitter, invisible, necromancer)

2. **Mode placement**:
   - Click gauche = spawn 1 zombie à la position
   - Click gauche + drag = spawn multiple en ligne
   - Shift + Click = spawn groupe (5 zombies)

3. **Spawn rapide**:
   - `Z` = Spawn 10 shamblers aléatoires
   - `X` = Spawn horde mixte (20 zombies variés)
   - `C` = Spawn 1 de chaque type

### C. Gestion des Armes

1. **Donner armes au joueur**:
   - Menu avec toutes les armes disponibles
   - Bouton "Donner toutes les armes"
   - Bouton "Vider inventaire"

2. **Armes disponibles**:
   - Firearms: Pistol, Shotgun, SMG, SniperRifle
   - Special: Flamethrower, TeslaCannon, NailGun, CompositeBow, MicrowaveCannon
   - Melee: BaseballBat, Machete, Chainsaw

### D. Gestion des Items et Drops

1. **Types d'items à spawner**:
   - **Drops**: AmmoDrop, HealthDrop
   - **Power-ups**: SpeedBoost, DamageBoost, ShieldBoost
   - **Actifs**: PortableTurret, ProximityMine, AttackDrone, HolographicDecoy

2. **Raccourcis rapides**:
   - `I` = Ouvrir menu items
   - `H` = Spawn HealthDrop à la position joueur
   - `A` = Spawn AmmoDrop à la position joueur

3. **Via panneau**:
   - Sélectionner type d'item
   - Click pour placer à la position souhaitée

### E. Contrôle des Vagues

1. **Actions disponibles**:
   - Pause/Resume des spawns (F8)
   - Skip à la vague suivante (F9)
   - Définir vague spécifique (+/-)
   - Forcer fin de vague (tuer tous zombies)

2. **Affichage**:
   - Vague actuelle
   - Zombies restants
   - État (en cours, pause, terminée)

### F. Panneau UI Debug (Compact)

```
┌─────────────────────────────────────┐
│ DEBUG [F1]              Wave: 3     │
├─────────────────────────────────────┤
│ [God: OFF] [Pause: OFF] Zombies: 15 │
├─────────────────────────────────────┤
│ ZOMBIES (click to spawn)            │
│ [Sham][Run][Craw][Tank][Spit]       │
│ [Bomb][Scream][Split][Invis][Necro] │
├─────────────────────────────────────┤
│ WEAPONS (click to give)             │
│ [Pistol][Shotgun][SMG][Sniper]      │
│ [Flame][Tesla][Nail][Bow][Saw]      │
├─────────────────────────────────────┤
│ ITEMS (click to spawn)              │
│ [Health][Ammo][Speed][Damage]       │
│ [Turret][Mine][Drone][Decoy]        │
├─────────────────────────────────────┤
│ [Kill All] [Next Wave] [Heal 100%]  │
└─────────────────────────────────────┘
```

---

## Implémentation Étape par Étape

### Étape 1: Setup de base
1. Ajouter `DEBUG` à `SCENE_KEYS` dans constants.ts
2. Créer `DebugScene.ts` avec structure de base
3. Enregistrer la scène dans game.config.ts
4. Lancer depuis GameScene avec touche F1

### Étape 2: Mode God et contrôles de base
1. Ajouter mode God au Player (invincibilité + ammo infini)
2. Créer `DebugControls.ts` avec mapping touches F1-F10
3. Implémenter actions rapides (heal, reload, kill all)

### Étape 3: Système de spawn zombies
1. Créer `DebugSpawner.ts`
2. Spawn par sélection + click
3. Spawn de groupes/hordes

### Étape 4: Gestion des armes
1. Fonctions pour donner/retirer armes
2. Boutons dans le panneau pour chaque arme
3. Raccourci "Give All"

### Étape 5: Contrôle des vagues
1. Exposer méthodes dans WaveSystem (pause, skip, setWave)
2. Afficher état vague dans le panneau
3. Raccourcis F8/F9 et +/-

### Étape 6: Système d'items
1. Créer fonctions spawn pour chaque type d'item
2. Intégrer au panneau UI
3. Raccourcis H/A pour health/ammo

### Étape 7: Panneau UI
1. Créer `DebugPanel.ts` avec Phaser UI (textes + zones cliquables)
2. Layout compact comme spécifié
3. Toggle avec F1

---

## Détails Techniques

### DebugScene.ts (structure)
```typescript
export class DebugScene extends Phaser.Scene {
  private gameScene: GameScene;
  private panel: DebugPanel;
  private controls: DebugControls;
  private spawner: DebugSpawner;
  private isVisible: boolean = false;

  init(data: { gameScene: GameScene }) {
    this.gameScene = data.gameScene;
  }

  create() {
    this.controls = new DebugControls(this, this.gameScene);
    this.spawner = new DebugSpawner(this.gameScene);
    this.panel = new DebugPanel(this, this.spawner);
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.panel.setVisible(this.isVisible);
  }
}
```

### Mode God (Player.ts)
```typescript
private godMode: boolean = false;

setGodMode(enabled: boolean) {
  this.godMode = enabled;
  if (enabled) {
    this.healthComponent.setInvincible(true);
    // Ammo infini géré dans Weapon.fire()
  }
}

isGodMode(): boolean {
  return this.godMode;
}
```

### DebugSpawner.ts (structure)
```typescript
export class DebugSpawner {
  private gameScene: GameScene;
  private zombieFactory: ZombieFactory;

  constructor(gameScene: GameScene) {
    this.gameScene = gameScene;
    this.zombieFactory = gameScene.getZombieFactory();
  }

  spawnZombie(type: ZombieType, x: number, y: number): Zombie {
    return this.zombieFactory.create(type, x, y);
  }

  spawnHorde(count: number = 20): void {
    const types: ZombieType[] = ['shambler', 'runner', 'crawler', 'spitter'];
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const x = Phaser.Math.Between(100, GAME_WIDTH - 100);
      const y = Phaser.Math.Between(100, GAME_HEIGHT - 100);
      this.spawnZombie(type, x, y);
    }
  }

  spawnOneOfEach(): void {
    const types: ZombieType[] = [
      'shambler', 'runner', 'crawler', 'tank', 'spitter',
      'bomber', 'screamer', 'splitter', 'invisible', 'necromancer'
    ];
    let x = 200;
    for (const type of types) {
      this.spawnZombie(type, x, 200);
      x += 80;
    }
  }

  killAllZombies(): void {
    const zombies = this.gameScene.getActiveZombies();
    for (const zombie of zombies) {
      zombie.takeDamage(9999);
    }
  }

  spawnItem(type: string, x: number, y: number): void {
    // À implémenter selon les classes d'items existantes
  }
}
```

### DebugControls.ts (structure)
```typescript
export class DebugControls {
  private scene: Phaser.Scene;
  private gameScene: GameScene;
  private keys: { [key: string]: Phaser.Input.Keyboard.Key };

  constructor(scene: Phaser.Scene, gameScene: GameScene) {
    this.scene = scene;
    this.gameScene = gameScene;
    this.setupKeys();
  }

  private setupKeys(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    this.keys = {
      F1: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1),
      F2: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F2),
      F4: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F4),
      F5: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F5),
      F6: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F6),
      F7: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F7),
      F8: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F8),
      F9: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F9),
      F10: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F10),
      PLUS: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS),
      MINUS: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS),
      Z: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      X: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      C: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      H: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H),
    };
  }

  update(): void {
    // Check for key presses and trigger actions
    if (Phaser.Input.Keyboard.JustDown(this.keys.F2)) {
      this.toggleGodMode();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.F5)) {
      this.killAllZombies();
    }
    // ... etc
  }

  private toggleGodMode(): void {
    const player = this.gameScene.getPlayer();
    player.setGodMode(!player.isGodMode());
  }

  private killAllZombies(): void {
    // Via DebugSpawner
  }
}
```

---

## Ordre d'Implémentation Recommandé

1. **Phase 1 - Core**: Setup scène + God mode + Kill all (testable immédiatement)
2. **Phase 2 - Spawn**: Spawn zombies par type + click placement
3. **Phase 3 - Armes**: Donner/retirer armes + Give All
4. **Phase 4 - Vagues**: Contrôle pause/skip/set wave
5. **Phase 5 - Items**: Spawn drops et power-ups
6. **Phase 6 - UI**: Panneau visuel complet

---

## Arborescence des Fichiers

```
src/
├── config/
│   ├── constants.ts          # Ajouter SCENE_KEYS.DEBUG
│   └── game.config.ts        # Enregistrer DebugScene
├── scenes/
│   ├── GameScene.ts          # Lancer DebugScene, exposer getters
│   └── DebugScene.ts         # NOUVEAU - scène principale debug
├── entities/
│   └── Player.ts             # Ajouter godMode, clearWeapons()
├── systems/
│   └── WaveSystem.ts         # Ajouter pause(), skipWave(), setWave()
└── debug/                    # NOUVEAU dossier
    ├── DebugControls.ts      # Gestion raccourcis clavier
    ├── DebugSpawner.ts       # Spawn zombies/items
    └── DebugPanel.ts         # Interface UI
```

---

## Notes Importantes

### Ressources Existantes à Utiliser

- **ZombieFactory** (`src/entities/zombies/ZombieFactory.ts`): Utiliser `create(type, x, y)` pour spawner
- **PoolManager** (`src/managers/PoolManager.ts`): Gère les pools de zombies
- **Player.addWeapon()**: Méthode existante pour donner des armes
- **WaveSystem** (`src/systems/WaveSystem.ts`): À étendre avec pause/skip

### Pattern HUDScene à Suivre

La DebugScene doit suivre le même pattern que HUDScene:
1. Lancée via `this.scene.launch(SCENE_KEYS.DEBUG, { gameScene: this })`
2. Reçoit la référence GameScene via `init(data)`
3. Écoute les événements de GameScene
4. Nettoie les listeners dans `shutdown()`

### Considérations Performance

- Ne pas spawner plus de 50 zombies à la fois
- Utiliser le PoolManager existant pour éviter les allocations
- Le panneau UI doit avoir un depth élevé (1000+) pour rester visible
