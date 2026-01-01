# Architecture du Projet Zombie Hunter

> Vue d'ensemble des systèmes et de l'architecture du jeu pour l'onboarding des nouveaux développeurs.

## Stack Technique

- **Framework de jeu** : Phaser 3 (v3.90.0)
- **Langage** : TypeScript avec mode strict
- **Bundler** : Vite
- **Tests** : Vitest
- **Plateforme** : Web (PWA avec support mobile)

---

## Structure des Répertoires

```
src/
├── config/        # Configuration et balancing
├── scenes/        # Scènes Phaser (flux de jeu)
├── entities/      # Entités du jeu (joueur, ennemis, boss)
├── systems/       # Systèmes de gameplay
├── weapons/       # Armes (distance et mêlée)
├── characters/    # Personnages jouables
├── items/         # Objets (power-ups, drops, items actifs)
├── ai/            # Intelligence artificielle
├── arena/         # Environnement de jeu
├── managers/      # Gestionnaires d'état
├── ui/            # Composants d'interface
├── components/    # Composants réutilisables
├── utils/         # Utilitaires
├── types/         # Définitions TypeScript
├── modes/         # Modes de jeu
└── debug/         # Outils de développement
```

---

## Systèmes de Jeu

### Système de Vagues (`WaveSystem`)

**Fichier clé** : `src/systems/WaveSystem.ts`

Coordonne la progression du jeu en vagues successives de zombies.

**Responsabilités** :
- Génération des vagues via `ThreatSystem` (budget de menace)
- Gestion des états de vague (préparation, active, nettoyage)
- Déclenchement des boss et événements spéciaux
- Transition vers les scènes d'upgrade entre les vagues

**Pattern** : Machine d'état avec `WaveState` (IDLE → PREPARING → ACTIVE → CLEARING → COMPLETED)

---

### Système de Combat (`CombatSystem`)

**Fichier clé** : `src/systems/CombatSystem.ts`

Gère les collisions et les dégâts entre entités.

**Responsabilités** :
- Collisions balles → zombies (avec support des balles perforantes)
- Collisions zombies → joueur
- Calcul des dégâts et effets associés
- Suivi du score et des kills

**Pattern** : Observateur via les événements Phaser (`zombieDeath`, `weaponFired`)

---

### Système de Combo (`ComboSystem`)

**Fichier clé** : `src/systems/ComboSystem.ts`

Récompense les kills rapides avec des multiplicateurs.

**Objectif** : Encourager un gameplay agressif en multipliant les points et la qualité des drops lors de séquences de kills.

---

### Système de Drops (`DropSystem`)

**Fichier clé** : `src/systems/DropSystem.ts`

Gère le loot des zombies.

**Types de drops** :
- Munitions (`AmmoDrop`)
- Santé (`HealthDrop` - petit/moyen)
- Power-ups (`PowerUpDrop`)
- Armes de mêlée (`MeleeWeaponDrop`)

**Pattern** : Object pooling pour optimiser les allocations mémoire.

---

### Système d'Économie (`EconomySystem`)

**Fichier clé** : `src/systems/EconomySystem.ts`

Gère les points gagnés et dépensés.

**Objectif** : Points gagnés en tuant des zombies, dépensables dans le menu tactique entre les vagues (munitions, santé, équipement).

---

### Système d'Upgrades (`UpgradeSystem`)

**Fichier clé** : `src/systems/UpgradeSystem.ts`

Système roguelite d'améliorations par session.

**Responsabilités** :
- Génération de choix d'upgrades pondérés par rareté
- Application des effets au joueur
- Gestion des prérequis et du stacking

**Pattern** : Pool d'upgrades filtrés dynamiquement selon les conditions.

---

### Système de Progression (`ProgressionSystem`)

**Fichier clé** : `src/systems/ProgressionSystem.ts`

Progression permanente entre les parties.

**Responsabilités** :
- Calcul de l'XP en fin de partie
- Upgrades permanents (arbre de compétences)
- Déblocages (personnages, armes, succès)
- Modificateurs permanents appliqués au joueur

---

### Système de Menace (`ThreatSystem`)

**Fichier clé** : `src/systems/ThreatSystem.ts`

Génère les vagues selon un budget de menace.

**Objectif** : Équilibrer dynamiquement la difficulté en assignant une valeur de menace à chaque type d'ennemi et en composant les vagues selon un budget croissant.

---

### Système de Difficulté Adaptative (`DDASystem`)

**Fichier clé** : `src/systems/DDASystem.ts`

Ajuste la difficulté en temps réel.

**Objectif** : Analyser les performances du joueur et ajuster subtilement la difficulté pour maintenir un niveau de défi optimal.

---

## Entités

### Joueur (`Player`)

**Fichier clé** : `src/entities/Player.ts`

Entité principale contrôlée par l'utilisateur.

**Caractéristiques** :
- Système d'armes 2+2 (2 slots mêlée, 2 slots distance)
- Support du dash et des capacités spéciales
- Auto-mêlée configurable
- Intégration avec le système de personnages

---

### Zombies

**Fichier clé** : `src/entities/zombies/Zombie.ts` (classe de base)

**Variantes** (11 types) :
| Type | Rôle |
|------|------|
| Shambler | Zombie de base, lent |
| Runner | Rapide, faibles HP |
| Crawler | Rampant, petit profil |
| Tank | HP élevés, lent |
| Spitter | Attaque à distance (acide) |
| Bomber | Explose à la mort |
| Screamer | Alerte les autres zombies |
| Splitter | Se divise en mini-zombies |
| Invisible | Partiellement invisible |
| Necromancer | Ressuscite les zombies |
| MiniZombie | Issu des Splitters |

**Pattern** : Héritage + Factory (`ZombieFactory`) + Machine d'état (`ZombieStateMachine`)

---

### Boss

**Fichier clé** : `src/entities/bosses/Boss.ts` (classe de base)

**Variantes** (3 types) :
- `Abomination` - Boss de chair mutante
- `PatientZero` - Patient zéro originel
- `ColossusArmored` - Colosse blindé

**Caractéristiques** :
- Système de phases (comportements différents selon les HP)
- Animation d'entrée et invulnérabilité temporaire
- Barre de vie dédiée (`BossHealthBar`)

---

### Personnages Jouables

**Fichier clé** : `src/characters/Character.ts` (classe de base)

**Personnages** (6 types) :
| Personnage | Style de jeu |
|------------|--------------|
| Cop | Équilibré (personnage par défaut) |
| Athlete | Mobilité, vitesse |
| Doctor | Survie, régénération |
| Kid | Petite cible, agilité |
| Mechanic | Gadgets, tourelles |
| Pyromaniac | Dégâts de feu |

**Caractéristiques** :
- Stats uniques (HP, vitesse, etc.)
- Compétence active (`CharacterAbility`)
- Effets passifs (`PassiveEffect`)
- Arme de départ spécifique

---

## Armes

### Armes à Distance

**Fichier clé** : `src/weapons/Weapon.ts` (classe de base)

**Catégories** :
- **Firearms** (7) : Pistol, Revolver, DoubleBarrel, Shotgun, SMG, AssaultRifle, SniperRifle
- **Special** (5) : Flamethrower, TeslaCannon, NailGun, CompositeBow, MicrowaveCannon
- **Explosive** (1) : GrenadeLauncher
- **Experimental** (5) : FreezeRay, GravityGun, LaserMinigun, BlackHoleGenerator, ZombieConverter

**Pattern** : Template method (`createProjectile` abstraite) + pools de projectiles (`BulletPool`, `FlamePool`).

---

### Armes de Mêlée

**Fichier clé** : `src/weapons/melee/MeleeWeapon.ts` (classe de base)

**Types** (7) : BaseballBat, Machete, FireAxe, Katana, Sledgehammer, Chainsaw

**Caractéristiques** :
- Attaque en arc avec knockback
- Pas de munitions (durabilité implicite)
- Détection de collision en arc

---

## Objets

### Power-Ups

**Fichier clé** : `src/items/powerups/PowerUp.ts` (classe de base)

Effets temporaires activés au ramassage.

**Types** : Rage (dégâts), Freeze (ralentit ennemis), Ghost (invincibilité), Magnet (attraction drops), Nuke (destruction de masse).

---

### Objets Actifs

**Fichier clé** : `src/items/active/ActiveItem.ts` (classe de base)

Gadgets déployables manuellement.

**Types** :
- `PortableTurret` - Tourelle automatique
- `ProximityMine` - Mine explosive
- `AttackDrone` - Drone offensif
- `HolographicDecoy` - Leurre
- `DiscoBallGrenade` - Zone d'effet spéciale

---

## Intelligence Artificielle

### Gestion de Horde (`HordeManager`)

**Fichier clé** : `src/ai/HordeManager.ts`

Coordonne les zombies pour un comportement de groupe.

**Techniques** :
- Spatial hashing pour des requêtes de voisinage O(1)
- LOD comportemental (simplification hors écran)
- Cache de voisins pour optimisation

---

### Comportements de Steering (`SteeringBehaviors`)

**Fichier clé** : `src/ai/SteeringBehaviors.ts`

Implémente les algorithmes de Craig Reynolds.

**Comportements** : Separation, Alignment, Cohesion, Seek, Flee, Arrive, Wander.

---

### Flow Fields (`FlowFieldManager`)

**Fichier clé** : `src/ai/FlowFieldManager.ts`

Pathfinding optimisé pour de nombreuses unités.

**Avantage** : Un seul calcul de chemin utilisé par tous les zombies (vs A* individuel).

**Pattern** : Bascule automatique entre A* (peu de zombies) et flow field (nombreux zombies).

---

### Machine d'État Zombie (`ZombieStateMachine`)

**Fichier clé** : `src/entities/zombies/ZombieStateMachine.ts`

**États** : IDLE → CHASE / GROUP_CHASE → ATTACK → DEAD

**Transitions** :
- Détection du joueur → CHASE
- Voisins en groupe → GROUP_CHASE (comportements de horde)
- À portée d'attaque → ATTACK
- HP à 0 → DEAD

---

## Scènes

### Flux de Navigation

```
BootScene → PreloadScene → MainMenuScene
                               ↓
              ┌────────────────┼────────────────┐
              ↓                ↓                ↓
      CharacterSelectScene  OptionsScene  ProgressionScene
              ↓
      ModeSelectScene → LoadoutSelectionScene → GameScene
                                                   ↓
                              ┌──────────────────┬─┴─┬────────────────┐
                              ↓                  ↓   ↓                ↓
                          HUDScene         PauseScene  UpgradeScene  TacticalMenuScene
                                                 ↓
                                           GameOverScene
```

### Scènes Principales

| Scène | Rôle |
|-------|------|
| `GameScene` | Scène de gameplay principale |
| `HUDScene` | Overlay UI (vie, munitions, score) |
| `UpgradeScene` | Sélection d'upgrades entre vagues |
| `TacticalMenuScene` | Achat d'équipement entre vagues |
| `PauseScene` | Menu pause |
| `GameOverScene` | Écran de fin de partie |

---

## Environnement (Arena)

**Fichier clé** : `src/arena/Arena.ts`

### Éléments Interactifs
- `Door` - Portes (spawn de zombies)
- `Switch` - Interrupteurs
- `Generator` - Générateurs

### Zones d'Effet
- `FireZone`, `ElectricZone`, `AcidZone` - Dégâts sur temps
- `PuddleZone`, `DebrisZone` - Ralentissement
- `TerrainZone` - Modificateurs de terrain

### Obstacles et Pièges
- `Cover` - Couvertures (blocage balles)
- `BladeTrap`, `FlameTrap` - Pièges actifs
- `BarrelExplosive`, `BarrelFire` - Éléments destructibles

---

## Patterns Récurrents

### Object Pooling

Utilisé pour éviter les allocations/désallocations fréquentes :
- `BulletPool` - Projectiles
- `PoolManager` - Gestionnaire générique
- Groupes de drops

### Factory Pattern

Création d'instances complexes :
- `ZombieFactory` - Création de zombies par type
- `BossFactory` - Création de boss
- `CharacterFactory` - Création de personnages

### Event-Driven Architecture

Communication via les événements Phaser :
- `zombieDeath` - Mort d'un zombie
- `weaponFired` - Tir d'arme
- `waveStart`, `waveComplete` - Transitions de vague
- `upgrade:offered`, `upgrade:selected` - Système d'upgrade

### State Machine

Gestion des comportements complexes :
- `ZombieStateMachine` - IA des zombies
- `BossStateMachine` - IA des boss
- `WaveState` - État des vagues

### Component Pattern

Réutilisation de fonctionnalités :
- `HealthComponent` - Gestion de la vie
- `MovementComponent` - Gestion du mouvement

---

## Configuration et Balancing

**Répertoire** : `src/config/`

| Fichier | Contenu |
|---------|---------|
| `game.config.ts` | Configuration Phaser |
| `constants.ts` | Constantes globales (dimensions, clés de scènes) |
| `balance.ts` | Stats brutes (dégâts, HP, vitesses) |
| `derivedBalance.ts` | Métriques calculées (DPS, TTK) |
| `upgrades.ts` | Définitions des upgrades |
| `progression.ts` | Configuration de la progression permanente |

---

## Gestion d'État

### Managers

| Manager | Rôle |
|---------|------|
| `InputManager` | Abstraction des entrées (clavier/tactile) |
| `InventoryManager` | Armes débloquées et loadout |
| `SaveManager` | Sauvegarde/chargement |
| `PoolManager` | Gestion des pools d'objets |
| `CorpseManager` | Gestion des cadavres (performance) |
| `TelemetryManager` | Analytics et métriques |

---

## Support Mobile

Le jeu supporte les appareils mobiles :

- `InputManager` - Abstraction clavier/tactile
- `MobileControls` - Joysticks virtuels
- `VirtualJoystick` - Implémentation du joystick
- `TouchButton` - Boutons tactiles
- `OrientationOverlay` - Gestion orientation écran
- `DeviceDetector` - Détection du type d'appareil

---

## Pour Aller Plus Loin

- **Documentation détaillée** : Voir le répertoire `docs/`
- **Game Design** : `GAME_DESIGN.md`, `gdd.md`
- **Roadmap** : `ROADMAP.md`
- **Architecture technique** : `ARCHITECTURE.md`
