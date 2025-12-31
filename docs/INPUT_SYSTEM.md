# Système d'Input - Zombie Hunter

Ce document décrit l'architecture du système d'input qui gère les contrôles clavier/souris sur desktop et les contrôles tactiles sur mobile/tablette.

## Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                         InputManager                            │
│                   (Abstraction unifiée)                         │
│                                                                 │
│  getMovementVector()  getAimAngle()  isActionPressed()          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
              ┌───────────────┴───────────────┐
              │                               │
     ┌────────┴────────┐            ┌────────┴────────┐
     │    Desktop      │            │     Mobile      │
     │  (Clavier/Souris)│           │   (Tactile)     │
     └─────────────────┘            └─────────────────┘
                                            ▲
                                            │
                                   ┌────────┴────────┐
                                   │ MobileControls  │
                                   │ (Gestionnaire   │
                                   │  centralisé)    │
                                   └─────────────────┘
                                            ▲
                          ┌─────────────────┼─────────────────┐
                          │                 │                 │
                   ┌──────┴──────┐   ┌──────┴──────┐   ┌──────┴──────┐
                   │ VirtualJoystick│ │VirtualJoystick│ │ TouchButton │
                   │  (Mouvement)   │ │   (Visée)     │ │  (Actions)  │
                   └───────────────┘ └───────────────┘ └─────────────┘
```

## Composants

### 1. InputManager (`src/managers/InputManager.ts`)

Couche d'abstraction qui unifie les inputs desktop et mobile. Le code du jeu n'a besoin que d'appeler les méthodes de l'InputManager.

**Méthodes principales:**

| Méthode | Description |
|---------|-------------|
| `getMovementVector()` | Retourne `{x, y}` normalisé (-1 à 1) |
| `getAimAngle(playerX, playerY)` | Retourne l'angle de visée en radians |
| `isActionPressed(action)` | Vérifie si une action est maintenue |
| `isActionJustPressed(action)` | Vérifie si une action vient d'être déclenchée |
| `triggerAction(action)` | Déclenche manuellement une action |

**Actions supportées:**
- `shoot`, `dash`, `reload`, `ability`, `interact`
- `useItem`, `itemNext` (objets actifs)
- `pause`
- `weapon1` à `weapon4`, `weaponNext`, `weaponPrev`

**Détection automatique du mode:**
```typescript
const mode = DeviceDetector.getRecommendedInputMode(); // 'keyboard' | 'touch'
```

---

### 2. MobileControls (`src/ui/MobileControls.ts`)

Conteneur principal des contrôles tactiles. Gère le dispatch centralisé des événements touch.

**Layout visuel:**
```
┌────────────────────────────────────────────────┐
│ [Pause]               [Nom arme] [Arme +]      │
│                                  [Arme -]      │
│                                                │
│                          [↻Item] [📦Use]       │
│                                  [Interact]    │
│ [Dash]                    [Ability] [Reload]   │
│    ◯ Joystick              ◯ Joystick          │
│    Mouvement                 Visée             │
└────────────────────────────────────────────────┘
```

**Contrôles objets actifs:**
- Desktop: `F` = Utiliser l'item équipé, `Tab` = Cycler vers l'item suivant
- Mobile: Boutons 📦 (utiliser) et ↻ (cycler)

**Zones de capture:**

```
┌──────────────────┬──────────────────┐
│                  │                  │
│   Zone ignorée   │   Zone ignorée   │  35% haut
│                  │                  │
├──────────────────┼──────────────────┤
│                  │                  │
│  Zone Joystick   │  Zone Joystick   │
│    Gauche        │     Droite       │  65% bas
│   (Mouvement)    │     (Visée)      │
│                  │                  │
└──────────────────┴──────────────────┘
     45% largeur        45% largeur
```

---

### 3. Gestionnaire d'événements tactiles

Le système utilise les **événements touch natifs** (pas les pointer events de Phaser) pour une meilleure compatibilité iOS Safari.

**Flux de traitement:**

```
touchstart
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Convertir coordonnées touch      │
│    → coordonnées canvas             │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 2. Vérifier les BOUTONS en premier  │◄── Priorité haute
│    (dash, reload, ability, etc.)    │
└─────────────────────────────────────┘
    │ Non trouvé
    ▼
┌─────────────────────────────────────┐
│ 3. Vérifier zone GAUCHE             │
│    → Activer joystick mouvement     │
└─────────────────────────────────────┘
    │ Non trouvé
    ▼
┌─────────────────────────────────────┐
│ 4. Vérifier zone DROITE             │
│    → Activer joystick visée         │
└─────────────────────────────────────┘
```

**Tracking multi-touch:**

Chaque doigt est tracké individuellement via `touch.identifier`:

```typescript
activeTouches: Map<number, {
  element: 'moveJoystick' | 'aimJoystick' | 'button';
  button?: TouchButton;
}>
```

Cela permet d'utiliser simultanément:
- Un doigt sur le joystick de mouvement
- Un autre doigt sur le joystick de visée
- Un troisième doigt sur un bouton d'action

---

### 4. VirtualJoystick (`src/ui/VirtualJoystick.ts`)

Joystick virtuel avec support du mode dynamique (apparaît où le doigt touche).

**Configuration:**

```typescript
interface VirtualJoystickConfig {
  x: number;                  // Position X initiale
  y: number;                  // Position Y initiale
  baseRadius?: number;        // Rayon de la base (défaut: 75)
  stickRadius?: number;       // Rayon du stick (défaut: 30)
  baseColor?: number;         // Couleur de la base
  stickColor?: number;        // Couleur du stick
  deadZone?: number;          // Zone morte (défaut: 0.15 = 15%)
  fixed?: boolean;            // Mode fixe ou dynamique
  captureZone?: {...};        // Zone de capture étendue
}
```

**Méthodes de contrôle (appelées par MobileControls):**

| Méthode | Description |
|---------|-------------|
| `activate(x, y, touchId)` | Active le joystick à la position donnée |
| `handleMove(x, y, touchId)` | Met à jour la position du stick |
| `deactivate(touchId)` | Désactive et recentre le stick |

**Valeurs de sortie:**

| Méthode | Retour |
|---------|--------|
| `getVector()` | `{x, y}` normalisé avec zone morte appliquée |
| `getAngle()` | Angle en radians |
| `getForce()` | Force de 0 à 1 |
| `isPressed()` | Boolean |

**Zone morte:**

La zone morte (15% par défaut) empêche les micro-mouvements involontaires:

```
         Force
           │
       1.0 ┤         ╱
           │        ╱
           │       ╱
       0.0 ┼──────┼────────
           0    0.15      1.0
              Zone    Distance
              morte
```

---

### 5. TouchButton (`src/ui/TouchButton.ts`)

Bouton tactile avec support du cooldown et feedback visuel/haptique.

**Configuration:**

```typescript
interface TouchButtonConfig {
  x: number;
  y: number;
  radius?: number;           // Rayon (défaut: 35)
  icon?: string;             // Emoji ou caractère
  iconSize?: number;         // Taille de l'icône
  color?: number;            // Couleur normale
  pressedColor?: number;     // Couleur pressée
  cooldown?: number;         // Durée du cooldown en ms
  showCooldown?: boolean;    // Afficher l'indicateur
}
```

**Méthodes de contrôle:**

| Méthode | Description |
|---------|-------------|
| `containsPoint(x, y)` | Vérifie si un point est dans le bouton |
| `activate()` | Simule une pression |
| `deactivate()` | Simule un relâchement |
| `triggerCooldown(duration)` | Déclenche le cooldown |

**Feedback:**

- **Visuel:** Changement de couleur, scale 0.9x, bordure plus épaisse
- **Haptique:** Vibration de 30ms via `navigator.vibrate()`
- **Cooldown:** Arc de progression vert

---

## Intégration dans le jeu

### Exemple d'utilisation dans une scène:

```typescript
class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private mobileControls?: MobileControls;

  create() {
    // Créer l'InputManager
    this.inputManager = new InputManager(this);

    // Créer les contrôles mobiles (auto-détection)
    this.mobileControls = new MobileControls(this, {
      inputManager: this.inputManager
    });
  }

  update() {
    // Récupérer le mouvement (fonctionne desktop ET mobile)
    const movement = this.inputManager.getMovementVector();
    this.player.move(movement.x, movement.y);

    // Récupérer la visée
    const aimAngle = this.inputManager.getAimAngle(
      this.player.x,
      this.player.y
    );
    this.player.aim(aimAngle);

    // Vérifier les actions
    if (this.inputManager.isActionJustPressed('dash')) {
      this.player.dash();
    }

    if (this.inputManager.isActionPressed('shoot')) {
      this.player.shoot();
    }

    // Objets actifs (mines, drones, etc.)
    if (this.inputManager.isActionJustPressed('useItem')) {
      this.activeItemSystem.useEquippedItem();
    }
    if (this.inputManager.isActionJustPressed('itemNext')) {
      this.activeItemSystem.cycleEquipped(1);
    }
  }
}
```

---

## Spécificités iOS

### Problèmes résolus:

1. **Pointer events peu fiables** → Utilisation des touch events natifs
2. **Zones de capture trop petites** → Zones étendues (45% de l'écran)
3. **Conflits entre éléments** → Dispatch centralisé avec priorités
4. **Pas de fullscreen API** → Mode PWA standalone

### Meta tags requis (`index.html`):

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0,
      maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

### CSS requis:

```css
html, body {
  touch-action: none;           /* Désactive les gestes navigateur */
  -webkit-touch-callout: none;  /* Désactive le menu contextuel iOS */
  -webkit-user-select: none;    /* Désactive la sélection */
  overflow: hidden;             /* Empêche le scroll bounce */
}
```

---

## Configuration par appareil

Les tailles des contrôles sont adaptées automatiquement:

| Appareil | Joystick | Bouton | Marge | Vibration |
|----------|----------|--------|-------|-----------|
| Mobile   | 100px    | 50px   | 15px  | 30ms      |
| Tablette | 90px     | 45px   | 25px  | 40ms      |
| Desktop  | 75px     | 35px   | 20px  | Non       |

Configuration dans `src/config/MobilePerformanceConfig.ts`.

---

## Debugging

Pour visualiser les zones de capture, ajouter temporairement dans `MobileControls.createControls()`:

```typescript
// Debug: afficher les zones de capture
const zones = this.getCaptureZones();
const debugLeft = this.scene.add.rectangle(
  zones.left.x + zones.left.width / 2,
  zones.left.y + zones.left.height / 2,
  zones.left.width,
  zones.left.height,
  0x00ff00, 0.2
);
const debugRight = this.scene.add.rectangle(
  zones.right.x + zones.right.width / 2,
  zones.right.y + zones.right.height / 2,
  zones.right.width,
  zones.right.height,
  0xff0000, 0.2
);
```
