# Plan de Support Mobile - Zombie Hunter

Ce document décrit les modifications nécessaires pour rendre le jeu jouable sur téléphone mobile sans clavier ni souris.

## État Actuel

Le jeu utilise actuellement :
- **Mouvement** : Flèches directionnelles ou WASD
- **Visée** : Position de la souris
- **Tir** : Clic gauche maintenu
- **Dash** : Barre d'espace
- **Rechargement** : Touche R
- **Capacité spéciale** : Touche Q
- **Changement d'arme** : Touches 1-4 ou molette souris
- **Interaction** : Touche E
- **Pause** : ESC ou P

**Aucun support tactile n'existe actuellement.**

---

## 1. Système d'Entrée Abstrait

### 1.1 Créer un InputManager centralisé

**Fichier à créer** : `src/managers/InputManager.ts`

Objectif : Abstraire les entrées pour supporter clavier/souris ET tactile de manière transparente.

```
InputManager
├── detectInputMode() - Détecte automatiquement clavier ou tactile
├── getMovementVector() - Retourne {x, y} normalisé (-1 à 1)
├── getAimDirection() - Retourne l'angle de visée en radians
├── isActionPressed(action) - Vérifie si une action est active
├── onActionTriggered(action, callback) - Événements d'action
└── setInputMode(mode) - Force un mode d'entrée
```

**Actions à mapper** :
- `move` : Vecteur de déplacement
- `aim` : Direction de visée
- `shoot` : Tir (maintenu)
- `dash` : Dash (déclencheur)
- `reload` : Rechargement (déclencheur)
- `ability` : Capacité spéciale (déclencheur)
- `interact` : Interaction (déclencheur)
- `weapon1-4` : Sélection d'arme (déclencheur)
- `weaponNext/Prev` : Cycle d'armes (déclencheur)
- `pause` : Pause (déclencheur)

### 1.2 Modifier Player.ts

**Fichier** : `src/entities/Player.ts`

Remplacer la gestion directe des touches (lignes 102-132) par des appels à `InputManager` :

```typescript
// Avant
if (this.cursors.left.isDown || this.wasd.A.isDown) { ... }

// Après
const movement = this.inputManager.getMovementVector();
this.body.setVelocity(movement.x * speed, movement.y * speed);
```

---

## 2. Contrôles Tactiles Virtuels

### 2.1 Joystick Virtuel de Mouvement

**Fichier à créer** : `src/ui/VirtualJoystick.ts`

Position : Coin inférieur gauche de l'écran

Fonctionnalités :
- Zone de capture : ~150px de diamètre
- Stick interne : ~60px de diamètre
- Retourne un vecteur normalisé {x, y}
- Zone morte centrale (~15% du rayon)
- Affichage semi-transparent
- Apparaît où le pouce touche (dans la zone)

Événements Phaser à utiliser :
- `scene.input.on('pointerdown', ...)`
- `scene.input.on('pointermove', ...)`
- `scene.input.on('pointerup', ...)`

### 2.2 Joystick Virtuel de Visée + Tir

**Option recommandée** : Joystick droit combiné visée/tir

Position : Coin inférieur droit de l'écran

Comportement :
- Toucher le joystick = commencer à tirer
- Direction du stick = direction de visée
- Relâcher = arrêter de tirer

Alternative : Tir automatique vers le zombie le plus proche avec joystick de mouvement uniquement (mode simplifié).

### 2.3 Boutons d'Action

**Fichier à créer** : `src/ui/TouchButton.ts`

Boutons nécessaires :

| Bouton | Position | Taille | Action |
|--------|----------|--------|--------|
| Dash | Droite du joystick gauche | 70px | Dash |
| Recharger | Au-dessus du joystick droit | 60px | Reload |
| Capacité | À gauche du joystick droit | 70px | Ability (Q) |
| Arme +/- | Haut de l'écran | 50px | Cycle armes |
| Pause | Coin supérieur droit | 50px | Pause |

Feedback visuel :
- Opacité réduite au repos (~0.6)
- Opacité pleine au toucher (~1.0)
- Effet de pression (scale down légèrement)
- Indicateur de cooldown (pour dash et capacité)

---

## 3. Interface Mobile (HUD)

### 3.1 Créer une scène HUD Mobile

**Fichier à créer** : `src/scenes/MobileHUDScene.ts`

Ou modifier `HUDScene.ts` pour détecter le mode et adapter l'affichage.

### 3.2 Réorganisation des éléments

**Desktop** (actuel) :
```
[Santé]                    [Points]
[Munitions]
[Score]

         [Vague X]

            [Armes 1-4]
```

**Mobile** (proposé) :
```
[Pause]  [Santé ████]  [Arme +]
                       [Arme -]

         [Vague X]


[Dash]              [Capacité][Reload]
  [Joystick]          [Joystick Visée]
    Gauche               Droit
```

### 3.3 Adaptations spécifiques

- Agrandir les textes (min 24px pour lisibilité mobile)
- Réduire les informations affichées (essentiel uniquement)
- Barre de vie simplifiée (pas de valeur numérique)
- Indicateur de munitions simplifié (barre ou icône)
- Supprimer l'affichage des contrôles clavier

---

## 4. Détection et Configuration

### 4.1 Détection du type d'appareil

**Fichier à créer** : `src/utils/DeviceDetector.ts`

```typescript
export const DeviceDetector = {
  isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent) ||
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0);
  },

  isTablet(): boolean {
    // Détection spécifique tablette
  },

  getScreenSize(): { width: number; height: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
};
```

### 4.2 Configuration du jeu

**Fichier à modifier** : `src/config/game.config.ts`

Ajouts :
```typescript
input: {
  activePointers: 3, // Support multi-touch (2 joysticks + 1 bouton)
  touch: {
    capture: true
  }
}
```

### 4.3 Option dans les paramètres

**Fichier à modifier** : `src/scenes/OptionsScene.ts`

Ajouter une option pour forcer le mode de contrôle :
- Automatique (défaut)
- Clavier/Souris
- Tactile

---

## 5. Optimisations Mobile

### 5.1 Performance

**Fichiers concernés** : Configuration et systèmes de rendu

- Réduire le nombre max de zombies simultanés sur mobile (50 au lieu de 100+)
- Réduire la qualité des particules
- Désactiver certains effets visuels optionnels
- Optimiser le pool de bullets (30 au lieu de 100)

### 5.2 Responsive Design

**Fichier à modifier** : `src/config/game.config.ts`

```typescript
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 1280,
  height: 720,
  min: {
    width: 320,
    height: 480
  }
}
```

### 5.3 Orientation

Forcer le mode paysage pour une meilleure expérience :

```typescript
// Dans index.html ou le boot
screen.orientation?.lock('landscape').catch(() => {
  // Afficher un message demandant de tourner l'appareil
});
```

---

## 6. Liste des Fichiers à Créer/Modifier

### Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `src/managers/InputManager.ts` | Gestionnaire d'entrées abstrait |
| `src/ui/VirtualJoystick.ts` | Joystick virtuel tactile |
| `src/ui/TouchButton.ts` | Boutons tactiles |
| `src/ui/MobileControls.ts` | Conteneur des contrôles mobiles |
| `src/utils/DeviceDetector.ts` | Détection du type d'appareil |

### Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/entities/Player.ts` | Utiliser InputManager au lieu des touches directes |
| `src/scenes/GameScene.ts` | Initialiser InputManager et contrôles mobiles |
| `src/scenes/HUDScene.ts` | Layout adaptatif mobile/desktop |
| `src/config/game.config.ts` | Config multi-touch et responsive |
| `src/scenes/OptionsScene.ts` | Option de mode de contrôle |
| `src/scenes/PauseScene.ts` | Bouton tactile pour reprendre |
| `src/scenes/MainMenuScene.ts` | Navigation tactile |

---

## 7. Ordre d'Implémentation Recommandé

### Phase 1 : Fondations
1. Créer `DeviceDetector.ts`
2. Créer `InputManager.ts` (version basique)
3. Modifier `game.config.ts` pour le multi-touch

### Phase 2 : Contrôles Tactiles
4. Créer `VirtualJoystick.ts`
5. Créer `TouchButton.ts`
6. Créer `MobileControls.ts` (assemblage)

### Phase 3 : Intégration
7. Modifier `Player.ts` pour utiliser InputManager
8. Modifier `GameScene.ts` pour initialiser les contrôles
9. Tester le mouvement et le tir

### Phase 4 : Interface
10. Adapter `HUDScene.ts` pour mobile
11. Adapter les menus (MainMenu, Pause, Options)
12. Adapter `UpgradeScene.ts` pour sélection tactile

### Phase 5 : Polish
13. Optimisations performance mobile
14. Tests sur différents appareils
15. Ajustements de taille et positionnement

---

## 8. Considérations Supplémentaires

### 8.1 Tir automatique (optionnel)

Pour simplifier l'expérience mobile, envisager un mode "auto-aim" :
- Le joueur contrôle uniquement le mouvement
- Le tir se fait automatiquement vers le zombie le plus proche
- Option activable/désactivable dans les paramètres

### 8.2 Haptic Feedback

Utiliser les vibrations du téléphone :
```typescript
if (navigator.vibrate) {
  navigator.vibrate(50); // Vibration courte au tir
  navigator.vibrate(200); // Vibration longue quand touché
}
```

### 8.3 Gestes supplémentaires

- Double-tap : Dash
- Swipe vers le haut : Rechargement rapide
- Pinch : Zoom carte (si applicable)

### 8.4 Sauvegarde des préférences

Sauvegarder la taille et position des joysticks si le joueur les personnalise.

---

## 9. Tests Requis

- [ ] iPhone Safari
- [ ] iPhone Chrome
- [ ] Android Chrome
- [ ] Android Firefox
- [ ] iPad Safari
- [ ] Tablette Android
- [ ] Différentes tailles d'écran (petit téléphone → grande tablette)
- [ ] Mode portrait (message de rotation)
- [ ] Performance avec 50+ zombies

---

## Résumé

L'ajout du support mobile nécessite principalement :

1. **Abstraction des entrées** via un `InputManager`
2. **Joysticks virtuels** pour mouvement et visée
3. **Boutons tactiles** pour les actions
4. **Adaptation du HUD** pour écrans tactiles
5. **Optimisations** pour performance mobile

Estimation : ~15-20 fichiers impactés, dont 5-6 nouveaux fichiers à créer.
