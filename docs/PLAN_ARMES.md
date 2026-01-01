# Plan de Développement - Système d'Armes

Ce document décrit la vision et le plan d'implémentation pour le système d'armes de Zombie Hunter.

---

## Table des matières

1. [Vision globale](#vision-globale)
2. [Système de contrôle mêlée/distance](#système-de-contrôle-mêléedistance)
3. [Inventaire des armes existantes](#inventaire-des-armes-existantes)
4. [Armes manquantes à développer](#armes-manquantes-à-développer)
5. [Plan d'implémentation](#plan-dimplémentation)
6. [Spécifications techniques](#spécifications-techniques)

---

## Vision globale

### Philosophie de gameplay

Le système d'armes doit offrir :
- **Fluidité** : Pas de friction pour changer d'arme en combat
- **Tactique** : Chaque arme a son utilité selon la situation
- **Satisfaction** : Chaque arme doit être fun à utiliser
- **Progression** : Sentiment d'amélioration au fil du jeu

### Répartition des armes

```
┌─────────────────────────────────────────────────────────┐
│                    ARSENAL DU JOUEUR                     │
├─────────────────────────────────────────────────────────┤
│  ARMES À DISTANCE (Slots 1-4)    │  MÊLÉE (Toujours     │
│  ─────────────────────────────   │   disponible)        │
│  • Armes de base                 │  ─────────────────   │
│  • Armes spéciales               │  • Attaque rapide    │
│  • Armes lourdes                 │  • Knockback         │
│  • Armes expérimentales          │  • Pas de munitions  │
└─────────────────────────────────────────────────────────┘
```

---

## Système de contrôle mêlée/distance

### Recommandation : Approche hybride

La mêlée doit être un **réflexe de survie satisfaisant**, pas une arme principale qu'on doit équiper.

### Contrôles proposés

| Plateforme | Action | Commande |
|------------|--------|----------|
| **Desktop** | Attaque mêlée volontaire | Touche `V` |
| **Desktop** | Auto-mêlée (ennemi au contact) | Automatique |
| **Mobile** | Attaque mêlée volontaire | Bouton 🗡️ |
| **Mobile** | Auto-mêlée (ennemi au contact) | Automatique |

### Comportement détaillé

```
┌─────────────────────────────────────────────────────────┐
│                  LOGIQUE DE COMBAT                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Joueur appuie sur TIR                                  │
│         │                                                │
│         ▼                                                │
│  ┌──────────────────┐                                   │
│  │ Ennemi au contact│──OUI──▶ Auto-mêlée (knockback)   │
│  │   (< 40 pixels)  │                                   │
│  └────────┬─────────┘                                   │
│           │ NON                                          │
│           ▼                                              │
│  ┌──────────────────┐                                   │
│  │ Munitions dispo? │──NON──▶ Clic vide + son "empty"  │
│  └────────┬─────────┘                                   │
│           │ OUI                                          │
│           ▼                                              │
│      Tir normal                                          │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  Joueur appuie sur MÊLÉE (V / 🗡️)                       │
│         │                                                │
│         ▼                                                │
│  Attaque mêlée avec arme équipée                        │
│  (Batte par défaut, upgradable)                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Sensations recherchées

| Situation | Émotion | Résultat |
|-----------|---------|----------|
| Zombie trop proche | 😱 Panique | Réflexe mêlée → Knockback satisfaisant |
| Horde qui arrive | 😤 Badass | Quelques coups de mêlée + tir = efficace |
| Plus de munitions | 😰 Tension | Mêlée = dernier recours viable |
| Mêlée volontaire | 😎 Style | Économise munitions, montre sa maîtrise |

---

## Inventaire des armes existantes

### Armes à distance - Implémentées ✅

| Arme | Catégorie | Status | Intégrée au jeu |
|------|-----------|--------|-----------------|
| Pistol | Base | ✅ Complète | ✅ Slot départ |
| Shotgun | Base | ✅ Complète | ✅ Slot départ |
| SMG | Base | ✅ Complète | ✅ Slot départ |
| Sniper Rifle | Base | ✅ Complète | ✅ Slot départ |
| Composite Bow | Spéciale | ✅ Complète | ⚠️ Via drops |
| Flamethrower | Spéciale | ✅ Complète | ⚠️ Via drops |
| Tesla Cannon | Spéciale | ✅ Complète | ⚠️ Via drops |
| Nail Gun | Spéciale | ✅ Complète | ⚠️ Via drops |
| Microwave Cannon | Expérimentale | ✅ Complète | ⚠️ Via drops |

### Armes de mêlée - Implémentées mais NON intégrées ⚠️

| Arme | Status code | Intégrée au jeu | Problème |
|------|-------------|-----------------|----------|
| Baseball Bat | ✅ Complète | ❌ Non | Incompatible avec système Weapon |
| Machete | ✅ Complète | ❌ Non | Incompatible avec système Weapon |
| Chainsaw | ✅ Complète | ❌ Non | Incompatible avec système Weapon |

**Problème technique** : `MeleeWeapon` n'hérite pas de `Weapon`, donc incompatible avec l'inventaire du Player.

---

## Armes manquantes à développer

### Priorité 1 - Armes de base (variété essentielle)

| Arme | Type | Description | Niche gameplay |
|------|------|-------------|----------------|
| **Revolver** | Distance | 6 balles, gros dégâts, rechargement lent | Précision, one-shot |
| **Assault Rifle** | Distance | Burst 3 balles, précis | Équilibre cadence/précision |
| **Double Barrel** | Distance | 2 coups très puissants | Burst damage, risqué |
| **Crossbow** | Distance | Silencieux, récupère les carreaux | Furtif, économique |

### Priorité 2 - Armes spéciales (fun factor)

| Arme | Type | Description | Niche gameplay |
|------|------|-------------|----------------|
| **Grenade Launcher** | Explosive | Tir en arc, explosion zone | Crowd control |
| **Rocket Launcher** | Explosive | Gros dégâts, lent | Boss killer |
| **Freeze Ray** | Spéciale | Gèle les ennemis | CC, combo avec mêlée |
| **Acid Sprayer** | Spéciale | DoT acide en cône | Zone denial |
| **Ricochet Gun** | Spéciale | Balles rebondissantes | Couloirs, chaos |

### Priorité 3 - Armes de mêlée (progression)

| Arme | Tier | Description | Stats vs Batte |
|------|------|-------------|----------------|
| Baseball Bat | 1 (défaut) | Arme de départ | Base |
| Machete | 2 | Plus rapide, moins knockback | +20% vitesse, -30% KB |
| Fire Axe | 2 | Plus lent, plus de dégâts | +50% dégâts, -20% vitesse |
| Katana | 3 | Rapide, critique élevé | +30% vitesse, +25% crit |
| Chainsaw | 3 | Dégâts continus | DPS continu, bruit attire |
| Sledgehammer | 3 | Très lent, knockback massif | +100% KB, -40% vitesse |

### Priorité 4 - Armes expérimentales (endgame)

| Arme | Type | Description | Déblocage |
|------|------|-------------|-----------|
| **Gravity Gun** | Expérimentale | Attire/repousse zombies | Vague 20+ |
| **Black Hole Generator** | Expérimentale | Aspirateur temporaire | Boss drop |
| **Laser Minigun** | Expérimentale | Faisceau continu rotatif | Achat 10000pts |
| **Zombie Converter** | Expérimentale | Convertit zombie en allié | Secret |

---

## Plan d'implémentation

### Phase 1 : Intégration de la mêlée (Priorité HAUTE) ✅ COMPLÉTÉE

**Objectif** : Rendre la mêlée utilisable avec le système hybride recommandé.

#### Tâches techniques

- [x] **1.1** Créer `IMeleeCapable` interface ou adapter `MeleeWeapon`
- [x] **1.2** Ajouter slot mêlée permanent au Player (séparé des slots 1-4)
- [x] **1.3** Ajouter action `melee` dans InputManager
- [x] **1.4** Binding touche `V` (desktop)
- [x] **1.5** Ajouter bouton 🗡️ dans MobileControls
- [x] **1.6** Implémenter auto-mêlée quand ennemi au contact
- [x] **1.7** Connecter Baseball Bat comme arme de mêlée par défaut
- [x] **1.8** Mettre à jour le HUD pour afficher l'arme de mêlée

#### Critères de succès

- [x] Touche V déclenche un coup de batte
- [x] Zombies au contact sont automatiquement repoussés (auto-mêlée activée quand tir + ennemi < 40px)
- [x] Feedback visuel satisfaisant (arc d'attaque, impact, effet de stun)
- [x] Fonctionne sur desktop ET mobile

### Phase 2 : Progression mêlée ✅ COMPLÉTÉE

**Objectif** : Permettre d'upgrader l'arme de mêlée.

#### Tâches

- [x] **2.1** Système de drop d'armes de mêlée
  - `MeleeWeaponDrop` créé avec système de tiers
  - Intégré dans `DropSystem` avec chances de drop par type de zombie
  - Drop basé sur la vague actuelle (tier 2 à partir vague 3, tier 3 à partir vague 8)
- [x] **2.2** UI de comparaison mêlée actuelle vs trouvée
  - `MeleeComparisonUI` avec affichage des stats comparées
  - Touches E pour accepter, Q pour refuser
  - Support tactile pour mobile
- [x] **2.3** Intégrer Machete et Chainsaw
  - Machete : tier 2, très rapide, dégâts élevés
  - Chainsaw : tier 3, DPS continu, consomme carburant
- [x] **2.4** Créer Fire Axe, Katana, Sledgehammer
  - Fire Axe (Hache) : tier 2, dégâts élevés, coups critiques
  - Katana : tier 3, très rapide, critiques fréquents
  - Sledgehammer (Marteau) : tier 3, lent mais dévastateur, stun garanti
- [x] **2.5** Balancer les stats (vitesse, dégâts, knockback)
  - Système de tiers (1-3) pour la progression
  - Stats équilibrées dans `balance.ts`

#### Critères de succès

- [x] Les armes de mêlée peuvent être trouvées en combat
- [x] Le joueur peut comparer les stats avant d'équiper
- [x] Chaque arme a un gameplay distinct
- [x] Progression visible du tier 1 (batte) au tier 3 (katana, marteau, etc.)

### Phase 3 : Nouvelles armes à distance ✅ COMPLÉTÉE

**Objectif** : Enrichir l'arsenal à distance.

#### Tâches

- [x] **3.1** Implémenter Revolver
  - 6 balles, dégâts élevés (35), rechargement lent
  - Effet de recul et flash de bouche prononcé
  - Rareté : Rare
- [x] **3.2** Implémenter Assault Rifle
  - Mode burst (3 balles par appui)
  - 24 balles par chargeur (8 bursts)
  - Spread qui augmente légèrement pendant le burst
  - Rareté : Rare
- [x] **3.3** Implémenter Double Barrel
  - 2 cartouches, 8 pellets par tir
  - Dégâts massifs à courte portée
  - Option de tir double (les 2 canons en même temps)
  - Rareté : Épique
- [x] **3.4** Implémenter Grenade Launcher
  - Tir en arc avec gravité
  - Explosion de zone (100px rayon)
  - Ne blesse pas le joueur
  - 4 grenades par chargeur
  - Rareté : Épique
- [x] **3.5** Système de rareté des armes (commun/rare/épique/légendaire)
  - `WeaponRarity.ts` avec config complète
  - Couleurs : Gris (commun), Vert (rare), Violet (épique), Orange (légendaire)
  - Multiplicateurs de dégâts : x1.0, x1.15, x1.3, x1.5
  - Probabilités de drop : 60%, 25%, 12%, 3%
- [x] **3.6** Effets visuels selon la rareté
  - `RarityEffects.ts` avec glow, particules, effets de pickup
  - Animations de pulsation pour raretés élevées
  - Bordures colorées pour les slots d'armes

#### Critères de succès

- [x] Chaque arme a un gameplay distinct et satisfaisant
- [x] Le revolver récompense la précision
- [x] L'assault rifle offre un bon contrôle
- [x] Le double barrel est dévastateur mais risqué
- [x] Le grenade launcher permet le crowd control
- [x] Les raretés sont visuellement distinctes

### Phase 4 : Armes expérimentales ✅ COMPLÉTÉE

**Objectif** : Ajouter des armes "wow factor" pour l'endgame.

#### Tâches

- [x] **4.1** Implémenter Freeze Ray
  - Tire un projectile de glace qui gèle les ennemis
  - Les ennemis gelés sont ralentis (80%) pendant 3 secondes
  - Propagation en chaîne (50% chance, rayon 80px)
  - Bonus de dégâts mêlée sur ennemis gelés (+50%)
  - Rareté : Légendaire
  - Déblocage : Vague 20+
- [x] **4.2** Implémenter Gravity Gun
  - Deux modes : Push (repousse) et Pull (attire)
  - Les zombies projetés infligent des dégâts aux autres
  - Effet visuel de cône gravitique
  - Rareté : Légendaire
  - Déblocage : Vague 20+
- [x] **4.3** Implémenter Black Hole Generator
  - Crée un trou noir qui aspire les zombies
  - Dégâts continus aux zombies dans le rayon
  - Maximum 2 trous noirs actifs simultanément
  - Implosion finale avec dégâts de zone
  - Rareté : Légendaire
  - Déblocage : Drop de boss
- [x] **4.4** Implémenter Laser Minigun
  - Faisceau laser continu qui balaye les ennemis
  - Système de chauffe et surchauffe
  - Warmup avant puissance maximale
  - Rareté : Légendaire
  - Déblocage : Achat 10 000 points
- [x] **4.5** Implémenter Zombie Converter
  - Convertit les zombies en alliés temporaires
  - Les zombies convertis attaquent leurs congénères
  - Maximum 3 zombies convertis simultanément
  - Durée de conversion : 15 secondes
  - Rareté : Légendaire
  - Déblocage : Secret (convertir 100 zombies au total)
- [x] **4.6** Conditions de déblocage spéciales
  - Système de déblocage par vague (Freeze Ray, Gravity Gun)
  - Système de déblocage par drop de boss (Black Hole Generator)
  - Système d'achat (Laser Minigun - 10 000 points)
  - Système secret (Zombie Converter - 100 conversions)
  - WeaponUnlockSystem créé avec persistance localStorage
- [x] **4.7** Achievements liés aux armes
  - 17 achievements créés (expérimentales, mêlée, distance, spéciales)
  - Système de progression et récompenses
  - WeaponAchievementSystem avec notifications visuelles

#### Critères de succès

- [x] Chaque arme a un gameplay unique et satisfaisant
- [x] Le Freeze Ray permet des combos mêlée stratégiques
- [x] Le Gravity Gun offre un chaos contrôlé amusant
- [x] Le Black Hole Generator est visuellement impressionnant
- [x] Le Laser Minigun récompense la gestion de la chaleur
- [x] Le Zombie Converter offre une mécanique unique et secrète
- [x] Les conditions de déblocage créent des objectifs à long terme
- [x] Les achievements motivent l'utilisation des armes

---

## Spécifications techniques

### Architecture cible

```
src/weapons/
├── Weapon.ts                 # Classe de base armes à distance
├── MeleeWeapon.ts           # Classe de base mêlée (à adapter)
├── IWeapon.ts               # Interface commune (NOUVEAU)
│
├── firearms/                 # Armes à feu classiques
│   ├── Pistol.ts
│   ├── Revolver.ts          # NOUVEAU
│   ├── SMG.ts
│   ├── AssaultRifle.ts      # NOUVEAU
│   ├── Shotgun.ts
│   ├── DoubleBarrel.ts      # NOUVEAU
│   └── SniperRifle.ts
│
├── melee/                    # Armes de mêlée
│   ├── BaseballBat.ts
│   ├── Machete.ts
│   ├── FireAxe.ts           # NOUVEAU
│   ├── Katana.ts            # NOUVEAU
│   ├── Chainsaw.ts
│   └── Sledgehammer.ts      # NOUVEAU
│
├── special/                  # Armes spéciales
│   ├── CompositeBow.ts
│   ├── Crossbow.ts          # NOUVEAU
│   ├── Flamethrower.ts
│   ├── FreezeRay.ts         # NOUVEAU
│   ├── AcidSprayer.ts       # NOUVEAU
│   └── TeslaCannon.ts
│
├── explosive/                # Armes explosives (NOUVEAU)
│   ├── GrenadeLauncher.ts
│   └── RocketLauncher.ts
│
└── experimental/             # Armes endgame (NOUVEAU)
    ├── GravityGun.ts
    ├── MicrowaveCannon.ts
    └── LaserMinigun.ts
```

### Interface commune proposée

```typescript
interface IWeapon {
  name: string;
  damage: number;

  // Méthodes communes
  fire(direction: Vector2): boolean;
  update(): void;
  destroy(): void;

  // Pour le HUD
  getName(): string;
  getIcon(): string;

  // Différenciation
  isMelee(): boolean;
  isRanged(): boolean;

  // Munitions (Infinity pour mêlée)
  currentAmmo: number;
  maxAmmo: number;
  isReloading: boolean;
  reload(): void;
}
```

### Modifications au Player

```typescript
class Player {
  // Existant
  private weapons: Weapon[] = [];        // Slots 1-4 (distance)
  private currentWeaponIndex: number;

  // NOUVEAU
  private meleeWeapon: MeleeWeapon;      // Toujours disponible
  private autoMeleeEnabled: boolean = true;

  // NOUVELLES MÉTHODES
  public meleeAttack(): void;            // Touche V
  public checkAutoMelee(): void;         // Dans update()
  public equipMeleeWeapon(weapon: MeleeWeapon): void;
}
```

---

## Métriques de succès

### Gameplay

- [ ] 80% des joueurs utilisent la mêlée au moins 1x par partie
- [ ] Ratio mêlée/tir entre 10-30% (mêlée = outil, pas arme principale)
- [ ] Temps moyen de switch d'arme < 0.5s ressenti

### Technique

- [ ] Pas de lag lors du switch mêlée/distance
- [ ] Hitbox mêlée précise et satisfaisante
- [ ] Feedback audio/visuel immédiat (< 50ms)

### Fun

- [ ] "J'ai repoussé 3 zombies d'un coup !" = moment mémorable
- [ ] Chaque arme se sent différente
- [ ] Progression visible (batte → katana = satisfaisant)

---

## Références de design

| Jeu | Ce qu'on prend | Ce qu'on évite |
|-----|----------------|----------------|
| **Doom 2016** | Glory kills satisfaisants, mêlée contextuelle | Trop de boutons |
| **Hades** | Attaque/Spécial séparés, feedback | Complexité des builds |
| **Dead Cells** | Fluidité du switch | Trop d'options à gérer |
| **Left 4 Dead** | Mêlée = survie, knockback | Mêlée trop faible |
| **Enter the Gungeon** | Variété d'armes, personnalité | RNG frustrant |

---

*Document créé le 31/12/2024 - À mettre à jour selon les itérations de gameplay*
