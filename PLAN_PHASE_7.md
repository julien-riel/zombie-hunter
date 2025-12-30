# Phase 7 : Personnages et Boss — Plan Détaillé

## Vue d'Ensemble

La Phase 7 introduit la variété de gameplay à travers 6 personnages jouables distincts et 3 boss qui ponctuent la progression. Cette phase ajoute également les événements spéciaux qui dynamisent les vagues.

**Prérequis** : Phase 6 complétée (système d'upgrades, progression permanente)

### Statut d'implémentation

| Phase | Statut | Description |
|-------|--------|-------------|
| 7.1 | ✅ Complété | Système de personnages (infrastructure) |
| 7.2 | ✅ Complété | Les 6 personnages |
| 7.3 | 🔲 À faire | Système de Boss |
| 7.4 | 🔲 À faire | Événements spéciaux |

---

## 7.1 Système de Personnages

### Objectif
Créer l'infrastructure permettant des personnages avec des stats et compétences uniques.

### Fichiers à créer/modifier

```
src/characters/
├── Character.ts          # Classe de base abstraite
├── CharacterStats.ts     # Interface et types pour les stats
├── CharacterAbility.ts   # Système de compétences actives
├── Cop.ts                # Marcus Webb
├── Doctor.ts             # Dr. Elena Vasquez
├── Mechanic.ts           # Frank "Gears" Morrison
├── Athlete.ts            # Jade Chen
├── Pyromaniac.ts         # Victor Ash
└── Kid.ts                # Lily + Max
```

### Interface Character

```typescript
interface CharacterStats {
  // Stats de base
  maxHealth: number;
  moveSpeed: number;
  dashCooldown: number;
  dashDistance: number;

  // Modificateurs
  damageMultiplier: number;
  accuracyBonus: number;
  critChance: number;
  pickupRadius: number;

  // Résistances
  fireResistance: number;
  poisonResistance: number;
}

interface CharacterAbility {
  name: string;
  description: string;
  icon: string;
  cooldown: number;
  duration?: number;
  activate(player: Player): void;
  deactivate?(player: Player): void;
}

abstract class Character {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract stats: CharacterStats;
  abstract ability: CharacterAbility;
  abstract passives: PassiveEffect[];

  // Arme de départ spécifique
  abstract startingWeapon: WeaponType;
}
```

### Tâches

- [x] Créer `CharacterStats.ts` avec interface et valeurs par défaut
- [x] Créer `CharacterAbility.ts` avec système de cooldown et activation
- [x] Créer `Character.ts` classe de base abstraite
- [x] Créer `CharacterFactory.ts` pour instanciation
- [x] Modifier `Player.ts` pour accepter un Character
- [x] Créer `Cop.ts` premier personnage jouable (Marcus Webb)
- [x] Ajouter système de personnages au DebugPanel
- [ ] Ajouter UI de sélection de personnage dans le menu (Phase 7.2+)
- [ ] Intégrer avec `ProgressionManager` pour déblocage (Phase 7.2+)

---

## 7.2 Les 6 Personnages

### 7.2.1 Le Flic — Marcus Webb

**Concept** : Officier de police, calme sous pression. Style précis et méthodique.

**Stats**
```typescript
stats: {
  maxHealth: 100,
  moveSpeed: 200,
  dashCooldown: 1500,
  dashDistance: 150,
  damageMultiplier: 1.0,
  accuracyBonus: 0.15,      // +15% précision
  critChance: 0.10,         // 10% chance critique
  pickupRadius: 50,
  fireResistance: 0,
  poisonResistance: 0,
}
```

**Passifs**
- `SteadyAim` : +15% précision sur toutes les armes
- `CriticalTraining` : 10% chance de coup critique (×2 dégâts)

**Compétence Active : Concentration**
- Ralentit le temps perçu à 30% pendant 4 secondes
- Cooldown : 30 secondes
- Permet repositionnement tactique ou élimination précise

**Arme de départ** : Revolver (variante du Pistol avec plus de dégâts, moins de cadence)

**Implémentation**
```typescript
class ConcentrationAbility implements CharacterAbility {
  name = "Concentration";
  cooldown = 30000;
  duration = 4000;

  activate(player: Player): void {
    player.scene.time.timeScale = 0.3;
    player.scene.cameras.main.setPostPipeline('SlowMoEffect');
  }

  deactivate(player: Player): void {
    player.scene.time.timeScale = 1.0;
    player.scene.cameras.main.resetPostPipeline();
  }
}
```

### 7.2.2 La Médecin — Dr. Elena Vasquez

**Concept** : Chercheuse du laboratoire originel. Survit par la régénération et les soins.

**Stats**
```typescript
stats: {
  maxHealth: 90,
  moveSpeed: 190,
  dashCooldown: 1600,
  dashDistance: 140,
  damageMultiplier: 0.9,
  accuracyBonus: 0,
  critChance: 0,
  pickupRadius: 60,
  fireResistance: 0,
  poisonResistance: 0.5,    // 50% résistance poison
}
```

**Passifs**
- `Regeneration` : Régénère 1 HP toutes les 5 secondes
- `MedicalExpertise` : Tous les soins sont 50% plus efficaces

**Compétence Active : Vaccination**
- Immunité aux infections et effets de statut pendant 8 secondes
- Cooldown : 25 secondes
- Annule les effets en cours (poison, ralentissement)

**Arme de départ** : Pistol standard

**Implémentation**
```typescript
class VaccinationAbility implements CharacterAbility {
  name = "Vaccination";
  cooldown = 25000;
  duration = 8000;

  activate(player: Player): void {
    player.statusEffects.clearAll();
    player.statusEffects.setImmune(true);
    player.setTint(0x88ff88); // Teinte verte
  }

  deactivate(player: Player): void {
    player.statusEffects.setImmune(false);
    player.clearTint();
  }
}
```

### 7.2.3 Le Mécano — Frank "Gears" Morrison

**Concept** : Expert en machines et explosifs. Style défensif et territorial.

**Stats**
```typescript
stats: {
  maxHealth: 110,
  moveSpeed: 180,
  dashCooldown: 1800,
  dashDistance: 120,
  damageMultiplier: 1.0,
  accuracyBonus: -0.05,
  critChance: 0,
  pickupRadius: 50,
  fireResistance: 0.2,
  poisonResistance: 0,
}
```

**Passifs**
- `ExplosiveExpert` : +25% dégâts des explosifs et armes improvisées
- `QuickRepair` : Répare les barricades 50% plus vite

**Compétence Active : Tourelle Automatique**
- Pose une tourelle qui tire sur les ennemis proches pendant 20 secondes
- Cooldown : 35 secondes
- Dégâts : 8 par tir, cadence 300ms
- Portée : 250px

**Arme de départ** : Nail Gun (si implémenté) ou Shotgun

**Implémentation**
```typescript
class TurretAbility implements CharacterAbility {
  name = "Tourelle";
  cooldown = 35000;
  duration = 20000;

  activate(player: Player): void {
    const turret = new AutoTurret(player.scene, player.x, player.y);
    turret.setLifespan(this.duration);
    player.scene.add.existing(turret);
  }
}
```

### 7.2.4 L'Athlète — Jade Chen

**Concept** : Coureuse professionnelle. Mobilité maximale, kiting expert.

**Stats**
```typescript
stats: {
  maxHealth: 85,
  moveSpeed: 240,           // +20% vitesse
  dashCooldown: 1200,       // Dash plus fréquent
  dashDistance: 180,        // Dash plus long
  damageMultiplier: 0.95,
  accuracyBonus: 0,
  critChance: 0,
  pickupRadius: 70,
  fireResistance: 0,
  poisonResistance: 0,
}
```

**Passifs**
- `SwiftStrike` : Attaques de mêlée 30% plus rapides
- `Evasion` : 10% chance d'esquiver les attaques

**Compétence Active : Sprint**
- Boost de vitesse ×2 pendant 3 secondes
- Intangible pendant les 0.5 premières secondes
- Cooldown : 20 secondes

**Arme de départ** : SMG (si implémenté) ou Pistol

**Implémentation**
```typescript
class SprintAbility implements CharacterAbility {
  name = "Sprint";
  cooldown = 20000;
  duration = 3000;
  intangibleDuration = 500;

  activate(player: Player): void {
    player.speedMultiplier = 2.0;
    player.setIntangible(true);

    player.scene.time.delayedCall(this.intangibleDuration, () => {
      player.setIntangible(false);
    });
  }

  deactivate(player: Player): void {
    player.speedMultiplier = 1.0;
  }
}
```

### 7.2.5 Le Pyromane — Victor Ash

**Concept** : Pompier obsédé par le feu. Dégâts de zone et propagation.

**Stats**
```typescript
stats: {
  maxHealth: 100,
  moveSpeed: 195,
  dashCooldown: 1500,
  dashDistance: 140,
  damageMultiplier: 1.0,
  accuracyBonus: 0,
  critChance: 0,
  pickupRadius: 50,
  fireResistance: 0.8,      // 80% résistance feu
  poisonResistance: 0,
}
```

**Passifs**
- `Pyromania` : +30% dégâts avec armes incendiaires
- `Contagion` : 20% chance que les ennemis tués s'enflamment et propagent le feu

**Compétence Active : Nova**
- Explosion de flammes autour du joueur
- Rayon : 150px
- Dégâts : 50 + feu persistant
- Cooldown : 25 secondes

**Arme de départ** : Flamethrower (si implémenté) ou Shotgun

**Implémentation**
```typescript
class NovaAbility implements CharacterAbility {
  name = "Nova";
  cooldown = 25000;
  radius = 150;
  damage = 50;

  activate(player: Player): void {
    // Effet visuel
    const nova = player.scene.add.circle(player.x, player.y, 10, 0xff6600);
    player.scene.tweens.add({
      targets: nova,
      radius: this.radius,
      alpha: 0,
      duration: 300,
      onComplete: () => nova.destroy(),
    });

    // Dégâts aux zombies dans le rayon
    const zombies = player.scene.zombies.getChildren();
    zombies.forEach((zombie: Zombie) => {
      const distance = Phaser.Math.Distance.Between(
        player.x, player.y, zombie.x, zombie.y
      );
      if (distance <= this.radius) {
        zombie.takeDamage(this.damage);
        zombie.applyStatusEffect('burning', 3000);
      }
    });
  }
}
```

### 7.2.6 La Gamine — Lily + Max

**Concept** : Enfant de 12 ans avec son chien. Petite cible, DPS passif via le compagnon.

**Stats**
```typescript
stats: {
  maxHealth: 70,
  moveSpeed: 210,
  dashCooldown: 1400,
  dashDistance: 160,
  damageMultiplier: 0.85,
  accuracyBonus: 0,
  critChance: 0,
  pickupRadius: 80,         // Ramasse de plus loin
  fireResistance: 0,
  poisonResistance: 0,
}
```

**Passifs**
- `SmallTarget` : Hitbox réduite de 30%
- `LoyalCompanion` : Max attaque automatiquement les zombies proches (5 dégâts/s)
- `DangerSense` : Max aboie quand un Crawler ou Invisible est proche

**Compétence Active : Flair**
- Révèle tous les ennemis à l'écran pendant 5 secondes
- Met en évidence les drops cachés et bonus
- Cooldown : 20 secondes

**Arme de départ** : Pistol

**Implémentation**
```typescript
class FlairAbility implements CharacterAbility {
  name = "Flair";
  cooldown = 20000;
  duration = 5000;

  activate(player: Player): void {
    // Révéler tous les ennemis (même Invisibles)
    const zombies = player.scene.zombies.getChildren();
    zombies.forEach((zombie: Zombie) => {
      zombie.setRevealed(true);
      zombie.showOutline(0xffff00);
    });

    // Révéler les drops cachés
    const hiddenDrops = player.scene.hiddenDrops.getChildren();
    hiddenDrops.forEach((drop: Item) => {
      drop.showIndicator();
    });
  }

  deactivate(player: Player): void {
    const zombies = player.scene.zombies.getChildren();
    zombies.forEach((zombie: Zombie) => {
      zombie.setRevealed(false);
      zombie.hideOutline();
    });
  }
}

// Compagnon Max (entité séparée)
class CompanionDog extends Phaser.GameObjects.Sprite {
  private owner: Player;
  private attackCooldown = 1000;
  private attackDamage = 5;
  private detectionRadius = 100;

  update(delta: number): void {
    // Suit le joueur
    this.followOwner();

    // Attaque les zombies proches
    this.attackNearbyZombies();

    // Détecte les menaces cachées
    this.detectHiddenThreats();
  }
}
```

### Tâches par personnage

Pour chaque personnage :
- [x] Créer le fichier de classe
- [x] Implémenter les stats
- [x] Implémenter les passifs
- [x] Implémenter la compétence active
- [x] Créer/assigner le sprite placeholder
- [x] Ajouter au CharacterFactory
- [ ] Tester l'équilibrage
- [x] Ajouter les conditions de déblocage

### Personnages implémentés

| Personnage | Fichier | Compétence | Entité associée |
|------------|---------|------------|-----------------|
| Marcus Webb (Cop) | `Cop.ts` | Concentration | - |
| Dr. Elena Vasquez (Doctor) | `Doctor.ts` | Vaccination | - |
| Frank "Gears" Morrison (Mechanic) | `Mechanic.ts` | Tourelle Automatique | `AutoTurret.ts` |
| Jade Chen (Athlete) | `Athlete.ts` | Sprint | - |
| Victor Ash (Pyromaniac) | `Pyromaniac.ts` | Nova | - |
| Lily + Max (Kid) | `Kid.ts` | Flair | `CompanionDog.ts` |

---

## 7.3 Système de Boss

### Objectif
Créer des boss mémorables qui ponctuent la progression et modifient l'arène.

### Fichiers à créer

```
src/entities/bosses/
├── Boss.ts               # Classe de base
├── BossStateMachine.ts   # IA spécifique boss
├── BossHealthBar.ts      # UI barre de vie boss
├── Abomination.ts
├── PatientZero.ts
└── ColossusArmored.ts
```

### Interface Boss

```typescript
interface BossPhase {
  healthThreshold: number;  // % HP pour déclencher
  behavior: BossBehavior;
  onEnter?: () => void;
}

abstract class Boss extends Entity {
  abstract name: string;
  abstract phases: BossPhase[];
  abstract entranceAnimation(): Promise<void>;

  // Les boss détruisent une porte à leur entrée
  destroyDoorOnEntry: boolean = true;

  // Musique spécifique
  abstract bossMusic: string;
}
```

### 7.3.1 L'Abomination

**Concept** : Fusion de plusieurs corps, masse de chair immense.

**Stats**
```typescript
stats: {
  maxHealth: 1500,
  moveSpeed: 80,
  damage: 40,
  attackCooldown: 2000,
}
```

**Phases**
1. **Phase 1 (100-60% HP)** : Charge lente vers le joueur
2. **Phase 2 (60-30% HP)** : Libère des parasites quand touché
3. **Phase 3 (30-0% HP)** : Rage - vitesse augmentée, spawns continus

**Attaques**
- `Charge` : Fonce en ligne droite, détruit les couvertures
- `Slam` : Frappe au sol, onde de choc
- `ParasiteRelease` : Libère 3-5 mini-zombies

**Points faibles** : Les têtes qui dépassent (×2 dégâts)

**Implémentation**
```typescript
class Abomination extends Boss {
  private parasiteSpawnRate = 0;

  phases = [
    { healthThreshold: 1.0, behavior: 'chase' },
    { healthThreshold: 0.6, behavior: 'chase_spawn', onEnter: () => this.enableParasites() },
    { healthThreshold: 0.3, behavior: 'rage', onEnter: () => this.enterRage() },
  ];

  async entranceAnimation(): Promise<void> {
    // Défonce une porte
    const targetDoor = this.selectRandomDoor();
    await targetDoor.destroyAnimation();

    // Apparaît lentement
    this.setAlpha(0);
    await this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 2000,
    }).promise;

    // Rugissement
    this.scene.sound.play('abomination_roar');
    this.scene.cameras.main.shake(500, 0.02);
  }

  onDamage(damage: number, hitZone: string): void {
    // Double dégâts sur les têtes
    if (hitZone === 'head') {
      damage *= 2;
    }

    // Phase 2+ : spawn parasites
    if (this.currentPhase >= 2 && Math.random() < 0.3) {
      this.spawnParasites(Phaser.Math.Between(1, 3));
    }

    super.onDamage(damage);
  }
}
```

### 7.3.2 Patient Zéro

**Concept** : Presque humain, intelligent, commande la horde.

**Stats**
```typescript
stats: {
  maxHealth: 800,
  moveSpeed: 150,
  damage: 25,
  attackCooldown: 1000,
}
```

**Phases**
1. **Phase 1 (100-50% HP)** : Combat direct, esquive les tirs
2. **Phase 2 (50-0% HP)** : Se cache, commande la horde

**Comportements uniques**
- Esquive les projectiles (dodge roll)
- Utilise les couvertures
- Commande les autres zombies (les coordonne)
- Fuit si trop de dégâts subis rapidement

**Effet sur la horde** : Quand actif, tous les zombies deviennent coordonnés (attaquent ensemble). À sa mort, la horde est désorganisée 10 secondes.

**Implémentation**
```typescript
class PatientZero extends Boss {
  private commandRadius = 400;
  private dodgeChance = 0.4;

  update(delta: number): void {
    // Évalue les menaces
    const incomingProjectiles = this.detectProjectiles();

    // Esquive si possible
    if (incomingProjectiles.length > 0 && Math.random() < this.dodgeChance) {
      this.performDodge(incomingProjectiles[0]);
    }

    // Cherche une couverture si HP bas
    if (this.healthPercent < 0.3 && !this.inCover) {
      this.seekCover();
    }

    // Commande la horde
    this.commandHorde();
  }

  commandHorde(): void {
    const zombies = this.scene.zombies.getChildren();
    zombies.forEach((zombie: Zombie) => {
      const distance = Phaser.Math.Distance.Between(
        this.x, this.y, zombie.x, zombie.y
      );
      if (distance < this.commandRadius) {
        zombie.setCoordinated(true);
        zombie.setTarget(this.currentTarget);
      }
    });
  }

  onDeath(): void {
    // Désorganise la horde
    this.scene.zombies.getChildren().forEach((zombie: Zombie) => {
      zombie.setCoordinated(false);
      zombie.setStunned(2000);
    });

    super.onDeath();
  }
}
```

### 7.3.3 Colosse Blindé

**Concept** : Géant portant des débris comme armure.

**Stats**
```typescript
stats: {
  maxHealth: 2000,
  armorHealth: 600,  // Par pièce d'armure
  moveSpeed: 60,
  damage: 60,
  attackCooldown: 3000,
}
```

**Système d'armure**
- 4 pièces d'armure (torse, épaule gauche, épaule droite, tête)
- Chaque pièce absorbe les dégâts jusqu'à destruction
- Seules les armes perforantes/explosives endommagent l'armure
- Une fois une pièce détruite, le point faible en dessous prend ×1.5 dégâts

**Phases**
1. **Blindé** : Avance lentement, attaques dévastatrices
2. **Partiellement blindé** : Plus agressif, commence à charger
3. **Nu** : Rage, très rapide mais fragile

**Implémentation**
```typescript
class ColossusArmored extends Boss {
  private armorPieces: Map<string, ArmorPiece> = new Map();

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y);

    // Initialiser les pièces d'armure
    this.armorPieces.set('torso', new ArmorPiece(600));
    this.armorPieces.set('left_shoulder', new ArmorPiece(400));
    this.armorPieces.set('right_shoulder', new ArmorPiece(400));
    this.armorPieces.set('head', new ArmorPiece(300));
  }

  onDamage(damage: number, weapon: Weapon, hitZone: string): void {
    const armorPiece = this.armorPieces.get(hitZone);

    if (armorPiece && !armorPiece.destroyed) {
      // Seuls certains types de dégâts percent l'armure
      if (weapon.armorPiercing || weapon.explosive) {
        armorPiece.takeDamage(damage);

        if (armorPiece.destroyed) {
          this.onArmorDestroyed(hitZone);
        }
      } else {
        // Dégâts réduits sur l'armure
        armorPiece.takeDamage(damage * 0.1);
      }
    } else {
      // Point faible exposé
      const multiplier = armorPiece?.destroyed ? 1.5 : 1.0;
      super.onDamage(damage * multiplier);
    }
  }

  onArmorDestroyed(zone: string): void {
    // Effet visuel de destruction
    this.scene.particles.createEmitter({
      // ... débris volants
    });

    // Son de métal qui casse
    this.scene.sound.play('armor_break');

    // Vérifie si toute l'armure est détruite
    const allDestroyed = Array.from(this.armorPieces.values())
      .every(piece => piece.destroyed);

    if (allDestroyed) {
      this.enterRagePhase();
    }
  }
}
```

### Tâches Boss

- [ ] Créer `Boss.ts` classe de base
- [ ] Créer `BossStateMachine.ts`
- [ ] Créer `BossHealthBar.ts` (UI spéciale)
- [ ] Implémenter cinématique d'entrée générique
- [ ] Implémenter l'Abomination
- [ ] Implémenter Patient Zéro
- [ ] Implémenter Colosse Blindé
- [ ] Intégrer spawn boss toutes les 5 vagues
- [ ] Créer sprites placeholders boss
- [ ] Tester et équilibrer

---

## 7.4 Événements Spéciaux

### Objectif
Ajouter de la variété aux vagues avec des événements aléatoires.

### Fichiers à créer

```
src/systems/
├── EventSystem.ts        # Gestionnaire d'événements
└── events/
    ├── SpecialEvent.ts   # Interface de base
    ├── BlackoutEvent.ts
    ├── HordeEvent.ts
    ├── OverheatedDoorEvent.ts
    └── BossRushEvent.ts
```

### 7.4.1 Blackout

**Effet** : Visibilité réduite drastiquement

**Implémentation**
- Cercle de lumière autour du joueur (rayon 150px)
- Yeux des zombies visibles dans l'obscurité
- Lance-flammes et Tesla éclairent temporairement
- Durée : 1 vague complète

```typescript
class BlackoutEvent implements SpecialEvent {
  name = "Blackout";
  duration = 'wave';

  activate(scene: GameScene): void {
    // Masque sombre sur toute la scène
    scene.darkness.setVisible(true);

    // Lumière suivant le joueur
    scene.playerLight.setVisible(true);
    scene.playerLight.setRadius(150);

    // Rendre les yeux des zombies lumineux
    scene.zombies.getChildren().forEach((zombie: Zombie) => {
      zombie.enableGlowingEyes();
    });
  }

  deactivate(scene: GameScene): void {
    scene.darkness.setVisible(false);
    scene.playerLight.setVisible(false);

    scene.zombies.getChildren().forEach((zombie: Zombie) => {
      zombie.disableGlowingEyes();
    });
  }
}
```

### 7.4.2 Horde

**Effet** : Triple le nombre de spawns pour une vague

**Implémentation**
- Multiplicateur de budget ×3
- Principalement Shamblers et Runners
- Pas de zombies spéciaux (trop chaotique)
- Drops améliorés en compensation

```typescript
class HordeEvent implements SpecialEvent {
  name = "Horde";
  budgetMultiplier = 3.0;

  modifyWaveConfig(config: WaveConfig): WaveConfig {
    return {
      ...config,
      threatBudget: config.threatBudget * this.budgetMultiplier,
      allowedTypes: ['shambler', 'runner'], // Simplifier la composition
      dropRateBonus: 0.5, // +50% drops
    };
  }
}
```

### 7.4.3 Porte Surchauffée

**Effet** : Une porte ignorée libère un mini-boss

**Implémentation**
- Se déclenche si une porte reste inactive 3 vagues
- La porte pulse de plus en plus rouge
- Si non barricadée, libère un Tank enragé
- Peut être prévenu en barricadant ou en déclenchant manuellement

```typescript
class OverheatedDoorEvent implements SpecialEvent {
  name = "Porte Surchauffée";

  checkCondition(doors: Door[]): Door | null {
    return doors.find(door =>
      door.inactiveWaves >= 3 && !door.barricaded
    );
  }

  activate(door: Door): void {
    // Animation d'avertissement
    door.startOverheatWarning();

    // Timer avant explosion
    door.scene.time.delayedCall(10000, () => {
      if (!door.barricaded) {
        this.releaseMiniBoss(door);
      }
    });
  }

  releaseMiniBoss(door: Door): void {
    door.forceOpen();

    const enragedTank = new Tank(door.scene, door.x, door.y);
    enragedTank.setEnraged(true); // +50% speed, +25% damage
    door.scene.zombies.add(enragedTank);
  }
}
```

### 7.4.4 Boss Rush

**Effet** : Enchaîne plusieurs boss sans pause

**Implémentation**
- Se déclenche à des vagues spéciales (15, 25, etc.)
- 2-3 boss apparaissent successivement
- Pas de vague normale entre les boss
- Récompenses exceptionnelles à la fin

```typescript
class BossRushEvent implements SpecialEvent {
  name = "Boss Rush";
  bossQueue: BossType[] = [];

  activate(scene: GameScene): void {
    // Sélectionner 2-3 boss
    this.bossQueue = this.selectBosses(2 + Math.floor(Math.random() * 2));

    // Annoncer l'événement
    scene.events.emit('ui:announcement', {
      text: "BOSS RUSH",
      subtext: `${this.bossQueue.length} boss à vaincre`,
      style: 'danger',
    });

    // Spawner le premier boss
    this.spawnNextBoss(scene);
  }

  onBossDefeated(scene: GameScene): void {
    if (this.bossQueue.length > 0) {
      // Court délai puis boss suivant
      scene.time.delayedCall(3000, () => {
        this.spawnNextBoss(scene);
      });
    } else {
      // Fin du Boss Rush
      this.giveRewards(scene);
      this.deactivate(scene);
    }
  }
}
```

### Tâches Événements

- [ ] Créer `EventSystem.ts`
- [ ] Créer interface `SpecialEvent`
- [ ] Implémenter Blackout
- [ ] Implémenter Horde
- [ ] Implémenter Porte Surchauffée
- [ ] Implémenter Boss Rush
- [ ] Intégrer avec WaveSystem (probabilité d'événement)
- [ ] Ajouter UI d'annonce d'événement
- [ ] Tester chaque événement

---

## Intégration avec les Systèmes Existants

### Modifications requises

#### Player.ts
```typescript
class Player {
  private character: Character;

  constructor(scene: GameScene, x: number, y: number, character: Character) {
    this.character = character;
    this.applyCharacterStats();
  }

  private applyCharacterStats(): void {
    this.maxHealth = this.character.stats.maxHealth;
    this.moveSpeed = this.character.stats.moveSpeed;
    // ... autres stats
  }

  useAbility(): void {
    if (this.abilityReady) {
      this.character.ability.activate(this);
      this.startAbilityCooldown();
    }
  }
}
```

#### WaveSystem.ts
```typescript
class WaveSystem {
  shouldSpawnBoss(): boolean {
    return this.currentWave % 5 === 0 && this.currentWave > 0;
  }

  getRandomEvent(): SpecialEvent | null {
    if (Math.random() < 0.15) { // 15% chance
      return this.eventSystem.getRandomEvent();
    }
    return null;
  }
}
```

#### HUDScene.ts
- Ajouter affichage cooldown compétence
- Ajouter barre de vie boss
- Ajouter annonces d'événements

---

## Ordre d'Implémentation Recommandé

### Sprint 1 : Infrastructure
1. `Character.ts` et `CharacterStats.ts`
2. `CharacterAbility.ts`
3. Modification de `Player.ts`
4. UI de sélection de personnage basique

### Sprint 2 : Premiers Personnages
5. Le Flic (Marcus Webb) — Le plus simple
6. L'Athlète (Jade Chen) — Teste la mobilité
7. La Médecin (Elena Vasquez) — Teste la régénération

### Sprint 3 : Personnages Complexes
8. Le Mécano (Frank Morrison) — Entités supplémentaires (tourelle)
9. Le Pyromane (Victor Ash) — Effets de zone
10. La Gamine (Lily + Max) — Compagnon IA

### Sprint 4 : Boss
11. `Boss.ts` et `BossStateMachine.ts`
12. L'Abomination — Le plus direct
13. Patient Zéro — IA complexe
14. Colosse Blindé — Système d'armure

### Sprint 5 : Événements
15. `EventSystem.ts`
16. Blackout
17. Horde
18. Porte Surchauffée
19. Boss Rush

### Sprint 6 : Polish
20. Équilibrage des personnages
21. Équilibrage des boss
22. Fréquence et équilibrage des événements
23. Tests et corrections

---

## Critères de Validation

### Personnages
- [ ] Chaque personnage a un style de jeu distinct
- [ ] Les compétences sont utiles sans être obligatoires
- [ ] L'équilibrage permet de jouer tous les personnages
- [ ] Les passifs sont perceptibles en jeu

### Boss
- [ ] Chaque boss force une stratégie différente
- [ ] Les phases sont clairement identifiables
- [ ] La difficulté est élevée mais fair
- [ ] La destruction de porte modifie le gameplay

### Événements
- [ ] Les événements ajoutent de la variété
- [ ] Aucun événement n'est frustrant ou injuste
- [ ] La fréquence est équilibrée
- [ ] Les récompenses compensent la difficulté

---

## Ressources et Assets Requis

### Sprites (32x32 sauf indication)

**Personnages**
- Marcus Webb (8 directions, idle, walk, shoot, dash)
- Elena Vasquez (idem)
- Frank Morrison (idem)
- Jade Chen (idem)
- Victor Ash (idem)
- Lily (idem, plus petit ~24x24)
- Max le chien (idle, run, attack)

**Boss**
- Abomination (64x64, animations complexes)
- Patient Zéro (32x32, animations d'esquive)
- Colosse Blindé (96x96, pièces d'armure séparées)

**Effets**
- Cercle de lumière (blackout)
- Yeux lumineux zombies
- Effet de surchauffe porte
- Particules de débris armure

### Audio
- Musiques boss (3)
- Sons compétences (6)
- Sons boss (attaques, phases, morts)
- Ambiance événements
