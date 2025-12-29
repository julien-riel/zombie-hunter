# Phase 5 : Environnement et Terrain — Plan d'Implémentation

## Vue d'Ensemble

La Phase 5 enrichit l'arène avec des éléments tactiques : couvertures, zones de terrain, objets interactifs et environnements variés. Ces éléments transforment l'espace de jeu en véritable champ de bataille stratégique.

### État Actuel du Code

**Ce qui existe :**
- `Arena.ts` : Génération procédurale basique (murs, sol, piliers hardcodés)
- `Door.ts` : Système de portes complet (états, spawn, activation)
- Système de collision Arcade Physics fonctionnel
- Pathfinding A* avec liste d'obstacles
- `FireZone.ts` : Exemple de zone d'effet (peut servir de template)
- Catégories de collision définies mais non utilisées (`COVER`, `TERRAIN_ZONE`)
- Events définis mais non implémentés (`cover:damage`, `cover:destroy`, `interactive:trigger`)

**Ce qui manque :**
- Classes `Cover`, `TerrainZone`, `Destructible`, `Interactive`
- Système de chargement de tilemaps Tiled
- Variants d'environnements (hôpital, centre commercial, etc.)
- Portes avancées (barricades, pièges, destruction)

---

## Architecture Proposée

```
src/arena/
├── Arena.ts              # ✅ Refactoré - Gestionnaire principal avec Cover et TerrainZone
├── Door.ts               # Existant - À étendre (barricades)
├── Cover.ts              # ✅ CRÉÉ - Couvertures (piliers, murets, mobilier)
├── index.ts              # ✅ MIS À JOUR - Exports Cover, TerrainZone, etc.
├── TerrainZone.ts        # ✅ CRÉÉ - Classe de base zones d'effet
├── PuddleZone.ts         # ✅ CRÉÉ - Flaques (eau/sang)
├── DebrisZone.ts         # ✅ CRÉÉ - Zones de gravats
├── ElectricZone.ts       # ✅ CRÉÉ - Zones électrifiées
├── FireZone.ts           # ✅ CRÉÉ - Zones de feu (refactoré depuis entities/effects)
├── AcidZone.ts           # ✅ CRÉÉ - Zones d'acide (Spitter)
├── Interactive.ts        # ✅ CRÉÉ - Classe de base éléments interactifs
├── BarrelExplosive.ts    # ✅ CRÉÉ - Baril explosif
├── BarrelFire.ts         # ✅ CRÉÉ - Baril incendiaire
├── Switch.ts             # ✅ CRÉÉ - Interrupteur
├── Generator.ts          # ✅ CRÉÉ - Générateur électrique
├── FlameTrap.ts          # ✅ CRÉÉ - Piège à flammes
├── BladeTrap.ts          # ✅ CRÉÉ - Piège à lames
└── LevelLoader.ts        # À FAIRE - Chargement tilemaps Tiled
```

---

## 5.1 Couvertures (Cover)

### Objectif
Créer des obstacles tactiques qui influencent le gameplay : certains indestructibles pour ancrer les stratégies, d'autres destructibles pour créer du dynamisme.

### Classes à Créer

#### `Cover.ts` — Classe de Base

```typescript
interface CoverConfig {
  type: CoverType;
  x: number;
  y: number;
  width: number;
  height: number;
  destructible: boolean;
  health?: number;
  blocksLineOfSight: boolean;
  providesPartialCover: boolean;  // Tir par-dessus possible
  lootTable?: LootTableId;        // Pour destructibles avec loot
}

enum CoverType {
  PILLAR = 'pillar',           // Indestructible, bloque tout
  HALF_WALL = 'half_wall',     // Destructible, tir par-dessus
  TABLE = 'table',             // Destructible, cover partiel
  CRATE = 'crate',             // Destructible, peut contenir loot
  SHELF = 'shelf',             // Destructible, loot bonus
  BARRICADE = 'barricade',     // Posé par joueur sur porte
}
```

### Tâches

- [x] **5.1.1** Créer `Cover.ts` avec classe de base
  - Héritage de `Phaser.GameObjects.Container`
  - Health géré dans la classe Cover (si destructible)
  - Collision via groupe `walls` de l'Arena
  - Méthode `takeDamage(amount: number, source: string)`
  - Events `cover:damage` et `cover:destroy`

- [x] **5.1.2** Implémenter les piliers/colonnes (indestructibles)
  - Collision statique via le groupe walls
  - Bloque projectiles et entités
  - Intégration pathfinding (obstacle permanent)

- [x] **5.1.3** Implémenter les murets (destructibles, contournables)
  - Health configurable (80 HP par défaut)
  - Zombies peuvent les contourner via pathfinding
  - Projectiles bloqués et infligent des dégâts
  - Mise à jour pathfinding à la destruction

- [x] **5.1.4** Implémenter le mobilier destructible
  - Tables, caisses, étagères
  - Loot aléatoire via événement `cover:loot` (système de loot à implémenter en Phase 6)
  - Animation de destruction (fade out + scale)
  - Particules de débris

- [x] **5.1.5** Intégrer les covers avec l'Arena
  - `Arena.ts` refactoré pour utiliser `Cover` au lieu de piliers hardcodés
  - Liste dynamique de covers via `getCovers()`, `getActiveCovers()`
  - Méthode `getCoverAt(x, y)` pour l'IA

- [x] **5.1.6** Intégrer avec le Pathfinder
  - Covers ajoutés à `obstacleList` automatiquement
  - Suppression de l'obstacle quand cover détruit via événement `arena:obstacleRemoved`
  - Appel à `pathfinder.invalidateArea()` pour mettre à jour la grille

### Balance Suggérée

| Type | HP | Bloque LOS | Tir Par-Dessus | Loot |
|------|-----|------------|----------------|------|
| Pilier | ∞ | Oui | Non | Non |
| Muret | 80 | Oui | Oui | Non |
| Table | 40 | Non | Oui | Rare |
| Caisse | 30 | Non | Non | Commun |
| Étagère | 50 | Non | Non | Bonus |

---

## 5.2 Zones de Terrain (TerrainZone)

### Objectif
Créer des zones qui modifient la mobilité et infligent des effets. Ces zones affectent AUTANT le joueur que les zombies, créant des opportunités tactiques.

### Classes à Créer

#### `TerrainZone.ts` — Classe de Base

```typescript
interface TerrainZoneConfig {
  type: TerrainType;
  x: number;
  y: number;
  width: number;
  height: number;
  slowFactor?: number;          // 0.5 = 50% de vitesse
  damagePerSecond?: number;
  revealInvisibles?: boolean;
  conductElectricity?: boolean;
}

enum TerrainType {
  PUDDLE = 'puddle',           // Ralentissement, conduit électricité
  BLOOD_POOL = 'blood_pool',   // Ralentissement léger
  DEBRIS = 'debris',           // Ralentissement
  ELECTRIC = 'electric',       // Dégâts périodiques
  FIRE = 'fire',               // Dégâts, révèle invisibles (existe déjà: FireZone)
  ACID = 'acid',               // Dégâts corrosifs (créé par Spitter)
}
```

### Tâches

- [x] **5.2.1** Créer `TerrainZone.ts` avec classe de base
  - Zone de collision (trigger, pas de blocage physique)
  - Détection des entités dans la zone
  - Application des effets (slow, damage)
  - Visuel (sprite ou tileSprite)

- [x] **5.2.2** Implémenter les flaques (eau/sang)
  - `slowFactor: 0.6` (40% de ralentissement)
  - Effet visuel (éclaboussures quand traversé)
  - Révèle les Invisibles (éclaboussures visibles)
  - Conduit l'électricité du TeslaCannon

- [x] **5.2.3** Implémenter les zones de gravats
  - `slowFactor: 0.7` (30% de ralentissement)
  - Pas de dégâts
  - Son de pas différent

- [x] **5.2.4** Implémenter les zones électrifiées
  - `damagePerSecond: 15`
  - Effet visuel (arcs électriques)
  - Peut être activée/désactivée par générateur
  - Bonus de dégâts si cible dans flaque

- [x] **5.2.5** Refactorer `FireZone.ts` pour hériter de `TerrainZone`
  - Standardiser l'interface
  - Ajouter à la liste des zones de l'Arena

- [x] **5.2.6** Créer `AcidZone.ts` pour les flaques de Spitter
  - Durée limitée (disparaît après X secondes)
  - Dégâts corrosifs
  - Créé automatiquement par les projectiles acides

- [x] **5.2.7** Intégrer avec les entités
  - `GameScene.checkTerrainZoneEffects()` vérifie les entités
  - Stackable? Non — prendre le pire effet
  - Durée de l'effet : temps dans la zone + 0.2s après sortie

- [x] **5.2.8** Intégrer avec TeslaCannon
  - Détecter si cible dans flaque
  - Propager l'arc à toutes les entités dans la même flaque
  - Bonus de dégâts (+50%)

### Balance Suggérée

| Type | Slow | DPS | Durée | Spécial |
|------|------|-----|-------|---------|
| Flaque | 40% | 0 | Permanent | Conduit électricité |
| Sang | 20% | 0 | Permanent | - |
| Gravats | 30% | 0 | Permanent | - |
| Électrique | 0% | 15 | Activable | - |
| Feu | 0% | 20 | 3-5s | Révèle Invisible |
| Acide | 20% | 10 | 4s | - |

---

## 5.3 Éléments Interactifs

### Objectif
Ajouter des éléments environnementaux que le joueur peut exploiter tactiquement : barils explosifs, interrupteurs, générateurs, pièges.

### Classes à Créer

#### `Interactive.ts` — Classe de Base

```typescript
interface InteractiveConfig {
  type: InteractiveType;
  x: number;
  y: number;
  triggerType: TriggerType;
  cooldown?: number;
  charges?: number;  // -1 = infini
}

enum InteractiveType {
  BARREL_EXPLOSIVE = 'barrel_explosive',
  BARREL_FIRE = 'barrel_fire',
  SWITCH = 'switch',
  GENERATOR = 'generator',
  FLAME_TRAP = 'flame_trap',
  BLADE_TRAP = 'blade_trap',
}

enum TriggerType {
  ON_DAMAGE = 'on_damage',      // Déclenché quand touché
  ON_INTERACT = 'on_interact',  // Déclenché par touche E
  ON_PROXIMITY = 'on_proximity', // Déclenché quand proche
  ON_SWITCH = 'on_switch',      // Déclenché par interrupteur
}
```

### Tâches

- [x] **5.3.1** Créer `Interactive.ts` avec classe de base
  - `trigger()` : Déclenche l'effet
  - `canTrigger()` : Vérifie cooldown/charges
  - Event `interactive:trigger`

- [x] **5.3.2** Implémenter `BarrelExplosive.ts`
  - Déclenché quand touché par projectile ou explosion
  - Explosion : 100 dégâts, rayon 128px
  - Réaction en chaîne avec autres barils
  - Affecte joueur ET zombies
  - Particules + screen shake

- [x] **5.3.3** Implémenter baril incendiaire (`BarrelFire.ts`)
  - Comme explosif mais crée une `FireZone` au lieu d'explosion
  - Zone de feu : rayon 96px, durée 5s

- [x] **5.3.4** Implémenter `Switch.ts`
  - Déclenché par interaction (touche E) ou projectile
  - Lie à un ou plusieurs éléments (portes, pièges, générateurs)
  - États : ON/OFF avec feedback visuel
  - Cooldown entre activations

- [x] **5.3.5** Implémenter `Generator.ts`
  - Peut être saboté (tiré dessus = panne)
  - Contrôle des zones électrifiées à distance
  - Peut être réparé par le joueur
  - États visuels : actif, inactif, en panne

- [x] **5.3.6** Implémenter `FlameTrap.ts`
  - Activé par interrupteur
  - Jet de flamme dans une direction pendant X secondes
  - Crée une ligne de `FireZone` temporaire
  - Dégâts importants (30 DPS)

- [x] **5.3.7** Implémenter `BladeTrap.ts`
  - Lames rotatives au sol
  - Activé par interrupteur ou permanent
  - Dégâts au contact (50 par hit)
  - Zone de danger visuelle

- [x] **5.3.8** Système d'interaction joueur
  - Touche E pour interagir
  - Feedback visuel lors de l'interaction
  - Cooldown global d'interaction (éviter spam)

### Balance Suggérée

| Élément | Dégâts | Rayon | Cooldown | Spécial |
|---------|--------|-------|----------|---------|
| Baril Explosif | 100 | 128px | - | Chain reaction |
| Baril Feu | 20/s | 96px | - | Zone 5s |
| Piège Flamme | 30/s | Ligne | 10s | Durée 3s |
| Piège Lames | 50/hit | 64px | 0.5s | Permanent si ON |
| Générateur | - | Zone | - | Crée zone électrique |

---

## 5.4 Environnements et Tilemaps

### Objectif
Remplacer la génération procédurale par des niveaux designés avec Tiled, offrant des layouts tactiques variés pour chaque setting.

### Architecture Tilemap

```
public/assets/tilemaps/
├── tilesets/
│   ├── common.png          # Murs, sols communs
│   ├── hospital.png        # Spécifique hôpital
│   ├── mall.png            # Spécifique centre commercial
│   ├── metro.png           # Spécifique métro
│   ├── lab.png             # Spécifique laboratoire
│   └── prison.png          # Spécifique prison
├── hospital.json           # Map Tiled - Hôpital
├── mall.json               # Map Tiled - Centre commercial
├── metro.json              # Map Tiled - Métro
├── lab.json                # Map Tiled - Laboratoire
└── prison.json             # Map Tiled - Prison
```

### Layers Tiled Standardisés

```
Layers (du bas vers le haut):
1. floor          - Sol de base
2. floor_detail   - Détails de sol (fissures, taches)
3. walls          - Murs (collision)
4. walls_top      - Haut des murs (rendu au-dessus du joueur)
5. decorations    - Décorations sans collision
6. objects        - Object layer pour entités

Object Layer Properties:
- type: "door" | "cover" | "terrain" | "interactive" | "spawn_player"
- subtype: Selon le type (ex: "pillar", "puddle", "barrel_explosive")
- properties: Config spécifique (health, slowFactor, etc.)
```

### Tâches

- [ ] **5.4.1** Créer `LevelLoader.ts`
  - Charge les tilemaps Tiled (JSON)
  - Parse les layers et crée les collisions
  - Parse l'object layer pour spawner les entités
  - Retourne une config utilisable par `Arena`

- [ ] **5.4.2** Refactorer `Arena.ts` pour utiliser les tilemaps
  - Accepter une config de niveau OU générer procéduralement (fallback)
  - Créer les covers depuis l'object layer
  - Créer les terrain zones depuis l'object layer
  - Créer les interactifs depuis l'object layer
  - Placer les portes depuis l'object layer

- [ ] **5.4.3** Créer le tileset commun
  - Murs basiques (variations)
  - Sols basiques (variations)
  - Props génériques (caisse, baril, etc.)

- [ ] **5.4.4** Designer et créer `hospital.json`
  - Longs corridors entre piliers
  - Lits comme couverture mobile
  - Zones de sang (flaques)
  - Interrupteurs pour portes
  - 8 positions de portes

- [ ] **5.4.5** Designer et créer `mall.json`
  - Espaces ouverts avec îlots
  - Comptoirs et présentoirs
  - Escalators (rampes tactiques)
  - Mannequins (confusion visuelle, décoratif)

- [ ] **5.4.6** Designer et créer `metro.json`
  - Quais parallèles étroits
  - Piliers massifs
  - Rames de métro (obstacles linéaires)
  - Tunnels sombres aux extrémités (spawn spéciaux)

- [ ] **5.4.7** Designer et créer `lab.json`
  - Cuves brisées (couverture)
  - Équipement scientifique
  - Zones de contamination (buff zombies qui traversent)
  - Ambiance stérile/inquiétante

- [ ] **5.4.8** Designer et créer `prison.json`
  - Grilles et cellules (choke points)
  - Portes verrouillables temporairement
  - Cour centrale ouverte
  - Couloirs étroits

- [ ] **5.4.9** Intégrer la sélection de niveau
  - Enum `ArenaType` dans constants
  - `GameScene.setArena(type: ArenaType)`
  - Charger le bon tilemap au démarrage

### Spécificités par Environnement

| Environnement | Particularité | Éléments Uniques |
|---------------|---------------|------------------|
| Hôpital | Corridors longs | Lits mobiles, zones sang |
| Centre Commercial | Espaces ouverts | Îlots, escalators |
| Métro | Étroitesse | Rames, tunnels sombres |
| Laboratoire | Contamination | Cuves, buff zones |
| Prison | Choke points | Grilles, cellules |

---

## 5.5 Portes Avancées

### Objectif
Étendre le système de portes existant avec barricades, pièges et destruction par les boss.

### Tâches

- [ ] **5.5.1** Système de barricade
  - Nouvelle propriété `Door.barricadeHealth: number`
  - Coût en points pour barricader (via menu tactique futur)
  - Barricade bloque les spawns tant qu'elle tient
  - Zombies attaquent la barricade (dégâts = leur damage)
  - Event `door:barricade` quand posée
  - Event `door:barricade_destroyed` quand détruite
  - Visuel : planches clouées sur la porte

- [ ] **5.5.2** Pièges sur portes
  - Nouvelle propriété `Door.trap: TrapType | null`
  - Types : `SPIKE` (dégâts), `SLOW` (ralentissement), `FIRE` (zone de feu)
  - Coût en points pour poser
  - Se déclenche X fois avant destruction
  - Affecte les zombies qui spawn
  - Event `door:trap_triggered`

- [ ] **5.5.3** Destruction par boss
  - Méthode `Door.destroy()`
  - Boss défonce la porte à son entrée (cinématique)
  - Porte détruite = spawn permanent plus rapide
  - Pas de possibilité de réparer
  - Visuel : porte arrachée, cadre endommagé

- [ ] **5.5.4** Intégrer avec le futur menu tactique (Phase 6)
  - Interface pour sélectionner une porte
  - Options : Barricader (coût), Piéger (coût), Réparer barricade
  - Preview du coût et effet

### Balance Suggérée

| Action | Coût | Effet |
|--------|------|-------|
| Barricade légère | 100 pts | 100 HP |
| Barricade renforcée | 250 pts | 250 HP |
| Piège piques | 150 pts | 30 dégâts × 5 charges |
| Piège ralentisseur | 100 pts | 50% slow × 10 charges |
| Piège feu | 200 pts | Zone feu 3s × 3 charges |
| Réparer barricade | 50 pts | +50 HP (max original) |

---

## Ordre d'Implémentation Recommandé

### Semaine 1 : Fondations

1. **5.1.1-5.1.2** Cover de base + Piliers
2. **5.2.1-5.2.2** TerrainZone de base + Flaques
3. **5.1.5-5.1.6** Intégration Arena + Pathfinder

### Semaine 2 : Éléments Destructibles

4. **5.1.3-5.1.4** Murets + Mobilier destructible
5. **5.2.3-5.2.4** Gravats + Zones électrifiées
6. **5.2.5-5.2.7** Refactor FireZone + AcidZone + Intégration entités

### Semaine 3 : Interactifs

7. **5.3.1-5.3.3** Interactive base + Barils
8. **5.3.4-5.3.7** Switches + Générateurs + Pièges
9. **5.3.8** Système d'interaction joueur
10. **5.2.8** Intégration TeslaCannon + flaques

### Semaine 4 : Tilemaps

11. **5.4.1-5.4.3** LevelLoader + Refactor Arena + Tileset commun
12. **5.4.4-5.4.5** Maps Hôpital + Centre Commercial
13. **5.4.6-5.4.8** Maps Métro + Laboratoire + Prison
14. **5.4.9** Sélection de niveau

### Semaine 5 : Portes Avancées + Polish

15. **5.5.1-5.5.2** Barricades + Pièges sur portes
16. **5.5.3-5.5.4** Destruction boss + Préparation menu tactique
17. Tests d'intégration complets
18. Équilibrage et ajustements

---

## Tests et Validation

### Tests Unitaires

```typescript
// tests/unit/arena/Cover.test.ts
describe('Cover', () => {
  it('should block projectiles');
  it('should take damage when destructible');
  it('should emit cover:destroy event');
  it('should drop loot when configured');
  it('should update pathfinder on destruction');
});

// tests/unit/arena/TerrainZone.test.ts
describe('TerrainZone', () => {
  it('should slow entities in zone');
  it('should damage entities in zone');
  it('should reveal invisible zombies');
  it('should conduct electricity from TeslaCannon');
});

// tests/unit/arena/Interactive.test.ts
describe('Interactive', () => {
  it('should trigger on damage');
  it('should respect cooldown');
  it('should chain react explosives');
  it('should link switches to targets');
});
```

### Tests d'Intégration

- [ ] Zombie pathfinding avec covers multiples
- [ ] Tank détruit un muret, path recalculé
- [ ] TeslaCannon dans flaque touche 5 zombies
- [ ] Chaîne de barils explosifs
- [ ] Porte barricadée résiste X secondes
- [ ] Niveau chargé depuis tilemap avec tous les éléments

### Métriques à Collecter (Télémétrie)

```typescript
// Nouveaux events pour TelemetryManager
'telemetry:cover_destroyed': { type: CoverType; destroyer: string; wave: number };
'telemetry:terrain_effect': { type: TerrainType; target: 'player' | 'zombie'; duration: number };
'telemetry:interactive_triggered': { type: InteractiveType; kills: number };
'telemetry:door_barricade': { action: 'placed' | 'destroyed'; wave: number };
```

---

## Dépendances et Pré-requis

### Code Existant à Modifier

| Fichier | Modifications | État |
|---------|---------------|------|
| `Arena.ts` | Refactor pour utiliser Cover, TerrainZone, Interactive | ✅ Cover + TerrainZone + Interactive intégrés |
| `Pathfinder.ts` | Mise à jour dynamique des obstacles | ✅ Déjà supporté (`invalidateArea`) |
| `GameScene.ts` | Intégration nouvelles classes, collisions | ✅ TerrainZone + covers + interactive |
| `TeslaCannon.ts` | Intégration propagation via flaques | ✅ Propagation + bonus dégâts |
| `FlamePool.ts` | Utilisation nouveau FireZone | ✅ Import mis à jour |
| `CombatSystem.ts` | Gestion dégâts environnementaux | À faire |
| `TelemetryManager.ts` | Nouveaux events | À faire |
| `PreloadScene.ts` | Chargement tilemaps et tilesets | À faire |
| `constants.ts` | Enum ArenaType, nouvelles constantes | À faire |
| `balance.ts` | Stats covers, terrains, interactifs | ✅ Stats covers + terrainZones + interactive ajoutées |
| `events.ts` | Nouveaux events interactive | ✅ Events interactive ajoutés |

### Assets Nécessaires (Priorité)

1. **Sprites covers** : pilier, muret, table, caisse, étagère
2. **Sprites terrains** : flaque, sang, gravats, zone électrique
3. **Sprites interactifs** : barils, switch, générateur, pièges
4. **Effets** : explosion, étincelles, débris
5. **Tilesets** : au moins le tileset commun pour commencer

### Nouvelles Dépendances NPM

Aucune — Phaser gère tout nativement (tilemaps, collision, etc.)

---

## Checklist de Validation Phase 5

### Fonctionnel

- [x] Piliers bloquent mouvement et projectiles
- [x] Murets peuvent être détruits par les projectiles
- [x] Mobilier drop du loot à la destruction (événement émis, système de loot en Phase 6)
- [x] Flaques ralentissent joueur et zombies
- [x] Zones électriques infligent des dégâts
- [x] TeslaCannon se propage via les flaques (+50% dégâts)
- [x] Barils explosifs chain react
- [x] Interrupteurs activent les pièges (switches, générateurs)
- [x] Pièges à flammes et lames fonctionnels
- [x] Système d'interaction joueur (touche E)
- [ ] Tilemaps chargent correctement
- [ ] Portes peuvent être barricadées

### Performance

- [ ] Pas de lag avec 20+ covers
- [ ] Pas de lag avec 10+ terrain zones
- [ ] Pathfinding reste fluide avec obstacles dynamiques
- [ ] Chargement niveau < 2 secondes

### Game Feel

- [ ] Le terrain influence les décisions tactiques
- [ ] Les barils sont satisfaisants à faire exploser
- [ ] Les environnements se sentent différents
- [ ] Les barricades sont utiles sans être OP

---

## Notes pour le Designer

### Principes de Level Design

1. **Chaque arène doit avoir** :
   - 8 positions de portes (2 par mur)
   - Au moins 4 piliers indestructibles
   - Mix de covers destructibles
   - 2-3 zones de terrain
   - 2-4 éléments interactifs

2. **Règle des 3 sorties** :
   - Le joueur doit toujours avoir au moins 3 directions de fuite
   - Éviter les culs-de-sac

3. **Flow du combat** :
   - Zones ouvertes pour kiter
   - Choke points pour défendre
   - Routes alternatives pour repositionnement

4. **Placement des interactifs** :
   - Barils près des portes (risque/récompense)
   - Générateurs au centre (objectif secondaire)
   - Pièges sur les chemins prévisibles

### Questions Ouvertes pour le Designer

- Le Tank doit-il détruire les piliers aussi? (Non recommandé — trop chaotique)
- Les zones de contamination (lab) buffent les zombies comment? (+damage? +speed? +HP?)
- Les rames de métro sont-elles traversables ou des obstacles complets?
