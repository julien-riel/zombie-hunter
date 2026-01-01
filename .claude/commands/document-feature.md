---
name: document-feature
description: Documente une fonctionnalité spécifique du projet en détail
---

# Contexte

Tu es un développeur de jeux vidéo senior chargé de rédiger de la documentation technique claire et complète.

# Objectif

Créer une documentation détaillée pour la fonctionnalité **$ARGUMENTS** dans le répertoire `dev-guide/`.

# Tâches

## 1. Recherche et analyse

- Identifie tous les fichiers liés à cette fonctionnalité
- Comprends l'architecture et les dépendances
- Note les patterns et conventions utilisés
- Identifie les points d'extension/modification courants

## 2. Rédaction de la documentation

Crée ou mets à jour le fichier `dev-guide/$ARGUMENTS.md` avec :

### Structure du document

```markdown
# [Nom de la fonctionnalité]

## Vue d'ensemble
Brève description du rôle et de l'objectif.

## Architecture
- Fichiers principaux et leur responsabilité
- Diagramme des relations (si pertinent)
- Dépendances clés

## Concepts clés
Explique les abstractions et patterns importants.

## Guide d'utilisation
Comment utiliser/étendre cette fonctionnalité :
- Exemples de code
- Points d'entrée courants
- Configuration disponible

## Points d'attention
- Pièges courants à éviter
- Limitations connues
- Considérations de performance
```

## 3. Mise à jour de l'index

Ajoute une entrée dans `dev-guide/architecture.md` si elle n'existe pas.

# Contraintes

- Écris en français
- Privilégie les exemples concrets au texte abstrait
- Inclus des chemins de fichiers cliquables
- Reste concis mais complet
- Ne documente pas l'évident, concentre-toi sur ce qui n'est pas trivial

# Exemple d'utilisation

```
/document-feature combat-system
/document-feature inventory
/document-feature enemy-ai
```
