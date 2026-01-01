# Guide Utilisateur - Zombie Hunter

Ce guide explique tous les contrôles et fonctionnalités du jeu selon la plateforme utilisée.

---

## Table des matières

1. [Contrôles Desktop (Clavier/Souris)](#contrôles-desktop-claviersouris)
2. [Contrôles Mobile (Tactile)](#contrôles-mobile-tactile)
3. [Tableau de correspondance Desktop/Mobile](#tableau-de-correspondance-desktopmobile)
4. [Interface utilisateur (HUD)](#interface-utilisateur-hud)
5. [Système d'armes](#système-darmes)
6. [Objets actifs](#objets-actifs)
7. [Capacités spéciales](#capacités-spéciales)
8. [Éléments interactifs de l'arène](#éléments-interactifs-de-larène)
9. [Système de vagues](#système-de-vagues)
10. [Menus](#menus)

---

## Contrôles Desktop (Clavier/Souris)

### Déplacement

| Touche | Action |
|--------|--------|
| W / ↑ | Se déplacer vers le haut |
| A / ← | Se déplacer vers la gauche |
| S / ↓ | Se déplacer vers le bas |
| D / → | Se déplacer vers la droite |

> **Note:** Le déplacement diagonal est supporté et automatiquement normalisé.

### Visée et Tir

| Contrôle | Action |
|----------|--------|
| Position de la souris | Direction de visée |
| Clic gauche (maintenu) | Tirer |
| Molette vers le haut | Arme suivante |
| Molette vers le bas | Arme précédente |

### Actions

| Touche | Action |
|--------|--------|
| V | Attaque de mêlée (batte) |
| ESPACE | Dash (esquive rapide) |
| Q | Capacité spéciale du personnage |
| R | Recharger l'arme |
| E | Interagir avec un objet |
| F | Utiliser l'objet actif équipé |
| TAB | Changer d'objet actif |

> **Note:** L'auto-mêlée est activée : si vous tirez et qu'un zombie est au contact (< 40 pixels), une attaque mêlée automatique est déclenchée.

### Sélection d'arme

| Touche | Action |
|--------|--------|
| 1 | Sélectionner arme slot 1 |
| 2 | Sélectionner arme slot 2 |
| 3 | Sélectionner arme slot 3 |
| 4 | Sélectionner arme slot 4 |

### Contrôles du jeu

| Touche | Action |
|--------|--------|
| ESC | Pause |
| P | Pause (alternative) |

---

## Contrôles Mobile (Tactile)

### Disposition des contrôles

```
┌────────────────────────────────────────────────┐
│ [⏸ Pause]           [Nom arme] [▲ Arme +]      │
│                                [▼ Arme -]      │
│                                                │
│                          [↻ Cycler] [📦 Item]  │
│ [🗡️ Mêlée]                        [👆 Interact]│
│ [⚡ Dash]               [🔥 Ability] [🔄 Reload]│
│    ◯ Joystick              ◯ Joystick          │
│    Mouvement                 Visée/Tir         │
└────────────────────────────────────────────────┘
```

### Joysticks

| Joystick | Position | Fonction |
|----------|----------|----------|
| Joystick gauche | Coin inférieur gauche | Contrôle du déplacement (8 directions) |
| Joystick droit | Coin inférieur droit | Contrôle de la visée + tir automatique |

> **Note:** Maintenir le joystick droit active le tir continu.

### Boutons d'action

| Bouton | Icône | Position | Fonction |
|--------|-------|----------|----------|
| Mêlée | 🗡️ | Au-dessus du bouton Dash | Attaque de mêlée |
| Dash | ⚡ | À droite du joystick gauche | Esquive rapide |
| Ability | 🔥 | À gauche du joystick droit | Capacité spéciale |
| Reload | 🔄 | Au-dessus du joystick droit | Recharger l'arme |
| Interact | 👆 | Au-dessus du bouton Ability | Interagir avec objets |
| Use Item | 📦 | Zone centrale droite | Utiliser objet actif |
| Cycle Item | ↻ | À côté de Use Item | Changer d'objet actif |

> **Note:** L'auto-mêlée fonctionne aussi sur mobile : si vous visez et un zombie est au contact, une attaque mêlée automatique est déclenchée.

### Boutons de navigation

| Bouton | Icône | Position | Fonction |
|--------|-------|----------|----------|
| Pause | ⏸ | Coin supérieur gauche | Mettre en pause |
| Arme + | ▲ | Coin supérieur droit | Arme précédente |
| Arme - | ▼ | Sous Arme + | Arme suivante |

### Affichage

| Élément | Position | Information |
|---------|----------|-------------|
| Nom de l'arme | Entre les boutons ▲/▼ | Arme actuellement équipée |

---

## Tableau de correspondance Desktop/Mobile

| Fonction | Desktop | Mobile |
|----------|---------|--------|
| **Déplacement** | WASD / Flèches | Joystick gauche |
| **Visée** | Position souris | Joystick droit |
| **Tir** | Clic gauche | Joystick droit (maintenu) |
| **Mêlée** | V | Bouton 🗡️ |
| **Dash** | ESPACE | Bouton ⚡ |
| **Capacité spéciale** | Q | Bouton 🔥 |
| **Recharger** | R | Bouton 🔄 |
| **Interagir** | E | Bouton 👆 |
| **Utiliser objet** | F | Bouton 📦 |
| **Cycler objets** | TAB | Bouton ↻ |
| **Arme suivante** | Molette ↓ / 1-4 | Bouton ▼ |
| **Arme précédente** | Molette ↑ / 1-4 | Bouton ▲ |
| **Pause** | ESC / P | Bouton ⏸ |

---

## Interface utilisateur (HUD)

### Zone supérieure gauche

| Élément | Description |
|---------|-------------|
| Barre de vie | Affiche les PV (vert > 60%, orange > 30%, rouge < 30%) |
| Munitions | Format: `NomArme: actuel/max` (ex: "Pistol: 12/30") |
| Score | Points accumulés |
| Kills | Nombre de zombies éliminés |

### Zone supérieure centrale

| Élément | Description |
|---------|-------------|
| Numéro de vague | Vague actuelle (ex: "Vague 3") |
| Progression | Zombies tués sur total (ex: "5/20") |

### Zone supérieure droite

| Élément | Description |
|---------|-------------|
| Points | Monnaie pour achats/améliorations |
| Combo | Multiplicateur de combo avec barre de temps |

### Zone gauche (Desktop uniquement)

| Élément | Description |
|---------|-------------|
| Power-ups | Liste des bonus actifs avec durée restante |
| Objets actifs | Inventaire avec charges restantes |

### Zone inférieure centrale (Desktop uniquement)

| Élément | Description |
|---------|-------------|
| Inventaire d'armes | 4 slots avec nom, munitions, touche (1-4) |
| Arme sélectionnée | Surlignée en vert |

---

## Système d'armes

### Armes de départ

Le joueur commence avec 4 armes :

| Slot | Arme | Description |
|------|------|-------------|
| 1 | Pistol | Pistolet équilibré, fiable |
| 2 | Shotgun | Dégâts élevés, courte portée |
| 3 | SMG | Cadence élevée, dégâts moyens |
| 4 | Sniper Rifle | Longue portée, dégâts massifs |

### Armes spéciales (obtenues en jeu)

Ces armes peuvent être obtenues via des drops ou des achats :

| Arme | Rareté | Description |
|------|--------|-------------|
| Revolver | Rare | 6 coups puissants, rechargement lent |
| Assault Rifle | Rare | Tir en rafale (3 balles), précis |
| Double Barrel | Épique | 2 coups dévastateurs, 8 projectiles chacun |
| Grenade Launcher | Épique | Projectiles explosifs avec trajectoire en arc |
| Composite Bow | Variable | Projectiles en arc |
| Flamethrower | Variable | Dégâts de zone (feu) |
| Tesla Cannon | Variable | Dégâts électriques chaînés |
| Nail Gun | Variable | Projectiles multiples |
| Microwave Cannon | Variable | Effets micro-ondes |

### Armes expérimentales (endgame)

Ces armes légendaires sont les plus puissantes du jeu. Chacune a une condition de déblocage spéciale :

| Arme | Déblocage | Description | Particularité |
|------|-----------|-------------|---------------|
| Rayon Glacial | Vague 20+ | Gèle les ennemis | +50% dégâts mêlée sur gelés |
| Canon Gravitique | Vague 20+ | Attire/repousse zombies | Dégâts de collision |
| Générateur de Trou Noir | Drop de boss | Crée un trou noir aspirant | Max 2 trous noirs actifs |
| Laser Minigun | Achat 10 000 pts | Faisceau laser continu | Gestion de la surchauffe |
| Convertisseur de Zombies | Secret* | Convertit les zombies en alliés | Max 3 zombies convertis |

> **Secret** : Le Convertisseur de Zombies se débloque après avoir converti 100 zombies au total (déblocage permanent).

### Système de rareté

Chaque arme possède une rareté qui affecte ses statistiques :

| Rareté | Couleur | Multiplicateur de dégâts | Chance de drop |
|--------|---------|--------------------------|----------------|
| Commun | Gris | x1.0 | 50% |
| Rare | Bleu | x1.15 | 30% |
| Épique | Violet | x1.35 | 15% |
| Légendaire | Or | x1.6 | 5% |

> **Effets visuels :** Les armes de rareté supérieure brillent avec des effets de particules. Les armes légendaires ont un effet doré pulsant distinctif.

> **Note :** L'arme de mêlée de base (Batte de baseball) est disponible dès le départ. Utilisez la touche **V** (Desktop) ou le bouton **🗡️** (Mobile) pour attaquer. Des armes de mêlée plus puissantes peuvent être obtenues en combat !

### Armes de mêlée disponibles

| Arme | Tier | Description | Particularité |
|------|------|-------------|---------------|
| Batte de baseball | 1 | Arme de départ équilibrée | Chance de stun |
| Machette | 2 | Attaques très rapides | Pas de knockback |
| Hache de pompier | 2 | Dégâts élevés, lente | Coups critiques |
| Katana | 3 | Très rapide, bonne portée | Critiques fréquents |
| Marteau | 3 | Très lent mais dévastateur | Stun garanti, knockback massif |
| Tronçonneuse | 3 | DPS continu | Consomme du carburant |

> **Astuce :** Approchez-vous d'un drop d'arme de mêlée pour comparer ses stats avec votre arme actuelle. Appuyez sur **E** pour l'équiper ou **Q** pour la garder.

### Mécanique de rechargement

- Appuyer sur **R** (Desktop) ou **🔄** (Mobile) pour recharger
- Le rechargement prend du temps (varie selon l'arme)
- Indicateur "(Rechargement...)" affiché pendant le rechargement

---

## Objets actifs

Objets déployables avec charges limitées. Utilisez **F** (Desktop) ou **📦** (Mobile) pour déployer, **TAB** ou **↻** pour changer d'objet.

| Objet | Icône | Fonction | Max actifs | Max charges |
|-------|-------|----------|------------|-------------|
| Turret | Carré + canon | Tourelle auto-ciblante | 2 | 2 |
| Mine | Octogone | Explose à proximité d'ennemis | 5 | 5 |
| Drone | X + cercle | Attaque volante autonome | 1 | 2 |
| Decoy | Silhouette | Leurre attirant les zombies | 2 | 3 |
| Disco Ball | Cercle à facettes | Contrôle de foule | 1 | 2 |

### Affichage HUD

- L'objet équipé est entouré d'une bordure jaune
- Le nombre de charges restantes est affiché sur chaque slot
- Titre: "OBJETS [F=Utiliser, Tab=Cycler]"

---

## Capacités spéciales

Chaque personnage possède une capacité unique activée avec **Q** (Desktop) ou **🔥** (Mobile).

| Personnage | Capacité | Effet | Cooldown |
|------------|----------|-------|----------|
| **Cop** (Marcus) | Concentration | Ralentit le temps à 30% pendant 4s | 30s |
| **Athlete** (Jade) | Sprint | Vitesse x2 + 0.5s d'intangibilité | 20s |
| **Doctor** (Elena) | Vaccination | Immunité aux effets de statut 8s | 25s |
| **Mechanic** (Frank) | Tourelle Auto | Déploie une tourelle pendant 20s | 35s |
| **Pyromaniac** (Victor) | Nova | Explosion de feu (150px, 50 dégâts) | 25s |
| **Kid** (Lily + Max) | Flair | Révèle ennemis et drops pendant 5s | 20s |

---

## Éléments interactifs de l'arène

Utilisez **E** (Desktop) ou **👆** (Mobile) pour interagir avec les éléments proches.

| Élément | Interaction | Effet |
|---------|-------------|-------|
| **Switch** | E / 👆 | Active les mécanismes liés (portes, pièges) |
| **Générateur** | E / 👆 | Active/désactive l'alimentation |
| **Porte** | Automatique ou switch | Bloque ou laisse passer les zombies |
| **Baril explosif** | Tir | Explosion de zone |
| **Baril de feu** | Tir | Crée une zone de feu |
| **Piège à flammes** | Proximité / switch | Jet de flammes directionnel |
| **Piège à lames** | Proximité / switch | Zone de dégâts rotatifs |
| **Barricade** | - | Couverture (peut être détruite) |

---

## Système de vagues

### Phases d'une vague

1. **Préparation** : Annonce de la vague avec compte à rebours
2. **Combat** : Zombies apparaissent par les portes actives
3. **Complétion** : Tous les zombies éliminés

### Informations affichées

- Numéro de vague (ex: "VAGUE 3")
- Nombre de zombies et portes actives
- Progression (zombies tués / total)

### Progression

- Plus la vague est élevée, plus il y a de zombies
- Les types de zombies varient selon la vague
- Des boss peuvent apparaître à certaines vagues

---

## Menus

### Menu Pause

Accessible via **ESC** / **P** (Desktop) ou **⏸** (Mobile)

| Option | Fonction |
|--------|----------|
| RESUME | Reprendre la partie |
| OPTIONS | Paramètres (à venir) |
| QUIT | Retour au menu principal |

**Statistiques affichées:**
- Vague actuelle
- Total de kills
- Temps de jeu
- Meilleur combo

**Navigation (Desktop):**
- ↑/↓ ou W/S : Naviguer
- ENTER/ESPACE : Sélectionner

### Écran Game Over

Affiché à la mort du joueur.

**Statistiques:**
- Vague atteinte
- Score final
- Temps de survie
- Zombies éliminés
- Meilleur combo
- Précision (%)
- Dégâts infligés/reçus
- Cause de la mort
- XP gagné

**Options:**
- RESTART : Rejouer
- MAIN MENU : Menu principal

---

## Système de Combo

- Les éliminations rapides augmentent le multiplicateur
- La barre de temps diminue sans élimination
- Milestones débloqués à certains paliers
- Le combo se réinitialise après un délai sans kill

---

## Power-ups

Bonus temporaires ramassés sur le terrain:

| Power-up | Effet |
|----------|-------|
| Ghost | Intangibilité (traverse les ennemis) |
| Magnet | Attire automatiquement les drops |
| Rage | Dégâts augmentés |
| Freeze | Ralentit les ennemis |
| Nuke | Élimine tous les zombies visibles |

---

## Conseils de jeu

1. **Utilisez le dash** pour échapper aux situations dangereuses
2. **Rechargez** pendant les moments calmes, pas en plein combat
3. **Positionnez-vous** près des barils explosifs pour des éliminations groupées
4. **Utilisez les switches** pour contrôler le flux de zombies
5. **Gérez vos objets actifs** - les mines sont excellentes en défense
6. **Maintenez votre combo** pour maximiser le score
7. **Adaptez votre arme** à la situation (shotgun en close, sniper à distance)
