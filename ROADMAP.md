# Zombie Hunter — Plan de Réalisation

## Vue d'Ensemble

Le développement est organisé en **7 phases** progressives. Chaque phase produit une version jouable et testable, permettant des itérations rapides et des ajustements basés sur le feedback.

---

## Phase 1 : Fondations

### Objectif
Mettre en place l'infrastructure technique et produire un prototype minimal : un joueur qui se déplace et tire dans une arène vide.

### Tâches

#### 1.1 Setup du Projet
- [x] Initialiser le projet avec Vite + TypeScript
- [x] Configurer Phaser 3
- [x] Configurer ESLint + Prettier
- [x] Configurer Vitest pour les tests
- [x] Créer la structure de dossiers
- [x] Configurer les alias de paths TypeScript

#### 1.2 Scènes de Base
- [x] Créer `BootScene` (initialisation)
- [x] Créer `PreloadScene` (chargement assets)
- [x] Créer `GameScene` (scène principale vide)
- [x] Implémenter les transitions entre scènes

#### 1.3 Placeholders
- [x] Créer le script de génération de placeholders
- [x] Générer les sprites basiques (carrés colorés)
- [x] Générer une tilemap de test

#### 1.4 Joueur - Mouvement
- [x] Créer la classe `Player`
- [x] Implémenter le mouvement WASD/flèches
- [x] Implémenter la rotation vers la souris
- [x] Ajouter le dash/esquive
- [x] Gérer les collisions avec les murs

#### 1.5 Joueur - Tir
- [x] Créer la classe de base `Weapon`
- [x] Créer la classe `Pistol`
- [x] Implémenter le tir à la souris
- [x] Créer la classe `Bullet` avec object pooling
- [x] Gérer les collisions projectiles/murs

#### 1.6 Arène de Base
- [x] Créer la classe `Arena`
- [x] Implémenter le chargement de tilemap Tiled
- [x] Créer une arène de test rectangulaire
- [x] Ajouter quelques murs/obstacles statiques

### Livrable
Un joueur qui se déplace dans une arène et tire des projectiles qui s'arrêtent aux murs.

---

## Phase 2 : Zombies de Base

### Objectif
Introduire les premiers ennemis avec IA simple et le système de combat.

### Tâches

#### 2.1 Système d'Entités
- [x] Créer la classe de base `Entity`
- [x] Implémenter `HealthComponent`
- [x] Implémenter `MovementComponent`
- [x] Créer le `PoolManager` pour les zombies

#### 2.2 Zombies Basiques
- [x] Créer la classe de base `Zombie`
- [x] Implémenter `Shambler` (lent, direct)
- [x] Implémenter `Runner` (rapide, charge)
- [x] Créer `ZombieFactory`

#### 2.3 IA Simple
- [x] Créer `ZombieStateMachine`
- [x] Implémenter états : Idle, Chase, Attack
- [x] Pathfinding basique (ligne droite + contournement obstacles)

#### 2.4 Combat
- [x] Créer `CombatSystem`
- [x] Implémenter dégâts projectiles → zombies
- [x] Implémenter dégâts zombies → joueur
- [x] Ajouter feedback visuel (flash de dégâts)
- [x] Implémenter la mort des zombies (animation + suppression)

#### 2.5 Spawning Manuel
- [x] Créer des points de spawn de test
- [x] Spawner des zombies à intervalles réguliers
- [x] Tester les combats basiques

### Livrable
Le joueur peut tirer et tuer des zombies qui le poursuivent et l'attaquent.

---

## Phase 3 : Système de Vagues

### Objectif
Implémenter le système de vagues et les portes de spawn.

### Tâches

#### 3.1 Portes
- [x] Créer la classe `Door`
- [x] États : inactive, active, ouverte
- [x] Animation visuelle (pulse rougeâtre)
- [x] Spawn de zombies depuis les portes

#### 3.2 Gestion des Vagues
- [x] Créer `WaveSystem`
- [x] Améliorer `SpawnSystem` pour spawn depuis les portes
- [x] Définir le format `WaveConfig`
- [x] Implémenter la détection de fin de vague
- [x] Transition entre vagues (pause courte)

#### 3.3 Progression de Difficulté
- [x] Système d'activation progressive des portes
- [x] Augmentation du nombre de zombies par vague
- [x] Introduction progressive des types de zombies
- [x] Courbe de difficulté configurable

#### 3.4 HUD Basique
- [x] Améliorer `HUDScene` (overlay)
- [x] Afficher la santé du joueur
- [x] Afficher le numéro de vague
- [x] Afficher le compteur de munitions
- [x] Afficher l'annonce de vague avec animation
- [x] Afficher la progression de la vague

### Livrable
Vagues successives de zombies avec difficulté croissante.

---

## Phase 3.6 : Système de Balance Avancé ✅

### Objectif
Mettre en place l'infrastructure pour un équilibrage mathématique et itératif du gameplay.

### Contexte
Basé sur les recommandations d'un spécialiste en game design, cette phase transforme les stats brutes en métriques exploitables et implémente un système de difficulté plus intelligent.

### Tâches

#### 3.6.1 Métriques Dérivées
- [x] Créer `derivedBalance.ts` avec calculs automatiques
- [x] Calculer DPS soutenu par arme (avec reload)
- [x] Calculer TTK (Time-to-Kill) par zombie/arme
- [x] Calculer TTC (Time-to-Contact) par distances de référence
- [x] Calculer score de menace (threatScore) par zombie
- [x] Ajouter table de vérité pour validation des valeurs
- [x] Créer tests unitaires de validation de balance

#### 3.6.2 Système de Budget de Menace
- [x] Créer `ThreatSystem.ts`
- [x] Définir coût par type de zombie basé sur threatScore
- [x] Remplacer count fixe par budget dynamique
- [x] Implémenter caps par rôle (max tanks, spitters, etc.)
- [x] Implémenter pacing pic/respiration
- [x] Intégrer avec WaveSystem existant

#### 3.6.3 Télémétrie
- [x] Créer `TelemetryManager.ts`
- [x] Logger événements : kills, dégâts, accuracy, etc.
- [x] Implémenter métriques temps réel (fenêtre glissante)
- [x] Générer résumé de fin de run
- [x] Ajouter export JSON pour analyse

#### 3.6.4 DDA Light (Difficulté Adaptative)
- [x] Créer `DDASystem.ts`
- [x] Observer métriques : accuracy, dégâts/min, near deaths
- [x] Ajuster spawnDelay comme levier principal
- [x] Ajuster weights de composition si struggling/dominating
- [x] Implémenter hysteresis (cooldown entre ajustements)
- [x] Ajouter option ON/OFF dans les settings

### Livrable
Système de balance calculable, mesurable et ajustable dynamiquement.

---

## Phase 4 : Arsenal et Zombies Complets

### Objectif
Implémenter toutes les armes et tous les types de zombies, en utilisant les métriques de la phase 3.6 pour l'équilibrage.

### Tâches

#### 4.1 Armes à Feu
- [ ] Implémenter `Shotgun` (spread)
- [ ] Implémenter `SMG` (rafale)
- [ ] Implémenter `SniperRifle` (précision)
- [ ] Système de changement d'arme (molette/touches)
- [ ] Gestion des munitions par arme

#### 4.2 Armes Spéciales
- [ ] Implémenter `Flamethrower` (zone de feu persistante)
- [ ] Implémenter `TeslaCannon` (arc électrique chaîné)
- [ ] Implémenter `NailGun` (immobilisation)
- [ ] Implémenter `CompositeBow` (silencieux)
- [ ] Implémenter `MicrowaveCannon` (charge + cône)

#### 4.3 Armes de Mêlée
- [ ] Créer classe de base `MeleeWeapon`
- [ ] Implémenter `BaseballBat`
- [ ] Implémenter `Machete`
- [ ] Implémenter `Chainsaw` (consomme carburant)

#### 4.4 Zombies Spécialisés
- [ ] Implémenter `Crawler` (au sol, angle mort)
- [ ] Implémenter `Tank` (résistant, pousse)
- [ ] Implémenter `Spitter` (attaque à distance)
- [ ] Implémenter `Bomber` (explose à la mort)
- [ ] Implémenter `Screamer` (buff alliés)
- [ ] Implémenter `Splitter` (se divise)
- [ ] Implémenter `Invisible` (distorsion visuelle)
- [ ] Implémenter `Necromancer` (ressuscite les morts)

#### 4.5 IA Avancée
- [ ] Améliorer le pathfinding (A*)
- [ ] Comportements spécifiques par type
- [ ] IA de groupe (hordes)

### Livrable
Arsenal complet et bestiaire complet avec comportements distincts.

---

## Phase 5 : Environnement et Terrain

### Objectif
Enrichir l'arène avec des éléments interactifs et des zones de terrain.

### Tâches

#### 5.1 Couvertures
- [x] Créer classe `Cover`
- [x] Colonnes/piliers (indestructibles)
- [x] Murets (destructibles, contournables)
- [x] Mobilier (destructible, peut contenir loot)

#### 5.2 Zones de Terrain
- [x] Créer classe `TerrainZone`
- [x] Flaques (ralentissement)
- [x] Gravats (ralentissement)
- [x] Zones électrifiées (dégâts périodiques)
- [x] Appliquer effets au joueur ET aux zombies

#### 5.3 Éléments Interactifs
- [x] Barils explosifs
- [x] Interrupteurs (pièges)
- [x] Générateurs (zones électrifiées)
- [x] Jets de flammes activables

#### 5.4 Environnements - En attente du designer... On skip
- [ ] Créer tileset pour hôpital abandonné
- [ ] Créer tileset pour centre commercial
- [ ] Créer tileset pour station de métro
- [ ] Créer tileset pour laboratoire
- [ ] Créer tileset pour prison
- [ ] Designer les layouts de chaque arène

#### 5.5 Portes Avancées
- [x] Système de barricade (coût en points)
- [x] Pièges sur portes
- [x] Destruction de porte par les boss

### Livrable
Arènes riches avec terrain tactique et éléments interactifs.

---

## Phase 6 : Progression et Meta-Jeu

### Objectif
Implémenter les systèmes de progression pendant et entre les parties.

### Tâches

#### 6.1 Système de Combo
- [x] Créer `ComboSystem`
- [x] Multiplicateur basé sur kills enchaînés
- [x] Affichage HUD du combo
- [x] Bonus de points et qualité de loot

#### 6.2 Drops et Items
- [x] Créer `DropSystem`
- [x] Drops de munitions
- [x] Drops de soins
- [x] Table de loot par type de zombie

#### 6.3 Power-ups
- [x] Implémenter `Rage` (double dégâts)
- [x] Implémenter `Freeze` (ralentit ennemis)
- [x] Implémenter `Ghost` (intangibilité)
- [x] Implémenter `Magnet` (attire drops)
- [x] Implémenter `Nuke` (tue tout)

#### 6.4 Objets Actifs
- [x] Implémenter `PortableTurret`
- [x] Implémenter `ProximityMine`
- [x] Implémenter `AttackDrone`
- [x] Implémenter `HolographicDecoy`
- [x] Implémenter `DiscoBallGrenade`

#### 6.5 Upgrades Roguelite
- [x] Créer `UpgradeSystem`
- [x] Créer `UpgradeScene` (entre les vagues)
- [x] Pool d'améliorations par catégorie
- [x] Système de rareté et pondération
- [x] UI de sélection (3 cartes)

#### 6.6 Menu Tactique
- [x] Interface d'achat entre vagues
- [x] Barricader les portes
- [x] Poser des pièges
- [x] Acheter munitions/soins

#### 6.7 Progression Permanente
- [x] Créer `ProgressionManager`
- [x] Arbre d'améliorations permanentes
- [x] Déblocage de personnages
- [x] Déblocage d'armes de départ
- [x] Système de sauvegarde (localStorage)

### Livrable
Boucle de gameplay complète avec progression court et long terme.

---

## Phase 7 : Personnages et Boss

### Objectif
Implémenter les personnages jouables et les boss.

### Tâches

#### 7.1 Système de Personnages
- [x] Créer classe de base `Character`
- [x] Système de stats par personnage
- [x] Compétences actives

#### 7.2 Personnages
- [x] Implémenter Le Flic (Marcus Webb)
  - Bonus précision, tir critique
  - Compétence : Concentration (ralenti temps)
- [x] Implémenter La Médecin (Elena Vasquez)
  - Régénération passive, soins améliorés
  - Compétence : Vaccination (immunité statuts)
- [x] Implémenter Le Mécano (Frank Morrison)
  - Tourelles, bonus explosifs
  - Compétence : Poser tourelle
- [x] Implémenter L'Athlète (Jade Chen)
  - Vitesse, dash amélioré
  - Compétence : Sprint (vitesse + intangibilité)
- [x] Implémenter Le Pyromane (Victor Ash)
  - Résistance feu, bonus incendiaire
  - Compétence : Nova (explosion de flammes)
- [x] Implémenter La Gamine (Lily + Max)
  - Hitbox réduite, chien compagnon
  - Compétence : Flair (révèle ennemis)

#### 7.3 Boss
- [x] Créer classe de base `Boss`
- [x] Cinématique d'entrée
- [x] Implémenter Abomination
  - Charge destructrice, libère parasites
  - Points faibles : têtes
- [x] Implémenter Patient Zéro
  - Esquive, utilise couvertures, commande horde
- [x] Implémenter Colosse Blindé
  - Armure à détruire, points faibles révélés

#### 7.4 Événements Spéciaux
- [x] Implémenter Blackout (obscurité)
- [x] Implémenter Horde (triple spawns)
- [x] Implémenter Porte Surchauffée
- [x] Implémenter Boss Rush

### Livrable
6 personnages jouables avec styles distincts, 3 boss, événements spéciaux.

---

## Phase 8 : Polish et Modes de Jeu

### Objectif
Finaliser l'expérience avec les menus, modes de jeu, et polish.

### Tâches

#### 8.1 Menus
- [ ] Menu principal
- [ ] Sélection de personnage
- [ ] Sélection de niveau/mode
- [ ] Options (audio, contrôles)
- [ ] Écran de pause
- [ ] Écran de game over (stats, high score)

#### 8.2 Modes de Jeu
- [ ] Mode Survie (classique, score infini)
- [ ] Mode Campagne (niveaux avec objectifs)
- [ ] Mode Challenge Quotidien (seed fixe)
- [ ] Classements en ligne (optionnel)

#### 8.3 Audio
- [ ] Intégrer musique de fond
- [ ] Sons d'armes
- [ ] Sons de zombies
- [ ] Sons d'ambiance
- [ ] Feedback audio (hit, pickup, etc.)
- [ ] Créer `AudioManager`

#### 8.4 Effets Visuels
- [ ] Particules de sang
- [ ] Effets de tir
- [ ] Explosions
- [ ] Effets de statut (feu, électricité)
- [ ] Screen shake
- [ ] Flash de dégâts

#### 8.5 Tutoriel
- [ ] Tutoriel interactif première partie
- [ ] Tooltips pour nouveaux éléments
- [ ] Introduction des types de zombies

#### 8.6 Optimisation
- [ ] Profiling et optimisation
- [ ] Tests sur différentes configurations
- [ ] Réduction de la taille du bundle

#### 8.7 Tests
- [ ] Tests unitaires systèmes critiques
- [ ] Tests d'intégration
- [ ] Playtesting et équilibrage

### Livrable
Jeu complet, poli, prêt pour la release.

---

## Dépendances entre Phases

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 3.6 ──┬──► Phase 4
                                                │
                                                ├──► Phase 5
                                                │
                                                └──► Phase 6 ──► Phase 7 ──► Phase 8
```

- **Phase 3.6** doit être faite avant Phase 4 (les armes/zombies utilisent les métriques dérivées)
- Phases 4, 5, 6 peuvent être développées en parallèle après Phase 3.6
- Phase 7 nécessite Phase 6 (compétences utilisent upgrades)
- Phase 8 finalise tout

---

## Jalons Clés

| Jalon | Phase | Description |
|-------|-------|-------------|
| **Prototype jouable** | 1 | Mouvement + tir fonctionnels |
| **First Playable** | 2 | Combat zombie basique |
| **Core Loop** | 3 | Vagues complètes |
| **Balance Foundation** | 3.6 | Métriques, budget de menace, télémétrie, DDA |
| **Feature Complete** | 7 | Tous les systèmes implémentés |
| **Content Complete** | 7 | Tous les personnages, armes, zombies |
| **Release Candidate** | 8 | Polish terminé, prêt pour tests |

---

## Risques Identifiés

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Performance avec beaucoup de zombies | Élevé | Object pooling, spatial hashing, throttling IA |
| Équilibrage difficile | Moyen | Playtests fréquents, valeurs configurables |
| Pathfinding coûteux | Moyen | Flow fields, caching, mise à jour partielle |
| Scope creep | Élevé | MVP strict par phase, features optionnelles clairement marquées |

---

## Notes pour le Designer

### Assets Prioritaires (par phase)

**Phase 1-3 (MVP):**
- Sprite joueur (8 directions, idle, walk, shoot)
- Sprite Shambler (idle, walk, attack, death)
- Sprite Runner (idle, run, attack, death)
- Tileset murs/sol basique
- Icône porte

**Phase 4:**
- Sprites tous les zombies
- Sprites toutes les armes
- Effets de projectiles

**Phase 5:**
- Tilesets 5 environnements
- Props interactifs (barils, interrupteurs)
- Effets de terrain

**Phase 6-7:**
- Sprites 6 personnages
- Sprites 3 boss (animations complexes)
- UI power-ups et upgrades

**Phase 8:**
- UI menus complets
- Effets visuels polish
- Icônes et logos

### Spécifications Sprites

- Format : PNG avec transparence
- Taille de base : 32x32 pixels (personnages, zombies standards)
- Tanks/Boss : 48x48 à 128x128 selon la taille
- Animation : sprite sheets horizontales
- Framerate cible : 8-12 fps pour les animations
