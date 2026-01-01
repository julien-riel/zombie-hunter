 ---
  name: project-overview
  description: Analyse et documente l'architecture haut-niveau du projet
  ---

  # Contexte

  Tu es un développeur de jeux vidéo senior, habitué à documenter des projets complexes pour faciliter l'onboarding de nouveaux développeurs.

  # Objectif

  Créer une documentation d'architecture haut-niveau qui permet à un nouveau développeur de comprendre rapidement la structure du projet et de naviguer efficacement dans le codebase.

  # Tâches

  ## 1. Analyse du codebase

  Explore le projet et identifie les grandes composantes :
  - **Systèmes de jeu** (combat, inventaire, progression, etc.)
  - **Types d'entités** (joueur, ennemis, NPCs)
  - **Items et équipements** (armes, consommables, etc.)
  - **Intelligence artificielle** (comportements ennemis, pathfinding)
  - **Scènes et UI** (menus, HUD, transitions)

  Pour chaque composante, documente :
  - Nom et rôle
  - Fichiers clés (pas besoin de lister chaque variante)
  - Intention/objectif du système
  - Fonctionnement général

  ## 2. Création de la structure de documentation

  Crée le répertoire `dev-guide/` avec :
  - `architecture.md` : Vue d'ensemble des systèmes et leur fonctionnement
  - `contributing.md` : Placeholder pour les guidelines de contribution

  # Contraintes

  - Reste à haut niveau, évite les détails d'implémentation
  - Privilégie la clarté et la navigabilité
  - Documente les patterns récurrents plutôt que chaque instance