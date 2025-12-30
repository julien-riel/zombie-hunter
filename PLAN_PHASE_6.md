# Phase 6 : Progression et Meta-Jeu — Plan Détaillé

## Vue d'Ensemble

La Phase 6 implémente la boucle de progression complète du jeu :
- **Court terme** : Combo, drops, power-ups pendant une partie
- **Moyen terme** : Upgrades roguelite entre les vagues
- **Long terme** : Progression permanente entre les parties

Cette phase transforme le prototype en une expérience rejouable et addictive.

---

## 6.1 Système de Combo ✅ COMPLÉTÉ

### Objectif
Récompenser l'agressivité calculée et créer une tension entre sécurité et score.

### Spécifications (depuis GDD)

| Paramètre | Valeur | Rationale |
|-----------|--------|-----------|
| Timeout | 3 secondes | Assez long pour recharger, assez court pour forcer le mouvement |
| Multiplicateur max | x10 | Plafond atteignable mais difficile |
| Incrémentation | +0.1 par kill | Progression fluide |
| Bonus drops | +5% qualité par niveau de combo | Récompense tangible |

### Implémentation

#### Fichiers à créer
```
src/systems/ComboSystem.ts
src/ui/ComboMeter.ts
```

#### ComboSystem.ts
```typescript
interface ComboConfig {
  timeoutMs: number;          // 3000
  incrementPerKill: number;   // 0.1
  maxMultiplier: number;      // 10
  dropQualityBonusPerLevel: number; // 0.05
}

class ComboSystem {
  private multiplier: number = 1;
  private lastKillTime: number = 0;
  private killStreak: number = 0;

  onZombieKilled(): void;
  update(time: number): void;
  getMultiplier(): number;
  getDropQualityBonus(): number;
  reset(): void;
}
```

#### Events
```typescript
'combo:increase': { multiplier: number; streak: number }
'combo:break': { finalMultiplier: number; totalStreak: number }
'combo:milestone': { level: number } // À chaque entier (x2, x3, etc.)
```

#### UI (ComboMeter)
- Affichage du multiplicateur actuel (ex: "x2.3")
- Barre de timeout qui se vide
- Animation de pulse à chaque kill
- Effet visuel spécial aux milestones (x5, x10)
- Position : coin supérieur droit du HUD

### Intégration
- `CombatSystem` → appelle `ComboSystem.onZombieKilled()`
- `DropSystem` → utilise `ComboSystem.getDropQualityBonus()`
- `HUDScene` → affiche `ComboMeter`
- `TelemetryManager` → log les combos pour analyse

### Implémentation réalisée (2024-12-29)
- ✅ `src/systems/ComboSystem.ts` - Gestion du multiplicateur, kill streak, timeout et événements
- ✅ `src/ui/ComboMeter.ts` - Affichage visuel du combo avec animations et couleurs par niveau
- ✅ `src/config/balance.ts` - Configuration du combo ajoutée
- ✅ `src/types/events.ts` - Événement `combo:milestone` ajouté
- ✅ Intégration dans `GameScene` et `HUDScene`
- ✅ Export dans `src/systems/index.ts`

---

## 6.2 Drops et Items ✅ COMPLÉTÉ

### Objectif
Fournir des ressources pour maintenir le joueur en vie et récompenser les kills.

### Spécifications (depuis GDD)

#### Types de drops
| Type | Effet | Fréquence base |
|------|-------|----------------|
| Munitions | +30% du chargeur | 15% par kill |
| Soins petit | +15 HP | 8% par kill |
| Soins moyen | +30 HP | 3% par kill |
| Power-up | Effet temporaire | 2% par kill |

#### Table de loot par zombie
| Zombie | Munitions | Soins | Power-up | Spécial |
|--------|-----------|-------|----------|---------|
| Shambler | 15% | 8% | 1% | - |
| Runner | 12% | 5% | 2% | - |
| Tank | 25% | 15% | 5% | Soins moyen garanti |
| Spitter | 20% | 10% | 3% | - |
| Bomber | 10% | 5% | 3% | Explosion peut drop x2 |
| Screamer | 20% | 12% | 8% | - |
| Necromancer | 30% | 20% | 10% | Power-up rare |

### Implémentation

#### Fichiers à créer/modifier
```
src/systems/DropSystem.ts
src/items/drops/AmmoDrop.ts
src/items/drops/HealthDrop.ts
src/items/drops/PowerUpDrop.ts
src/config/lootTables.ts
```

#### DropSystem.ts
```typescript
interface LootTable {
  [zombieType: string]: {
    ammo: number;      // Probabilité 0-1
    healthSmall: number;
    healthMedium: number;
    powerUp: number;
    guaranteed?: DropType[];
  };
}

class DropSystem {
  private lootTable: LootTable;

  onZombieKilled(zombie: Zombie, position: Vector2): void;
  calculateDrops(zombieType: ZombieType, comboBonus: number): DropType[];
  spawnDrop(type: DropType, position: Vector2): void;
  collectDrop(drop: Drop, player: Player): void;
}
```

#### Comportement des drops
- Les drops restent au sol 15 secondes avant de clignoter puis disparaître
- Rayon de collecte : 32px (augmentable par upgrade)
- Les drops sont attirés vers le joueur quand il est proche (aimant léger)
- Animation de "pop" à l'apparition
- Son distinct par type de drop

### Intégration
- `CombatSystem` → déclenche `DropSystem.onZombieKilled()`
- `ComboSystem` → fournit bonus de qualité
- `Player` → collecte via collision
- Object pooling via `PoolManager`

### Implémentation réalisée (2024-12-30)
- ✅ `src/config/balance.ts` - Configuration des drops ajoutée (lifetime, loot tables, paramètres)
- ✅ `src/items/drops/Drop.ts` - Classe de base abstraite avec pooling, animations, effet magnétique
- ✅ `src/items/drops/AmmoDrop.ts` - Drop de munitions (+30% du chargeur)
- ✅ `src/items/drops/HealthDrop.ts` - Drop de soins (petit: +15 HP, moyen: +30 HP)
- ✅ `src/items/drops/PowerUpDrop.ts` - Placeholder pour Phase 6.3 avec sélection aléatoire
- ✅ `src/systems/DropSystem.ts` - Système principal avec pooling, loot tables, et intégration combo
- ✅ `src/weapons/Weapon.ts` - Ajout des méthodes getMagazineSize(), addAmmo(), isFullAmmo()
- ✅ Intégration dans `GameScene` avec getter getDropSystem()
- ✅ Exports dans `src/systems/index.ts` et `src/items/index.ts`

---

## 6.3 Power-ups ✅ COMPLÉTÉ

### Objectif
Offrir des moments de puissance temporaire qui changent la dynamique de jeu.

### Spécifications (depuis GDD)

| Power-up | Durée | Effet | Rareté |
|----------|-------|-------|--------|
| Rage | 10s | Dégâts x2 | Commun |
| Freeze | 8s | Ennemis ralentis 70% | Commun |
| Ghost | 5s | Intangibilité (traverse ennemis) | Rare |
| Magnet | 12s | Attire tous les drops | Commun |
| Nuke | Instant | Tue tous les ennemis à l'écran | Légendaire |

### Implémentation

#### Fichiers à créer
```
src/items/powerups/PowerUp.ts (classe de base)
src/items/powerups/RagePowerUp.ts
src/items/powerups/FreezePowerUp.ts
src/items/powerups/GhostPowerUp.ts
src/items/powerups/MagnetPowerUp.ts
src/items/powerups/NukePowerUp.ts
src/systems/PowerUpSystem.ts
```

#### PowerUp.ts (classe de base)
```typescript
abstract class PowerUp {
  abstract readonly type: PowerUpType;
  abstract readonly duration: number;
  abstract readonly rarity: 'common' | 'rare' | 'legendary';

  abstract activate(player: Player, scene: GameScene): void;
  abstract deactivate(player: Player, scene: GameScene): void;
  abstract update?(delta: number): void;
}
```

#### Effets détaillés

**Rage**
- Multiplicateur de dégâts appliqué dans `CombatSystem`
- Effet visuel : aura rouge autour du joueur
- Son : grognement/cri de rage à l'activation

**Freeze**
- Modifie `speedMultiplier` de tous les zombies actifs
- Effet visuel : teinte bleutée sur les zombies, particules de givre
- N'affecte PAS les boss (seulement 30% de ralentissement)

**Ghost**
- Désactive collision joueur/zombies
- Le joueur peut toujours tirer et être touché par projectiles
- Effet visuel : joueur semi-transparent, effet de distorsion
- Idéal pour s'échapper d'un encerclement

**Magnet**
- Augmente rayon de collecte à 300px
- Les drops se déplacent activement vers le joueur
- Effet visuel : lignes d'attraction vers les drops

**Nuke**
- Élimine instantanément tous les zombies visibles
- Inflige 50% de dégâts aux boss
- Effet visuel : flash blanc, onde de choc
- Son : explosion massive
- Ne peut pas drop pendant les 3 premières vagues

### Intégration
- `DropSystem` → spawn les power-ups
- `PowerUpSystem` → gère l'état actif et les timers
- `HUDScene` → affiche les power-ups actifs avec timer
- `StatusEffectComponent` → applique les effets aux entités

### Implémentation réalisée (2024-12-30)
- ✅ `src/config/balance.ts` - Configuration des power-ups ajoutée (durées, raretés, couleurs, effets)
- ✅ `src/items/powerups/PowerUp.ts` - Classe abstraite de base avec activation, désactivation et update
- ✅ `src/items/powerups/RagePowerUp.ts` - Multiplicateur de dégâts x2 avec aura rouge
- ✅ `src/items/powerups/FreezePowerUp.ts` - Ralentissement zombies 70% (30% pour boss) avec overlay bleu
- ✅ `src/items/powerups/GhostPowerUp.ts` - Intangibilité avec effet semi-transparent
- ✅ `src/items/powerups/MagnetPowerUp.ts` - Rayon de collecte augmenté à 300px avec aura orange
- ✅ `src/items/powerups/NukePowerUp.ts` - Tue tous les zombies avec effet flash/onde de choc
- ✅ `src/systems/PowerUpSystem.ts` - Gestion centralisée des power-ups actifs
- ✅ `src/items/drops/PowerUpDrop.ts` - Mise à jour pour utiliser le vrai système
- ✅ `src/ui/PowerUpDisplay.ts` - Affichage HUD des power-ups actifs avec timers
- ✅ `src/components/MovementComponent.ts` - Ajout de setSpeedMultiplier pour Freeze
- ✅ `src/entities/zombies/Zombie.ts` - Ajout de setSpeedMultiplier
- ✅ `src/debug/DebugSpawner.ts` - Ajout des méthodes de spawn power-up
- ✅ `src/debug/DebugControls.ts` - Raccourcis clavier: P (activer), O (cycler), L (spawn drop)
- ✅ Intégration dans `GameScene` et `HUDScene`
- ✅ Exports dans `src/systems/index.ts` et `src/items/index.ts`

---

## 6.4 Objets Actifs ✅ COMPLÉTÉ

### Objectif
Donner au joueur des outils tactiques à déclencher manuellement.

### Spécifications (depuis GDD)

| Objet | Durée/Effet | Cooldown | Obtention |
|-------|-------------|----------|-----------|
| Tourelle portable | 30s, tir auto | - | Drop rare, achat |
| Mine de proximité | Explosion au contact | - | Drop, achat |
| Drone d'attaque | 20s, suit joueur | - | Drop rare |
| Leurre holographique | 8s, attire zombies | - | Drop, achat |
| Grenade Disco Ball | Attire puis explose | - | Drop rare |

### Implémentation

#### Fichiers à créer
```
src/items/active/ActiveItem.ts (classe de base)
src/items/active/PortableTurret.ts
src/items/active/ProximityMine.ts
src/items/active/AttackDrone.ts
src/items/active/HolographicDecoy.ts
src/items/active/DiscoBallGrenade.ts
src/systems/ActiveItemSystem.ts
```

#### ActiveItem.ts
```typescript
abstract class ActiveItem {
  abstract readonly type: ActiveItemType;
  abstract readonly maxUses: number;
  protected uses: number;

  abstract use(player: Player, scene: GameScene, position: Vector2): void;
  abstract canUse(): boolean;
}
```

#### Détails d'implémentation

**Tourelle Portable**
- Placée au sol à la position du joueur
- Détecte les zombies dans un rayon de 200px
- Tire automatiquement (dégâts = 50% du pistolet)
- Peut être détruite par les zombies (100 HP)
- Limite : 1 tourelle active à la fois

**Mine de Proximité**
- Placée au sol, invisible après 1s
- Se déclenche quand un zombie passe à 40px
- Dégâts : 80 en zone (rayon 60px)
- Limite : 3 mines actives

**Drone d'Attaque**
- Suit le joueur en orbite
- Tire sur l'ennemi le plus proche
- Dégâts faibles mais constants
- Peut être détruit par projectiles ennemis

**Leurre Holographique**
- Clone visuel du joueur
- Les zombies le ciblent en priorité
- Disparaît après 8s ou si touché 3 fois
- Permet de repositionner ou de regrouper les ennemis

**Grenade Disco Ball**
- Lancée en arc vers la position ciblée
- Phase 1 (3s) : attire tous les zombies proches (effet disco)
- Phase 2 : explosion massive (dégâts selon nombre de zombies attirés)
- Effet visuel : lumières multicolores, musique disco pendant l'attraction

### Contrôles
- Touche `Q` ou `E` pour utiliser l'objet actif équipé
- Molette ou touches `1-5` pour changer d'objet actif
- Un seul type d'objet actif utilisable à la fois (les autres sont en inventaire)

### Intégration
- `ActiveItemSystem` → gère l'inventaire et l'utilisation
- `InputManager` → capture les inputs
- `HUDScene` → affiche l'objet équipé et les charges restantes

### Implémentation réalisée (2024-12-30)
- ✅ `src/config/balance.ts` - Configuration des objets actifs ajoutée (durées, dégâts, rayons, couleurs)
- ✅ `src/items/active/ActiveItem.ts` - Classe abstraite de base avec déploiement, update et destruction
- ✅ `src/items/active/PortableTurret.ts` - Tourelle automatique 30s avec détection et tir sur zombies
- ✅ `src/items/active/ProximityMine.ts` - Mine avec armement 1s et explosion de zone (80 dégâts)
- ✅ `src/items/active/AttackDrone.ts` - Drone orbital 20s avec tir laser automatique
- ✅ `src/items/active/HolographicDecoy.ts` - Leurre 8s attirant zombies (3 coups max)
- ✅ `src/items/active/DiscoBallGrenade.ts` - Grenade attirant puis explosant avec dégâts bonus
- ✅ `src/systems/ActiveItemSystem.ts` - Gestion inventaire, déploiement et limites
- ✅ `src/ui/ActiveItemDisplay.ts` - Affichage HUD des objets avec charges et sélection
- ✅ Intégration dans `GameScene` avec getter getActiveItemSystem()
- ✅ Intégration dans `HUDScene` avec ActiveItemDisplay
- ✅ `src/debug/DebugSpawner.ts` - Méthodes de debug pour objets actifs
- ✅ `src/debug/DebugControls.ts` - Raccourcis: I (ajouter), U (cycler), K (spawn), J (utiliser)
- ✅ Exports dans `src/systems/index.ts`, `src/items/index.ts` et `src/ui/index.ts`

---

## 6.5 Upgrades Roguelite ✅ COMPLÉTÉ

### Objectif
Offrir des choix de build significatifs entre les vagues.

### Spécifications (depuis GDD)

#### Catégories d'upgrades
1. **Armes** : Dégâts, cadence, capacité, rechargement
2. **Défense** : Santé max, armure, régénération
3. **Mobilité** : Vitesse, dash cooldown, distance dash
4. **Utilitaire** : Portée ramassage, durée power-ups
5. **Spécial** : Effets uniques (balles rebondissantes, etc.)

#### Système de rareté
| Rareté | Probabilité | Puissance |
|--------|-------------|-----------|
| Commun | 60% | Bonus faible (+5-10%) |
| Rare | 30% | Bonus moyen (+15-25%) |
| Épique | 8% | Bonus fort (+30-50%) |
| Légendaire | 2% | Effet unique |

### Implémentation

#### Fichiers à créer
```
src/systems/UpgradeSystem.ts
src/scenes/UpgradeScene.ts
src/ui/UpgradeCard.ts
src/config/upgrades.ts
```

#### upgrades.ts (définitions)
```typescript
interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  category: UpgradeCategory;
  icon: string;
  stackable: boolean;
  maxStacks?: number;
  apply: (player: Player) => void;
  prerequisites?: string[]; // IDs d'upgrades requis
}

const UPGRADES: Upgrade[] = [
  // ARMES
  {
    id: 'damage_boost_1',
    name: 'Munitions renforcées',
    description: '+10% de dégâts',
    rarity: 'common',
    category: 'weapon',
    stackable: true,
    maxStacks: 5,
    apply: (p) => p.stats.damageMultiplier += 0.1
  },
  {
    id: 'fire_rate_1',
    name: 'Doigts agiles',
    description: '+15% cadence de tir',
    rarity: 'rare',
    category: 'weapon',
    stackable: true,
    maxStacks: 3,
    apply: (p) => p.stats.fireRateMultiplier += 0.15
  },
  {
    id: 'piercing_rounds',
    name: 'Balles perforantes',
    description: 'Les balles traversent 1 ennemi',
    rarity: 'epic',
    category: 'weapon',
    stackable: true,
    maxStacks: 3,
    apply: (p) => p.stats.piercing += 1
  },
  {
    id: 'explosive_rounds',
    name: 'Munitions explosives',
    description: 'Les balles explosent au contact',
    rarity: 'legendary',
    category: 'weapon',
    stackable: false,
    apply: (p) => p.stats.explosiveRounds = true
  },

  // DÉFENSE
  {
    id: 'health_boost_1',
    name: 'Constitution robuste',
    description: '+20 HP max',
    rarity: 'common',
    category: 'defense',
    stackable: true,
    maxStacks: 5,
    apply: (p) => { p.stats.maxHealth += 20; p.heal(20); }
  },
  {
    id: 'armor_1',
    name: 'Gilet pare-balles',
    description: '-10% dégâts reçus',
    rarity: 'rare',
    category: 'defense',
    stackable: true,
    maxStacks: 3,
    apply: (p) => p.stats.damageReduction += 0.1
  },
  {
    id: 'regen_1',
    name: 'Régénération',
    description: '+1 HP toutes les 5 secondes',
    rarity: 'rare',
    category: 'defense',
    stackable: true,
    maxStacks: 3,
    apply: (p) => p.stats.healthRegen += 0.2
  },
  {
    id: 'second_wind',
    name: 'Second souffle',
    description: 'Survit à un coup fatal (1x par vague)',
    rarity: 'legendary',
    category: 'defense',
    stackable: false,
    apply: (p) => p.stats.secondWind = true
  },

  // MOBILITÉ
  {
    id: 'speed_boost_1',
    name: 'Jambes légères',
    description: '+10% vitesse de déplacement',
    rarity: 'common',
    category: 'mobility',
    stackable: true,
    maxStacks: 4,
    apply: (p) => p.stats.speedMultiplier += 0.1
  },
  {
    id: 'dash_cooldown_1',
    name: 'Récupération rapide',
    description: '-15% cooldown du dash',
    rarity: 'rare',
    category: 'mobility',
    stackable: true,
    maxStacks: 3,
    apply: (p) => p.stats.dashCooldownMultiplier -= 0.15
  },
  {
    id: 'double_dash',
    name: 'Double dash',
    description: '2 charges de dash',
    rarity: 'epic',
    category: 'mobility',
    stackable: false,
    apply: (p) => p.stats.dashCharges = 2
  },

  // UTILITAIRE
  {
    id: 'pickup_range_1',
    name: 'Bras longs',
    description: '+50% portée de ramassage',
    rarity: 'common',
    category: 'utility',
    stackable: true,
    maxStacks: 3,
    apply: (p) => p.stats.pickupRange *= 1.5
  },
  {
    id: 'powerup_duration_1',
    name: 'Effet prolongé',
    description: '+25% durée des power-ups',
    rarity: 'rare',
    category: 'utility',
    stackable: true,
    maxStacks: 2,
    apply: (p) => p.stats.powerUpDuration *= 1.25
  },

  // ... autres upgrades
];
```

#### UpgradeSystem.ts
```typescript
class UpgradeSystem {
  private pool: Upgrade[];
  private playerUpgrades: Map<string, number>; // id → stacks

  generateChoices(count: number = 3): Upgrade[];
  applyUpgrade(upgrade: Upgrade, player: Player): void;
  canApply(upgrade: Upgrade): boolean;
  getAppliedUpgrades(): Upgrade[];
}
```

#### UpgradeScene.ts
- Scène overlay qui pause le jeu
- Affiche 3 cartes d'upgrade aléatoires
- Le joueur DOIT en choisir une (pas de skip)
- Animations de cartes (apparition, hover, sélection)
- Temps limité optionnel (30s) sinon choix aléatoire

#### UpgradeCard.ts
- Composant UI réutilisable
- Affiche : icône, nom, description, rareté (couleur de bordure)
- États : normal, hover, selected, locked
- Animation de brillance selon rareté

### Intégration
- `WaveSystem` → déclenche `UpgradeScene` à la fin de chaque vague
- `GameScene` → pause pendant la sélection
- `Player` → reçoit les bonus via `apply()`

### Implémentation réalisée (2024-12-30)
- ✅ `src/config/upgrades.ts` - Définitions des 26 upgrades avec raretés, catégories et effets
- ✅ `src/systems/UpgradeSystem.ts` - Gestion du pool, génération de choix pondérés, application des upgrades
- ✅ `src/ui/UpgradeCard.ts` - Composant UI avec animations, hover, sélection et effets de glow par rareté
- ✅ `src/scenes/UpgradeScene.ts` - Scène overlay qui pause le jeu et affiche 3 cartes de choix
- ✅ Intégration dans `GameScene` avec getter getUpgradeSystem()
- ✅ Modification de `WaveSystem` pour déclencher la scène d'upgrade après chaque vague
- ✅ Réinitialisation du Second Wind à chaque nouvelle vague
- ✅ `src/debug/DebugSpawner.ts` - Méthodes de debug pour les upgrades
- ✅ `src/debug/DebugControls.ts` - Raccourcis clavier: Y (appliquer), T (cycler), G (ouvrir scène)
- ✅ Exports dans `src/systems/index.ts`, `src/ui/index.ts` et `src/scenes/index.ts`

---

## 6.6 Menu Tactique ✅ COMPLÉTÉ

### Objectif
Permettre au joueur de dépenser ses points pour des avantages tactiques.

### Spécifications (depuis GDD)

#### Monnaie : Points
- Gagnés en tuant des zombies (base × combo)
- Affichés dans le HUD
- Persistent uniquement pendant la partie

#### Options d'achat
| Action | Coût | Effet |
|--------|------|-------|
| Barricade porte | 100 | Bloque une porte 2 vagues |
| Piège porte | 150 | 50 dégâts aux zombies qui entrent |
| Munitions | 50 | Recharge arme actuelle |
| Soins | 75 | +30 HP |
| Mine | 100 | +1 mine de proximité |

### Implémentation

#### Fichiers à créer
```
src/scenes/TacticalMenuScene.ts
src/ui/TacticalMenu.ts
src/systems/EconomySystem.ts
```

#### EconomySystem.ts
```typescript
class EconomySystem {
  private points: number = 0;

  addPoints(amount: number, multiplier: number): void;
  spendPoints(amount: number): boolean;
  getPoints(): number;
  canAfford(cost: number): boolean;
}
```

#### TacticalMenuScene.ts
- Overlay semi-transparent
- Liste des portes avec état (active/barricadée/piégée)
- Boutons d'achat avec coûts
- Le joueur peut cliquer sur une porte pour la cibler
- Temps limité entre les vagues (15-30s)

#### Interaction avec les portes
- Clic sur porte → menu contextuel (barricade/piège)
- Visuel : icône de marteau pour barricade, crâne pour piège
- Feedback : animation de construction

### Intégration
- `WaveSystem` → ouvre le menu entre les vagues
- `DoorSystem` → applique barricades et pièges
- `HUDScene` → affiche les points en permanence

### Implémentation réalisée (2024-12-30)
- ✅ `src/config/balance.ts` - Configuration de l'économie (points par zombie, coûts des achats)
- ✅ `src/systems/EconomySystem.ts` - Gestion des points, multiplicateur combo, achats et dépenses
- ✅ `src/scenes/TacticalMenuScene.ts` - Scène overlay complète avec:
  - Section achats (munitions, soins, mines, tourelles)
  - Section portes avec affichage des états
  - Panneau d'actions pour barricades et pièges
  - Bouton continuer et timer optionnel
- ✅ Intégration dans `GameScene` avec getter getEconomySystem()
- ✅ `HUDScene` - Affichage des points avec animation de gain
- ✅ `WaveSystem` - Ouverture du menu tactique après la sélection d'upgrade
- ✅ `src/debug/DebugSpawner.ts` - Méthodes de debug pour l'économie
- ✅ `src/debug/DebugControls.ts` - Raccourcis clavier: M (menu tactique), N (+100 points)
- ✅ Exports dans `src/systems/index.ts` et `src/scenes/index.ts`

---

## 6.7 Progression Permanente ✅ COMPLÉTÉ

### Objectif
Donner un sentiment de progression long terme entre les parties.

### Spécifications (depuis GDD)

#### Monnaie permanente : XP
- Gagnée à la fin de chaque partie
- Basée sur : vagues survivées, kills, score

#### Arbre d'améliorations
```
COMBAT                    SURVIE                    UTILITAIRE
  │                         │                          │
  ├─ Dégâts +5% (x5)        ├─ HP max +10 (x5)         ├─ Pickup +10% (x5)
  │                         │                          │
  ├─ Cadence +5% (x3)       ├─ Regen +0.5/s (x3)       ├─ Durée PU +10% (x3)
  │                         │                          │
  └─ Crit +2% (x5)          └─ Armor +5% (x3)          └─ Points +10% (x5)
```

#### Déblocages
| Élément | Condition |
|---------|-----------|
| Runner (personnage) | Atteindre vague 10 |
| Shotgun (arme départ) | 100 kills avec pistolet |
| Médecin (personnage) | Survivre 5 parties |
| ... | ... |

### Implémentation

#### Fichiers à créer
```
src/managers/ProgressionManager.ts
src/managers/SaveManager.ts
src/config/unlocks.ts
src/scenes/ProgressionScene.ts (arbre de compétences)
```

#### SaveManager.ts
```typescript
interface SaveData {
  version: string;
  progression: {
    totalXP: number;
    spentXP: number;
    upgrades: Record<string, number>; // id → niveau
    unlockedCharacters: string[];
    unlockedWeapons: string[];
    achievements: string[];
    stats: {
      totalKills: number;
      totalDeaths: number;
      highestWave: number;
      totalPlayTime: number;
    };
  };
  settings: {
    musicVolume: number;
    sfxVolume: number;
    ddaEnabled: boolean;
  };
}

class SaveManager {
  save(data: SaveData): void;
  load(): SaveData | null;
  reset(): void;
}
```

#### ProgressionManager.ts
```typescript
class ProgressionManager {
  private saveManager: SaveManager;
  private saveData: SaveData;

  addXP(amount: number): void;
  purchaseUpgrade(id: string): boolean;
  checkUnlocks(): string[]; // Retourne les nouveaux déblocages
  getModifiers(): PlayerModifiers; // Bonus permanents à appliquer
  isUnlocked(id: string): boolean;
}
```

#### Persistance
- Sauvegarde automatique après chaque partie
- Sauvegarde dans `localStorage`
- Clé : `zombie-hunter-save`
- Versionning pour migrations futures

### Intégration
- `GameManager` → initialise `ProgressionManager` au démarrage
- `GameOverScene` → affiche XP gagnée et progression
- `MenuScene` → accès à l'arbre de compétences
- `Player` → reçoit les bonus permanents au spawn

### Implémentation réalisée (2024-12-30)
- ✅ `src/config/progression.ts` - Configuration des upgrades permanents, déblocages, courbe d'XP
  - 9 upgrades permanents répartis en 3 catégories (Combat, Survie, Utilitaire)
  - 14 déblocages (personnages, armes, objets actifs, succès)
  - Système de prérequis pour les upgrades
  - Coût d'XP croissant par niveau
- ✅ `src/managers/SaveManager.ts` - Gestion de la persistance via localStorage
  - Singleton pour accès global
  - Auto-sauvegarde configurable
  - Migration de versions pour futures mises à jour
  - Gestion des stats, déblocages et paramètres
- ✅ `src/systems/ProgressionSystem.ts` - Logique principale de progression
  - Calcul d'XP en fin de partie (vagues, kills, score, bonus)
  - Achat d'upgrades permanents avec prérequis
  - Vérification des conditions de déblocage
  - Modificateurs permanents appliqués au joueur
  - Événements: `progression:game_end`, `progression:unlock`, `progression:upgrade_purchased`
- ✅ `src/scenes/ProgressionScene.ts` - Interface de l'arbre de compétences
  - Overlay avec 3 onglets de catégories
  - Affichage des upgrades avec niveaux et coûts
  - Achat interactif avec feedback visuel
  - Lignes de connexion entre upgrades
- ✅ `src/types/events.ts` - Événements de progression ajoutés
- ✅ `src/config/constants.ts` - Clé PROGRESSION ajoutée à SCENE_KEYS
- ✅ Intégration dans `GameScene` avec getter getProgressionSystem()
- ✅ `src/debug/DebugSpawner.ts` - Méthodes de debug pour progression
- ✅ `src/debug/DebugControls.ts` - Raccourcis clavier: V (scène progression), B (+500 XP), R (cycler upgrades)
- ✅ Exports dans `src/systems/index.ts`, `src/managers/index.ts` et `src/scenes/index.ts`

---

## Ordre d'Implémentation Recommandé

### Étape 1 : Fondations économiques
1. `EconomySystem` (points)
2. `ComboSystem` + `ComboMeter`
3. Intégration points dans HUD

### Étape 2 : Drops basiques
4. `DropSystem` avec loot tables
5. `AmmoDrop`, `HealthDrop`
6. Collecte et effets

### Étape 3 : Power-ups
7. Classe de base `PowerUp`
8. Implémentation des 5 power-ups
9. `PowerUpSystem` et UI

### Étape 4 : Upgrades roguelite
10. `UpgradeSystem` et définitions
11. `UpgradeScene` et `UpgradeCard`
12. Intégration avec WaveSystem

### Étape 5 : Menu tactique
13. `TacticalMenuScene`
14. Achat barricades/pièges
15. Achat munitions/soins

### Étape 6 : Objets actifs
16. Classe de base `ActiveItem`
17. Implémentation des 5 objets
18. `ActiveItemSystem` et contrôles

### Étape 7 : Progression permanente
19. `SaveManager`
20. `ProgressionManager`
21. Arbre de compétences UI
22. Système de déblocages

---

## Tests à Prévoir

### Tests unitaires
- `ComboSystem` : timeout, incrémentation, reset
- `DropSystem` : probabilités, loot tables
- `UpgradeSystem` : génération, application, stacking
- `EconomySystem` : gains, dépenses, vérifications
- `SaveManager` : save/load, migration

### Tests d'intégration
- Combo → bonus de drop qualité
- Kill → points → achat upgrade
- Power-up pickup → effet sur joueur
- Fin de vague → UpgradeScene → bonus appliqué

### Tests de gameplay (manuel)
- [ ] Le combo monte et descend correctement
- [ ] Les drops apparaissent aux bonnes fréquences
- [ ] Les power-ups ont l'effet attendu
- [ ] Les upgrades s'appliquent correctement
- [ ] Le menu tactique est accessible et fonctionnel
- [ ] La progression est sauvegardée
- [ ] Les déblocages fonctionnent

---

## Métriques de Succès

### Engagement
- Durée moyenne des sessions augmente
- Taux de relance après game over > 60%

### Équilibrage
- 80% des upgrades sont utilisées au moins une fois
- Aucun power-up n'est "obligatoire" ou "inutile"
- Les points sont dépensés (pas d'accumulation excessive)

### Progression
- Les joueurs atteignent le premier déblocage en ~3 parties
- L'arbre de compétences est complété en ~20-30 heures

---

## Dépendances

### Prérequis (déjà implémentés)
- [x] `CombatSystem` (Phase 2)
- [x] `WaveSystem` (Phase 3)
- [x] `HUDScene` (Phase 3)
- [x] `DoorSystem` (Phase 3/5)
- [x] `TelemetryManager` (Phase 3.6)

### Impacte
- Phase 7 utilisera `UpgradeSystem` pour les compétences de personnages
- Phase 8 utilisera `SaveManager` pour les options et high scores
