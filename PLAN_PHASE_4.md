# Phase 4 : Arsenal et Zombies Complets

## Vue d'Ensemble

La Phase 4 est divisée en **4 sous-phases** pour une implémentation progressive et testable.

### État Actuel (déjà implémenté)
- ✅ Crawler (zombie au sol avec stun)
- ✅ A* Pathfinding (`src/utils/pathfinding.ts`)
- ✅ Balance configs complètes (`src/config/balance.ts`)
- ✅ Système de pooling (`PoolManager`)
- ✅ State machine zombies (`ZombieStateMachine`)

---

## Sous-Phase 4.1 : Armes à Feu + Changement d'Arme

### Objectif
Compléter l'arsenal d'armes à feu et permettre au joueur de changer d'arme.

### Tâches

#### 4.1.1 Shotgun ✅
**Fichier** : `src/weapons/firearms/Shotgun.ts`

```typescript
// Comportement :
// - 6 pellets en spread (±15°)
// - Chaque pellet = projectile indépendant
// - Dégâts par pellet : 8
// - DPS théorique : 60 (6×8 / 0.8s)
```

- [x] Créer classe Shotgun étendant Weapon
- [x] Override `fire()` pour créer 6 projectiles
- [x] Calculer angles de spread basés sur `pelletCount` et `spread`
- [x] Utiliser BulletPool existant pour chaque pellet

#### 4.1.2 SMG ✅
**Fichier** : `src/weapons/firearms/SMG.ts`

```typescript
// Comportement :
// - Cadence très rapide (100ms)
// - Grand chargeur (30 balles)
// - Dégâts faibles par balle (6)
// - DPS théorique : 60
```

- [x] Créer classe SMG étendant Weapon
- [x] Pattern standard (comme Pistol)
- [x] Spread léger pour simuler le recul

#### 4.1.3 SniperRifle ✅
**Fichier** : `src/weapons/firearms/SniperRifle.ts`

```typescript
// Comportement :
// - Dégâts massifs (80)
// - Cadence lente (1200ms)
// - Projectiles perforants (traversent ennemis)
// - Petit chargeur (5 balles)
```

- [x] Créer classe SniperRifle étendant Weapon
- [x] Implémenter projectiles perforants (ne pas détruire au premier hit)
- [x] Flag `piercing: true` sur les bullets
- [x] Système de tracking des cibles touchées dans BulletPool
- [x] CombatSystem mis à jour pour gérer les balles perforantes

#### 4.1.4 Système de Changement d'Arme ✅
**Fichier** : `src/entities/Player.ts`

```typescript
// Nouveau système :
weapons: Weapon[] = [];
currentWeaponIndex: number = 0;

addWeapon(weapon: Weapon): void;
switchWeapon(index: number): void;
cycleWeapon(direction: 1 | -1): void;
```

- [x] Ajouter array `weapons` au Player
- [x] Implémenter `addWeapon()` (max 4 armes)
- [x] Implémenter `switchWeapon(index)` avec touches 1, 2, 3, 4
- [x] Implémenter `cycleWeapon()` avec molette souris
- [x] Conserver les munitions par arme
- [x] Touche R pour rechargement manuel

#### 4.1.5 HUD Armes ✅
**Fichier** : `src/scenes/HUDScene.ts`

- [x] Afficher slots d'armes en bas de l'écran
- [x] Afficher nom et munitions pour chaque arme de l'inventaire
- [x] Highlight vert sur l'arme active
- [x] Indicateurs de touches (1-4) sur chaque slot
- [x] Indicateur de rechargement (*)
- [x] Couleur des munitions selon le niveau (rouge si vide, orange si bas)
- [x] Événements weaponInventoryChanged et weaponChanged

### Livrable 4.1 ✅
Le joueur peut équiper Pistol, Shotgun, SMG ou Sniper et changer d'arme en jeu.

**Implémenté le 29/12/2025** - Toutes les armes fonctionnelles avec système de changement d'arme complet.

---

## Sous-Phase 4.2 : Zombies Spécialisés

### Objectif
Implémenter les 7 types de zombies restants avec leurs comportements uniques.

### Tâches

#### 4.2.1 Tank ✅
**Fichier** : `src/entities/zombies/Tank.ts`

```typescript
// Stats (de balance.ts) :
// - HP: 200, Speed: 40, Damage: 25
// - knockbackForce: 300
// - Détruit couvertures destructibles
```

- [x] Créer classe Tank étendant Zombie
- [x] Override `attack()` pour appliquer knockback au joueur
- [x] Méthode `applyKnockback(target, force)` sur Player
- [ ] Collision avec destructibles → les détruit (non implémenté - pas de destructibles actuellement)

#### 4.2.2 Spitter ✅
**Fichier** : `src/entities/zombies/Spitter.ts`

```typescript
// Stats :
// - HP: 25, Speed: 70, Damage: 8
// - attackRange: 300, preferredRange: 200
// - projectileSpeed: 250
```

**Fichier** : `src/entities/projectiles/AcidSpitPool.ts`

- [x] Créer classe AcidSpitPool (pool de projectiles ennemis)
- [x] Pool séparé pour projectiles ennemis
- [x] Créer classe Spitter avec IA ranged
- [x] IA : maintient distance, fuit si joueur proche
- [x] Comportement ranged personnalisé dans update()

#### 4.2.3 Bomber ✅
**Fichier** : `src/entities/zombies/Bomber.ts`

```typescript
// Stats :
// - HP: 40, Speed: 90, Damage: 5
// - explosionDamage: 40, explosionRadius: 80
// - Chain reaction avec autres Bombers
```

- [x] Créer classe Bomber étendant Zombie
- [x] Override `die()` pour déclencher explosion
- [x] `explode()` : dégâts de zone, effets visuels
- [x] Détection autres Bombers dans le radius → chain

#### 4.2.4 Screamer ✅
**Fichier** : `src/entities/zombies/Screamer.ts`

```typescript
// Stats :
// - HP: 20, Speed: 50, Damage: 5
// - screamRadius: 200, screamSpeedBoost: 1.5
// - screamDuration: 5000ms, screamCooldown: 8000ms
```

- [x] Créer classe Screamer étendant Zombie
- [x] Méthode `scream()` avec cooldown
- [x] Buff tous les zombies dans le radius (speedBoost)
- [x] Animation wind-up avant le cri (télégraphié)
- [ ] Audio cue distinctif (non implémenté - nécessite assets audio)

#### 4.2.5 Splitter ✅
**Fichier** : `src/entities/zombies/Splitter.ts`

```typescript
// Stats :
// - HP: 35, Speed: 70, Damage: 8
// - splitCount: 2, miniHealth: 10, miniSpeed: 120
```

**Fichier** : `src/entities/zombies/MiniZombie.ts`

- [x] Créer classe MiniZombie (version réduite)
- [x] Créer classe Splitter étendant Zombie
- [x] Override `die()` pour spawner `splitCount` minis
- [x] Minis spawn à positions légèrement décalées

#### 4.2.6 Invisible ✅
**Fichier** : `src/entities/zombies/Invisible.ts`

```typescript
// Stats :
// - HP: 25, Speed: 100, Damage: 20
// - visibilityDistance: 100
// - Révélé par : feu, électricité, flaques
```

- [x] Créer classe Invisible étendant Zombie
- [x] Alpha très bas par défaut (0.1)
- [x] `reveal()` quand joueur à proximité
- [x] `reveal()` si touché (dégâts)
- [ ] Révélation par feu/électricité (sera implémenté avec les armes spéciales en 4.3)
- [ ] Effet de distorsion visuelle (shader optionnel - non implémenté)

#### 4.2.7 Necromancer ✅
**Fichier** : `src/entities/zombies/Necromancer.ts`

```typescript
// Stats :
// - HP: 30, Speed: 45, Damage: 5
// - resurrectRadius: 150, resurrectCooldown: 5000ms
// - fleeDistance: 250
```

**Fichier** : `src/managers/CorpseManager.ts`

- [x] Créer classe Necromancer étendant Zombie
- [x] IA spéciale : fuit le joueur activement
- [x] Cherche cadavres dans le radius
- [x] `resurrect(corpse)` : réanime un zombie mort
- [x] Système de tracking des cadavres (CorpseManager)

#### 4.2.8 Mise à Jour Factory ✅
**Fichier** : `src/entities/zombies/ZombieFactory.ts`

- [x] Enregistrer Tank, Spitter, Bomber, Screamer, Splitter, Invisible, Necromancer
- [x] Créer pools pour chaque nouveau type (automatique via PoolManager)
- [x] MiniZombie géré via événement 'miniZombieSpawned'

### Livrable 4.2 ✅
Tous les types de zombies du GDD sont jouables avec comportements distincts.

**Implémenté le 29/12/2025** - Tous les 7 nouveaux types de zombies sont fonctionnels :
- Tank : knockback sur le joueur
- Spitter : attaque à distance avec projectiles acides
- Bomber : explosion à la mort avec chain reaction
- Screamer : buff de vitesse pour les zombies proches
- Splitter : se divise en mini-zombies à la mort
- Invisible : quasi-invisible, révélé par proximité ou dégâts
- Necromancer : fuit le joueur et ressuscite les morts

---

## Sous-Phase 4.3 : Armes Spéciales et Mêlée ✅

### Objectif
Implémenter les armes à effets spéciaux et le système de mêlée.

### Tâches

#### 4.3.1 Classe de Base Mêlée ✅
**Fichier** : `src/weapons/melee/MeleeWeapon.ts`

```typescript
interface MeleeConfig {
  damage: number;
  range: number;        // Portée de l'arc
  swingSpeed: number;   // Durée du swing en ms
  knockback: number;    // Force de recul
  arcAngle: number;     // Angle de l'arc (ex: 90°)
}
```

- [x] Créer classe abstraite MeleeWeapon
- [x] Système de hitbox en arc (pas de projectile)
- [x] Méthode `swing()` au lieu de `fire()`
- [x] Cooldown basé sur swingSpeed
- [x] Détection collision arc ↔ zombies

#### 4.3.2 BaseballBat ✅
**Fichier** : `src/weapons/melee/BaseballBat.ts`

- [x] Bon équilibre portée/vitesse
- [x] Knockback moyen
- [x] Chance de stun avec effet visuel (étoiles)

#### 4.3.3 Machete ✅
**Fichier** : `src/weapons/melee/Machete.ts`

- [x] Rapide, portée réduite
- [x] Dégâts légèrement supérieurs
- [x] Pas de knockback
- [x] Effet visuel de slash sanglant

#### 4.3.4 Chainsaw ✅
**Fichier** : `src/weapons/melee/Chainsaw.ts`

- [x] DPS continu (pas de coups discrets)
- [x] Consomme carburant (nouvelle ressource)
- [x] Effet visuel de zone avec vibration
- [ ] Son distinctif (non implémenté - nécessite assets audio)

#### 4.3.5 Flamethrower ✅
**Fichier** : `src/weapons/special/Flamethrower.ts`
**Fichier** : `src/entities/projectiles/FlamePool.ts`
**Fichier** : `src/entities/effects/FireZone.ts`

- [x] Créer projectile Flame via FlamePool
- [x] Flames appliquent DoT (Damage over Time)
- [x] Laisse FireZones au sol (entités temporaires)
- [x] Révèle les Invisibles

#### 4.3.6 TeslaCannon ✅
**Fichier** : `src/weapons/special/TeslaCannon.ts`

- [x] Arc électrique primaire vers cible
- [x] Chain vers ennemis proches (max 4 cibles)
- [x] Algorithme de recherche de cibles secondaires
- [x] Effets visuels : lignes électriques en zigzag avec branches
- [x] Révèle les Invisibles

#### 4.3.7 NailGun ✅
**Fichier** : `src/weapons/special/NailGun.ts`

- [x] Projectiles qui immobilisent
- [x] Applique état `pinned` aux zombies via ZombieStateMachine
- [x] Durée d'immobilisation configurable
- [x] Cadence moyenne
- [x] Effet visuel de clouage (croix)

#### 4.3.8 CompositeBow ✅
**Fichier** : `src/weapons/special/CompositeBow.ts`

- [x] Silencieux (n'alerte pas les zombies) - flag `silent: true`
- [x] Système de charge (hold pour plus de dégâts)
- [x] Dégâts min/max selon temps de charge
- [x] Barre de charge visuelle avec indicateur de seuil
- [x] Perforant si charge >= 80%

#### 4.3.9 MicrowaveCannon ✅
**Fichier** : `src/weapons/special/MicrowaveCannon.ts`

- [x] Temps de charge avant tir
- [x] Dégâts en cône
- [x] Effet visuel : zombies "explosent" (particules gore)
- [x] Prévisualisation du cône pendant la charge

### Livrable 4.3 ✅
Arsenal complet avec armes conventionnelles, spéciales et mêlée.

**Implémenté le 29/12/2025** - Toutes les armes de mêlée et spéciales sont fonctionnelles :
- Mêlée : BaseballBat (avec stun), Machete (rapide), Chainsaw (DPS continu avec carburant)
- Spéciales : Flamethrower (DoT + zones de feu), TeslaCannon (chain lightning), NailGun (immobilisation), CompositeBow (charge + silencieux), MicrowaveCannon (cône + charge)

---

## Sous-Phase 4.4 : IA Avancée (Hordes) ✅

### Objectif
Implémenter des comportements de groupe sophistiqués pour les zombies.

### Tâches

#### 4.4.1 Steering Behaviors ✅
**Fichier** : `src/ai/SteeringBehaviors.ts`

```typescript
class SteeringBehaviors {
  seek(target: Vector2): Vector2;
  flee(threat: Vector2): Vector2;
  separation(neighbors: Entity[]): Vector2;
  alignment(neighbors: Entity[]): Vector2;
  cohesion(neighbors: Entity[]): Vector2;
  arrive(target: Vector2, slowingRadius: number): Vector2;
}
```

- [x] Implémenter `separation()` - éviter les autres zombies
- [x] Implémenter `alignment()` - s'aligner avec le groupe
- [x] Implémenter `cohesion()` - rester groupé
- [x] Implémenter `arrive()` - ralentir à l'approche
- [x] Implémenter `flee()` - pour Necromancer/Spitter
- [x] Implémenter `seek()` - se diriger vers une cible
- [x] Méthode `flock()` pour combiner les trois comportements de flocking
- [x] Méthode `calculateCombinedForce()` pour pondérer tous les comportements

#### 4.4.2 Gestionnaire de Groupe ✅
**Fichier** : `src/ai/HordeManager.ts`

```typescript
class HordeManager {
  private spatialGrid: Map<string, SpatialCell>;

  getNeighbors(zombie: Zombie, radius: number): Zombie[];
  calculateGroupVelocity(zombie: Zombie): Vector2;
  getGroupStats(zombie: Zombie): GroupStats;
  getZombiesToUpdate(zombies: Zombie[]): Zombie[];
}
```

- [x] Créer HordeManager avec spatial hashing
- [x] Grouper zombies par proximité (grille spatiale)
- [x] Calculer vélocité de groupe (moyenne pondérée)
- [x] Intégrer dans update des zombies via GameScene
- [x] Cache des voisins pour éviter les recalculs

#### 4.4.3 Comportements Tactiques ✅
**Fichier** : `src/ai/TacticalBehaviors.ts`

- [x] **Encerclement** : zombies se répartissent autour du joueur (slots d'angle)
- [x] **Flanking** : certains zombies contournent (FLANK_LEFT, FLANK_RIGHT)
- [x] **Coordination Screamer** : méthode `applyScreamerBuff()` pour buff de vitesse
- [x] **Protection Necromancer** : zombies se regroupent autour (rôle PROTECT)
- [x] Système de rôles tactiques (FRONTAL, FLANK, ENCIRCLE, RANGED, PROTECT)

#### 4.4.4 Intégration State Machine ✅
**Fichier** : `src/entities/zombies/ZombieStateMachine.ts`

- [x] Ajouter état `GROUP_CHASE` (poursuite coordonnée)
- [x] Intégrer steering behaviors dans le mouvement
- [x] Évitement de collision entre zombies (via separation force)
- [x] Transitions fluides solo ↔ groupe (basé sur nombre de voisins)
- [x] Méthode `chaseWithHordeBehavior()` pour combiner pathfinding et steering

#### 4.4.5 Optimisations ✅
- [x] Spatial hashing pour requêtes de voisinage (grille cellSize=64)
- [x] Throttling : `maxUpdatesPerFrame=25` zombies par frame
- [x] LOD comportemental : méthode `isOnScreen()` pour prioriser les zombies visibles
- [x] Cache des voisins avec invalidation périodique
- [x] Mise à jour du steering à intervalle régulier (50ms)

### Livrable 4.4 ✅
Zombies coordonnés avec comportements de horde réalistes.

**Implémenté le 29/12/2025** - Système d'IA de horde complet :
- SteeringBehaviors : 6 comportements (seek, flee, arrive, separation, alignment, cohesion)
- HordeManager : spatial hashing avec grille 64px, cache de voisins, throttling
- TacticalBehaviors : 5 rôles tactiques, encerclement par slots d'angle, flanking
- ZombieStateMachine : état GROUP_CHASE avec transition automatique basée sur voisinage
- Optimisations : LOD comportemental, mise à jour throttlée, priorité écran

---

## Fichiers Créés/Modifiés par Sous-Phase

### Sous-Phase 4.1
```
CRÉER:
  src/weapons/firearms/Shotgun.ts
  src/weapons/firearms/SMG.ts
  src/weapons/firearms/SniperRifle.ts

MODIFIER:
  src/entities/Player.ts
  src/scenes/HUDScene.ts
  src/entities/projectiles/BulletPool.ts (si piercing)
```

### Sous-Phase 4.2 ✅
```
CRÉÉ:
  src/entities/zombies/Tank.ts ✅
  src/entities/zombies/Spitter.ts ✅
  src/entities/zombies/Bomber.ts ✅
  src/entities/zombies/Screamer.ts ✅
  src/entities/zombies/Splitter.ts ✅
  src/entities/zombies/MiniZombie.ts ✅
  src/entities/zombies/Invisible.ts ✅
  src/entities/zombies/Necromancer.ts ✅
  src/entities/projectiles/AcidSpitPool.ts ✅
  src/managers/CorpseManager.ts ✅

MODIFIÉ:
  src/entities/zombies/ZombieFactory.ts ✅
  src/entities/Player.ts (knockback) ✅
  src/scenes/GameScene.ts (AcidSpitPool, CorpseManager) ✅
```

### Sous-Phase 4.3 ✅
```
CRÉÉ:
  src/weapons/melee/MeleeWeapon.ts ✅
  src/weapons/melee/BaseballBat.ts ✅
  src/weapons/melee/Machete.ts ✅
  src/weapons/melee/Chainsaw.ts ✅
  src/weapons/special/Flamethrower.ts ✅
  src/weapons/special/TeslaCannon.ts ✅
  src/weapons/special/NailGun.ts ✅
  src/weapons/special/CompositeBow.ts ✅
  src/weapons/special/MicrowaveCannon.ts ✅
  src/entities/projectiles/FlamePool.ts ✅
  src/entities/effects/FireZone.ts ✅

MODIFIÉ:
  src/config/balance.ts (stats mêlée et spéciales) ✅
  src/scenes/GameScene.ts (flamePool) ✅
  src/entities/zombies/ZombieStateMachine.ts (états PINNED, STUNNED) ✅
  src/entities/zombies/Zombie.ts (méthodes setPinned, setStunned) ✅
  src/systems/CombatSystem.ts (gestion clous NailGun) ✅
```

### Sous-Phase 4.4 ✅
```
CRÉÉ:
  src/ai/SteeringBehaviors.ts ✅
  src/ai/HordeManager.ts ✅
  src/ai/TacticalBehaviors.ts ✅
  src/ai/index.ts ✅

MODIFIÉ:
  src/entities/zombies/ZombieStateMachine.ts ✅ (état GROUP_CHASE, steering)
  src/entities/zombies/Zombie.ts ✅ (configureHordeMode)
  src/entities/zombies/ZombieFactory.ts ✅ (configuration auto horde)
  src/scenes/GameScene.ts ✅ (HordeManager, TacticalBehaviors)
  tsconfig.json ✅ (@ai/* alias)
  vite.config.ts ✅ (@ai alias)
```

---

## Ordre d'Exécution Recommandé

```
4.1 Armes à Feu ──────────────────────────────────┐
    │                                              │
    ├── 4.1.1 Shotgun                              │
    ├── 4.1.2 SMG                                  │
    ├── 4.1.3 SniperRifle                          │
    ├── 4.1.4 Système changement arme              │
    └── 4.1.5 HUD Armes                            │
                                                   │
4.2 Zombies ───────────────────────────────────────┤
    │                                              │
    ├── 4.2.1 Tank (simple)                        │
    ├── 4.2.2 Spitter + AcidSpit                   │
    ├── 4.2.3 Bomber                               │
    ├── 4.2.4 Screamer                             │
    ├── 4.2.5 Splitter + MiniZombie                │
    ├── 4.2.6 Invisible                            │
    ├── 4.2.7 Necromancer                          │
    └── 4.2.8 Factory update                       │
                                                   │
4.3 Armes Spéciales/Mêlée ─────────────────────────┤
    │                                              │
    ├── 4.3.1-4 Mêlée (Bat, Machete, Chainsaw)     │
    └── 4.3.5-9 Spéciales (Flame, Tesla, etc.)     │
                                                   │
4.4 IA Hordes ─────────────────────────────────────┘
    │
    ├── 4.4.1 Steering Behaviors
    ├── 4.4.2 HordeManager
    ├── 4.4.3 Comportements Tactiques
    └── 4.4.4-5 Intégration + Optimisations
```

---

## Critères de Validation

### Par Sous-Phase

**4.1** ✅ :
- [x] Joueur peut équiper et changer entre 4 armes
- [x] Shotgun tire 6 pellets en spread
- [x] Sniper traverse les ennemis
- [x] HUD affiche l'inventaire d'armes

**4.2** ✅ :
- [x] Tank repousse le joueur (détruit obstacles: non implémenté)
- [x] Spitter maintient ses distances et crache
- [x] Bomber explose et chain-react
- [x] Screamer buff les zombies proches
- [x] Splitter se divise en minis
- [x] Invisible quasi-invisible jusqu'à proximité
- [x] Necromancer fuit et ressuscite

**4.3** ✅ :
- [x] Armes de mêlée fonctionnent en arc (MeleeWeapon base class)
- [x] Chainsaw consomme carburant (système fuel)
- [x] Flamethrower laisse des zones de feu (FireZone)
- [x] Tesla chain entre ennemis (chainCount = 4)
- [x] Bow silencieux avec flag `silent: true`
- [x] NailGun immobilise les zombies (état PINNED)
- [x] MicrowaveCannon dégâts en cône avec charge

**4.4** ✅ :
- [x] Zombies ne se chevauchent pas (separation behavior avec force pondérée à 2.0)
- [x] Zombies encerclent le joueur (TacticalRole.ENCIRCLE avec slots d'angle 45°)
- [x] Performance stable avec 50+ zombies (spatial hashing + throttling 25 updates/frame)

---

## Notes Techniques

### Gestion des Pools
Chaque nouveau type de projectile/zombie doit avoir son pool :
```typescript
// Dans GameScene.create()
this.acidSpitPool = new ProjectilePool(this, 'acid_spit', 20);
```

### Événements Importants
```typescript
// Nouveaux événements à émettre
'zombie:screamed' - Pour coordonner le buff
'zombie:exploded' - Pour chain reaction Bomber
'corpse:created'  - Pour tracking Necromancer
'corpse:removed'  - Quand ressuscité ou timeout
```

### Balance Validation
Après implémentation, valider avec les tests de `derivedBalance.test.ts` :
- TTK de chaque zombie avec chaque arme
- TTC depuis les portes
- Threat scores cohérents
