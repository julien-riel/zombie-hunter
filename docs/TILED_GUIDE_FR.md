# Guide Tiled pour Zombie Hunter

Ce guide explique comment créer des maps pour le jeu Zombie Hunter en utilisant l'éditeur Tiled.

## Table des matières

1. [Installation et Configuration](#installation-et-configuration)
2. [Créer une Nouvelle Map](#créer-une-nouvelle-map)
3. [Structure des Layers](#structure-des-layers)
4. [Les Types d'Objets](#les-types-dobjets)
5. [Propriétés Personnalisées](#propriétés-personnalisées)
6. [Bonnes Pratiques de Design](#bonnes-pratiques-de-design)
7. [Export et Intégration](#export-et-intégration)
8. [Exemples Pratiques](#exemples-pratiques)

---

## Installation et Configuration

### Télécharger Tiled

1. Va sur [mapeditor.org](https://www.mapeditor.org/)
2. Télécharge la version pour ton système d'exploitation
3. Installe et lance Tiled

### Paramètres du Projet

| Paramètre | Valeur |
|-----------|--------|
| **Dimensions de la map** | 1280 x 720 pixels |
| **Taille des tiles** | 32 x 32 pixels |
| **Orientation** | Orthogonal (vue de dessus) |
| **Format d'export** | JSON |

---

## Créer une Nouvelle Map

### Étape 1 : Nouvelle Map

1. **Fichier > Nouveau > Nouvelle Map**
2. Configure les paramètres :
   - **Orientation** : Orthogonale
   - **Format de layer** : CSV
   - **Ordre de rendu** : De droite vers le bas
   - **Largeur de la map** : 40 tiles
   - **Hauteur de la map** : 23 tiles (arrondi de 22.5)
   - **Largeur des tiles** : 32 px
   - **Hauteur des tiles** : 32 px

### Étape 2 : Créer/Importer un Tileset

1. **Map > Nouveau Tileset**
2. Configure :
   - **Nom** : `hospital_tileset` (ou autre selon la map)
   - **Type** : Basé sur une image
   - **Source** : Ton fichier PNG de tileset
   - **Largeur de tile** : 32 px
   - **Hauteur de tile** : 32 px
   - **Marge** : 0 px
   - **Espacement** : 0 px

### Les 5 Maps du Jeu

Tu dois créer ces 5 maps :

| Nom de fichier | Thème | Description |
|----------------|-------|-------------|
| `hospital.json` | Hôpital | Couloirs médicaux, salles d'attente |
| `mall.json` | Centre commercial | Boutiques, escalators, fontaines |
| `metro.json` | Métro | Quais, tunnels, escaliers |
| `lab.json` | Laboratoire | Salles de recherche, équipements |
| `prison.json` | Prison | Cellules, cours, tours de garde |

---

## Structure des Layers

Crée les layers dans cet ordre (du bas vers le haut) :

### 1. Layer `floor` (Tile Layer)

**Type** : Tile Layer (pas Object Layer)

C'est le sol de l'arène. Remplis-le avec tes tiles de sol.

```
Propriétés :
- Nom : floor
- Type : Tile Layer
- Visible : Oui
```

### 2. Layer `walls` (Object Layer)

**Type** : Object Layer

Les murs du périmètre. Le jeu les génère automatiquement, mais tu peux les définir pour visualiser.

### 3. Layer `covers` (Object Layer)

**Type** : Object Layer

Les obstacles et couvertures. C'est le layer le plus important pour le gameplay.

### 4. Layer `terrain_zones` (Object Layer)

**Type** : Object Layer

Les zones de terrain avec effets spéciaux (flaques, feu, acide...).

### 5. Layer `interactive_elements` (Object Layer)

**Type** : Object Layer

Les éléments interactifs (barils explosifs, interrupteurs, pièges...).

### 6. Layer `doors` (Object Layer) - Optionnel

**Type** : Object Layer

Les portes d'où apparaissent les zombies (8 portes au total).

---

## Les Types d'Objets

### Couvertures (Covers)

Place des rectangles dans le layer `covers` avec la propriété `coverType`.

| Type | Taille par défaut | Destructible | Description |
|------|-------------------|--------------|-------------|
| `pillar` | 64 x 64 px | Non | Pilier indestructible |
| `halfWall` | 96 x 32 px | Oui | Demi-mur, protection partielle |
| `table` | 64 x 32 px | Oui | Table, peut être détruite |
| `crate` | 32 x 32 px | Oui | Caisse en bois |
| `shelf` | 64 x 64 px | Oui | Étagère |
| `barricade` | 64 x 64 px | Oui | Barricade de porte |

**Code couleur suggéré dans Tiled :**
- Pilliers : Gris foncé `#5d6d7e`
- Demi-murs : Gris clair `#7f8c8d`
- Tables : Marron `#8b4513`
- Caisses : Marron clair `#d4a574`
- Étagères : Marron foncé `#6b4423`
- Barricades : Marron très foncé `#4a3728`

### Zones de Terrain

Place des ellipses (cercles) dans le layer `terrain_zones` avec ces propriétés :

| Type | Effet | Ralentissement | Dégâts/sec |
|------|-------|----------------|------------|
| `puddle` | Flaque d'eau | 50% | 0 |
| `blood_pool` | Mare de sang | 70% | 0 |
| `debris` | Débris | 30% | 0 |
| `fire` | Feu | 20% | 5-10 |
| `electric` | Zone électrique | 40% | 3-5 |
| `acid` | Acide | 40% | 8-15 |

**Code couleur suggéré :**
- Flaques : Bleu clair `#3498db`
- Sang : Rouge `#e74c3c`
- Débris : Marron `#8b4513`
- Feu : Orange `#e67e22`
- Électrique : Jaune `#f1c40f`
- Acide : Vert `#27ae60`

### Éléments Interactifs

Place des rectangles dans le layer `interactive_elements` :

| Type | Déclencheur | Effet |
|------|-------------|-------|
| `barrel_explosive` | Dégâts (tir) | Explosion |
| `barrel_fire` | Dégâts (tir) | Crée zone de feu |
| `switch` | Interaction (E) | Active éléments liés |
| `generator` | Switch lié | Alimente zones électriques |
| `flame_trap` | Switch lié | Projette des flammes |
| `blade_trap` | Toujours actif | Dégâts au contact |

---

## Propriétés Personnalisées

### Comment ajouter des propriétés dans Tiled

1. Sélectionne un objet
2. Dans le panneau **Propriétés** (à droite)
3. Clique sur le **+** en bas pour ajouter une propriété personnalisée
4. Choisis le type (string, int, float, bool)
5. Entre le nom et la valeur

### Propriétés pour les Covers

| Propriété | Type | Valeurs possibles | Obligatoire |
|-----------|------|-------------------|-------------|
| `coverType` | string | pillar, halfWall, table, crate, shelf, barricade | Oui |

### Propriétés pour les Terrain Zones

| Propriété | Type | Description | Obligatoire |
|-----------|------|-------------|-------------|
| `terrainType` | string | Type de terrain | Oui |
| `slowFactor` | float | 0.0 à 1.0 (1 = pas de ralentissement) | Oui |
| `damagePerSecond` | int | Dégâts par seconde | Oui |
| `duration` | int | Durée en millisecondes (optionnel) | Non |
| `revealInvisibles` | bool | Révèle les zombies invisibles | Non |

### Propriétés pour les Interactive Elements

| Propriété | Type | Description | Obligatoire |
|-----------|------|-------------|-------------|
| `interactiveType` | string | Type d'élément | Oui |
| `triggerType` | string | on_damage, on_interact, on_proximity, on_switch | Non |
| `linkedId` | string | ID de l'élément lié (pour switches) | Non |
| `direction` | string | UP, DOWN, LEFT, RIGHT (pour flame_trap) | Non |
| `charges` | int | Nombre d'utilisations | Non |
| `cooldown` | int | Temps de recharge en ms | Non |

---

## Bonnes Pratiques de Design

### Règles de Base

1. **Espace minimum entre obstacles** : 64 pixels (2 tiles)
   - Les zombies et le joueur doivent pouvoir passer

2. **Ne jamais bloquer les portes**
   - Laisse toujours un chemin entre chaque porte et le centre

3. **Équilibre des spawns**
   - Les 8 portes doivent avoir un accès équivalent à l'arène

### Position des 8 Portes

```
        [Porte 1]        [Porte 2]
             ↓                ↓
    ┌────────────────────────────────┐
    │                                │
[P8]→                                ←[P3]
    │                                │
    │           ARÈNE                │
    │                                │
[P7]→                                ←[P4]
    │                                │
    └────────────────────────────────┘
             ↑                ↑
        [Porte 6]        [Porte 5]
```

| Porte | Position X | Position Y |
|-------|------------|------------|
| 1 | 25% largeur (320px) | Haut (16px) |
| 2 | 75% largeur (960px) | Haut (16px) |
| 3 | Droite (1264px) | 33% hauteur (240px) |
| 4 | Droite (1264px) | 67% hauteur (480px) |
| 5 | 75% largeur (960px) | Bas (704px) |
| 6 | 25% largeur (320px) | Bas (704px) |
| 7 | Gauche (16px) | 67% hauteur (480px) |
| 8 | Gauche (16px) | 33% hauteur (240px) |

### Conseils de Level Design

#### Pour une difficulté FACILE
- Beaucoup d'espace ouvert
- Peu d'obstacles
- Portes proches du centre
- Zones de terrain rares et peu dangereuses

#### Pour une difficulté NORMALE
- Mélange équilibré d'obstacles
- Quelques zones de terrain
- Couloirs et espaces ouverts alternés

#### Pour une difficulté DIFFICILE
- Nombreux obstacles
- Couloirs étroits
- Zones de terrain dangereuses
- Portes éloignées du centre

### Lignes de Vue

- Évite les zones mortes où le joueur ne peut pas voir les zombies
- Utilise les piliers pour créer des angles tactiques
- Les demi-murs permettent de tirer par-dessus

### Zones Tactiques

Crée différentes zones dans ton arène :

1. **Zone de repli** : Espace ouvert avec couvertures, facile à défendre
2. **Zone risquée** : Près des portes, danger élevé mais récompenses
3. **Corridors** : Limitent les mouvements mais canalisent les ennemis

---

## Export et Intégration

### Exporter ta Map

1. **Fichier > Exporter sous...**
2. Choisis le format **JSON map files (*.json)**
3. Nomme le fichier selon la map :
   - `hospital.json`
   - `mall.json`
   - `metro.json`
   - `lab.json`
   - `prison.json`
4. Sauvegarde dans : `public/assets/tilemaps/`

### Exporter le Tileset

1. Si tu as créé un tileset intégré, exporte-le séparément
2. Sauvegarde le PNG du tileset dans : `public/assets/tilemaps/`
3. Nomme-le : `[nom_map]_tileset.png`

### Structure des Fichiers

```
public/assets/tilemaps/
├── hospital.json           ← Ta map exportée
├── hospital_tileset.png    ← Le tileset
├── mall.json
├── mall_tileset.png
├── metro.json
├── metro_tileset.png
├── lab.json
├── lab_tileset.png
├── prison.json
└── prison_tileset.png
```

---

## Exemples Pratiques

### Exemple 1 : Créer un Pilier

1. Sélectionne le layer `covers`
2. Utilise l'outil **Rectangle** (R)
3. Dessine un carré de 64x64 pixels
4. Dans les propriétés, ajoute :
   - **Nom** : `pilier_central`
   - **Propriété personnalisée** : `coverType` = `pillar`

### Exemple 2 : Créer une Zone de Feu

1. Sélectionne le layer `terrain_zones`
2. Utilise l'outil **Ellipse** (E)
3. Dessine un cercle d'environ 128x128 pixels
4. Ajoute ces propriétés :
   - `terrainType` = `fire`
   - `slowFactor` = `0.8`
   - `damagePerSecond` = `8`

### Exemple 3 : Baril Explosif + Switch

1. Dans `interactive_elements`, crée un rectangle 32x32
2. Propriétés du baril :
   - `interactiveType` = `barrel_explosive`
   - `triggerType` = `on_damage`

3. Crée un autre rectangle 32x32 pour le switch :
   - `interactiveType` = `switch`
   - `triggerType` = `on_interact`
   - `linkedId` = `generator_01`

4. Crée un générateur :
   - `interactiveType` = `generator`
   - **name** = `generator_01` (important pour le lien!)

### Exemple 4 : Layout Complet Simple

```
┌────────────────────────────────────────┐
│      [P1]              [P2]            │
│                                        │
│   ┌──┐                      ┌──┐       │
[P8]│PI│     ╔════╗           │PI│    [P3]
│   └──┘     ║FIRE║           └──┘       │
│            ╚════╝                      │
│                                        │
│  ┌────┐              ┌────┐            │
│  │HALF│    ┌──┐      │HALF│            │
│  └────┘    │CR│      └────┘            │
[P7]         └──┘                     [P4]
│                                        │
│   ┌──┐                      ┌──┐       │
│   │PI│      (acid)          │PI│       │
│   └──┘                      └──┘       │
│      [P6]              [P5]            │
└────────────────────────────────────────┘

Légende:
PI = Pilier (pillar)
HALF = Demi-mur (halfWall)
CR = Caisse (crate)
FIRE = Zone de feu
(acid) = Zone d'acide
[Px] = Porte de spawn
```

---

## Checklist Avant Export

Avant d'exporter ta map, vérifie :

- [ ] Les dimensions sont 1280x720 pixels
- [ ] Les tiles font 32x32 pixels
- [ ] Le layer `floor` est rempli
- [ ] Tous les objets ont leurs propriétés obligatoires
- [ ] Les 8 portes ne sont pas bloquées
- [ ] Il y a un chemin de chaque porte vers le centre
- [ ] L'espace minimum entre obstacles est de 64px
- [ ] Le fichier est nommé correctement (hospital/mall/metro/lab/prison.json)

---

## Raccourcis Tiled Utiles

| Raccourci | Action |
|-----------|--------|
| `R` | Outil Rectangle |
| `E` | Outil Ellipse |
| `S` | Outil Sélection |
| `B` | Outil Pinceau (tiles) |
| `F` | Outil Remplissage |
| `Ctrl+G` | Afficher/Masquer la grille |
| `Ctrl+S` | Sauvegarder |
| `Ctrl+Shift+E` | Exporter |

---

## Aide et Ressources

- **Documentation Tiled** : [doc.mapeditor.org](https://doc.mapeditor.org/)
- **Tutoriels vidéo** : Cherche "Tiled map editor tutorial" sur YouTube
- **Forums** : [discourse.mapeditor.org](https://discourse.mapeditor.org/)

En cas de problème, contacte l'équipe de développement avec :
1. Une capture d'écran de ta map dans Tiled
2. Le fichier JSON exporté
3. Une description du problème

---

Bon design !
