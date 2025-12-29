# Brief Phase 5 : Assets Graphiques et Level Design

Ce document résume les besoins pour le **Designer Graphique** et le **Concepteur de Niveau** pour la Phase 5 du projet Zombie Hunter.

---

## Pour le Designer Graphique

### 1. Sprites des Couvertures (Covers)

| Élément | Description | Dimensions suggérées |
|---------|-------------|---------------------|
| **Pilier** | Colonne indestructible, style béton/pierre | 32×32 ou 48×48 px |
| **Muret** | Mur bas destructible, peut être tiré par-dessus | 64×32 px |
| **Table** | Table renversée servant de couverture | 64×32 px |
| **Caisse** | Caisse en bois destructible (peut contenir du loot) | 32×32 px |
| **Étagère** | Meuble destructible avec bonus loot | 32×64 px |

**Notes :**
- Prévoir des **variantes visuelles** pour éviter la répétition
- Prévoir des **sprites de destruction** (débris, état endommagé)

---

### 2. Sprites des Zones de Terrain

| Zone | Description | Animation |
|------|-------------|-----------|
| **Flaque d'eau** | Mare d'eau stagnante, conduit l'électricité | Reflets subtils |
| **Flaque de sang** | Mare de sang, légèrement plus sombre | Aucune ou légère |
| **Gravats** | Débris de béton/pierre au sol | Aucune |
| **Zone électrique** | Zone avec arcs électriques | Arcs animés (3-4 frames) |
| **Zone de feu** | Flammes au sol | Flammes animées (4-6 frames) |
| **Zone d'acide** | Flaque verdâtre corrosive | Bulles animées (3-4 frames) |

**Notes :**
- Ces zones sont des **TileSprites** (répétables)
- Taille de base : 32×32 px minimum, tileable

---

### 3. Sprites des Éléments Interactifs

| Élément | Description | États visuels |
|---------|-------------|---------------|
| **Baril explosif** | Baril rouge avec symbole danger | Normal, endommagé |
| **Baril incendiaire** | Baril orange avec flamme | Normal, endommagé |
| **Interrupteur (Switch)** | Levier ou bouton mural | ON, OFF |
| **Générateur** | Machine électrique | Actif (animé), inactif, en panne |
| **Piège à flammes** | Buse lance-flammes au sol | Inactif, actif (jet de feu) |
| **Piège à lames** | Lames rotatives au sol | Inactif, actif (rotation animée) |

**Dimensions suggérées :**
- Barils : 32×48 px
- Switch : 16×32 px
- Générateur : 48×64 px
- Pièges : 32×32 px

---

### 4. Effets Visuels (Particules/FX)

| Effet | Usage | Frames |
|-------|-------|--------|
| **Explosion** | Barils explosifs | 6-8 frames |
| **Étincelles électriques** | Zones/armes électriques | 4 frames, loop |
| **Débris de bois** | Destruction caisses/tables | Particules |
| **Débris de pierre** | Destruction murets/piliers | Particules |
| **Éclaboussure d'eau** | Traversée de flaque | 3-4 frames |

---

### 5. Tilesets pour les Environnements

#### Tileset Commun (`common.png`)
- Murs basiques (plusieurs variantes)
- Sols basiques (béton, carrelage, terre)
- Cadres de portes
- Props génériques réutilisables

#### Tilesets Spécifiques (1 par environnement)

| Environnement | Éléments uniques |
|---------------|------------------|
| **Hôpital** (`hospital.png`) | Lits, équipement médical, carrelage blanc, taches de sang |
| **Centre Commercial** (`mall.png`) | Comptoirs, présentoirs, escalators, vitrines |
| **Métro** (`metro.png`) | Rails, quais, bancs, panneaux lumineux, rames |
| **Laboratoire** (`lab.png`) | Cuves, équipement scientifique, écrans, sols stériles |
| **Prison** (`prison.png`) | Barreaux, cellules, portes blindées, cour bétonnée |

**Format :**
- Tiles de 32×32 px
- Grille alignée pour Tiled
- Export PNG avec transparence

---

## Pour le Concepteur de Niveau (Level Designer)

### Outil Requis
**Tiled Map Editor** (gratuit) : https://www.mapeditor.org/

### Structure des Fichiers

```
public/assets/tilemaps/
├── tilesets/
│   ├── common.png
│   ├── hospital.png
│   ├── mall.png
│   ├── metro.png
│   ├── lab.png
│   └── prison.png
├── hospital.json
├── mall.json
├── metro.json
├── lab.json
└── prison.json
```

---

### Layers Standardisés (ordre du bas vers le haut)

| # | Nom du Layer | Type | Description |
|---|--------------|------|-------------|
| 1 | `floor` | Tile Layer | Sol de base |
| 2 | `floor_detail` | Tile Layer | Détails du sol (fissures, taches) |
| 3 | `walls` | Tile Layer | Murs avec collision |
| 4 | `walls_top` | Tile Layer | Haut des murs (rendu au-dessus du joueur) |
| 5 | `decorations` | Tile Layer | Décorations sans collision |
| 6 | `objects` | Object Layer | Entités (voir ci-dessous) |

---

### Object Layer : Types d'Objets

Chaque objet dans le layer `objects` doit avoir une propriété `type` et `subtype` :

#### Portes
```
type: "door"
subtype: "standard"
```

#### Couvertures
```
type: "cover"
subtype: "pillar" | "half_wall" | "table" | "crate" | "shelf"
properties:
  - health: number (optionnel, pour destructibles)
```

#### Zones de Terrain
```
type: "terrain"
subtype: "puddle" | "blood_pool" | "debris" | "electric" | "fire" | "acid"
properties:
  - slowFactor: number (ex: 0.6)
  - damagePerSecond: number (ex: 15)
```

#### Éléments Interactifs
```
type: "interactive"
subtype: "barrel_explosive" | "barrel_fire" | "switch" | "generator" | "flame_trap" | "blade_trap"
properties:
  - linkedTo: string (ID de l'élément lié, pour switches)
```

#### Spawn du Joueur
```
type: "spawn_player"
```

---

### Règles de Level Design

#### Obligatoire pour chaque arène :
- [ ] **8 positions de portes** (2 par mur)
- [ ] **Au moins 4 piliers indestructibles**
- [ ] **Mix de covers destructibles** (tables, caisses, murets)
- [ ] **2-3 zones de terrain** (flaques, gravats)
- [ ] **2-4 éléments interactifs** (barils, switches)

#### Règle des 3 Sorties
> Le joueur doit toujours avoir au moins **3 directions de fuite**. Éviter les culs-de-sac !

#### Flow du Combat
- **Zones ouvertes** : pour kiter (tourner autour des zombies)
- **Choke points** : pour défendre (entrées étroites)
- **Routes alternatives** : pour repositionnement

#### Placement Stratégique
| Élément | Placement recommandé |
|---------|---------------------|
| Barils explosifs | Près des portes (risque/récompense) |
| Générateurs | Au centre (objectif secondaire) |
| Pièges | Sur les chemins prévisibles des zombies |
| Flaques | Zones de passage fréquent |

---

### Spécificités par Environnement

#### Hôpital (`hospital.json`)
- Longs corridors entre piliers
- Lits comme couverture (semi-mobile)
- Zones de sang fréquentes
- Interrupteurs pour portes automatiques

#### Centre Commercial (`mall.json`)
- Espaces ouverts avec îlots centraux
- Comptoirs et présentoirs comme covers
- Escalators (rampes tactiques, traversables)
- Mannequins décoratifs (confusion visuelle)

#### Métro (`metro.json`)
- Quais parallèles étroits
- Piliers massifs réguliers
- Rames de métro = obstacles linéaires longs
- Tunnels sombres aux extrémités (spawns spéciaux)

#### Laboratoire (`lab.json`)
- Cuves brisées comme couverture
- Équipement scientifique destructible
- Zones de contamination (buff zombies?)
- Ambiance stérile, éclairage froid

#### Prison (`prison.json`)
- Grilles et cellules = choke points naturels
- Portes verrouillables
- Cour centrale ouverte
- Couloirs très étroits

---

### Dimensions des Maps

**Taille recommandée :** 40×30 tiles (1280×960 px avec tiles de 32px)

Cette taille permet :
- Assez d'espace pour les combats
- Pas trop grand pour garder la tension
- Compatible avec différentes résolutions d'écran

---

### Questions Ouvertes à Décider

1. **Le Tank détruit-il les piliers ?** (Suggestion : Non, trop chaotique)
2. **Les zones de contamination buffent les zombies comment ?** (+damage? +speed? +HP?)
3. **Les rames de métro sont-elles traversables ou des obstacles complets ?**

---

## Priorité de Livraison

### Phase 1 - Minimum Viable
1. Tileset commun (`common.png`)
2. Sprites des covers de base (pilier, muret, caisse)
3. Sprites des zones (flaque, gravats)
4. 1 map complète (suggestion : `hospital.json`)

### Phase 2 - Core Gameplay
5. Sprites des barils et switches
6. Sprites des pièges
7. Effets visuels (explosion, débris)
8. 2 maps supplémentaires

### Phase 3 - Contenu Complet
9. Tilesets spécifiques restants
10. Maps restantes
11. Variantes et polish

---

## Formats de Fichiers

| Type | Format | Notes |
|------|--------|-------|
| Sprites | PNG 32-bit | Avec transparence |
| Tilesets | PNG 32-bit | Grille 32×32, pas d'espacement |
| Maps | JSON (Tiled) | Export Tiled standard |
| Animations | Spritesheet PNG | Horizontal, frames régulières |

---

## Contact et Questions

Pour toute question technique sur l'intégration :
- Consulter `PLAN_PHASE_5.md` pour les détails d'implémentation
- Les assets seront placés dans `public/assets/`
