# Guide de Contribution

> Guidelines pour contribuer au projet Zombie Hunter.

## Mise en Place

```bash
# Cloner le projet
git clone <repository-url>
cd zombie-hunter

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

## Scripts Disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de développement avec HMR |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualisation du build |
| `npm run test` | Tests en mode watch |
| `npm run test:unit` | Tests unitaires |
| `npm run test:coverage` | Rapport de couverture |
| `npm run lint` | Vérification ESLint |
| `npm run lint:fix` | Correction automatique ESLint |
| `npm run format` | Formatage Prettier |

## Structure des Branches

- `main` - Branche principale stable
- `feature/*` - Nouvelles fonctionnalités
- `fix/*` - Corrections de bugs
- `refactor/*` - Refactoring

## Conventions de Code

### Nommage

- **Classes** : PascalCase (`WaveSystem`, `ZombieFactory`)
- **Fichiers** : PascalCase pour les classes, camelCase pour les utilitaires
- **Variables/fonctions** : camelCase
- **Constantes** : SCREAMING_SNAKE_CASE

### Organisation

- Une classe par fichier
- Exports via barrel files (`index.ts`)
- Types dans le répertoire `types/`

### Documentation

- JSDoc pour les classes et méthodes publiques
- Commentaires en français dans le code existant

## Tests

- Écrire des tests pour les nouvelles fonctionnalités
- Tests dans `tests/unit/`
- Nommage : `<Component>.test.ts`

## Commits

Format conventionnel :
```
feat: description courte
fix: description courte
refactor: description courte
docs: description courte
test: description courte
```

---

*Ce document sera enrichi selon les besoins du projet.*
