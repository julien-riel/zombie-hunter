# Zombie Hunter — Plan de la Phase 8 : Polish et Modes de Jeu

## Statut d'Implémentation

### Phase 8.1 - Menus ✅ COMPLÉTÉ

**Fichiers créés :**
- `src/scenes/MainMenuScene.ts` - Menu principal avec navigation clavier/souris
- `src/scenes/CharacterSelectScene.ts` - Sélection de personnage avec grille et détails
- `src/scenes/ModeSelectScene.ts` - Sélection du mode de jeu (Survie disponible)
- `src/scenes/OptionsScene.ts` - Configuration audio/affichage/gameplay
- `src/scenes/PauseScene.ts` - Menu pause avec stats de la run
- `src/scenes/GameOverScene.ts` - Écran de fin avec stats et XP

**Fichiers modifiés :**
- `src/config/constants.ts` - Ajout des clés de scènes (CHARACTER_SELECT, MODE_SELECT, OPTIONS)
- `src/config/game.config.ts` - Enregistrement des nouvelles scènes
- `src/scenes/index.ts` - Export des nouvelles scènes
- `src/scenes/PreloadScene.ts` - Transition vers MainMenuScene
- `src/scenes/GameScene.ts` - Intégration Pause (Échap/P) et GameOver
- `src/entities/Player.ts` - Émission de l'événement playerDeath
- `src/managers/TelemetryManager.ts` - Ajout méthode getMetrics()

**Fonctionnalités implémentées :**
- Navigation fluide entre toutes les scènes
- Contrôles clavier et souris
- Animations de transition
- Sauvegarde automatique des stats et settings
- Affichage du high score et nouveau record

---

## Vue d'Ensemble

La Phase 8 est la phase finale de développement. Elle transforme le prototype fonctionnel en un jeu complet et poli, prêt pour la release. Cette phase se concentre sur l'expérience utilisateur globale : menus, audio, effets visuels, et polish général.

### État Actuel du Projet

Le projet dispose déjà de :
- **8 scènes** : BootScene, PreloadScene, GameScene, HUDScene, UpgradeScene, TacticalMenuScene, ProgressionScene, DebugScene
- **11+ systèmes** : Combat, Waves, Spawning, Combo, Drops, PowerUps, ActiveItems, Upgrades, Economy, Progression, DDA, Threat
- **4 managers** : PoolManager, TelemetryManager, CorpseManager, SaveManager
- **5 composants UI** : ComboMeter, PowerUpDisplay, ActiveItemDisplay, UpgradeCard
- **Configuration centralisée** : balance.ts, constants.ts, upgrades.ts, progression.ts

### Ce qui manque pour la release

La Phase 8 ajoute les éléments essentiels pour une expérience utilisateur complète :
1. Navigation et menus professionnels
2. Modes de jeu variés
3. Immersion audio complète
4. Effets visuels satisfaisants ("game feel")
5. Onboarding des nouveaux joueurs
6. Performance optimale
7. Qualité assurée par les tests

---

## 8.1 Menus

### Objectif
Créer une navigation fluide et professionnelle entre toutes les parties du jeu.

### Fichiers à créer

#### `src/scenes/MainMenuScene.ts`
Menu principal du jeu.

**Éléments UI :**
- Logo du jeu (animé, pulsation subtile)
- Boutons : Jouer, Progression, Options, Crédits, Quitter
- Fond animé (zombies qui passent en arrière-plan, effet parallaxe)
- Version du jeu (coin inférieur)

**Fonctionnalités :**
- Transition fluide depuis PreloadScene
- Musique de menu (loop)
- Hover effects sur les boutons
- Raccourcis clavier (Entrée = Jouer, Échap = Quitter)

#### `src/scenes/CharacterSelectScene.ts`
Sélection du personnage jouable.

**Éléments UI :**
- Grille de 6 personnages (2x3)
- Carte personnage sélectionné (grand portrait, stats, compétence)
- Indicateurs de verrouillage (cadenas pour personnages non débloqués)
- Boutons : Retour, Confirmer
- Preview de la compétence active (animation)

**Données par personnage :**
```typescript
interface CharacterPreview {
  id: CharacterType;
  name: string;
  title: string;           // Ex: "L'Officier de Police"
  description: string;     // Lore court
  stats: {
    health: number;        // Relatif (1-5 étoiles)
    speed: number;
    damage: number;
    special: number;
  };
  ability: {
    name: string;
    description: string;
    cooldown: number;
  };
  unlockCondition: string; // Ex: "Survivre 10 vagues"
  unlocked: boolean;
}
```

#### `src/scenes/ModeSelectScene.ts`
Sélection du mode de jeu et de l'arène.

**Éléments UI :**
- Tabs ou cards pour les modes : Survie, Campagne, Challenge Quotidien
- Sélection d'arène (miniatures avec noms)
- Description du mode sélectionné
- Difficulté (si applicable)
- Boutons : Retour, Lancer

**Par mode :**
- **Survie** : Choix d'arène, difficulté optionnelle
- **Campagne** : Liste de niveaux avec progression (étoiles)
- **Challenge** : Seed du jour, leaderboard preview

#### `src/scenes/OptionsScene.ts`
Configuration du jeu.

**Catégories :**

1. **Audio**
   - Volume musique (slider 0-100%)
   - Volume effets (slider 0-100%)
   - Muet global (toggle)

2. **Affichage**
   - Plein écran (toggle)
   - Qualité graphique (Basse/Moyenne/Haute)
   - Particules (toggle, pour les configs faibles)
   - Afficher FPS (toggle)

3. **Gameplay**
   - Difficulté adaptative ON/OFF (DDA)
   - Sensibilité souris (slider)
   - Screen shake (slider 0-100%)

4. **Contrôles**
   - Affichage des bindings actuels
   - Rebinding clavier (stretch goal)
   - Support manette (stretch goal)

**Persistance :**
- Sauvegarder dans `SaveManager` sous clé `settings`
- Charger au démarrage dans `BootScene`

#### `src/scenes/PauseScene.ts`
Menu pause en overlay.

**Éléments UI :**
- Fond semi-transparent (blur si performance OK)
- "PAUSE" centré
- Boutons : Reprendre, Options, Quitter la partie
- Stats de la run en cours (vague, kills, temps)

**Comportement :**
- Accessible via Échap ou P
- Met en pause tous les systèmes de GameScene
- Options ouvre un sous-menu (pas une nouvelle scène)

#### `src/scenes/GameOverScene.ts`
Écran de fin de partie.

**Éléments UI :**
- "GAME OVER" ou "VICTOIRE" selon le contexte
- Statistiques de la run :
  - Vagues survécues
  - Zombies éliminés (total et par type)
  - Temps de survie
  - Score final
  - Meilleur combo
  - Précision (tirs touchés / tirs totaux)
  - Cause de mort (type de zombie, distance)
- Comparaison avec le high score
- XP gagnée pour la progression permanente
- Boutons : Rejouer, Menu principal

**Données (depuis TelemetryManager) :**
```typescript
interface RunSummary {
  wavesCleared: number;
  totalKills: number;
  killsByType: Record<ZombieType, number>;
  survivalTime: number;
  finalScore: number;
  maxCombo: number;
  accuracy: number;
  damageDealt: number;
  damageTaken: number;
  causeOfDeath: { type: string; distance: number } | null;
  xpEarned: number;
}
```

### Fichiers à modifier

- **`src/config/game.config.ts`** : Ajouter les nouvelles scènes
- **`src/scenes/PreloadScene.ts`** : Transition vers MainMenuScene au lieu de GameScene
- **`src/scenes/GameScene.ts`** : Intégrer PauseScene, transition vers GameOverScene
- **`src/managers/SaveManager.ts`** : Ajouter gestion des settings

### Navigation entre scènes

```
Boot → Preload → MainMenu
                    ↓
         ┌─────────┼─────────┐
         ↓         ↓         ↓
    Progression  Options   CharacterSelect
                              ↓
                          ModeSelect
                              ↓
                          GameScene ←→ Pause
                              ↓
                          GameOver
                              ↓
                    MainMenu ou Rejouer
```

---

## 8.2 Modes de Jeu

### Objectif
Offrir plusieurs façons de jouer pour maximiser la rejouabilité.

### Mode Survie (Classique)

**Fichier :** Intégré dans `GameScene.ts` + `WaveSystem.ts`

**Règles :**
- Vagues infinies avec difficulté croissante
- Score basé sur kills, combo, temps de survie
- Pas de fin prévue, jouer jusqu'à la mort
- High score sauvegardé par arène

**Modifications :**
- `WaveSystem` : Mode actuel, confirmer qu'il scale indéfiniment
- Ajouter tracking du high score dans SaveManager

### Mode Campagne

**Fichiers à créer :**
- `src/modes/CampaignManager.ts`
- `src/config/campaign.ts` (définition des niveaux)

**Structure d'un niveau :**
```typescript
interface CampaignLevel {
  id: string;
  name: string;
  arena: ArenaType;
  objectives: Objective[];
  waves: number;                    // Nombre de vagues à survivre
  starThresholds: [number, number, number]; // Score pour 1, 2, 3 étoiles
  unlockCondition: string | null;   // ID du niveau précédent
  narrative?: string;               // Texte d'intro
}

interface Objective {
  type: 'survive' | 'kill' | 'protect' | 'collect' | 'time';
  target: number;
  description: string;
}
```

**Exemples de niveaux :**
1. **Réveil** (Hôpital) - Survivre 3 vagues, tutoriel intégré
2. **Évacuation** (Hall) - Protéger un PNJ pendant 5 vagues
3. **Ravitaillement** (Centre commercial) - Collecter 10 caisses de munitions
4. **Le Métro** (Station) - Survivre 8 vagues, boss à la fin
5. **Origines** (Laboratoire) - Atteindre la salle de contrôle, boss Patient Zéro

**Fonctionnalités :**
- Progression linéaire avec branches optionnelles
- Étoiles (1-3) basées sur la performance
- Dialogues/narrative entre les niveaux
- Débloque des personnages et armes

### Mode Challenge Quotidien

**Fichiers à créer :**
- `src/modes/DailyChallengeManager.ts`

**Fonctionnement :**
```typescript
interface DailyChallenge {
  date: string;           // YYYY-MM-DD
  seed: number;           // Seed pour le RNG
  arena: ArenaType;
  modifiers: Modifier[];  // Ex: "Double damage", "No healing"
  character: CharacterType | null; // Imposé ou libre
}
```

**Génération de la seed :**
```typescript
function getDailySeed(): number {
  const today = new Date().toISOString().split('T')[0];
  return hashString(today + 'zombie-hunter-daily');
}
```

**Règles :**
- Même configuration pour tous les joueurs ce jour-là
- Une seule tentative par jour (ou tentatives illimitées, score = meilleur)
- Modificateurs aléatoires pour varier l'expérience
- Leaderboard quotidien (local ou en ligne)

### Classements (Optionnel/Stretch)

**Fichier :** `src/managers/LeaderboardManager.ts`

**Options d'implémentation :**
1. **Local uniquement** : Stockage localStorage, pas de backend
2. **Externe** : Intégration avec un service comme PlayFab, GameJolt, ou backend custom

**Structure :**
```typescript
interface LeaderboardEntry {
  rank: number;
  playerName: string;
  score: number;
  wave: number;
  character: CharacterType;
  date: string;
}
```

---

## 8.3 Audio

### Objectif
Créer une ambiance sonore immersive qui renforce le gameplay.

### Fichiers à créer

#### `src/managers/AudioManager.ts`

Gestionnaire centralisé pour tout l'audio.

```typescript
class AudioManager {
  private scene: Phaser.Scene;
  private musicVolume: number;
  private sfxVolume: number;
  private currentMusic: Phaser.Sound.BaseSound | null;

  // Musique
  playMusic(key: string, config?: { loop?: boolean; fade?: boolean }): void;
  stopMusic(fade?: boolean): void;
  crossfadeMusic(newKey: string, duration: number): void;

  // Effets sonores
  playSFX(key: string, config?: { volume?: number; rate?: number }): void;
  playSFXPositional(key: string, x: number, y: number): void; // Stéréo basé sur position

  // Contrôle
  setMusicVolume(volume: number): void;
  setSFXVolume(volume: number): void;
  mute(): void;
  unmute(): void;

  // Gestion de groupes
  stopAllSFX(): void;
  pauseAll(): void;
  resumeAll(): void;
}
```

### Assets audio requis

#### Musique (`public/assets/audio/music/`)

| Fichier | Usage | Style |
|---------|-------|-------|
| `menu.mp3` | Menu principal | Ambiant, tension légère |
| `gameplay_calm.mp3` | Début de vague, respiration | Synthwave lent |
| `gameplay_intense.mp3` | Pic de vague, combat | Synthwave rapide, percussif |
| `boss.mp3` | Combat de boss | Épique, lourd |
| `gameover.mp3` | Écran de défaite | Sombre, court |
| `victory.mp3` | Victoire niveau | Triomphant |

**Système de musique dynamique :**
```typescript
// Dans GameScene
updateMusicIntensity() {
  const zombieCount = this.getActiveZombieCount();
  const playerHealth = this.player.health / this.player.maxHealth;

  if (zombieCount > 15 || playerHealth < 0.3) {
    this.audioManager.crossfadeMusic('gameplay_intense', 1000);
  } else if (zombieCount < 5) {
    this.audioManager.crossfadeMusic('gameplay_calm', 2000);
  }
}
```

#### Effets sonores (`public/assets/audio/sfx/`)

**Armes :**
| Fichier | Arme |
|---------|------|
| `pistol_fire.mp3` | Pistol |
| `shotgun_fire.mp3` | Shotgun |
| `smg_fire.mp3` | SMG (loop court) |
| `sniper_fire.mp3` | Sniper |
| `flamethrower_fire.mp3` | Lance-flammes (loop) |
| `tesla_fire.mp3` | Canon Tesla |
| `reload.mp3` | Rechargement générique |
| `empty_clip.mp3` | Plus de munitions |

**Zombies :**
| Fichier | Usage |
|---------|-------|
| `zombie_groan_1-3.mp3` | Idle Shambler (variantes) |
| `zombie_run.mp3` | Runner en charge |
| `zombie_hit_1-3.mp3` | Impact reçu |
| `zombie_death_1-3.mp3` | Mort (variantes) |
| `tank_footstep.mp3` | Pas lourd Tank |
| `spitter_spit.mp3` | Attaque Spitter |
| `screamer_scream.mp3` | Cri du Screamer |
| `bomber_fuse.mp3` | Avertissement Bomber |
| `bomber_explode.mp3` | Explosion Bomber |
| `invisible_shimmer.mp3` | Distorsion Invisible |

**Joueur :**
| Fichier | Usage |
|---------|-------|
| `player_hit_1-3.mp3` | Dégâts reçus |
| `player_death.mp3` | Mort |
| `dash.mp3` | Esquive |
| `heal.mp3` | Soin ramassé |
| `ammo_pickup.mp3` | Munitions ramassées |
| `powerup_activate.mp3` | Power-up activé |
| `level_up.mp3` | Upgrade obtenu |

**Interface :**
| Fichier | Usage |
|---------|-------|
| `button_hover.mp3` | Survol bouton |
| `button_click.mp3` | Clic bouton |
| `wave_start.mp3` | Début de vague |
| `wave_complete.mp3` | Fin de vague |
| `combo_increase.mp3` | Combo +1 |
| `combo_milestone.mp3` | Combo x5, x10 |
| `combo_break.mp3` | Combo perdu |

**Environnement :**
| Fichier | Usage |
|---------|-------|
| `door_activate.mp3` | Porte qui s'active |
| `door_break.mp3` | Porte détruite |
| `barrel_explode.mp3` | Baril explosif |
| `trap_trigger.mp3` | Piège déclenché |
| `electric_zap.mp3` | Zone électrifiée |

### Intégration dans le code existant

**Fichiers à modifier :**

1. **`src/entities/Player.ts`**
   - `dash()` : Jouer `dash.mp3`
   - `takeDamage()` : Jouer `player_hit_X.mp3`
   - `die()` : Jouer `player_death.mp3`

2. **`src/weapons/*.ts`**
   - `fire()` : Jouer le son correspondant à l'arme

3. **`src/entities/zombies/*.ts`**
   - `update()` : Sons d'idle occasionnels
   - `takeDamage()` : Jouer `zombie_hit_X.mp3`
   - `die()` : Jouer `zombie_death_X.mp3`

4. **`src/systems/WaveSystem.ts`**
   - `startWave()` : Jouer `wave_start.mp3`
   - `completeWave()` : Jouer `wave_complete.mp3`

5. **`src/systems/ComboSystem.ts`**
   - `incrementCombo()` : Jouer `combo_increase.mp3`
   - `onMilestone()` : Jouer `combo_milestone.mp3`
   - `breakCombo()` : Jouer `combo_break.mp3`

6. **`src/systems/DropSystem.ts`**
   - `collectHealth()` : Jouer `heal.mp3`
   - `collectAmmo()` : Jouer `ammo_pickup.mp3`

---

## 8.4 Effets Visuels

### Objectif
Améliorer le "game feel" avec des effets visuels satisfaisants et lisibles.

### Fichiers à créer

#### `src/effects/ParticleManager.ts`

Gestionnaire centralisé pour les particules.

```typescript
class ParticleManager {
  private emitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter>;

  // Sang
  bloodSplash(x: number, y: number, direction: number, intensity: number): void;
  bloodPool(x: number, y: number): void;

  // Armes
  muzzleFlash(x: number, y: number, rotation: number): void;
  bulletTrail(startX: number, startY: number, endX: number, endY: number): void;
  shellCasing(x: number, y: number, direction: number): void;

  // Explosions
  explosion(x: number, y: number, radius: number, color?: number): void;
  fireSpread(x: number, y: number): void;
  electricArc(startX: number, startY: number, endX: number, endY: number): void;

  // Effets de statut
  statusEffect(entity: Entity, type: 'fire' | 'electric' | 'poison' | 'slow'): void;

  // Impact
  impactSpark(x: number, y: number): void;
  dustCloud(x: number, y: number): void;
}
```

#### `src/effects/ScreenEffects.ts`

Effets globaux sur l'écran.

```typescript
class ScreenEffects {
  // Screen shake
  shake(intensity: number, duration: number): void;

  // Flash de couleur
  flash(color: number, duration: number, alpha?: number): void;
  damageFlash(): void;        // Flash rouge
  healFlash(): void;          // Flash vert
  powerupFlash(): void;       // Flash doré

  // Effets temporaires
  slowMotion(scale: number, duration: number): void;
  vignette(intensity: number): void;
  chromaticAberration(intensity: number): void; // Stretch

  // Transitions
  fadeIn(duration: number): void;
  fadeOut(duration: number): void;
}
```

### Implémentation des effets

#### Particules de sang

```typescript
// Dans ParticleManager
bloodSplash(x: number, y: number, direction: number, intensity: number = 1) {
  const emitter = this.scene.add.particles(x, y, 'blood_particle', {
    speed: { min: 50 * intensity, max: 150 * intensity },
    angle: { min: direction - 30, max: direction + 30 },
    scale: { start: 0.5, end: 0 },
    lifespan: 300,
    quantity: Math.floor(5 * intensity),
    tint: [0xff0000, 0xaa0000, 0x880000],
    gravityY: 200,
  });

  // Auto-destruction
  this.scene.time.delayedCall(500, () => emitter.destroy());
}
```

#### Screen shake

```typescript
// Dans ScreenEffects
shake(intensity: number, duration: number) {
  // Respecter le setting utilisateur
  const userSetting = SaveManager.getSettings().screenShakeIntensity;
  const finalIntensity = intensity * userSetting;

  if (finalIntensity > 0) {
    this.scene.cameras.main.shake(duration, finalIntensity * 0.01);
  }
}
```

#### Flash de dégâts

```typescript
damageFlash() {
  const flash = this.scene.add.rectangle(
    0, 0,
    this.scene.scale.width * 2,
    this.scene.scale.height * 2,
    0xff0000, 0.3
  );
  flash.setScrollFactor(0);
  flash.setDepth(1000);

  this.scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: 200,
    onComplete: () => flash.destroy()
  });
}
```

### Intégration dans le code existant

**`src/systems/CombatSystem.ts` :**
```typescript
// Quand un zombie est touché
onZombieHit(zombie: Zombie, bullet: Bullet) {
  // Particules de sang
  this.particleManager.bloodSplash(
    zombie.x, zombie.y,
    bullet.rotation,
    bullet.damage / 10
  );

  // Screen shake léger
  this.screenEffects.shake(0.5, 50);
}

// Quand le joueur est touché
onPlayerHit(damage: number) {
  this.screenEffects.damageFlash();
  this.screenEffects.shake(damage / 10, 100);
}
```

**`src/entities/bosses/*.ts` :**
```typescript
// Entrée de boss
onBossSpawn() {
  this.screenEffects.shake(2, 500);
  this.screenEffects.slowMotion(0.5, 1000);
}
```

### Qualité graphique adaptative

```typescript
// Dans ParticleManager
setQuality(level: 'low' | 'medium' | 'high') {
  this.particleMultiplier = {
    low: 0.3,
    medium: 0.6,
    high: 1.0
  }[level];

  this.enableComplexEffects = level !== 'low';
}
```

---

## 8.5 Tutoriel

### Objectif
Onboarder les nouveaux joueurs sans les frustrer.

### Fichiers à créer

#### `src/tutorial/TutorialManager.ts`

Gestionnaire du tutoriel contextuel.

```typescript
interface TutorialStep {
  id: string;
  trigger: TutorialTrigger;
  message: string;
  highlight?: { type: 'entity' | 'ui' | 'area'; target: string };
  pauseGame?: boolean;
  requireAction?: string;
  dismissAfter?: number;
}

type TutorialTrigger =
  | { type: 'immediate' }
  | { type: 'firstSpawn'; zombieType: ZombieType }
  | { type: 'healthBelow'; threshold: number }
  | { type: 'ammoEmpty' }
  | { type: 'wave'; number: number }
  | { type: 'combo'; threshold: number };

class TutorialManager {
  private steps: TutorialStep[];
  private completedSteps: Set<string>;
  private activeStep: TutorialStep | null;

  checkTriggers(): void;
  showStep(step: TutorialStep): void;
  dismissStep(): void;
  isCompleted(stepId: string): boolean;
  skipAll(): void;
}
```

#### `src/config/tutorial.ts`

Définition des étapes du tutoriel.

```typescript
export const TUTORIAL_STEPS: TutorialStep[] = [
  // Mouvement
  {
    id: 'movement',
    trigger: { type: 'immediate' },
    message: 'Utilisez WASD ou les flèches pour vous déplacer.',
    highlight: { type: 'ui', target: 'control_hints' },
    dismissAfter: 5000,
  },

  // Tir
  {
    id: 'shooting',
    trigger: { type: 'wave', number: 1 },
    message: 'Cliquez pour tirer. Visez les zombies !',
    pauseGame: true,
    requireAction: 'shoot',
  },

  // Dash
  {
    id: 'dash',
    trigger: { type: 'healthBelow', threshold: 0.7 },
    message: 'Appuyez sur ESPACE pour esquiver et éviter les dégâts.',
    pauseGame: true,
    requireAction: 'dash',
  },

  // Rechargement
  {
    id: 'reload',
    trigger: { type: 'ammoEmpty' },
    message: 'Plus de munitions ! Appuyez sur R pour recharger.',
    pauseGame: true,
    requireAction: 'reload',
  },

  // Combo
  {
    id: 'combo',
    trigger: { type: 'combo', threshold: 3 },
    message: 'Combo x3 ! Enchaînez les kills pour des bonus.',
    highlight: { type: 'ui', target: 'combo_meter' },
    dismissAfter: 3000,
  },

  // Types de zombies
  {
    id: 'runner_intro',
    trigger: { type: 'firstSpawn', zombieType: 'runner' },
    message: 'Runner détecté ! Il est rapide mais fragile. Priorité élevée.',
    highlight: { type: 'entity', target: 'runner' },
    pauseGame: true,
    dismissAfter: 4000,
  },

  {
    id: 'tank_intro',
    trigger: { type: 'firstSpawn', zombieType: 'tank' },
    message: 'Tank ! Très résistant. Concentrez votre feu.',
    highlight: { type: 'entity', target: 'tank' },
    pauseGame: true,
    dismissAfter: 4000,
  },

  {
    id: 'spitter_intro',
    trigger: { type: 'firstSpawn', zombieType: 'spitter' },
    message: 'Spitter ! Attaque à distance. Restez mobile.',
    highlight: { type: 'entity', target: 'spitter' },
    pauseGame: true,
    dismissAfter: 4000,
  },

  // ... autres types
];
```

#### `src/ui/TutorialOverlay.ts`

Affichage visuel du tutoriel.

```typescript
class TutorialOverlay extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private textBox: Phaser.GameObjects.Container;
  private highlightGraphics: Phaser.GameObjects.Graphics;
  private arrow: Phaser.GameObjects.Image;

  showMessage(text: string, position?: 'top' | 'center' | 'bottom'): void;
  highlightArea(x: number, y: number, width: number, height: number): void;
  highlightEntity(entity: Entity): void;
  pointArrowAt(x: number, y: number): void;
  dismiss(): void;
}
```

### Tooltips pour nouveaux éléments

**Dans `src/scenes/HUDScene.ts` :**

```typescript
// Afficher un tooltip quand un nouveau power-up est ramassé
showNewItemTooltip(item: string, description: string) {
  if (!SaveManager.hasSeenTooltip(item)) {
    this.tooltipOverlay.show({
      title: item,
      description: description,
      icon: `icon_${item}`,
      duration: 4000,
    });
    SaveManager.markTooltipSeen(item);
  }
}
```

### Option "Skip Tutoriel"

**Dans OptionsScene :**
- Toggle "Afficher le tutoriel"
- Actif par défaut pour les nouveaux joueurs
- Désactivé après la première partie complète

---

## 8.6 Optimisation

### Objectif
Assurer des performances fluides (60 FPS) sur une large gamme de configurations.

### Outils de profiling

#### `src/debug/PerformanceMonitor.ts`

```typescript
class PerformanceMonitor {
  private fpsHistory: number[];
  private frameTimeHistory: number[];
  private entityCounts: Map<string, number>;

  update(delta: number): void;

  // Métriques
  getAverageFPS(): number;
  getFrameTime(): { min: number; max: number; avg: number };
  getEntityCounts(): Record<string, number>;
  getMemoryUsage(): number;

  // Alertes
  onPerformanceDrop(callback: (fps: number) => void): void;

  // Export
  generateReport(): PerformanceReport;
}
```

### Optimisations à implémenter

#### 1. Object Pooling (déjà implémenté)
- Vérifier que tous les types de zombies utilisent `PoolManager`
- Ajouter pooling pour les projectiles si pas déjà fait
- Ajouter pooling pour les particules

#### 2. Spatial Hashing pour les collisions

```typescript
// Dans src/utils/SpatialHash.ts
class SpatialHash<T extends { x: number; y: number }> {
  private cellSize: number;
  private cells: Map<string, T[]>;

  insert(item: T): void;
  remove(item: T): void;
  query(x: number, y: number, radius: number): T[];
  update(item: T): void;
  clear(): void;
}
```

#### 3. Culling des entités hors écran

```typescript
// Dans Entity ou un système dédié
updateVisibility() {
  const camera = this.scene.cameras.main;
  const bounds = camera.worldView;

  // Marge pour éviter le pop-in
  const margin = 64;

  this.visible = Phaser.Geom.Rectangle.Overlaps(
    bounds,
    new Phaser.Geom.Rectangle(
      this.x - margin,
      this.y - margin,
      this.width + margin * 2,
      this.height + margin * 2
    )
  );
}
```

#### 4. Throttling de l'IA

```typescript
// Dans ZombieAI
private updateInterval: number = 100; // ms entre updates
private lastUpdate: number = 0;

update(time: number, delta: number) {
  if (time - this.lastUpdate < this.updateInterval) {
    return; // Skip cette frame
  }
  this.lastUpdate = time;

  // IA logic...
}
```

#### 5. Réduction du bundle

**vite.config.ts :**
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          // Séparer les assets lourds
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Supprimer les console.log en prod
      }
    }
  }
});
```

### Qualité graphique adaptative

```typescript
// Dans GameScene.create()
adjustQualityToPerformance() {
  const targetFPS = 55;
  const currentFPS = this.performanceMonitor.getAverageFPS();

  if (currentFPS < targetFPS * 0.8) {
    // Réduire la qualité
    this.particleManager.setQuality('low');
    this.screenEffects.setEnabled(false);
  }
}
```

---

## 8.7 Tests

### Objectif
Garantir la qualité et la stabilité du jeu.

### Tests unitaires

**Fichiers à créer dans `tests/unit/` :**

```
tests/unit/
├── systems/
│   ├── CombatSystem.test.ts
│   ├── WaveSystem.test.ts
│   ├── ComboSystem.test.ts
│   ├── ThreatSystem.test.ts
│   └── DDASystem.test.ts
├── entities/
│   ├── Player.test.ts
│   └── Zombie.test.ts
├── managers/
│   ├── SaveManager.test.ts
│   └── PoolManager.test.ts
├── config/
│   └── balance.test.ts
└── utils/
    ├── math.test.ts
    └── pathfinding.test.ts
```

**Exemple de test pour ComboSystem :**
```typescript
describe('ComboSystem', () => {
  let comboSystem: ComboSystem;

  beforeEach(() => {
    comboSystem = new ComboSystem(mockScene);
  });

  test('should start at multiplier 1', () => {
    expect(comboSystem.getMultiplier()).toBe(1);
  });

  test('should increase multiplier on kill', () => {
    comboSystem.onKill();
    expect(comboSystem.getMultiplier()).toBe(1.1);
  });

  test('should reset on timeout', () => {
    comboSystem.onKill();
    jest.advanceTimersByTime(4000); // Timeout de combo
    comboSystem.update(0, 0);
    expect(comboSystem.getMultiplier()).toBe(1);
  });

  test('should not exceed max multiplier', () => {
    for (let i = 0; i < 100; i++) {
      comboSystem.onKill();
    }
    expect(comboSystem.getMultiplier()).toBeLessThanOrEqual(10);
  });
});
```

**Exemple de test pour balance.ts :**
```typescript
describe('Balance Validation', () => {
  test('shambler TTK should be between 0.5s and 1.5s', () => {
    const ttk = calculateTTK('shambler', 'pistol');
    expect(ttk).toBeGreaterThanOrEqual(0.5);
    expect(ttk).toBeLessThanOrEqual(1.5);
  });

  test('runner TTC from door should be between 3s and 5s', () => {
    const ttc = calculateTTC('runner', REFERENCE_DISTANCES.door);
    expect(ttc).toBeGreaterThanOrEqual(3);
    expect(ttc).toBeLessThanOrEqual(5);
  });

  test('all weapons should have positive DPS', () => {
    Object.values(BALANCE.weapons).forEach(weapon => {
      const dps = calculateSustainedDPS(weapon);
      expect(dps).toBeGreaterThan(0);
    });
  });
});
```

### Tests d'intégration

**Fichiers à créer dans `tests/integration/` :**

```
tests/integration/
├── gameplay/
│   ├── WaveProgression.test.ts
│   ├── PlayerCombat.test.ts
│   └── BossEncounter.test.ts
├── ui/
│   ├── MenuNavigation.test.ts
│   └── HUDUpdates.test.ts
└── persistence/
    ├── SaveLoad.test.ts
    └── Progression.test.ts
```

### Playtesting

**Checklist de playtesting :**

```markdown
## Checklist Playtest

### Gameplay Core
- [ ] Le joueur peut se déplacer dans les 8 directions
- [ ] Le dash fonctionne et a un cooldown correct
- [ ] Toutes les armes tirent et font des dégâts
- [ ] Les zombies spawent depuis les portes
- [ ] Les zombies poursuivent et attaquent le joueur
- [ ] Le joueur peut mourir
- [ ] Les vagues progressent correctement

### Équilibrage
- [ ] Les vagues 1-5 sont accessibles aux débutants
- [ ] La difficulté augmente progressivement
- [ ] Aucun zombie n'est "bullshit" (mort injuste)
- [ ] Le dash permet d'échapper à 1-2 zombies
- [ ] Chaque arme a une utilité distincte

### UI/UX
- [ ] Tous les menus sont navigables
- [ ] Les textes sont lisibles
- [ ] Les feedbacks visuels/audio sont présents
- [ ] Le tutoriel est clair
- [ ] Le game over affiche les stats correctes

### Performance
- [ ] 60 FPS stable en gameplay normal
- [ ] Pas de freeze/stutter notable
- [ ] Chargement rapide (< 5s)

### Bugs
- [ ] Pas de crash observé
- [ ] Pas de blocage de progression
- [ ] Collisions fonctionnent correctement
```

---

## Priorisation des Tâches

### Priorité Haute (MVP Phase 8)

1. **8.1 Menus** — Sans menus, pas de jeu complet
   - MainMenuScene
   - PauseScene
   - GameOverScene

2. **8.3 Audio (basique)** — L'audio est essentiel au feedback
   - AudioManager
   - Sons d'armes (5 essentiels)
   - Sons de zombies (3 essentiels)
   - Musique de gameplay (1 track)

3. **8.4 Effets visuels (basique)**
   - Screen shake
   - Flash de dégâts
   - Particules de sang simples

### Priorité Moyenne

4. **8.2 Mode Survie** — Valider le mode principal
5. **8.5 Tutoriel (minimal)** — Onboarding basique
6. **8.7 Tests unitaires** — Qualité du code

### Priorité Basse (Nice to Have)

7. **8.2 Mode Campagne** — Contenu additionnel
8. **8.2 Challenge Quotidien** — Feature communautaire
9. **8.1 CharacterSelectScene** — Si personnages déjà jouables
10. **8.6 Optimisation avancée** — Si problèmes de perf
11. **8.3 Audio avancé** — Musique dynamique, tous les sons

---

## Estimation de Charge

| Section | Effort estimé | Dépendances |
|---------|---------------|-------------|
| 8.1 Menus | Moyen | Aucune |
| 8.2 Mode Survie | Faible | 8.1 |
| 8.2 Mode Campagne | Élevé | 8.1, 8.2 |
| 8.2 Challenge Quotidien | Moyen | 8.1, 8.2 |
| 8.3 Audio | Moyen | Assets audio |
| 8.4 Effets visuels | Moyen | Aucune |
| 8.5 Tutoriel | Moyen | 8.1 |
| 8.6 Optimisation | Variable | Profiling d'abord |
| 8.7 Tests | Continu | Aucune |

---

## Checklist Finale Phase 8

```markdown
### 8.1 Menus
- [x] MainMenuScene créé et fonctionnel
- [x] CharacterSelectScene créé
- [x] ModeSelectScene créé
- [x] OptionsScene créé avec persistance
- [x] PauseScene créé
- [x] GameOverScene créé avec stats

### 8.2 Modes de Jeu
- [ ] Mode Survie validé (high scores)
- [ ] Mode Campagne implémenté (5+ niveaux)
- [ ] Challenge Quotidien implémenté

### 8.3 Audio
- [ ] AudioManager créé
- [ ] Musique de menu et gameplay
- [ ] Sons d'armes (tous)
- [ ] Sons de zombies (tous types)
- [ ] Sons UI et feedback

### 8.4 Effets Visuels
- [ ] ParticleManager créé
- [ ] ScreenEffects créé
- [ ] Particules de sang
- [ ] Effets de tir
- [ ] Explosions
- [ ] Screen shake
- [ ] Flash de dégâts

### 8.5 Tutoriel
- [ ] TutorialManager créé
- [ ] Tutoriel mouvement/tir/dash
- [ ] Introduction des types de zombies
- [ ] Tooltips pour nouveaux éléments

### 8.6 Optimisation
- [ ] Profiling effectué
- [ ] Bottlenecks identifiés et corrigés
- [ ] 60 FPS stable avec 50+ zombies
- [ ] Bundle size < 5MB (sans assets)

### 8.7 Tests
- [ ] Tests unitaires systèmes critiques
- [ ] Tests d'intégration gameplay
- [ ] Playtesting effectué (10+ sessions)
- [ ] Bugs critiques corrigés
```

---

## Ressources

- **Phaser 3 Audio** : https://photonstorm.github.io/phaser3-docs/Phaser.Sound.html
- **Particle Effects** : https://rexrainbow.github.io/phaser3-rex-notes/docs/site/particles/
- **Performance Tips** : https://phaser.io/phaser3/devlog/140
- **Sound Assets** : https://freesound.org (licence CC)
- **Music** : https://www.newgrounds.com/audio (avec attribution)
