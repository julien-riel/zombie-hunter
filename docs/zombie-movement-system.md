# Système de Déplacement des Zombies

Ce document explique le système de mouvement des zombies en fonction de leur état, ainsi que l'utilisation de l'algorithme A* et des Flow Fields.

## Vue d'Ensemble

Le système de déplacement des zombies utilise une architecture multi-couches:

1. **Machine à états** (ZombieStateMachine) - Gère les transitions et décisions
2. **Pathfinding A*** - Navigation individuelle avec évitement d'obstacles
3. **Flow Field** - Optimisation pour les hordes (≥10 zombies)
4. **Steering Behaviors** - Coordination de groupe (flocking)
5. **Tactical Behaviors** - Positionnement tactique avancé

---

## États des Zombies et leur Impact sur le Mouvement

### États Définis
`src/entities/zombies/ZombieStateMachine.ts:13-21`

| État | Description | Mouvement |
|------|-------------|-----------|
| `IDLE` | Vagabonde et détecte le joueur | Wander aléatoire |
| `CHASE` | Poursuite individuelle | A* pathfinding |
| `GROUP_CHASE` | Poursuite coordonnée en horde | Flow field + steering |
| `ATTACK` | Attaque au corps à corps | Arrêté |
| `DEAD` | Mort | Aucun |
| `PINNED` | Immobilisé (NailGun) | Bloqué |
| `STUNNED` | Étourdi | Bloqué |

### Comportement par État

#### IDLE (Vagabondage)
`src/entities/zombies/ZombieStateMachine.ts:166-184`

- Mouvement aléatoire avec `SteeringBehaviors.wander()`
- Détection du joueur dans `detectionRange`
- Transition vers `CHASE` ou `GROUP_CHASE` selon le nombre de voisins

```
Wander: cercle de projection (rayon: 50px, distance: 80px, jitter: 0.3)
```

#### CHASE (Poursuite Individuelle)
`src/entities/zombies/ZombieStateMachine.ts:259-287`

- Utilise **A* pathfinding** par défaut
- Recalcule le chemin toutes les **500ms**
- Bascule vers **Flow Field** si ≥10 zombies actifs
- Transition vers `ATTACK` quand distance < `attackRange`
- Retour à `IDLE` si joueur sort de `detectionRange * 1.5`

#### GROUP_CHASE (Poursuite en Horde)
`src/entities/zombies/ZombieStateMachine.ts:292-320`

- Combine navigation (A* ou Flow Field) avec steering behaviors
- Met à jour les forces de steering toutes les **50ms**
- Applique:
  - Séparation (évite les collisions)
  - Alignement (même direction que les voisins)
  - Cohésion (reste groupé)
  - Seek (poursuite du joueur)
- Utilise le positionnement tactique (flanking, encirclement)

#### ATTACK (Attaque)
`src/entities/zombies/ZombieStateMachine.ts:564-604`

- **Mouvement complètement arrêté** via `stop()`
- Inflige des dégâts selon le cooldown
- Retour à `CHASE` si joueur sort de `attackRange * 1.5`

#### PINNED / STUNNED (Immobilisé)
`src/entities/zombies/ZombieStateMachine.ts:681-707`

- Mouvement **totalement désactivé**
- Durée limitée, puis retour à l'état précédent
- Utilisé par NailGun (PINNED) et autres effets (STUNNED)

---

## Algorithme A* (Pathfinding)

### Fichier Principal
`src/utils/pathfinding.ts:163-244`

### Fonctionnement

1. **Grille de navigation**:
   - Taille: 1280x720 pixels / 32 (TILE_SIZE) = 40x22.5 cellules
   - Les obstacles sont marqués comme non-traversables

2. **Algorithme**:
   ```
   1. Convertir coordonnées monde → grille
   2. Initialiser noeud de départ avec heuristique
   3. Open List: file de priorité triée par f = g + h
   4. Boucle:
      - Extraire noeud avec f minimal
      - Si destination atteinte: reconstruire chemin
      - Sinon: évaluer les 8 voisins (diagonales incluses)
   5. Fallback: ligne directe si pas de chemin
   ```

3. **Heuristique** (Octile):
   `src/utils/pathfinding.ts:249-258`
   ```
   h = dx + dy + (√2 - 2) * min(dx, dy)
   ```

4. **Optimisation du chemin**:
   `src/utils/pathfinding.ts:336-357`
   - Lissage via algorithme de Bresenham
   - Supprime les waypoints inutiles

### Quand A* est Utilisé

- Moins de 10 zombies actifs
- Zombies en état `CHASE` individuel
- Recalcul toutes les 500ms (750ms en mode horde)

---

## Flow Field (Champ de Flux)

### Fichiers
- `src/ai/FlowField.ts`
- `src/ai/FlowFieldManager.ts:1-342`

### Activation

Le Flow Field est activé quand:
- **≥10 zombies** sont actifs
- La cible (joueur) s'est déplacée de **≥32 pixels**
- Minimum **200ms** entre les recalculs

### Algorithme

1. **Phase Integration Map** (Dijkstra inversé):
   - Calcule le coût pour atteindre la cible depuis chaque cellule
   - Diagonales: coût 1.414 (√2)
   - Obstacles: coût infini (65535)

2. **Phase Flow Map** (Descente de gradient):
   - Chaque cellule stocke la direction vers le voisin de coût minimal
   - Interpolation pour positions sous-grille

### Avantages Performance

| Aspect | Détail |
|--------|--------|
| Calcul asynchrone | 150 itérations max par frame |
| Partagé | Un seul Flow Field pour tous les zombies |
| Lazy evaluation | Recalcul uniquement si cible bouge |

### Utilisation
`src/entities/zombies/ZombieStateMachine.ts` - `chaseWithFlowField()`

```typescript
// Récupère la direction depuis le flow field
const direction = flowFieldManager.getDirectionSmooth(x, y);
movementComponent.moveInDirection(direction.x, direction.y);
```

---

## Steering Behaviors (Comportements de Groupe)

### Fichier
`src/ai/SteeringBehaviors.ts:1-512`

### Comportements Implémentés

| Comportement | Description | Rayon |
|--------------|-------------|-------|
| **Separation** | Répulsion des voisins | 40px |
| **Alignment** | Alignement des vitesses | 80px |
| **Cohesion** | Attraction vers le centre du groupe | 120px |
| **Seek** | Poursuite directe | - |
| **Flee** | Fuite (Necromancer) | - |
| **Wander** | Vagabondage organique | 50px cercle |
| **Arrive** | Décélération progressive | 100px |

### Formule Combinée
`src/ai/SteeringBehaviors.ts:426-473`

```typescript
force = separation * 1.5 + alignment * 1.0 + cohesion * 1.0 + seek * 1.0
// Mode horde:
force = separation * 2.0 + alignment * 0.8 + cohesion * 0.5 + seek * 1.2
```

Force maximale limitée à 50 unités.

---

## Décision: Solo vs Horde

`src/entities/zombies/ZombieStateMachine.ts:247-254`

```
shouldUseGroupChase():
  - ≥2 voisins dans rayon de 120px
  - HordeMode activé
  - HordeManager disponible

  → OUI: GROUP_CHASE (flow field + steering)
  → NON: CHASE (A* individuel)
```

---

## Diagramme de Flux du Mouvement

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZombieStateMachine.update()                   │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   ┌─────────┐            ┌─────────┐            ┌─────────────┐
   │  IDLE   │            │  CHASE  │            │ GROUP_CHASE │
   └────┬────┘            └────┬────┘            └──────┬──────┘
        │                      │                        │
        ▼                      ▼                        ▼
  performIdleWander()    ≥10 zombies?           Flow Field ready?
        │                  │     │                │          │
        ▼                  │     │                ▼          ▼
  SteeringBehaviors     NON│     │OUI        moveInDir   A* + steering
    .wander()              │     │               │          │
        │                  ▼     ▼               │          │
        │               A*    FlowField          └────┬─────┘
        │               │        │                    │
        │               └───┬────┘                    ▼
        │                   │              TacticalBehaviors
        ▼                   ▼                (flanking, encircle)
   setTarget()          setPath() / moveInDirection()
        │                   │
        └─────────┬─────────┘
                  ▼
      ┌─────────────────────┐
      │ MovementComponent   │
      │     .update()       │
      └─────────────────────┘
                  │
                  ▼
         Mise à jour position
```

---

## Optimisations de Performance

### Pathfinding
- A* recalculé max toutes les 500ms
- Flow Field activé automatiquement pour les hordes
- Lissage des chemins (moins de waypoints)

### Flow Field
- Calcul asynchrone (réparti sur plusieurs frames)
- Un seul champ partagé par tous les zombies
- Mise à jour uniquement si cible bouge de ≥32px

### Steering
- **Spatial hashing** pour requêtes O(1) des voisins
- **LOD**: Max 20 zombies/frame avec IA complète
- Priorité aux zombies visibles à l'écran

### Machine à États
- Throttling des mises à jour (path: 500ms, steering: 50ms)
- Early exit pour états PINNED/STUNNED/DEAD

---

## Gestion des Blocages

### Détection de Blocage
`src/entities/zombies/ZombieStateMachine.ts:578-634`

Le système détecte automatiquement quand un zombie est bloqué:
- Un zombie est considéré "bloqué" s'il n'a pas bougé de >5 pixels pendant >1 seconde
- Quand détecté, le système cherche la case walkable la plus proche
- Le zombie est déplacé progressivement vers cette case (max 8 pixels/frame)

### Comportement de Fallback Sécurisé

Au lieu de se diriger directement vers le joueur (ce qui causait les blocages), le système:

1. **Sauvegarde le dernier chemin valide** - réutilisé si aucun nouveau chemin n'est trouvé
2. **Retourne un tableau vide si pas de chemin** - A* ne retourne plus jamais un chemin direct
3. **Reste immobile** plutôt que d'aller en ligne droite vers un obstacle

### Recherche de Position Walkable
`src/utils/pathfinding.ts:262-310`

```typescript
findNearestWalkable(gridX, gridY, maxRadius = 5)
findNearestWalkableWorld(worldX, worldY)
```

Recherche en spirale (BFS) pour trouver la case traversable la plus proche.

### Évitement des Coins (Wall Avoidance)
`src/entities/zombies/ZombieStateMachine.ts:592-666`

Problème: Le flow field calcule sur des tuiles de 32px, mais les zombies ont des hitbox plus grandes (jusqu'à 40px pour le Tank). Résultat: les hitbox clippent les coins des murs.

Solution: `applyWallAvoidance()` ajoute une force de répulsion:
1. Détecte les tuiles non-walkable dans les 8 directions adjacentes
2. Calcule un vecteur de répulsion basé sur la distance
3. Applique cette force à la vélocité du zombie

```
Rayon de détection = max(hitbox.width, hitbox.height) * 0.75
Force de répulsion = 150 (inversement proportionnelle à la distance)
```

Cette force est appliquée après chaque mise à jour de mouvement via flow field.

---

## Fichiers Clés

| Composant | Chemin |
|-----------|--------|
| Machine à états | `src/entities/zombies/ZombieStateMachine.ts` |
| Composant mouvement | `src/components/MovementComponent.ts` |
| A* Pathfinding | `src/utils/pathfinding.ts` |
| Flow Field | `src/ai/FlowField.ts`, `src/ai/FlowFieldManager.ts` |
| Steering Behaviors | `src/ai/SteeringBehaviors.ts` |
| Horde Manager | `src/ai/HordeManager.ts` |
| Tactical Behaviors | `src/ai/TacticalBehaviors.ts` |
