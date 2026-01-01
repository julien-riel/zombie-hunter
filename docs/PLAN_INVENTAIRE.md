# Plan: Système d'Inventaire d'Armes

## Objectif

Le joueur possède un inventaire global d'armes mais ne peut en utiliser que 4 par wave :
- **2 armes de mêlée** (touches 1-2)
- **2 armes à distance** (touches 3-4)

Le joueur choisit son loadout avant chaque wave (sauf la wave 1 qui utilise le loadout par défaut).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    InventoryManager                         │
│  - unlockedWeapons: Set<string>  (toutes les armes)        │
│  - currentLoadout: LoadoutConfig (4 armes actives)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      WeaponRegistry                          │
│  - Registre central de toutes les armes du jeu              │
│  - Factory functions pour instancier chaque arme            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Player                               │
│  - meleeWeapons: [slot1, slot2]   ← 2 armes mêlée actives   │
│  - rangedWeapons: [slot3, slot4]  ← 2 armes distance actives│
└─────────────────────────────────────────────────────────────┘
```

## Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `src/types/inventory.ts` | Types et interfaces du système |
| `src/systems/WeaponRegistry.ts` | Registre central des armes |
| `src/managers/InventoryManager.ts` | Gestion inventaire global + loadout |
| `src/scenes/LoadoutSelectionScene.ts` | UI sélection avant wave |
| `src/ui/WeaponSlotUI.ts` | Composant slot d'arme réutilisable |

## Fichiers à Modifier

| Fichier | Modifications |
|---------|---------------|
| `src/entities/Player.ts` | 2 mêlée + 2 distance au lieu de 1+4 |
| `src/managers/InputManager.ts` | Touches 1-2 mêlée, 3-4 distance |
| `src/scenes/HUDScene.ts` | Affichage 4 slots (2+2) |
| `src/systems/WaveSystem.ts` | Insérer sélection armes dans flow |
| `src/ui/MobileControls.ts` | Adapter boutons tactiles |
| `src/config/constants.ts` | Ajouter LOADOUT scene key |
| `src/config/balance.ts` | Config loadout par défaut |

## Phases d'Implémentation

### Phase 1: Infrastructure (Fondations)
1. Créer `src/types/inventory.ts` - Types de base
2. Créer `src/systems/WeaponRegistry.ts` - Registre des armes
3. Créer `src/managers/InventoryManager.ts` - Gestion inventaire
4. Enregistrer toutes les armes existantes

### Phase 2: Refactoring Player
1. Modifier Player pour 2 slots mêlée + 2 slots distance
2. Ajouter `equipLoadout()` method
3. Mettre à jour les méthodes de switch

### Phase 3: Inputs
1. Modifier InputManager (1-2 mêlée, 3-4 distance)
2. Adapter MobileControls

### Phase 4: HUD
1. Modifier HUDScene pour 4 slots (2+2)
2. Mettre à jour événements de changement d'arme

### Phase 5: UI Sélection
1. Créer LoadoutSelectionScene
2. Intégrer dans WaveSystem (après upgrades, avant tactical)
3. Skip pour wave 1

### Phase 6: Intégration
1. Connexion avec la boutique
2. Connexion récompenses boss
3. Mode debug

## Loadout par Défaut

```typescript
{
  meleeSlots: ['baseballBat', null],   // Slot 1: Batte, Slot 2: vide
  rangedSlots: ['pistol', null]        // Slot 3: Pistol, Slot 4: vide
}
```

## Déblocage des Armes

Les armes sont débloquées via :
- **Achat en boutique** (points gagnés en jeu)
- **Récompenses de boss** (armes données automatiquement)
- **Progression de niveau** (certaines armes débloquées à des waves spécifiques)

Le changement de loadout est possible :
- Avant chaque wave (écran de sélection)
- En mode debug (remplacement de l'arme courante)

## Flow Utilisateur

```
Wave 1 commence
    └─ Loadout par défaut (Batte + Pistol)
    └─ Pas d'écran de sélection

Wave terminée
    └─ Écran Upgrades
    └─ Écran Sélection Armes  ← NOUVEAU
    └─ Menu Tactique
    └─ Wave suivante commence

Pendant le combat
    └─ Touches 1-2 : Switch mêlée
    └─ Touches 3-4 : Switch distance
    └─ Touche V : Attaque mêlée manuelle
```

## Armes Disponibles

### Mêlée
- BaseballBat (défaut)
- Machete
- Chainsaw
- FireAxe
- Katana
- Sledgehammer

### Distance - Firearms
- Pistol (défaut)
- Shotgun
- SMG
- SniperRifle
- Revolver
- AssaultRifle
- DoubleBarrel

### Distance - Special
- Flamethrower
- TeslaCannon
- NailGun
- CompositeBow
- MicrowaveCannon

### Distance - Explosive
- GrenadeLauncher

### Distance - Experimental
- FreezeRay
- GravityGun
- BlackHoleGenerator
- LaserMinigun
- ZombieConverter
