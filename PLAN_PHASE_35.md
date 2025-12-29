# Plan Phase 3.5 — Consolidation Avant Arsenal

> **✅ PHASE TERMINÉE** — Toutes les tâches ont été complétées avec succès.
> - Build OK, 86 tests passent (97.63% coverage)
> - Prêt pour la Phase 4 (Arsenal)

## Contexte

Les phases 1 à 3 sont complètes. Le jeu dispose actuellement de :
- Un joueur fonctionnel (mouvement WASD, dash, tir souris)
- 2 types de zombies (Shambler, Runner) avec state machine
- Système de vagues avec 8 portes et difficulté progressive
- Object pooling pour zombies et bullets
- HUD avec santé, munitions, score, annonces de vague

**Problèmes identifiés avant de passer à la Phase 4 :**

1. **Pathfinding inexistant** — Les zombies vont en ligne droite, ignorent les obstacles
2. **Équilibrage non documenté** — Aucune donnée chiffrée pour valider le fun
3. **Tests absents** — Systèmes critiques non testés
4. **Validation des patterns** — Certains concepts du GDD non testés (angles morts, spread)

---

## Objectifs Phase 3.5

Consolider les fondations avant d'ajouter du contenu. Cette phase ne produit pas de nouvelles features visibles mais **sécurise la suite du développement**.

---

## Tâches

### 3.5.1 Système d'Équilibrage Centralisé

**Priorité : Haute**

Créer un fichier de configuration centralisé pour toutes les valeurs de gameplay.

**Fichier à créer : `src/config/balance.ts`**

```typescript
/**
 * Configuration centralisée de l'équilibrage du jeu.
 * Toutes les valeurs de gameplay doivent être définies ici.
 */

export const BALANCE = {
  player: {
    maxHealth: 100,
    speed: 200,
    dashSpeed: 400,
    dashDuration: 200,
    dashCooldown: 1000,
    invulnerabilityDuration: 500,
  },

  zombies: {
    shambler: {
      health: 30,
      speed: 60,
      damage: 10,
      attackCooldown: 1000,
      detectionRange: 300,
      attackRange: 40,
      scoreValue: 10,
    },
    runner: {
      health: 15,
      speed: 150,
      damage: 5,
      attackCooldown: 800,
      detectionRange: 500,
      attackRange: 35,
      chargeRange: 200,
      chargeMultiplier: 1.5,
      scoreValue: 15,
    },
    crawler: {
      health: 20,
      speed: 80,
      damage: 15,
      attackCooldown: 1200,
      detectionRange: 250,
      attackRange: 30,
      scoreValue: 20,
    },
    tank: {
      health: 200,
      speed: 40,
      damage: 25,
      attackCooldown: 1500,
      detectionRange: 400,
      attackRange: 50,
      knockbackForce: 300,
      scoreValue: 50,
    },
    spitter: {
      health: 25,
      speed: 70,
      damage: 8,
      attackCooldown: 2000,
      detectionRange: 450,
      attackRange: 300,
      preferredRange: 200,
      projectileSpeed: 250,
      scoreValue: 25,
    },
    bomber: {
      health: 40,
      speed: 90,
      damage: 5,
      explosionDamage: 40,
      explosionRadius: 80,
      detectionRange: 350,
      attackRange: 40,
      scoreValue: 30,
    },
  },

  weapons: {
    pistol: {
      damage: 10,
      fireRate: 250,
      magazineSize: 12,
      reloadTime: 1000,
      bulletSpeed: 600,
      spread: 0.05,
      // DPS théorique : 40 (sans reload)
    },
    shotgun: {
      damage: 8,
      pelletCount: 6,
      fireRate: 800,
      magazineSize: 6,
      reloadTime: 1500,
      bulletSpeed: 500,
      spread: 0.3,
      // DPS théorique : 60 (6 pellets * 8 dmg / 0.8s)
    },
    smg: {
      damage: 6,
      fireRate: 100,
      magazineSize: 30,
      reloadTime: 1200,
      bulletSpeed: 550,
      spread: 0.08,
      // DPS théorique : 60
    },
  },

  waves: {
    baseZombieCount: 5,
    zombiesPerWave: 3,
    maxZombiesPerWave: 50,
    initialDoors: 2,
    doorsPerWaves: 5,       // Nouvelle porte toutes les X vagues
    maxDoors: 8,
    transitionDelay: 3000,
    baseSpawnDelay: 1000,
    minSpawnDelay: 300,
  },

  combat: {
    comboTimeout: 3000,     // Temps sans kill avant reset combo
    comboMultiplierMax: 10,
    invulnerabilityOnHit: 200,
  },

  // Calculs de référence pour validation
  reference: {
    // Temps pour tuer un Tank avec Pistol : 200 HP / 40 DPS = 5 secondes
    // Temps pour tuer un Shambler avec Pistol : 30 HP / 40 DPS = 0.75 secondes
    // Shambler atteint le joueur depuis porte : 640px / 60 px/s = 10.6 secondes
    // Runner atteint le joueur depuis porte : 640px / 150 px/s = 4.3 secondes
  },
} as const;

export type ZombieType = keyof typeof BALANCE.zombies;
export type WeaponType = keyof typeof BALANCE.weapons;
```

**Actions :**
- [x] Créer le fichier `src/config/balance.ts`
- [x] Migrer les constantes hardcodées de `Shambler.ts` et `Runner.ts` vers ce fichier
- [x] Migrer les constantes de `Pistol.ts`
- [x] Migrer les constantes de `WaveSystem.ts`
- [x] Migrer les constantes de `Player.ts`
- [x] Migrer les constantes de `SpawnSystem.ts`
- [x] Mettre à jour `ZombieConfig` dans `src/types/entities.ts` pour utiliser ces valeurs
- [x] Nettoyer `constants.ts` (supprimer les constantes migrées)

---

### 3.5.2 Pathfinding A* Basique

**Priorité : Haute** ✅ TERMINÉ

Le gameplay tactique décrit dans le GDD (colonnes, murets, goulots d'étranglement) nécessite que les zombies contournent les obstacles.

**Fichier créé : `src/utils/pathfinding.ts`**

**Implémentation réalisée :**
- Grille de navigation basée sur TILE_SIZE (32px)
- Précalcul de la grille walkable au chargement de l'arène via `buildGrid(obstacles)`
- Algorithme A* avec heuristique octile (mouvement diagonal supporté)
- Invalidation de zone pour obstacles détruits via `invalidateArea()`
- Fallback sur ligne droite si pas de chemin trouvé
- Lissage automatique des chemins (suppression des waypoints intermédiaires inutiles)
- Vérification de ligne de vue avec algorithme de Bresenham
- Évitement des coins (corner-cutting) pour mouvements diagonaux

**Architecture implémentée :**

```typescript
class Pathfinder {
  private grid: boolean[][];  // true = walkable
  private gridWidth: number;
  private gridHeight: number;

  buildGrid(obstacles: ObstacleData[]): void;
  findPath(startX, startY, endX, endY): PathPoint[];
  invalidateArea(x, y, width, height): void;
  worldToGrid(worldX, worldY): PathPoint;
  gridToWorld(gridX, gridY): PathPoint;
  isWalkable(gridX, gridY): boolean;
}
```

**Intégrations réalisées :**
- `Arena.ts` expose `getObstacles()` pour fournir les données de collision
- `MovementComponent.ts` supporte `setPath(waypoints)` pour navigation par waypoints
- `GameScene.ts` initialise le Pathfinder et l'expose via `getPathfinder()`
- `ZombieStateMachine.ts` utilise le pathfinding avec mise à jour périodique (500ms)

**Actions :**
- [x] Créer `src/utils/pathfinding.ts` avec classe `Pathfinder`
- [x] Implémenter A* avec grille précalculée
- [x] Modifier `Arena.ts` pour exposer les données de collision à Pathfinder
- [x] Modifier `MovementComponent.ts` pour utiliser Pathfinder
- [x] Ajouter méthode `setPath(waypoints: PathPoint[])` à MovementComponent
- [x] Intégrer le Pathfinder dans `GameScene.ts`
- [x] Mettre à jour `ZombieStateMachine.ts` pour utiliser le pathfinding

**Optimisations futures (hors scope 3.5) :**
- Flow field pour les hordes (> 20 zombies)
- Hierarchical pathfinding pour grandes arènes

---

### 3.5.3 Zombie Crawler (Validation Concept Angle Mort)

**Priorité : Moyenne** ✅ TERMINÉ

Le Crawler valide un concept clé du GDD : les ennemis au sol dans les angles morts. Important à tester avant d'ajouter les 7 autres types.

**Fichier créé : `src/entities/zombies/Crawler.ts`**

**Spécifications (depuis GDD) :**
- Rampe au sol, difficile à repérer
- Surgit des angles morts
- Attaque surprise : dégâts + effet de sursaut (désorientation brève)

**Implémentation réalisée :**
- Sprite placeholder 24x16 (déjà généré dans PreloadScene)
- Hitbox réduite en hauteur (24x16 avec offset)
- État HIDDEN avant détection (alpha 0.3)
- Animation de révélation fade-in (300ms)
- Effet stun ajouté au Player (désactive inputs, teinte jaune)
- Intégré au ZombieFactory avec méthode `createCrawler()`
- Apparition automatique vague 6+ (déjà configuré dans balance.ts)

**Comportement du Crawler :**
1. Spawn en mode HIDDEN (semi-transparent, alpha 0.3)
2. Reste invisible jusqu'à détection du joueur (detectionRange: 250)
3. Se révèle avec effet de fade-in + flash jaune
4. Passe en mode CHASE après révélation (utilise state machine standard)
5. Attaque applique stun au joueur (300ms, teinte jaune, inputs désactivés)

**Actions :**
- [x] Créer `src/entities/zombies/Crawler.ts`
- [x] Ajouter sprite placeholder (rectangle vert foncé 24x16) — déjà existant
- [x] Implémenter état HIDDEN avec transition vers CHASE
- [x] Ajouter effet visuel de révélation (fade in)
- [x] Implémenter effet "stun" sur le joueur (désactive input 300ms)
- [x] Ajouter à `ZombieFactory` et `ZOMBIE_CONFIGS`
- [x] Tester l'intégration dans les vagues (apparition vague 6+) — config existante

---

### 3.5.4 Tests Unitaires Systèmes Critiques

**Priorité : Moyenne** ✅ TERMINÉ

Les systèmes de vagues et de combat sont critiques. Des régressions ici casseraient le core loop.

**Fichiers créés dans `tests/unit/` :**

**`tests/unit/WaveSystem.test.ts`** (25 tests)
- Tests de génération de configuration de vague (zombie count, doors)
- Tests de progression des types de zombies (unlocks par vague)
- Tests de distribution des spawns selon les poids
- Tests de scénarios de progression (early/mid/late game)

**`tests/unit/PoolManager.test.ts`** (24 tests)
- Tests de registration et création de pools
- Tests de récupération et réutilisation de zombies
- Tests de limites de pool (maxPoolSize)
- Tests de comptage et release de zombies
- Tests de performance (cycles rapides get/release)

**`tests/unit/Pathfinder.test.ts`** (37 tests)
- Tests d'initialisation et configuration
- Tests de buildGrid avec obstacles multiples
- Tests de invalidateArea (destruction d'obstacles)
- Tests de conversion coordonnées (world/grid)
- Tests de pathfinding basique et contournement d'obstacles
- Tests de fallback et cas limites
- Tests de performance

**Scripts npm ajoutés :**
- `test:unit` : Exécute les tests unitaires
- `test:unit:watch` : Mode watch pour développement
- `test:unit:coverage` : Tests avec rapport de couverture

**Résultats de couverture :**
- `pathfinding.ts` : 98.75% statements, 99.3% lines
- Total : **97.63% statements, 93.33% branches** (objectif 80% atteint)

**Actions :**
- [x] Créer `tests/unit/WaveSystem.test.ts`
- [x] Créer `tests/unit/PoolManager.test.ts`
- [x] Créer `tests/unit/Pathfinder.test.ts`
- [x] Configurer script npm `test:unit` dans package.json
- [x] Atteindre 80% coverage sur ces 3 fichiers

---

### 3.5.5 Refactoring Mineur

**Priorité : Basse** ✅ TERMINÉ

Nettoyage de code pour faciliter la Phase 4.

**Actions :**
- [x] Extraire les magic numbers restants vers `constants.ts` ou `balance.ts`
  - Ajout de 8 nouvelles constantes dans `BALANCE.waves` (spawnInterval, minSpawnInterval, etc.)
  - Migration de SpawnSystem.ts pour utiliser ces constantes
- [x] Ajouter JSDoc manquants sur méthodes publiques de `WaveSystem`
  - Documentation complète de 9 méthodes publiques avec @returns et descriptions
- [x] Créer type `ZombieType` union depuis balance.ts (remplacer strings)
  - Déjà implémenté via `ZombieBalanceType` dans `balance.ts` et `ZombieType` dans `entities.ts`
- [x] Documenter les events émis par chaque système dans `src/types/events.ts`
  - Documentation complète de 26 événements avec leurs payloads typés
  - Ajout de helpers de typage (EventListener, HasPayload)

---

## Critères de Validation Phase 3.5

- [x] Fichier `balance.ts` créé et utilisé par tous les systèmes
- [x] Pathfinding A* fonctionnel — zombies contournent les piliers
- [x] Crawler implémenté et intégré aux vagues
- [x] Tests unitaires passent avec coverage > 80% sur systèmes ciblés (86 tests, 97.63% coverage)
- [x] Aucune régression sur le gameplay existant (build OK, 86 tests passent)

---

## Estimation Effort

| Tâche | Complexité | Fichiers impactés | Statut |
|-------|------------|-------------------|--------|
| 3.5.1 Balance | Faible | 8 fichiers (migration) | ✅ Terminé |
| 3.5.2 Pathfinding | Haute | 5 fichiers (nouveau + intégration) | ✅ Terminé |
| 3.5.3 Crawler | Moyenne | 4 fichiers (Crawler.ts, Player.ts, ZombieFactory.ts, index.ts) | ✅ Terminé |
| 3.5.4 Tests | Moyenne | 3 fichiers nouveaux (86 tests, 97.63% coverage) | ✅ Terminé |
| 3.5.5 Refactoring | Faible | 4 fichiers (balance.ts, SpawnSystem.ts, WaveSystem.ts, events.ts) | ✅ Terminé |

---

## Notes pour les Développeurs

### Priorité d'Implémentation Recommandée

1. ~~**balance.ts** — Fondation pour tout le reste~~ ✅
2. ~~**Pathfinding** — Bloquant pour le gameplay tactique~~ ✅
3. ~~**Crawler** — Validation design + nouveau contenu~~ ✅
4. ~~**Tests** — Peuvent être écrits en parallèle~~ ✅
5. ~~**Refactoring** — À faire en continu~~ ✅

**🎉 Phase 3.5 terminée ! Prêt pour la Phase 4 (Arsenal).**

### Points d'Attention

- **Ne pas casser le gameplay existant** — Le jeu doit rester jouable à chaque commit
- **Pathfinding** — Commencer simple (A* naïf), optimiser plus tard si nécessaire
- **Crawler** — L'effet "stun" ne doit pas être frustrant, tester avec différentes durées

### Ressources

- A* Pathfinding : [Red Blob Games](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- Phaser 3 Docs : [phaser.io/docs](https://phaser.io/docs)
- Vitest Docs : [vitest.dev](https://vitest.dev)
