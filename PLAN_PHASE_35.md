# Plan Phase 3.5 — Consolidation Avant Arsenal

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

**Priorité : Haute**

Le gameplay tactique décrit dans le GDD (colonnes, murets, goulots d'étranglement) nécessite que les zombies contournent les obstacles.

**Fichier à créer : `src/utils/pathfinding.ts`**

**Spécifications :**
- Grille de navigation basée sur TILE_SIZE (32px)
- Précalcul de la grille walkable au chargement de l'arène
- Algorithme A* avec heuristique Manhattan
- Cache des chemins avec invalidation si obstacle détruit
- Fallback sur ligne droite si pas de chemin trouvé

**Architecture suggérée :**

```typescript
interface PathNode {
  x: number;
  y: number;
  g: number;  // Coût depuis départ
  h: number;  // Heuristique vers arrivée
  f: number;  // g + h
  parent: PathNode | null;
}

class Pathfinder {
  private grid: boolean[][];  // true = walkable
  private width: number;
  private height: number;

  constructor(arena: Arena) {
    this.buildGrid(arena);
  }

  findPath(start: Vector2, end: Vector2): Vector2[];
  private buildGrid(arena: Arena): void;
  private getNeighbors(node: PathNode): PathNode[];
  private heuristic(a: PathNode, b: PathNode): number;

  // Invalider une zone (obstacle détruit)
  invalidateArea(x: number, y: number, width: number, height: number): void;
}
```

**Actions :**
- [ ] Créer `src/utils/pathfinding.ts` avec classe `Pathfinder`
- [ ] Implémenter A* avec grille précalculée
- [ ] Modifier `Arena.ts` pour exposer les données de collision à Pathfinder
- [ ] Modifier `MovementComponent.ts` pour utiliser Pathfinder
- [ ] Ajouter méthode `setPath(waypoints: Vector2[])` à MovementComponent
- [ ] Tester avec obstacles dans l'arène

**Optimisations futures (hors scope 3.5) :**
- Flow field pour les hordes (> 20 zombies)
- Hierarchical pathfinding pour grandes arènes

---

### 3.5.3 Zombie Crawler (Validation Concept Angle Mort)

**Priorité : Moyenne**

Le Crawler valide un concept clé du GDD : les ennemis au sol dans les angles morts. Important à tester avant d'ajouter les 7 autres types.

**Fichier à créer : `src/entities/zombies/Crawler.ts`**

**Spécifications (depuis GDD) :**
- Rampe au sol, difficile à repérer
- Surgit des angles morts
- Attaque surprise : dégâts + effet de sursaut (désorientation brève)

**Implémentation :**
- Sprite plus petit (24x24 vs 32x32)
- Hitbox réduite en hauteur
- État HIDDEN avant détection (sprite semi-transparent)
- Attaque applique un debuff "stun" de 300ms au joueur

**Actions :**
- [ ] Créer `src/entities/zombies/Crawler.ts`
- [ ] Ajouter sprite placeholder (rectangle vert foncé 24x24)
- [ ] Implémenter état HIDDEN avec transition vers CHASE
- [ ] Ajouter effet visuel de révélation (fade in)
- [ ] Implémenter effet "stun" sur le joueur (désactive input 300ms)
- [ ] Ajouter à `ZombieFactory` et `ZOMBIE_CONFIGS`
- [ ] Tester l'intégration dans les vagues (apparition vague 6+)

---

### 3.5.4 Tests Unitaires Systèmes Critiques

**Priorité : Moyenne**

Les systèmes de vagues et de combat sont critiques. Des régressions ici casseraient le core loop.

**Fichiers à créer dans `tests/unit/` :**

**`tests/unit/WaveSystem.test.ts`**
```typescript
describe('WaveSystem', () => {
  describe('generateNextWave', () => {
    it('should increase zombie count each wave');
    it('should cap zombie count at maxZombiesPerWave');
    it('should add doors every N waves');
    it('should cap doors at maxDoors');
    it('should introduce new zombie types at correct waves');
  });

  describe('state transitions', () => {
    it('should transition IDLE -> PREPARING -> ACTIVE');
    it('should transition ACTIVE -> CLEARING when all zombies dead');
    it('should transition CLEARING -> IDLE after delay');
  });
});
```

**`tests/unit/PoolManager.test.ts`**
```typescript
describe('PoolManager', () => {
  it('should return inactive zombie from pool');
  it('should create new zombie if pool empty');
  it('should not exceed max pool size');
  it('should properly reset zombie state on reuse');
});
```

**`tests/unit/Pathfinder.test.ts`**
```typescript
describe('Pathfinder', () => {
  it('should find direct path with no obstacles');
  it('should find path around single obstacle');
  it('should return empty array if no path exists');
  it('should invalidate cache when obstacle destroyed');
});
```

**Actions :**
- [ ] Créer `tests/unit/WaveSystem.test.ts`
- [ ] Créer `tests/unit/PoolManager.test.ts`
- [ ] Créer `tests/unit/Pathfinder.test.ts` (après 3.5.2)
- [ ] Configurer script npm `test:unit` dans package.json
- [ ] Atteindre 80% coverage sur ces 3 fichiers

---

### 3.5.5 Refactoring Mineur

**Priorité : Basse**

Nettoyage de code pour faciliter la Phase 4.

**Actions :**
- [ ] Extraire les magic numbers restants vers `constants.ts` ou `balance.ts`
- [ ] Ajouter JSDoc manquants sur méthodes publiques de `WaveSystem`
- [ ] Créer type `ZombieType` union depuis balance.ts (remplacer strings)
- [ ] Documenter les events émis par chaque système dans `src/types/events.ts`

---

## Critères de Validation Phase 3.5

- [x] Fichier `balance.ts` créé et utilisé par tous les systèmes
- [ ] Pathfinding A* fonctionnel — zombies contournent les piliers
- [ ] Crawler implémenté et intégré aux vagues
- [ ] Tests unitaires passent avec coverage > 80% sur systèmes ciblés
- [ ] Aucune régression sur le gameplay existant

---

## Estimation Effort

| Tâche | Complexité | Fichiers impactés | Statut |
|-------|------------|-------------------|--------|
| 3.5.1 Balance | Faible | 8 fichiers (migration) | ✅ Terminé |
| 3.5.2 Pathfinding | Haute | 3 fichiers (nouveau + intégration) | ⏳ En attente |
| 3.5.3 Crawler | Moyenne | 4 fichiers | ⏳ En attente |
| 3.5.4 Tests | Moyenne | 3 fichiers nouveaux | ⏳ En attente |
| 3.5.5 Refactoring | Faible | Plusieurs fichiers | ⏳ En attente |

---

## Notes pour les Développeurs

### Priorité d'Implémentation Recommandée

1. **balance.ts** — Fondation pour tout le reste
2. **Pathfinding** — Bloquant pour le gameplay tactique
3. **Crawler** — Validation design + nouveau contenu
4. **Tests** — Peuvent être écrits en parallèle
5. **Refactoring** — À faire en continu

### Points d'Attention

- **Ne pas casser le gameplay existant** — Le jeu doit rester jouable à chaque commit
- **Pathfinding** — Commencer simple (A* naïf), optimiser plus tard si nécessaire
- **Crawler** — L'effet "stun" ne doit pas être frustrant, tester avec différentes durées

### Ressources

- A* Pathfinding : [Red Blob Games](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- Phaser 3 Docs : [phaser.io/docs](https://phaser.io/docs)
- Vitest Docs : [vitest.dev](https://vitest.dev)
