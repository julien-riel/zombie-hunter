# Zombie Hunter — Guide d'Équilibrage

Ce document explique la stratégie pour créer un jeu fun et bien équilibré, basée sur les principes de game design et les recommandations d'un spécialiste.

---

## Philosophie : Penser en Boucles (MDA)

Le framework **MDA** (Mechanics → Dynamics → Aesthetics) guide notre approche :

```
Paramètres (HP, speed, damage)
        ↓
   Dynamiques (pression, rythme, choix)
        ↓
   Expérience (tension, flow, satisfaction)
```

**Les paramètres ne sont jamais une fin en soi.** On les ajuste pour créer des dynamiques qui produisent l'expérience voulue.

### Les 3 Piliers d'Expérience

Chaque décision d'équilibrage doit servir au moins un de ces piliers :

| Pilier | Description | Indicateurs |
|--------|-------------|-------------|
| **Rythme Arcade** | Vagues rapides, décisions fréquentes | Combo maintenu, kills/min |
| **Tension Lisible** | Danger prévisible mais exigeant | Morts "fair", TTK raisonnable |
| **Variété Tactique** | Chaque zombie = micro-problème | Composition variée des vagues |

---

## Les Métriques Qui Comptent

### Pourquoi les stats brutes ne suffisent pas

Deux armes peuvent avoir le même DPS "théorique" mais des performances très différentes à cause du reload, du chargeur, etc.

**Exemple :**
- Pistol : 10 dmg × 4 tirs/s = 40 DPS brut
- Mais avec reload de 1s et 12 balles : DPS soutenu = ~31

### Métriques à Calculer

#### Pour les Armes

| Métrique | Formule | Utilité |
|----------|---------|---------|
| DPS brut | `damage / (fireRate / 1000)` | Comparaison théorique |
| DPS soutenu | `(mag × dmg) / ((mag × fireRate) + reload)` | **Puissance réelle** |
| Temps pour vider | `magazineSize × fireRate` | Durée de burst |

Pour le shotgun, multiplier damage par pelletCount.

#### Pour les Zombies

| Métrique | Formule | Utilité |
|----------|---------|---------|
| TTK | `HP / sustainedDPS(arme)` | Temps pour tuer |
| TTC | `distance / speed` | Temps avant contact |
| DPS reçu | `damage / attackCooldown` | Danger au contact |
| **Threat Score** | `(DPS_reçu) × (1 / TTC)` | **Dangerosité globale** |

#### Distances de Référence

```
close:  150px  — Distance de mêlée étendue
medium: 300px  — Mi-chemin dans l'arène
door:   500px  — Distance porte → centre
far:    640px  — Distance maximale
```

---

## Le Système de Budget de Menace

### Problème avec les counts fixes

`baseZombieCount + zombiesPerWave` crée des vagues prévisibles et peut générer des spikes injustes (5 tanks d'un coup).

### Solution : Budget dynamique

1. **Calculer un coût par zombie** basé sur le threat score
2. **Allouer un budget par vague** qui augmente progressivement
3. **"Dépenser" le budget** via spawn pondéré avec contraintes

### Calcul du Coût

```typescript
cost = threatScore × difficultyMultiplier
```

| Type | Multiplicateur | Raison |
|------|----------------|--------|
| shambler | 1.0 | Baseline |
| runner | 1.2 | Vitesse = danger |
| tank | 1.3 | Absorbe les ressources |
| spitter | 1.4 | Force le mouvement |
| invisible | 1.5 | Stress mental |
| screamer | 1.6 | Effet multiplicatif |
| necromancer | 1.8 | Effet exponentiel |

### Contraintes de Composition

Pour éviter les spikes injustes :

```typescript
roleCaps: {
  tank: 1,      // Max 1 tank simultané
  spitter: 2,   // Max 2 spitters
  runner: 4,    // Max 4 runners
  special: 2,   // Max 2 (invisible, necro, screamer)
}
```

### Pacing : Pic et Respiration

Alterner entre :
- **Pics (70%)** : Spawns rapprochés, composition agressive
- **Respiration (30%)** : Délais plus longs, zombies plus faibles

Le joueur doit avoir des moments pour souffler et apprécier sa survie.

---

## Designer une Vague : L'Art de la Mise en Scène

### Une vague = une mini-histoire jouable

Un designer ne pense pas :
> "Il faut 12 zombies."

Il pense :
> "Qu'est-ce que le joueur va ressentir pendant 60 secondes ?"

Une vague est une **séquence dramatique**, avec :
1. Une entrée en matière
2. Une montée de tension
3. Un pic
4. Une respiration
5. Une conclusion

### Les 5 Actes d'une Vague

#### Acte 1 : Le Début — "Ok, j'ai compris"

**Objectif** : Mettre le joueur en confiance

- Ennemis lisibles
- Rythme lent
- Peu de surprises
- Le joueur se repositionne, recharge, observe

Ce que le joueur pense :
> "Ça va... je gère."

**Règle** : Si tu tues le joueur ici, la vague est ratée.

#### Acte 2 : La Montée — "Je dois faire attention"

**Objectif** : Forcer des décisions

- Ajout d'un type d'ennemi différent
- Pression progressive
- Le joueur doit choisir :
  - Qui tuer en premier
  - Quand utiliser son dash
  - S'il recule ou avance

Ce que le joueur pense :
> "Ok, là faut que je joue sérieusement."

**Règle** : C'est ici que le jeu devient intéressant.

#### Acte 3 : Le Pic — "Oh merde"

**Objectif** : Créer le moment mémorable

- Combinaison dangereuse
- Ennemi qui change les règles (runner, tank, spitter)
- Erreur possible → punition immédiate

Ce que le joueur pense :
> "J'ai failli mourir."

**Règle** : Le joueur doit survivre par compétence, pas par chance.

#### Acte 4 : La Respiration — "J'ai repris le contrôle"

**Objectif** : Éviter l'épuisement

- Moins d'ennemis
- Ennemis simples
- Temps pour se replacer

**Attention** : Sans respiration → fatigue mentale → frustration.

#### Acte 5 : La Fin — "J'ai gagné"

**Objectif** : Récompenser et clore

- Derniers ennemis clairs
- Pas de surprise injuste
- Sensation de maîtrise

Ce que le joueur pense :
> "J'étais en contrôle."

### Pourquoi ce rythme fonctionne

Le cerveau aime :
- La **prévisibilité suivie de surprise**
- La **tension suivie de relâchement**
- La **victoire méritée**

C'est le même principe que :
- Une bonne chanson (couplet → refrain → pont → refrain final)
- Une scène de film d'action (tension → climax → résolution)
- Un match sportif serré

### Les Rôles des Zombies (pas juste des stats)

Chaque type d'ennemi a un **rôle dramatique**, pas juste des statistiques :

| Rôle | Zombie | Ce qu'il force |
|------|--------|----------------|
| Pression | Shambler | Gestion de l'espace |
| Urgence | Runner | Réaction rapide |
| Menace longue | Tank | Priorisation des ressources |
| Contrôle de zone | Spitter | Repositionnement |
| Chaos | Bomber | Décisions risquées |
| Tension | Invisible | Vigilance constante |
| Multiplicateur | Screamer | Gestion de priorité absolue |

**Une bonne vague mélange des rôles, pas des nombres.**

### Erreur fréquente

**Mauvaise approche** :
> "Je vais rendre la vague plus dure en ajoutant des ennemis."

**Bonne approche** :
> "Je vais rendre la vague plus intéressante en ajoutant un choix difficile."

### Le vrai secret

> Une bonne vague n'est pas celle que le joueur survit.
> C'est celle qu'il **raconte**.

"À la vague 12, j'ai failli crever quand le runner est arrivé pendant que le tank me bloquait..."

### Application à Zombie Hunter

Dans ce jeu :
- Les **portes** = timing dramatique (d'où vient le danger)
- Les **types de zombies** = règles qui changent
- Le **dash** = joker du joueur
- Les **combos** = récompense émotionnelle

Un designer pense :
> "À quel moment je fais douter le joueur ?
> À quel moment je le laisse respirer ?"

### Résumé

**Une vague, ce n'est pas une quantité d'ennemis.
C'est une expérience émotionnelle orchestrée.**

---

## Difficulté Adaptative (DDA)

### Objectif

Maintenir le joueur dans la **zone de flow** : ni ennuyé, ni frustré.

### Ce qu'on observe (fenêtre 30-60s)

| Métrique | Struggling si | Dominating si |
|----------|---------------|---------------|
| Accuracy | < 30% | > 70% |
| Dégâts/min | > 40 | < 10 |
| Near deaths | Fréquents | Jamais |
| Dash usage | Excessif | Rare |

### Ce qu'on ajuste

**Leviers SAFE :**
- `spawnDelay` — Levier principal (+100ms = respiration, -100ms = pression)
- Weights de composition (moins de runners/tanks si struggling)

**Leviers DANGEREUX (éviter) :**
- HP/damage des zombies — Perçu comme "rubber banding"
- Aim assist — Trop visible
- Drops garantis — Infantilisant

### Règles de Stabilité

1. **Hysteresis** : Minimum 15s entre ajustements
2. **Bornes strictes** : `spawnDelay ∈ [300, 1300]`
3. **Pas d'oscillation** : Si struggling → normal, ne pas passer direct à dominating
4. **Transparence** : Option "DDA: ON/OFF" pour le joueur

---

## Règles de Fairness

### Lisibilité > Réalisme

Chaque menace doit être identifiable :
- **Visuellement** : Silhouette distincte
- **Auditivement** : Son caractéristique
- **Temporellement** : Wind-up avant attaque

> Un joueur ne doit jamais mourir sans comprendre pourquoi.

### Éviter les Spikes Injustes

Les morts frustrantes viennent de :
- Runner + Spitter + Invisible simultanés
- Pas de fenêtre pour réagir
- Encerclement sans échappatoire

**Solutions :**
- Caps par rôle
- Spawn depuis directions variées
- Toujours laisser une sortie

### Le Contrat du Dash

Le dash est la "valve de sécurité" du joueur :

| Problème | Symptôme | Solution |
|----------|----------|----------|
| Trop court | Mort inévitable malgré bon timing | Augmenter distance/durée |
| Trop long | Trivialise tout danger | Réduire invuln frames |
| Cooldown trop long | Sentiment d'injustice | Réduire cooldown |
| Cooldown trop court | Jamais en danger | Augmenter cooldown |

**Valeurs cibles :**
- Dash doit permettre d'échapper à 1-2 zombies en mêlée
- Cooldown doit forcer le positionnement préventif
- Invuln frames doivent être généreux mais courts

---

## Instrumentation et Itération

### Ce qu'on mesure par run

| Catégorie | Métriques |
|-----------|-----------|
| Combat | Kills par type, TTK moyen, accuracy |
| Survie | Dégâts reçus, near deaths, durée |
| Progression | Vagues cleared, armes utilisées |
| Mort | Cause (type zombie), distance, vague |

### Comment itérer

1. **Jouer** : Minimum 10 runs avec paramètres actuels
2. **Analyser** : Identifier les outliers (morts trop rapides, vagues triviales)
3. **Hypothèse** : "Le runner est trop fort car TTC < TTK"
4. **Ajuster** : Modifier UN paramètre
5. **Valider** : 10 nouveaux runs, comparer les métriques

### Tests de Validation Automatiques

Script qui vérifie que les métriques restent dans les bornes :

```typescript
// Ces tests doivent passer avant tout merge
assert(shamblerTTK >= 0.5 && shamblerTTK <= 1.5);
assert(runnerTTC >= 3 && runnerTTC <= 5);
assert(tankTTK >= 4 && tankTTK <= 7);
```

---

## Valeurs de Référence Cibles

### TTK Cibles (avec Pistol)

| Zombie | Min | Max | Rationale |
|--------|-----|-----|-----------|
| Shambler | 0.5s | 1.5s | Fodder satisfaisant |
| Runner | 0.3s | 0.8s | Doit mourir vite ou il atteint le joueur |
| Tank | 4s | 7s | Investissement de ressources |
| Spitter | 0.5s | 1.5s | Récompense la priorité |

### TTC Cibles (depuis porte ~500px)

| Zombie | Min | Max | Rationale |
|--------|-----|-----|-----------|
| Shambler | 8s | 12s | Temps de réaction confortable |
| Runner | 3s | 5s | Urgent mais pas injuste |
| Crawler | 5s | 8s | Lent mais angle mort |

### Durée de Vague Cibles

| Vague | Durée | Composition |
|-------|-------|-------------|
| 1-5 | 30-45s | Shamblers + Runners |
| 6-10 | 45-60s | + Crawlers, Spitters |
| 11-15 | 60-75s | + Tanks, Bombers |
| 16+ | 75-90s | Tous types |

---

## Checklist de Balance

Avant de considérer le jeu "équilibré", vérifier :

### Survie Moyenne
- [ ] Les joueurs débutants survivent 3-5 vagues
- [ ] Les joueurs moyens survivent 8-12 vagues
- [ ] Les experts peuvent atteindre 20+ vagues

### Perception de Fairness
- [ ] 80%+ des morts sont perçues comme "j'aurais pu l'éviter"
- [ ] Aucun zombie n'est perçu comme "bullshit"
- [ ] Le dash sauve le joueur régulièrement

### Variété
- [ ] Chaque type de zombie force une réaction différente
- [ ] Les armes ont des niches distinctes
- [ ] Les vagues se sentent variées

### Flow
- [ ] Le joueur veut "just one more run"
- [ ] Les moments de calme sont appréciés
- [ ] Les pics d'intensité sont excitants (pas stressants)

---

## Annexe : Formules Complètes

### DPS Soutenu (arme)

```typescript
function getSustainedDPS(weapon: WeaponStats): number {
  const damagePerShot = weapon.damage * (weapon.pelletCount ?? 1);
  const shotsPerMag = weapon.magazineSize;
  const timeToEmpty = shotsPerMag * weapon.fireRate; // ms
  const cycleTime = timeToEmpty + weapon.reloadTime; // ms

  return (damagePerShot * shotsPerMag) / (cycleTime / 1000);
}
```

### Threat Score (zombie)

```typescript
function getThreatScore(zombie: ZombieStats): number {
  const receivedDPS = zombie.damage / (zombie.attackCooldown / 1000);
  const ttcFromDoor = 500 / zombie.speed; // secondes

  return receivedDPS * (1 / ttcFromDoor);
}
```

### Coût pour Budget

```typescript
const DIFFICULTY_MULTIPLIERS: Record<ZombieType, number> = {
  shambler: 1.0,
  runner: 1.2,
  crawler: 1.1,
  tank: 1.3,
  spitter: 1.4,
  bomber: 1.2,
  screamer: 1.6,
  splitter: 1.3,
  invisible: 1.5,
  necromancer: 1.8,
};

function getZombieCost(type: ZombieType): number {
  const threat = getThreatScore(BALANCE.zombies[type]);
  return threat * DIFFICULTY_MULTIPLIERS[type];
}
```

---

## Ressources

- [MDA Framework](https://www.cs.northwestern.edu/~hunicke/MDA.pdf) — Mechanics, Dynamics, Aesthetics
- [Difficulty in Video Games](https://oxfordre.com/communication/) — Oxford Research
- [Game AI Book](https://gameaibook.org/book.pdf) — PCG & Tuning (Ch. 7)
- [Dynamic Difficulty Adjustment](https://www.sciencedirect.com/science/article/abs/pii/S1875952125001211) — Revue systématique
